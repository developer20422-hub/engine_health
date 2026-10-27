/**
 * CSV / Excel Formula Injection Guard
 * Sanitizes input cells starting with dangerous formula characters: '=', '+', '-', '@', '\t', '\r'
 * Prevents CSV Injection (CWE-1236 / OWASP) when exported files are opened in Excel.
 */

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

const sanitizeFormulaCell = (val) => {
  if (typeof val !== 'string' || val.length === 0) return val;

  // Check if raw string starts with dangerous characters (including tab, carriage return)
  if (DANGEROUS_PREFIXES.includes(val[0])) {
    return `'${val}`;
  }

  // Also check if leading whitespace is followed by formula trigger
  const trimmed = val.trimStart();
  if (trimmed.length > 0 && DANGEROUS_PREFIXES.includes(trimmed[0])) {
    return `'${val}`;
  }
  return val;
};


const sanitizeObjectForFormulaInjection = (data) => {
  if (!data) return data;
  if (typeof data === 'string') return sanitizeFormulaCell(data);
  if (Array.isArray(data)) return data.map(sanitizeObjectForFormulaInjection);
  if (typeof data === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(data)) {
      cleaned[key] = sanitizeObjectForFormulaInjection(val);
    }
    return cleaned;
  }
  return data;
};

module.exports = {
  sanitizeFormulaCell,
  sanitizeObjectForFormulaInjection,
};
