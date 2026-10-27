import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PinwheelLogo } from '../components/PinwheelLogo';
import { Toast } from '../components/Toast';
import { calcApi } from '../api/calcApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Calculator = () => {
  // Input State
  const [saeBaseline, setSaeBaseline] = useState('5W-30');
  const [measuredViscosity, setMeasuredViscosity] = useState(110.0);
  const [temperature, setTemperature] = useState(27.5);
  const [blotterScore, setBlotterScore] = useState(100);
  const [registrationNo, setRegistrationNo] = useState('MH-12-AB-9821');
  const [vehicleCategory, setVehicleCategory] = useState('Commercial Heavy Truck');
  const [currentMileage, setCurrentMileage] = useState(3200);
  const [units, setUnits] = useState('km');
  const [baseOilType, setBaseOilType] = useState('Full-Synthetic');
  const [engineType, setEngineType] = useState('Naturally Aspirated Petrol');
  const [drivingCondition, setDrivingCondition] = useState('Mixed Urban');

  // Diagnostic Results from Backend API (No Math in Frontend!)
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Quick Presets
  const applyPreset = (preset) => {
    if (preset === 'fresh') {
      setSaeBaseline('5W-30');
      setMeasuredViscosity(110.0);
      setBlotterScore(100);
      setCurrentMileage(1200);
      setBaseOilType('Full-Synthetic');
      setEngineType('Naturally Aspirated Petrol');
      setDrivingCondition('Highway');
    } else if (preset === 'sheared') {
      setSaeBaseline('5W-30');
      setMeasuredViscosity(78.0);
      setBlotterScore(75);
      setCurrentMileage(7800);
      setBaseOilType('Semi-Synthetic');
      setEngineType('Turbo Petrol');
      setDrivingCondition('City Stop-and-Go');
    } else if (preset === 'diesel') {
      setSaeBaseline('15W-40');
      setMeasuredViscosity(245.0);
      setBlotterScore(45);
      setCurrentMileage(8900);
      setBaseOilType('Mineral');
      setEngineType('Diesel');
      setDrivingCondition('Mixed Urban');
    }
  };

  // Trigger Backend Calculation via API
  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = {
        saeBaseline,
        measuredViscosity: Number(measuredViscosity),
        temperature: Number(temperature),
        blotterScore: Number(blotterScore),
        baseOilType,
        engineType,
        drivingCondition,
        currentMileage: Number(currentMileage),
        units,
      };

      const res = await calcApi.compute(payload);
      if (res.success && res.data) {
        setDiagnosticData(res.data);
      }
    } catch (err) {
      console.error('Calculation API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [
    saeBaseline,
    measuredViscosity,
    temperature,
    blotterScore,
    baseOilType,
    engineType,
    drivingCondition,
    currentMileage,
    units,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiagnostics();
    }, 200); // 200ms debounce
    return () => clearTimeout(timer);
  }, [fetchDiagnostics]);

  // Save diagnostic calculation to MongoDB Atlas
  const handleSaveCalculation = async () => {
    try {
      setSaving(true);
      const payload = {
        saeBaseline,
        measuredViscosity: Number(measuredViscosity),
        temperature: Number(temperature),
        blotterScore: Number(blotterScore),
        baseOilType,
        engineType,
        drivingCondition,
        currentMileage: Number(currentMileage),
        units,
        registrationNo,
        vehicleCategory,
      };

      const res = await calcApi.saveCalculation(payload);
      if (res.success) {
        setToast({ message: 'Diagnostic calculation record saved to Dashboard successfully!', type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to save calculation record', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Copy diagnostic summary to clipboard
  const handleCopySummary = () => {
    if (!diagnosticData) return;
    const { results, inputs } = diagnosticData;
    const text = `--- MECH ONLINE / LUBRISPEC DIAGNOSTIC REPORT ---
Vehicle: ${registrationNo} (${vehicleCategory})
SAE Grade: ${inputs.saeBaseline} | Measured Viscosity: ${inputs.measuredViscosity} cSt
Oil Health Index (OHI): ${results.ohi}% [${results.serviceRecommendation.toUpperCase()}]
Remaining Useful Life (RUL): ${results.rulFormatted}
Change Odometer: ${results.changeOdometerFormatted}
Advisory: ${results.serviceUrgency}
Status: ${results.mechanicAdvisory}`;

    navigator.clipboard.writeText(text);
    setToast({ message: 'Diagnostic summary copied to clipboard!', type: 'success' });
  };

  // Print work order
  const handlePrint = () => {
    window.print();
  };

  // Extracted values from backend result
  const results = diagnosticData?.results || {};
  const ohi = results.ohi ?? 88;
  const rulFormatted = results.rulFormatted || '+6,450 km';
  const changeOdometerFormatted = results.changeOdometerFormatted || '9,650 km';
  const engineHours = results.engineHours ?? 115;
  const flowTimeSec = results.flowTimeSec ? results.flowTimeSec.toFixed(1) : '40.2';
  const serviceRecommendation = results.serviceRecommendation || 'Optimal';
  const serviceUrgency = results.serviceUrgency || 'Safe operating envelope. Additives active; lubrication film fully maintained.';
  const mechanicAdvisory = results.mechanicAdvisory || 'Lubricant film thickness is optimal. Viscosity is within nominal SAE specs.';

  const factorVisc = results.kinematicConsistencyScore ?? 96;
  const factorTrans = results.opticalDegradationScore ?? 95;
  const factorBlotter = results.dispersancyScore ?? 95;

  // Chart Trajectory Data Setup
  const changeOdoNum = results.changeOdometer || (currentMileage + 6450);
  const endScaleDist = Math.max(changeOdoNum * 1.25, units === 'mi' ? 12000 : 18000);
  const steps = 10;
  const chartLabels = [];
  const chartDataPoints = [];

  for (let i = 0; i <= steps; i++) {
    const distPoint = Math.round((endScaleDist / steps) * i);
    chartLabels.push(distPoint.toLocaleString());
    if (distPoint === 0) {
      chartDataPoints.push(100);
    } else {
      const progress = distPoint / (changeOdoNum || 1);
      chartDataPoints.push(Math.max(10, Math.round(100 - 75 * Math.pow(progress, 1.25))));
    }
  }

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Projected Oil Health (%)',
        data: chartDataPoints,
        borderColor: '#ff8800',
        backgroundColor: 'rgba(255, 136, 0, 0.12)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#ffa600',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Critical 30% Threshold',
        data: Array(steps + 1).fill(30),
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#a1a1aa',
          font: { family: 'Space Grotesk', size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `Health: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `Odometer Distance (${units})`,
          color: '#71717a',
          font: { family: 'Space Grotesk', size: 11 },
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } },
      },
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Health Index (%)',
          color: '#71717a',
          font: { family: 'Space Grotesk', size: 11 },
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  // Status Badge Class
  const getBadgeClass = (rec) => {
    const lower = rec.toLowerCase();
    if (lower.includes('optimal')) return 'status-badge optimal';
    if (lower.includes('stable')) return 'status-badge stable';
    if (lower.includes('soon') || lower.includes('warning')) return 'status-badge warning';
    return 'status-badge critical';
  };

  const circumference = 364.4;
  const ringOffset = circumference - circumference * (ohi / 100);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar badge="BENCH V2" />

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4.5rem' }}>
        {/* Top Header & Workshop Presets */}
        <div className="lab-header-panel">
          <div className="lab-title-row">
            <div>
              <div className="pill-tag-group" style={{ marginBottom: '0.8rem' }}>
                <span className="pill-tag amber">
                  <i className="fa-solid fa-circle-check"></i> READY
                </span>
                <span className="pill-tag">OIL ANALYSIS</span>
                <span className="pill-tag">LIFE ESTIMATOR</span>
              </div>

              <h1 className="lab-main-title">
                <span>DIAGNOSTIC</span>
                <PinwheelLogo size={32} />
                <span className="glow-amber">BENCH</span>
              </h1>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
                Enter oil consistency and condition to calculate how long your engine oil will run and when to change it.
              </p>
            </div>

            {/* Quick Presets for Mechanics */}
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                }}
              >
                <i className="fa-solid fa-bolt" style={{ color: 'var(--amber-glow)', marginRight: '0.3rem' }}></i>
                Quick Presets:
              </span>
              <div className="preset-selector-group">
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyPreset('fresh')}
                >
                  Fresh Synthetic
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyPreset('sheared')}
                >
                  Fuel Sheared (Thin)
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyPreset('diesel')}
                >
                  Diesel Thickened
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Column Workbench Layout */}
        <div className="workbench-layout">
          {/* LEFT COLUMN: Physical & Operational Inputs */}
          <section className="bench-panel" aria-label="Diagnostic Inputs">
            <div className="panel-header-bar">
              <h2 className="panel-title">
                <i className="fa-solid fa-sliders" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                Input Data
              </h2>
              <span className="panel-sub">Oil Consistency &amp; Condition</span>
            </div>

            <form id="oil-calc-form" onSubmit={(e) => e.preventDefault()}>
              {/* Input 1: Viscosity Grade & Consistency */}
              <div className="input-section-card">
                <div className="input-header-row">
                  <label htmlFor="viscosity-slider" className="input-label">
                    1. Oil Consistency &amp; Ford B4 Cup Time
                  </label>
                  <span className="input-current-val" id="disp-viscosity-val">
                    {measuredViscosity.toFixed(1)} cSt (~{flowTimeSec}s flow)
                  </span>
                </div>
                <div className="input-subtext">
                  Fluid kinematic viscosity at workshop ambient (~27.5&deg;C) calibrated via ASTM D1200 Ford B4 Cup.
                </div>

                <div className="form-row-2" style={{ marginBottom: '0.85rem' }}>
                  <div className="field-group">
                    <label htmlFor="sae-grade-select" className="field-label">
                      SAE Nominal Grade
                    </label>
                    <select
                      id="sae-grade-select"
                      className="select-custom"
                      value={saeBaseline}
                      onChange={(e) => setSaeBaseline(e.target.value)}
                    >
                      <option value="0W-20">0W-20 (76.0 cSt / ~31.4s)</option>
                      <option value="5W-30">5W-30 (110.0 cSt / ~40.2s)</option>
                      <option value="10W-40">10W-40 (176.0 cSt / ~57.4s)</option>
                      <option value="15W-40">15W-40 (225.0 cSt / ~70.1s)</option>
                      <option value="20W-50">20W-50 (295.0 cSt / ~88.3s)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Ford B4 Flow Time (Stopwatch)</label>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--amber-glow)',
                      }}
                      id="disp-ford-flow-time"
                    >
                      ~{flowTimeSec} sec
                    </div>
                  </div>
                </div>

                <input
                  type="range"
                  id="viscosity-slider"
                  min="30.0"
                  max="350.0"
                  step="0.5"
                  value={measuredViscosity}
                  onChange={(e) => setMeasuredViscosity(Number(e.target.value))}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.45rem',
                  }}
                >
                  <span>30.0 cSt (~19.5s)</span>
                  <span>110.0 cSt (5W-30 Baseline)</span>
                  <span>350.0 cSt (~102.6s)</span>
                </div>
              </div>

              {/* Input 2: Blotter Spot Test */}
              <div className="input-section-card">
                <div className="input-header-row">
                  <label className="input-label">2. Oil Condition &amp; Spot Test</label>
                  <span className="input-current-val" id="disp-blotter-label" style={{ fontSize: '0.88rem' }}>
                    {blotterScore === 100
                      ? 'Uniform Ring'
                      : blotterScore === 75
                      ? 'Diffuse Core'
                      : blotterScore === 45
                      ? 'Coagulated Core'
                      : 'Dense Sludge Center'}
                  </span>
                </div>
                <div className="input-subtext">
                  Paper drop test pattern reflecting oil transparency, soot loading, and additive dispersancy.
                </div>

                <div className="blotter-options-grid" id="blotter-group">
                  <div
                    className={`blotter-card-option ${blotterScore === 100 ? 'active' : ''}`}
                    onClick={() => setBlotterScore(100)}
                  >
                    <div className="blotter-graphic blot-1"></div>
                    <span className="blotter-label">Stage 1: Clean</span>
                  </div>
                  <div
                    className={`blotter-card-option ${blotterScore === 75 ? 'active' : ''}`}
                    onClick={() => setBlotterScore(75)}
                  >
                    <div className="blotter-graphic blot-2"></div>
                    <span className="blotter-label">Stage 2: Good</span>
                  </div>
                  <div
                    className={`blotter-card-option ${blotterScore === 45 ? 'active' : ''}`}
                    onClick={() => setBlotterScore(45)}
                  >
                    <div className="blotter-graphic blot-3"></div>
                    <span className="blotter-label">Stage 3: Marginal</span>
                  </div>
                  <div
                    className={`blotter-card-option ${blotterScore === 15 ? 'active' : ''}`}
                    onClick={() => setBlotterScore(15)}
                  >
                    <div className="blotter-graphic blot-4"></div>
                    <span className="blotter-label">Stage 4: Depleted</span>
                  </div>
                </div>
              </div>

              {/* Input 3: Vehicle Specs & Driving Data */}
              <div className="input-section-card">
                <div className="input-header-row">
                  <label className="input-label">3. Vehicle &amp; Driving Data</label>
                  <span className="input-current-val" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Vehicle Specs
                  </span>
                </div>

                <div className="form-row-2" style={{ marginBottom: '1rem' }}>
                  <div className="field-group">
                    <label htmlFor="vehicle-plate-input" className="field-label">
                      <i className="fa-solid fa-id-card" style={{ color: 'var(--amber-glow)', marginRight: '0.3rem' }}></i>
                      Vehicle Number Plate
                    </label>
                    <input
                      type="text"
                      id="vehicle-plate-input"
                      className="input-custom"
                      placeholder="e.g. MH-12-AB-9821"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="vehicle-type-select" className="field-label">
                      <i className="fa-solid fa-car" style={{ color: 'var(--amber-glow)', marginRight: '0.3rem' }}></i>
                      Vehicle Category / Type
                    </label>
                    <select
                      id="vehicle-type-select"
                      className="select-custom"
                      value={vehicleCategory}
                      onChange={(e) => setVehicleCategory(e.target.value)}
                    >
                      <option value="Commercial Heavy Truck">Commercial Heavy Truck</option>
                      <option value="SUV / 4x4">SUV / 4x4</option>
                      <option value="Sedan / Hatchback">Sedan / Hatchback</option>
                      <option value="Fleet Delivery Van">Fleet Delivery Van</option>
                      <option value="Sports / Performance Coupe">Sports / Performance Coupe</option>
                      <option value="Motorcycle">Motorcycle</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="field-group">
                    <label htmlFor="current-mileage" className="field-label">
                      Current Run Distance
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="number"
                        id="current-mileage"
                        className="input-number"
                        value={currentMileage}
                        min="0"
                        max="60000"
                        step="100"
                        onChange={(e) => setCurrentMileage(Number(e.target.value))}
                      />
                      <select
                        id="unit-toggle"
                        className="select-custom"
                        style={{ width: '80px', flexShrink: 0 }}
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                      >
                        <option value="km">km</option>
                        <option value="mi">mi</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="oil-base-type" className="field-label">
                      Base Oil (oil_base_type)
                    </label>
                    <select
                      id="oil-base-type"
                      className="select-custom"
                      value={baseOilType}
                      onChange={(e) => setBaseOilType(e.target.value)}
                    >
                      <option value="Mineral">Mineral (1.0x)</option>
                      <option value="Semi-Synthetic">Semi-Synthetic (1.35x)</option>
                      <option value="Full-Synthetic">Full-Synthetic (1.70x)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="field-group">
                    <label htmlFor="engine-type" className="field-label">
                      Engine (engine_type)
                    </label>
                    <select
                      id="engine-type"
                      className="select-custom"
                      value={engineType}
                      onChange={(e) => setEngineType(e.target.value)}
                    >
                      <option value="Naturally Aspirated Petrol">Naturally Aspirated Petrol (1.0x)</option>
                      <option value="Turbo Petrol">Turbo Petrol (0.85x)</option>
                      <option value="Diesel">Diesel (0.75x)</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label htmlFor="duty-cycle" className="field-label">
                      Driving (driving_condition)
                    </label>
                    <select
                      id="duty-cycle"
                      className="select-custom"
                      value={drivingCondition}
                      onChange={(e) => setDrivingCondition(e.target.value)}
                    >
                      <option value="Highway">Highway (1.25x)</option>
                      <option value="Mixed Urban">Mixed Urban (1.0x)</option>
                      <option value="City Stop-and-Go">City Stop-and-Go (0.75x)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bench-action-buttons">
                <button
                  type="button"
                  className="btn-primary"
                  id="btn-save-record"
                  style={{ fontSize: '0.88rem', padding: '0.85rem' }}
                  onClick={handleSaveCalculation}
                  disabled={saving}
                >
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '0.4rem' }}></i>
                  {saving ? 'Saving...' : 'Save to Dashboard'}
                </button>
                <button
                  type="button"
                  className="btn-print"
                  id="btn-print-order"
                  onClick={handlePrint}
                >
                  <i className="fa-solid fa-print" style={{ marginRight: '0.4rem' }}></i>
                  Export Work Order
                </button>
                <button
                  type="button"
                  className="btn-reset"
                  id="btn-reset-inputs"
                  onClick={() => applyPreset('fresh')}
                >
                  <i className="fa-solid fa-rotate-left" style={{ marginRight: '0.4rem' }}></i>
                  Reset
                </button>
              </div>
            </form>
          </section>

          {/* RIGHT COLUMN: Real-Time Diagnostic Output & Degradation Curve */}
          <section className="bench-panel" aria-label="Diagnostic Outputs">
            <div className="panel-header-bar">
              <h2 className="panel-title">
                <i className="fa-solid fa-chart-pie" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                Calculation Results
              </h2>
              <span className="panel-sub" id="disp-calc-timestamp">
                {loading ? 'CALCULATING...' : 'LIVE CALCULATION'}
              </span>
            </div>

            {/* Master Gauge & Health Status */}
            <div className="gauge-kpi-container">
              <div className="gauge-circle-wrap">
                <svg className="gauge-svg" viewBox="0 0 140 140">
                  <circle className="gauge-bg-ring" cx="70" cy="70" r="58"></circle>
                  <circle
                    className="gauge-meter-ring"
                    id="svg-gauge-ring"
                    cx="70"
                    cy="70"
                    r="58"
                    style={{
                      strokeDasharray: `${circumference}`,
                      strokeDashoffset: `${Math.max(0, ringOffset)}`,
                      transition: 'stroke-dashoffset 0.4s ease-out',
                    }}
                  ></circle>
                </svg>
                <div className="gauge-value-text">
                  <div className="gauge-percent" id="disp-ohi-percent">
                    {ohi}%
                  </div>
                  <div className="gauge-sub-caption">OIL HEALTH</div>
                </div>
              </div>

              <div className="kpi-main-details">
                <div className={getBadgeClass(serviceRecommendation)} id="disp-status-badge">
                  <i className="fa-solid fa-circle-check" style={{ marginRight: '0.4rem' }}></i>
                  {serviceRecommendation.toUpperCase()} INTEGRITY
                </div>
                <div className="kpi-big-metric" id="disp-rul-main">
                  {rulFormatted}
                </div>
                <p className="kpi-sub-text" id="disp-service-urgency">
                  {serviceUrgency}
                </p>
              </div>
            </div>

            {/* 3-KPI Lifespan Summary */}
            <div className="rul-cards-grid">
              <div className="rul-card">
                <div className="rul-card-title">Safe Remaining</div>
                <div className="rul-card-val" id="disp-rul-distance" style={{ color: 'var(--status-optimal)' }}>
                  {rulFormatted}
                </div>
              </div>
              <div className="rul-card">
                <div className="rul-card-title">Change Odometer</div>
                <div className="rul-card-val" id="disp-change-odometer">
                  {changeOdometerFormatted}
                </div>
              </div>
              <div className="rul-card">
                <div className="rul-card-title">Est. Engine Hours</div>
                <div className="rul-card-val" id="disp-rul-hours">
                  ~{engineHours} hrs
                </div>
              </div>
            </div>

            {/* Dynamic Degradation Trajectory Chart */}
            <div className="chart-panel-box">
              <div className="chart-header-row">
                <span className="chart-title">
                  <i className="fa-solid fa-chart-area" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                  Degradation Trajectory
                </span>
                <span className="chart-legend-badge">Change Cutoff: 30% Health</span>
              </div>
              <div className="chart-canvas-wrapper" id="chart-wrapper" style={{ height: '220px', position: 'relative' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Degradation Sub-Factors */}
            <div className="factors-breakdown">
              <div className="factor-item">
                <div className="factor-label-row">
                  <span>Kinematic Viscosity Consistency</span>
                  <strong id="disp-factor-visc">{factorVisc}%</strong>
                </div>
                <div className="factor-bar-bg">
                  <div
                    className="factor-bar-fill fill-visc"
                    id="bar-factor-visc"
                    style={{ width: `${factorVisc}%`, transition: 'width 0.4s ease' }}
                  ></div>
                </div>
              </div>

              <div className="factor-item">
                <div className="factor-label-row">
                  <span>Oil Condition &amp; Clarity</span>
                  <strong id="disp-factor-trans">{factorTrans}%</strong>
                </div>
                <div className="factor-bar-bg">
                  <div
                    className="factor-bar-fill fill-trans"
                    id="bar-factor-trans"
                    style={{ width: `${factorTrans}%`, transition: 'width 0.4s ease' }}
                  ></div>
                </div>
              </div>

              <div className="factor-item">
                <div className="factor-label-row">
                  <span>Dispersancy &amp; Additive Reserve</span>
                  <strong id="disp-factor-blotter">{factorBlotter}%</strong>
                </div>
                <div className="factor-bar-bg">
                  <div
                    className="factor-bar-fill fill-soot"
                    id="bar-factor-blotter"
                    style={{ width: `${factorBlotter}%`, transition: 'width 0.4s ease' }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Mechanic's Action Advisory Card */}
            <div className="mechanic-report-box" id="mechanic-advisory-box">
              <div className="report-header">
                <i className="fa-solid fa-wrench" style={{ marginRight: '0.4rem' }}></i>
                Service Recommendations
              </div>
              <div className="report-text" id="disp-mechanic-text">
                {mechanicAdvisory}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="preset-btn"
                id="btn-copy-summary"
                onClick={handleCopySummary}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <i className="fa-solid fa-copy"></i> Copy Diagnostic Summary
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
