import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PinwheelLogo } from '../components/PinwheelLogo';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { orgApi } from '../api/orgApi';
import { vehicleApi } from '../api/vehicleApi';
import { calcApi } from '../api/calcApi';
import { batchApi } from '../api/batchApi';

const AVATAR_PRESETS = [
  'fa-solid fa-user-gear',
  'fa-solid fa-wrench',
  'fa-solid fa-shield-halved',
  'fa-solid fa-car-side',
  'fa-solid fa-gauge-high',
  'fa-solid fa-truck-fast',
  'fa-solid fa-bolt',
];

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'organisation', 'vehicles', 'history', 'batches', 'preferences', 'danger'
  const [toast, setToast] = useState(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [selectedPreset, setSelectedPreset] = useState(user?.avatarUrl?.startsWith('fa-') ? user.avatarUrl : AVATAR_PRESETS[0]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Organisation State
  const [orgData, setOrgData] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('garage');
  const [orgRegNo, setOrgRegNo] = useState('');
  const [orgContact, setOrgContact] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgStreet, setOrgStreet] = useState('');
  const [orgCity, setOrgCity] = useState('');
  const [orgState, setOrgState] = useState('');
  const [orgZip, setOrgZip] = useState('');
  const [orgMechanics, setOrgMechanics] = useState(1);
  const [orgFleet, setOrgFleet] = useState(0);

  // Invite Staff State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('mechanic');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Upgrade to Org State (for individuals)
  const [upgradeOrgName, setUpgradeOrgName] = useState('');
  const [upgradeOrgType, setUpgradeOrgType] = useState('garage');
  const [upgrading, setUpgrading] = useState(false);

  // Vehicles State
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [vehMake, setVehMake] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState(2022);
  const [vehEngine, setVehEngine] = useState('Naturally Aspirated Petrol');
  const [vehPlate, setVehPlate] = useState('');
  const [vehOdometer, setVehOdometer] = useState(25000);
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Calculations History State
  const [calculations, setCalculations] = useState([]);
  const [loadingCalcs, setLoadingCalcs] = useState(false);
  const [calcSearch, setCalcSearch] = useState('');
  const [calcStatusFilter, setCalcStatusFilter] = useState('all');

  // Batches State
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Preferences State
  const [prefUnits, setPrefUnits] = useState(user?.preferences?.units || 'km');
  const [prefTheme, setPrefTheme] = useState(user?.preferences?.theme || 'dark');
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Danger Zone State
  const [exportingData, setExportingData] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Sync user values
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatarUrl || '');
      setPrefUnits(user.preferences?.units || 'km');
      setPrefTheme(user.preferences?.theme || 'dark');
    }
  }, [user]);

  // Load Organisation details
  const fetchOrganisation = async () => {
    if (user?.organisationId) {
      try {
        setLoadingOrg(true);
        const res = await orgApi.getMyOrganisation();
        if (res.success && res.data) {
          setOrgData(res.data);
          setOrgName(res.data.name || '');
          setOrgType(res.data.type || 'garage');
          setOrgRegNo(res.data.registrationNo || '');
          setOrgContact(res.data.contactPerson || '');
          setOrgPhone(res.data.phone || '');
          setOrgStreet(res.data.address?.street || '');
          setOrgCity(res.data.address?.city || '');
          setOrgState(res.data.address?.state || '');
          setOrgZip(res.data.address?.zip || '');
          setOrgMechanics(res.data.mechanicsCount || 1);
          setOrgFleet(res.data.fleetSize || 0);
        }
      } catch (err) {
        console.warn('Could not load organisation:', err.message);
      } finally {
        setLoadingOrg(false);
      }
    }
  };

  // Load Vehicles
  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const res = await vehicleApi.getVehicles();
      if (res.success && res.data) {
        setVehicles(res.data);
      }
    } catch (err) {
      console.warn('Could not load vehicles:', err.message);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Load Calculations
  const fetchCalculations = async () => {
    try {
      setLoadingCalcs(true);
      const res = await calcApi.getCalculations({ limit: 50 });
      if (res.success && res.data?.items) {
        setCalculations(res.data.items);
      }
    } catch (err) {
      console.warn('Could not load calculations:', err.message);
    } finally {
      setLoadingCalcs(false);
    }
  };

  // Load Batches
  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      const res = await batchApi.getBatches();
      if (res.success && res.data) {
        setBatches(res.data);
      }
    } catch (err) {
      console.warn('Could not load batches:', err.message);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchOrganisation();
    fetchVehicles();
    fetchCalculations();
    fetchBatches();
  }, [user]);

  // Handlers
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const payload = {
        name,
        phone,
        avatarUrl: avatarUrl || selectedPreset,
      };
      const res = await updateProfile(payload);
      if (res.success) {
        setToast({ message: 'Profile details saved successfully.', type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match.', type: 'error' });
      return;
    }
    try {
      setChangingPassword(true);
      const res = await authApi.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setToast({ message: 'Password changed successfully.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveOrganisation = async (e) => {
    e.preventDefault();
    try {
      setSavingOrg(true);
      const payload = {
        name: orgName,
        type: orgType,
        registrationNo: orgRegNo,
        contactPerson: orgContact,
        phone: orgPhone,
        address: {
          street: orgStreet,
          city: orgCity,
          state: orgState,
          zip: orgZip,
          country: 'India',
        },
        mechanicsCount: Number(orgMechanics) || 1,
        fleetSize: Number(orgFleet) || 0,
      };
      const res = await orgApi.updateMyOrganisation(payload);
      if (res.success) {
        setOrgData(res.data);
        setToast({ message: 'Organisation details saved.', type: 'success' });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to update organisation', type: 'error' });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    try {
      setSendingInvite(true);
      const res = await orgApi.inviteStaff({ email: inviteEmail, role: inviteRole });
      if (res.success) {
        setToast({ message: res.data.message || 'Invitation sent successfully.', type: 'success' });
        setInviteModalOpen(false);
        setInviteEmail('');
        fetchOrganisation();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to send invitation', type: 'error' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this staff member from your organisation?')) return;
    try {
      const res = await orgApi.removeMember(memberId);
      if (res.success) {
        setToast({ message: 'Team member removed.', type: 'success' });
        fetchOrganisation();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to remove member', type: 'error' });
    }
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      setSavingVehicle(true);
      if (editingVehicleId) {
        const res = await vehicleApi.patchVehicle(editingVehicleId, {
          make: vehMake,
          model: vehModel,
          year: Number(vehYear),
          engineType: vehEngine,
          registrationNo: vehPlate,
          odometer: Number(vehOdometer),
        });
        if (res.success) {
          setToast({ message: 'Vehicle updated.', type: 'success' });
        }
      } else {
        const res = await vehicleApi.createVehicle({
          make: vehMake,
          model: vehModel,
          year: Number(vehYear),
          engineType: vehEngine,
          registrationNo: vehPlate,
          odometer: Number(vehOdometer),
        });
        if (res.success) {
          setToast({ message: 'Vehicle added to garage.', type: 'success' });
        }
      }
      setVehicleModalOpen(false);
      setEditingVehicleId(null);
      fetchVehicles();
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to save vehicle', type: 'error' });
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle from your registry?')) return;
    try {
      const res = await vehicleApi.deleteVehicle(id);
      if (res.success) {
        setToast({ message: 'Vehicle removed from registry.', type: 'success' });
        fetchVehicles();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to delete vehicle', type: 'error' });
    }
  };

  const handleDeleteCalculation = async (id) => {
    if (!window.confirm('Delete this diagnostic calculation record?')) return;
    try {
      const res = await calcApi.deleteCalculation(id);
      if (res.success) {
        setToast({ message: 'Record deleted.', type: 'success' });
        fetchCalculations();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to delete record', type: 'error' });
    }
  };

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Delete this CSV batch and all associated records?')) return;
    try {
      const res = await batchApi.deleteBatch(id);
      if (res.success) {
        setToast({ message: 'Batch deleted successfully.', type: 'success' });
        fetchBatches();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error?.message || 'Failed to delete batch', type: 'error' });
    }
  };

  const handleSavePreferences = async (units, theme) => {
    try {
      setSavingPrefs(true);
      setPrefUnits(units);
      setPrefTheme(theme);
      const res = await updateProfile({ preferences: { units, theme } });
      if (res.success) {
        setToast({ message: 'Preferences updated.', type: 'success' });
      }
    } catch (err) {
      setToast({ message: 'Failed to update preferences', type: 'error' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportingData(true);
      const res = await authApi.exportUserData();
      if (res.success) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(res.data, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `mech_online_data_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setToast({ message: 'Data export downloaded successfully.', type: 'success' });
      }
    } catch (err) {
      setToast({ message: 'Failed to export telemetry data', type: 'error' });
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      const res = await authApi.deleteAccount();
      if (res.success) {
        await logout();
        navigate('/', { replace: true });
      }
    } catch (err) {
      setToast({ message: 'Failed to deactivate account', type: 'error' });
    } finally {
      setDeletingAccount(false);
    }
  };

  // Filtered calculation list
  const filteredCalculations = useMemo(() => {
    return calculations.filter((calc) => {
      const plate = calc.vehicleId?.registrationNo || calc.customerName || '';
      const grade = calc.inputs?.saeBaseline || '';
      const rec = (calc.results?.serviceRecommendation || '').toLowerCase();

      const matchesSearch =
        plate.toLowerCase().includes(calcSearch.toLowerCase()) ||
        grade.toLowerCase().includes(calcSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (calcStatusFilter === 'all') return true;
      if (calcStatusFilter === 'optimal') return rec.includes('optimal') || rec.includes('stable');
      if (calcStatusFilter === 'warning') return rec.includes('soon') || rec.includes('warning');
      if (calcStatusFilter === 'critical') return rec.includes('critical');
      return true;
    });
  }, [calculations, calcSearch, calcStatusFilter]);

  const isOwner = user?.role === 'owner';
  const isOrgAccount = user?.accountType === 'organisation';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar badge="PROFILE & FLEET" />

      <main className="container" style={{ flex: 1, padding: '2.5rem 1.5rem' }}>
        {/* User Identity Hero Banner */}
        <div className="profile-hero-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
            <div className="profile-avatar-display">
              {avatarUrl && avatarUrl.startsWith('http') ? (
                <img src={avatarUrl} alt={user?.name} />
              ) : (
                <i className={selectedPreset}></i>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#fff', margin: 0 }}>
                  {user?.name || 'Certified Mechanic'}
                </h1>
                <span className={`pill-tag ${isOrgAccount ? 'cyan' : 'amber'}`}>
                  <i className={`fa-solid ${isOrgAccount ? 'fa-building-shield' : 'fa-user'}`} style={{ marginRight: '0.35rem' }}></i>
                  {isOrgAccount ? (orgData?.name || 'ORGANISATION') : 'INDIVIDUAL ENTHUSIAST'}
                </span>
                <span className="pill-tag" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                  ROLE: <strong style={{ color: isOwner ? 'var(--amber-glow)' : 'var(--accent-cyan)', marginLeft: '0.3rem' }}>{user?.role?.toUpperCase()}</strong>
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.35rem', display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                <span><i className="fa-solid fa-envelope" style={{ marginRight: '0.4rem', color: 'var(--amber-glow)' }}></i>{user?.email}</span>
                {user?.phone && <span><i className="fa-solid fa-phone" style={{ marginRight: '0.4rem', color: 'var(--amber-glow)' }}></i>{user.phone}</span>}
                <span><i className="fa-solid fa-ruler" style={{ marginRight: '0.4rem', color: 'var(--amber-glow)' }}></i>{user?.preferences?.units?.toUpperCase() || 'KM'} Unit System</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              className="btn-secondary"
              onClick={handleExportData}
              disabled={exportingData}
              title="Download backup of all vehicles, tests, and batches"
            >
              <i className="fa-solid fa-file-arrow-down" style={{ marginRight: '0.4rem' }}></i>
              {exportingData ? 'Exporting...' : 'Export Telemetry'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="profile-tabs-nav">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <i className="fa-solid fa-user-gear"></i>
            Personal & Security
          </button>

          {isOrgAccount && (
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'organisation' ? 'active' : ''}`}
              onClick={() => setActiveTab('organisation')}
            >
              <i className="fa-solid fa-building-shield"></i>
              Organisation & Team
            </button>
          )}

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            <i className="fa-solid fa-car-side"></i>
            {isOrgAccount ? 'Fleet Registry' : 'My Vehicles'} ({vehicles.length})
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fa-solid fa-clock-rotate-left"></i>
            Diagnostic History ({calculations.length})
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            <i className="fa-solid fa-file-csv"></i>
            CSV Batches ({batches.length})
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <i className="fa-solid fa-sliders"></i>
            Preferences
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'danger' ? 'active' : ''}`}
            onClick={() => setActiveTab('danger')}
            style={{ color: activeTab === 'danger' ? 'var(--accent-red)' : 'var(--text-muted)' }}
          >
            <i className="fa-solid fa-triangle-exclamation"></i>
            Danger Zone
          </button>
        </nav>

        {/* Tab 1: Personal Profile & Password */}
        {activeTab === 'personal' && (
          <div className="profile-grid-2col">
            {/* Edit Profile Card */}
            <div className="profile-card">
              <h2 style={{ fontSize: '1.15rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-id-card" style={{ color: 'var(--amber-glow)' }}></i>
                Personal Details
              </h2>

              <form onSubmit={handleSaveProfile}>
                <div className="field-group" style={{ marginBottom: '1rem' }}>
                  <label className="field-label">Operator / Mechanic Name</label>
                  <input
                    type="text"
                    className="input-custom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group" style={{ marginBottom: '1rem' }}>
                  <label className="field-label">Registered Email Address</label>
                  <input
                    type="email"
                    className="input-custom"
                    value={user?.email || ''}
                    disabled
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Email cannot be altered once verified.</small>
                </div>

                <div className="field-group" style={{ marginBottom: '1.2rem' }}>
                  <label className="field-label">Contact Phone</label>
                  <input
                    type="text"
                    className="input-custom"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                  />
                </div>

                <div className="field-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="field-label">Choose Avatar Icon Preset</label>
                  <div className="avatar-selector-grid">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`avatar-preset-btn ${selectedPreset === preset ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedPreset(preset);
                          setAvatarUrl('');
                        }}
                      >
                        <i className={preset}></i>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '0.4rem' }}></i>
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="profile-card">
              <h2 style={{ fontSize: '1.15rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-lock" style={{ color: 'var(--amber-glow)' }}></i>
                Security & Password
              </h2>

              <form onSubmit={handleChangePassword}>
                <div className="field-group" style={{ marginBottom: '1rem' }}>
                  <label className="field-label">Current Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="input-custom"
                      style={{ paddingRight: '2.8rem' }}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '0.8rem',
                        background: 'none',
                        border: 'none',
                        color: showCurrentPassword ? 'var(--amber-glow)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fa-solid ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: '1rem' }}>
                  <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>New Password</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Min 8 characters
                    </span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="input-custom"
                      style={{ paddingRight: '2.8rem' }}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '0.8rem',
                        background: 'none',
                        border: 'none',
                        color: showNewPassword ? 'var(--amber-glow)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="field-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="field-label">Confirm New Password</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="input-custom"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    minLength={8}
                    required
                  />
                </div>

                <button type="submit" className="btn-secondary" disabled={changingPassword}>
                  <i className="fa-solid fa-key" style={{ marginRight: '0.4rem' }}></i>
                  {changingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Organisation & Team */}
        {activeTab === 'organisation' && isOrgAccount && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* RBAC Notice for Staff */}
            {!isOwner && (
              <div className="login-alert warning" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255, 136, 0, 0.1)', border: '1px solid var(--amber-glow)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: '1.3rem', color: 'var(--amber-glow)' }}></i>
                <div>
                  <strong style={{ color: '#fff' }}>Staff View (Role: {user?.role?.toUpperCase()}):</strong>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Only the organisation owner ({orgData?.ownerId?.name || 'Owner'}) can update organization settings and invite or remove team members.
                  </div>
                </div>
              </div>
            )}

            {/* Organisation Profile Card */}
            <div className="profile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-warehouse" style={{ color: 'var(--amber-glow)' }}></i>
                  Organisation Settings
                </h2>
                <span className="pill-tag cyan">
                  TYPE: {orgType.toUpperCase()}
                </span>
              </div>

              <form onSubmit={handleSaveOrganisation}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.2rem' }}>
                  <div className="field-group">
                    <label className="field-label">Organisation / Garage Name</label>
                    <input
                      type="text"
                      className="input-custom"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      disabled={!isOwner}
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Business Classification</label>
                    <select
                      className="input-custom"
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      disabled={!isOwner}
                    >
                      <option value="garage">Independent Garage</option>
                      <option value="repair_shop">Authorized Repair Shop</option>
                      <option value="fleet">Commercial Fleet Operator</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Registration or GST Number</label>
                    <input
                      type="text"
                      className="input-custom"
                      value={orgRegNo}
                      onChange={(e) => setOrgRegNo(e.target.value)}
                      disabled={!isOwner}
                      placeholder="e.g. 27AAAPL1234F1Z8"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Contact Person</label>
                    <input
                      type="text"
                      className="input-custom"
                      value={orgContact}
                      onChange={(e) => setOrgContact(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Organisation Phone</label>
                    <input
                      type="text"
                      className="input-custom"
                      value={orgPhone}
                      onChange={(e) => setOrgPhone(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Workshop City & Pin</label>
                    <input
                      type="text"
                      className="input-custom"
                      value={orgCity ? `${orgCity}, ${orgZip}` : ''}
                      onChange={(e) => {
                        const parts = e.target.value.split(',');
                        setOrgCity(parts[0] ? parts[0].trim() : '');
                        setOrgZip(parts[1] ? parts[1].trim() : '');
                      }}
                      disabled={!isOwner}
                      placeholder="City, Pin code"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Mechanics Employed</label>
                    <input
                      type="number"
                      min="1"
                      className="input-custom"
                      value={orgMechanics}
                      onChange={(e) => setOrgMechanics(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Active Fleet / Capacity</label>
                    <input
                      type="number"
                      min="0"
                      className="input-custom"
                      value={orgFleet}
                      onChange={(e) => setOrgFleet(e.target.value)}
                      disabled={!isOwner}
                    />
                  </div>
                </div>

                {isOwner && (
                  <button type="submit" className="btn-primary" disabled={savingOrg}>
                    <i className="fa-solid fa-floppy-disk" style={{ marginRight: '0.4rem' }}></i>
                    {savingOrg ? 'Updating...' : 'Update Organisation Profile'}
                  </button>
                )}
              </form>
            </div>

            {/* Team Members List */}
            <div className="profile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-users-gear" style={{ color: 'var(--amber-glow)' }}></i>
                    Team Members & Roles
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '0.25rem 0 0' }}>
                    Staff share access to fleet vehicle telemetry and diagnostic test records.
                  </p>
                </div>

                {isOwner && (
                  <button className="btn-secondary" onClick={() => setInviteModalOpen(true)}>
                    <i className="fa-solid fa-user-plus" style={{ marginRight: '0.4rem' }}></i>
                    Invite Staff Member
                  </button>
                )}
              </div>

              {orgData?.members && orgData.members.length > 0 ? (
                <div className="records-table-container">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Mechanic / Member</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                        {isOwner && <th style={{ textAlign: 'right' }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {orgData.members.map((member) => {
                        const mUser = member.userId;
                        const isThisOwner = orgData.ownerId?._id === mUser?._id || member.role === 'owner';
                        return (
                          <tr key={member._id || mUser?._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-glow)', border: '1px solid var(--border-subtle)' }}>
                                  <i className="fa-solid fa-user-wrench"></i>
                                </div>
                                <span style={{ fontWeight: 600, color: '#fff' }}>{mUser?.name || 'Staff Member'}</span>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{mUser?.email}</td>
                            <td>
                              <span className={`pill-tag ${member.role === 'owner' ? 'amber' : 'cyan'}`}>
                                {member.role?.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              {new Date(member.addedAt || Date.now()).toLocaleDateString()}
                            </td>
                            {isOwner && (
                              <td style={{ textAlign: 'right' }}>
                                {!isThisOwner && (
                                  <button
                                    className="btn-danger-sm"
                                    onClick={() => handleRemoveMember(mUser?._id)}
                                    title="Remove from organisation"
                                    style={{ background: 'none', border: '1px solid rgba(255, 61, 0, 0.4)', color: 'var(--accent-red)', padding: '0.35rem 0.65rem', borderRadius: '4px', cursor: 'pointer' }}
                                  >
                                    <i className="fa-solid fa-user-minus"></i>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="fa-users"
                  title="No staff members registered"
                  description="Invite mechanics and diagnostic staff to share test logs."
                  actionText={isOwner ? "Invite First Member" : null}
                  onAction={() => setInviteModalOpen(true)}
                />
              )}

              {/* Pending Invitations */}
              {orgData?.invitations && orgData.invitations.length > 0 && (
                <div style={{ marginTop: '1.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.2rem' }}>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--amber-glow)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>
                    Pending Staff Invitations
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {orgData.invitations.map((inv) => (
                      <div
                        key={inv._id}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          padding: '0.5rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          fontSize: '0.82rem',
                        }}
                      >
                        <i className="fa-solid fa-envelope-open-text" style={{ color: 'var(--amber-glow)' }}></i>
                        <span>{inv.email}</span>
                        <span className="pill-tag cyan" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>{inv.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Vehicles / Fleet */}
        {activeTab === 'vehicles' && (
          <div className="profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-car-side" style={{ color: 'var(--amber-glow)' }}></i>
                  {isOrgAccount ? 'Shared Fleet Registry' : 'My Personal Vehicles'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '0.25rem 0 0' }}>
                  Vehicles linked to diagnostic calculations and 30-day oil life logs.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setEditingVehicleId(null);
                  setVehMake('');
                  setVehModel('');
                  setVehYear(2023);
                  setVehEngine('Naturally Aspirated Petrol');
                  setVehPlate('');
                  setVehOdometer(12000);
                  setVehicleModalOpen(true);
                }}
              >
                <i className="fa-solid fa-plus" style={{ marginRight: '0.4rem' }}></i>
                Register Vehicle
              </button>
            </div>

            {loadingVehicles ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : vehicles.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.2rem' }}>
                {vehicles.map((v) => (
                  <div
                    key={v._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1.3rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                        <div>
                          <span className="pill-tag amber" style={{ fontSize: '0.72rem', letterSpacing: '1px' }}>
                            {v.registrationNo}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setEditingVehicleId(v._id);
                              setVehMake(v.make);
                              setVehModel(v.model);
                              setVehYear(v.year);
                              setVehEngine(v.engineType);
                              setVehPlate(v.registrationNo);
                              setVehOdometer(v.odometer);
                              setVehicleModalOpen(true);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            title="Edit vehicle"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v._id)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                            title="Delete vehicle"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', color: '#fff', margin: '0 0 0.35rem' }}>
                        {v.make} {v.model}
                      </h3>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.9rem' }}>
                        {v.year} &bull; {v.engineType}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>CURRENT ODOMETER</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber-glow)', fontSize: '0.95rem' }}>
                        {v.odometer?.toLocaleString()} {user?.preferences?.units || 'km'}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="fa-car"
                title="No vehicles in registry"
                description="Add vehicles to track oil test history and remaining service life."
                actionText="Add Primary Vehicle"
                onAction={() => setVehicleModalOpen(true)}
              />
            )}
          </div>
        )}

        {/* Tab 4: Diagnostic History */}
        {activeTab === 'history' && (
          <div className="profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--amber-glow)' }}></i>
                  Diagnostic Test History
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '0.25rem 0 0' }}>
                  Calculation runs with OHI score, kinematic viscosity deviation, and advisory logs.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search by plate / grade..."
                  className="input-custom"
                  style={{ width: '220px', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  value={calcSearch}
                  onChange={(e) => setCalcSearch(e.target.value)}
                />
                <select
                  className="input-custom"
                  style={{ width: '130px', padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                  value={calcStatusFilter}
                  onChange={(e) => setCalcStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="optimal">Optimal</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {filteredCalculations.length > 0 ? (
              <div className="records-table-container">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Vehicle / Grade</th>
                      <th>OHI</th>
                      <th>RUL Remaining</th>
                      <th>Viscosity Dev</th>
                      <th>Recommendation</th>
                      <th>Tested Date</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalculations.map((c) => {
                      const status = (c.results?.serviceRecommendation || 'Optimal').toLowerCase();
                      const statusClass = status.includes('optimal') || status.includes('stable')
                        ? 'optimal'
                        : status.includes('critical')
                        ? 'critical'
                        : 'warning';

                      return (
                        <tr key={c._id}>
                          <td>
                            <strong style={{ color: '#fff' }}>{c.vehicleId?.registrationNo || c.customerName || 'Bench Diagnostic'}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {c.inputs?.saeBaseline} &bull; {c.inputs?.measuredViscosity} cSt
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber-glow)', fontSize: '1rem' }}>
                              {c.results?.ohi}/100
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            +{c.results?.rulKm?.toLocaleString()} {user?.preferences?.units || 'km'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>
                            {c.results?.devPct ? `${c.results.devPct > 0 ? '+' : ''}${c.results.devPct.toFixed(1)}%` : '0.0%'}
                          </td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>
                              {c.results?.serviceRecommendation}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteCalculation(c._id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem' }}
                              title="Delete record"
                            >
                              <i className="fa-solid fa-trash-can"></i>
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
                icon="fa-chart-line"
                title="No diagnostic records found"
                description="Run fresh oil degradation tests on the Diagnostic Bench."
                actionText="Go to Diagnostic Bench"
                onAction={() => navigate('/calculator')}
              />
            )}
          </div>
        )}

        {/* Tab 5: CSV Batches */}
        {activeTab === 'batches' && (
          <div className="profile-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fa-solid fa-file-csv" style={{ color: 'var(--amber-glow)' }}></i>
                  Bulk CSV Telemetry Batches
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '0.25rem 0 0' }}>
                  Batch calculation runs processed through the backend diagnostic engine.
                </p>
              </div>
            </div>

            {batches.length > 0 ? (
              <div className="records-table-container">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Row Count</th>
                      <th>Status</th>
                      <th>Uploaded Date</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <i className="fa-solid fa-file-csv" style={{ color: 'var(--amber-glow)', fontSize: '1.2rem' }}></i>
                            <strong style={{ color: '#fff' }}>{b.fileName}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{b.rowCount} rows</td>
                        <td>
                          <span className={`pill-tag ${b.status === 'done' ? 'optimal' : b.status === 'failed' ? 'critical' : 'amber'}`}>
                            {b.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteBatch(b._id)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                            title="Delete batch"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="fa-file-excel"
                title="No CSV batches uploaded yet"
                description="Bulk CSV uploads (enabled for organizations and mechanics) will appear here."
              />
            )}
          </div>
        )}

        {/* Tab 6: Preferences */}
        {activeTab === 'preferences' && (
          <div className="profile-card" style={{ maxWidth: '640px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-sliders" style={{ color: 'var(--amber-glow)' }}></i>
              Display & Unit Preferences
            </h2>

            <div className="field-group" style={{ marginBottom: '1.5rem' }}>
              <label className="field-label">Preferred Measurement Units</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <button
                  type="button"
                  className={`preset-btn ${prefUnits === 'km' ? 'active' : ''}`}
                  onClick={() => handleSavePreferences('km', prefTheme)}
                  style={{ padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-globe" style={{ marginRight: '0.4rem' }}></i>
                  Metric (Kilometres, °C)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${prefUnits === 'mi' ? 'active' : ''}`}
                  onClick={() => handleSavePreferences('mi', prefTheme)}
                  style={{ padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-flag-usa" style={{ marginRight: '0.4rem' }}></i>
                  Imperial (Miles, °F)
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Color Theme Interface</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <button
                  type="button"
                  className={`preset-btn ${prefTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleSavePreferences(prefUnits, 'dark')}
                  style={{ padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-moon" style={{ marginRight: '0.4rem' }}></i>
                  Obsidian Dark (Motorsport)
                </button>
                <button
                  type="button"
                  className={`preset-btn ${prefTheme === 'light' ? 'active' : ''}`}
                  onClick={() => handleSavePreferences(prefUnits, 'light')}
                  style={{ padding: '0.8rem', textAlign: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-sun" style={{ marginRight: '0.4rem' }}></i>
                  High-Contrast Diagnostic
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Danger Zone */}
        {activeTab === 'danger' && (
          <div className="danger-zone-card" style={{ maxWidth: '680px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              Danger Zone
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.8rem' }}>
              Export data backups or permanently deactivate your Mech Online operator profile and sessions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '0.92rem' }}>Export All Data (JSON)</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    Download a full snapshot of your profile, organisation, vehicles, and calculations.
                  </div>
                </div>
                <button className="btn-secondary" onClick={handleExportData} disabled={exportingData}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '0.4rem' }}></i>
                  {exportingData ? 'Generating Export...' : 'Download Export'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255, 61, 0, 0.08)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255, 61, 0, 0.35)', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <strong style={{ color: 'var(--accent-red)', fontSize: '0.92rem' }}>Deactivate Account</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    Revoke active tokens and soft-delete user records in compliance with privacy policies.
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                  onClick={() => setDeleteModalOpen(true)}
                >
                  <i className="fa-solid fa-skull-crossbones" style={{ marginRight: '0.4rem' }}></i>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add/Edit Vehicle */}
      {vehicleModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-car-side" style={{ color: 'var(--amber-glow)' }}></i>
              {editingVehicleId ? 'Edit Vehicle' : 'Register New Vehicle'}
            </h3>

            <form onSubmit={handleSaveVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                <div className="field-group">
                  <label className="field-label">Make</label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="e.g. Tata"
                    value={vehMake}
                    onChange={(e) => setVehMake(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Model</label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="e.g. Nexon"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' }}>
                <div className="field-group">
                  <label className="field-label">Year</label>
                  <input
                    type="number"
                    min="1980"
                    max="2027"
                    className="input-custom"
                    value={vehYear}
                    onChange={(e) => setVehYear(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Engine Type</label>
                  <select
                    className="input-custom"
                    value={vehEngine}
                    onChange={(e) => setVehEngine(e.target.value)}
                  >
                    <option value="Naturally Aspirated Petrol">Naturally Aspirated Petrol</option>
                    <option value="Turbo Petrol">Turbo Petrol</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '1.4rem' }}>
                <div className="field-group">
                  <label className="field-label">Registration Plate</label>
                  <input
                    type="text"
                    className="input-custom"
                    placeholder="e.g. MH-12-AB-9821"
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Odometer ({user?.preferences?.units || 'km'})</label>
                  <input
                    type="number"
                    min="0"
                    className="input-custom"
                    value={vehOdometer}
                    onChange={(e) => setVehOdometer(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setVehicleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingVehicle}>
                  {savingVehicle ? 'Saving...' : editingVehicleId ? 'Update Vehicle' : 'Save to Garage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Staff */}
      {inviteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.15rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-user-plus" style={{ color: 'var(--amber-glow)' }}></i>
              Invite Team Member
            </h3>

            <form onSubmit={handleSendInvite}>
              <div className="field-group" style={{ marginBottom: '1rem' }}>
                <label className="field-label">Staff Member Email</label>
                <input
                  type="email"
                  className="input-custom"
                  placeholder="mechanic@workshop.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field-group" style={{ marginBottom: '1.4rem' }}>
                <label className="field-label">Assign Role</label>
                <select
                  className="input-custom"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="mechanic">Mechanic (Can log diagnostic tests and inspect fleet)</option>
                  <option value="viewer">Viewer (Read-only access to records)</option>
                  <option value="staff">Staff (Standard operational staff)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setInviteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={sendingInvite}>
                  {sendingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Account */}
      {deleteModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ borderColor: 'var(--accent-red)' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              Confirm Account Deactivation
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Are you sure you want to deactivate your Mech Online account? All active sessions and access to telemetry records will be immediately revoked.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
