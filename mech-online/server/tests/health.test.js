require('dotenv').config();
const request = require('supertest');
const { app } = require('../src/server');
const { closeDB } = require('../src/config/db');

describe('Server Health Endpoint Test', () => {
  afterAll(async () => {
    await closeDB();
  });

  test('GET /api/health returns 200 with standard envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('online');
    expect(res.body.data.dbConnected).toBe(true);
    expect(res.body.error).toBeNull();
  });
});
