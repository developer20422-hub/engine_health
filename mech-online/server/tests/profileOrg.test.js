const request = require('supertest');
const { app } = require('../src/server');
const { connectDB, closeDB } = require('../src/config/db');
const { User, Organisation, Vehicle, Calculation } = require('../src/models');

describe('Stage 05: Profile & Organisation Account Tests', () => {
  let ownerCookies;
  let ownerUser;
  let staffCookies;
  let staffUser;
  let orgDoc;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  test('1. Register Organisation Owner and verify organisation created', async () => {
    const ownerEmail = `org_owner_${Date.now()}@mech-online.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Vikram Garage Owner',
        email: ownerEmail,
        password: 'TitaniumShield#2026',
        accountType: 'organisation',
        organisationName: 'Vikram Advanced Fleet Hub',
        organisationType: 'garage',
        registrationNo: 'MH-GST-449102A',
        phone: '+91 98200 11223',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('owner');
    expect(res.body.data.user.accountType).toBe('organisation');
    expect(res.body.data.user.organisationId).toBeDefined();

    ownerCookies = res.headers['set-cookie'];
    ownerUser = res.body.data.user;

    orgDoc = await Organisation.findById(ownerUser.organisationId);
    expect(orgDoc).not.toBeNull();
    expect(orgDoc.name).toBe('Vikram Advanced Fleet Hub');
  });

  test('2. Update Profile details and preferences with live feedback', async () => {
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Cookie', ownerCookies)
      .send({
        name: 'Vikram S. Owner',
        phone: '+91 98200 99999',
        preferences: {
          units: 'mi',
          theme: 'dark',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Vikram S. Owner');
    expect(res.body.data.phone).toBe('+91 98200 99999');
    expect(res.body.data.preferences.units).toBe('mi');
  });

  test('3. Owner can update organisation settings', async () => {
    const res = await request(app)
      .patch('/api/organisations/me')
      .set('Cookie', ownerCookies)
      .send({
        mechanicsCount: 8,
        fleetSize: 45,
        address: {
          street: 'Plot 42 MIDC Industrial Area',
          city: 'Pune',
          state: 'Maharashtra',
          zip: '411018',
          country: 'India',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mechanicsCount).toBe(8);
    expect(res.body.data.fleetSize).toBe(45);
    expect(res.body.data.address.city).toBe('Pune');
  });

  test('4. Register a separate staff/mechanic user', async () => {
    const staffEmail = `mechanic_${Date.now()}@mech-online.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Ramesh Lead Mechanic',
        email: staffEmail,
        password: 'TorqueWrench!8844',
        accountType: 'individual',
      });

    expect(res.status).toBe(201);
    staffCookies = res.headers['set-cookie'];
    staffUser = res.body.data.user;
  });

  test('5. Owner invites staff user to organisation with role mechanic', async () => {
    const res = await request(app)
      .post('/api/organisations/invite')
      .set('Cookie', ownerCookies)
      .send({
        email: staffUser.email,
        role: 'mechanic',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('has been added as mechanic');

    // Refresh staff user from DB
    const refreshedStaff = await User.findById(staffUser._id);
    expect(refreshedStaff.organisationId.toString()).toBe(orgDoc._id.toString());
    expect(refreshedStaff.role).toBe('mechanic');
  });

  test('6. RBAC: Staff member CANNOT update organisation settings (403 Forbidden)', async () => {
    // Re-login as staff to get updated claims
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: staffUser.email,
        password: 'TorqueWrench!8844',
      });

    const activeStaffCookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .patch('/api/organisations/me')
      .set('Cookie', activeStaffCookies)
      .send({
        name: 'Hacked Garage Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_OWNER_ONLY');
  });

  test('7. RBAC: Staff member CANNOT invite other staff members (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: staffUser.email,
        password: 'TorqueWrench!8844',
      });

    const activeStaffCookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/organisations/invite')
      .set('Cookie', activeStaffCookies)
      .send({
        email: 'another_mechanic@mech-online.com',
        role: 'mechanic',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_OWNER_ONLY');
  });

  test('8. Shared Vehicles: Vehicle created by owner is visible to staff member', async () => {
    // Owner creates a fleet truck
    const createRes = await request(app)
      .post('/api/vehicles')
      .set('Cookie', ownerCookies)
      .send({
        make: 'Tata Motors',
        model: 'Prima 5530.S',
        year: 2023,
        engineType: 'Diesel',
        registrationNo: 'MH-14-GH-7788',
        odometer: 48000,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.organisationId).toBe(orgDoc._id.toString());

    // Staff user logs in and queries vehicles
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: staffUser.email,
        password: 'TorqueWrench!8844',
      });
    const activeStaffCookies = loginRes.headers['set-cookie'];

    const listRes = await request(app)
      .get('/api/vehicles')
      .set('Cookie', activeStaffCookies);

    expect(listRes.status).toBe(200);
    const found = listRes.body.data.some((v) => v.registrationNo === 'MH-14-GH-7788');
    expect(found).toBe(true);
  });

  test('9. Export My Data returns full profile, vehicles, calculations, and batches', async () => {
    const res = await request(app)
      .get('/api/auth/export-data')
      .set('Cookie', ownerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(ownerUser.email);
    expect(res.body.data.organisation).not.toBeNull();
    expect(Array.isArray(res.body.data.vehicles)).toBe(true);
    expect(Array.isArray(res.body.data.calculations)).toBe(true);
    expect(Array.isArray(res.body.data.batches)).toBe(true);
  });
});
