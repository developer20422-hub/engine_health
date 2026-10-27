import api from './client';

export const vehicleApi = {
  getVehicles: async () => {
    const res = await api.get('/vehicles');
    return res.data;
  },
  createVehicle: async (vehicleData) => {
    const res = await api.post('/vehicles', vehicleData);
    return res.data;
  },
  getVehicleById: async (id) => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },
  patchVehicle: async (id, data) => {
    const res = await api.patch(`/vehicles/${id}`, data);
    return res.data;
  },
  deleteVehicle: async (id) => {
    const res = await api.delete(`/vehicles/${id}`);
    return res.data;
  },
};
