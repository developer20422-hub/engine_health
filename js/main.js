/**
 * LUBRISPEC - Landing Page Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const heroSlider = document.getElementById('hero-trans-slider');
  const heroDroplet = document.getElementById('hero-droplet');
  const heroTransVal = document.getElementById('hero-trans-val');
  const heroHealthVal = document.getElementById('hero-health-val');
  const heroRunVal = document.getElementById('hero-run-val');

  function getOilColor(transPercent) {
    if (transPercent >= 80) {
      const f = (transPercent - 80) / 20;
      return `rgb(${Math.round(245 + f * 9)}, ${Math.round(158 + f * 82)}, ${Math.round(11 + f * 127)})`;
    } else if (transPercent >= 55) {
      const f = (transPercent - 55) / 25;
      return `rgb(${Math.round(180 + f * 65)}, ${Math.round(83 + f * 75)}, ${Math.round(9 + f * 2)})`;
    } else if (transPercent >= 35) {
      const f = (transPercent - 35) / 20;
      return `rgb(${Math.round(120 + f * 60)}, ${Math.round(53 + f * 30)}, ${Math.round(15 - f * 6)})`;
    } else if (transPercent >= 18) {
      const f = (transPercent - 18) / 17;
      return `rgb(${Math.round(41 + f * 79)}, ${Math.round(21 + f * 32)}, ${Math.round(7 + f * 8)})`;
    } else {
      const f = Math.max(0, (transPercent - 5) / 13);
      return `rgb(${Math.round(10 + f * 31)}, ${Math.round(10 + f * 11)}, ${Math.round(12 - f * 5)})`;
    }
  }

  function updateHeroPreview() {
    if (!heroSlider || !heroDroplet) return;

    const val = parseInt(heroSlider.value, 10);
    const color = getOilColor(val);
    heroDroplet.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color} 65%, #000 100%)`;
    heroDroplet.style.boxShadow = `0 0 25px ${color}`;

    let stageDesc = 'Fresh Honey';
    if (val < 20) stageDesc = 'Pitch Black Soot';
    else if (val < 45) stageDesc = 'Dark Roast Carbon';
    else if (val < 70) stageDesc = 'Aged Amber';

    heroTransVal.textContent = `${val}% (${stageDesc})`;

    // Simulated quick calculation for hero preview
    const estHealth = Math.round(Math.pow(val / 100, 0.75) * 100);
    heroHealthVal.textContent = `${estHealth}%`;

    if (estHealth >= 75) {
      heroHealthVal.style.color = 'var(--status-optimal)';
      const safeKm = Math.round(7500 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km`;
      heroRunVal.style.color = '#ffffff';
    } else if (estHealth >= 45) {
      heroHealthVal.style.color = 'var(--status-stable)';
      const safeKm = Math.round(7500 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km`;
      heroRunVal.style.color = '#ffffff';
    } else if (estHealth >= 30) {
      heroHealthVal.style.color = 'var(--status-warning)';
      const safeKm = Math.round(7500 * ((estHealth - 25) / 75));
      heroRunVal.textContent = `+${safeKm.toLocaleString()} km (Soon)`;
      heroRunVal.style.color = 'var(--status-warning)';
    } else {
      heroHealthVal.style.color = 'var(--status-critical)';
      heroRunVal.textContent = `0 km (Flush Now)`;
      heroRunVal.style.color = 'var(--status-critical)';
    }
  }

  if (heroSlider) {
    heroSlider.addEventListener('input', updateHeroPreview);
    updateHeroPreview();
  }
});
