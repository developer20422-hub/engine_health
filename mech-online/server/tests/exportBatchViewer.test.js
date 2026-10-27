const request = require('supertest');
const { app } = require('../src/server');
const { connectDB, closeDB } = require('../src/config/db');
const { User, Batch, BatchRow } = require('../src/models');
const { generateStyledExcelWorkbook, generatePlainCsv, extractRowData } = require('../src/services/exportService');

let demoUser;
let testBatch;

jest.setTimeout(30000);

beforeAll(async () => {

  await connectDB();
  demoUser = await User.findOne({ email: 'demo@mech-online.com' });
  if (!demoUser) {
    demoUser = await User.create({
      name: 'Stage 07 Demo User',
      email: 'demo@mech-online.com',
      passwordHash: 'dummyhash123',
      accountType: 'organisation',
      role: 'owner',
    });
  }

  // Create sample test batch
  testBatch = await Batch.create({
    ownerId: demoUser._id,
    fileName: 'test_fleet_telemetry.csv',
    rowCount: 3,
    processedRows: 3,
    successRows: 2,
    failedRows: 1,
    progress: 100,
    status: 'done',
  });

  // Create sample test rows (including 1 with formula injection attempt and 1 failed row)
  await BatchRow.create([
    {
      batchId: testBatch._id,
      rowIndex: 1,
      inputs: {
        registrationNo: 'MH-12-AB-9821',
        saeBaseline: '15W-40',
        measuredViscosity: 225.0,
        effluxTime: 70.1,
        temperature: 28.0,
        blotterScore: 100,
        currentMileage: 18500,
      },
      results: {
        measuredViscosity: 225.0,
        ohi: 88,
        rulKm: 6450,
        devPct: 0.0,
        serviceRecommendation: 'Optimal',
      },
      llmResult: {
        tribologicalRisk: 'Low',
        summary: 'Lubricant hydrodynamic film is optimal. Cleared for heavy duty operations.',
        recommendedAction: 'Continue regular service schedule.',
        confidenceScore: 0.95,
      },
      status: 'success',
      error: null,
    },
    {
      batchId: testBatch._id,
      rowIndex: 2,
      inputs: {
        registrationNo: '=cmd|/c calc!A1', // Formula injection attempt!
        saeBaseline: '5W-30',
        measuredViscosity: 74.0,
        effluxTime: 30.5,
        temperature: 27.5,
        blotterScore: 75,
        currentMileage: 9800,
      },
      results: {
        measuredViscosity: 74.0,
        ohi: 48,
        rulKm: 1100,
        devPct: -32.7,
        serviceRecommendation: 'Service Soon',
      },
      llmResult: {
        tribologicalRisk: 'High',
        summary: 'Severe fuel shear drop detected (-32%). Injector dilution risk.',
        recommendedAction: 'Inspect fuel injectors and change oil within 1,100 km.',
        confidenceScore: 0.88,
      },
      status: 'success',
      error: null,
    },
    {
      batchId: testBatch._id,
      rowIndex: 3,
      inputs: {
        registrationNo: 'KA-03-ERR-001',
        saeBaseline: 'INVALID_GRADE',
        measuredViscosity: 999.0,
      },
      results: null,
      llmResult: null,
      status: 'failed',
      error: 'Invalid or missing SAE baseline',
    },
  ]);
});

afterAll(async () => {
  if (testBatch) {
    await BatchRow.deleteMany({ batchId: testBatch._id });
    await Batch.deleteOne({ _id: testBatch._id });
  }
  await closeDB();
});

