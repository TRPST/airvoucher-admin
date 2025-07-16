import { VoucherType } from '@/actions/admin/commissionActions';

type ParsedVoucher = {
  voucher_type_id: string;
  amount: number;
  pin: string;
  serial_number?: string;
  expiry_date?: string;
};

type ParseResult = {
  vouchers: ParsedVoucher[];
  errors: string[];
  totalLines: number;
  validLines: number;
};

/**
 * Parse a voucher file and extract voucher data
 */
export function parseVoucherFile(fileContent: string, voucherTypes: VoucherType[]): ParseResult {
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
  const result: ParseResult = {
    vouchers: [],
    errors: [],
    totalLines: lines.length,
    validLines: 0,
  };

  if (lines.length === 0) {
    result.errors.push('File is empty');
    return result;
  }

  // Check all lines to determine format, not just the first line
  let hasRinga = false;
  let hasHollywoodbets = false;
  let hasEasyload = false;
  let hasVodacom = false;
  let hasTelkom = false;
  let hasMTN = false;
  let hasCellCAirtime = false;
  let hasCellCDailyData = false;
  let hasCellCWeeklyData = false;
  let hasCellCMonthlyData = false;
  let hasUnipin = false;

  for (const line of lines) {
    if (line.startsWith('D|') && line.includes('RINGA')) {
      hasRinga = true;
      break;
    } else if (line.startsWith('D|') && line.includes('HWB')) {
      hasHollywoodbets = true;
      break;
    } else if (line.startsWith('Easyload')) {
      hasEasyload = true;
      break;
    } else if (line.startsWith('D|') && line.includes('VDD')) {
      hasVodacom = true;
      break;
    } else if (line.startsWith('D|') && line.includes('TM')) {
      hasTelkom = true;
      break;
    } else if (line.startsWith('D|') && line.includes('MTN')) {
      hasMTN = true;
      break;
    } else if (line.startsWith('D|') && line.includes('CELCW')) {
      hasCellCWeeklyData = true;
      break;
    } else if (line.startsWith('D|') && line.includes('CELCD')) {
      hasCellCDailyData = true;
      break;
    } else if (line.startsWith('D|') && line.includes('CELCM')) {
      hasCellCMonthlyData = true;
      break;
    } else if (line.startsWith('D|') && line.includes('CELLC')) {
      hasCellCAirtime = true;
      break;
    } else if (line.startsWith('D|') && line.includes('UPN')) {
      hasUnipin = true;
      break;
    }
  }

  if (hasRinga) {
    return parseRingaFormat(lines, voucherTypes, result);
  } else if (hasHollywoodbets) {
    return parseHollywoodbetsFormat(lines, voucherTypes, result);
  } else if (hasEasyload) {
    return parseEasyloadFormat(lines, voucherTypes, result);
  } else if (hasVodacom) {
    return parseVodacomFormat(lines, voucherTypes, result);
  } else if (hasTelkom) {
    return parseTelkomFormat(lines, voucherTypes, result);
  } else if (hasMTN) {
    return parseMTNFormat(lines, voucherTypes, result);
  } else if (hasCellCWeeklyData) {
    return parseCellCWeeklyDataFormat(lines, voucherTypes, result);
  } else if (hasCellCDailyData) {
    return parseCellCDailyDataFormat(lines, voucherTypes, result);
  } else if (hasCellCMonthlyData) {
    return parseCellCMonthlyDataFormat(lines, voucherTypes, result);
  } else if (hasCellCAirtime) {
    return parseCellCAirtimeFormat(lines, voucherTypes, result);
  } else if (hasUnipin) {
    return parseUnipinFormat(lines, voucherTypes, result);
  } else {
    result.errors.push(
      'Unknown file format. Expected Ringa, Hollywoodbets, Easyload, Vodacom, Telkom, MTN, CellC (Airtime, Daily Data, Weekly Data, Monthly Data), or Unipin format.'
    );
    return result;
  }
}

