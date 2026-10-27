const calcService = require('../src/services/calcService');

describe('Stage 2 — Calculation Module & Formula Parity Acceptance Tests', () => {
  // Test 1: ASTM D1200 Flow Time & Viscosity conversions
  test('ASTM D1200 Ford B4 Cup conversion: nu = 3.85 * t - 44.9', () => {
    // 40.2338 sec -> 110.0 cSt
    const visc = calcService.calculateViscosityFromFlowTime(40.233766);
    expect(Math.round(visc * 10) / 10).toBe(110.0);

    // 110.0 cSt -> ~40.2 sec
    const flowTime = calcService.calculateFlowTimeFromViscosity(110.0);
    expect(Math.round(flowTime * 10) / 10).toBe(40.2);
  });

  // Test 2: Known Example 1 — Fresh 5W-30 Benchmark
  test('Example 1 (Fresh 5W-30 Benchmark) matches old site calculations exactly', () => {
    const input = {
      saeBaseline: '5W-30',
      measuredViscosity: 110.0,
      temperature: 27.5,
      blotterScore: 100,
      baseOilType: 'Full-Synthetic',
      engineType: 'Naturally Aspirated Petrol',
      drivingCondition: 'Highway',
      currentMileage: 1200,
      units: 'km',
    };

    const res = calcService.calculateDiagnostics(input);

    expect(res.results.nominalViscosity).toBe(110.0);
    expect(res.results.viscosityRatio).toBe(1.0);
    expect(res.results.devPct).toBe(0.0);
    expect(res.results.viscScore).toBe(100);
    expect(res.results.blotterScore).toBe(100);
    expect(res.results.ohi).toBe(100);
    expect(res.results.dutyMultiplier).toBe(2.125);
    expect(res.results.rulKm).toBe(11688);
    expect(res.results.serviceRecommendation).toBe('Optimal');
    expect(res.results.nextServiceOdometer).toBe(1200 + 11688);
  });

  // Test 3: Known Example 2 — Fuel-Diluted Thinning 5W-30 (Negative Deviation Override)
  test('Example 2 (Fuel-Diluted 5W-30) triggers Critical override despite OHI = 70%', () => {
    const input = {
      saeBaseline: '5W-30',
      measuredViscosity: 78.0, // 29.1% drop
      temperature: 27.5,
      blotterScore: 75,
      baseOilType: 'Semi-Synthetic',
      engineType: 'Turbo Petrol',
      drivingCondition: 'City Stop-and-Go',
      currentMileage: 7800,
      units: 'km',
    };

    const res = calcService.calculateDiagnostics(input);

    expect(res.results.devPct).toBe(-29.1);
    expect(res.results.viscosityRatio).toBe(0.7091);
    expect(res.results.ohi).toBe(70);
    expect(res.results.dutyMultiplier).toBe(0.8606);
    expect(res.results.rulKm).toBe(2840);
    // Crucial: Must be 'Critical' because devPct < -25%
    expect(res.results.serviceRecommendation).toBe('Critical');
    expect(res.results.mechanicAdvisory).toContain('fuel dilution');
  });

  // Test 4: Known Example 3 — Oxidized Heavy Sludge 10W-40 (Positive Thickening)
  test('Example 3 (Oxidized Sludge 10W-40) drops OHI below 30% and zeroes out RUL', () => {
    const input = {
      saeBaseline: '10W-40', // Nominal: 176.0 cSt
      measuredViscosity: 255.0, // 44.9% increase
      temperature: 27.5,
      blotterScore: 15,
      baseOilType: 'Mineral',
      engineType: 'Naturally Aspirated Petrol',
      drivingCondition: 'City Stop-and-Go',
      currentMileage: 14500,
      units: 'km',
    };

    const res = calcService.calculateDiagnostics(input);

    expect(res.results.nominalViscosity).toBe(176.0);
    expect(res.results.devPct).toBe(44.9);
    expect(res.results.ohi).toBe(29); // <= 30%
    expect(res.results.rulKm).toBe(0); // Zeroed out
    expect(res.results.serviceRecommendation).toBe('Critical');
  });

  // Test 5: Upper boundary cap for RUL (Must never exceed 12,000 km)
  test('RUL upper boundary cap is strictly enforced at 12,000 km', () => {
    const highEndMultipliers = 1.70 * 1.0 * 1.25; // 2.125
    // Force OHI = 100 on a high mileage baseline
    const { rulKm } = calcService.calculateRUL(100, 3.5, 'km'); // Uncapped would be 19,250 km
    expect(rulKm).toBe(12000);
  });

  // Test 6: Thermal compensation formula verification
  test('Thermal compensation adjusts nominal baseline correctly for temperature swings', () => {
    // Warm afternoon at 30°C -> oil naturally thinner -> baseline drops
    const warmNominal = calcService.calculateThermalCompensatedNominal('5W-30', 30.0);
    expect(warmNominal).toBeLessThan(110.0);
    expect(Math.round(warmNominal * 10) / 10).toBe(97.6);

    // Cool morning at 25°C -> oil naturally thicker -> baseline rises
    const coolNominal = calcService.calculateThermalCompensatedNominal('5W-30', 25.0);
    expect(coolNominal).toBeGreaterThan(110.0);
    expect(Math.round(coolNominal * 10) / 10).toBe(124.0);
  });
});
