const { generateStyledExcelWorkbook, generatePlainCsv, extractRowData } = require('../src/services/exportService');

describe('Stage 07 — exportService Unit Tests', () => {
  const sampleBatch = {
    _id: 'batch_test_123',
    fileName: 'fleet_oil_analysis.csv',
    rowCount: 2,
  };

  const sampleRows = [
    {
      rowIndex: 1,
      inputs: {
        registrationNo: 'MH-12-AB-9821',
        saeBaseline: '15W-40',
        baseOilType: 'Mineral',
        engineType: 'Diesel',
        drivingCondition: 'Highway',
        currentMileage: 18500,
        measuredViscosity: 225.0,
        effluxTime: 70.1,
        temperature: 28.0,
        blotterScore: 100,
      },
      results: {
        measuredViscosity: 225.0,
        ohi: 88,
        rulKm: 6450,
        devPct: 0.0,
        serviceRecommendation: 'Optimal',
      },
      llmResult: {
        tribologicalRisk: 'Low',
        summary: 'Lubricant hydrodynamic film is optimal. Cleared for heavy duty operations.',
        recommendedAction: 'Continue regular service schedule.',
        confidenceScore: 0.95,
      },
      status: 'success',
      error: null,
    },
    {
      rowIndex: 2,
      inputs: {
        registrationNo: '=cmd|/c calc!A1', // Formula injection attempt!
        saeBaseline: '5W-30',
        baseOilType: 'Full-Synthetic',
        engineType: 'Naturally Aspirated Petrol',
        drivingCondition: 'Mixed Urban',
        currentMileage: 9800,
        measuredViscosity: 74.0,
        effluxTime: 30.5,
        temperature: 27.5,
        blotterScore: 75,
      },
      results: {
        measuredViscosity: 74.0,
        ohi: 48,
        rulKm: 1100,
        devPct: -32.7,
        serviceRecommendation: 'Service Soon',
      },
      llmResult: {
        tribologicalRisk: 'High',
        summary: '+Severe fuel shear drop detected (-32%). Injector dilution risk.',
        recommendedAction: '@Inspect fuel injectors and change oil within 1,100 km.',
        confidenceScore: 0.88,
      },
      status: 'success',
      error: null,
    },
    {
      rowIndex: 3,
      inputs: {
        registrationNo: 'KA-03-ERR-001',
        saeBaseline: 'INVALID_GRADE',
      },
      results: null,
      llmResult: null,
      status: 'failed',
      error: 'Invalid or missing SAE baseline',
    },
  ];

  test('extractRowData applies formula injection guard on all text cells', () => {
    const malicious = sampleRows[1];
    const extracted = extractRowData(malicious);

    expect(extracted.plate).toBe("'=cmd|/c calc!A1");
    expect(extracted.summary).toBe("'+Severe fuel shear drop detected (-32%). Injector dilution risk.");
    expect(extracted.recommendedAction).toBe("'@Inspect fuel injectors and change oil within 1,100 km.");
  });

  test('generateStyledExcelWorkbook creates workbook with frozen header, styling, and filters', async () => {
    const workbook = await generateStyledExcelWorkbook(sampleBatch, sampleRows);
    expect(workbook).toBeDefined();

    const worksheet = workbook.getWorksheet('Oil Telemetry Report');
    expect(worksheet).toBeDefined();

    // Check frozen header row (ySplit: 1)
    expect(worksheet.views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ state: 'frozen', ySplit: 1 }),
      ])
    );

    // Check auto-filter
    expect(worksheet.autoFilter).toBeDefined();
    expect(worksheet.autoFilter.from).toBe('A1');

    // Check header row height and styling
    const headerRow = worksheet.getRow(1);
    expect(headerRow.height).toBe(32);
    const firstHeaderCell = headerRow.getCell(1);
    expect(firstHeaderCell.fill?.fgColor?.argb).toBe('FF121721');
    expect(firstHeaderCell.font?.color?.argb).toBe('FFFF8800');

    // Check total row count (1 header + 3 data rows = 4)
    expect(worksheet.rowCount).toBe(4);

    // Check banded row styling on row 2 (even data row = row 3 in sheet)
    const row3 = worksheet.getRow(3);
    const row3Cell = row3.getCell(1);
    expect(row3Cell.fill?.fgColor?.argb).toBe('FFF8FAFC');

    // Check formula injection escaping in Excel cell
    const formulaCell = worksheet.getRow(3).getCell(2);
    expect(formulaCell.value).toBe("'=cmd|/c calc!A1");

    // Check buffer output
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  test('generatePlainCsv generates valid RFC 4180 CSV with formula protection', () => {
    const csv = generatePlainCsv(sampleBatch, sampleRows);

    expect(csv).toBeDefined();
    expect(csv).toContain('"Row #"');
    expect(csv).toContain('"Vehicle Plate"');
    expect(csv).toContain('"MH-12-AB-9821"');
    // Ensure formula guard escaped malicious input
    expect(csv).toContain('"\'=cmd|/c calc!A1"');
    expect(csv).toContain('"\'@Inspect fuel injectors and change oil within 1,100 km."');
  });
});
