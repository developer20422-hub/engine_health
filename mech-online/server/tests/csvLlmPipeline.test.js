const request = require('supertest');
const { app } = require('../src/server');
const { connectDB, closeDB } = require('../src/config/db');
const { Batch, BatchRow, Calculation, User } = require('../src/models');
const { stripCodeFences, processBatchLLM, batchAnalysisSchema } = require('../src/services/llmService');

describe('Stage 06: CSV Upload and LLM Pipeline Tests', () => {
  let userCookies;
  let testBatchId;
  let initialCalculationCount;

  beforeAll(async () => {
    await connectDB();

    // Register a test operator
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Telemetry Operator',
        email: `batch_operator_${Date.now()}@mech-online.com`,
        password: 'TurboFalcon#2026',
        accountType: 'organisation',
        organisationName: 'Apex Fleet Analytics',
      });

    userCookies = res.headers['set-cookie'];
    initialCalculationCount = await Calculation.countDocuments();
  });

  afterAll(async () => {
    await closeDB();
  });

  test('1. LLM Service: code fence stripping and schema validation', async () => {
    const rawFenced = '```json\n{"analyses": [{"rowIndex": 1, "summary": "Fluid is in peak operational health.", "tribologicalRisk": "Low", "recommendedAction": "Safe for regular duty.", "keyInsights": ["Viscosity shift nominal"], "confidenceScore": 98}]}\n```';
    const cleaned = stripCodeFences(rawFenced);
    expect(cleaned.startsWith('```')).toBe(false);

    const parsed = JSON.parse(cleaned);
    const validated = batchAnalysisSchema.parse(parsed);
    expect(validated.analyses.length).toBe(1);
    expect(validated.analyses[0].tribologicalRisk).toBe('Low');
  });

  test('2. Preview CSV endpoint: validates headers and returns first 5 rows', async () => {
    const csvContent = `registrationNo,saeBaseline,measuredViscosity,temperature,blotterScore,baseOilType,engineType,currentMileage
MH-12-AB-1001,5W-30,110.0,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,12000
MH-12-AB-1002,0W-20,76.0,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,8000
MH-12-AB-1003,15W-40,225.0,27.5,45,Mineral,Diesel,25000
MH-12-AB-1004,INVALID_GRADE,999.0,27.5,100,Mineral,Diesel,5000`;

    const res = await request(app)
      .post('/api/batches/preview')
      .set('Cookie', userCookies)
      .attach('file', Buffer.from(csvContent, 'utf8'), 'fleet_sample.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRows).toBe(4);
    expect(res.body.data.previewRows.length).toBe(4);
    expect(res.body.data.sampleErrors.length).toBeGreaterThan(0);
    expect(res.body.data.sampleErrors[0]).toContain('Row 4');
  });

  test('3. Upload CSV: runs pure maths per row, batches LLM, and tracks progress', async () => {
    // 5 valid rows + 1 invalid row to verify non-fatal error isolation
    const csvContent = `registrationNo,saeBaseline,measuredViscosity,temperature,blotterScore,baseOilType,engineType,currentMileage
MH-14-AA-2001,5W-30,108.5,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,15000
MH-14-AA-2002,5W-30,78.0,27.5,75,Semi-Synthetic,Turbo Petrol,32000
MH-14-AA-2003,15W-40,240.0,27.5,45,Mineral,Diesel,45000
MH-14-AA-2004,0W-20,74.5,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,9000
MH-14-AA-2005,20W-50,295.0,27.5,100,Mineral,Naturally Aspirated Petrol,50000
MH-14-AA-2006,BAD-SAE,15.0,27.5,100,Mineral,Diesel,1000`;

    const res = await request(app)
      .post('/api/batches/upload')
      .set('Cookie', userCookies)
      .attach('file', Buffer.from(csvContent, 'utf8'), 'test_fleet_telemetry.csv');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batchId).toBeDefined();
    expect(res.body.data.rowCount).toBe(6);

    testBatchId = res.body.data.batchId;

    // Poll until batch completes
    let status = 'queued';
    let attempts = 0;
    while (status !== 'done' && attempts < 25) {
      await new Promise((r) => setTimeout(r, 400));
      const pollRes = await request(app)
        .get(`/api/batches/${testBatchId}`)
        .set('Cookie', userCookies);
      status = pollRes.body.data.status;
      attempts++;
    }

    expect(status).toBe('done');

    const finalBatch = await request(app)
      .get(`/api/batches/${testBatchId}`)
      .set('Cookie', userCookies);

    expect(finalBatch.body.data.progress).toBe(100);
    expect(finalBatch.body.data.successRows).toBe(5);
    expect(finalBatch.body.data.failedRows).toBe(1);
  });

  test('4. Batch Rows: verify math results and LLM fields per row', async () => {
    const res = await request(app)
      .get(`/api/batches/${testBatchId}/rows?limit=10`)
      .set('Cookie', userCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rows.length).toBe(6);

    const validRow = res.body.data.rows[0];
    expect(validRow.status).toBe('success');
    expect(validRow.inputs.saeBaseline).toBe('5W-30');
    // Math results from calcService
    expect(validRow.results.ohi).toBeDefined();
    expect(validRow.results.rulKm).toBeDefined();
    expect(validRow.results.devPct).toBeDefined();
    expect(validRow.results.serviceRecommendation).toBeDefined();
    // LLM fields
    expect(validRow.llmResult).toBeDefined();
    expect(validRow.llmResult.tribologicalRisk).toMatch(/Low|Moderate|High|Critical/);
    expect(validRow.llmResult.recommendedAction).toBeDefined();
    expect(Array.isArray(validRow.llmResult.keyInsights)).toBe(true);
    expect(validRow.llmResult.confidenceScore).toBeGreaterThanOrEqual(0);

    // Failed row test
    const failedRow = res.body.data.rows[5];
    expect(failedRow.status).toBe('failed');
    expect(failedRow.error).toContain('Invalid or missing SAE baseline');
  });

  test('5. Strict Isolation: Batch upload did NOT alter Calculation collection', async () => {
    const currentCalculationCount = await Calculation.countDocuments();
    expect(currentCalculationCount).toBe(initialCalculationCount);
  });

  test('6. Cascade deletion: Deleting a batch deletes all its BatchRow records', async () => {
    const delRes = await request(app)
      .delete(`/api/batches/${testBatchId}`)
      .set('Cookie', userCookies);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const rowsRemaining = await BatchRow.countDocuments({ batchId: testBatchId });
    expect(rowsRemaining).toBe(0);
  });
});
