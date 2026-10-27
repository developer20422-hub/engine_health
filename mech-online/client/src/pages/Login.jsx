import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PinwheelLogo } from '../components/PinwheelLogo';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/Toast';
import { vehicleApi } from '../api/vehicleApi';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [accountType, setAccountType] = useState('individual'); // 'individual' or 'organisation'

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');


  // Individual Specific Fields
  const [preferredUnits, setPreferredUnits] = useState('km');
  const [hasInitialVehicle, setHasInitialVehicle] = useState(false);
  const [vehMake, setVehMake] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehYear, setVehYear] = useState(2022);
  const [vehEngine, setVehEngine] = useState('Naturally Aspirated Petrol');
  const [vehPlate, setVehPlate] = useState('');
  const [vehOdometer, setVehOdometer] = useState(24000);

  // Organisation Specific Fields
  const [organisationName, setOrganisationName] = useState('');
  const [organisationType, setOrganisationType] = useState('garage');
  const [registrationNo, setRegistrationNo] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [zip, setZip] = useState('');
  const [mechanicsCount, setMechanicsCount] = useState(4);
  const [fleetSize, setFleetSize] = useState(12);
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        const payload = {
          name,
          email,
          password,
          phone,
          accountType,
          ...(accountType === 'organisation'
            ? {
                organisationName,
                organisationType,
                registrationNo,
                contactPerson: contactPerson || name,
                mechanicsCount: Number(mechanicsCount) || 1,
                fleetSize: Number(fleetSize) || 0,
                logoUrl,
                address: {
                  street,
                  city,
                  state: stateName,
                  zip,
                  country: 'India',
                },
              }
            : {
                preferences: { units: preferredUnits, theme: 'dark' },
              }),
        };

        const res = await register(payload);
        if (res.success) {
          // If individual added an initial vehicle, register it now
          if (accountType === 'individual' && hasInitialVehicle && vehMake && vehModel && vehPlate) {
            try {
              await vehicleApi.createVehicle({
                make: vehMake,
                model: vehModel,
                year: Number(vehYear),
                engineType: vehEngine,
                registrationNo: vehPlate,
                odometer: Number(vehOdometer) || 0,
              });
            } catch (vErr) {
              console.warn('Initial vehicle registration deferred:', vErr.message);
            }
          }

          setSuccessMessage('Registration successful! Redirecting to fleet dashboard...');
          setTimeout(() => {
            const redirectPath = location.state?.from?.pathname || '/dashboard';
            navigate(redirectPath, { replace: true });
          }, 900);
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          setSuccessMessage('Credentials verified! Redirecting to fleet dashboard...');
          setTimeout(() => {
            const redirectPath = location.state?.from?.pathname || '/dashboard';
            navigate(redirectPath, { replace: true });
          }, 800);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Authentication failed. Please verify credentials.';
      setErrorMessage(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar badge="PORTAL" />

      <main
        className="container"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
        }}
      >
        <div className="login-card-wrapper" style={{ width: '100%', maxWidth: isRegistering && accountType === 'organisation' ? '680px' : '520px', transition: 'max-width 0.3s ease' }}>
          {/* Top Branding Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="pill-tag amber" style={{ marginBottom: '1rem' }}>
              <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.4rem' }}></i>
              {isRegistering ? 'CREATE NEW ACCOUNT' : 'MECHANIC ACCESS PORTAL'}
            </div>
            <h1 style={{ fontSize: '2rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              <span>{isRegistering ? 'PORTAL' : 'AUTHENTICATE'}</span>
              <PinwheelLogo size={26} />
              <span className="glow-amber">{isRegistering ? 'SIGNUP' : 'ACCESS'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.4rem' }}>
              {isRegistering
                ? 'Register for a certified account to store and track 30-day oil telemetry.'
                : 'Sign in to view past 30 days oil test generation and vehicle records.'}
            </p>
          </div>

          {/* Account Type Toggle (for registration) */}
          {isRegistering && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'var(--bg-input)',
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                className={`preset-btn ${accountType === 'individual' ? 'active' : ''}`}
                style={{ textAlign: 'center', justifyContent: 'center' }}
                onClick={() => setAccountType('individual')}
              >
                <i className="fa-solid fa-user" style={{ marginRight: '0.3rem' }}></i>
                Individual / Enthusiast
              </button>
              <button
                type="button"
                className={`preset-btn ${accountType === 'organisation' ? 'active' : ''}`}
                style={{ textAlign: 'center', justifyContent: 'center' }}
                onClick={() => setAccountType('organisation')}
              >
                <i className="fa-solid fa-warehouse" style={{ marginRight: '0.3rem' }}></i>
                Organisation / Garage / Fleet
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="login-alert error" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="login-alert success" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <i className="fa-solid fa-circle-check"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off">
            {isRegistering && (
              <div style={{ display: 'grid', gridTemplateColumns: accountType === 'organisation' ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div className="field-group">
                  <label htmlFor="reg-name" className="field-label">
                    <i className="fa-solid fa-id-badge" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                    {accountType === 'organisation' ? 'Owner / Primary Contact Name' : 'Full Name / Operator'}
                  </label>
                  <input
                    type="text"
                    id="reg-name"
                    className="input-custom"
                    placeholder="e.g. Vikram Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="reg-phone" className="field-label">
                    <i className="fa-solid fa-phone" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    id="reg-phone"
                    className="input-custom"
                    placeholder="+91 98200 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Organisation Specific Fields */}
            {isRegistering && accountType === 'organisation' && (
              <div style={{ background: 'rgba(255, 136, 0, 0.04)', border: '1px solid rgba(255, 136, 0, 0.2)', borderRadius: 'var(--radius-sm)', padding: '1.2rem', marginBottom: '1.4rem' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: 'var(--amber-glow)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <i className="fa-solid fa-building-shield" style={{ marginRight: '0.4rem' }}></i>
                  Organisation Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="field-group">
                    <label className="field-label">Garage / Workshop Name</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="e.g. Apex Performance Garage"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Business Type</label>
                    <select
                      className="input-custom"
                      value={organisationType}
                      onChange={(e) => setOrganisationType(e.target.value)}
                    >
                      <option value="garage">Independent Garage</option>
                      <option value="repair_shop">Authorized Repair Shop</option>
                      <option value="fleet">Commercial Fleet Operator</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="field-group">
                    <label className="field-label">Registration / GST Number</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Workshop City / Location</label>
                    <input
                      type="text"
                      className="input-custom"
                      placeholder="e.g. Pune, MH"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="field-group">
                    <label className="field-label">Number of Mechanics</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className="input-custom"
                      value={mechanicsCount}
                      onChange={(e) => setMechanicsCount(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Fleet / Bay Capacity</label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      className="input-custom"
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Individual Preferences & Initial Vehicle */}
            {isRegistering && accountType === 'individual' && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div className="field-group" style={{ marginBottom: '1rem' }}>
                  <label className="field-label">Preferred Unit System</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`preset-btn ${preferredUnits === 'km' ? 'active' : ''}`}
                      onClick={() => setPreferredUnits('km')}
                    >
                      Metric (km, °C)
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${preferredUnits === 'mi' ? 'active' : ''}`}
                      onClick={() => setPreferredUnits('mi')}
                    >
                      Imperial (mi, °F)
                    </button>
                  </div>
                </div>

                {/* Option to add primary vehicle during signup */}
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.9rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={hasInitialVehicle}
                      onChange={(e) => setHasInitialVehicle(e.target.checked)}
                      style={{ accentColor: 'var(--amber-primary)', width: '16px', height: '16px' }}
                    />
                    <span>Add primary vehicle to my garage now (optional)</span>
                  </label>

                  {hasInitialVehicle && (
                    <div style={{ marginTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <input
                        type="text"
                        placeholder="Make (e.g. Tata)"
                        className="input-custom"
                        value={vehMake}
                        onChange={(e) => setVehMake(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Model (e.g. Harrier)"
                        className="input-custom"
                        value={vehModel}
                        onChange={(e) => setVehModel(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Plate (e.g. MH-12-DE-1049)"
                        className="input-custom"
                        value={vehPlate}
                        onChange={(e) => setVehPlate(e.target.value)}
                      />
                      <select
                        className="input-custom"
                        value={vehEngine}
                        onChange={(e) => setVehEngine(e.target.value)}
                      >
                        <option value="Naturally Aspirated Petrol">NA Petrol</option>
                        <option value="Turbo Petrol">Turbo Petrol</option>
                        <option value="Diesel">Diesel</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email and Password */}
            <div className="field-group" style={{ marginBottom: '1.2rem' }}>
              <label htmlFor="login-email" className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  <i className="fa-solid fa-envelope" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                  Email Address
                </span>
                {!isRegistering && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Demo: demo@mech-online.com
                  </span>
                )}
              </label>
              <input
                type="email"
                id="login-email"
                className="input-custom"
                placeholder="mechanic@workshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group" style={{ marginBottom: '1.4rem' }}>
              <label htmlFor="login-password" className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <i className="fa-solid fa-lock" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                  Password
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {isRegistering ? 'Min 8 characters' : ''}
                </span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  className="input-custom"
                  style={{ paddingRight: '2.8rem' }}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isRegistering ? 8 : 1}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    background: 'none',
                    border: 'none',
                    color: showPassword ? 'var(--amber-glow)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    transition: 'color 0.2s ease',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>


            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem' }}
              disabled={loading}
            >
              <i
                className={`fa-solid ${isRegistering ? 'fa-user-plus' : 'fa-right-to-bracket'}`}
                style={{ marginRight: '0.4rem' }}
              ></i>
              {loading ? 'Processing...' : isRegistering ? 'Complete Registration' : 'Authenticate Session'}
            </button>

            {/* Toggle Between Login and Register */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isRegistering ? (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--amber-glow)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => {
                      setIsRegistering(false);
                      setErrorMessage('');
                    }}
                  >
                    Sign In here
                  </button>
                </span>
              ) : (
                <span>
                  Need an operator or garage account?{' '}
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--amber-glow)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => {
                      setIsRegistering(true);
                      setErrorMessage('');
                    }}
                  >
                    Register here
                  </button>
                </span>
              )}
            </div>
          </form>
        </div>
      </main>

      <Footer />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
