# 🛢️ LUBRISPEC — Precision Engine Oil Degradation & Life Diagnostic System

> **Mechanical Engineering Online Project &bull; Tribology & Fluid Mechanics**  
> Predicts internal combustion engine lubricant Remaining Useful Life (RUL) and service change intervals based on physical **Kinematic Consistency (cSt)** and **Optical Transmittance / Transparency (%)**.

---

## 🌟 Key Highlights

- **Pure Deterministic Formulas**: Built on tribological fluid mechanics (ASTM D445 viscosity standards, modified Beer-Lambert optical soot decay law, and duty-cycle scaling).
- **Automotive Mechanic Dark HUD Aesthetic**: Designed specifically with high contrast, tactile sliders, interactive droplet fluid simulation, and dark workshop styling.
- **Two Complete Desktop Pages**:
  1. [`index.html`](./index.html) — **Project Landing Page**: Automotive theory, 5-stage degradation spectrum, formula cards, and interactive droplet simulator.
  2. [`calculator.html`](./calculator.html) — **Diagnostic Calculation Bench**: Real-time multi-variable calculator, circular SVG health gauge, dynamic Chart.js degradation trajectory curve, mechanic advisory recommendations, and printable work orders.
- **Zero-Dependency Static Architecture**: Pure HTML5, CSS3, and modern Vanilla JavaScript. 100% compatible with **GitHub Pages** out of the box.
- **Appropriate Custom Skill Included**: Check [`.agents/skills/engine-oil-analysis/SKILL.md`](./.agents/skills/engine-oil-analysis/SKILL.md) for complete engineering documentation and equations.

---

## 📐 Mathematical Formulation

### 1. Viscosity Consistency Score ($S_{\text{visc}}$)
Evaluates deviation from baseline SAE grade (e.g., 10.5 cSt for 5W-30 at 100°C):
$$R_v = \frac{\nu_{\text{measured}}}{\nu_{\text{nominal}}}$$
$$S_{\text{visc}} = 100 \times \exp\left(-2.8 \times |R_v - 1.0|^{1.5}\right)$$

### 2. Optical Transmittance Score ($S_{\text{trans}}$)
Translates light penetration ($T\%$) through a 1mm fluid gap:
$$S_{\text{trans}} = \left(\frac{T}{100}\right)^{0.75} \times 100$$
$$\text{Estimated Soot (\% wt)} = -\ln\left(\frac{T}{98}\right) \times 0.92$$

### 3. Oil Health Index ($OHI$)
Weighted composite index evaluating fluid integrity:
$$OHI = 0.45 \cdot S_{\text{trans}} + 0.40 \cdot S_{\text{visc}} + 0.15 \cdot S_{\text{blotter}}$$

### 4. Remaining Useful Life ($RUL$)
$$RUL_{\text{distance}} = \max\left(0, D_{\text{nominal}} \times M_{\text{duty}} \times \left(\frac{OHI - 25}{75}\right)\right)$$

Where $M_{\text{duty}} = F_{\text{base\_oil}} \times F_{\text{engine}} \times F_{\text{driving\_mode}}$.

---

## 🚀 How to Run Locally

You can simply double-click [`index.html`](./index.html) to open it in any modern browser!

Alternatively, run a quick local web server:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js / npx
npx serve .
```
Then visit `http://localhost:8000`.

---

## 🌐 How to Deploy on GitHub Pages (Free Hosting)

1. **Initialize Git & Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of LubriSpec oil diagnostic platform"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** &rarr; **Pages** (under "Code and automation" in the left sidebar).
   - Under **Build and deployment**:
     - **Source**: Select `Deploy from a branch`.
     - **Branch**: Select `main` / `root`.
   - Click **Save**.
   - Your site will be live within 60 seconds at `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`!

---

## 🛠️ File Structure

```
.
├── .agents/
│   └── skills/
│       └── engine-oil-analysis/
│           └── SKILL.md            # Mechanical Tribology & Degradation Model Skill
├── css/
│   └── style.css                   # Industrial Dark Workshop Styling & Animations
├── js/
│   ├── calculator.js               # Reactive Mathematical Calculation Engine & Chart.js
│   └── main.js                     # Landing Page Droplet Physics & Interactivity
├── index.html                      # Landing Page (Overview, Spectrum, Formulas)
├── calculator.html                 # Dedicated Calculation Bench & Diagnostic HUD
└── README.md                       # Documentation & Deployment Guide
```
