import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, InputNumber, message, Progress, Row, Space, Table, Upload } from 'antd';
import { useCallback, useMemo, useState } from 'react';

interface ParsedRecord {
  key: string;
  created_at: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: string;
  category_name: string;
  note: string;
  alipay_category: string; // 支付宝的交易分类
  original_data: string[];
}

function parseAlipayCSV(csvText: string): ParsedRecord[] {
  // 手动解析 - 处理所有可能的换行符
  const allLines = csvText.split(/\r?\n/);

  // 找到表头行的索引
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

  // 从表头下一行开始处理
  for (let i = headerLineIndex + 1; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;

    // 简单的CSV解析 - 处理引号
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

    // 检查交易状态
    const status = values[8] || '';
    if (status && !status.includes('成功') && !status.includes('交易成功')) {
      continue;
    }

    const timeStr = values[0] || '';
    const typeStr = values[5] || '';
    const amountStr = values[6]?.replace(/"/g, '').replace(/¥|￥/g, '') || '0';
    const note = values[4] || '';
    const alipayCategory = values[1] || ''; // 交易对方（交易分类）

    // 解析日期
    let date: Date;
    try {
      const cleanedTime = timeStr.replace(/\[|\]/g, '').trim();
      if (!cleanedTime) continue;
      date = new Date(cleanedTime);
      if (isNaN(date.getTime())) continue;
    } catch {
      continue;
    }

    // 解析金额
    let amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    // 确定收支类型
    let type: 'income' | 'expense';
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

    records.push({
      key: `record-${i}`,
      created_at: date.getTime(),
      type,
      amount: Math.abs(amount),
      category_id: alipayCategory, // 直接使用支付宝的交易分类作为 category_id
      category_name: alipayCategory,
      note,
      alipay_category: alipayCategory,
      original_data: values,
    });
  }

  return records;
}

// 读取文件内容，支持GBK编码
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);

    // 尝试用GBK编码读取，然后回退到UTF-8
    try {
      reader.readAsText(file, 'GBK');
    } catch {
      reader.readAsText(file, 'UTF-8');
    }
  });
}

export function ImportPage() {
  const [rawRecords, setRawRecords] = useState<ParsedRecord[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [minAmountFilter, setMinAmountFilter] = useState<number | null>(null);

  // 移除自动分类匹配，保留原始记录

  // 使用 useMemo 计算过滤后的记录
  const filteredRecords = useMemo(() => {
    if (minAmountFilter === null || minAmountFilter <= 0) {
      return rawRecords;
    }
    return rawRecords.filter(record => record.amount >= minAmountFilter);
  }, [rawRecords, minAmountFilter]);

  // 在上传文件时，存储原始记录
  const handleFileChange = useCallback(async (file: File) => {
    let text: string;
    try {
      text = await readFileAsText(file);
    } catch {
      text = await file.text(); // 回退到默认编码
    }

    const records = parseAlipayCSV(text);

    if (records.length === 0) {
      message.error('CSV 文件格式不正确或没有数据');
      return false;
    }

    message.success(`解析到 ${records.length} 条记录`);
    setRawRecords(records);
    setSelectedRowKeys(records.map(r => r.key));
    return false;
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.error('请选择要导入的记录');
      return;
    }

    const recordsToImport = filteredRecords
      .filter(r => selectedRowKeys.includes(r.key))
      .filter(r => r.category_id);
    console.log(recordsToImport);
    return;

    if (recordsToImport.length === 0) {
      message.error('没有可导入的记录（需要先匹配分类）');
      return;
    }

    setImporting(true);
    setProgress(0);
    setUploaded(0);
    setTotalToImport(recordsToImport.length);

    // TODO
    // 实现API调用，导入记录
  }, [selectedRowKeys, filteredRecords]);

  const columns = [
    {
      title: '日期',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (ts: number) => new Date(ts).toLocaleDateString('zh-CN'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <span style={{ color: type === 'income' ? '#52c41a' : '#ff4d4f' }}>
          {type === 'income' ? '收入' : '支出'}
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right' as const,
      render: (amount: number, record: ParsedRecord) => (
        <span style={{
          color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {record.type === 'income' ? '+' : '-'} ¥{amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
      render: (category_name: string) => (
        <span style={{ color: '#1890ff' }}>{category_name}</span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <Space orientation="vertical" style={{ width: '100%' }} size="large">
          <Upload.Dragger
            accept=".csv"
            showUploadList={false}
            beforeUpload={handleFileChange}
            disabled={importing}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽 CSV 文件到此处上传</p>
            <p className="ant-upload-hint">支持支付宝交易明细 CSV 文件</p>
          </Upload.Dragger>

          {filteredRecords.length > 0 && (
            <Alert
              title={`已解析 ${filteredRecords.length} 条记录，请检查后点击导入`}
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>

      {filteredRecords.length > 0 && (
        <>
          <Card
            title="导入预览"
            extra={
              <Space size="middle">
                <Space>
                  <span>最低金额:</span>
                  <InputNumber
                    style={{ width: 100 }}
                    value={minAmountFilter}
                    onChange={(value) => setMinAmountFilter(value)}
                    placeholder="过滤金额"
                    min={0}
                    step={0.01}
                    precision={2}
                  />
                </Space>
                <span>
                  已选择 {selectedRowKeys.length} / {filteredRecords.length} 条
                </span>
                <Button onClick={() => setSelectedRowKeys(filteredRecords.map(r => r.key))}>
                  全选
                </Button>
                <Button onClick={() => setSelectedRowKeys([])}>
                  取消全选
                </Button>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={filteredRecords}
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedRowKeys) => setSelectedRowKeys(selectedRowKeys as string[]),
              }}
              rowKey="key"
              size="small"
              pagination={{ pageSize: 15 }}
              scroll={{ x: 800 }}
            />
          </Card>

          <Card>
            <Row gutter={24} align="middle">
              <Col flex="auto">
                {importing ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Progress percent={progress} status="active" />
                    <span>正在导入... {uploaded} / {totalToImport}</span>
                  </Space>
                ) : (
                  <span style={{ color: '#666' }}>
                    确认无误后点击「开始导入」按钮
                  </span>
                )}
              </Col>
              <Col>
                <Space>
                  <Button
                    onClick={() => {
                      setRawRecords([]);
                      setSelectedRowKeys([]);
                    }}
                    disabled={importing}
                  >
                    清除
                  </Button>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={handleImport}
                    disabled={importing || selectedRowKeys.length === 0}
                    loading={importing}
                  >
                    开始导入
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </>
      )}
    </div>
  );
}
