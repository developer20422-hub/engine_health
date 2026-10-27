const {
  formatViscosity,
  formatFlowTime,
  formatDeviation,
  formatRatio,
  formatScore,
  formatDistance,
  formatHours,
} = require('../utils/format');

// 1. Reference Constants & Standard Multipliers
const NOMINAL_VISCOSITIES_27_5 = {
  '0W-20': 76.0,
  '5W-30': 110.0,
  '10W-40': 176.0,
  '15W-40': 225.0,
  '20W-50': 295.0,
};

const BASE_OIL_FACTORS = {
  'Mineral': 1.0,
  'Semi-Synthetic': 1.35,
  'Full-Synthetic': 1.70,
};

const ENGINE_FACTORS = {
  'Naturally Aspirated Petrol': 1.0,
  'Turbo Petrol': 0.85,
  'Diesel': 0.75,
};

const DRIVING_FACTORS = {
  'Highway': 1.25,
  'Mixed Urban': 1.0,
  'City Stop-and-Go': 0.75,
};

/**
 * Pure Function: Convert Ford B4 efflux flow time (seconds) to kinematic viscosity (cSt)
 * ASTM D1200 Standard: nu = 3.85 * t - 44.9
 */
const calculateViscosityFromFlowTime = (effluxTimeSec) => {
  if (typeof effluxTimeSec !== 'number' || effluxTimeSec < 0) return 0;
  return Math.max(0, 3.85 * effluxTimeSec - 44.9);
};

/**
 * Pure Function: Convert kinematic viscosity (cSt) back to Ford B4 flow time (seconds)
 * t = (nu + 44.9) / 3.85
 */
const calculateFlowTimeFromViscosity = (visc) => {
  if (typeof visc !== 'number' || visc < 0) return 0;
  return Math.max(0, (visc + 44.9) / 3.85);
};

/**
 * Pure Function: Calculate temperature-compensated baseline nominal viscosity
 * nu_nom(T) = nu_nom,27.5 * exp(-0.048 * (T - 27.5))
 */
const calculateThermalCompensatedNominal = (saeBaseline, tempC = 27.5) => {
  const baseNominal = NOMINAL_VISCOSITIES_27_5[saeBaseline] || 110.0;
  const temp = typeof tempC === 'number' && !isNaN(tempC) ? tempC : 27.5;
  return baseNominal * Math.exp(-0.048 * (temp - 27.5));
};

/**
 * Pure Function: Viscosity Ratio (Rv) and Percentage Deviation
 */
const calculateViscosityRatioAndDev = (measuredVisc, nominalVisc) => {
  if (!nominalVisc || nominalVisc <= 0) return { ratioV: 1.0, devPct: 0.0 };
  const ratioV = measuredVisc / nominalVisc;
  const devPct = (ratioV - 1.0) * 100;
  return { ratioV, devPct };
};

/**
 * Pure Function: Viscosity Consistency Score (S_visc)
 * S_visc = 100 * exp(-2.8 * |Rv - 1.0|^1.5)
 */
const calculateViscosityScore = (ratioV) => {
  const absDiff = Math.abs(ratioV - 1.0);
  const rawScore = 100 * Math.exp(-2.8 * Math.pow(absDiff, 1.5));
  return Math.min(100, Math.max(0, rawScore));
};

/**
 * Pure Function: Composite Oil Health Index (OHI)
 * OHI = round(0.50 * S_visc + 0.50 * S_blotter)
 */
const calculateCompositeOHI = (viscScore, blotterScore = 100) => {
  const validBlotter = [15, 45, 75, 100].includes(blotterScore) ? blotterScore : 100;
  return Math.round(0.50 * viscScore + 0.50 * validBlotter);
};

/**
 * Pure Function: Composite Operating Duty Multiplier
 * M_duty = F_base_oil * F_engine * F_driving
 */
const calculateDutyMultiplier = (baseOilType, engineType, drivingCondition) => {
  const baseFactor = BASE_OIL_FACTORS[baseOilType] || 1.70;
  const engineFactor = ENGINE_FACTORS[engineType] || 1.0;
  const drivingFactor = DRIVING_FACTORS[drivingCondition] || 1.0;
  return baseFactor * engineFactor * drivingFactor;
};

