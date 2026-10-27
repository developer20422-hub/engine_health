import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { CsvUploadModal } from '../components/CsvUploadModal';
import { batchApi } from '../api/batchApi';

export const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Batches summary list (collapsed by default)
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Active viewing batch (null on initial load so rows are NEVER loaded on page open)
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [batchRows, setBatchRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // Server-side Controls: search, filter, sort & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rowIndex');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRowsCount, setTotalRowsCount] = useState(0);

  // Renaming Batch State
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [renamedFileName, setRenamedFileName] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Download & Retry States
  const [downloadingId, setDownloadingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  // Modals & Details
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);
  const [toast, setToast] = useState(null);

  // Debounce search input for responsive server-side queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load batches metadata list on page mount
  // CRITICAL: We DO NOT select or load rows here. Batches appear collapsed in "My uploads".
  const loadBatches = useCallback(async (autoSelectId = null) => {
    try {
      setLoadingBatches(true);
      const res = await batchApi.getBatches();
      if (res.success && res.data) {
        setBatches(res.data);
        if (autoSelectId) {
          const found = res.data.find((b) => b._id === autoSelectId);
          if (found) {
            handleViewData(found);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load batches list:', err.message);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    loadBatches(location.state?.batchId);
  }, [loadBatches, location.state]);

  // Fetch batch rows ONLY when a batch is explicitly opened for data inspection
  const fetchBatchRows = useCallback(
    async (batchId) => {
      if (!batchId) return;
      try {
        setLoadingRows(true);
        const params = {
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          risk: riskFilter !== 'all' ? riskFilter : undefined,
          sortBy,
          sortOrder,
        };

        const [batchRes, rowsRes] = await Promise.all([
          batchApi.getBatchById(batchId),
          batchApi.getBatchRows(batchId, params),
        ]);

        if (batchRes.success && batchRes.data) {
          setCurrentBatch(batchRes.data);
        }

        if (rowsRes.success && rowsRes.data) {
          setBatchRows(rowsRes.data.rows || []);
          setTotalPages(rowsRes.data.pagination?.totalPages || 1);
          setTotalRowsCount(rowsRes.data.pagination?.total || 0);
        }
      } catch (err) {
        console.warn('Could not load batch telemetry rows:', err.message);
        setToast({ message: 'Failed to fetch batch data rows', type: 'error' });
      } finally {
        setLoadingRows(false);
      }
    },
    [page, limit, debouncedSearch, statusFilter, riskFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchRows(selectedBatchId);
    }
  }, [selectedBatchId, fetchBatchRows]);

  // Action: User clicks "View data" on a batch
  const handleViewData = (batch) => {
    if (selectedBatchId === batch._id) {
      // Toggle collapse if already open
      setSelectedBatchId(null);
      setCurrentBatch(null);
      setBatchRows([]);
    } else {
      setSelectedBatchId(batch._id);
      setCurrentBatch(batch);
      setPage(1);
      setSearchTerm('');
      setRiskFilter('all');
      setStatusFilter('all');
    }
  };

  // Action: Export Styled Excel (.xlsx)
  const handleDownloadExcel = async (batch) => {
    try {
      setDownloadingId(`excel-${batch._id}`);
      setToast({ message: `Generating styled Excel (.xlsx) for ${batch.fileName}...`, type: 'info' });
      const baseName = batch.fileName.replace(/\.[^/.]+$/, '');
      await batchApi.downloadExcel(batch._id, `${baseName}_analysis.xlsx`);
      setToast({ message: `Excel export ready: ${baseName}_analysis.xlsx`, type: 'success' });
    } catch (err) {
      console.error('Excel download failed:', err);
      setToast({ message: 'Failed to download Excel report', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Action: Export Plain CSV
  const handleDownloadCsv = async (batch) => {
    try {
      setDownloadingId(`csv-${batch._id}`);
      setToast({ message: `Generating sanitized CSV for ${batch.fileName}...`, type: 'info' });
      const baseName = batch.fileName.replace(/\.[^/.]+$/, '');
      await batchApi.downloadCsv(batch._id, `${baseName}_export.csv`);
      setToast({ message: `CSV export ready: ${baseName}_export.csv`, type: 'success' });
    } catch (err) {
      console.error('CSV download failed:', err);
      setToast({ message: 'Failed to download CSV report', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  // Action: Rename Batch
  const handleStartRename = (batch) => {
    setEditingBatchId(batch._id);
    setRenamedFileName(batch.fileName);
  };

  const handleSaveRename = async (batchId) => {
    if (!renamedFileName.trim()) return;
    try {
      setSavingRename(true);
      const res = await batchApi.renameBatch(batchId, renamedFileName.trim());
      if (res.success) {
        setToast({ message: 'Batch renamed successfully!', type: 'success' });
        setBatches((prev) =>
          prev.map((b) => (b._id === batchId ? { ...b, fileName: res.data.fileName } : b))
        );
        if (currentBatch && currentBatch._id === batchId) {
          setCurrentBatch((prev) => ({ ...prev, fileName: res.data.fileName }));
        }
        setEditingBatchId(null);
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to rename batch', type: 'error' });
    } finally {
      setSavingRename(false);
    }
  };

  // Action: Retry Failed Rows
  const handleRetryFailed = async (batchId) => {
    try {
      setRetryingId(batchId);
      setToast({ message: 'Retrying failed rows through validation & AI pipeline...', type: 'info' });
      const res = await batchApi.retryFailedRows(batchId);
      if (res.success) {
        setToast({
          message: `Retry completed: ${res.data.recoveredCount} recovered, ${res.data.stillFailedCount} remaining failed.`,
          type: res.data.recoveredCount > 0 ? 'success' : 'info',
        });
        loadBatches();
        if (selectedBatchId === batchId) {
          fetchBatchRows(batchId);
        }
      }
    } catch (err) {
      setToast({ message: 'Failed to retry rows', type: 'error' });
    } finally {
      setRetryingId(null);
    }
  };

  // Action: Delete Batch
  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Permanently delete this batch report and all its row records?')) return;
    try {
      const res = await batchApi.deleteBatch(batchId);
      if (res.success) {
        setToast({ message: 'Batch report removed successfully.', type: 'success' });
        if (selectedBatchId === batchId) {
          setSelectedBatchId(null);
          setCurrentBatch(null);
          setBatchRows([]);
        }
        loadBatches();
      }
    } catch (err) {
      setToast({ message: 'Failed to delete batch', type: 'error' });
    }
  };

  // Sort toggle helper
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return <i className="fa-solid fa-sort" style={{ opacity: 0.35, marginLeft: '0.4rem' }}></i>;
    return sortOrder === 'asc' ? (
      <i className="fa-solid fa-sort-up" style={{ color: 'var(--amber-glow)', marginLeft: '0.4rem' }}></i>
    ) : (
      <i className="fa-solid fa-sort-down" style={{ color: 'var(--amber-glow)', marginLeft: '0.4rem' }}></i>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar badge="AI PIPELINE" />

      <main className="container" style={{ flex: 1, padding: '2.5rem 1.5rem' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.2rem', marginBottom: '2rem' }}>
          <div>
            <div className="pill-tag amber" style={{ marginBottom: '0.6rem' }}>
              <i className="fa-solid fa-file-excel" style={{ marginRight: '0.4rem' }}></i>
              PHASE 07 STYLED EXPORT & ON-DEMAND VIEWER
            </div>
            <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#fff', margin: 0 }}>
              Batch Diagnostics & Styled Exports
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.35rem 0 0' }}>
              On-demand row inspection, server-side filtering, and ExcelJS styled spreadsheet downloads with formula protection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button className="btn-primary" onClick={() => setUploadModalOpen(true)}>
              <i className="fa-solid fa-file-arrow-up" style={{ marginRight: '0.4rem' }}></i>
              Add CSV Telemetry
            </button>
          </div>
        </div>

        {/* SECTION 1: "My Uploads" Collapsed Batch Cards List */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--amber-glow)', fontSize: '1.2rem' }}></i>
              <h2 style={{ fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', margin: 0 }}>
                My Uploads
              </h2>
              <span className="pill-tag neutral" style={{ fontSize: '0.74rem' }}>
                {batches.length} {batches.length === 1 ? 'BATCH' : 'BATCHES'}
              </span>
            </div>

            <button
              type="button"
              className="preset-btn"
              onClick={() => loadBatches()}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              title="Refresh upload list"
            >
              <i className="fa-solid fa-rotate-right" style={{ marginRight: '0.3rem' }}></i>
              Refresh
            </button>
          </div>

          {loadingBatches ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : batches.length === 0 ? (
            <EmptyState
              icon="fa-cloud-arrow-up"
              title="No CSV batches uploaded yet"
              description="Upload your fleet oil inspection CSV files to launch bulk calculations, AI insights, and export styled Excel sheets."
              actionText="Upload First CSV Batch"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {batches.map((batch) => {
                const isViewing = selectedBatchId === batch._id;
                const isEditing = editingBatchId === batch._id;
                const hasFailed = (batch.failedRows || 0) > 0;
                const isProcessing = batch.status === 'processing' || batch.status === 'queued';

                return (
                  <div
                    key={batch._id}
                    className="profile-card"
                    style={{
                      padding: '1.2rem 1.4rem',
                      borderColor: isViewing ? 'var(--amber-glow)' : 'var(--border-subtle)',
                      boxShadow: isViewing ? '0 0 25px rgba(255, 136, 0, 0.15)' : 'none',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      {/* Left: File Name, Date & Status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', minWidth: '260px', flex: 1 }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            background: isViewing ? 'rgba(255, 136, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isViewing ? 'var(--amber-glow)' : 'var(--text-secondary)',
                            fontSize: '1.2rem',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <i className="fa-solid fa-file-csv"></i>
                        </div>

                        <div style={{ flex: 1 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <input
                                type="text"
                                className="input-custom"
                                value={renamedFileName}
                                onChange={(e) => setRenamedFileName(e.target.value)}
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem', width: '240px' }}
                                autoFocus
                              />
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                onClick={() => handleSaveRename(batch._id)}
                                disabled={savingRename}
                              >
                                {savingRename ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="preset-btn"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => setEditingBatchId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '1rem', color: '#fff', letterSpacing: '0.5px' }}>
                                {batch.fileName}
                              </strong>
                              <button
                                type="button"
                                onClick={() => handleStartRename(batch)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                                title="Rename this batch"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <span>
                              <i className="fa-regular fa-clock" style={{ marginRight: '0.3rem' }}></i>
                              {new Date(batch.createdAt).toLocaleString()}
                            </span>
                            <span>&bull;</span>
                            <span className={`pill-tag ${batch.status === 'done' ? 'optimal' : isProcessing ? 'amber' : 'critical'}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                              {batch.status?.toUpperCase()}
                            </span>
                            {isProcessing && (
                              <span style={{ color: 'var(--amber-glow)', fontFamily: 'var(--font-mono)' }}>
                                {batch.progress}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Key Counts */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Rows</small>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                            {batch.rowCount}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Success</small>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.95rem' }}>
                            {batch.successRows}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase' }}>Failed</small>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: hasFailed ? 'var(--accent-red)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                            {batch.failedRows || 0}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {/* On-Demand Table Opener */}
                        <button
                          type="button"
                          className={isViewing ? 'btn-primary' : 'preset-btn'}
                          onClick={() => handleViewData(batch)}
                          style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <i className={`fa-solid ${isViewing ? 'fa-chevron-up' : 'fa-table-list'}`}></i>
                          {isViewing ? 'Collapse Data' : 'View Data'}
                        </button>

                        {/* Styled Excel Download */}
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleDownloadExcel(batch)}
                          disabled={downloadingId === `excel-${batch._id}`}
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            borderColor: 'rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                          }}
                          title="Download Styled Excel (.xlsx) with themes, conditional fills, and formulas"
                        >
                          {downloadingId === `excel-${batch._id}` ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-file-excel"></i>
                          )}
                          Excel (.xlsx)
                        </button>

                        {/* Plain CSV Download */}
                        <button
                          type="button"
                          className="preset-btn"
                          onClick={() => handleDownloadCsv(batch)}
                          disabled={downloadingId === `csv-${batch._id}`}
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                          title="Download plain RFC-4180 CSV"
                        >
                          {downloadingId === `csv-${batch._id}` ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-file-csv"></i>
                          )}
                          CSV
                        </button>

                        {/* Retry Failed Rows (visible if any failed) */}
                        {hasFailed && (
                          <button
                            type="button"
                            className="preset-btn"
                            onClick={() => handleRetryFailed(batch._id)}
                            disabled={retryingId === batch._id}
                            style={{
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.8rem',
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: 'var(--accent-red)',
                            }}
                            title="Re-run validation and AI calculations for failed rows"
                          >
                            {retryingId === batch._id ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-arrows-rotate"></i>
                            )}
                            Retry Failed
                          </button>
                        )}

                        {/* Delete Batch */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch._id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            color: 'var(--accent-red)',
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                          title="Delete batch and records"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: On-Demand Interactive Data Table (Opens ONLY when user clicks "View data") */}
        {selectedBatchId && currentBatch && (
          <div className="profile-card" style={{ marginTop: '2rem' }}>
            {/* Table Header & Controls Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span className="pill-tag amber" style={{ fontSize: '0.72rem' }}>
                    DATA VIEWER ACTIVE
                  </span>
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>
                    {currentBatch.fileName}
                  </h3>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Showing {totalRowsCount} total records &bull; {currentBatch.successRows} valid computations &bull; {currentBatch.failedRows || 0} flagged errors
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => handleDownloadExcel(currentBatch)}
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                >
                  <i className="fa-solid fa-file-excel" style={{ marginRight: '0.4rem' }}></i>
                  Export Excel (.xlsx)
                </button>

                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setSelectedBatchId(null);
                    setCurrentBatch(null);
                    setBatchRows([]);
                  }}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <i className="fa-solid fa-xmark" style={{ marginRight: '0.3rem' }}></i>
                  Close Viewer
                </button>
              </div>
            </div>

            {/* Search, Risk, Status Filters Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="Search vehicle plate, SAE, AI diagnosis..."
                  className="input-custom"
                  style={{ width: '300px', padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status and Risk Filter Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Risk:</span>
                <button
                  type="button"
                  className={`preset-btn ${riskFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setRiskFilter('all'); setPage(1); }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`preset-btn ${riskFilter === 'low' ? 'active' : ''}`}
                  onClick={() => { setRiskFilter('low'); setPage(1); }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', color: '#00e676' }}
                >
                  Low
                </button>
                <button
                  type="button"
                  className={`preset-btn ${riskFilter === 'moderate' ? 'active' : ''}`}
                  onClick={() => { setRiskFilter('moderate'); setPage(1); }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', color: '#00e5ff' }}
                >
                  Moderate
                </button>
                <button
                  type="button"
                  className={`preset-btn ${riskFilter === 'high' ? 'active' : ''}`}
                  onClick={() => { setRiskFilter('high'); setPage(1); }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', color: 'var(--amber-glow)' }}
                >
                  High
                </button>
                <button
                  type="button"
                  className={`preset-btn ${riskFilter === 'critical' ? 'active' : ''}`}
                  onClick={() => { setRiskFilter('critical'); setPage(1); }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', color: 'var(--accent-red)' }}
                >
                  Critical
                </button>

                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginLeft: '0.6rem' }}>Status:</span>
                <button
                  type="button"
                  className={`preset-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('all'); setPage(1); }}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem' }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`preset-btn ${statusFilter === 'success' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('success'); setPage(1); }}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', color: 'var(--accent-green)' }}
                >
                  Success
                </button>
                <button
                  type="button"
                  className={`preset-btn ${statusFilter === 'failed' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('failed'); setPage(1); }}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', color: 'var(--accent-red)' }}
                >
                  Failed
                </button>
              </div>
            </div>

            {/* Records Data Table */}
            {loadingRows ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--amber-glow)' }}>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', marginBottom: '0.8rem' }}></i>
                <div>Loading batch telemetry rows...</div>
              </div>
            ) : batchRows.length > 0 ? (
              <div className="records-table-container">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('rowIndex')} style={{ cursor: 'pointer' }}>
                        # {getSortIcon('rowIndex')}
                      </th>
                      <th>Vehicle Plate</th>
                      <th onClick={() => handleSort('viscosity')} style={{ cursor: 'pointer' }}>
                        SAE & Viscosity {getSortIcon('viscosity')}
                      </th>
                      <th onClick={() => handleSort('ohi')} style={{ cursor: 'pointer' }}>
                        OHI {getSortIcon('ohi')}
                      </th>
                      <th onClick={() => handleSort('rul')} style={{ cursor: 'pointer' }}>
                        Projected RUL {getSortIcon('rul')}
                      </th>
                      <th>AI Risk</th>
                      <th>AI Diagnostic Summary</th>
                      <th>Mechanic Action</th>
                      <th style={{ textAlign: 'right' }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((r) => {
                      const isFailed = r.status === 'failed';
                      const risk = r.llmResult?.tribologicalRisk || (isFailed ? 'Critical' : 'Moderate');
                      const riskClass = risk.toLowerCase();

                      return (
                        <tr
                          key={r._id || r.rowIndex}
                          style={{
                            backgroundColor: isFailed ? 'rgba(239, 68, 68, 0.05)' : undefined,
                            borderLeft: isFailed ? '3px solid var(--accent-red)' : 'none',
                          }}
                        >
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            #{r.rowIndex}
                          </td>
                          <td>
                            <strong style={{ color: '#fff', fontSize: '0.88rem' }}>
                              {r.inputs?.registrationNo || `ROW-${r.rowIndex}`}
                            </strong>
                            {isFailed && (
                              <div style={{ color: 'var(--accent-red)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.3rem' }}></i>
                                {r.error}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber-glow)', fontWeight: 600 }}>
                              {r.inputs?.saeBaseline || '-'}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {r.results?.measuredViscosity !== undefined ? `${r.results.measuredViscosity} cSt` : (r.inputs?.measuredViscosity ? `${r.inputs.measuredViscosity} cSt` : '-')}
                            </div>
                          </td>
                          <td>
                            {r.results?.ohi !== undefined ? (
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 700,
                                  fontSize: '0.92rem',
                                  color: r.results.ohi >= 80 ? '#00e676' : r.results.ohi >= 60 ? '#00e5ff' : 'var(--amber-glow)',
                                }}
                              >
                                {r.results.ohi}/100
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                            {r.results?.rulKm !== undefined ? `+${r.results.rulKm?.toLocaleString()} km` : '-'}
                          </td>
                          <td>
                            {!isFailed && r.llmResult ? (
                              <span className={`risk-pill ${riskClass}`}>
                                <i className="fa-solid fa-shield-halved" style={{ fontSize: '0.65rem' }}></i>
                                {risk}
                              </span>
                            ) : (
                              <span className="pill-tag critical" style={{ fontSize: '0.68rem' }}>
                                FAILED
                              </span>
                            )}
                          </td>
                          <td style={{ maxWidth: '280px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {r.llmResult?.summary || (isFailed ? 'Row validation rejected' : 'Processing...')}
                          </td>
                          <td style={{ maxWidth: '240px', fontSize: '0.8rem', color: '#fff', lineHeight: 1.35 }}>
                            {r.llmResult?.recommendedAction || (isFailed ? r.error : '-')}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedRowDetail(r)}
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                color: 'var(--amber-glow)',
                                padding: '0.35rem 0.65rem',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                              }}
                              title="Inspect full row telemetry"
                            >
                              <i className="fa-solid fa-magnifying-glass-chart"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="fa-filter-circle-xmark"
                title="No rows matching current query"
                description="Try modifying search keywords or resetting filter pills."
                actionText="Reset Filters"
                onAction={() => {
                  setSearchTerm('');
                  setRiskFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
              />
            )}

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing page {page} of {totalPages} ({totalRowsCount} total rows)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="preset-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '0 0.5rem', color: '#fff' }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="preset-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Row Detail Drawer / Modal */}
      {selectedRowDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedRowDetail(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem' }}>
              <div>
                <span className="pill-tag amber" style={{ fontSize: '0.72rem' }}>
                  ROW #{selectedRowDetail.rowIndex} &bull; {selectedRowDetail.inputs?.registrationNo || 'VEHICLE'}
                </span>
                <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: '0.3rem 0 0' }}>
                  Tribological Telemetry Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedRowDetail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Math Outputs */}
            <div style={{ marginBottom: '1.4rem' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.82rem', color: 'var(--amber-glow)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                Kinematic & Degradation Math
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', background: 'var(--bg-surface)', padding: '0.9rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>SAE BASELINE</small>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{selectedRowDetail.inputs?.saeBaseline || '-'}</div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>VISCOSITY 40°C</small>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {selectedRowDetail.results?.measuredViscosity !== undefined ? `${selectedRowDetail.results.measuredViscosity} cSt` : (selectedRowDetail.inputs?.measuredViscosity ? `${selectedRowDetail.inputs.measuredViscosity} cSt` : '-')}
                  </div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>OHI SCORE</small>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-glow)' }}>
                    {selectedRowDetail.results?.ohi !== undefined ? `${selectedRowDetail.results.ohi}/100` : '-'}
                  </div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>RUL REMAINING</small>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {selectedRowDetail.results?.rulKm !== undefined ? `+${selectedRowDetail.results.rulKm?.toLocaleString()} km` : '-'}
                  </div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>VISCOSITY DEVIATION</small>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>
                    {selectedRowDetail.results?.devPct !== undefined ? `${selectedRowDetail.results.devPct?.toFixed(1)}%` : '-'}
                  </div>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>SERVICE STATUS</small>
                  <div style={{ fontWeight: 700, color: '#fff' }}>
                    {selectedRowDetail.results?.serviceRecommendation || (selectedRowDetail.status === 'failed' ? 'Failed' : 'Pending')}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {selectedRowDetail.llmResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.82rem', color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                    AI Tribological Synthesis
                  </span>
                  <span className={`risk-pill ${selectedRowDetail.llmResult.tribologicalRisk?.toLowerCase()}`}>
                    RISK: {selectedRowDetail.llmResult.tribologicalRisk} ({selectedRowDetail.llmResult.confidenceScore ? `${Math.round(selectedRowDetail.llmResult.confidenceScore * (selectedRowDetail.llmResult.confidenceScore <= 1 ? 100 : 1))}%` : '85%'} Confidence)
                  </span>
                </div>

                <div style={{ background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 'var(--radius-xs)', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.88rem', color: '#fff', marginBottom: '0.6rem', lineHeight: 1.45 }}>
                    {selectedRowDetail.llmResult.summary}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(0, 229, 255, 0.15)', paddingTop: '0.6rem', fontSize: '0.84rem', color: 'var(--accent-cyan)' }}>
                    <strong>Action:</strong> {selectedRowDetail.llmResult.recommendedAction}
                  </div>
                </div>

                {selectedRowDetail.llmResult.keyInsights && (
                  <div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase' }}>Key Tribological Findings:</small>
                    <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {selectedRowDetail.llmResult.keyInsights.map((insight, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.6rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedRowDetail(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onBatchComplete={(newBatch) => {
          setUploadModalOpen(false);
          setToast({ message: `Batch ${newBatch.fileName} completed successfully!`, type: 'success' });
          loadBatches();
        }}
      />

      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
