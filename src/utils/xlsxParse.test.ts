import * as XLSX from 'xlsx';
import { parseXlsxFile } from './xlsxParse';

function buildTestFile(): File {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['First Name', 'Last Name'],
    ['Alexander', 'Varghese'],
    ['Shiny', 'Joseph'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new File([arrayBuffer], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseXlsxFile', () => {
  it('extracts headers and rows from an xlsx file', async () => {
    const file = buildTestFile();
    const result = await parseXlsxFile(file);
    expect(result.headers).toEqual(['First Name', 'Last Name']);
    expect(result.rows).toEqual([
      ['Alexander', 'Varghese'],
      ['Shiny', 'Joseph'],
    ]);
  });
});
