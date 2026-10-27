import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PinwheelLogo } from '../components/PinwheelLogo';

export const Home = () => {
  const [transmittance, setTransmittance] = useState(88);

  // Dynamic preview computation for hero HUD
  const getDropletColor = (t) => {
    if (t >= 80) return '#f59e0b'; // Fresh Gold
    if (t >= 55) return '#b45309'; // Warm Amber
    if (t >= 35) return '#78350f'; // Dark Brown
    return '#1c1917'; // Soot Black
  };

  const getPredictedHealth = (t) => {
    return Math.min(100, Math.max(10, Math.round(t * 1.03)));
  };

  const getSafeRunMargin = (t) => {
    const km = Math.round((t / 100) * 7500);
    return `+${km.toLocaleString()} km`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar badge="SYSTEM V2" />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="pill-tag-group">
                <span className="pill-tag amber">
                  <i className="fa-solid fa-atom"></i> OIL HEALTH ANALYSIS
                </span>
                <span className="pill-tag">
                  <i className="fa-solid fa-droplet"></i> VISCOSITY TEST
                </span>
                <span className="pill-tag">
                  <i className="fa-solid fa-clock"></i> REMAINING LIFE
                </span>
              </div>

              <h1 className="hero-title">
                <div className="title-row-with-pinwheel">
                  <span>PREDICTIVE</span>
                  <PinwheelLogo size={38} />
                  <span className="glow-amber">FLUID</span>
                </div>
                <div>INTELLIGENCE</div>
              </h1>

              <p className="hero-desc">
                Next-generation fluid mechanics evaluating physical <strong>kinematic consistency</strong> and{' '}
                <strong>optical light transmittance</strong> to forecast Remaining Useful Life (RUL) and prevent journal
                bearing breakdown.
              </p>

              <div className="hero-actions">
                <Link to="/calculator" className="btn-primary">
                  <i className="fa-solid fa-calculator" style={{ marginRight: '0.4rem' }}></i>
                  Diagnostic Bench
                </Link>
                <Link to="/dashboard" className="btn-secondary">
                  <i className="fa-solid fa-chart-line" style={{ marginRight: '0.4rem' }}></i>
                  Fleet Records
                </Link>
              </div>

              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-num">SAE RATED</div>
                  <div className="stat-label">Viscosity Baseline</div>
                </div>
                <div className="stat-item">
                  <div className="stat-num">&plusmn; 2.5%</div>
                  <div className="stat-label">Model Accuracy</div>
                </div>
                <div className="stat-item">
                  <div className="stat-num">100%</div>
                  <div className="stat-label">Deterministic Math</div>
                </div>
              </div>
            </div>

            {/* Right: Cybernetic Liquid Chamber & Floating Race Card */}
            <div style={{ position: 'relative' }}>
              <div className="hero-card-hud">
                <div className="hud-header">
                  <div className="hud-title">
                    <i className="fa-solid fa-eye-dropper" style={{ color: 'var(--amber-glow)', marginRight: '0.4rem' }}></i>
                    Optical Transmittance Sensor
                  </div>
                  <div className="hud-live-indicator">
                    <span className="pulse-dot"></span> LIVE DATA
                  </div>
                </div>

                <div className="droplet-simulator">
                  <div className="droplet-chamber">
                    <div
                      className="droplet-liquid"
                      id="hero-droplet"
                      style={{
                        backgroundColor: getDropletColor(transmittance),
                        boxShadow: `0 0 25px ${getDropletColor(transmittance)}55`,
                      }}
                    ></div>
                  </div>

                  <div className="hud-slider-group">
                    <div className="hud-slider-label">
                      <span>Fluid Light Transmittance</span>
                      <span className="hud-slider-val" id="hero-trans-val">
                        {transmittance}% ({transmittance >= 75 ? 'Fresh Amber' : transmittance >= 45 ? 'Degraded Amber' : 'Soot Saturated'})
                      </span>
                    </div>
                    <input
                      type="range"
                      id="hero-trans-slider"
                      min="5"
                      max="98"
                      value={transmittance}
                      onChange={(e) => setTransmittance(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="hud-stats-grid">
                  <div className="stat-box">
                    <div className="stat-tag-label">Predicted Health</div>
                    <div
                      className="stat-tag-val"
                      id="hero-health-val"
                      style={{
                        color: transmittance >= 60 ? 'var(--status-optimal)' : transmittance >= 35 ? 'var(--amber-glow)' : 'var(--status-critical)',
                      }}
                    >
                      {getPredictedHealth(transmittance)}%
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-tag-label">Safe Run Margin</div>
                    <div className="stat-tag-val" id="hero-run-val">
                      {getSafeRunMargin(transmittance)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture / 3-Card Grid */}
      <section className="section-wrapper" id="architecture">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">
              <i className="fa-solid fa-microchip" style={{ marginRight: '0.4rem' }}></i> FOUNDRY ARCHITECTURE
            </span>
            <h2 className="section-title">
              <span>TRIBO</span>
              <PinwheelLogo size={24} />
              <span>FOUNDATION</span>
            </h2>
            <p className="section-sub">
              The mathematical sub-systems and fluid physics measuring oil degradation across thermal, mechanical, and
              optical vectors.
            </p>
          </div>

          <div className="cards-grid-3">
            <div className="feature-card">
              <div className="card-icon">
                <i className="fa-solid fa-water"></i>
              </div>
              <span className="card-role-badge">TRIBOLOGICAL CORE</span>
              <h3>Kinematic Viscosity Ratio</h3>
              <p>
                Thermal shearing in crankpin journals shears down polymer Viscosity Index Improvers, while sustained
                high-temperature oxidation polymerizes hydrocarbons into sludge. We compare actual cSt against SAE baseline
                specs.
              </p>
              <span className="card-formula-chip">R_v = &nu;_current / &nu;_nominal</span>
            </div>

            <div className="feature-card">
              <div className="card-icon">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <span className="card-role-badge">OPTICAL ANALYSIS</span>
              <h3>Light Penetration &amp; Soot</h3>
              <p>
                Sub-micron carbon soot, nitration polymers, and blow-by particulates absorb light photons. Optical
                transmittance decays non-linearly, giving an exact photometric assessment of particulate loading.
              </p>
              <span className="card-formula-chip">T = T_0 &middot; e^(-&alpha; &middot; C_soot)</span>
            </div>

            <div className="feature-card">
              <div className="card-icon">
                <i className="fa-solid fa-chart-line"></i>
              </div>
              <span className="card-role-badge">PREDICTIVE MODEL</span>
              <h3>Remaining Useful Life (RUL)</h3>
              <p>
                Our formula synthesizes consistency deviation and optical soot saturation with base oil chemistry and engine
                duty cycle to predict remaining kilometers before boundary metal friction occurs.
              </p>
              <span className="card-formula-chip">RUL_km = D_max &middot; M_duty &middot; [(OHI - 25) / 75]</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Stage Visual Degradation Spectrum */}
      <section className="section-wrapper" id="spectrum" style={{ background: 'rgba(12, 11, 15, 0.7)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-badge">
              <i className="fa-solid fa-palette" style={{ marginRight: '0.4rem' }}></i> OPTICAL BENCHMARK
            </span>
            <h2 className="section-title">
              <span>DEGRADATION</span>
              <PinwheelLogo size={24} />
              <span>SPECTRUM</span>
            </h2>
            <p className="section-sub">
              The 5 stages of fluid degradation visual reference for dipstick inspection and fluid condition checks.
            </p>
          </div>

          <div className="spectrum-stages">
            <div className="stage-card">
              <div className="stage-swatch swatch-1"></div>
              <h4 className="stage-title">Fresh Induction</h4>
              <div className="stage-trans">85% - 100% Light Transmittance</div>
              <p className="stage-desc">
                Translucent golden honey. Full additive reserve, zero soot suspension, optimal boundary protection.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-swatch swatch-2"></div>
              <h4 className="stage-title">Mid-Life Stable</h4>
              <div className="stage-trans">60% - 84% Light Transmittance</div>
              <p className="stage-desc">
                Warm caramel amber. Normal thermal coloration; active detergent pack actively suspending sub-micron carbon.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-swatch swatch-3"></div>
              <h4 className="stage-title">Degraded Amber</h4>
              <div className="stage-trans">35% - 59% Light Transmittance</div>
              <p className="stage-desc">
                Dark roasted brown. Antioxidants partially depleted; viscosity shifts begin from high-shear mechanical stress.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-swatch swatch-4"></div>
              <h4 className="stage-title">Soot Saturated</h4>
              <div className="stage-trans">15% - 34% Light Transmittance</div>
              <p className="stage-desc">
                Deep black with opaque edges. Common in direct-injection diesels; dispersants reaching threshold capacity.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-swatch swatch-5"></div>
              <h4 className="stage-title">Critical Sludge</h4>
              <div className="stage-trans">&lt; 15% Light Transmittance</div>
              <p className="stage-desc">
                Pitch black, viscous sludge. Severe risk of ring sticking, filter bypass valve opening, and journal starvation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Action CTA Banner */}
      <section className="section-wrapper" style={{ paddingTop: '1rem', paddingBottom: '4rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(255,136,0,0.12) 0%, rgba(19,18,23,0.9) 100%)',
              border: '1px solid var(--border-amber)',
              borderRadius: 'var(--radius-lg)',
              padding: '3.5rem 2rem',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <h2 style={{ fontSize: '2rem', letterSpacing: '1px', marginBottom: '1rem' }}>
              READY TO EVALUATE YOUR FLEET ENGINE OIL?
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Launch the live Diagnostic Bench to compute kinematic shear, optical degradation, and Remaining Useful Life directly via our ASTM D1200 engine.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/calculator" className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                <i className="fa-solid fa-calculator" style={{ marginRight: '0.5rem' }}></i>
                Launch Diagnostic Bench
              </Link>
              <Link to="/dashboard" className="btn-secondary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
                <i className="fa-solid fa-chart-line" style={{ marginRight: '0.5rem' }}></i>
                Inspect Fleet Records
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
