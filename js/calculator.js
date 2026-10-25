/**
 * LUBRISPEC - Engine Oil Life Calculation Engine
 * Simple, Deterministic Tribological & Oil Health Formulation
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs
  const saeSelect = document.getElementById('sae-grade-select');
  const viscSlider = document.getElementById('viscosity-slider');
  const transSlider = document.getElementById('transparency-slider'); // optional if present
  const mileageInput = document.getElementById('current-mileage');
  const unitToggle = document.getElementById('unit-toggle');
  const oilBaseSelect = document.getElementById('oil-base-type');
  const engineTypeSelect = document.getElementById('engine-type');
  const dutyCycleSelect = document.getElementById('duty-cycle');
  const blotterCards = document.querySelectorAll('.blotter-card-option');
  
  // DOM Elements - Value Displays
  const dispViscVal = document.getElementById('disp-viscosity-val');
  const dispViscDev = document.getElementById('disp-visc-deviation');
  const dispTransVal = document.getElementById('disp-transparency-val');
  const dispOpticalStatus = document.getElementById('disp-optical-status');
  const dispSootPct = document.getElementById('disp-soot-pct');
  const miniDroplet = document.getElementById('mini-droplet-swatch');
  const dispBlotterLabel = document.getElementById('disp-blotter-label');
  const tempInput = document.getElementById('workshop-temp');
  const dispFordFlow = document.getElementById('disp-ford-flow-time');

  // DOM Elements - Outputs & KPIs
  const dispOhiPercent = document.getElementById('disp-ohi-percent');
  const svgGaugeRing = document.getElementById('svg-gauge-ring');
  const dispStatusBadge = document.getElementById('disp-status-badge');
  const dispRulMain = document.getElementById('disp-rul-main');
  const dispRulUnit = document.getElementById('disp-rul-unit');
  const dispServiceUrgency = document.getElementById('disp-service-urgency');
  const dispRulDistance = document.getElementById('disp-rul-distance');
  const dispChangeOdo = document.getElementById('disp-change-odometer');
  const dispRulHours = document.getElementById('disp-rul-hours');
  const dispMechanicText = document.getElementById('disp-mechanic-text');

  // Sub-factor progress bars
  const dispFactorVisc = document.getElementById('disp-factor-visc');
  const barFactorVisc = document.getElementById('bar-factor-visc');
  const dispFactorTrans = document.getElementById('disp-factor-trans');
  const barFactorTrans = document.getElementById('bar-factor-trans');
  const dispFactorBlotter = document.getElementById('disp-factor-blotter');
  const barFactorBlotter = document.getElementById('bar-factor-blotter');

  // Buttons & Controls
  const btnPrint = document.getElementById('btn-print-order');
  const btnReset = document.getElementById('btn-reset-inputs');
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // State
  let currentBlotterScore = 100;
  let degradationChart = null;

  // Workshop Presets
  const presets = {
    fresh: {
      sae: '5W-30',
      visc: 110.0,
      temp: 27.5,
      trans: 92,
      blotter: 100,
      blotterName: 'Uniform Ring (Clean Gold)',
      mileage: 1200,
      oilBase: 'Full-Synthetic',
      engine: 'Naturally Aspirated Petrol',
      duty: 'Highway'
    },
    mid: {
      sae: '5W-30',
      visc: 104.0,
      temp: 27.5,
      trans: 70,
      blotter: 75,
      blotterName: 'Diffuse Core (Good Amber)',
      mileage: 6200,
      oilBase: 'Full-Synthetic',
      engine: 'Naturally Aspirated Petrol',
      duty: 'Mixed Urban'
    },
    sheared: {
      sae: '5W-30',
      visc: 78.0, // severe fuel shear / thinning (-29%)
      temp: 27.5,
      trans: 62,
      blotter: 75,
      blotterName: 'Diffuse Core (Good Amber)',
      mileage: 7800,
      oilBase: 'Semi-Synthetic',
      engine: 'Turbo Petrol',
      duty: 'City Stop-and-Go'
    },
    diesel: {
      sae: '15W-40',
      visc: 245.0, // diesel soot thickening (+8.9%)
      temp: 27.5,
      trans: 22,
      blotter: 45,
      blotterName: 'Coagulated Core (Aged Dark)',
      mileage: 8500,
      oilBase: 'Semi-Synthetic',
      engine: 'Diesel',
      duty: 'Mixed Urban'
    },
    sludge: {
      sae: '10W-40',
      visc: 255.0, // heavy oxidized sludge thickening (+44.9%)
      temp: 27.5,
      trans: 8,
      blotter: 15,
      blotterName: 'Dense Sludge Center (Black Sludge)',
      mileage: 14500,
      oilBase: 'Mineral',
      engine: 'Naturally Aspirated Petrol',
      duty: 'City Stop-and-Go'
    }
  };

  // Primary Calculation Function - calculates output based strictly on the left input window
  function calculateDiagnostics() {
    if (!saeSelect || !viscSlider) return;

    const selectedSae = saeSelect.value;
    const tempC = tempInput ? (parseFloat(tempInput.value) || 27.5) : 27.5;
    const baseNominal275 = parseFloat(saeSelect.selectedOptions[0]?.getAttribute('data-nom')) || 110.0;
    
    // Step 2 Enhancement: Thermal Compensation Formula
    // nu_nom(T) = nu_nom,27.5 * exp(-0.048 * (T - 27.5))
    const nominalVisc = baseNominal275 * Math.exp(-0.048 * (tempC - 27.5));

    const currentVisc = parseFloat(viscSlider.value);
    const currentDistance = Math.max(0, parseFloat(mileageInput?.value) || 0);
    const isMiles = unitToggle?.value === 'mi';
    const unitLabel = isMiles ? 'mi' : 'km';

    // 1. Viscosity Consistency Score
    // Ratio Rv = current / nominal
    const ratioV = currentVisc / nominalVisc;
    const devPct = ((ratioV - 1.0) * 100).toFixed(1);
    const numDev = parseFloat(devPct);

    // Calculate Ford B4 Flow Time: nu = 3.85 * t - 44.9 => t = (nu + 44.9) / 3.85
    const flowTimeSec = Math.max(0, (currentVisc + 44.9) / 3.85);

    if (dispViscVal) dispViscVal.textContent = `${currentVisc.toFixed(1)} cSt (~${flowTimeSec.toFixed(1)}s flow)`;
    if (dispFordFlow) dispFordFlow.textContent = `~${flowTimeSec.toFixed(1)} sec`;

    if (dispViscDev) {
      if (numDev > 0) {
        dispViscDev.textContent = `+${devPct}% (Thickened)`;
        dispViscDev.style.color = numDev > 20 ? 'var(--status-critical)' : 'var(--amber-glow)';
      } else if (numDev < 0) {
        dispViscDev.textContent = `${devPct}% (Thin / Sheared)`;
        dispViscDev.style.color = numDev < -18 ? 'var(--status-critical)' : 'var(--status-stable)';
      } else {
        dispViscDev.textContent = `0.0% (Nominal Spec)`;
        dispViscDev.style.color = 'var(--status-optimal)';
      }
    }

    // Formula: S_visc = 100 * exp(-2.8 * |Rv - 1.0|^1.5)
    const viscHealth = Math.min(100, Math.max(0, 100 * Math.exp(-2.8 * Math.pow(Math.abs(ratioV - 1.0), 1.5))));

    // 2. Oil Condition & Spot Test Score
    const blotterHealth = currentBlotterScore;

    let transHealth = blotterHealth;
    let sootEst = "0.10% wt";
    let opticalStatus = "Clear / Translucent";

    if (transSlider) {
      const transVal = parseFloat(transSlider.value);
      transHealth = Math.min(100, Math.max(0, Math.pow(transVal / 100, 0.75) * 100));
      sootEst = `${Math.max(0.05, (-Math.log(Math.max(0.01, transVal / 98)) * 0.92)).toFixed(2)}% wt`;
      if (transVal >= 75) opticalStatus = 'Clear / Translucent';
      else if (transVal >= 50) opticalStatus = 'Operational Amber';
      else if (transVal >= 25) opticalStatus = 'Soot Contaminated';
      else opticalStatus = 'High Carbon Opaque';

      if (dispTransVal) dispTransVal.textContent = `${transVal}%`;
    } else {
      if (blotterHealth >= 90) {
        transHealth = 95;
        sootEst = "0.12% wt";
        opticalStatus = "Clean / Translucent Gold";
      } else if (blotterHealth >= 70) {
        transHealth = 75;
        sootEst = "0.85% wt";
        opticalStatus = "Operational Amber";
      } else if (blotterHealth >= 40) {
        transHealth = 45;
        sootEst = "2.10% wt";
        opticalStatus = "Aged Dark / Carbon Soot";
      } else {
        transHealth = 15;
        sootEst = "3.80% wt";
        opticalStatus = "Critical Black Sludge";
      }
    }

    if (dispOpticalStatus) dispOpticalStatus.textContent = opticalStatus;
    if (dispSootPct) dispSootPct.textContent = sootEst;

    // 3. Composite Oil Health Index (OHI)
    const ohi = Math.round((0.50 * viscHealth) + (0.50 * blotterHealth));

    // Update Breakdown Progress Bars in Results Window
    if (dispFactorVisc) dispFactorVisc.textContent = `${Math.round(viscHealth)}%`;
    if (barFactorVisc) barFactorVisc.style.width = `${Math.round(viscHealth)}%`;
    if (dispFactorTrans) dispFactorTrans.textContent = `${Math.round(transHealth)}%`;
    if (barFactorTrans) barFactorTrans.style.width = `${Math.round(transHealth)}%`;
    if (dispFactorBlotter) dispFactorBlotter.textContent = `${Math.round(blotterHealth)}%`;
    if (barFactorBlotter) barFactorBlotter.style.width = `${Math.round(blotterHealth)}%`;

    // 4. Operating Duty Multipliers (Step 3 Parameter String Alignment)
    const baseOilFactor = parseFloat(oilBaseSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.70;
    const engineFactor = parseFloat(engineTypeSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.0;
    const dutyFactor = parseFloat(dutyCycleSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.0;
    const compositeDutyMultiplier = baseOilFactor * engineFactor * dutyFactor;

    // Baseline nominal maximum distance (km) for standard mineral oil under normal duty: 5,500 km
    const baselineNominalKm = 5500 * compositeDutyMultiplier;

    // Step 9 Update: Upper Boundary Cap for RUL
    // If OHI > 30%: RUL = min(12000, Baseline Distance * ((OHI - 25) / 75))
    // If OHI <= 30%: RUL = 0 km
    let rulKm = 0;
    if (ohi > 30) {
      const calculatedRul = baselineNominalKm * ((ohi - 25) / 75);
      rulKm = Math.round(Math.min(12000, calculatedRul));
    } else {
      rulKm = 0;
    }

    // Convert to selected units
    const rulDistance = isMiles ? Math.round(rulKm * 0.621371) : rulKm;
    const totalChangeOdo = currentDistance + rulDistance;
    const estEngineHours = Math.round(rulDistance / (isMiles ? 32 : 52));

    // Update Output Displays in Results Window
    if (dispOhiPercent) dispOhiPercent.textContent = `${ohi}%`;
    if (dispRulUnit) dispRulUnit.textContent = unitLabel;

    // SVG Gauge Ring calculation
    if (svgGaugeRing) {
      const circumference = 364.4;
      const ringOffset = circumference - (circumference * (ohi / 100));
      svgGaugeRing.style.strokeDasharray = `${circumference}`;
      svgGaugeRing.style.strokeDashoffset = `${Math.max(0, ringOffset)}`;
    }

    // Step 10 Addition: Target Output 3 (service_recommendation) Thresholds with Deviation % Overrides
    let serviceRecommendation = 'Optimal';
    let statusTheme = 'optimal';
    let statusText = 'OPTIMAL CONDITION';
    let statusColor = 'var(--status-optimal)';
    let urgencyMessage = 'Excellent lubrication film. Viscosity is on spec, and additive pack has full reserve. Safe for normal continuous running.';

    // Critical: OHI <= 30% OR Dev% < -25% OR Dev% > +35%
    if (ohi <= 30 || numDev < -25 || numDev > 35) {
      serviceRecommendation = 'Critical';
      statusTheme = 'critical';
      statusText = 'CRITICAL / CHANGE NOW';
      statusColor = 'var(--status-critical)';
      if (numDev < -25) {
        urgencyMessage = `CRITICAL: Severe fuel dilution detected (viscosity dropped by ${Math.abs(numDev).toFixed(1)}%). Oil film collapsed. Immediate drain and fuel injector inspection mandatory.`;
      } else if (numDev > 35) {
        urgencyMessage = `CRITICAL: Severe oxidative thickening and sludge formation (+${numDev.toFixed(1)}% viscosity). High risk of engine seizure. Immediate flush and oil replacement required.`;
      } else {
        urgencyMessage = `CRITICAL: Lubrication breakdown risk (OHI ${ohi}%). Oil film unable to protect crank and cam journals. Immediate drain and filter flush mandatory.`;
      }
    }
    // Service Soon: 30% < OHI < 55% OR Dev% < -15% OR Dev% > +20%
    else if ((ohi > 30 && ohi < 55) || numDev < -15 || numDev > 20) {
      serviceRecommendation = 'Service Soon';
      statusTheme = 'warning';
      statusText = 'SERVICE DUE SOON';
      statusColor = 'var(--amber-glow)';
      if (numDev < -15) {
        urgencyMessage = `Fuel dilution thinning detected (${numDev.toFixed(1)}% viscosity loss). Schedule oil change within remaining ${rulDistance.toLocaleString()} ${unitLabel} and inspect injectors.`;
      } else if (numDev > 20) {
        urgencyMessage = `Thermal thickening detected (+${numDev.toFixed(1)}% viscosity). Additives depleting. Schedule oil and filter change within ${rulDistance.toLocaleString()} ${unitLabel}.`;
      } else {
        urgencyMessage = `Degradation acceleration detected (OHI ${ohi}%). Additives depleted. Plan oil and filter change within remaining ${rulDistance.toLocaleString()} ${unitLabel}.`;
      }
    }
    // Stable: 55% <= OHI < 80% (with Deviation % within -15% to +20%)
    else if (ohi >= 55 && ohi < 80 && numDev >= -15 && numDev <= 20) {
      serviceRecommendation = 'Stable';
      statusTheme = 'stable';
      statusText = 'STABLE OPERATIONAL';
      statusColor = 'var(--status-stable)';
      urgencyMessage = `Normal mid-life wear. Viscosity deviation (${devPct}%) is within design limits and soot dispersion is stable. Continue regular operation.`;
    }
    // Optimal: OHI >= 80% (with Deviation % within -15% to +20%)
    else {
      serviceRecommendation = 'Optimal';
      statusTheme = 'optimal';
      statusText = 'OPTIMAL CONDITION';
      statusColor = 'var(--status-optimal)';
      urgencyMessage = `Excellent lubrication film. Viscosity is on spec (${devPct}%), and additive pack has full reserve. Safe for normal continuous running.`;
    }

    if (svgGaugeRing) svgGaugeRing.style.stroke = statusColor;

    if (dispStatusBadge) {
      dispStatusBadge.className = `status-badge ${statusTheme}`;
      dispStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${statusText} &bull; [${serviceRecommendation.toUpperCase()}]`;
    }
    if (dispServiceUrgency) dispServiceUrgency.textContent = urgencyMessage;

    if (rulDistance > 0) {
      if (dispRulMain) dispRulMain.innerHTML = `+${rulDistance.toLocaleString()} <span class="metric-unit">${unitLabel}</span>`;
      if (dispRulDistance) {
        dispRulDistance.textContent = `+${rulDistance.toLocaleString()} ${unitLabel}`;
        dispRulDistance.style.color = statusColor;
      }
      if (dispChangeOdo) dispChangeOdo.textContent = `${totalChangeOdo.toLocaleString()} ${unitLabel}`;
      if (dispRulHours) dispRulHours.textContent = `~${estEngineHours} hrs`;
    } else {
      if (dispRulMain) dispRulMain.innerHTML = `0 <span class="metric-unit">${unitLabel}</span>`;
      if (dispRulDistance) {
        dispRulDistance.textContent = `IMMEDIATE CHANGE`;
        dispRulDistance.style.color = 'var(--status-critical)';
      }
      if (dispChangeOdo) dispChangeOdo.textContent = `${currentDistance.toLocaleString()} ${unitLabel} (OVERDUE)`;
      if (dispRulHours) dispRulHours.textContent = `0 hrs`;
    }

    // Dynamic Mechanic Recommendations Generator
    generateMechanicAdvisory(ratioV, blotterHealth, devPct, selectedSae, ohi, unitLabel, rulDistance, serviceRecommendation);

    // Update Trajectory Chart
    updateDegradationChart(currentDistance, totalChangeOdo, ohi, baselineNominalKm, isMiles, unitLabel);
  }
  // Dynamic Mechanic Recommendations Logic
  function generateMechanicAdvisory(ratioV, blotterScore, devPct, saeGrade, ohi, unitLabel, rulDistance) {
    if (!dispMechanicText) return;

    const issues = [];
    
    if (ratioV < 0.82) {
      issues.push(`Severe viscosity thinning detected (${devPct}% drop). Inspect for fuel dilution from injectors, cold short-trip condensation, or polymer breakdown.`);
    } else if (ratioV > 1.22) {
      issues.push(`High viscosity thickening detected (+${devPct}% increase). Indicates high-temperature oxidation and insoluble varnish formation.`);
    }

    if (blotterScore <= 20) {
      issues.push(`Spot test reveals collapsed dispersancy. Detergent additives can no longer suspend soot; sludge coagulation is imminent.`);
    } else if (blotterScore <= 45) {
      issues.push(`Spot test shows dark coagulated core. Detergents are nearing saturation point.`);
    }

    if (issues.length === 0) {
      dispMechanicText.innerHTML = `
        <strong>Inspection Summary:</strong> Viscosity for <strong>${saeGrade}</strong> is within nominal factory specs. 
        Spot test shows clean fluid base without soot coagulation. 
        Safe for regular operation for the next <strong>${rulDistance.toLocaleString()} ${unitLabel}</strong> before preventative check.
      `;
    } else {
      dispMechanicText.innerHTML = `
        <strong>Action Needed:</strong><br>
        &bull; ${issues.join('<br>&bull; ')}<br>
        <strong>Recommendation:</strong> ${ohi <= 35 ? 'Flush oil pan, install new OEM filter, and refill with fresh certified oil immediately.' : `Schedule service within next ${rulDistance.toLocaleString()} ${unitLabel}.`}
      `;
    }
  }

  // Chart Rendering using Chart.js with pure SVG fallback
  function updateDegradationChart(currentDist, changeOdo, currentOhi, maxDist, isMiles, unitLabel) {
    const ctx = document.getElementById('degradationChart');
    if (!ctx) return;

    const endScaleDist = Math.max(changeOdo * 1.25, isMiles ? 12000 : 18000);
    const steps = 10;
    const labels = [];
    const curveData = [];

    // Model degradation trajectory curve
    for (let i = 0; i <= steps; i++) {
      const distPoint = Math.round((endScaleDist / steps) * i);
      labels.push(`${distPoint.toLocaleString()}`);

      let healthAtPoint;
      if (distPoint === 0) {
        healthAtPoint = 100;
      } else {
        const progress = distPoint / (changeOdo || 1);
        healthAtPoint = Math.max(10, Math.round(100 - 75 * Math.pow(progress, 1.25)));
      }
      curveData.push(healthAtPoint);
    }

    if (typeof Chart !== 'undefined') {
      if (degradationChart) {
        degradationChart.data.labels = labels;
        degradationChart.data.datasets[0].data = curveData;
        degradationChart.update();
      } else {
        degradationChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Projected Oil Health (%)',
                data: curveData,
                borderColor: '#ff8800',
                backgroundColor: 'rgba(255, 136, 0, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#ffa600',
                pointRadius: 3,
                pointHoverRadius: 6
              },
              {
                label: 'Critical 30% Threshold',
                data: Array(steps + 1).fill(30),
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [6, 4],
                fill: false,
                pointRadius: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: '#a1a1aa',
                  font: { family: 'Space Grotesk', size: 11 }
                }
              },
              tooltip: {
                callbacks: {
                  label: (context) => `Health: ${context.parsed.y}%`
                }
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: `Odometer Run (${unitLabel})`,
                  color: '#71717a',
                  font: { family: 'Space Grotesk', size: 11 }
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } }
              },
              y: {
                min: 0,
                max: 100,
                title: {
                  display: true,
                  text: 'Oil Health (%)',
                  color: '#71717a',
                  font: { family: 'Space Grotesk', size: 11 }
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } }
              }
            }
          }
        });
      }
    } else {
      renderSvgFallbackChart(labels, curveData, unitLabel);
    }
  }

  function renderSvgFallbackChart(labels, data, unit) {
    const fallbackEl = document.getElementById('fallback-svg-chart');
    const canvasEl = document.getElementById('degradationChart');
    if (!fallbackEl || !canvasEl) return;
    
    canvasEl.style.display = 'none';
    fallbackEl.style.display = 'block';

    const width = 450;
    const height = 180;
    const padding = 35;
    
    let pathD = '';
    data.forEach((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - (val / 100) * (height - 2 * padding);
      if (i === 0) pathD += `M ${x} ${y}`;
      else pathD += ` L ${x} ${y}`;
    });

    const critY = height - padding - (30 / 100) * (height - 2 * padding);

    fallbackEl.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
        <line x1="${padding}" y1="${critY}" x2="${width - padding}" y2="${critY}" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="2"/>
        <text x="${width - padding - 85}" y="${critY - 5}" fill="#ef4444" font-size="10" font-family="monospace">Limit: 30%</text>
        <path d="${pathD}" fill="none" stroke="#ff8800" stroke-width="3" />
        <text x="${padding}" y="${height - 10}" fill="#9ca3af" font-size="10">0 ${unit}</text>
        <text x="${width - padding - 40}" y="${height - 10}" fill="#9ca3af" font-size="10">End of Life</text>
      </svg>
    `;
  }

  // Event Listeners for Reactive Inputs
  tempInput?.addEventListener('input', calculateDiagnostics);

  saeSelect?.addEventListener('change', () => {
    const nom = parseFloat(saeSelect.selectedOptions[0]?.getAttribute('data-nom'));
    if (!isNaN(nom)) viscSlider.value = nom;
    calculateDiagnostics();
  });

  viscSlider?.addEventListener('input', calculateDiagnostics);
  if (transSlider) transSlider.addEventListener('input', calculateDiagnostics);
  mileageInput?.addEventListener('input', calculateDiagnostics);
  unitToggle?.addEventListener('change', calculateDiagnostics);
  oilBaseSelect?.addEventListener('change', calculateDiagnostics);
  engineTypeSelect?.addEventListener('change', calculateDiagnostics);
  dutyCycleSelect?.addEventListener('change', calculateDiagnostics);

  // Blotter Card Selection
  blotterCards.forEach(card => {
    card.addEventListener('click', () => {
      blotterCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentBlotterScore = parseFloat(card.getAttribute('data-score')) || 100;
      if (dispBlotterLabel) dispBlotterLabel.textContent = card.getAttribute('data-name');
      calculateDiagnostics();
    });
  });

  // Presets Activation
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const p = presets[presetKey];
      if (!p) return;

      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (saeSelect) saeSelect.value = p.sae;
      if (tempInput && p.temp) tempInput.value = p.temp;
      if (viscSlider) viscSlider.value = p.visc;
      if (transSlider && p.trans) transSlider.value = p.trans;
      if (mileageInput) mileageInput.value = p.mileage;
      if (oilBaseSelect) oilBaseSelect.value = p.oilBase;
      if (engineTypeSelect) engineTypeSelect.value = p.engine;
      if (dutyCycleSelect) dutyCycleSelect.value = p.duty;

      currentBlotterScore = p.blotter;
      if (dispBlotterLabel) dispBlotterLabel.textContent = p.blotterName;
      blotterCards.forEach(c => {
        if (parseFloat(c.getAttribute('data-score')) === p.blotter) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      calculateDiagnostics();
    });
  });

  // Reset Button
  btnReset?.addEventListener('click', () => {
    presetBtns[0]?.click();
  });

  // Print Work Order Button
  btnPrint?.addEventListener('click', () => {
    window.print();
  });

  // Copy Summary to Clipboard
  btnCopySummary?.addEventListener('click', () => {
    const text = `
LUBRISPEC OIL DIAGNOSTIC REPORT
---------------------------------------
Timestamp: ${new Date().toLocaleString()}
SAE Viscosity Grade: ${saeSelect.value} (${viscSlider.value} cSt, ${dispViscDev ? dispViscDev.textContent : ''})
Oil Condition & Spot: ${dispBlotterLabel ? dispBlotterLabel.textContent : ''}
Current Odometer: ${mileageInput.value} ${unitToggle.value}
Oil Health Index (OHI): ${dispOhiPercent.textContent}
Condition: ${dispStatusBadge ? dispStatusBadge.textContent.trim() : ''}
Remaining Safe Run: ${dispRulDistance.textContent}
Next Change Odometer: ${dispChangeOdo.textContent}
Summary: ${dispMechanicText ? dispMechanicText.innerText.replace(/\s+/g, ' ').trim() : ''}
---------------------------------------
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      const origText = btnCopySummary.innerHTML;
      btnCopySummary.innerHTML = '<i class="fa-solid fa-check"></i> Copied to Clipboard!';
      setTimeout(() => {
        btnCopySummary.innerHTML = origText;
      }, 2500);
    }).catch(() => {
      alert('Report copied to console or unable to access clipboard.');
    });
  });

  // Save Inspection to Dashboard Handler
  const btnSaveRecord = document.getElementById('btn-save-record');
  const vehiclePlateInput = document.getElementById('vehicle-plate-input');
  const vehicleTypeSelect = document.getElementById('vehicle-type-select');
  const saveToast = document.getElementById('save-toast');

  // Check for prefill data passed from Dashboard
  const prefillPlate = sessionStorage.getItem('prefill_vehicle_plate');
  if (prefillPlate && vehiclePlateInput) {
    vehiclePlateInput.value = prefillPlate;
    sessionStorage.removeItem('prefill_vehicle_plate');
  }
  const prefillType = sessionStorage.getItem('prefill_vehicle_type');
  if (prefillType && vehicleTypeSelect) {
    vehicleTypeSelect.value = prefillType;
    sessionStorage.removeItem('prefill_vehicle_type');
  }
  const prefillVisc = sessionStorage.getItem('prefill_visc');
  if (prefillVisc && viscSlider) {
    viscSlider.value = prefillVisc;
    sessionStorage.removeItem('prefill_visc');
  }
  const prefillGrade = sessionStorage.getItem('prefill_grade');
  if (prefillGrade && saeSelect) {
    saeSelect.value = prefillGrade;
    sessionStorage.removeItem('prefill_grade');
  }
  const prefillOdo = sessionStorage.getItem('prefill_odometer');
  if (prefillOdo && mileageInput) {
    mileageInput.value = prefillOdo;
    sessionStorage.removeItem('prefill_odometer');
  }

  // Type to Icon mapper
  function getIconForVehicleType(typeStr) {
    if (!typeStr) return 'fa-car';
    if (typeStr.includes('Truck')) return 'fa-truck';
    if (typeStr.includes('SUV')) return 'fa-car-side';
    if (typeStr.includes('Van')) return 'fa-van-shuttle';
    if (typeStr.includes('Motorcycle')) return 'fa-motorcycle';
    return 'fa-car';
  }

  btnSaveRecord?.addEventListener('click', () => {
    const plate = vehiclePlateInput ? vehiclePlateInput.value.trim() : 'MH-12-DEMO';
    const type = vehicleTypeSelect ? vehicleTypeSelect.value : 'Commercial Heavy Truck';
    const ohiVal = parseInt(dispOhiPercent.textContent) || 85;
    const rulVal = parseInt(dispRulDistance.textContent.replace(/[^0-9]/g, '')) || 0;
    const changeVal = parseInt(dispChangeOdo.textContent.replace(/[^0-9]/g, '')) || 0;
    const currentOdo = parseFloat(mileageInput.value) || 0;

    let status = 'optimal';
    let statusText = 'OPTIMAL CONDITION';
    if (ohiVal < 35) {
      status = 'critical';
      statusText = 'CRITICAL / FLUSH NOW';
    } else if (ohiVal < 55) {
      status = 'warning';
      statusText = 'SERVICE DUE SOON';
    }

    const newRecord = {
      id: "REC-" + Math.floor(1050 + Math.random() * 900),
      plate: plate || 'MH-12-UNKNOWN',
      type: type,
      typeIcon: getIconForVehicleType(type),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysAgo: 0,
      grade: saeSelect.value,
      visc: parseFloat(viscSlider.value),
      viscDev: dispViscDev ? dispViscDev.textContent : '0.0%',
      condition: dispBlotterLabel ? dispBlotterLabel.textContent : 'Uniform Ring',
      soot: dispSootPct ? dispSootPct.textContent : '0.12% wt',
      odometer: currentOdo,
      base: oilBaseSelect.selectedOptions[0]?.text.split('(')[0].trim() || 'Synthetic',
      duty: dutyCycleSelect.selectedOptions[0]?.text.split('(')[0].trim() || 'Mixed',
      ohi: ohiVal,
      rulKm: rulVal,
      changeOdo: changeVal,
      status: status,
      statusText: statusText,
      advisory: dispMechanicText ? dispMechanicText.innerText.trim() : 'Routine service recommendation.'
    };

    // Save into localStorage
    let stored = [];
    try {
      const raw = localStorage.getItem('lubri_records');
      if (raw) stored = JSON.parse(raw);
    } catch (e) {
      stored = [];
    }
    if (!Array.isArray(stored)) stored = [];
    stored.unshift(newRecord);
    localStorage.setItem('lubri_records', JSON.stringify(stored));

    // Display Toast notification
    if (saveToast) {
      saveToast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <div>
            <i class="fa-solid fa-circle-check" style="color: var(--status-optimal); margin-right: 0.5rem;"></i>
            <strong>Vehicle ${plate}</strong> saved to 30-Day Fleet Dashboard!
          </div>
          <a href="dashboard.html" class="btn-demo-pill" style="text-decoration: none;">
            View in Dashboard &rarr;
          </a>
        </div>
      `;
      saveToast.style.display = 'block';
      setTimeout(() => {
        saveToast.style.display = 'none';
      }, 5000);
    }
  });

  // Initial Calculation Run on Page Load
  calculateDiagnostics();
});