/**
 * Parse Ringa format voucher file
 * Format: D|RINGA0100|100.00|0|100.00|01/06/2026|127465|RT09C1044798F43|2691290788475827
 */
function parseRingaFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Ringa voucher type ID
  const ringaType = voucherTypes.find(type => type.name.toLowerCase() === 'ringa');
  if (!ringaType) {
    result.errors.push('Ringa voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines (starting with 'H')
    if (!line.startsWith('D|') || !line.includes('RINGA')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: ringaType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse Hollywoodbets format voucher file
 * Format: D|HWB000010|10.00|1095|10|02/05/2027|39942|1359713349|00186831686370119
 */
function parseHollywoodbetsFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Hollywoodbets voucher type ID
  const hwbType = voucherTypes.find(type => type.name.toLowerCase() === 'hollywoodbets');
  if (!hwbType) {
    result.errors.push('Hollywoodbets voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('HWB')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: hwbType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse Easyload format voucher file
 * Format: Easyload,5,25357070837651,00100050000096969531,20270822
 */
function parseEasyloadFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Easyload voucher type ID
  const easyloadType = voucherTypes.find(type => type.name.toLowerCase() === 'easyload');
  if (!easyloadType) {
    result.errors.push('Easyload voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines
    if (!line.startsWith('Easyload')) {
      continue;
    }

    try {
      const columns = line.split(',');
      if (columns.length < 5) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[1]);
      const pin = columns[2];
      const serialNumber = columns[3];
      const expiryDateStr = columns[4];

      // Convert YYYYMMDD to YYYY-MM-DD
      const expiryDate = `${expiryDateStr.substring(0, 4)}-${expiryDateStr.substring(4, 6)}-${expiryDateStr.substring(6, 8)}`;

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: easyloadType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse Vodacom format voucher file
 * Format: D|VDD000029|29.00|0|29.00|01/03/2026|124076|2102016560|1161283422170|8
 */
function parseVodacomFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Vodacom voucher type ID
  const vodacomType = voucherTypes.find(type => type.name.toLowerCase() === 'vodacom');
  if (!vodacomType) {
    result.errors.push('Vodacom voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('VDD')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: vodacomType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse Telkom format voucher file
 * Format: D|TM050.00C|50.00|0|50.00|24/10/2025|123756|2210240022000007067|3111476663165640
 */
function parseTelkomFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Telkom voucher type ID
  const telkomType = voucherTypes.find(type => type.name.toLowerCase() === 'telkom');
  if (!telkomType) {
    result.errors.push('Telkom voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('TM')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: telkomType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse MTN format voucher file
 * Format: D|MTNIW0010|10.00|0|10.00|21/11/2025|124354|SA089DX0FVRQ|1078123270597026
 */
function parseMTNFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find MTN voucher type ID
  const mtnType = voucherTypes.find(type => type.name.toLowerCase() === 'mtn');
  if (!mtnType) {
    result.errors.push('MTN voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('MTN')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: mtnType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse CellC Airtime format voucher file
 * Format: D|CELLC0025|25.00|120|25.00|20/09/2071|123579|730230876973|844148321723|5
 */
function parseCellCAirtimeFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find CellC Airtime voucher type ID
  const cellcAirtimeType = voucherTypes.find(type => type.name.toLowerCase() === 'cellc airtime');
  if (!cellcAirtimeType) {
    result.errors.push('CellC Airtime voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('CELLC')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: cellcAirtimeType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse CellC Weekly Data format voucher file
 * Format: D|CELCW0020|20.00|0|20.00|20/09/2071|121570|730091573480|885441353971
 */
function parseCellCWeeklyDataFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find CellC Weekly Data voucher type ID
  const cellcWeeklyType = voucherTypes.find(
    type => type.name.toLowerCase() === 'cellc weekly data'
  );
  if (!cellcWeeklyType) {
    result.errors.push('CellC Weekly Data voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('CELCW')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: cellcWeeklyType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse CellC Daily Data format voucher file
 * Format: D|CELCD0015|15.00|0|15.00|20/09/2071|121570|730091573480|885441353971
 */
function parseCellCDailyDataFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find CellC Daily Data voucher type ID
  const cellcDailyType = voucherTypes.find(type => type.name.toLowerCase() === 'cellc daily data');
  if (!cellcDailyType) {
    result.errors.push('CellC Daily Data voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('CELCD')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: cellcDailyType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse CellC Monthly Data format voucher file
 * Format: D|CELCM0050|50.00|0|50.00|20/09/2071|121570|730091573480|885441353971
 */
function parseCellCMonthlyDataFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find CellC Monthly Data voucher type ID
  const cellcMonthlyType = voucherTypes.find(
    type => type.name.toLowerCase() === 'cellc monthly data'
  );
  if (!cellcMonthlyType) {
    result.errors.push('CellC Monthly Data voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('CELCM')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const serialNumber = columns[columns.length - 2];
      const pin = columns[columns.length - 1];

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: cellcMonthlyType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Parse Unipin format voucher file
 * Format: D|UPN000500|500.00|0|500.00|07/01/2025|122099|0002103221445|350040043
 */
function parseUnipinFormat(
  lines: string[],
  voucherTypes: VoucherType[],
  result: ParseResult
): ParseResult {
  // Find Unipin voucher type ID
  const unipinType = voucherTypes.find(type => type.name.toLowerCase() === 'unipin');
  if (!unipinType) {
    result.errors.push('Unipin voucher type not found in database');
    return result;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip non-voucher lines or header lines
    if (!line.startsWith('D|') || !line.includes('UPN')) {
      continue;
    }

    try {
      const columns = line.split('|');
      if (columns.length < 9) {
        result.errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }

      // Extract relevant data
      const amount = parseFloat(columns[2]);
      const expiryDateParts = columns[5].split('/');
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const expiryDate = `${expiryDateParts[2]}-${expiryDateParts[1]}-${expiryDateParts[0]}`;
      const pin = columns[columns.length - 2]; // Second last column is the PIN (13 digits)
      const serialNumber = columns[columns.length - 1]; // Last column as serial number

      if (isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: Invalid amount`);
        continue;
      }

      result.vouchers.push({
        voucher_type_id: unipinType.id,
        amount,
        pin,
        serial_number: serialNumber,
        expiry_date: expiryDate,
      });

      result.validLines++;
    } catch (error) {
      result.errors.push(
        `Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

export function getVoucherTypeNameFromFile(fileContent: string): string | null {
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    return null;
  }

  // Check all lines to determine format, not just the first line
  // This handles files with header lines
  for (const line of lines) {
    if (line.startsWith('D|') && line.includes('RINGA')) {
      return 'Ringa';
    } else if (line.startsWith('D|') && line.includes('HWB')) {
      return 'Hollywoodbets';
    } else if (line.startsWith('Easyload')) {
      return 'Easyload';
    } else if (line.startsWith('D|') && line.includes('VDD')) {
      return 'Vodacom';
    } else if (line.startsWith('D|') && line.includes('TM')) {
      return 'Telkom';
    } else if (line.startsWith('D|') && line.includes('MTN')) {
      return 'MTN';
    } else if (line.startsWith('D|') && line.includes('CELCW')) {
      return 'CellC Weekly Data';
    } else if (line.startsWith('D|') && line.includes('CELCD')) {
      return 'CellC Daily Data';
    } else if (line.startsWith('D|') && line.includes('CELCM')) {
      return 'CellC Monthly Data';
    } else if (line.startsWith('D|') && line.includes('CELLC')) {
      return 'CellC Airtime';
    } else if (line.startsWith('D|') && line.includes('UPN')) {
      return 'Unipin';
    }
  }

  return null;
}
