require('dotenv').config();
const request = require('supertest');
const { app } = require('../src/server');
const { connectDB, closeDB } = require('../src/config/db');

describe('Stage 2 — REST API Routes & Validation Acceptance Tests', () => {
  let createdCalcId = null;
  let createdVehicleId = null;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  // 1. POST /api/calc (Pure calculation)
  test('POST /api/calc with valid inputs returns 200 and standard envelope', async () => {
    const res = await request(app)
      .post('/api/calc')
      .send({
        saeBaseline: '5W-30',
        measuredViscosity: 110.0,
        temperature: 27.5,
        blotterScore: 100,
        baseOilType: 'Full-Synthetic',
        engineType: 'Naturally Aspirated Petrol',
        drivingCondition: 'Highway',
        currentMileage: 1000,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.results.ohi).toBe(100);
    expect(res.body.data.results.serviceRecommendation).toBe('Optimal');
    expect(res.body.error).toBeNull();
  });

  // 2. POST /api/calc Validation Error
  test('POST /api/calc with invalid payload returns 400 and VALIDATION_ERROR details', async () => {
    const res = await request(app)
      .post('/api/calc')
      .send({
        saeBaseline: 'INVALID_GRADE',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  // 3. Vehicles CRUD
  test('POST /api/vehicles creates a vehicle with validation', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .send({
        make: 'Mahindra',
        model: 'Scorpio-N',
        year: 2024,
        engineType: 'Diesel',
        registrationNo: `MH-31-EX-${Math.floor(1000 + Math.random() * 9000)}`,
        odometer: 8500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    createdVehicleId = res.body.data._id;
  });

  test('GET /api/vehicles returns an array of vehicles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // 4. Calculations CRUD with linked vehicle
  test('POST /api/calculations saves calculation and links to vehicle', async () => {
    const res = await request(app)
      .post('/api/calculations')
      .send({
        vehicleId: createdVehicleId,
        saeBaseline: '15W-40',
        measuredViscosity: 225.0,
        temperature: 27.5,
        blotterScore: 100,
        baseOilType: 'Semi-Synthetic',
        engineType: 'Diesel',
        drivingCondition: 'Highway',
        currentMileage: 8500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    createdCalcId = res.body.data._id;
  });

  test('GET /api/calculations returns paginated list of calculations', async () => {
    const res = await request(app).get('/api/calculations?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });

  test('GET /api/calculations/:id returns single calculation record', async () => {
    const res = await request(app).get(`/api/calculations/${createdCalcId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(createdCalcId);
  });

  test('PATCH /api/calculations/:id updates calculation advisory', async () => {
    const res = await request(app)
      .patch(`/api/calculations/${createdCalcId}`)
      .send({ mechanicAdvisory: 'Updated inspection note by Chief Engineer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.mechanicAdvisory).toBe('Updated inspection note by Chief Engineer');
  });

  test('DELETE /api/calculations/:id soft deletes calculation', async () => {
    const res = await request(app).delete(`/api/calculations/${createdCalcId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mode).toBe('soft');

    // Confirm it is no longer returned in active list
    const getRes = await request(app).get(`/api/calculations/${createdCalcId}`);
    expect(getRes.status).toBe(404);
  });

  // Clean up vehicle
  test('DELETE /api/vehicles/:id deletes vehicle', async () => {
    const res = await request(app).delete(`/api/vehicles/${createdVehicleId}?hard=true`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
