---
name: engine-oil-analysis
description: >-
  Domain engineering skill for assessing internal combustion engine oil health,
  evaluating kinematic viscosity consistency and optical transparency degradation,
  calculating Remaining Useful Life (RUL), and generating service recommendations.
---

# Engine Oil Degradation & Remaining Useful Life (RUL) Skill

This skill documents the mechanical engineering principles, empirical mathematical models, and optical/viscosity assessment algorithms used to determine engine oil longevity and replacement intervals.

---

## 1. Mechanical Principles of Engine Oil Degradation

Internal combustion engine lubricants degrade through three primary mechanisms:
1. **Mechanical Shear & Polymer Breakdown**: High-stress hydrodynamic shearing in cylinder liners and journal bearings shears down Viscosity Index Improvers (VII), reducing effective viscosity.
2. **Thermal Oxidation & Polymerization**: Sustained cylinder temperatures cause base oil hydrocarbons to oxidize into organic acids, resins, and varnish, eventually thickening the oil and forming sludge.
3. **Contamination (Particulate & Soot)**: Incomplete combustion produces sub-micron carbon soot ($C_{soot}$), blow-by fuel dilution, moisture, and metallic wear particles (Fe, Cu, Al), degrading optical transmittance.

---

## 2. Key Diagnostic Parameters & Formulations

### A. Kinematic Viscosity / Consistency (nu) - ASTM D1200 Ford B4 Cup
- Efflux flow time ($t$ in seconds) through 4.12 mm nozzle converted to kinematic viscosity in cSt:
  $$\nu = 3.85 \times t - 44.9$$

### B. Workshop Ambient Baselines (@ 27.5�C) & Thermal Compensation
Calibrated nominal kinematic viscosities for ambient workshop testing:
- **0W-20**: $\nu_{\text{nom, 27.5�C}} = 76.0\text{ cSt}$ (~31.4s flow)
- **5W-30**: $\nu_{\text{nom, 27.5�C}} = 110.0\text{ cSt}$ (~40.2s flow)
- **10W-40**: $\nu_{\text{nom, 27.5�C}} = 176.0\text{ cSt}$ (~57.4s flow)
- **15W-40**: $\nu_{\text{nom, 27.5�C}} = 225.0\text{ cSt}$ (~70.1s flow)
- **20W-50**: $\nu_{\text{nom, 27.5�C}} = 295.0\text{ cSt}$ (~88.3s flow)

**Thermal Compensation:**
$$\nu_{\text{nom}}(T) = \nu_{\text{nom, 27.5�C}} \times \exp\left(-0.048 \times (T - 27.5)\right)$$
Where $T$ is the ambient workshop temperature in �C.

### C. Viscosity Consistency Score ($S_{\text{visc}}$)
$$R_v = \frac{\nu_{\text{measured}}}{\nu_{\text{nom}}(T)}$$
$$\text{Deviation \%} = (R_v - 1.0) \times 100$$
$$S_{\text{visc}} = 100 \times \exp\left(-2.8 \times |R_v - 1.0|^{1.5}\right)$$

### D. Blotter Spot Dispersancy ($S_{\text{blotter}}$) - ASTM D7899
$$I_D = 1 - \frac{d^2}{D^2}$$
Stages: 100% (Clean), 75% (Good Amber), 45% (Aged Dark), 15% (Critical Sludge).

### E. Composite Oil Health Index ($OHI$)
$$OHI = 0.50 \times S_{\text{visc}} + 0.50 \times S_{\text{blotter}}$$

### F. Operating Duty Factors ($M_{\text{duty}}$)
- **Base Oil (`oil_base_type`):** `Mineral` = 1.0, `Semi-Synthetic` = 1.35, `Full-Synthetic` = 1.70
- **Engine (`engine_type`):** `Naturally Aspirated Petrol` = 1.0, `Turbo Petrol` = 0.85, `Diesel` = 0.75
- **Driving (`driving_condition`):** `Highway` = 1.25, `Mixed Urban` = 1.0, `City Stop-and-Go` = 0.75
$$M_{\text{duty}} = F_{\text{base\_oil}} \times F_{\text{engine}} \times F_{\text{driving\_mode}}$$

### G. Remaining Useful Life ($RUL$)
$$RUL = \begin{cases} 
\min\left(12000, \; 5500 \times M_{\text{duty}} \times \left(\frac{OHI - 25}{75}\right)\right), & \text{if } OHI > 30\% \\[8pt]
0\text{ km}, & \text{if } OHI \le 30\% 
\end{cases}$$

### H. Service Recommendation Thresholds
- **Critical:** $OHI \le 30\%$ OR $\text{Deviation \%} < -25\%$ OR $\text{Deviation \%} > +35\%$
- **Service Soon:** $30\% < OHI < 55\%$ OR $\text{Deviation \%} < -15\%$ OR $\text{Deviation \%} > +20\%$
- **Stable:** $55\% \le OHI < 80\%$ (with $\text{Deviation \%}$ within $-15\%$ to $+20\%$)
- **Optimal:** $OHI \ge 80\%$ (with $\text{Deviation \%}$ within $-15\%$ to $+20\%$)

---

## 3. Mathematical Degradation Formulation

The comprehensive **Oil Health Index ($OHI$)** (0% to 100%) is calculated as:

$$S_{\text{trans}} = \left(\frac{T}{100}\right)^{0.75} \times 100$$

$$S_{\text{visc}} = 100 \times \exp\left( -2.8 \times |R_v - 1.0|^{1.5} \right)$$

$$OHI = 0.55 \cdot S_{\text{trans}} + 0.45 \cdot S_{\text{visc}}$$

### Remaining Useful Life ($RUL$) Calculation

Given the vehicle's current distance on this oil ($D_{\text{current}}$) and duty cycle multiplier ($M_{\text{duty}}$):

$$M_{\text{duty}} = F_{\text{base\_oil}} \times F_{\text{driving\_mode}} \times F_{\text{engine\_type}}$$

- $F_{\text{base\_oil}}$: Mineral = 1.0, Semi-Synthetic = 1.35, Full Synthetic = 1.8
- $F_{\text{driving\_mode}}$: Highway = 1.15, Normal = 1.0, Severe Stop-and-Go = 0.78
- $F_{\text{engine\_type}}$: Petrol = 1.0, Turbo Diesel = 0.85

The projected Remaining Safe Distance ($RUL_{\text{dist}}$) is:

$$RUL_{\text{dist}} = \max\left(0, D_{\text{nominal\_max}} \times M_{\text{duty}} \times \left(\frac{OHI - 25}{75}\right)\right)$$

Where replacement is strictly mandatory if:
- $OHI \le 30\%$
- $T \le 12\%$
- $R_v \le 0.75$ or $R_v \ge 1.30$

---

## 4. Mechanical Recommendations Matrix

| OHI Range | Status | Action Required |
|---|---|---|
| **80% - 100%** | Optimal Condition | Oil is fresh; continue normal operation. |
| **55% - 79%** | Normal Degradation | Lubricant working within stable operational envelope. Plan regular service check. |
| **31% - 54%** | Marginal / Service Due Soon | Depleted additives; schedule oil and filter replacement within next 1,000 km. |
| **0% - 30%** | Critical / Immediate Flush | Severe soot/sludge buildup or severe shearing. Immediate oil and filter replacement required to prevent cylinder scuffing and bearing wear. |
