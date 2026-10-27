const { Batch, BatchRow, User } = require('../models');
const { sendResponse } = require('../utils/format');
const { parseCsvBuffer, validateRow, processBatchJob, retryFailedRows, MAX_ROW_LIMIT } = require('../services/csvBatchProcessor');
const { generateStyledExcelWorkbook, generatePlainCsv } = require('../services/exportService');


/**
 * Helper to resolve owner and org IDs
 */
const resolveOwnerAndOrg = async (req) => {
  if (req.user && req.user._id) {
    return {
      userId: req.user._id,
      orgId: req.user.organisationId || null,
    };
  }
  const demoUser = await User.findOne({ email: 'demo@mech-online.com' });
  return {
    userId: demoUser ? demoUser._id : null,
    orgId: null,
  };
};

/**
 * POST /api/batches/preview
 * Previews first 5 rows and sample validation errors without creating a batch
 */
const previewCsv = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return sendResponse(res, 400, null, {
        message: 'No CSV file provided for preview',
        code: 'MISSING_FILE',
      });
    }

    const rawRows = await parseCsvBuffer(req.file.buffer);

    if (rawRows.length === 0) {
      return sendResponse(res, 400, null, {
        message: 'CSV file is empty or missing data rows',
        code: 'EMPTY_CSV',
      });
    }

    if (rawRows.length > MAX_ROW_LIMIT) {
      return sendResponse(res, 400, null, {
        message: `File exceeds maximum row limit of ${MAX_ROW_LIMIT} rows (found ${rawRows.length} rows)`,
        code: 'ROW_LIMIT_EXCEEDED',
      });
    }

    const previewRows = [];
    const sampleErrors = [];

    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const val = validateRow(rawRows[i], i);
      previewRows.push({
        rowIndex: i + 1,
        raw: rawRows[i],
        parsed: val.valid ? val.data : null,
        valid: val.valid,
        error: val.error || null,
      });
      if (!val.valid) {
        sampleErrors.push(`Row ${i + 1}: ${val.error}`);
      }
    }

    return sendResponse(res, 200, {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      totalRows: rawRows.length,
      previewRows,
      sampleErrors,
      isValid: sampleErrors.length === 0,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/batches/upload
 * Starts background ingestion, math execution, and LLM processing
 */
const uploadCsv = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return sendResponse(res, 400, null, {
        message: 'No CSV file provided for processing',
        code: 'MISSING_FILE',
      });
    }

    const { userId, orgId } = await resolveOwnerAndOrg(req);
    if (!userId) {
      return sendResponse(res, 401, null, {
        message: 'Authentication required to process CSV batches',
        code: 'UNAUTHORIZED',
      });
    }

    const rawRows = await parseCsvBuffer(req.file.buffer);

    if (rawRows.length === 0) {
      return sendResponse(res, 400, null, {
        message: 'CSV file contains no valid rows',
        code: 'EMPTY_CSV',
      });
    }

    if (rawRows.length > MAX_ROW_LIMIT) {
      return sendResponse(res, 400, null, {
        message: `CSV row cap exceeded: maximum allowed is ${MAX_ROW_LIMIT} rows`,
        code: 'ROW_LIMIT_EXCEEDED',
      });
    }

    // Create Batch in database
    const batch = await Batch.create({
      ownerId: userId,
      organisationId: orgId,
      fileName: req.file.originalname,
      rowCount: rawRows.length,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      progress: 0,
      status: 'queued',
    });

    // Spawn async background processing without blocking response
    setImmediate(() => {
      processBatchJob(batch._id, rawRows).catch((err) =>
        console.error('Async batch error:', err)
      );
    });

    return sendResponse(res, 202, {
      batchId: batch._id,
      fileName: batch.fileName,
      rowCount: batch.rowCount,
      status: 'queued',
      progress: 0,
      message: 'Batch uploaded and queued for processing.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/batches/:id
 * Retrieves real-time batch progress & status
 */
const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const batch = await Batch.findOne({ _id: id, deletedAt: null })
      .populate('ownerId', 'name email')
      .lean();

    if (!batch) {
      return sendResponse(res, 404, null, {
        message: 'Batch record not found',
        code: 'BATCH_NOT_FOUND',
      });
    }

    return sendResponse(res, 200, batch);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/batches/:id/rows
 * Retrieves paginated rows for a specific batch with server-side search, filtering, and sorting
 */
const getBatchRows = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const query = { batchId: id };

    // Status filter
    if (req.query.status && ['pending', 'success', 'failed'].includes(req.query.status.toLowerCase())) {
      query.status = req.query.status.toLowerCase();
    }

    // Risk filter
    if (req.query.risk && ['low', 'moderate', 'high', 'critical'].includes(req.query.risk.toLowerCase())) {
      query['llmResult.tribologicalRisk'] = new RegExp(`^${req.query.risk}$`, 'i');
    }

    // Search query across plate, SAE baseline, base oil, and AI summary/recommendations
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { 'inputs.registrationNo': searchRegex },
        { 'inputs.saeBaseline': searchRegex },
        { 'inputs.baseOilType': searchRegex },
        { 'llmResult.summary': searchRegex },
        { 'llmResult.recommendedAction': searchRegex },
      ];
    }

    // Sorting
    const sortFieldMap = {
      rowIndex: 'rowIndex',
      rul: 'results.rulKm',
      viscosity: 'results.measuredViscosity',
      ohi: 'results.ohi',
      createdAt: 'createdAt',
    };
    const sortField = sortFieldMap[req.query.sortBy] || 'rowIndex';
    const sortDirection = req.query.sortOrder === 'desc' ? -1 : 1;
    const sortObj = { [sortField]: sortDirection };

    const [rows, total] = await Promise.all([
      BatchRow.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      BatchRow.countDocuments(query),
    ]);

    return sendResponse(res, 200, {
      rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/batches
 * List all batches for current owner or organisation
 */
const getBatches = async (req, res, next) => {
  try {
    const { userId, orgId } = await resolveOwnerAndOrg(req);
    if (!userId) {
      return sendResponse(res, 200, []);
    }

    const query = {
      deletedAt: null,
      $or: [{ ownerId: userId }, ...(orgId ? [{ organisationId: orgId }] : [])],
    };

    const batches = await Batch.find(query)
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return sendResponse(res, 200, batches);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/batches/:id
 * Rename a batch
 */
const renameBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fileName } = req.body;

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      return sendResponse(res, 400, null, {
        message: 'File name is required to rename the batch',
        code: 'INVALID_FILENAME',
      });
    }

    const batch = await Batch.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!batch) {
      return sendResponse(res, 404, null, {
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND',
      });
    }

    batch.fileName = fileName.trim();
    await batch.save();

    return sendResponse(res, 200, batch);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/batches/:id/retry
 * Retries failed rows in a batch
 */
const retryBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await retryFailedRows(id);
    return sendResponse(res, 200, result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/batches/:id/export
 * GET /api/batches/:id/export/excel
 * GET /api/batches/:id/export/csv
 * Exports batch data as styled Excel (.xlsx) or RFC-4180 CSV
 */
const exportBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || (req.path.includes('/csv') ? 'csv' : 'xlsx')).toLowerCase();

    const batch = await Batch.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!batch) {
      return sendResponse(res, 404, null, {
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND',
      });
    }

    const rows = await BatchRow.find({ batchId: id }).sort({ rowIndex: 1 }).lean();

    const baseName = (batch.fileName || 'batch_report')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'csv') {
      const csvData = generatePlainCsv(batch, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}_report.csv"`);
      return res.status(200).send(csvData);
    }

    // Default: Styled Excel workbook (.xlsx)
    const workbook = await generateStyledExcelWorkbook(batch, rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}_report.xlsx"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/batches/:id
 * Delete a batch and cascade delete its rows
 */
const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, orgId } = await resolveOwnerAndOrg(req);

    const batch = await Batch.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!batch) {
      return sendResponse(res, 404, null, {
        message: 'Batch not found',
        code: 'BATCH_NOT_FOUND',
      });
    }

    // Check ownership if user is authenticated
    if (userId) {
      const isOwner = batch.ownerId.toString() === userId.toString();
      const isSameOrg = orgId && batch.organisationId && batch.organisationId.toString() === orgId.toString();

      if (!isOwner && !isSameOrg) {
        return sendResponse(res, 403, null, {
          message: 'Forbidden: You do not have permission to delete this batch',
          code: 'FORBIDDEN',
        });
      }
    }

    // Soft delete batch and cascade delete rows
    batch.deletedAt = new Date();
    await batch.save();
    await BatchRow.deleteMany({ batchId: id });

    return sendResponse(res, 200, {
      id,
      deleted: true,
      message: 'Batch and associated records deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewCsv,
  uploadCsv,
  getBatchById,
  getBatchRows,
  getBatches,
  renameBatch,
  retryBatch,
  exportBatch,
  deleteBatch,
};

