const { parse } = require('csv-parse');
const { Readable } = require('stream');
const { Batch, BatchRow } = require('../models');
const calcService = require('./calcService');
const { processBatchLLM } = require('./llmService');
const { sanitizeObjectForFormulaInjection } = require('../utils/formulaGuard');

const MAX_ROW_LIMIT = 5000;
const LLM_CHUNK_SIZE = 25;

/**
 * Normalizes CSV headers to standardized input fields
 */
const normalizeHeader = (header) => {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('plate') || clean.includes('regno') || clean.includes('registration')) return 'registrationNo';
  if (clean.includes('sae') || clean.includes('grade') || clean.includes('baseline')) return 'saeBaseline';
  if (clean.includes('viscosity') || clean.includes('cst')) return 'measuredViscosity';
  if (clean.includes('flow') || clean.includes('efflux') || clean.includes('time')) return 'effluxTime';
  if (clean.includes('temp')) return 'temperature';
  if (clean.includes('blotter') || clean.includes('soot') || clean.includes('transmittance')) return 'blotterScore';
  if (clean.includes('base') || clean.includes('oiltype')) return 'baseOilType';
  if (clean.includes('engine')) return 'engineType';
  if (clean.includes('driving') || clean.includes('condition')) return 'drivingCondition';
  if (clean.includes('mileage') || clean.includes('odometer') || clean.includes('km')) return 'currentMileage';
  if (clean === 'units' || clean === 'unit') return 'units';
  return header;
};

/**
 * Stream parses a CSV buffer and returns array of row objects
 */
const parseCsvBuffer = (buffer) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(buffer);

    const parser = parse({
      columns: (headers) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
    });

    stream
      .pipe(parser)
      .on('data', (data) => {
        if (rows.length < MAX_ROW_LIMIT) {
          rows.push(data);
        }
      })
      .on('end', () => resolve(rows))
      .on('error', (err) => reject(err));
  });
};

/**
 * Validates and converts single raw row into structured inputs
 */
const validateRow = (rawRow, rowIndex) => {
  try {
    const sanitized = sanitizeObjectForFormulaInjection(rawRow);
    const saeBaseline = sanitized.saeBaseline?.toUpperCase()?.trim();
    const validGrades = ['0W-20', '5W-30', '10W-40', '15W-40', '20W-50'];

    if (!saeBaseline || !validGrades.includes(saeBaseline)) {
      throw new Error(`Invalid or missing SAE baseline (must be one of: ${validGrades.join(', ')})`);
    }

    const measuredViscosity = sanitized.measuredViscosity ? parseFloat(sanitized.measuredViscosity) : undefined;
    const effluxTime = sanitized.effluxTime ? parseFloat(sanitized.effluxTime) : undefined;

    if (measuredViscosity === undefined && effluxTime === undefined) {
      throw new Error('Either measuredViscosity (cSt) or effluxTime (seconds) must be provided');
    }

    if (measuredViscosity !== undefined && (isNaN(measuredViscosity) || measuredViscosity < 10 || measuredViscosity > 400)) {
      throw new Error('measuredViscosity must be a number between 10 and 400 cSt');
    }

    if (effluxTime !== undefined && (isNaN(effluxTime) || effluxTime < 10 || effluxTime > 200)) {
      throw new Error('effluxTime must be a number between 10 and 200 seconds');
    }

    const temperature = sanitized.temperature ? parseFloat(sanitized.temperature) : 27.5;
    const blotterScore = sanitized.blotterScore ? parseInt(sanitized.blotterScore, 10) : 100;
    const validBlotters = [15, 45, 75, 100];
    const normalizedBlotter = validBlotters.includes(blotterScore) ? blotterScore : 100;

    let baseOilType = sanitized.baseOilType || 'Full-Synthetic';
    if (!['Mineral', 'Semi-Synthetic', 'Full-Synthetic'].includes(baseOilType)) {
      baseOilType = 'Full-Synthetic';
    }

    let engineType = sanitized.engineType || 'Naturally Aspirated Petrol';
    if (!['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel'].includes(engineType)) {
      engineType = 'Naturally Aspirated Petrol';
    }

    let drivingCondition = sanitized.drivingCondition || 'Mixed Urban';
    if (!['Highway', 'Mixed Urban', 'City Stop-and-Go'].includes(drivingCondition)) {
      drivingCondition = 'Mixed Urban';
    }

    const currentMileage = sanitized.currentMileage ? Math.max(0, parseFloat(sanitized.currentMileage)) : 0;
    const units = sanitized.units === 'mi' ? 'mi' : 'km';
    const registrationNo = sanitized.registrationNo || `VEH-${rowIndex + 1}`;

    return {
      valid: true,
      data: {
        registrationNo,
        saeBaseline,
        measuredViscosity,
        effluxTime,
        temperature,
        blotterScore: normalizedBlotter,
        baseOilType,
        engineType,
        drivingCondition,
        currentMileage,
        units,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message,
    };
  }
};

/**
 * Execute background batch processing job
 * @param {ObjectId} batchId
 * @param {Array} rawRows
 */
const processBatchJob = async (batchId, rawRows) => {
  try {
    const batch = await Batch.findById(batchId);
    if (!batch) return;

    batch.status = 'processing';
    batch.rowCount = rawRows.length;
    await batch.save();

    const preparedRows = [];
    const validRowsForLLM = [];
    let successCount = 0;
    let failedCount = 0;

    // Step 1: Validate and compute pure maths per row
    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const validation = validateRow(raw, i);

      if (!validation.valid) {
        failedCount++;
        preparedRows.push({
          batchId,
          rowIndex: i + 1,
          inputs: raw,
          results: null,
          llmResult: null,
          status: 'failed',
          error: validation.error,
        });
      } else {
        try {
          const mathResults = calcService.calculateDiagnostics(validation.data);
          preparedRows.push({
            batchId,
            rowIndex: i + 1,
            inputs: validation.data,
            results: mathResults.results,
            llmResult: null,
            status: 'pending',
            error: null,
          });

          validRowsForLLM.push({
            rowIndex: i + 1,
            inputs: validation.data,
            results: mathResults.results,
          });
          successCount++;
        } catch (calcErr) {
          failedCount++;
          preparedRows.push({
            batchId,
            rowIndex: i + 1,
            inputs: validation.data,
            results: null,
            llmResult: null,
            status: 'failed',
            error: `Math computation error: ${calcErr.message}`,
          });
        }
      }
    }

    // Step 2: Ingest prepared rows into BatchRow collection
    await BatchRow.insertMany(preparedRows);

    // Step 3: Run LLM in chunks of 25
    for (let c = 0; c < validRowsForLLM.length; c += LLM_CHUNK_SIZE) {
      const chunk = validRowsForLLM.slice(c, c + LLM_CHUNK_SIZE);
      try {
        const analyses = await processBatchLLM(chunk);

        // Update each BatchRow with its LLM response
        const bulkOps = analyses.map((analysis) => ({
          updateOne: {
            filter: { batchId, rowIndex: analysis.rowIndex },
            update: {
              $set: {
                llmResult: analysis,
                status: 'success',
              },
            },
          },
        }));

        if (bulkOps.length > 0) {
          await BatchRow.bulkWrite(bulkOps);
        }
      } catch (llmErr) {
        console.warn(`LLM chunk processing error at offset ${c}:`, llmErr.message);
        // Mark pending rows as success even if LLM had partial failure, with fallback
        const fallbackOps = chunk.map((r) => ({
          updateOne: {
            filter: { batchId, rowIndex: r.rowIndex },
            update: {
              $set: {
                status: 'success',
                error: 'LLM enrichment timed out, core tribological math preserved',
              },
            },
          },
        }));
        if (fallbackOps.length > 0) {
          await BatchRow.bulkWrite(fallbackOps);
        }
      }

      // Update progress
      const processed = Math.min(rawRows.length, c + chunk.length + failedCount);
      const pct = Math.round((processed / rawRows.length) * 100);
      await Batch.updateOne(
        { _id: batchId },
        {
          $set: {
            processedRows: processed,
            successRows: successCount,
            failedRows: failedCount,
            progress: pct,
          },
        }
      );
    }

    // Step 4: Finalize batch
    await Batch.updateOne(
      { _id: batchId },
      {
        $set: {
          status: 'done',
          progress: 100,
          processedRows: rawRows.length,
          successRows: successCount,
          failedRows: failedCount,
        },
      }
    );
  } catch (batchErr) {
    console.error(`Fatal batch job error on ${batchId}:`, batchErr);
    await Batch.updateOne(
      { _id: batchId },
      {
        $set: {
          status: 'failed',
          errorMessage: batchErr.message,
        },
      }
    );
  }
};

