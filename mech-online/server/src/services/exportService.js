const ExcelJS = require('exceljs');
const { sanitizeFormulaCell } = require('../utils/formulaGuard');

/**
 * Helper to convert column number (1-indexed) to Excel column letter (e.g. 1 -> A, 20 -> T)
 */
const getColLetter = (colIndex) => {
  let temp;
  let letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
};

/**
 * Maps status or risk level to specific conditional styling in Excel
 */
const getStatusStyle = (value) => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();

  // Optimal / Low / Good
  if (str.includes('optimal') || str.includes('low') || str.includes('good')) {
    return {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } }, // Soft green
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF137333' } }, // Forest green
    };
  }

  // Moderate / Acceptable / Stable / Watch
  if (str.includes('moderate') || str.includes('acceptable') || str.includes('stable') || str.includes('watch')) {
    return {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF7E0' } }, // Soft yellow
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB06000' } }, // Amber brown
    };
  }

  // High / Caution / Service Soon
  if (str.includes('caution') || str.includes('high') || str.includes('soon')) {
    return {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } }, // Soft orange
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFBF360C' } }, // Dark orange
    };
  }

  // Critical / Change Oil / Sludge / Failed
  if (str.includes('critical') || str.includes('sludge') || str.includes('fail') || str.includes('change')) {
    return {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } }, // Soft red
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC5221F' } }, // Crimson red
    };
  }

  return null;
};

/**
 * Defines column specifications for both Excel and CSV export
 */
const EXPORT_COLUMNS = [
  { header: 'Row #', key: 'rowIndex', width: 8, align: 'center' },
  { header: 'Vehicle Plate', key: 'plate', width: 16, align: 'left' },
  { header: 'SAE Baseline', key: 'sae', width: 14, align: 'center' },
  { header: 'Base Oil Type', key: 'baseOilType', width: 16, align: 'left' },
  { header: 'Engine Type', key: 'engineType', width: 22, align: 'left' },
  { header: 'Duty Cycle', key: 'dutyCycle', width: 16, align: 'left' },
  { header: 'Mileage (km)', key: 'mileage', width: 14, align: 'right', numFmt: '#,##0' },
  { header: 'Viscosity 40°C (cSt)', key: 'viscosity', width: 18, align: 'right', numFmt: '0.00' },
  { header: 'Efflux Time (s)', key: 'effluxTime', width: 15, align: 'right', numFmt: '0.0' },
  { header: 'Oil Temp (°C)', key: 'temperature', width: 14, align: 'right', numFmt: '0.0' },
  { header: 'Blotter Score', key: 'blotterScore', width: 14, align: 'center', numFmt: '0' },
  { header: 'OHI (0-100)', key: 'ohi', width: 13, align: 'center', numFmt: '0' },
  { header: 'Viscosity Dev %', key: 'devPct', width: 16, align: 'right', numFmt: '+0.0%;-0.0%;0.0%' },
  { header: 'Projected RUL (km)', key: 'rulKm', width: 18, align: 'right', numFmt: '#,##0' },
  { header: 'Service Recommendation', key: 'serviceRecommendation', width: 22, align: 'center', isStatus: true },
  { header: 'AI Risk Level', key: 'tribologicalRisk', width: 16, align: 'center', isRisk: true },
  { header: 'AI Diagnostic Analysis', key: 'summary', width: 44, align: 'left', wrap: true },
  { header: 'Mechanic Action Directive', key: 'recommendedAction', width: 40, align: 'left', wrap: true },
  { header: 'Row Status', key: 'status', width: 12, align: 'center', isStatus: true },
  { header: 'Diagnostics Error', key: 'error', width: 28, align: 'left', wrap: true },
];

/**
 * Extracts and sanitizes export row data from a BatchRow document
 */
const extractRowData = (row) => {
  const inputs = row.inputs || {};
  const results = row.results || {};
  const llm = row.llmResult || {};

  return {
    rowIndex: row.rowIndex,
    plate: sanitizeFormulaCell(inputs.registrationNo || `ROW-${row.rowIndex}`),
    sae: sanitizeFormulaCell(inputs.saeBaseline || '-'),
    baseOilType: sanitizeFormulaCell(inputs.baseOilType || '-'),
    engineType: sanitizeFormulaCell(inputs.engineType || '-'),
    dutyCycle: sanitizeFormulaCell(inputs.drivingCondition || '-'),
    mileage: inputs.currentMileage !== undefined && inputs.currentMileage !== null ? Number(inputs.currentMileage) : null,
    viscosity: results.measuredViscosity !== undefined ? Number(results.measuredViscosity) : (inputs.measuredViscosity !== undefined ? Number(inputs.measuredViscosity) : null),
    effluxTime: results.effluxTime !== undefined ? Number(results.effluxTime) : (inputs.effluxTime !== undefined ? Number(inputs.effluxTime) : null),
    temperature: inputs.temperature !== undefined ? Number(inputs.temperature) : null,
    blotterScore: inputs.blotterScore !== undefined ? Number(inputs.blotterScore) : null,
    ohi: results.ohi !== undefined ? Number(results.ohi) : null,
    devPct: results.devPct !== undefined ? Number(results.devPct) / 100 : null,
    rulKm: results.rulKm !== undefined ? Number(results.rulKm) : null,
    serviceRecommendation: sanitizeFormulaCell(results.serviceRecommendation || (row.status === 'failed' ? 'Failed' : 'Pending')),
    tribologicalRisk: sanitizeFormulaCell(llm.tribologicalRisk || (row.status === 'failed' ? 'Critical' : 'Moderate')),
    summary: sanitizeFormulaCell(llm.summary || (row.status === 'failed' ? 'Row validation rejected' : 'Processing...')),
    recommendedAction: sanitizeFormulaCell(llm.recommendedAction || (row.status === 'failed' ? row.error : '-')),
    status: sanitizeFormulaCell(row.status?.toUpperCase() || 'PENDING'),
    error: sanitizeFormulaCell(row.error || ''),
  };
};

