require('dotenv').config();
const { connectDB, closeDB } = require('../config/db');
const {
  User,
  Organisation,
  Vehicle,
  Calculation,
  Batch,
  BatchRow,
  AuditLog,
} = require('../models');

const seedData = async () => {
  try {
    console.log('--- Starting Database Seeding ---');
    await connectDB();

    // Clean up existing demo test records
    await User.deleteMany({ email: { $in: ['demo@mech-online.com', 'garage@mech-online.com'] } });
    await Organisation.deleteMany({ name: 'Apex Performance Motors' });
    await Vehicle.deleteMany({ registrationNo: 'MH-12-AB-9821' });

    console.log('Creating Demo Individual User...');
    const individualUser = await User.create({
      name: 'Aniket Sharma',
      email: 'demo@mech-online.com',
      passwordHash: 'Password123!', // Will be hashed by pre-save hook
      accountType: 'individual',
      role: 'user',
      phone: '+91 98765 43210',
      preferences: { units: 'km', theme: 'dark' },
      isActive: true,
    });
    console.log(`Demo Individual User created: ${individualUser.email} [ID: ${individualUser._id}]`);

    console.log('Creating Demo Organisation Owner & Organisation...');
    const orgOwner = await User.create({
      name: 'Rajesh Verma (Master Tech)',
      email: 'garage@mech-online.com',
      passwordHash: 'Password123!',
      accountType: 'organisation',
      role: 'owner',
      phone: '+91 98220 11223',
      preferences: { units: 'km', theme: 'dark' },
      isActive: true,
    });

    const demoOrg = await Organisation.create({
      name: 'Apex Performance Motors',
      type: 'garage',
      registrationNo: 'REG-MH-2024-9812',
      address: {
        street: 'Plot 42, MIDC Industrial Area',
        city: 'Nagpur',
        state: 'Maharashtra',
        zip: '440028',
        country: 'India',
      },
      contactPerson: 'Rajesh Verma',
      mechanicsCount: 6,
      fleetSize: 45,
      ownerId: orgOwner._id,
      members: [{ userId: orgOwner._id, role: 'owner' }],
    });

    // Link organisationId to orgOwner
    orgOwner.organisationId = demoOrg._id;
    await orgOwner.save();
    console.log(`Demo Organisation created: ${demoOrg.name} [ID: ${demoOrg._id}]`);

    console.log('Creating Demo Vehicle...');
    const demoVehicle = await Vehicle.create({
      ownerId: individualUser._id,
      make: 'Tata',
      model: 'Nexon',
      year: 2023,
      engineType: 'Turbo Petrol',
      registrationNo: 'MH-12-AB-9821',
      odometer: 14200,
    });
    console.log(`Demo Vehicle created: ${demoVehicle.registrationNo} [ID: ${demoVehicle._id}]`);

    console.log('Creating Demo Calculation Record...');
    const demoCalc = await Calculation.create({
      ownerId: individualUser._id,
      vehicleId: demoVehicle._id,
      inputs: {
        saeBaseline: '5W-30',
        effluxTime: 40.2,
        measuredViscosity: 110.0,
        temperature: 27.5,
        blotterScore: 100,
        baseOilType: 'Full-Synthetic',
        engineType: 'Naturally Aspirated Petrol',
        drivingCondition: 'Highway',
        currentMileage: 1200,
      },
      results: {
        ohi: 98,
        rulKm: 9800,
        viscosityRatio: 1.0,
        devPct: 0.0,
        serviceRecommendation: 'Optimal',
        mechanicAdvisory: 'Viscosity and additives on nominal specification. Optimal fluid film.',
        remainingHours: 188,
        nextServiceOdometer: 11000,
      },
      source: 'manual',
    });
    console.log(`Demo Calculation created: OHI ${demoCalc.results.ohi}% [ID: ${demoCalc._id}]`);

    // --- TEST BATCH CASCADE DELETION ACCEPTANCE CRITERIA ---
    console.log('\n--- Verifying Batch Cascade Deletion Acceptance Criteria ---');
    const testBatch = await Batch.create({
      ownerId: orgOwner._id,
      fileName: 'test_fleet_telemetry.csv',
      rowCount: 3,
      status: 'done',
      progress: 100,
    });

    await BatchRow.create([
      { batchId: testBatch._id, rowIndex: 1, inputs: { plate: 'MH-01-A-1001' }, status: 'success' },
      { batchId: testBatch._id, rowIndex: 2, inputs: { plate: 'MH-01-A-1002' }, status: 'success' },
      { batchId: testBatch._id, rowIndex: 3, inputs: { plate: 'MH-01-A-1003' }, status: 'success' },
    ]);

    const initialRowsCount = await BatchRow.countDocuments({ batchId: testBatch._id });
    console.log(`Created test Batch (${testBatch._id}) with ${initialRowsCount} BatchRows.`);

    console.log('Deleting Batch using findOneAndDelete...');
    await Batch.findOneAndDelete({ _id: testBatch._id });

    const remainingRowsCount = await BatchRow.countDocuments({ batchId: testBatch._id });
    console.log(`BatchRows remaining after cascade delete: ${remainingRowsCount}`);

    if (remainingRowsCount === 0) {
      console.log('VERIFIED: Batch cascade deletion SUCCESSFUL (All associated BatchRows removed)!');
    } else {
      throw new Error(`Cascade deletion failed! ${remainingRowsCount} rows remained.`);
    }

    console.log('\nAll Database Acceptance Criteria Passed Successfully!');
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    await closeDB();
    process.exit(1);
  }
};

seedData();