/**
 * Re-evaluates failed rows in a batch
 * @param {ObjectId} batchId
 */
const retryFailedRows = async (batchId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error('Batch record not found');
  }

  const failedRows = await BatchRow.find({ batchId, status: 'failed' });
  if (failedRows.length === 0) {
    return {
      retriedTotal: 0,
      recoveredCount: 0,
      stillFailedCount: 0,
      message: 'No failed rows found in this batch.',
    };
  }

  let recoveredCount = 0;
  let stillFailedCount = 0;

  for (const row of failedRows) {
    const validation = validateRow(row.inputs, row.rowIndex - 1);
    if (!validation.valid) {
      row.error = validation.error;
      await row.save();
      stillFailedCount++;
      continue;
    }

    try {
      const math = calcService.calculateDiagnostics(validation.data);
      const analyses = await processBatchLLM([
        {
          rowIndex: row.rowIndex,
          inputs: validation.data,
          results: math.results,
        },
      ]);
      const analysis = analyses[0] || null;

      row.inputs = validation.data;
      row.results = math.results;
      row.llmResult = analysis;
      row.status = 'success';
      row.error = null;
      await row.save();
      recoveredCount++;
    } catch (err) {
      row.error = `Calculation error on retry: ${err.message}`;
      await row.save();
      stillFailedCount++;
    }
  }

  // Update batch aggregate counters
  const [successCount, currentFailedCount] = await Promise.all([
    BatchRow.countDocuments({ batchId, status: 'success' }),
    BatchRow.countDocuments({ batchId, status: 'failed' }),
  ]);

  batch.successRows = successCount;
  batch.failedRows = currentFailedCount;
  batch.processedRows = successCount + currentFailedCount;
  batch.progress = 100;
  batch.status = 'done';
  await batch.save();

  return {
    retriedTotal: failedRows.length,
    recoveredCount,
    stillFailedCount,
    batch,
  };
};

module.exports = {
  MAX_ROW_LIMIT,
  parseCsvBuffer,
  validateRow,
  processBatchJob,
  retryFailedRows,
};

