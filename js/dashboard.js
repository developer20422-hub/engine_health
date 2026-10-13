/**
 * LUBRISPEC - Fleet Dashboard & 30-Day Analytics Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Session check
  const currentUser = sessionStorage.getItem('lubri_user') || localStorage.getItem('lubri_user_remembered');
  const userDisplay = document.getElementById('logged-user-name');
  if (userDisplay && currentUser) {
    userDisplay.textContent = currentUser;
  }

  // Logout handler
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('lubri_user');
      localStorage.removeItem('lubri_user_remembered');
      window.location.href = 'login.html';
    });
  }

  // Default seed records for past 30 days
  const defaultRecords = [
    {
      id: "REC-1048",
      plate: "MH-12-AB-9821",
      type: "Commercial Heavy Truck",
      typeIcon: "fa-truck",
      date: "Oct 12, 2026",
      daysAgo: 1,
      grade: "15W-40",
      visc: 14.2,
      viscDev: "+0.0%",
      condition: "Clean Uniform Ring",
      soot: "0.12% wt",
      odometer: 18500,
      base: "Semi-Synthetic",
      duty: "Heavy Load Cycle",
      ohi: 88,
      rulKm: 6450,
      changeOdo: 24950,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Viscosity envelope is within factory target specs. No filter bypass pressure detected. Cleared for scheduled heavy duty operations."
    },
    {
      id: "REC-1047",
      plate: "DL-01-AX-4402",
      type: "SUV / 4x4",
      typeIcon: "fa-car-side",
      date: "Oct 11, 2026",
      daysAgo: 2,
      grade: "5W-30",
      visc: 9.8,
      viscDev: "-6.7%",
      condition: "Diffuse Core (Good)",
      soot: "0.85% wt",
      odometer: 12200,
      base: "Full Synthetic",
      duty: "Mixed Commute",
      ohi: 76,
      rulKm: 4800,
      changeOdo: 17000,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Lubricant hydrodynamic film is stable. Normal caramel coloration with detergent package actively dispersing soot."
    },
    {
      id: "REC-1046",
      plate: "KA-03-MG-1190",
      type: "Sedan / Hatchback",
      typeIcon: "fa-car",
      date: "Oct 09, 2026",
      daysAgo: 4,
      grade: "5W-30",
      visc: 7.1,
      viscDev: "-32.4%",
      condition: "Diffuse Core (Good)",
      soot: "1.10% wt",
      odometer: 9800,
      base: "Semi-Synthetic",
      duty: "City Stop-and-Go",
      ohi: 48,
      rulKm: 1100,
      changeOdo: 10900,
      status: "warning",
      statusText: "SERVICE DUE SOON",
      advisory: "Severe viscosity shear drop detected (-32%). Inspect for cylinder wall fuel dilution or leaking injector trim. Schedule service within 1,100 km."
    },
    {
      id: "REC-1045",
      plate: "MH-14-DE-3022",
      type: "Fleet Delivery Van",
      typeIcon: "fa-van-shuttle",
      date: "Oct 08, 2026",
      daysAgo: 5,
      grade: "10W-40",
      visc: 20.8,
      viscDev: "+43.4%",
      condition: "Dense Sludge Center",
      soot: "3.90% wt",
      odometer: 24100,
      base: "Conventional Mineral",
      duty: "Severe Stop-and-Go",
      ohi: 22,
      rulKm: 0,
      changeOdo: 24100,
      status: "critical",
      statusText: "CRITICAL / FLUSH NOW",
      advisory: "CRITICAL SLUDGE DANGER! High thermal polymerization has thickened the oil to tarry consistency. Immediate oil pan drain and flush required."
    },
    {
      id: "REC-1044",
      plate: "GJ-06-TX-7714",
      type: "Commercial Heavy Truck",
      typeIcon: "fa-truck",
      date: "Oct 06, 2026",
      daysAgo: 7,
      grade: "15W-40",
      visc: 14.6,
      viscDev: "+2.8%",
      condition: "Coagulated Core",
      soot: "2.35% wt",
      odometer: 22000,
      base: "Semi-Synthetic",
      duty: "Highway Heavy Load",
      ohi: 52,
      rulKm: 1350,
      changeOdo: 23350,
      status: "warning",
      statusText: "SERVICE DUE SOON",
      advisory: "Spot test reveals coagulated soot ring. Dispersant additives nearing threshold capacity. Replace oil filter and replenish lubricant soon."
    },
    {
      id: "REC-1043",
      plate: "TS-07-EK-8820",
      type: "Sports / Performance Coupe",
      typeIcon: "fa-car-side",
      date: "Oct 04, 2026",
      daysAgo: 9,
      grade: "5W-40",
      visc: 14.0,
      viscDev: "-1.4%",
      condition: "Clean Uniform Ring",
      soot: "0.15% wt",
      odometer: 5400,
      base: "Group IV PAO / Ester",
      duty: "Track / High RPM",
      ohi: 92,
      rulKm: 7200,
      changeOdo: 12600,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "High performance ester fluid in pristine condition. Zero thermal shear breakdown detected on crankshaft main bearings."
    },
    {
      id: "REC-1042",
      plate: "MH-02-CP-9901",
      type: "SUV / 4x4",
      typeIcon: "fa-car-side",
      date: "Oct 02, 2026",
      daysAgo: 11,
      grade: "0W-20",
      visc: 8.1,
      viscDev: "-1.2%",
      condition: "Clean Uniform Ring",
      soot: "0.10% wt",
      odometer: 4200,
      base: "Full Synthetic",
      duty: "Highway Cruise",
      ohi: 90,
      rulKm: 6900,
      changeOdo: 11100,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Low-viscosity fuel economy oil operating inside prime tolerance envelope. ZDDP anti-wear film fully intact."
    },
    {
      id: "REC-1041",
      plate: "HR-26-BR-5531",
      type: "Commercial Heavy Truck",
      typeIcon: "fa-truck",
      date: "Sep 29, 2026",
      daysAgo: 14,
      grade: "15W-40",
      visc: 21.9,
      viscDev: "+46.0%",
      condition: "Dense Sludge Center",
      soot: "4.15% wt",
      odometer: 31500,
      base: "Conventional Mineral",
      duty: "Severe Heavy Load",
      ohi: 18,
      rulKm: 0,
      changeOdo: 31500,
      status: "critical",
      statusText: "CRITICAL / FLUSH NOW",
      advisory: "CRITICAL ALERT: Crankcase sludge accumulation detected. High risk of bearing starvation and oil pump pickup screen blockage."
    },
    {
      id: "REC-1040",
      plate: "WB-02-AK-6612",
      type: "Sedan / Hatchback",
      typeIcon: "fa-car",
      date: "Sep 27, 2026",
      daysAgo: 16,
      grade: "5W-30",
      visc: 10.3,
      viscDev: "-1.9%",
      condition: "Diffuse Core (Good)",
      soot: "0.80% wt",
      odometer: 11400,
      base: "Full Synthetic",
      duty: "Mixed Commute",
      ohi: 78,
      rulKm: 5100,
      changeOdo: 16500,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Normal operational wear. Detergents are active and soot dispersion is within design limits. Continue regular operation."
    },
    {
      id: "REC-1039",
      plate: "TN-09-BN-2244",
      type: "Fleet Delivery Van",
      typeIcon: "fa-van-shuttle",
      date: "Sep 24, 2026",
      daysAgo: 19,
      grade: "5W-30",
      visc: 6.9,
      viscDev: "-34.3%",
      condition: "Diffuse Core (Good)",
      soot: "1.25% wt",
      odometer: 15200,
      base: "Semi-Synthetic",
      duty: "City Delivery",
      ohi: 46,
      rulKm: 950,
      changeOdo: 16150,
      status: "warning",
      statusText: "SERVICE DUE SOON",
      advisory: "Viscosity has dropped below recommended SAE envelope. Oil shear thinning increases boundary metal friction. Schedule change promptly."
    },
    {
      id: "REC-1038",
      plate: "KL-07-CD-3388",
      type: "SUV / 4x4",
      typeIcon: "fa-car-side",
      date: "Sep 21, 2026",
      daysAgo: 22,
      grade: "5W-40",
      visc: 14.3,
      viscDev: "+0.7%",
      condition: "Clean Uniform Ring",
      soot: "0.20% wt",
      odometer: 8900,
      base: "Full Synthetic",
      duty: "Highway Cruise",
      ohi: 86,
      rulKm: 6100,
      changeOdo: 15000,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Lubricant health is strong. Stable viscosity consistency and minimal soot saturation."
    },
    {
      id: "REC-1037",
      plate: "MH-12-QE-1008",
      type: "Motorcycle",
      typeIcon: "fa-motorcycle",
      date: "Sep 18, 2026",
      daysAgo: 25,
      grade: "10W-40",
      visc: 14.4,
      viscDev: "-0.7%",
      condition: "Diffuse Core (Good)",
      soot: "0.90% wt",
      odometer: 6100,
      base: "Semi-Synthetic",
      duty: "Mixed Urban",
      ohi: 72,
      rulKm: 3800,
      changeOdo: 9900,
      status: "optimal",
      statusText: "OPTIMAL CONDITION",
      advisory: "Wet clutch shear tolerance maintained. Nominal viscosity stability across high temperature cycles."
    },
    {
      id: "REC-1036",
      plate: "RJ-14-GH-4920",
      type: "Commercial Heavy Truck",
      typeIcon: "fa-truck",
      date: "Sep 15, 2026",
      daysAgo: 28,
      grade: "15W-40",
      visc: 22.5,
      viscDev: "+50.0%",
      condition: "Dense Sludge Center",
      soot: "4.30% wt",
      odometer: 29800,
      base: "Conventional Mineral",
      duty: "Severe Heavy Load",
      ohi: 16,
      rulKm: 0,
      changeOdo: 29800,
      status: "critical",
      statusText: "CRITICAL / FLUSH NOW",
      advisory: "Severe soot agglomeration. Additives exhausted. Full crankcase flush and new filter replacement mandatory before return to service."
    },
    {
      id: "REC-1035",
      plate: "UP-32-FA-7703",
      type: "Sedan / Hatchback",
      typeIcon: "fa-car",
      date: "Sep 13, 2026",
      daysAgo: 30,
      grade: "5W-30",
      visc: 9.7,
      viscDev: "-7.6%",
      condition: "Coagulated Core",
      soot: "2.10% wt",
      odometer: 13800,
      base: "Semi-Synthetic",
      duty: "Mixed Commute",
      ohi: 54,
      rulKm: 1400,
      changeOdo: 15200,
      status: "warning",
      statusText: "SERVICE DUE SOON",
      advisory: "Approaching end of stable life envelope. Filter dispersancy nearing saturation. Plan service at next fuel stop."
    }
  ];

  // Retrieve or initialize records in localStorage
  function getStoredRecords() {
    const raw = localStorage.getItem('lubri_records');
    if (!raw) {
      localStorage.setItem('lubri_records', JSON.stringify(defaultRecords));
      return defaultRecords;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn("Error parsing stored records, falling back to seed data", e);
    }
    return defaultRecords;
  }

  const allRecords = getStoredRecords();

  // State
  let currentStatusFilter = 'all';
  let currentTypeFilter = 'all';
  let searchQuery = '';
  let activeHoveredRecord = allRecords[0];

  // DOM Elements
  const tbody = document.getElementById('records-tbody');
  const noRecordsMsg = document.getElementById('no-records-msg');
  const searchInput = document.getElementById('record-search');
  const typeFilterSelect = document.getElementById('type-filter');
  const filterPills = document.querySelectorAll('.filter-pill');

  // KPI count displays
  const countAll = document.getElementById('count-all');
  const countOpt = document.getElementById('count-opt');
  const countWarn = document.getElementById('count-warn');
  const countCrit = document.getElementById('count-crit');

  // Inspector card elements
  const inspectPlate = document.getElementById('inspect-plate');
  const inspectType = document.getElementById('inspect-type');
  const inspectTypeIcon = document.getElementById('inspect-type-icon');
  const inspectTypeText = document.getElementById('inspect-type-text');
  const inspectStatusBadge = document.getElementById('inspect-status-badge');
  const inspectOhi = document.getElementById('inspect-ohi');
  const inspectRul = document.getElementById('inspect-rul');
  const inspectVisc = document.getElementById('inspect-visc');
  const inspectViscDev = document.getElementById('inspect-visc-dev');
  const inspectCondition = document.getElementById('inspect-condition');
  const inspectSoot = document.getElementById('inspect-soot');
  const inspectOdometer = document.getElementById('inspect-odometer');
  const inspectChangeOdo = document.getElementById('inspect-change-odo');
  const inspectBase = document.getElementById('inspect-base');
  const inspectDuty = document.getElementById('inspect-duty');
  const inspectAdvisory = document.getElementById('inspect-advisory');
  const btnInspectOpenCalc = document.getElementById('btn-inspect-open-calc');
  const btnInspectPrint = document.getElementById('btn-inspect-print');

  // Floating hover inspector elements
  const floatingCard = document.getElementById('floating-hover-card');
  const flPlate = document.getElementById('fl-plate');
  const flType = document.getElementById('fl-type');
  const flBadge = document.getElementById('fl-badge');
  const flHealth = document.getElementById('fl-health');
  const flRul = document.getElementById('fl-rul');
  const flVisc = document.getElementById('fl-visc');
  const flSoot = document.getElementById('fl-soot');
  const flAdvisory = document.getElementById('fl-advisory');
  const inspectorPanel = document.getElementById('hover-inspector-panel');
  const inspectorStatusMode = document.getElementById('inspector-status-mode');
  let pinnedRecord = null;

  // Update Summary KPI Counts
  function updateCounts() {
    const total = allRecords.length;
    const optimal = allRecords.filter(r => r.status === 'optimal').length;
    const warning = allRecords.filter(r => r.status === 'warning').length;
    const critical = allRecords.filter(r => r.status === 'critical').length;

    if (countAll) countAll.textContent = total;
    if (countOpt) countOpt.textContent = optimal;
    if (countWarn) countWarn.textContent = warning;
    if (countCrit) countCrit.textContent = critical;

    // Top Header KPIs
    const kpiTotal = document.getElementById('kpi-total-tests');
    const kpiOpt = document.getElementById('kpi-optimal-tests');
    const kpiWarn = document.getElementById('kpi-warning-tests');
    const kpiCrit = document.getElementById('kpi-critical-tests');

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiOpt) kpiOpt.textContent = optimal;
    if (kpiWarn) kpiWarn.textContent = warning;
    if (kpiCrit) kpiCrit.textContent = critical;
  }

  // Populate Inspector Card with specific record details
  function displayRecordInInspector(record) {
    if (!record) return;
    activeHoveredRecord = record;

    if (inspectPlate) inspectPlate.textContent = record.plate;
    if (inspectTypeText) inspectTypeText.textContent = record.type;
    if (inspectTypeIcon) {
      inspectTypeIcon.className = `fa-solid ${record.typeIcon || 'fa-car'}`;
    }

    if (inspectOhi) inspectOhi.textContent = `${record.ohi}%`;
    if (inspectRul) {
      inspectRul.textContent = record.rulKm > 0 ? `+${record.rulKm.toLocaleString()} km` : "IMMEDIATE FLUSH";
      inspectRul.style.color = record.status === 'critical' ? 'var(--status-critical)' : 'var(--text-primary)';
    }

    if (inspectStatusBadge) {
      inspectStatusBadge.className = `status-badge ${record.status}`;
      inspectStatusBadge.textContent = record.statusText || record.status.toUpperCase();
    }

    if (inspectVisc) inspectVisc.textContent = `${record.visc} cSt`;
    if (inspectViscDev) inspectViscDev.textContent = `${record.viscDev} (${record.grade})`;
    if (inspectCondition) inspectCondition.textContent = record.condition;
    if (inspectSoot) inspectSoot.textContent = `Soot: ${record.soot}`;
    if (inspectOdometer) inspectOdometer.textContent = `${record.odometer.toLocaleString()} km`;
    if (inspectChangeOdo) inspectChangeOdo.textContent = `Change at: ${record.changeOdo.toLocaleString()} km`;
    if (inspectBase) inspectBase.textContent = record.base;
    if (inspectDuty) inspectDuty.textContent = record.duty;
    if (inspectAdvisory) inspectAdvisory.textContent = record.advisory;
  }

  // Position & Display Floating Hover Inspector Popover
  function showFloatingInspector(record, e) {
    if (!floatingCard || !record) return;

    if (flPlate) flPlate.textContent = record.plate;
    if (flType) {
      flType.innerHTML = `<i class="fa-solid ${record.typeIcon || 'fa-car'}"></i> ${record.type}`;
    }
    if (flBadge) {
      flBadge.className = `status-badge ${record.status}`;
      flBadge.textContent = record.status === 'optimal' ? 'OPTIMAL' : (record.status === 'warning' ? 'DUE SOON' : 'CRITICAL');
    }
    if (flHealth) flHealth.textContent = `${record.ohi}%`;
    if (flRul) {
      flRul.textContent = record.rulKm > 0 ? `+${record.rulKm.toLocaleString()} km` : 'FLUSH NOW';
      flRul.style.color = record.status === 'critical' ? 'var(--status-critical)' : '#ffffff';
    }
    if (flVisc) flVisc.textContent = `${record.visc} cSt (${record.viscDev})`;
    if (flSoot) flSoot.textContent = `Soot: ${record.soot}`;
    if (flAdvisory) flAdvisory.textContent = record.advisory;

    positionFloatingInspector(e);

    floatingCard.style.display = 'block';
    requestAnimationFrame(() => floatingCard.classList.add('visible'));

    // Highlight sidebar live state
    if (inspectorPanel) inspectorPanel.classList.add('live-hover-active');
    if (inspectorStatusMode) {
      inspectorStatusMode.className = 'live-inspecting-tag';
      inspectorStatusMode.innerHTML = `<i class="fa-solid fa-bolt"></i> INSPECTING: ${record.plate}`;
    }
  }

  function positionFloatingInspector(e) {
    if (!floatingCard) return;
    const cardWidth = 330;
    const cardHeight = floatingCard.offsetHeight || 260;

    let left = e.clientX + 20;
    let top = e.clientY - (cardHeight / 2);

    // If overflowing right viewport, flip to left of cursor
    if (left + cardWidth > window.innerWidth - 20) {
      left = e.clientX - cardWidth - 20;
    }
    if (left < 15) left = 15;

    // Vertical boundary checks
    if (top < 75) top = 75;
    if (top + cardHeight > window.innerHeight - 20) {
      top = window.innerHeight - cardHeight - 20;
    }

    floatingCard.style.left = `${left}px`;
    floatingCard.style.top = `${top}px`;
  }

  function hideFloatingInspector() {
    if (!floatingCard) return;
    floatingCard.classList.remove('visible');
    setTimeout(() => {
      if (!floatingCard.classList.contains('visible')) {
        floatingCard.style.display = 'none';
      }
    }, 160);

    if (inspectorPanel) inspectorPanel.classList.remove('live-hover-active');
    if (inspectorStatusMode) {
      if (pinnedRecord) {
        inspectorStatusMode.className = 'live-inspecting-tag pinned';
        inspectorStatusMode.innerHTML = `<i class="fa-solid fa-thumbtack"></i> PINNED: ${pinnedRecord.plate}`;
      } else {
        inspectorStatusMode.className = 'live-inspecting-tag';
        inspectorStatusMode.innerHTML = `<i class="fa-solid fa-wave-square"></i> HOVER TO INSPECT`;
      }
    }
  }

  // Render Table Rows with Hover Handlers
  function renderRecordsTable() {
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = allRecords.filter(r => {
      // Status filter
      if (currentStatusFilter !== 'all' && r.status !== currentStatusFilter) return false;
      // Type filter
      if (currentTypeFilter !== 'all' && r.type !== currentTypeFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchPlate = r.plate.toLowerCase().includes(q);
        const matchType = r.type.toLowerCase().includes(q);
        const matchGrade = r.grade.toLowerCase().includes(q);
        if (!matchPlate && !matchType && !matchGrade) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      if (noRecordsMsg) noRecordsMsg.style.display = 'block';
      return;
    } else {
      if (noRecordsMsg) noRecordsMsg.style.display = 'none';
    }

    filtered.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'record-table-row';
      tr.setAttribute('data-id', r.id);

      // Status badge theme
      let badgeClass = 'optimal';
      if (r.status === 'warning') badgeClass = 'warning';
      else if (r.status === 'critical') badgeClass = 'critical';

      // Type icon
      let typeIconClass = r.typeIcon || 'fa-car';

      tr.innerHTML = `
        <td>
          <div class="vehicle-plate-pill">
            <span class="plate-flag"><i class="fa-solid fa-car"></i></span>
            <span class="plate-code">${r.plate}</span>
          </div>
        </td>
        <td>
          <span style="font-family: var(--font-heading); font-size: 0.85rem; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 0.4rem;">
            <i class="fa-solid ${typeIconClass}" style="color: var(--amber-glow); font-size: 0.8rem;"></i> ${r.type}
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${r.date}</span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700; color: #fff;">${r.grade}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">${r.visc} cSt</span>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="mini-progress-ring-bg">
              <div class="mini-progress-fill fill-${r.status}" style="width: ${r.ohi}%;"></div>
            </div>
            <strong style="font-family: var(--font-number); font-size: 0.95rem; color: #fff; font-feature-settings: 'tnum' 1;">${r.ohi}%</strong>
          </div>
        </td>
        <td>
          <span style="font-family: var(--font-number); font-size: 0.95rem; font-weight: 700; color: ${r.status === 'critical' ? 'var(--status-critical)' : '#fff'}; font-feature-settings: 'tnum' 1;">
            ${r.rulKm > 0 ? `+${r.rulKm.toLocaleString()} km` : 'FLUSH NOW'}
          </span>
        </td>
        <td>
          <span class="status-badge ${badgeClass}" style="font-size: 0.72rem; padding: 0.25rem 0.65rem;">
            ${r.status === 'optimal' ? 'OPTIMAL' : (r.status === 'warning' ? 'DUE SOON' : 'CRITICAL')}
          </span>
        </td>
        <td style="text-align: center;">
          <div class="hover-inspect-badge" title="Hover to inspect full breakdown">
            <i class="fa-solid fa-microscope"></i>
            <span>Inspect</span>
          </div>
        </td>
      `;

      // HOVER INTERACTION: Reveal details in BOTH the Floating Popover AND Sidebar Inspector
      tr.addEventListener('mouseenter', (e) => {
        document.querySelectorAll('.record-table-row').forEach(row => row.classList.remove('active-hover-row'));
        tr.classList.add('active-hover-row');
        displayRecordInInspector(r);
        showFloatingInspector(r, e);
      });

      tr.addEventListener('mousemove', (e) => {
        positionFloatingInspector(e);
      });

      tr.addEventListener('mouseleave', () => {
        hideFloatingInspector();
        if (pinnedRecord) {
          displayRecordInInspector(pinnedRecord);
        }
      });

      // Click PINs/locks the record into the permanent side inspector
      tr.addEventListener('click', () => {
        pinnedRecord = r;
        document.querySelectorAll('.record-table-row').forEach(row => row.classList.remove('active-hover-row'));
        tr.classList.add('active-hover-row');
        displayRecordInInspector(r);
        if (inspectorStatusMode) {
          inspectorStatusMode.className = 'live-inspecting-tag pinned';
          inspectorStatusMode.innerHTML = `<i class="fa-solid fa-thumbtack"></i> PINNED: ${r.plate}`;
        }
      });

      // Highlight first item initially
      if (idx === 0) {
        pinnedRecord = r;
        tr.classList.add('active-hover-row');
        displayRecordInInspector(r);
        if (inspectorStatusMode) {
          inspectorStatusMode.className = 'live-inspecting-tag pinned';
          inspectorStatusMode.innerHTML = `<i class="fa-solid fa-thumbtack"></i> PINNED: ${r.plate}`;
        }
      }

      tbody.appendChild(tr);
    });
  }

  // Event Listeners for Filters & Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderRecordsTable();
    });
  }

  if (typeFilterSelect) {
    typeFilterSelect.addEventListener('change', (e) => {
      currentTypeFilter = e.target.value;
      renderRecordsTable();
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentStatusFilter = pill.getAttribute('data-filter') || 'all';
      renderRecordsTable();
    });
  });

  // Action: Open in Diagnostic Bench from Inspector
  if (btnInspectOpenCalc) {
    btnInspectOpenCalc.addEventListener('click', () => {
      if (!activeHoveredRecord) return;
      // Store selected vehicle state so calculator can prefill
      sessionStorage.setItem('prefill_vehicle_plate', activeHoveredRecord.plate);
      sessionStorage.setItem('prefill_vehicle_type', activeHoveredRecord.type);
      sessionStorage.setItem('prefill_visc', activeHoveredRecord.visc.toString());
      sessionStorage.setItem('prefill_grade', activeHoveredRecord.grade);
      sessionStorage.setItem('prefill_odometer', activeHoveredRecord.odometer.toString());
      window.location.href = 'calculator.html';
    });
  }

  if (btnInspectPrint) {
    btnInspectPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Export 30-Day CSV
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Record ID,Plate,Vehicle Type,Date,Oil Grade,Viscosity (cSt),OHI Health %,RUL (km),Odometer,Status,Recommendation\n";
      allRecords.forEach(r => {
        const row = [
          r.id,
          r.plate,
          `"${r.type}"`,
          r.date,
          r.grade,
          r.visc,
          r.ohi,
          r.rulKm,
          r.odometer,
          r.status,
          `"${r.advisory.replace(/"/g, '""')}"`
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `lubrispec_fleet_records_30days_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Render 30-Day Inspection Generation Activity Chart
  function renderGenerationChart() {
    const ctx = document.getElementById('generationChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Generate 30 daily labels: Day -30 to Today
    const labels = [];
    const counts = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const labelStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(labelStr);

      // Realistic pseudo-variation in daily test inspections (avg 4-8 tests/day)
      const baseCount = 4 + Math.floor(Math.sin(i * 0.45) * 3 + (i % 3));
      counts.push(Math.max(2, baseCount));
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Oil Inspections Generated',
          data: counts,
          borderColor: '#ff8800',
          backgroundColor: 'rgba(255, 136, 0, 0.12)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#ffa600',
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Inspections: ${context.parsed.y} vehicles`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#71717a',
              font: { family: 'Space Grotesk', size: 10 },
              maxTicksLimit: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#71717a',
              font: { family: 'JetBrains Mono', size: 10 },
              stepSize: 2
            }
          }
        }
      }
    });
  }

  // Render Fleet Health Condition Distribution Doughnut Chart
  function renderDistributionChart() {
    const ctx = document.getElementById('distributionChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const optimal = allRecords.filter(r => r.status === 'optimal').length;
    const warning = allRecords.filter(r => r.status === 'warning').length;
    const critical = allRecords.filter(r => r.status === 'critical').length;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Optimal Health', 'Service Due', 'Critical Sludge'],
        datasets: [{
          data: [optimal, warning, critical],
          backgroundColor: [
            '#10b981',
            '#ff8800',
            '#ef4444'
          ],
          borderColor: '#131217',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#a1a1aa',
              font: { family: 'Space Grotesk', size: 11 },
              boxWidth: 12,
              padding: 15
            }
          }
        }
      }
    });
  }

  // Initial Boot
  updateCounts();
  renderRecordsTable();
  renderGenerationChart();
  renderDistributionChart();
});
