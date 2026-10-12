/**
 * LUBRISPEC - Futuristic Landing Page Interactive Oil Health Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const heroSlider = document.getElementById('hero-trans-slider');
  const heroDroplet = document.getElementById('hero-droplet');
  const heroTransVal = document.getElementById('hero-trans-val');
  const heroHealthVal = document.getElementById('hero-health-val');
  const heroRunVal = document.getElementById('hero-run-val');
  const heroFloatingMetric = document.getElementById('hero-floating-metric');

  function getOilColor(transPercent) {
    if (transPercent >= 80) {
      const f = (transPercent - 80) / 20;
      return `rgb(${Math.round(255 - f * 10)}, ${Math.round(153 + f * 92)}, ${Math.round(0 + f * 140)})`;
    } else if (transPercent >= 55) {
      const f = (transPercent - 55) / 25;
      return `rgb(${Math.round(204 + f * 51)}, ${Math.round(85 + f * 68)}, ${Math.round(0)})`;
    } else if (transPercent >= 35) {
      const f = (transPercent - 35) / 20;
      return `rgb(${Math.round(130 + f * 74)}, ${Math.round(40 + f * 45)}, ${Math.round(0)})`;
    } else if (transPercent >= 18) {
      const f = (transPercent - 18) / 17;
      return `rgb(${Math.round(50 + f * 80)}, ${Math.round(15 + f * 25)}, ${Math.round(4)})`;
    } else {
      const f = Math.max(0, (transPercent - 5) / 13);
      return `rgb(${Math.round(12 + f * 38)}, ${Math.round(9 + f * 6)}, ${Math.round(11 - f * 7)})`;
    }
  }

  function updateHeroPreview() {
    if (!heroSlider || !heroDroplet) return;

    const val = parseInt(heroSlider.value, 10);
    const color = getOilColor(val);
    heroDroplet.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color} 65%, #050508 100%)`;
    heroDroplet.style.boxShadow = `0 0 30px ${color}`;

    let stageDesc = 'Fresh Gold';
    if (val < 18) stageDesc = 'Pitch Black Soot';
    else if (val < 40) stageDesc = 'High Carbon Dark';
    else if (val < 65) stageDesc = 'Aged Amber';

    heroTransVal.textContent = `${val}% (${stageDesc})`;

    // Simulated calculation for rapid hero preview
    const estHealth = Math.round(Math.pow(val / 100, 0.75) * 100);
    heroHealthVal.textContent = `${estHealth}%`;

    if (estHealth >= 75) {
      heroHealthVal.style.color = 'var(--status-optimal)';
      const safeKm = Math.round(7800 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km`;
      heroRunVal.style.color = '#ffffff';
      if (heroFloatingMetric) heroFloatingMetric.textContent = `+${safeKm.toLocaleString()}km`;
    } else if (estHealth >= 45) {
      heroHealthVal.style.color = 'var(--status-stable)';
      const safeKm = Math.round(7800 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km`;
      heroRunVal.style.color = '#ffffff';
      if (heroFloatingMetric) heroFloatingMetric.textContent = `+${safeKm.toLocaleString()}km`;
    } else if (estHealth >= 30) {
      heroHealthVal.style.color = 'var(--amber-glow)';
      const safeKm = Math.round(7800 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km (Soon)`;
      heroRunVal.style.color = 'var(--amber-glow)';
      if (heroFloatingMetric) heroFloatingMetric.textContent = `+${safeKm.toLocaleString()}km`;
    } else {
      heroHealthVal.style.color = 'var(--status-critical)';
      heroRunVal.textContent = `0 km (Flush Now)`;
      heroRunVal.style.color = 'var(--status-critical)';
      if (heroFloatingMetric) heroFloatingMetric.textContent = `0 km FLUSH`;
    }
  }

  if (heroSlider) {
    heroSlider.addEventListener('input', updateHeroPreview);
    updateHeroPreview();
  }
});
