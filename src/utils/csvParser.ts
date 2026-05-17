import type { ImportSource, ParsedRecord, RecordType } from '../types';
import { mapAlipayCategory } from './alipayCategoryMapping';

export type { RecordType } from '../types';

export function parseAlipayCSV(csvText: string): ParsedRecord[] {
  const allLines = csvText.split(/\r?\n/);

  let headerLineIndex = -1;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (line.includes('交易时间') && line.includes('收/支')) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return [];
  }

  const records: ParsedRecord[] = [];

  for (let i = headerLineIndex + 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length < 7) {
      continue;
    }

    const status = values[8] || '';
    if (status && !status.includes('成功') && !status.includes('交易成功')) {
      continue;
    }

    const timeStr = values[0] || '';
    const typeStr = values[5] || '';
    const amountStr = values[6]?.replace(/"/g, '').replace(/¥|￥/g, '') || '0';
    const note = values[4] || '';
    const alipayCategory = values[1] || values[2] || '';

    let date: Date;
    try {
      const cleanedTime = timeStr.replace(/\[|\]/g, '').trim();
      if (!cleanedTime) continue;
      date = new Date(cleanedTime);
      if (isNaN(date.getTime())) continue;
    } catch {
      continue;
    }

    let amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    let type: RecordType;
    if (typeStr.includes('收入')) {
      type = 'income';
    } else if (typeStr.includes('支出')) {
      type = 'expense';
    } else {
      if (amount < 0) {
        type = 'expense';
        amount = Math.abs(amount);
      } else {
        type = 'income';
      }
    }

    // 应用支付宝分类映射
    const mapped = mapAlipayCategory(alipayCategory, type);
    let finalType = mapped.type;
    let finalCategory = mapped.category;

    // 确保类型一致性（优先使用原记录的类型判断）
    if (type === 'income' && finalType === 'expense') {
      finalType = 'income';
    } else if (type === 'expense' && finalType === 'income') {
      finalType = 'expense';
    }

    records.push({
      key: `alipay-${i}`,
      created_at: date.getTime(),
      type: finalType,
      amount: Math.abs(amount),
      category_id: finalCategory,
      category_name: finalCategory,
      note,
      source_category: alipayCategory,
      original_data: values,
    });
  }

  return records;
}

export function parseSharkCSV(csvText: string): ParsedRecord[] {
  const allLines = csvText.split(/\r?\n/);
  let headerLineIndex = -1;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (line.includes('日期') && line.includes('收支类型')) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return [];
  }

  const records: ParsedRecord[] = [];
  const skippedRows: { line: string; reason: string }[] = [];

  for (let i = headerLineIndex + 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;

    const values = line.split('\t');

    if (values.length < 5) {
      skippedRows.push({ line: `行${i + 1}: 列数不足 ${values.length}`, reason: line });
      continue;
    }

    const dateStr = values[0] || '';
    const typeStr = values[1] || '';
    const category = values[2] || '';
    const amountStr = values[4] || '0';
    const note = values[5] || '';

    let date: Date;
    try {
      const match = dateStr.match(/(\d{4})年(\d{2})月(\d{2})日/);
      if (match) {
        date = new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3])
        );
      } else {
        date = new Date(dateStr);
      }
      if (isNaN(date.getTime())) {
        skippedRows.push({ line: `行${i + 1}: 日期解析失败 "${dateStr}"`, reason: line });
        continue;
      }
    } catch {
      skippedRows.push({ line: `行${i + 1}: 日期异常 "${dateStr}"`, reason: line });
      continue;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) {
      skippedRows.push({ line: `行${i + 1}: 金额无效 "${amountStr}"`, reason: line });
      continue;
    }

    let type: RecordType;
    if (typeStr.includes('收入')) {
      type = 'income';
    } else if (typeStr.includes('支出')) {
      type = 'expense';
    } else {
      skippedRows.push({ line: `行${i + 1}: 类型不匹配 "${typeStr}"`, reason: line });
      continue;
    }

    records.push({
      key: `shark-${i}`,
      created_at: date.getTime(),
      type,
      amount: Math.abs(amount),
      category_id: category,
      category_name: category,
      note,
      source_category: category,
      original_data: values,
    });
  }

  console.log('跳过行数:', skippedRows.length, skippedRows);
  return records;
}

export function detectCSVType(csvText: string): ImportSource | null {
  if (csvText.includes('交易时间') && csvText.includes('收/支')) {
    return 'alipay';
  }
  if (csvText.includes('日期') && csvText.includes('收支类型')) {
    return 'shark';
  }
  return null;
}

export function readFileAsText(file: File, encoding: string = 'UTF-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}