/**
 * Pure Function: Remaining Useful Life (RUL) in kilometers & miles
 * If OHI > 30: RUL = min(12000, round(5500 * M_duty * ((OHI - 25) / 75)))
 * If OHI <= 30: RUL = 0
 */
const calculateRUL = (ohi, dutyMultiplier, unit = 'km') => {
  const baselineKm = 5500 * dutyMultiplier;
  let rulKm = 0;

  if (ohi > 30) {
    const rawRul = baselineKm * ((ohi - 25) / 75);
    rulKm = Math.min(12000, Math.round(rawRul));
  } else {
    rulKm = 0;
  }

  const rulDistance = unit === 'mi' ? Math.round(rulKm * 0.621371) : rulKm;
  const avgSpeed = unit === 'mi' ? 32 : 52;
  const remainingHours = Math.round(rulDistance / avgSpeed);

  return { rulKm, rulDistance, remainingHours, baselineKm };
};

/**
 * Pure Function: Service Recommendation Classification with Deviation % Overrides
 */
const determineServiceRecommendation = (ohi, devPct) => {
  const numDev = formatDeviation(devPct);

  // Critical: OHI <= 30% OR Dev% < -25% OR Dev% > +35%
  if (ohi <= 30 || numDev < -25 || numDev > 35) {
    return 'Critical';
  }
  // Service Soon: 30% < OHI < 55% OR Dev% < -15% OR Dev% > +20%
  if ((ohi > 30 && ohi < 55) || numDev < -15 || numDev > 20) {
    return 'Service Soon';
  }
  // Stable: 55% <= OHI < 80% (with Dev% within -15% to +20%)
  if (ohi >= 55 && ohi < 80 && numDev >= -15 && numDev <= 20) {
    return 'Stable';
  }
  // Optimal: OHI >= 80% (with Dev% within -15% to +20%)
  return 'Optimal';
};

/**
 * Pure Function: Dynamic Mechanic Advisory Text
 */
const generateMechanicAdvisory = (saeBaseline, ratioV, devPct, blotterScore, ohi, rulDistance, recommendation, unit = 'km') => {
  const issues = [];
  const numDev = formatDeviation(devPct);

  if (ratioV < 0.82) {
    issues.push(`Severe viscosity thinning detected (${numDev}% drop). Inspect for unburnt fuel dilution or polymer breakdown.`);
  } else if (ratioV > 1.22) {
    issues.push(`High viscosity thickening detected (+${numDev}% increase). Indicates thermal oxidation and soot agglomeration.`);
  }

  if (blotterScore <= 20) {
    issues.push(`Spot test reveals collapsed dispersancy. Detergent additives exhausted; black sludge formation is imminent.`);
  } else if (blotterScore <= 45) {
    issues.push(`Spot test shows dark coagulated core. Detergents are nearing saturation point.`);
  }

  let summary = '';
  if (recommendation === 'Optimal') {
    summary = `Viscosity for ${saeBaseline} is on spec (${numDev > 0 ? '+' : ''}${numDev}%). Additive pack fully active. Safe for continuous running for the next ${rulDistance.toLocaleString()} ${unit}.`;
  } else if (recommendation === 'Stable') {
    summary = `Normal mid-life wear. Fluid film maintained. Continue regular operation for the next ${rulDistance.toLocaleString()} ${unit}.`;
  } else if (recommendation === 'Service Soon') {
    summary = `Degradation acceleration detected (${issues.join('; ')}). Plan oil and filter change within ${rulDistance.toLocaleString()} ${unit}.`;
  } else {
    summary = `CRITICAL WARNING: Lubrication breakdown risk (${issues.length > 0 ? issues.join('; ') : `OHI score ${ohi}%`}). Immediate oil and filter replacement mandatory.`;
  }

  return summary;
};

/**
 * Master Calculation Orchestrator: Pure synthesis of all sub-models
 */
