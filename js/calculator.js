/**
 * LUBRISPEC - Engine Oil Life Calculation Engine
 * Pure Deterministic Tribological & Fluid Degradation Formulation
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Inputs
  const saeSelect = document.getElementById('sae-grade-select');
  const viscSlider = document.getElementById('viscosity-slider');
  const transSlider = document.getElementById('transparency-slider');
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

  // Color interpolation helper for realistic oil droplet
  function getOilColor(transPercent) {
    // 100% -> Golden Yellow (#fef08a)
    // 80%  -> Amber Gold (#f59e0b)
    // 55%  -> Dark Amber (#b45309)
    // 35%  -> Roasted Brown (#78350f)
    // 18%  -> Burnt Dark (#291507)
    // 5%   -> Pitch Black (#0a0a0c)
    if (transPercent >= 80) {
      const f = (transPercent - 80) / 20;
      return `rgb(${Math.round(245 + f * 9)}, ${Math.round(158 + f * 82)}, ${Math.round(11 + f * 127)})`;
    } else if (transPercent >= 55) {
      const f = (transPercent - 55) / 25;
      return `rgb(${Math.round(180 + f * 65)}, ${Math.round(83 + f * 75)}, ${Math.round(9 + f * 2)})`;
    } else if (transPercent >= 35) {
      const f = (transPercent - 35) / 20;
      return `rgb(${Math.round(120 + f * 60)}, ${Math.round(53 + f * 30)}, ${Math.round(15 - f * 6)})`;
    } else if (transPercent >= 18) {
      const f = (transPercent - 18) / 17;
      return `rgb(${Math.round(41 + f * 79)}, ${Math.round(21 + f * 32)}, ${Math.round(7 + f * 8)})`;
    } else {
      const f = Math.max(0, (transPercent - 5) / 13);
      return `rgb(${Math.round(10 + f * 31)}, ${Math.round(10 + f * 11)}, ${Math.round(12 - f * 5)})`;
    }
  }

  // Workshop Presets
  const presets = {
    fresh: {
      sae: '5W-30',
      visc: 10.5,
      trans: 92,
      blotter: 100,
      blotterName: 'Uniform Ring (Clean)',
      mileage: 1200,
      oilBase: 'full',
      engine: 'na-petrol',
      duty: 'highway'
    },
    mid: {
      sae: '5W-30',
      visc: 9.9,
      trans: 68,
      blotter: 75,
      blotterName: 'Diffuse Core (Good)',
      mileage: 6200,
      oilBase: 'full',
      engine: 'na-petrol',
      duty: 'mixed'
    },
    sheared: {
      sae: '5W-30',
      visc: 6.8, // severe fuel shear
      trans: 62,
      blotter: 75,
      blotterName: 'Diffuse Core (Good)',
      mileage: 7800,
      oilBase: 'semi',
      engine: 'turbo-petrol',
      duty: 'severe'
    },
    diesel: {
      sae: '15W-40',
      visc: 14.8,
      trans: 22, // high diesel soot
      blotter: 45,
      blotterName: 'Coagulated Core (Aged)',
      mileage: 8500,
      oilBase: 'semi',
      engine: 'diesel',
      duty: 'mixed'
    },
    sludge: {
      sae: '10W-40',
      visc: 21.5, // heavy oxidized sludge thickening
      trans: 8,
      blotter: 15,
      blotterName: 'Dense Sludge Center (Depleted)',
      mileage: 14500,
      oilBase: 'mineral',
      engine: 'na-petrol',
      duty: 'severe'
    }
  };

  // Primary Calculation Function
  function calculateDiagnostics() {
    const selectedSae = saeSelect.value;
    const nominalVisc = parseFloat(saeSelect.selectedOptions[0].getAttribute('data-nom')) || 10.5;
    const currentVisc = parseFloat(viscSlider.value);
    const transVal = parseFloat(transSlider.value);
    const currentDistance = Math.max(0, parseFloat(mileageInput.value) || 0);
    const isMiles = unitToggle.value === 'mi';
    const unitLabel = isMiles ? 'mi' : 'km';

    // 1. Viscosity Consistency Score
    // Ratio Rv = current / nominal
    const ratioV = currentVisc / nominalVisc;
    const devPct = ((ratioV - 1.0) * 100).toFixed(1);
    dispViscVal.textContent = `${currentVisc.toFixed(1)} cSt`;

    if (devPct > 0) {
      dispViscDev.textContent = `+${devPct}% (Thickened)`;
      dispViscDev.style.color = devPct > 20 ? 'var(--status-critical)' : 'var(--oil-fresh-glow)';
    } else if (devPct < 0) {
      dispViscDev.textContent = `${devPct}% (Sheared)`;
      dispViscDev.style.color = devPct < -18 ? 'var(--status-critical)' : 'var(--status-stable)';
    } else {
      dispViscDev.textContent = `0.0% (Factory Spec)`;
      dispViscDev.style.color = 'var(--status-optimal)';
    }

    // Formula: S_visc = 100 * exp(-2.8 * |Rv - 1.0|^1.5)
    const viscHealth = Math.min(100, Math.max(0, 100 * Math.exp(-2.8 * Math.pow(Math.abs(ratioV - 1.0), 1.5))));

    // 2. Optical Transmittance Score & Soot Estimation
    dispTransVal.textContent = `${transVal}%`;
    const transColor = getOilColor(transVal);
    miniDroplet.style.backgroundColor = transColor;
    miniDroplet.style.boxShadow = `0 0 12px ${transColor}`;

    // Beer-Lambert equivalent soot estimation:
    const sootWt = Math.max(0.05, (-Math.log(Math.max(0.01, transVal / 98)) * 0.92)).toFixed(2);
    dispSootPct.textContent = `${sootWt}% wt`;

    if (transVal >= 75) {
      dispOpticalStatus.textContent = 'Clear / Translucent';
      dispOpticalStatus.style.color = 'var(--status-optimal)';
    } else if (transVal >= 50) {
      dispOpticalStatus.textContent = 'Operational Amber';
      dispOpticalStatus.style.color = 'var(--status-stable)';
    } else if (transVal >= 25) {
      dispOpticalStatus.textContent = 'Soot Contaminated';
      dispOpticalStatus.style.color = 'var(--status-warning)';
    } else {
      dispOpticalStatus.textContent = 'High Carbon Opaque';
      dispOpticalStatus.style.color = 'var(--status-critical)';
    }

    // Formula: S_trans = (T / 100)^0.75 * 100
    const transHealth = Math.min(100, Math.max(0, Math.pow(transVal / 100, 0.75) * 100));

    // 3. Blotter Dispersancy
    const blotterHealth = currentBlotterScore;

    // 4. Composite Oil Health Index (OHI)
    // 45% Transmittance, 40% Viscosity, 15% Blotter dispersancy
    const ohi = Math.round((0.45 * transHealth) + (0.40 * viscHealth) + (0.15 * blotterHealth));

    // Update Sub-factor Bars
    dispFactorVisc.textContent = `${Math.round(viscHealth)}%`;
    barFactorVisc.style.width = `${Math.round(viscHealth)}%`;
    dispFactorTrans.textContent = `${Math.round(transHealth)}%`;
    barFactorTrans.style.width = `${Math.round(transHealth)}%`;
    dispFactorBlotter.textContent = `${Math.round(blotterHealth)}%`;
    barFactorBlotter.style.width = `${Math.round(blotterHealth)}%`;

    // 5. Operating Duty Cycle Multipliers
    const baseOilFactor = parseFloat(oilBaseSelect.selectedOptions[0].getAttribute('data-factor')) || 1.7;
    const engineFactor = parseFloat(engineTypeSelect.selectedOptions[0].getAttribute('data-factor')) || 1.0;
    const dutyFactor = parseFloat(dutyCycleSelect.selectedOptions[0].getAttribute('data-factor')) || 1.0;
    const compositeDutyMultiplier = baseOilFactor * engineFactor * dutyFactor;

    // Baseline nominal maximum distance (km) for standard mineral oil under normal duty: 5,500 km
    const baselineNominalKm = 5500 * compositeDutyMultiplier;

    // Remaining Useful Life (RUL) distance
    let rulKm = 0;
    if (ohi > 30) {
      // Linear scaling between 30% and 100% health
      rulKm = Math.round(baselineNominalKm * ((ohi - 25) / 75));
    } else {
      rulKm = 0;
    }

    // Convert to selected units
    const rulDistance = isMiles ? Math.round(rulKm * 0.621371) : rulKm;
    const totalChangeOdo = currentDistance + rulDistance;
    const estEngineHours = Math.round(rulDistance / (isMiles ? 32 : 52));

    // Update Output Displays
    dispOhiPercent.textContent = `${ohi}%`;
    dispRulUnit.textContent = unitLabel;

    // SVG Gauge Ring calculation (Circumference = 2 * PI * 58 = 364.4)
    const circumference = 364.4;
    const ringOffset = circumference - (circumference * (ohi / 100));
    svgGaugeRing.style.strokeDasharray = `${circumference}`;
    svgGaugeRing.style.strokeDashoffset = `${Math.max(0, ringOffset)}`;

    // Color and status badge assignment
    let statusTheme = 'optimal';
    let statusText = 'OPTIMAL INTEGRITY';
    let statusColor = 'var(--status-optimal)';
    let urgencyMessage = 'Safe operating envelope. Additives active; hydrodynamic lubrication fully maintained.';

    if (ohi >= 75) {
      statusTheme = 'optimal';
      statusText = 'OPTIMAL CONDITION';
      statusColor = 'var(--status-optimal)';
      svgGaugeRing.style.stroke = 'var(--status-optimal)';
      urgencyMessage = `Excellent lubrication film. Viscosity is stable, and additive pack has plenty of reserve. Safe for normal continuous running.`;
    } else if (ohi >= 55) {
      statusTheme = 'stable';
      statusText = 'STABLE OPERATIONAL';
      statusColor = 'var(--status-stable)';
      svgGaugeRing.style.stroke = 'var(--status-stable)';
      urgencyMessage = `Normal mid-life wear. Detergents are active and soot dispersion is within design limits. Continue regular operation.`;
    } else if (ohi >= 35) {
      statusTheme = 'warning';
      statusText = 'SERVICE DUE SOON';
      statusColor = 'var(--status-warning)';
      svgGaugeRing.style.stroke = 'var(--status-warning)';
      urgencyMessage = `Degradation acceleration detected. Additives depleted. Plan oil and filter change within the remaining ${rulDistance.toLocaleString()} ${unitLabel}.`;
    } else {
      statusTheme = 'critical';
      statusText = 'CRITICAL / CHANGE NOW';
      statusColor = 'var(--status-critical)';
      svgGaugeRing.style.stroke = 'var(--status-critical)';
      urgencyMessage = `CRITICAL WARNING: Lubrication breakdown risk! Oil film unable to protect crank and cam journals. Immediate drain and filter flush mandatory.`;
    }

    dispStatusBadge.className = `status-badge ${statusTheme}`;
    dispStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${statusText}`;
    dispServiceUrgency.textContent = urgencyMessage;

    if (rulDistance > 0) {
      dispRulMain.innerHTML = `+${rulDistance.toLocaleString()} <span class="metric-unit">${unitLabel}</span>`;
      dispRulDistance.textContent = `+${rulDistance.toLocaleString()} ${unitLabel}`;
      dispRulDistance.style.color = statusColor;
      dispChangeOdo.textContent = `${totalChangeOdo.toLocaleString()} ${unitLabel}`;
      dispRulHours.textContent = `~${estEngineHours} hrs`;
    } else {
      dispRulMain.innerHTML = `0 <span class="metric-unit">${unitLabel}</span>`;
      dispRulDistance.textContent = `IMMEDIATE CHANGE`;
      dispRulDistance.style.color = 'var(--status-critical)';
      dispChangeOdo.textContent = `${currentDistance.toLocaleString()} ${unitLabel} (OVERDUE)`;
      dispRulHours.textContent = `0 hrs`;
    }

    // Dynamic Mechanic Advisory Text Generator
    generateMechanicAdvisory(ratioV, transVal, currentBlotterScore, devPct, selectedSae, ohi, unitLabel, rulDistance);

    // Update Trajectory Chart
    updateDegradationChart(currentDistance, totalChangeOdo, ohi, baselineNominalKm, isMiles, unitLabel);
  }

  // Mechanic Advisory logic
  function generateMechanicAdvisory(ratioV, transVal, blotterScore, devPct, saeGrade, ohi, unitLabel, rulDistance) {
    const issues = [];
    
    if (ratioV < 0.82) {
      issues.push(`Severe viscosity shear thinning detected (${devPct}% drop). Inspect for cylinder wall fuel dilution, faulty injector spray patterns, or repeated short cold trips.`);
    } else if (ratioV > 1.22) {
      issues.push(`High kinematic thickening detected (+${devPct}% increase). Indicates sustained high-temperature thermal oxidation and insoluble varnish formation.`);
    }

    if (transVal < 20) {
      issues.push(`Severe optical opacity (<20% light penetration). Soot concentration exceeds 2.5% wt. Oil filter is at risk of differential bypass pressure.`);
    } else if (transVal < 40) {
      issues.push(`Elevated carbon suspension. Common in direct-injection or diesel duty.`);
    }

    if (blotterScore <= 20) {
      issues.push(`Blotter chromatography reveals collapsed dispersancy envelope. Detergent additives can no longer suspend soot; sludge coagulation is imminent.`);
    }

    if (issues.length === 0) {
      dispMechanicText.innerHTML = `
        <strong>Mechanical Evaluation:</strong> Factory viscosity envelope for <strong>${saeGrade}</strong> is intact. 
        Optical transmittance shows clean fluid base without soot saturation. 
        Projected safe operation for <strong>${rulDistance.toLocaleString()} ${unitLabel}</strong> before next preventative inspection.
      `;
    } else {
      dispMechanicText.innerHTML = `
        <strong>Mechanic Action Required:</strong><br>
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

    // Model exponential degradation trajectory
    for (let i = 0; i <= steps; i++) {
      const distPoint = Math.round((endScaleDist / steps) * i);
      labels.push(`${distPoint.toLocaleString()}`);

      // Degradation formula: 100 - (100 - 25) * (dist / changeOdo)^1.25
      let healthAtPoint;
      if (distPoint === 0) {
        healthAtPoint = 100;
      } else {
        const progress = distPoint / (changeOdo || 1);
        healthAtPoint = Math.max(10, Math.round(100 - 75 * Math.pow(progress, 1.25)));
      }
      curveData.push(healthAtPoint);
    }

    // Check if Chart.js is available
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
                label: 'Projected Oil Health Index (%)',
                data: curveData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#f59e0b',
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
                  color: '#9ca3af',
                  font: { family: 'JetBrains Mono', size: 11 }
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
                  color: '#6b7280',
                  font: { family: 'Plus Jakarta Sans', size: 11 }
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 10 } }
              },
              y: {
                min: 0,
                max: 100,
                title: {
                  display: true,
                  text: 'Oil Health (%)',
                  color: '#6b7280',
                  font: { family: 'Plus Jakarta Sans', size: 11 }
                },
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 10 } }
              }
            }
          }
        });
      }
    } else {
      // Fallback SVG chart if CDN fails/offline
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
        <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="3" />
        <text x="${padding}" y="${height - 10}" fill="#9ca3af" font-size="10">0 ${unit}</text>
        <text x="${width - padding - 40}" y="${height - 10}" fill="#9ca3af" font-size="10">End of Life</text>
      </svg>
    `;
  }

  // Event Listeners for Reactive Inputs
  saeSelect.addEventListener('change', () => {
    const nom = parseFloat(saeSelect.selectedOptions[0].getAttribute('data-nom'));
    viscSlider.value = nom;
    calculateDiagnostics();
  });

  viscSlider.addEventListener('input', calculateDiagnostics);
  transSlider.addEventListener('input', calculateDiagnostics);
  mileageInput.addEventListener('input', calculateDiagnostics);
  unitToggle.addEventListener('change', calculateDiagnostics);
  oilBaseSelect.addEventListener('change', calculateDiagnostics);
  engineTypeSelect.addEventListener('change', calculateDiagnostics);
  dutyCycleSelect.addEventListener('change', calculateDiagnostics);

  // Blotter Card Selection
  blotterCards.forEach(card => {
    card.addEventListener('click', () => {
      blotterCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentBlotterScore = parseFloat(card.getAttribute('data-score')) || 100;
      dispBlotterLabel.textContent = card.getAttribute('data-name');
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

      saeSelect.value = p.sae;
      viscSlider.value = p.visc;
      transSlider.value = p.trans;
      mileageInput.value = p.mileage;
      oilBaseSelect.value = p.oilBase;
      engineTypeSelect.value = p.engine;
      dutyCycleSelect.value = p.duty;

      currentBlotterScore = p.blotter;
      dispBlotterLabel.textContent = p.blotterName;
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
  btnReset.addEventListener('click', () => {
    presetBtns[0].click();
  });

  // Print Work Order Button
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Copy Summary to Clipboard
  btnCopySummary.addEventListener('click', () => {
    const text = `
LUBRISPEC WORKSHOP OIL DIAGNOSTIC REPORT
---------------------------------------
Timestamp: ${new Date().toLocaleString()}
SAE Viscosity Grade: ${saeSelect.value} (${viscSlider.value} cSt, ${dispViscDev.textContent})
Optical Transmittance: ${transSlider.value}% (${dispOpticalStatus.textContent})
Estimated Soot: ${dispSootPct.textContent}
Blotter Pattern: ${dispBlotterLabel.textContent}
Current Odometer: ${mileageInput.value} ${unitToggle.value}
Oil Health Index (OHI): ${dispOhiPercent.textContent}
Condition: ${dispStatusBadge.textContent.trim()}
Remaining Safe Run: ${dispRulDistance.textContent}
Next Change Odometer: ${dispChangeOdo.textContent}
Summary: ${dispMechanicText.innerText.replace(/\s+/g, ' ').trim()}
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

  // Initial Calculation Run
  calculateDiagnostics();
});
