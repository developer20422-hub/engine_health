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

## 2. Key Diagnostic Parameters

### A. Kinematic Viscosity / Consistency ($\nu$)
- **Baseline**: Rated at 100°C according to SAE J300 specifications (e.g., 5W-30 is typically 9.3 to 12.5 cSt).
- **Shearing Ratio ($R_v$)**:
  $$R_v = \frac{\nu_{\text{current}}}{\nu_{\text{nominal}}}$$
  - $R_v < 0.80$: Severe thinning (fuel dilution or shear loss). High risk of boundary friction.
  - $0.85 \le R_v \le 1.15$: Optimal operating range.
  - $R_v > 1.25$: Severe oxidation/sludge thickening. High risk of oil starvation.

### B. Optical Transparency / Transmittance ($T$)
- Measured via optical transmittance percentage ($T \in [0\%, 100\%]$) or photometric light penetration:
  - Fresh synthetic oil: $T \approx 90\% - 100\%$ (Honey-amber translucent).
  - Normal oxidation: $T \approx 50\% - 75\%$ (Dark amber / light brown).
  - High soot / nitration: $T \approx 20\% - 45\%$ (Opaque brown/black).
  - Sludge & severe carbon suspension: $T < 15\%$ (Pitch black opaque).
- Follows modified Beer-Lambert Law:
  $$T = T_0 \cdot e^{-\alpha \cdot (C_{\text{soot}} + C_{\text{ox}})}$$

### C. Blotter Spot Chromatography
- A drop of oil on chromatography/blotting paper develops radial zones:
  - Central core: Heavy soot / insoluble deposits.
  - Intermediate ring: Dispersancy zone.
  - Outer translucent halo: Base oil condition.
  - Dispersancy Index ($DI$) evaluates if detergent additives are still capable of suspending carbon.

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
