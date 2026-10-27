import React, { useState, useRef } from 'react';
import { batchApi } from '../api/batchApi';
import { PinwheelLogo } from './PinwheelLogo';

export const CsvUploadModal = ({ isOpen, onClose, onBatchComplete }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Ingestion State
  const [uploading, setUploading] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalRowCount, setTotalRowCount] = useState(0);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPreviewError('Invalid file format. Please upload a comma-separated (.csv) file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPreviewError('File size exceeds the 10 MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    setPreviewError(null);
    setLoadingPreview(true);

    try {
      const res = await batchApi.previewCsv(file);
      if (res.success && res.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      setPreviewError(err.response?.data?.error?.message || 'Failed to parse CSV preview.');
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setBatchStatus('uploading');

      const res = await batchApi.uploadCsv(selectedFile);
      if (res.success && res.data?.batchId) {
        const batchId = res.data.batchId;
        setActiveBatchId(batchId);
        setTotalRowCount(res.data.rowCount);
        setBatchStatus('processing');

        // Poll for progress until batch finishes
        const pollInterval = setInterval(async () => {
          try {
            const pollRes = await batchApi.getBatchById(batchId);
            if (pollRes.success && pollRes.data) {
              const b = pollRes.data;
              setBatchProgress(b.progress || 0);
              setProcessedCount(b.processedRows || 0);
              setBatchStatus(b.status);

              if (b.status === 'done' || b.status === 'failed') {
                clearInterval(pollInterval);
                setUploading(false);
                if (b.status === 'done' && onBatchComplete) {
                  setTimeout(() => {
                    onBatchComplete(b);
                  }, 600);
                }
              }
            }
          } catch (pollErr) {
            console.warn('Progress poll issue:', pollErr);
          }
        }, 700);
      }
    } catch (err) {
      setPreviewError(err.response?.data?.error?.message || 'Failed to start batch upload.');
      setUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const sampleHeaders = 'registrationNo,saeBaseline,measuredViscosity,temperature,blotterScore,baseOilType,engineType,currentMileage,units\n';
    const sampleRows = [
      'MH-12-AB-9821,5W-30,110.0,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,15000,km',
      'MH-14-GH-4402,0W-20,76.0,27.5,100,Full-Synthetic,Naturally Aspirated Petrol,8400,km',
      'DL-01-TK-5501,15W-40,245.0,27.5,45,Mineral,Diesel,38000,km',
      'KA-03-MG-1190,5W-30,78.5,27.5,75,Semi-Synthetic,Turbo Petrol,22500,km',
      'TS-07-EK-8820,10W-40,176.0,27.5,100,Semi-Synthetic,Naturally Aspirated Petrol,19000,km',
    ].join('\n');

    const blob = new Blob([sampleHeaders + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mech_online_fleet_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <PinwheelLogo size={24} />
            <h2 style={{ fontSize: '1.25rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              Bulk CSV Telemetry Pipeline
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Upload & Drag-Drop Zone */}
        {!uploading && (
          <>
            <div
              className={`csv-dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="csv-dropzone-icon">
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '0 0 0.4rem', letterSpacing: '0.8px' }}>
                {selectedFile ? selectedFile.name : 'Drag & Drop Fleet CSV File Here'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0 }}>
                or click to browse your computer &bull; Supports comma-delimited .csv up to 10 MB (Max 5,000 rows)
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
              <button
                type="button"
                onClick={downloadSampleCsv}
                style={{ background: 'none', border: 'none', color: 'var(--amber-glow)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
              >
                <i className="fa-solid fa-file-arrow-down"></i>
                Download Standard CSV Template
              </button>
              {selectedFile && (
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          </>
        )}

        {/* Error Alert */}
        {previewError && (
          <div className="login-alert error" style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>{previewError}</span>
          </div>
        )}

        {/* Loading Spinner for Preview */}
        {loadingPreview && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--amber-glow)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', marginBottom: '0.8rem' }}></i>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              Analyzing CSV Schema & Validating Rows...
            </div>
          </div>
        )}

        {/* Preview Section */}
        {previewData && !uploading && (
          <div style={{ marginTop: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Previewing First 5 Rows (Total: {previewData.totalRows} Rows Detected)
              </div>
              <span className={`pill-tag ${previewData.isValid ? 'optimal' : 'warning'}`}>
                {previewData.isValid ? 'SCHEMA VALIDATED' : `${previewData.sampleErrors.length} ERRORS FLAGGED`}
              </span>
            </div>

            <div className="records-table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="records-table" style={{ fontSize: '0.76rem' }}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Plate</th>
                    <th>Grade</th>
                    <th>Viscosity</th>
                    <th>Temp</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.previewRows.map((r) => (
                    <tr key={r.rowIndex}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#{r.rowIndex}</td>
                      <td>{r.parsed?.registrationNo || r.raw.registrationNo || 'N/A'}</td>
                      <td>{r.parsed?.saeBaseline || r.raw.saeBaseline || 'N/A'}</td>
                      <td>{r.parsed?.measuredViscosity || r.raw.measuredViscosity || '-'} cSt</td>
                      <td>{r.parsed?.temperature || r.raw.temperature || 27.5}°C</td>
                      <td>
                        <span className={`pill-tag ${r.valid ? 'optimal' : 'critical'}`} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem' }}>
                          {r.valid ? 'VALID' : 'ERROR'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.sampleErrors.length > 0 && (
              <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(255, 61, 0, 0.08)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255, 61, 0, 0.25)', fontSize: '0.76rem', color: 'var(--accent-red)' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.4rem' }}></i>
                Sample validation flags (invalid rows will be marked failed, not fatal):
                <ul style={{ margin: '0.3rem 0 0 1.2rem', padding: 0 }}>
                  {previewData.sampleErrors.slice(0, 3).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Real-time Processing Telemetry Bar */}
        {uploading && (
          <div className="batch-progress-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-gear fa-spin" style={{ color: 'var(--amber-glow)' }}></i>
                <strong style={{ fontFamily: 'var(--font-heading)', fontSize: '0.88rem', color: '#fff', textTransform: 'uppercase' }}>
                  Processing Batch: {selectedFile?.name}
                </strong>
              </div>
              <span className="pill-tag amber">
                {batchStatus?.toUpperCase() || 'INGESTING'}
              </span>
            </div>

            <div className="batch-progress-bar-outer">
              <div className="batch-progress-bar-inner" style={{ width: `${batchProgress}%` }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <span>Progress: {batchProgress}%</span>
              <span>
                Rows Computed: {processedCount} / {totalRowCount}
              </span>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.8rem', textAlign: 'center' }}>
              Running pure kinematic viscosity calculations & AI tribological risk synthesis in chunks of 25.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.6rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!previewData || uploading}
            onClick={handleStartUpload}
          >
            <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-bolt'}`} style={{ marginRight: '0.4rem' }}></i>
            {uploading ? 'Processing AI Pipeline...' : `Confirm & Process ${previewData ? previewData.totalRows : ''} Rows`}
          </button>
        </div>
      </div>
    </div>
  );
};
