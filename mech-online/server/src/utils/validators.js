const { z } = require('zod');

// Regex for 24-character hexadecimal MongoDB ObjectId
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

// 1. Calculation Input Validator (for POST /api/calc and POST /api/calculations)
const calculationInputSchema = z.object({
  saeBaseline: z.enum(['0W-20', '5W-30', '10W-40', '15W-40', '20W-50'], {
    errorMap: () => ({ message: 'SAE baseline must be one of: 0W-20, 5W-30, 10W-40, 15W-40, 20W-50' }),
  }),
  measuredViscosity: z.number().min(10).max(400).optional(),
  effluxTime: z.number().min(10).max(200).optional(),
  temperature: z.number().min(15).max(45).default(27.5).optional(),
  blotterScore: z.union([z.literal(15), z.literal(45), z.literal(75), z.literal(100)]).default(100).optional(),
  baseOilType: z.enum(['Mineral', 'Semi-Synthetic', 'Full-Synthetic']).default('Full-Synthetic').optional(),
  engineType: z.enum(['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel']).default('Naturally Aspirated Petrol').optional(),
  drivingCondition: z.enum(['Highway', 'Mixed Urban', 'City Stop-and-Go']).default('Mixed Urban').optional(),
  currentMileage: z.number().min(0).default(0).optional(),
  units: z.enum(['km', 'mi']).default('km').optional(),
  vehicleId: objectIdSchema.optional().nullable(),
  source: z.enum(['manual', 'batch']).default('manual').optional(),
}).refine(data => data.measuredViscosity !== undefined || data.effluxTime !== undefined, {
  message: 'Either measuredViscosity (cSt) or effluxTime (seconds) must be provided',
  path: ['measuredViscosity'],
});

// 2. Vehicle Creation Validator
const createVehicleSchema = z.object({
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  engineType: z.enum(['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel']),
  registrationNo: z.string().min(2, 'Registration number is required').max(20).trim(),
  odometer: z.number().min(0, 'Odometer reading cannot be negative'),
  organisationId: objectIdSchema.optional().nullable(),
});

// 3. Vehicle Update Validator
const updateVehicleSchema = z.object({
  make: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  engineType: z.enum(['Naturally Aspirated Petrol', 'Turbo Petrol', 'Diesel']).optional(),
  registrationNo: z.string().min(2).max(20).trim().optional(),
  odometer: z.number().min(0).optional(),
}).strict();

// 4. Params ID Schema
const idParamSchema = z.object({
  id: objectIdSchema,
});

// 5. Query Pagination Schema
const paginationQuerySchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v, 10) || 1)),
  limit: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v, 10) || 20))),
  source: z.enum(['manual', 'batch']).optional(),
  hard: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
});

// 6. Auth Schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters').trim(),
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  accountType: z.enum(['individual', 'organisation']).default('individual').optional(),
  role: z.enum(['owner', 'staff', 'user']).optional(),
  phone: z.string().optional(),
  organisationName: z.string().min(1).max(150).optional(),
  organisationType: z.enum(['garage', 'repair_shop', 'fleet']).optional(),
  registrationNo: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'New password must be at least 8 characters long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});


const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
  phone: z.string().max(25).optional(),
  avatarUrl: z.string().optional(),
  accountType: z.enum(['individual', 'organisation']).optional(),
  preferences: z.object({
    units: z.enum(['km', 'mi']).optional(),
    theme: z.enum(['dark', 'light']).optional(),
  }).optional(),
});

const updateOrganisationSchema = z.object({
  name: z.string().min(1, 'Organisation name is required').max(150).optional(),
  type: z.enum(['garage', 'repair_shop', 'fleet']).optional(),
  registrationNo: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  mechanicsCount: z.number().int().min(1).optional(),
  fleetSize: z.number().int().min(0).optional(),
  logoUrl: z.string().optional(),
});

const inviteStaffSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  role: z.enum(['owner', 'staff', 'mechanic', 'viewer']).default('mechanic'),
});

module.exports = {
  objectIdSchema,
  calculationInputSchema,
  createVehicleSchema,
  updateVehicleSchema,
  idParamSchema,
  paginationQuerySchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateOrganisationSchema,
  inviteStaffSchema,
};

