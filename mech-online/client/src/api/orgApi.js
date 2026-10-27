import api from './client';

export const orgApi = {
  getMyOrganisation: async () => {
    const res = await api.get('/organisations/me');
    return res.data;
  },
  updateMyOrganisation: async (data) => {
    const res = await api.patch('/organisations/me', data);
    return res.data;
  },
  inviteStaff: async (data) => {
    const res = await api.post('/organisations/invite', data);
    return res.data;
  },
  removeMember: async (memberId) => {
    const res = await api.delete(`/organisations/members/${memberId}`);
    return res.data;
  },
  cancelInvitation: async (inviteId) => {
    const res = await api.delete(`/organisations/invitations/${inviteId}`);
    return res.data;
  },
};
