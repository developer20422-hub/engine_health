import api from './client';

export const calcApi = {
  // Pure computation (No Math in Frontend!)
  compute: async (inputData) => {
    const res = await api.post('/calc', inputData);
    return res.data;
  },

  // Save diagnostic record
  saveCalculation: async (calcData) => {
    const res = await api.post('/calculations', calcData);
    return res.data;
  },

  // Fetch paginated calculation records
  getCalculations: async (params = {}) => {
    const res = await api.get('/calculations', { params });
    return res.data;
  },

  // Fetch single calculation details
  getCalculationById: async (id) => {
    const res = await api.get(`/calculations/${id}`);
    return res.data;
  },

  // Update calculation advisory or vehicle link
  patchCalculation: async (id, data) => {
    const res = await api.patch(`/calculations/${id}`, data);
    return res.data;
  },

  // Delete calculation
  deleteCalculation: async (id) => {
    const res = await api.delete(`/calculations/${id}`);
    return res.data;
  },
};