/**
 * Generates styled Excel (.xlsx) workbook for a batch and its rows
 * @param {Object} batch
 * @param {Array} rows
 * @returns {ExcelJS.Workbook}
 */
const generateStyledExcelWorkbook = async (batch, rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mech Online Engine Oil Diagnostic Platform';
  workbook.lastModifiedBy = 'Mech Online AI Pipeline';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Oil Telemetry Report', {
    properties: { tabColor: { argb: 'FFFF8800' } },
    views: [{ state: 'frozen', ySplit: 1 }], // Frozen header row
  });

  // 1. Setup Columns
  worksheet.columns = EXPORT_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  // 2. Style Header Row (Dark obsidian with amber branding)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF121721' }, // Obsidian dark brand background
    };
    cell.font = {
      name: 'Segoe UI',
      size: 10.5,
      bold: true,
      color: { argb: 'FFFF8800' }, // Amber glow
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF2A3447' } },
      bottom: { style: 'medium', color: { argb: 'FFFF8800' } },
      left: { style: 'thin', color: { argb: 'FF2A3447' } },
      right: { style: 'thin', color: { argb: 'FF2A3447' } },
    };
  });

  // 3. Populate and Style Data Rows
  rows.forEach((row, index) => {
    const rowData = extractRowData(row);
    const excelRow = worksheet.addRow(rowData);
    excelRow.height = 26;

    const isEven = (index + 1) % 2 === 0;
    const defaultFill = isEven
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } // Subtle slate banded
      : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // Clean white

    const defaultFont = {
      name: 'Segoe UI',
      size: 9.5,
      color: { argb: 'FF1E293B' },
    };

    const cellBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    EXPORT_COLUMNS.forEach((colDef, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.border = cellBorder;
      cell.font = defaultFont;
      cell.fill = defaultFill;

      // Alignment & text wrapping
      cell.alignment = {
        vertical: 'middle',
        horizontal: colDef.align || 'left',
        wrapText: Boolean(colDef.wrap),
      };

      // Number formatting
      if (colDef.numFmt && typeof cell.value === 'number') {
        cell.numFmt = colDef.numFmt;
      }

      // Conditional formatting for Status and Risk columns
      if (colDef.isStatus || colDef.isRisk) {
        const style = getStatusStyle(cell.value);
        if (style) {
          cell.fill = style.fill;
          cell.font = style.font;
        }
      }
    });
  });

  // 4. Auto-fit column widths with dynamic padding
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) {
        maxLen = len;
      }
    });
    // Set appropriate auto-width bounded between minimum and maximum constraints
    const key = column.key;
    const colDef = EXPORT_COLUMNS.find((c) => c.key === key);
    const minWidth = colDef?.width || 12;
    const maxWidth = colDef?.wrap ? 50 : 28;
    column.width = Math.min(maxWidth, Math.max(minWidth, maxLen + 3));
  });

  // 5. Apply Excel Filters across all headers
  const lastColLetter = getColLetter(EXPORT_COLUMNS.length);
  worksheet.autoFilter = {
    from: 'A1',
    to: `${lastColLetter}1`,
  };

  return workbook;
};

/**
 * Generates RFC 4180 compliant CSV string with formula injection protection
 * @param {Object} batch
 * @param {Array} rows
 * @returns {String}
 */
const generatePlainCsv = (batch, rows) => {
  const headers = EXPORT_COLUMNS.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');
  const lines = [headers];

  for (const row of rows) {
    const rowData = extractRowData(row);
    const values = EXPORT_COLUMNS.map((col) => {
      let val = rowData[col.key];
      if (val === null || val === undefined) {
        return '""';
      }
      if (typeof val === 'number') {
        if (col.numFmt && col.numFmt.includes('%')) {
          return `"${(val * 100).toFixed(1)}%"`;
        }
        return String(val);
      }
      // String value with quotes escaped
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    });
    lines.push(values.join(','));
  }

  return lines.join('\r\n');
};

module.exports = {
  EXPORT_COLUMNS,
  extractRowData,
  generateStyledExcelWorkbook,
  generatePlainCsv,
};
