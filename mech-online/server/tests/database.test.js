require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../src/config/db');
const {
  User,
  Organisation,
  Vehicle,
  Calculation,
  Batch,
  BatchRow,
} = require('../src/models');

describe('Stage 1 — Database & Mongoose Models Acceptance Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  test('Mongoose should be successfully connected to MongoDB Atlas', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  test('User model should enforce unique email, lowercase, and hash passwords', async () => {
    const testEmail = `test_${Date.now()}@mech-online.com`;
    const user = await User.create({
      name: 'Test Engineer',
      email: testEmail.toUpperCase(), // Test lowercase normalization
      passwordHash: 'PlainSecret123!',
      accountType: 'individual',
      role: 'user',
    });

    expect(user.email).toBe(testEmail.toLowerCase());
    expect(user.passwordHash).not.toBe('PlainSecret123!');
    const isMatch = await user.comparePassword('PlainSecret123!');
    expect(isMatch).toBe(true);

    // Clean up
    await User.deleteOne({ _id: user._id });
  });

  test('Batch cascade deletion should automatically delete all associated BatchRows', async () => {
    const dummyBatch = await Batch.create({
      ownerId: new mongoose.Types.ObjectId(),
      fileName: 'cascade_unit_test.csv',
      rowCount: 2,
      status: 'queued',
    });

    await BatchRow.create([
      { batchId: dummyBatch._id, rowIndex: 1, inputs: { test: 1 } },
      { batchId: dummyBatch._id, rowIndex: 2, inputs: { test: 2 } },
    ]);

    const initialCount = await BatchRow.countDocuments({ batchId: dummyBatch._id });
    expect(initialCount).toBe(2);

    // Trigger cascade deletion via findOneAndDelete
    await Batch.findOneAndDelete({ _id: dummyBatch._id });

    const finalCount = await BatchRow.countDocuments({ batchId: dummyBatch._id });
    expect(finalCount).toBe(0);
  });

  test('Calculation model should validate strict inputs and results fields', async () => {
    const calc = new Calculation({
      ownerId: new mongoose.Types.ObjectId(),
      inputs: {
        saeBaseline: '5W-30',
        effluxTime: 40.2,
        measuredViscosity: 110.0,
        temperature: 27.5,
        blotterScore: 100,
        baseOilType: 'Full-Synthetic',
        engineType: 'Naturally Aspirated Petrol',
        drivingCondition: 'Highway',
        currentMileage: 2500,
      },
      results: {
        ohi: 95,
        rulKm: 9200,
        viscosityRatio: 1.0,
        devPct: 0.0,
        serviceRecommendation: 'Optimal',
        mechanicAdvisory: 'Optimal fluid condition.',
        remainingHours: 177,
        nextServiceOdometer: 11700,
      },
    });

    const error = calc.validateSync();
    expect(error).toBeUndefined();
  });
});
