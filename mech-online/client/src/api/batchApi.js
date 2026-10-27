import api from './client';

export const batchApi = {
  // Preview first 5 rows & sample errors without creating batch
  previewCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/batches/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Upload and kick off background batch processing
  uploadCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/batches/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Real-time batch progress poll
  getBatchById: async (id) => {
    const res = await api.get(`/batches/${id}`);
    return res.data;
  },

  // Paginated batch rows with server-side search, sort & filter
  getBatchRows: async (id, params = {}) => {
    const res = await api.get(`/batches/${id}/rows`, { params });
    return res.data;
  },

  // List all batches
  getBatches: async () => {
    const res = await api.get('/batches');
    return res.data;
  },

  // Rename a batch file name
  renameBatch: async (id, fileName) => {
    const res = await api.patch(`/batches/${id}`, { fileName });
    return res.data;
  },

  // Retry failed rows in a batch
  retryFailedRows: async (id) => {
    const res = await api.post(`/batches/${id}/retry`);
    return res.data;
  },

  // Download styled Excel (.xlsx) file
  downloadExcel: async (id, fileName = 'report.xlsx') => {
    const res = await api.get(`/batches/${id}/export/excel`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // Download plain formatted CSV file
  downloadCsv: async (id, fileName = 'report.csv') => {
    const res = await api.get(`/batches/${id}/export/csv`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  },

  // Delete batch and cascade delete rows
  deleteBatch: async (id) => {
    const res = await api.delete(`/batches/${id}`);
    return res.data;
  },
};
