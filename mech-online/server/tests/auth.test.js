require('dotenv').config();
const request = require('supertest');
const { app } = require('../src/server');
const { connectDB, closeDB } = require('../src/config/db');
const { User, Organisation, Vehicle, Calculation } = require('../src/models');
const { validatePasswordStrength } = require('../src/utils/passwordPolicy');
const { sanitizeFormulaCell, sanitizeObjectForFormulaInjection } = require('../src/utils/formulaGuard');

describe('Stage 3 - Authentication & Security Test Suite', () => {
  let userAToken = null;
  let userACookies = [];
  let userBToken = null;
  let userBCookies = [];
  let userAVehicleId = null;
  let userACalcId = null;

  const testUserA = {
    name: 'Rahul Sharma',
    email: `rahul.sharma.${Date.now()}@example.com`,
    password: 'DeltaFalcon#2026',
    accountType: 'individual',
  };

  const testUserB = {
    name: 'Priya Verma',
    email: `priya.verma.${Date.now()}@example.com`,
    password: 'QuantumShield!88',
    accountType: 'individual',
  };

  const testOrgUser = {
    name: 'Karan Patel',
    email: `karan.patel.${Date.now()}@apexmotors.com`,
    password: 'VelocityTurbo*44',
    accountType: 'organisation',
    organisationName: 'Apex Motor Works',
    organisationType: 'garage',
  };

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Cleanup created test records
    await User.deleteMany({ email: { $in: [testUserA.email, testUserB.email, testOrgUser.email] } });
    if (userAVehicleId) await Vehicle.findByIdAndDelete(userAVehicleId);
    if (userACalcId) await Calculation.findByIdAndDelete(userACalcId);
    await closeDB();
  });

  // ==========================================
  // 1. Password Policy Validation Tests
  // ==========================================
  describe('Password Policy Verification', () => {
    test('Rejects passwords shorter than 8 characters with clear message', () => {
      const result = validatePasswordStrength('Short1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('Accepts compliant passwords with at least 8 characters', () => {
      const result = validatePasswordStrength('Simple88');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('Accepts strong multi-class passwords', () => {
      const result = validatePasswordStrength('V3ry$tr0ngP@ssw0rd!');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });


  // ==========================================
  // 2. Registration API Tests
  // ==========================================
  describe('User Registration', () => {
    test('POST /api/auth/register rejects weak password with HTTP 400 and clear messages', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Pass User',
          email: 'weakpass@example.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Password must be at least 8 characters long');
    });


    test('POST /api/auth/register registers individual user and sets httpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUserA);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUserA.email.toLowerCase());
      expect(res.body.data.user.accountType).toBe('individual');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.accessToken).toBeDefined();

      // Check httpOnly cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('accessToken=') && c.includes('HttpOnly'))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);

      userAToken = res.body.data.accessToken;
      userACookies = cookies;
    });

    test('POST /api/auth/register registers organisation user with owner role and organisation document', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testOrgUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.accountType).toBe('organisation');
      expect(res.body.data.user.role).toBe('owner');
      expect(res.body.data.user.organisationId).toBeDefined();

      // Verify organisation was created in DB
      const org = await Organisation.findById(res.body.data.user.organisationId);
      expect(org).toBeDefined();
      expect(org.name).toBe(testOrgUser.organisationName);
      expect(org.ownerId.toString()).toBe(res.body.data.user._id);

      // Cleanup org
      await Organisation.findByIdAndDelete(org._id);
    });

    test('POST /api/auth/register rejects duplicate email with HTTP 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUserA);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    test('Register test user B for tenancy tests', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUserB);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      userBToken = res.body.data.accessToken;
      userBCookies = res.headers['set-cookie'];
    });
  });

  // ==========================================
  // 3. Login, Lockout & Failed Attempts Tests
  // ==========================================
  describe('Login & Account Lockout Guard', () => {
    test('POST /api/auth/login succeeds with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserA.email,
          password: testUserA.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();

      userAToken = res.body.data.accessToken;
      userACookies = res.headers['set-cookie'];
    });

    test('POST /api/auth/login rejects wrong password with 401 without lockout or rate limiting', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserA.email,
          password: 'IncorrectPassword#1',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('Multiple failed login attempts do not lock out user; correct password logs in immediately', async () => {
      for (let i = 0; i < 5; i++) {
        const failedRes = await request(app)
          .post('/api/auth/login')
          .send({ email: testUserA.email, password: 'WrongPassword#999' });
        expect(failedRes.status).toBe(401);
        expect(failedRes.body.error.code).toBe('INVALID_CREDENTIALS');
      }

      // Login with correct password works immediately
      const freshLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserA.email, password: testUserA.password });

      expect(freshLogin.status).toBe(200);
      userAToken = freshLogin.body.data.accessToken;
      userACookies = freshLogin.headers['set-cookie'];
    });
  });


  // ==========================================
  // 4. Token Refresh & Rotation Tests
  // ==========================================
  describe('JWT Refresh & Rotation', () => {
    let oldRefreshToken = null;

    test('POST /api/auth/refresh rotates refresh token and returns new access token', async () => {
      // Capture current refresh token before rotating
      const refreshCookie = userACookies.find(c => c.startsWith('refreshToken='));
      oldRefreshToken = refreshCookie.split(';')[0].split('=')[1];

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', userACookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const newCookies = res.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      userACookies = newCookies;
      userAToken = res.body.data.accessToken;
    });

    test('Attempting to reuse an old invalidated refresh token detects reuse and revokes session', async () => {
      // Attempting to send the old rotated refresh token
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Verify stored refreshTokenHash in DB was wiped
      const user = await User.findOne({ email: testUserA.email }).select('+refreshTokenHash');
      expect(user.refreshTokenHash).toBeNull();

      // Log back in to refresh tokens for remaining tests
      const freshLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserA.email, password: testUserA.password });

      expect(freshLogin.status).toBe(200);
      userAToken = freshLogin.body.data.accessToken;
      userACookies = freshLogin.headers['set-cookie'];
    });
  });

  // ==========================================
  // 5. Change Password & Forgot/Reset Password
  // ==========================================
  describe('Password Management Workflows', () => {
    let resetToken = null;

    test('POST /api/auth/forgot-password issues reset token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserA.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      resetToken = res.body.data.resetToken;
    });

    test('POST /api/auth/reset-password rejects weak new password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('at least 8 characters long');
    });


    test('POST /api/auth/reset-password resets password successfully', async () => {
      const newPassword = 'BrandNewPassword@2026';
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserA.email,
          password: newPassword,
        });

      expect(loginRes.status).toBe(200);
      userAToken = loginRes.body.data.accessToken;
      userACookies = loginRes.headers['set-cookie'];
      testUserA.password = newPassword;
    });

    test('POST /api/auth/change-password validates current password and updates to new password', async () => {
      const changedPassword = 'UpdatedSecurePassword#99';
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          currentPassword: testUserA.password,
          newPassword: changedPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      testUserA.password = changedPassword;
      userAToken = res.body.data.accessToken;
    });
  });

  // ==========================================
  // 6. Multi-Tenancy & Authorization Guard (403/404)
  // ==========================================
  describe('Multi-Tenancy & Resource Isolation Acceptance Criteria', () => {
    test('User A creates a vehicle and calculation', async () => {
      // Create Vehicle for User A
      const vehRes = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          make: 'Toyota',
          model: 'Fortuner',
          year: 2023,
          engineType: 'Diesel',
          registrationNo: `MH-12-UA-${Math.floor(1000 + Math.random() * 9000)}`,
          odometer: 14000,
        });

      expect(vehRes.status).toBe(201);
      userAVehicleId = vehRes.body.data._id;

      // Create Calculation for User A
      const calcRes = await request(app)
        .post('/api/calculations')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          vehicleId: userAVehicleId,
          saeBaseline: '15W-40',
          measuredViscosity: 225.0,
          temperature: 27.5,
          blotterScore: 100,
          baseOilType: 'Semi-Synthetic',
          engineType: 'Diesel',
          drivingCondition: 'Highway',
          currentMileage: 14000,
        });

      expect(calcRes.status).toBe(201);
      userACalcId = calcRes.body.data._id;
    });

    test('User B attempting to view User A vehicle returns HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${userAVehicleId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE_ACCESS');
    });

    test('User B attempting to modify User A vehicle returns HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/vehicles/${userAVehicleId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ odometer: 99999 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE_ACCESS');
    });

    test('User B attempting to delete User A vehicle returns HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/vehicles/${userAVehicleId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE_ACCESS');
    });

    test('User B attempting to view User A calculation returns HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/calculations/${userACalcId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE_ACCESS');
    });

    test('Non-existent vehicle or calculation returns HTTP 404 Not Found', async () => {
      const nonExistentId = '66f5a3b9d0123456789abcde';
      const res = await request(app)
        .get(`/api/vehicles/${nonExistentId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    test('User A can view their own vehicle and calculation with 200 OK', async () => {
      const vehRes = await request(app)
        .get(`/api/vehicles/${userAVehicleId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(vehRes.status).toBe(200);
      expect(vehRes.body.data._id).toBe(userAVehicleId);

      const calcRes = await request(app)
        .get(`/api/calculations/${userACalcId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(calcRes.status).toBe(200);
      expect(calcRes.body.data._id).toBe(userACalcId);
    });
  });

  // ==========================================
  // 7. Formula Injection Guard Verification
  // ==========================================
  describe('CSV/Excel Formula Injection Guard', () => {
    test('Prefixes dangerous formula characters (=, +, -, @) with single quote', () => {
      expect(sanitizeFormulaCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeFormulaCell('+123456789')).toBe("'+123456789");
      expect(sanitizeFormulaCell('-cmd|"/C calc"!A0')).toBe("'-cmd|\"/C calc\"!A0");
      expect(sanitizeFormulaCell('@cmd|"/C calc"!A0')).toBe("'@cmd|\"/C calc\"!A0");
      expect(sanitizeFormulaCell('\tDangerousTab')).toBe("'\tDangerousTab");
    });

    test('Leaves regular strings untouched', () => {
      expect(sanitizeFormulaCell('Regular Mechanic Name')).toBe('Regular Mechanic Name');
      expect(sanitizeFormulaCell('MH-12-AB-1234')).toBe('MH-12-AB-1234');
      expect(sanitizeFormulaCell(12345)).toBe(12345);
    });

    test('Sanitizes deep nested object payloads', () => {
      const payload = {
        name: '=SUM(1+1)',
        notes: ['Normal Note', '@DangerousCommand'],
        metadata: {
          formula: '+cmd|"/C notepad"!A0',
        },
      };

      const cleaned = sanitizeObjectForFormulaInjection(payload);
      expect(cleaned.name).toBe("'=SUM(1+1)");
      expect(cleaned.notes[0]).toBe('Normal Note');
      expect(cleaned.notes[1]).toBe("'@DangerousCommand");
      expect(cleaned.metadata.formula).toBe("'+cmd|\"/C notepad\"!A0");
    });
  });

  // ==========================================
  // 8. Logout Verification
  // ==========================================
  describe('Logout & Session Termination', () => {
    test('POST /api/auth/logout clears auth cookies and revokes session', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userAToken}`)
        .set('Cookie', userACookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cookies cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies.some(c => c.includes('accessToken=;') || c.includes('accessToken=deleted'))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken=;') || c.includes('refreshToken=deleted'))).toBe(true);

      // Refreshing with logged out session fails
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', userACookies);

      expect(refreshRes.status).toBe(401);
    });
  });
});
