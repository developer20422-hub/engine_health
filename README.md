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

## ?? Mathematical Formulation

### 1. Kinematic Viscosity Conversion (ASTM D1200 Ford B4 Cup)
Converts gravity efflux flow time ($t$ in seconds) through a 4.12 mm orifice into kinematic viscosity (cSt):
$$\nu_{\text{measured}} = 3.85 \times t - 44.9$$

### 2. Workshop Ambient Baselines (@ 27.5�C) & Thermal Compensation
Standard nominal kinematic viscosities calibrated for unheated ambient testing:
- **0W-20**: $\nu_{\text{nom, 27.5�C}} = 76.0\text{ cSt}$ (Expected fresh flow time: ~31.4 sec)
- **5W-30**: $\nu_{\text{nom, 27.5�C}} = 110.0\text{ cSt}$ (Expected fresh flow time: ~40.2 sec)
- **10W-40**: $\nu_{\text{nom, 27.5�C}} = 176.0\text{ cSt}$ (Expected fresh flow time: ~57.4 sec)
- **15W-40**: $\nu_{\text{nom, 27.5�C}} = 225.0\text{ cSt}$ (Expected fresh flow time: ~70.1 sec)
- **20W-50**: $\nu_{\text{nom, 27.5�C}} = 295.0\text{ cSt}$ (Expected fresh flow time: ~88.3 sec)

**Thermal Compensation Formula:**
$$\nu_{\text{nom}}(T) = \nu_{\text{nom, 27.5�C}} \times \exp\left(-0.048 \times (T - 27.5)\right)$$
Where $T$ is the ambient workshop temperature in �C (typically between 20.0�C and 35.0�C).

### 3. Viscosity Consistency Score ($S_{\text{visc}}$)
Evaluates deviation ratio from temperature-compensated baseline grade:
$$R_v = \frac{\nu_{\text{measured}}}{\nu_{\text{nom}}(T)}$$
$$\text{Deviation \%} = (R_v - 1.0) \times 100$$
$$S_{\text{visc}} = 100 \times \exp\left(-2.8 \times |R_v - 1.0|^{1.5}\right)$$

### 4. Blotter Spot Dispersancy Index ($S_{\text{blotter}}$)
From ASTM D7899 paper spot chromatography:
$$I_D = 1 - \frac{d^2}{D^2}$$
Mapped to 4 operational stages: 100% (Clean), 75% (Good Amber), 45% (Aged Dark), 15% (Critical Sludge).

### 5. Composite Oil Health Index ($OHI$)
Weighted composite index evaluating fluid integrity:
$$OHI = 0.50 \times S_{\text{visc}} + 0.50 \times S_{\text{blotter}}$$

### 6. Duty Cycle Scaling ($M_{\text{duty}}$)
Factors in real-world vehicle operating severity:
$$M_{\text{duty}} = F_{\text{base\_oil}} \times F_{\text{engine}} \times F_{\text{driving\_mode}}$$
- **Base Oil (`oil_base_type`):** `Mineral` $\rightarrow 1.0$, `Semi-Synthetic` $\rightarrow 1.35$, `Full-Synthetic` $\rightarrow 1.70$
- **Engine (`engine_type`):** `Naturally Aspirated Petrol` $\rightarrow 1.0$, `Turbo Petrol` $\rightarrow 0.85$, `Diesel` $\rightarrow 0.75$
- **Driving (`driving_condition`):** `Highway` $\rightarrow 1.25$, `Mixed Urban` $\rightarrow 1.0$, `City Stop-and-Go` $\rightarrow 0.75$

### 7. Remaining Useful Life ($RUL$) with Upper Boundary Cap
$$RUL = \begin{cases} 
\min\left(12000, \; 5500 \times M_{\text{duty}} \times \left(\frac{OHI - 25}{75}\right)\right), & \text{if } OHI > 30\% \\[8pt]
0\text{ km}, & \text{if } OHI \le 30\% 
\end{cases}$$

### 8. Target Service Recommendation Thresholds
- **Critical:** $OHI \le 30\%$ OR $\text{Deviation \%} < -25\%$ OR $\text{Deviation \%} > +35\%$
- **Service Soon:** $30\% < OHI < 55\%$ OR $\text{Deviation \%} < -15\%$ OR $\text{Deviation \%} > +20\%$
- **Stable:** $55\% \le OHI < 80\%$ (with $\text{Deviation \%}$ within $-15\%$ to $+20\%$)
- **Optimal:** $OHI \ge 80\%$ (with $\text{Deviation \%}$ within $-15\%$ to $+20\%$)
*(Deviation % override guarantees severe fuel thinning or oxidative thickening cannot receive an Optimal rating even with a clean blotter).*

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