describe('Stage 07 — Styled Export & Batch Viewer Test Suite', () => {
  test('extractRowData applies formula injection guard on text cells', () => {
    const maliciousRow = {
      rowIndex: 2,
      inputs: {
        registrationNo: '=cmd|/c calc!A1',
        saeBaseline: '5W-30',
      },
      results: {
        measuredViscosity: 74.0,
        ohi: 48,
      },
      llmResult: {
        summary: '+cmd /c dir',
        recommendedAction: '@echo off',
      },
      status: 'success',
    };

    const extracted = extractRowData(maliciousRow);
    expect(extracted.plate).toBe("'=cmd|/c calc!A1");
    expect(extracted.summary).toBe("'+cmd /c dir");
    expect(extracted.recommendedAction).toBe("'@echo off");
  });

  test('generateStyledExcelWorkbook creates workbook with frozen header, styling, and filters', async () => {
    const rows = await BatchRow.find({ batchId: testBatch._id }).sort({ rowIndex: 1 }).lean();
    const workbook = await generateStyledExcelWorkbook(testBatch, rows);

    expect(workbook).toBeDefined();
    const worksheet = workbook.getWorksheet('Oil Telemetry Report');
    expect(worksheet).toBeDefined();

    // Check frozen header view
    expect(worksheet.views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: 'frozen', ySplit: 1 }),
      ])
    );

    // Check AutoFilter applied
    expect(worksheet.autoFilter).toBeDefined();
    expect(worksheet.autoFilter.from).toBe('A1');

    // Check header row styling (obsidian brand background & amber text)
    const headerRow = worksheet.getRow(1);
    expect(headerRow.height).toBe(32);
    const firstHeaderCell = headerRow.getCell(1);
    expect(firstHeaderCell.fill?.fgColor?.argb).toBe('FF121721');
    expect(firstHeaderCell.font?.color?.argb).toBe('FFFF8800');

    // Check data rows count (header + 3 data rows = 4)
    expect(worksheet.rowCount).toBe(4);

    // Check formula injection guard on row 2
    const maliciousCell = worksheet.getRow(3).getCell(2); // Row 2 in batch is row 3 in Excel
    expect(maliciousCell.value).toBe("'=cmd|/c calc!A1");
  });

  test('generatePlainCsv generates valid RFC 4180 CSV with formula protection', async () => {
    const rows = await BatchRow.find({ batchId: testBatch._id }).sort({ rowIndex: 1 }).lean();
    const csv = generatePlainCsv(testBatch, rows);

    expect(csv).toBeDefined();
    expect(csv).toContain('"Row #"');
    expect(csv).toContain('"Vehicle Plate"');
    expect(csv).toContain('"MH-12-AB-9821"');
    // Ensure formula guard escaped malicious input
    expect(csv).toContain('"\'=cmd|/c calc!A1"');
  });

  test('GET /api/batches/:id/export/excel returns XLSX file stream', async () => {
    const res = await request(app)
      .get(`/api/batches/${testBatch._id}/export/excel`)
      .buffer()
      .parse((res, callback) => {
        let data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(data)));
      })
      .expect(200);

    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('.xlsx');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(1000);
  });


  test('GET /api/batches/:id/export/csv returns plain CSV with proper headers', async () => {
    const res = await request(app)
      .get(`/api/batches/${testBatch._id}/export/csv`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('.csv');
    expect(res.text).toContain('"Vehicle Plate"');
    expect(res.text).toContain('MH-12-AB-9821');
  });

  test('PATCH /api/batches/:id renames the batch file name', async () => {
    const res = await request(app)
      .patch(`/api/batches/${testBatch._id}`)
      .send({ fileName: 'renamed_fleet_telemetry.csv' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.fileName).toBe('renamed_fleet_telemetry.csv');

    const updated = await Batch.findById(testBatch._id);
    expect(updated.fileName).toBe('renamed_fleet_telemetry.csv');
  });

  test('GET /api/batches/:id/rows supports server-side search, sort, and risk filtering', async () => {
    // 1. Search filter
    const searchRes = await request(app)
      .get(`/api/batches/${testBatch._id}/rows?search=MH-12`)
      .expect(200);

    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.rows.length).toBe(1);
    expect(searchRes.body.data.rows[0].inputs.registrationNo).toBe('MH-12-AB-9821');

    // 2. Risk filter (High risk only)
    const riskRes = await request(app)
      .get(`/api/batches/${testBatch._id}/rows?risk=High`)
      .expect(200);

    expect(riskRes.body.success).toBe(true);
    expect(riskRes.body.data.rows.length).toBe(1);
    expect(riskRes.body.data.rows[0].llmResult.tribologicalRisk).toBe('High');

    // 3. Sorting (by RUL descending)
    const sortRes = await request(app)
      .get(`/api/batches/${testBatch._id}/rows?sortBy=rul&sortOrder=desc`)
      .expect(200);

    expect(sortRes.body.success).toBe(true);
    const successRows = sortRes.body.data.rows.filter((r) => r.status === 'success');
    expect(successRows[0].results.rulKm).toBeGreaterThanOrEqual(successRows[1].results.rulKm);
  });

  test('POST /api/batches/:id/retry triggers failed row retry and returns results', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatch._id}/retry`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.retriedTotal).toBe(1);
    expect(res.body.data.stillFailedCount).toBe(1); // Row 3 had INVALID_GRADE so remains failed
  });
});
