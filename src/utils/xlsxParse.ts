import * as XLSX from 'xlsx';

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export async function parseXlsxFile(file: File): Promise<ParsedSheet> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
  const [headers = [], ...rows] = data;
  return { headers, rows };
}