const calculateDiagnostics = (inputs) => {
  const saeBaseline = inputs.saeBaseline || '5W-30';
  const temperature = typeof inputs.temperature === 'number' ? inputs.temperature : 27.5;
  const unit = inputs.units === 'mi' ? 'mi' : 'km';
  const currentMileage = Math.max(0, Number(inputs.currentMileage) || 0);

  // 1. Resolve Viscosity & Flow Time
  let measuredViscosity = inputs.measuredViscosity;
  let effluxTime = inputs.effluxTime;

  if (typeof measuredViscosity === 'number' && measuredViscosity > 0) {
    effluxTime = calculateFlowTimeFromViscosity(measuredViscosity);
  } else if (typeof effluxTime === 'number' && effluxTime > 0) {
    measuredViscosity = calculateViscosityFromFlowTime(effluxTime);
  } else {
    measuredViscosity = NOMINAL_VISCOSITIES_27_5[saeBaseline] || 110.0;
    effluxTime = calculateFlowTimeFromViscosity(measuredViscosity);
  }

  // 2. Thermal Compensation
  const nominalViscosity = calculateThermalCompensatedNominal(saeBaseline, temperature);

  // 3. Ratio, Deviation, and Viscosity Consistency Score
  const { ratioV, devPct } = calculateViscosityRatioAndDev(measuredViscosity, nominalViscosity);
  const viscScore = calculateViscosityScore(ratioV);

  // 4. Blotter Dispersancy Score
  const blotterScore = Number(inputs.blotterScore) || 100;

  // 5. Composite Oil Health Index (OHI)
  const ohi = calculateCompositeOHI(viscScore, blotterScore);

  // 6. Duty Multiplier & RUL
  const baseOilType = inputs.baseOilType || 'Full-Synthetic';
  const engineType = inputs.engineType || 'Naturally Aspirated Petrol';
  const drivingCondition = inputs.drivingCondition || 'Mixed Urban';

  const dutyMultiplier = calculateDutyMultiplier(baseOilType, engineType, drivingCondition);
  const { rulKm, rulDistance, remainingHours, baselineKm } = calculateRUL(ohi, dutyMultiplier, unit);

  // 7. Service Recommendation & Advisory
  const serviceRecommendation = determineServiceRecommendation(ohi, devPct);
  const mechanicAdvisory = generateMechanicAdvisory(
    saeBaseline,
    ratioV,
    devPct,
    blotterScore,
    ohi,
    rulDistance,
    serviceRecommendation,
    unit
  );

  const nextServiceOdometer = currentMileage + rulDistance;

  // Return formatted results
  return {
    inputs: {
      saeBaseline,
      effluxTime: formatFlowTime(effluxTime),
      measuredViscosity: formatViscosity(measuredViscosity),
      temperature: formatViscosity(temperature),
      blotterScore,
      baseOilType,
      engineType,
      drivingCondition,
      currentMileage,
      units: unit,
    },
    results: {
      nominalViscosity: formatViscosity(nominalViscosity),
      viscosityRatio: formatRatio(ratioV),
      devPct: formatDeviation(devPct),
      viscScore: formatScore(viscScore),
      blotterScore: formatScore(blotterScore),
      ohi: formatScore(ohi),
      dutyMultiplier: formatRatio(dutyMultiplier),
      baselineKm: formatDistance(baselineKm),
      rulKm: formatDistance(rulKm),
      rulDistance: formatDistance(rulDistance),
      remainingHours: formatHours(remainingHours),
      nextServiceOdometer: formatDistance(nextServiceOdometer),
      serviceRecommendation,
      mechanicAdvisory,
    },
  };
};

module.exports = {
  NOMINAL_VISCOSITIES_27_5,
  BASE_OIL_FACTORS,
  ENGINE_FACTORS,
  DRIVING_FACTORS,
  calculateViscosityFromFlowTime,
  calculateFlowTimeFromViscosity,
  calculateThermalCompensatedNominal,
  calculateViscosityRatioAndDev,
  calculateViscosityScore,
  calculateCompositeOHI,
  calculateDutyMultiplier,
  calculateRUL,
  determineServiceRecommendation,
  generateMechanicAdvisory,
  calculateDiagnostics,
};
