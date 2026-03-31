import ExcelJS from 'exceljs';

/**
 * Creates a test .xlsx buffer with the given rows.
 * Row 1 = headers, subsequent rows = data.
 */
export async function createTestXlsx(
  headers: string[],
  dataRows: (string | number)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Players');

  worksheet.addRow(headers);
  for (const row of dataRows) {
    worksheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
