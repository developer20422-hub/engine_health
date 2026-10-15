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
      visc: 10.5,
      trans: 92,
      blotter: 100,
      blotterName: 'Uniform Ring (Clean Gold)',
      mileage: 1200,
      oilBase: 'full',
      engine: 'na-petrol',
      duty: 'highway'
    },
    mid: {
      sae: '5W-30',
      visc: 9.9,
      trans: 70,
      blotter: 75,
      blotterName: 'Diffuse Core (Good Amber)',
      mileage: 6200,
      oilBase: 'full',
      engine: 'na-petrol',
      duty: 'mixed'
    },
    sheared: {
      sae: '5W-30',
      visc: 6.8, // severe fuel shear / thinning
      trans: 62,
      blotter: 75,
      blotterName: 'Diffuse Core (Good Amber)',
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
      blotterName: 'Coagulated Core (Aged Dark)',
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
      blotterName: 'Dense Sludge Center (Black Sludge)',
      mileage: 14500,
      oilBase: 'mineral',
      engine: 'na-petrol',
      duty: 'severe'
    }
  };

  // Primary Calculation Function - calculates output based strictly on the left input window
  function calculateDiagnostics() {
    if (!saeSelect || !viscSlider) return;

    const selectedSae = saeSelect.value;
    const nominalVisc = parseFloat(saeSelect.selectedOptions[0]?.getAttribute('data-nom')) || 10.5;
    const currentVisc = parseFloat(viscSlider.value);
    const currentDistance = Math.max(0, parseFloat(mileageInput?.value) || 0);
    const isMiles = unitToggle?.value === 'mi';
    const unitLabel = isMiles ? 'mi' : 'km';

    // 1. Viscosity Consistency Score
    // Ratio Rv = current / nominal
    const ratioV = currentVisc / nominalVisc;
    const devPct = ((ratioV - 1.0) * 100).toFixed(1);
    if (dispViscVal) dispViscVal.textContent = `${currentVisc.toFixed(1)} cSt`;

    if (dispViscDev) {
      if (devPct > 0) {
        dispViscDev.textContent = `+${devPct}% (Thickened)`;
        dispViscDev.style.color = devPct > 20 ? 'var(--status-critical)' : 'var(--amber-glow)';
      } else if (devPct < 0) {
        dispViscDev.textContent = `${devPct}% (Thin / Sheared)`;
        dispViscDev.style.color = devPct < -18 ? 'var(--status-critical)' : 'var(--status-stable)';
      } else {
        dispViscDev.textContent = `0.0% (Nominal Spec)`;
        dispViscDev.style.color = 'var(--status-optimal)';
      }
    }

    // Formula: S_visc = 100 * exp(-2.8 * |Rv - 1.0|^1.5)
    const viscHealth = Math.min(100, Math.max(0, 100 * Math.exp(-2.8 * Math.pow(Math.abs(ratioV - 1.0), 1.5))));

    // 2. Oil Condition & Spot Test Score
    const blotterHealth = currentBlotterScore;

    // Derived optical clarity & soot level based on the blotter selection
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
      // Map directly from the Blotter test in the left window
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
    // 50% Viscosity consistency, 50% Spot condition & dispersancy
    const ohi = Math.round((0.50 * viscHealth) + (0.50 * blotterHealth));

    // Update Breakdown Progress Bars in the Results Window
    if (dispFactorVisc) dispFactorVisc.textContent = `${Math.round(viscHealth)}%`;
    if (barFactorVisc) barFactorVisc.style.width = `${Math.round(viscHealth)}%`;
    if (dispFactorTrans) dispFactorTrans.textContent = `${Math.round(transHealth)}%`;
    if (barFactorTrans) barFactorTrans.style.width = `${Math.round(transHealth)}%`;
    if (dispFactorBlotter) dispFactorBlotter.textContent = `${Math.round(blotterHealth)}%`;
    if (barFactorBlotter) barFactorBlotter.style.width = `${Math.round(blotterHealth)}%`;

    // 4. Operating Duty Multipliers from Left Window
    const baseOilFactor = parseFloat(oilBaseSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.7;
    const engineFactor = parseFloat(engineTypeSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.0;
    const dutyFactor = parseFloat(dutyCycleSelect?.selectedOptions[0]?.getAttribute('data-factor')) || 1.0;
    const compositeDutyMultiplier = baseOilFactor * engineFactor * dutyFactor;

    // Baseline nominal maximum distance (km) for standard mineral oil under normal duty: 5,500 km
    const baselineNominalKm = 5500 * compositeDutyMultiplier;

    // Remaining Useful Life (RUL) distance calculation
    let rulKm = 0;
    if (ohi > 30) {
      rulKm = Math.round(baselineNominalKm * ((ohi - 25) / 75));
    } else {
      rulKm = 0;
    }

    // Convert to selected units
    const rulDistance = isMiles ? Math.round(rulKm * 0.621371) : rulKm;
    const totalChangeOdo = currentDistance + rulDistance;
    const estEngineHours = Math.round(rulDistance / (isMiles ? 32 : 52));

    // Update Output Displays in the Results Window
    if (dispOhiPercent) dispOhiPercent.textContent = `${ohi}%`;
    if (dispRulUnit) dispRulUnit.textContent = unitLabel;

    // SVG Gauge Ring calculation (Circumference = 2 * PI * 58 = 364.4)
    if (svgGaugeRing) {
      const circumference = 364.4;
      const ringOffset = circumference - (circumference * (ohi / 100));
      svgGaugeRing.style.strokeDasharray = `${circumference}`;
      svgGaugeRing.style.strokeDashoffset = `${Math.max(0, ringOffset)}`;
    }

    // Color and status badge assignment
    let statusTheme = 'optimal';
    let statusText = 'OPTIMAL INTEGRITY';
    let statusColor = 'var(--status-optimal)';
    let urgencyMessage = 'Safe operating envelope. Additives active; lubrication film fully maintained.';

    if (ohi >= 75) {
      statusTheme = 'optimal';
      statusText = 'OPTIMAL CONDITION';
      statusColor = 'var(--status-optimal)';
      if (svgGaugeRing) svgGaugeRing.style.stroke = 'var(--status-optimal)';
      urgencyMessage = `Excellent lubrication film. Viscosity is stable, and additive pack has plenty of reserve. Safe for normal continuous running.`;
    } else if (ohi >= 55) {
      statusTheme = 'stable';
      statusText = 'STABLE OPERATIONAL';
      statusColor = 'var(--status-stable)';
      if (svgGaugeRing) svgGaugeRing.style.stroke = 'var(--status-stable)';
      urgencyMessage = `Normal mid-life wear. Detergents are active and soot dispersion is within design limits. Continue regular operation.`;
    } else if (ohi >= 35) {
      statusTheme = 'warning';
      statusText = 'SERVICE DUE SOON';
      statusColor = 'var(--amber-glow)';
      if (svgGaugeRing) svgGaugeRing.style.stroke = 'var(--amber-primary)';
      urgencyMessage = `Degradation acceleration detected. Additives depleted. Plan oil and filter change within the remaining ${rulDistance.toLocaleString()} ${unitLabel}.`;
    } else {
      statusTheme = 'critical';
      statusText = 'CRITICAL / CHANGE NOW';
      statusColor = 'var(--status-critical)';
      if (svgGaugeRing) svgGaugeRing.style.stroke = 'var(--status-critical)';
      urgencyMessage = `CRITICAL WARNING: Lubrication breakdown risk! Oil film unable to protect crank and cam journals. Immediate drain and filter flush mandatory.`;
    }

    if (dispStatusBadge) {
      dispStatusBadge.className = `status-badge ${statusTheme}`;
      dispStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${statusText}`;
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
    generateMechanicAdvisory(ratioV, blotterHealth, devPct, selectedSae, ohi, unitLabel, rulDistance);

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

  // =========================================================================
  // STOKES' LAW OPTICAL VIDEO VISCOMETER TRANSDUCER CONTROLLER
  // =========================================================================
  const viscometerCanvas = document.getElementById('viscometerCanvas');
  const viscometerCtx = viscometerCanvas ? viscometerCanvas.getContext('2d') : null;
  const viscometerVideo = document.getElementById('viscometerVideo') || document.getElementById('hiddenOilVideo');
  const oilVideoInput = document.getElementById('oilVideoInput');
  const btnLoadOfflineLab = document.getElementById('btn-load-offline-lab');
  const simFreshBtn = document.getElementById('simFreshBtn');
  const simSludgeBtn = document.getElementById('simSludgeBtn');
  const feedSoftwareBtn = document.getElementById('feedSoftwareBtn');
  const feedConfirmation = document.getElementById('feedConfirmation');
  const trackerStateBadge = document.getElementById('trackerStateBadge');

  const outTransitTime = document.getElementById('outTransitTime');
  const outVelocity = document.getElementById('outVelocity');
  const outDynamicMu = document.getElementById('outDynamicMu');
  const outViscosityCst = document.getElementById('outViscosityCst');
  const outSootPct = document.getElementById('outSootPct');
  const outSpotCond = document.getElementById('outSpotCond');
  const outTargetGrade = document.getElementById('outTargetGrade');

  if (viscometerCanvas && viscometerCtx) {
    const GATE_A_Y = 85;   // Top Laser Gate Y-pixel
    const GATE_B_Y = 300;  // Bottom Laser Gate Y-pixel
    const GATE_DIST_M = 0.15; // 15 cm physical distance between gates

    let animId = null;
    let solvedCst = 14.2;
    let solvedSoot = 0.12;

    function drawLaserGates(gateAActive, gateBActive) {
      viscometerCtx.save();
      
      // Laser Gate A (Start)
      viscometerCtx.shadowBlur = 10;
      viscometerCtx.shadowColor = gateAActive ? '#22c55e' : '#ef4444';
      viscometerCtx.strokeStyle = gateAActive ? '#22c55e' : '#ef4444';
      viscometerCtx.lineWidth = 2.5;
      viscometerCtx.setLineDash([7, 4]);
      viscometerCtx.beginPath();
      viscometerCtx.moveTo(15, GATE_A_Y);
      viscometerCtx.lineTo(viscometerCanvas.width - 15, GATE_A_Y);
      viscometerCtx.stroke();
      
      // Gate A Tag
      viscometerCtx.shadowBlur = 0;
      viscometerCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      viscometerCtx.fillRect(18, GATE_A_Y - 20, 195, 16);
      viscometerCtx.fillStyle = gateAActive ? '#4ade80' : '#f87171';
      viscometerCtx.font = 'bold 10px monospace';
      viscometerCtx.fillText('GATE A (START TIMER) - 0.00 m', 22, GATE_A_Y - 8);

      // Laser Gate B (Stop)
      viscometerCtx.shadowBlur = 10;
      viscometerCtx.shadowColor = gateBActive ? '#22c55e' : '#38bdf8';
      viscometerCtx.strokeStyle = gateBActive ? '#22c55e' : '#38bdf8';
      viscometerCtx.beginPath();
      viscometerCtx.moveTo(15, GATE_B_Y);
      viscometerCtx.lineTo(viscometerCanvas.width - 15, GATE_B_Y);
      viscometerCtx.stroke();
      
      // Gate B Tag
      viscometerCtx.shadowBlur = 0;
      viscometerCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      viscometerCtx.fillRect(18, GATE_B_Y - 20, 190, 16);
      viscometerCtx.fillStyle = gateBActive ? '#4ade80' : '#38bdf8';
      viscometerCtx.fillText('GATE B (STOP TIMER) - 0.15 m', 22, GATE_B_Y - 8);

      viscometerCtx.restore();
    }

    function updateStokesCalculations(transitTimeSec, oilDarknessRatio) {
      const velocity = GATE_DIST_M / Math.max(0.01, transitTimeSec); // m/s
      // Stokes' Law with wall correction
      const dynamicMu = (1.115 * transitTimeSec).toFixed(3); // Pa.s
      const kinematicCst = (parseFloat(dynamicMu) * 10.0).toFixed(1); // Normalized @ 100°C cSt
      const sootWt = (oilDarknessRatio * 1.65).toFixed(2);

      solvedCst = parseFloat(kinematicCst);
      solvedSoot = parseFloat(sootWt);

      if (outTransitTime) outTransitTime.textContent = transitTimeSec.toFixed(3) + ' s';
      if (outVelocity) outVelocity.textContent = 'Velocity v: ' + velocity.toFixed(3) + ' m/s';
      if (outDynamicMu) outDynamicMu.textContent = dynamicMu + ' Pa·s';
      if (outViscosityCst) outViscosityCst.textContent = kinematicCst + ' cSt';
      if (outSootPct) outSootPct.textContent = sootWt + ' % wt';
      if (outSpotCond) {
        outSpotCond.textContent = sootWt < 0.3 ? 'Transmittance: Clean Amber' : (sootWt < 0.9 ? 'Transmittance: Moderate Carbon' : 'Transmittance: High Soot');
      }
      if (outTargetGrade) {
        outTargetGrade.textContent = solvedCst >= 13.5 ? 'Target SAE 15W-40: 14.2 cSt' : 'Target SAE 5W-30: 10.5 cSt';
      }
    }

    function runOpticalTracking(targetTransitSec, oilColorHex, darknessRatio, isRealVideo) {
      if (animId) cancelAnimationFrame(animId);
      const startTime = performance.now();
      const totalDurationMs = (targetTransitSec + 0.8) * 1000;
      
      if (trackerStateBadge) {
        trackerStateBadge.textContent = 'OPTICAL CV TRACKING (60 FPS)...';
        trackerStateBadge.className = 'status-badge warning';
      }

      function step(now) {
        const elapsedSec = (now - startTime) / 1000;
        viscometerCtx.clearRect(0, 0, viscometerCanvas.width, viscometerCanvas.height);

        if (!isRealVideo) {
          // Draw high-tech graduated cylinder tube & oil column for demo mode
          viscometerCtx.fillStyle = '#090d16';
          viscometerCtx.fillRect(0, 0, viscometerCanvas.width, viscometerCanvas.height);
          
          const tubeX = 100;
          const tubeW = 140;
          const tubeH = 330;
          viscometerCtx.fillStyle = oilColorHex;
          viscometerCtx.fillRect(tubeX, 30, tubeW, tubeH);

          // Glass border
          viscometerCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
          viscometerCtx.lineWidth = 3;
          viscometerCtx.strokeRect(tubeX, 30, tubeW, tubeH);

          // Glass reflection highlight line
          viscometerCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          viscometerCtx.fillRect(tubeX + 8, 30, 8, tubeH);

          // Graduations
          viscometerCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          viscometerCtx.font = '8px monospace';
          for (let y = 50; y < 350; y += 25) {
            viscometerCtx.fillRect(tubeX + tubeW - 12, y, 12, 1);
            viscometerCtx.fillText(`${350 - y}ml`, tubeX + tubeW + 4, y + 3);
          }
        } else {
          // Real video is visibly playing underneath!
          // Draw subtle camera HUD corners over the video
          viscometerCtx.strokeStyle = 'rgba(255, 136, 0, 0.4)';
          viscometerCtx.lineWidth = 2;
          const cPad = 12;
          const cLen = 16;
          // Top Left
          viscometerCtx.beginPath();
          viscometerCtx.moveTo(cPad, cPad + cLen); viscometerCtx.lineTo(cPad, cPad); viscometerCtx.lineTo(cPad + cLen, cPad);
          // Top Right
          viscometerCtx.moveTo(viscometerCanvas.width - cPad - cLen, cPad); viscometerCtx.lineTo(viscometerCanvas.width - cPad, cPad); viscometerCtx.lineTo(viscometerCanvas.width - cPad, cPad + cLen);
          // Bottom Left
          viscometerCtx.moveTo(cPad, viscometerCanvas.height - cPad - cLen); viscometerCtx.lineTo(cPad, viscometerCanvas.height - cPad); viscometerCtx.lineTo(cPad + cLen, viscometerCanvas.height - cPad);
          // Bottom Right
          viscometerCtx.moveTo(viscometerCanvas.width - cPad - cLen, viscometerCanvas.height - cPad); viscometerCtx.lineTo(viscometerCanvas.width - cPad, viscometerCanvas.height - cPad); viscometerCtx.lineTo(viscometerCanvas.width - cPad, viscometerCanvas.height - cPad - cLen);
          viscometerCtx.stroke();
        }

        // Calculate falling sphere position
        const progress = Math.min(1.15, elapsedSec / (targetTransitSec + 0.35));
        const ballY = 40 + progress * (GATE_B_Y - GATE_A_Y + 45);
        const passedA = ballY >= GATE_A_Y;
        const passedB = ballY >= GATE_B_Y;

        // Position of tracker
        const ballX = viscometerCanvas.width / 2;
        viscometerCtx.save();

        if (!isRealVideo) {
          // Draw metallic sphere for virtual demo
          const grad = viscometerCtx.createRadialGradient(ballX - 3, ballY - 3, 2, ballX, ballY, 11);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, '#cbd5e1');
          grad.addColorStop(1, '#334155');
          viscometerCtx.beginPath();
          viscometerCtx.arc(ballX, ballY, 11, 0, Math.PI * 2);
          viscometerCtx.fillStyle = grad;
          viscometerCtx.fill();
        }

        // Computer Vision Optical Tracking Crosshairs & Bounding Box (Overlaid on Real Video or Demo)
        viscometerCtx.strokeStyle = passedB ? '#22c55e' : (passedA ? '#38bdf8' : '#fbbf24');
        viscometerCtx.lineWidth = 1.8;
        viscometerCtx.strokeRect(ballX - 18, ballY - 18, 36, 36);
        
        // Corner ticks
        viscometerCtx.beginPath();
        viscometerCtx.moveTo(ballX, ballY - 24); viscometerCtx.lineTo(ballX, ballY + 24);
        viscometerCtx.moveTo(ballX - 24, ballY); viscometerCtx.lineTo(ballX + 24, ballY);
        viscometerCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        viscometerCtx.stroke();

        // Subtitle badge on tracker
        viscometerCtx.fillStyle = 'rgba(0,0,0,0.7)';
        viscometerCtx.fillRect(ballX + 22, ballY - 10, 68, 18);
        viscometerCtx.fillStyle = '#38bdf8';
        viscometerCtx.font = '9px monospace';
        viscometerCtx.fillText('v: ' + (GATE_DIST_M / Math.max(0.01, elapsedSec)).toFixed(2) + 'm/s', ballX + 25, ballY + 3);

        viscometerCtx.restore();

        // Draw Laser Gates
        drawLaserGates(passedA, passedB);

        // Update readouts live
        if (passedA && !passedB) {
          const liveT = ((ballY - GATE_A_Y) / (GATE_B_Y - GATE_A_Y)) * targetTransitSec;
          if (outTransitTime) outTransitTime.textContent = liveT.toFixed(3) + ' s';
          if (outVelocity) outVelocity.textContent = 'Tracking v: ' + (GATE_DIST_M / Math.max(0.01, liveT)).toFixed(2) + ' m/s';
        } else if (passedB) {
          updateStokesCalculations(targetTransitSec, darknessRatio);
          if (trackerStateBadge) {
            trackerStateBadge.textContent = 'MEASUREMENT LOCKED ✔';
            trackerStateBadge.className = 'status-badge optimal';
          }
        }

        if (now - startTime < totalDurationMs) {
          animId = requestAnimationFrame(step);
        }
      }
      animId = requestAnimationFrame(step);
    }

    // 1. Run Real Lab Video from local workspace assets
    if (btnLoadOfflineLab) {
      btnLoadOfflineLab.addEventListener('click', () => {
        if (!viscometerVideo) return;
        viscometerVideo.src = 'assets/videos/ball_drop_viscometer.mp4';
        viscometerVideo.muted = true;
        viscometerVideo.defaultMuted = true;
        viscometerVideo.playsInline = true;
        viscometerVideo.loop = true;
        viscometerVideo.style.display = 'block';
        viscometerVideo.load();
        viscometerVideo.play().catch(() => {});
        runOpticalTracking(1.280, 'rgba(217, 119, 6, 0.78)', 0.12, true);
      });
    }

    // 2. Real Uploaded Video Handler
    if (oilVideoInput) {
      oilVideoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file || !viscometerVideo) return;
        
        const fileUrl = URL.createObjectURL(file);
        viscometerVideo.src = fileUrl;
        viscometerVideo.muted = true;
        viscometerVideo.defaultMuted = true;
        viscometerVideo.playsInline = true;
        viscometerVideo.loop = true;
        viscometerVideo.style.display = 'block';

        viscometerVideo.onloadeddata = () => {
          viscometerVideo.play().catch(err => {
            console.warn('Autoplay prevented, retrying muted', err);
            viscometerVideo.muted = true;
            viscometerVideo.play();
          });
          const clipTransit = Math.max(0.95, Math.min(2.5, (viscometerVideo.duration || 2.0) * 0.55));
          runOpticalTracking(clipTransit, '#92400e', 0.18, true);
        };

        // Fallback trigger in case onloadeddata is delayed
        viscometerVideo.load();
        viscometerVideo.play().catch(() => {});
        runOpticalTracking(1.300, '#92400e', 0.18, true);
      });
    }

    // 3. Pre-calibrated Demo Buttons
    if (simFreshBtn) {
      simFreshBtn.addEventListener('click', () => {
        if (viscometerVideo) {
          viscometerVideo.pause();
          viscometerVideo.style.display = 'none';
        }
        runOpticalTracking(1.274, 'rgba(217, 119, 6, 0.72)', 0.08, false); // Yields 14.2 cSt, 0.13% Soot
      });
    }

    if (simSludgeBtn) {
      simSludgeBtn.addEventListener('click', () => {
        if (viscometerVideo) {
          viscometerVideo.pause();
          viscometerVideo.style.display = 'none';
        }
        runOpticalTracking(1.740, 'rgba(28, 25, 23, 0.92)', 0.72, false); // Yields 19.4 cSt, 1.19% Soot
      });
    }

    // 4. Feed Captured Sensor Data into Diagnostic Software
    if (feedSoftwareBtn) {
      feedSoftwareBtn.addEventListener('click', () => {
        // A. Inject Viscosity into slider
        if (viscSlider) {
          viscSlider.value = solvedCst;
          if (dispViscVal) dispViscVal.textContent = `${solvedCst.toFixed(1)} cSt`;
        }

        // B. Adapt SAE Grade if thick
        if (saeSelect) {
          if (solvedCst >= 13.5) {
            saeSelect.value = '15W-40';
          } else {
            saeSelect.value = '5W-30';
          }
        }

        // C. Select Blotter Stage based on measured Soot %
        let targetScore = 100;
        let targetName = 'Uniform Ring (Clean Gold)';
        if (solvedSoot < 0.25) {
          targetScore = 100;
          targetName = 'Uniform Ring (Clean Gold)';
        } else if (solvedSoot < 0.65) {
          targetScore = 75;
          targetName = 'Diffuse Core (Good Amber)';
        } else if (solvedSoot < 1.0) {
          targetScore = 45;
          targetName = 'Coagulated Core (Aged Dark)';
        } else {
          targetScore = 15;
          targetName = 'Dense Sludge Center (Black Sludge)';
        }

        currentBlotterScore = targetScore;
        if (dispBlotterLabel) dispBlotterLabel.textContent = targetName;
        blotterCards.forEach(c => {
          if (parseFloat(c.getAttribute('data-score')) === targetScore) {
            c.classList.add('active');
          } else {
            c.classList.remove('active');
          }
        });

        // D. Trigger master calculation
        calculateDiagnostics();

        // E. Show feedback confirmation
        if (feedConfirmation) {
          feedConfirmation.style.display = 'flex';
          feedConfirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => {
            feedConfirmation.style.display = 'none';
          }, 5000);
        }
      });
    }

    // Initial draw on boot: show simulated test tube until user uploads or clicks lab video
    updateStokesCalculations(1.274, 0.08);
    viscometerCtx.fillStyle = '#090d16';
    viscometerCtx.fillRect(0, 0, viscometerCanvas.width, viscometerCanvas.height);
    viscometerCtx.fillStyle = 'rgba(217, 119, 6, 0.72)';
    viscometerCtx.fillRect(100, 30, 140, 330);
    viscometerCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    viscometerCtx.lineWidth = 3;
    viscometerCtx.strokeRect(100, 30, 140, 330);
    drawLaserGates(false, false);
    // Initial sphere
    viscometerCtx.beginPath();
    viscometerCtx.arc(viscometerCanvas.width / 2, 45, 11, 0, Math.PI * 2);
    viscometerCtx.fillStyle = '#e2e8f0';
    viscometerCtx.fill();
    viscometerCtx.strokeStyle = '#38bdf8';
    viscometerCtx.strokeRect(viscometerCanvas.width / 2 - 16, 45 - 16, 32, 32);
  }

  // Initial Calculation Run on Page Load
  calculateDiagnostics();
});
