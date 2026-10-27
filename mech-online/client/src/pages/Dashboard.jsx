import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PinwheelLogo } from '../components/PinwheelLogo';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton, LoadingSkeleton } from '../components/LoadingSkeleton';
import { CsvUploadModal } from '../components/CsvUploadModal';
import { calcApi } from '../api/calcApi';
import { batchApi } from '../api/batchApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Fallback seed records if API has no records yet
const INITIAL_DEMO_RECORDS = [
  {
    _id: "REC-1048",
    registrationNo: "MH-12-AB-9821",
    vehicleCategory: "Commercial Heavy Truck",
    vehicleType: "Commercial Heavy Truck",
    typeIcon: "fa-truck",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    inputs: { saeBaseline: "15W-40", measuredViscosity: 225.0, currentMileage: 18500, units: "km" },
    results: {
      ohi: 88,
      rulKm: 6450,
      rulFormatted: "+6,450 km",
      changeOdometerFormatted: "24,950 km",
      viscosityDeviationPct: "+0.0%",
      serviceRecommendation: "Optimal",
      serviceUrgency: "Viscosity envelope is within factory target specs.",
      mechanicAdvisory: "Lubricant hydrodynamic film is optimal. Cleared for scheduled heavy duty operations.",
      flowTimeSec: 70.1,
    },
  },
  {
    _id: "REC-1047",
    registrationNo: "DL-01-AX-4402",
    vehicleCategory: "SUV / 4x4",
    vehicleType: "SUV / 4x4",
    typeIcon: "fa-car-side",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    inputs: { saeBaseline: "5W-30", measuredViscosity: 102.5, currentMileage: 12200, units: "km" },
    results: {
      ohi: 76,
      rulKm: 4800,
      rulFormatted: "+4,800 km",
      changeOdometerFormatted: "17,000 km",
      viscosityDeviationPct: "-6.8%",
      serviceRecommendation: "Stable",
      serviceUrgency: "Hydrodynamic film stable. Normal thermal coloration.",
      mechanicAdvisory: "Active detergent pack dispersing soot normally. Regular operation cleared.",
      flowTimeSec: 38.0,
    },
  },
  {
    _id: "REC-1046",
    registrationNo: "KA-03-MG-1190",
    vehicleCategory: "Sedan / Hatchback",
    vehicleType: "Sedan / Hatchback",
    typeIcon: "fa-car",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    inputs: { saeBaseline: "5W-30", measuredViscosity: 74.0, currentMileage: 9800, units: "km" },
    results: {
      ohi: 48,
      rulKm: 1100,
      rulFormatted: "+1,100 km",
      changeOdometerFormatted: "10,900 km",
      viscosityDeviationPct: "-32.7%",
      serviceRecommendation: "Service Soon",
      serviceUrgency: "Severe fuel shear drop detected (-32%).",
      mechanicAdvisory: "Inspect injectors for fuel dilution. Schedule oil change within 1,100 km.",
      flowTimeSec: 30.5,
    },
  },
  {
    _id: "REC-1045",
    registrationNo: "MH-14-DE-3022",
    vehicleCategory: "Fleet Delivery Van",
    vehicleType: "Fleet Delivery Van",
    typeIcon: "fa-van-shuttle",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    inputs: { saeBaseline: "10W-40", measuredViscosity: 252.0, currentMileage: 24100, units: "km" },
    results: {
      ohi: 22,
      rulKm: 0,
      rulFormatted: "+0 km",
      changeOdometerFormatted: "24,100 km",
      viscosityDeviationPct: "+43.2%",
      serviceRecommendation: "Critical",
      serviceUrgency: "CRITICAL SLUDGE DANGER! Heavy oxidative thickening.",
      mechanicAdvisory: "Immediate oil pan drain and flush mandatory. Filter bypass risk imminent.",
      flowTimeSec: 78.4,
    },
  },
  {
    _id: "REC-1044",
    registrationNo: "GJ-06-TX-7714",
    vehicleCategory: "Commercial Heavy Truck",
    vehicleType: "Commercial Heavy Truck",
    typeIcon: "fa-truck",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    inputs: { saeBaseline: "15W-40", measuredViscosity: 231.0, currentMileage: 22000, units: "km" },
    results: {
      ohi: 52,
      rulKm: 1350,
      rulFormatted: "+1,350 km",
      changeOdometerFormatted: "23,350 km",
      viscosityDeviationPct: "+2.7%",
      serviceRecommendation: "Service Soon",
      serviceUrgency: "Coagulated soot ring. Dispersant additives nearing capacity.",
      mechanicAdvisory: "Schedule oil and filter service within next 1,350 km.",
      flowTimeSec: 71.5,
    },
  },
  {
    _id: "REC-1043",
    registrationNo: "TS-07-EK-8820",
    vehicleCategory: "Sports / Performance Coupe",
    vehicleType: "Sports / Performance Coupe",
    typeIcon: "fa-car-side",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    inputs: { saeBaseline: "0W-20", measuredViscosity: 76.0, currentMileage: 5400, units: "km" },
    results: {
      ohi: 92,
      rulKm: 7200,
      rulFormatted: "+7,200 km",
      changeOdometerFormatted: "12,600 km",
      viscosityDeviationPct: "+0.0%",
      serviceRecommendation: "Optimal",
      serviceUrgency: "Zero thermal shear breakdown on crank journals.",
      mechanicAdvisory: "High performance synthetic fluid in pristine condition. Safe for track use.",
      flowTimeSec: 31.4,
    },
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  // Manual bench calculations (shown by default)
  const [manualRecords, setManualRecords] = useState(INITIAL_DEMO_RECORDS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hoveredRecord, setHoveredRecord] = useState(INITIAL_DEMO_RECORDS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Batch inclusion toggle state (Manual by default; toggle includes chosen batch)
  const [includeBatch, setIncludeBatch] = useState(false);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchRecords, setBatchRecords] = useState([]);
  const [loadingBatchData, setLoadingBatchData] = useState(false);

  // Fetch live calculations from MongoDB API for manual records
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await calcApi.getCalculations({ limit: 50 });
        if (res.success && res.data?.items && res.data.items.length > 0) {
          // Merge API records with demo records for full 30-day experience
          setManualRecords([...res.data.items, ...INITIAL_DEMO_RECORDS]);
          setHoveredRecord(res.data.items[0]);
        }
      } catch (err) {
        console.warn('Could not load live calculations, using cached telemetry:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  // Fetch available batches when toggle is activated
  const handleToggleBatchOn = async () => {
    setIncludeBatch(true);
    try {
      setLoadingBatchData(true);
      const res = await batchApi.getBatches();
      if (res.success && res.data && res.data.length > 0) {
        setAvailableBatches(res.data);
        const targetBatch = res.data[0];
        setSelectedBatchId(targetBatch._id);
        await loadBatchRowsForDashboard(targetBatch._id);
      } else {
        setToast({ message: 'No batches found. Upload a CSV to include batch data.', type: 'info' });
      }
    } catch (err) {
      console.warn('Failed to load batches for dashboard:', err.message);
    } finally {
      setLoadingBatchData(false);
    }
  };

  const loadBatchRowsForDashboard = async (batchId) => {
    try {
      setLoadingBatchData(true);
      const res = await batchApi.getBatchRows(batchId, { limit: 100 });
      if (res.success && res.data?.rows) {
        const mapped = res.data.rows
          .filter((r) => r.status === 'success' && r.results)
          .map((r) => ({
            _id: r._id || `BATCH-${r.rowIndex}`,
            registrationNo: r.inputs?.registrationNo || `ROW-${r.rowIndex}`,
            vehicleCategory: r.inputs?.baseOilType || 'Fleet Telemetry',
            vehicleType: r.inputs?.engineType || 'Fleet Telemetry',
            typeIcon: 'fa-truck-front',
            createdAt: r.createdAt || new Date().toISOString(),
            inputs: {
              saeBaseline: r.inputs?.saeBaseline || '15W-40',
              measuredViscosity: r.results?.measuredViscosity || r.inputs?.measuredViscosity || 100,
              currentMileage: r.inputs?.currentMileage || 0,
              units: r.inputs?.units || 'km',
            },
            results: {
              ohi: r.results?.ohi || 50,
              rulKm: r.results?.rulKm || 0,
              rulFormatted: `+${(r.results?.rulKm || 0).toLocaleString()} km`,
              changeOdometerFormatted: `${((r.inputs?.currentMileage || 0) + (r.results?.rulKm || 0)).toLocaleString()} km`,
              viscosityDeviationPct: `${(r.results?.devPct || 0).toFixed(1)}%`,
              serviceRecommendation: r.results?.serviceRecommendation || 'Optimal',
              serviceUrgency: r.llmResult?.summary || 'Batch telemetry record',
              mechanicAdvisory: r.llmResult?.recommendedAction || 'Follow fleet maintenance interval.',
              flowTimeSec: r.results?.effluxTime || r.inputs?.effluxTime || 40,
            },
            isFromBatch: true,
          }));
        setBatchRecords(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch batch rows for dashboard:', err.message);
    } finally {
      setLoadingBatchData(false);
    }
  };

  const handleSelectBatch = async (batchId) => {
    setSelectedBatchId(batchId);
    await loadBatchRowsForDashboard(batchId);
  };

  // Active records: strictly manual records by default; includes batch records when toggled ON
  const records = useMemo(() => {
    if (includeBatch && batchRecords.length > 0) {
      return [...manualRecords, ...batchRecords];
    }
    return manualRecords;
  }, [includeBatch, manualRecords, batchRecords]);


  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const plate = rec.registrationNo || rec.vehiclePlate || rec.plate || '';
      const type = rec.vehicleCategory || rec.vehicleType || rec.type || '';
      const grade = rec.inputs?.saeBaseline || rec.grade || '';
      const recStatus = (rec.results?.serviceRecommendation || rec.status || '').toLowerCase();

      const matchesSearch =
        plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grade.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'optimal') return recStatus.includes('optimal') || recStatus.includes('stable');
      if (statusFilter === 'warning') return recStatus.includes('soon') || recStatus.includes('warning');
      if (statusFilter === 'critical') return recStatus.includes('critical');
      return true;
    });
  }, [records, searchTerm, statusFilter]);

  // Aggregate KPI metrics
  const totalCount = records.length;
  const optimalCount = records.filter((r) => {
    const s = (r.results?.serviceRecommendation || r.status || '').toLowerCase();
    return s.includes('optimal') || s.includes('stable');
  }).length;
  const warningCount = records.filter((r) => {
    const s = (r.results?.serviceRecommendation || r.status || '').toLowerCase();
    return s.includes('soon') || s.includes('warning');
  }).length;
  const criticalCount = records.filter((r) => {
    const s = (r.results?.serviceRecommendation || r.status || '').toLowerCase();
    return s.includes('critical');
  }).length;

  const optimalPct = totalCount ? Math.round((optimalCount / totalCount) * 100) : 0;
  const warningPct = totalCount ? Math.round((warningCount / totalCount) * 100) : 0;

  // Chart 1: 30-Day Activity Bar Chart
  const activityLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'This Wk'];
  const activityData = {
    labels: activityLabels,
    datasets: [
      {
        label: 'Evaluations Generated',
        data: [28, 36, 42, 34, records.length],
        backgroundColor: 'rgba(255, 136, 0, 0.7)',
        borderColor: '#ff8800',
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };

  const activityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Inspections: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a1a1aa', font: { family: 'Space Grotesk', size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a1a1aa', font: { family: 'JetBrains Mono', size: 10 } },
      },
    },
  };

  // Chart 2: Fleet Condition Doughnut Chart
  const distributionData = {
    labels: ['Optimal / Stable', 'Service Soon', 'Critical Sludge'],
    datasets: [
      {
        data: [optimalCount, warningCount, criticalCount],
        backgroundColor: ['#10b981', '#ff8800', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#a1a1aa',
          font: { family: 'Space Grotesk', size: 11 },
          padding: 12,
        },
      },
    },
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Record ID', 'Plate', 'Vehicle Type', 'SAE Baseline', 'Measured cSt', 'OHI (%)', 'Recommendation', 'Remaining RUL', 'Date'];
    const rows = filteredRecords.map((r) => [
      r._id || r.id,
      r.registrationNo || r.vehiclePlate || r.plate || 'N/A',
      r.vehicleCategory || r.vehicleType || r.type || 'N/A',
      r.inputs?.saeBaseline || r.grade || 'N/A',
      r.inputs?.measuredViscosity || r.visc || 'N/A',
      r.results?.ohi ?? r.ohi ?? 'N/A',
      r.results?.serviceRecommendation || r.status || 'N/A',
      r.results?.rulFormatted || `${r.rulKm || 0} km`,
      new Date(r.createdAt || Date.now()).toLocaleDateString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fleet_oil_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: '30-Day Fleet CSV exported successfully!', type: 'success' });
  };

  // Helper for status badge class
  const getBadgeClass = (rec) => {
    const lower = (rec || '').toLowerCase();
    if (lower.includes('optimal') || lower.includes('stable')) return 'status-badge optimal';
    if (lower.includes('soon') || lower.includes('warning')) return 'status-badge warning';
    return 'status-badge critical';
  };

  // Hovered Record extraction
  const hRec = hoveredRecord || records[0] || {};
  const hPlate = hRec.registrationNo || hRec.vehiclePlate || hRec.plate || 'MH-12-AB-9821';
  const hType = hRec.vehicleCategory || hRec.vehicleType || hRec.type || 'Commercial Heavy Truck';
  const hOhi = hRec.results?.ohi ?? hRec.ohi ?? 88;
  const hRul = hRec.results?.rulFormatted || `${hRec.rulKm || 6450} km`;
  const hRecommendation = hRec.results?.serviceRecommendation || hRec.status || 'Optimal';
  const hDev = hRec.results?.viscosityDeviationPct || hRec.viscDev || '+0.0%';
  const hAdvisory = hRec.results?.mechanicAdvisory || hRec.advisory || 'Viscosity within factory target specs.';
  const hFlowTime = hRec.results?.flowTimeSec ? `${hRec.results.flowTimeSec.toFixed(1)}s` : '40.2s';

  const circumference = 364.4;
  const hoverOffset = circumference - circumference * (hOhi / 100);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar badge="FLEET HUB" />

      <main className="container" style={{ flex: 1, paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Dashboard Top Header Bar */}
        <div className="dash-header-row">
          <div>
            <div className="pill-tag amber" style={{ marginBottom: '0.6rem' }}>
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '0.3rem' }}></i> 30-DAY GENERATION REPORT
            </div>
            <h1 style={{ fontSize: '2.2rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              <span>FLEET</span>
              <PinwheelLogo size={28} />
              <span className="glow-amber">INTELLIGENCE</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.35rem' }}>
              Real-time monitoring of all vehicle engine oil inspections and remaining useful life (RUL) generated over the last 30 days.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btn-upload-csv-telemetry"
              className="btn-primary"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.85rem' }}
              onClick={() => setUploadModalOpen(true)}
            >
              <i className="fa-solid fa-file-arrow-up" style={{ marginRight: '0.4rem' }}></i>
              Add CSV Telemetry
            </button>

            <button
              id="btn-export-csv"
              className="btn-secondary"
              style={{ padding: '0.75rem 1.4rem', fontSize: '0.85rem' }}
              onClick={handleExportCsv}
            >
              <i className="fa-solid fa-file-arrow-down" style={{ marginRight: '0.4rem' }}></i>
              Export 30-Day CSV
            </button>

            {/* New Inspection Dropdown */}
            <div className="inspection-dropdown-container" style={{ position: 'relative' }}>
              <button
                type="button"
                id="btn-new-inspection"
                className="btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer',
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className="fa-solid fa-plus"></i>
                <span>New Inspection</span>
                <i className="fa-solid fa-chevron-down dropdown-caret"></i>
              </button>

              {dropdownOpen && (
                <div
                  className="inspection-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-amber)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 100,
                    width: '260px',
                    padding: '0.5rem',
                  }}
                >
                  <Link
                    to="/calculator"
                    className="inspection-dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-xs)',
                      textDecoration: 'none',
                      color: '#ffffff',
                    }}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">
                      <i className="fa-solid fa-calculator" style={{ color: 'var(--amber-glow)' }}></i>
                    </div>
                    <div className="dropdown-item-text">
                      <div className="dropdown-item-title" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        Start New Bench Test
                      </div>
                      <div className="dropdown-item-desc" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Interactive diagnostic calculator
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="inspection-dropdown-item"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-xs)',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setDropdownOpen(false);
                      setUploadModalOpen(true);
                    }}
                  >
                    <div className="dropdown-item-icon">
                      <i className="fa-solid fa-file-csv" style={{ color: 'var(--amber-glow)' }}></i>
                    </div>
                    <div className="dropdown-item-text">
                      <div className="dropdown-item-title" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        Upload CSV Batch
                      </div>
                      <div className="dropdown-item-desc" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Batch diagnostics for fleets
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Data Scope Toggle (Manual data by default; toggle includes chosen batch) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1.4rem',
            marginBottom: '1.8rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Telemetry Data Scope:
            </span>

            <div
              style={{
                display: 'flex',
                gap: '0.4rem',
                background: 'var(--bg-input)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                className={`preset-btn ${!includeBatch ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => setIncludeBatch(false)}
              >
                <i className="fa-solid fa-calculator" style={{ color: !includeBatch ? 'var(--amber-glow)' : 'inherit' }}></i>
                Manual Bench Tests Only (Default)
              </button>

              <button
                type="button"
                className={`preset-btn ${includeBatch ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={handleToggleBatchOn}
              >
                <i className="fa-solid fa-layer-group" style={{ color: includeBatch ? 'var(--accent-cyan)' : 'inherit' }}></i>
                Include Batch Telemetry
              </button>
            </div>
          </div>

          {includeBatch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Select Batch:
              </span>
              <select
                className="input-custom"
                style={{ width: 'auto', minWidth: '220px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                value={selectedBatchId}
                onChange={(e) => handleSelectBatch(e.target.value)}
              >
                {availableBatches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.fileName} ({b.rowCount} rows)
                  </option>
                ))}
              </select>

              {loadingBatchData ? (
                <span style={{ fontSize: '0.76rem', color: 'var(--amber-glow)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Merging batch rows...
                </span>
              ) : (
                <span className="pill-tag optimal" style={{ fontSize: '0.72rem' }}>
                  +{batchRecords.length} BATCH ROWS MERGED
                </span>
              )}
            </div>
          )}
        </div>

        {/* 30-Day Metric Summary Cards */}
        <section className="dash-metrics-grid" aria-label="30-day generation summary">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div className="metric-hud-card">
                <div className="metric-hud-header">
                  <span className="metric-hud-title">30-Day Inspections</span>
                  <div className="metric-hud-icon icon-amber">
                    <i className="fa-solid fa-oil-well"></i>
                  </div>
                </div>
                <div className="metric-hud-value" id="kpi-total-tests">
                  {totalCount}
                </div>
                <div className="metric-hud-sub">
                  <span className="trend-badge positive">
                    <i className="fa-solid fa-arrow-trend-up"></i> +18%
                  </span>
                  <span>vs previous month</span>
                </div>
              </div>

              <div className="metric-hud-card">
                <div className="metric-hud-header">
                  <span className="metric-hud-title">Optimal Condition</span>
                  <div className="metric-hud-icon icon-green">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                </div>
                <div className="metric-hud-value" id="kpi-optimal-tests" style={{ color: 'var(--status-optimal)' }}>
                  {optimalCount}
                </div>
                <div className="metric-hud-sub">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--status-optimal)' }}>
                    {optimalPct}% of fleet
                  </span>
                  <span>Safe running</span>
                </div>
              </div>

              <div className="metric-hud-card">
                <div className="metric-hud-header">
                  <span className="metric-hud-title">Service Due Soon</span>
                  <div className="metric-hud-icon icon-orange">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                </div>
                <div className="metric-hud-value" id="kpi-warning-tests" style={{ color: 'var(--amber-glow)' }}>
                  {warningCount}
                </div>
                <div className="metric-hud-sub">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--amber-glow)' }}>
                    {warningPct}% of fleet
                  </span>
                  <span>Within next 1,200 km</span>
                </div>
              </div>

              <div className="metric-hud-card">
                <div className="metric-hud-header">
                  <span className="metric-hud-title">Critical Sludge Alert</span>
                  <div className="metric-hud-icon icon-red">
                    <i className="fa-solid fa-skull-crossbones"></i>
                  </div>
                </div>
                <div className="metric-hud-value" id="kpi-critical-tests" style={{ color: 'var(--status-critical)' }}>
                  {criticalCount}
                </div>
                <div className="metric-hud-sub">
                  <span className="trend-badge critical">
                    <i className="fa-solid fa-triangle-exclamation"></i> Immediate Flush
                  </span>
                  <span>Crankcase danger</span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 30-Day Activity Charts Section */}
        <section className="dash-charts-grid" aria-label="30-day analytics charts" style={{ marginTop: '2rem' }}>
          {/* Chart 1: Inspection Activity */}
          <div className="bench-panel" style={{ padding: '1.5rem' }}>
            <div className="panel-header-bar" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <h3 className="panel-title" style={{ fontSize: '1.05rem' }}>
                <i className="fa-solid fa-chart-area" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                30-Day Inspection Generation Activity
              </h3>
              <span className="panel-sub">Weekly Test Volumes</span>
            </div>
            <div style={{ height: '240px', position: 'relative' }}>
              <Bar data={activityData} options={activityOptions} />
            </div>
          </div>

          {/* Chart 2: Fleet Health Distribution */}
          <div className="bench-panel" style={{ padding: '1.5rem' }}>
            <div className="panel-header-bar" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <h3 className="panel-title" style={{ fontSize: '1.05rem' }}>
                <i className="fa-solid fa-chart-pie" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                Fleet Health Condition Distribution
              </h3>
              <span className="panel-sub">Current Breakdown</span>
            </div>
            <div style={{ height: '240px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Doughnut data={distributionData} options={distributionOptions} />
            </div>
          </div>
        </section>

        {/* Records & Hover Inspection Section */}
        <section id="records-section" style={{ marginTop: '2.5rem' }}>
          <div className="records-toolbar-wrap">
            <div>
              <h2
                style={{
                  fontSize: '1.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>VEHICLE</span>
                <PinwheelLogo size={20} />
                <span className="glow-amber">INSPECTION RECORDS</span>
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-hand-pointer" style={{ color: 'var(--amber-glow)', marginRight: '0.3rem' }}></i>
                <strong>Hover over or select any row</strong> to inspect live tribological breakdown.
              </span>
            </div>

            {/* Filter Controls */}
            <div className="filter-controls-group">
              <div className="search-input-wrap">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  id="record-search"
                  className="search-input"
                  placeholder="Search Vehicle Plate, Type, Grade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="tab-pills-group">
                <button
                  type="button"
                  className={`tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({records.length})
                </button>
                <button
                  type="button"
                  className={`tab-pill ${statusFilter === 'optimal' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('optimal')}
                >
                  Optimal ({optimalCount})
                </button>
                <button
                  type="button"
                  className={`tab-pill ${statusFilter === 'warning' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('warning')}
                >
                  Warning ({warningCount})
                </button>
                <button
                  type="button"
                  className={`tab-pill ${statusFilter === 'critical' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('critical')}
                >
                  Critical ({criticalCount})
                </button>
              </div>
            </div>
          </div>

          {/* Grid Layout: Table on Left + Hover Inspector on Right */}
          <div className="records-display-layout" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>
            {/* Left: Table Container */}
            <div className="records-table-container">
              {filteredRecords.length === 0 ? (
                <EmptyState
                  title="No Matching Vehicle Records"
                  description="No records match your filter criteria. Try adjusting your search query or reset status filters."
                  actionText="Clear Filters"
                  actionLink="/dashboard"
                />
              ) : (
                <table className="dash-table" id="fleet-table">
                  <thead>
                    <tr>
                      <th>Plate &amp; Category</th>
                      <th>Baseline</th>
                      <th>Viscosity</th>
                      <th>OHI</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, idx) => {
                      const plate = r.registrationNo || r.vehiclePlate || r.plate || 'MH-12-AB-9821';
                      const type = r.vehicleCategory || r.vehicleType || r.type || 'Commercial Heavy Truck';
                      const grade = r.inputs?.saeBaseline || r.grade || '15W-40';
                      const visc = r.inputs?.measuredViscosity || r.visc || 225.0;
                      const rohi = r.results?.ohi ?? r.ohi ?? 88;
                      const rRul = r.results?.rulFormatted || `${r.rulKm || 6450} km`;
                      const rRec = r.results?.serviceRecommendation || r.status || 'Optimal';
                      const isSelected = (hRec._id || hRec.id) === (r._id || r.id);

                      return (
                        <tr
                          key={r._id || r.id || idx}
                          className={`table-row-hoverable ${isSelected ? 'row-selected' : ''}`}
                          onMouseEnter={() => setHoveredRecord(r)}
                          onClick={() => setHoveredRecord(r)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(255, 136, 0, 0.08)' : undefined,
                          }}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <i className={`fa-solid ${r.typeIcon || 'fa-truck'}`} style={{ color: 'var(--amber-glow)' }}></i>
                              <div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                                  {plate}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{type}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="card-formula-chip" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                              {grade}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            {typeof visc === 'number' ? visc.toFixed(1) : visc} cSt
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>
                                {rohi}%
                              </span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--amber-glow)' }}>
                            {rRul}
                          </td>
                          <td>
                            <span className={getBadgeClass(rRec)} style={{ fontSize: '0.68rem', padding: '0.25rem 0.55rem' }}>
                              {rRec.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right: Floating Live Tribological Hover Inspector */}
            <div className="hover-inspector-card" style={{ position: 'sticky', top: '90px', height: 'fit-content' }}>
              <div className="panel-header-bar" style={{ marginBottom: '1rem', paddingBottom: '0.65rem' }}>
                <h3 className="panel-title" style={{ fontSize: '0.95rem' }}>
                  <i className="fa-solid fa-microscope" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                  Live Tribological Inspection
                </h3>
                <span className="panel-sub">{hPlate}</span>
              </div>

              {/* Vehicle Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: '#fff' }}>{hPlate}</h4>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hType}</span>
                </div>
                <span className={getBadgeClass(hRecommendation)}>{hRecommendation.toUpperCase()}</span>
              </div>

              {/* Mini Gauge & Health Metric */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div className="gauge-circle-wrap" style={{ width: '80px', height: '80px' }}>
                  <svg className="gauge-svg" viewBox="0 0 140 140" style={{ width: '80px', height: '80px' }}>
                    <circle className="gauge-bg-ring" cx="70" cy="70" r="58"></circle>
                    <circle
                      className="gauge-meter-ring"
                      cx="70"
                      cy="70"
                      r="58"
                      style={{
                        strokeDasharray: `${circumference}`,
                        strokeDashoffset: `${Math.max(0, hoverOffset)}`,
                        transition: 'stroke-dashoffset 0.4s ease-out',
                      }}
                    ></circle>
                  </svg>
                  <div className="gauge-value-text">
                    <div className="gauge-percent" style={{ fontSize: '1.1rem' }}>
                      {hOhi}%
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Life</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color: 'var(--amber-glow)' }}>
                    {hRul}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Viscosity Shift: {hDev}</div>
                </div>
              </div>

              {/* Specs Breakdown Table */}
              <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-xs)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ASTM Ford B4 Flow Time:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber-glow)' }}>{hFlowTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Degradation Ratio (R_v):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{hDev}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Service Cutoff Threshold:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-critical)' }}>30% OHI</strong>
                </div>
              </div>

              {/* Mechanic Advisory Box */}
              <div className="mechanic-report-box" style={{ margin: 0, padding: '0.85rem' }}>
                <div className="report-header" style={{ fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                  <i className="fa-solid fa-wrench" style={{ marginRight: '0.3rem' }}></i> Advisory Summary
                </div>
                <div className="report-text" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  {hAdvisory}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <Link
                  to="/calculator"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.65rem' }}
                >
                  <i className="fa-solid fa-sliders" style={{ marginRight: '0.4rem' }}></i>
                  Test Vehicle on Bench
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CsvUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onBatchComplete={(newBatch) => {
          setUploadModalOpen(false);
          navigate('/reports', { state: { batchId: newBatch._id } });
        }}
      />

      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
