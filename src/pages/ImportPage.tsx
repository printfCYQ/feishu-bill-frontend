import { InboxOutlined, UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Alert, Button, Card, Col, InputNumber, Modal, Progress, Row, Select, Space, Tag, Typography, Upload, message } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Category, ImportSource, ParsedRecord } from '../types';
import { detectCSVType, parseAlipayCSV, parseSharkCSV, readFileAsText } from '../utils/csvParser';
import { getMappingStatistics } from '../utils/alipayCategoryMapping';

export function ImportPage() {
  const [rawRecords, setRawRecords] = useState<ParsedRecord[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [minAmountFilter, setMinAmountFilter] = useState<number | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>('alipay');
  const [categories, setCategories] = useState<Category[]>([]);

  const filteredRecords = useMemo(() => {
    if (minAmountFilter === null || minAmountFilter <= 0) {
      return rawRecords;
    }
    // 对收入和支出都使用绝对值进行过滤
    return rawRecords.filter(record => Math.abs(record.amount) >= minAmountFilter);
  }, [rawRecords, minAmountFilter]);

  // 计算支付宝分类映射统计（仅在导入支付宝账单时显示）
  const mappingStats = useMemo(() => {
    if (importSource !== 'alipay' || filteredRecords.length === 0) {
      return null;
    }
    const sourceCategories = filteredRecords.map(r => r.source_category);
    return getMappingStatistics(sourceCategories);
  }, [importSource, filteredRecords]);

  // 验证映射后的分类是否存在于系统分类表中
  const missingCategories = useMemo(() => {
    if (importSource !== 'alipay' || filteredRecords.length === 0 || categories.length === 0) {
      return null;
    }
    
    const categoryNames = new Set(categories.map(c => c.name));
    const missing = new Map<string, number>();
    
    filteredRecords.forEach(record => {
      const mappedCategory = record.category_name;
      if (!categoryNames.has(mappedCategory)) {
        const current = missing.get(mappedCategory) || 0;
        missing.set(mappedCategory, current + 1);
      }
    });
    
    return missing.size > 0 ? missing : null;
  }, [importSource, filteredRecords, categories]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.getCategories();
      if (res.code === 0) {
        setCategories(res.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const handleFileChange = useCallback(async (file: File) => {
    // 先加载分类，以便后续验证
    await loadCategories();
    
    // 尝试两种编码，取能解析成功的
    let records: ParsedRecord[] = [];
    let detectedType: ImportSource | null = null;

    const encodings = importSource === 'shark'
      ? ['UTF-16', 'UTF-8']
      : ['GBK', 'UTF-8', 'UTF-16'];

    for (const encoding of encodings) {
      let text: string;
      try {
        text = await readFileAsText(file, encoding);
      } catch {
        continue;
      }

      const type = detectCSVType(text);
      if (type) {
        let result: ParsedRecord[] = [];
        if (type === 'alipay') {
          result = parseAlipayCSV(text);
        } else if (type === 'shark') {
          result = parseSharkCSV(text);
        }

        if (result.length > 0) {
          records = result;
          detectedType = type;
          break;
        }
      }
    }

    if (detectedType && detectedType !== importSource) {
      setImportSource(detectedType);
    }

    if (records.length === 0) {
      message.error('CSV 文件格式不正确或没有数据');
      return false;
    }

    message.success(`解析到 ${records.length} 条记录`);
    setRawRecords(records);
    setSelectedRowKeys(records.map(r => r.key));
    return false;
  }, [importSource, loadCategories]);

  const handleSourceChange = useCallback((value: ImportSource) => {
    setImportSource(value);
    message.info(`已切换到${value === 'alipay' ? '支付宝' : '鲨鱼记账'}模式`);
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.error('请选择要导入的记录');
      return;
    }

    await loadCategories();

    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });

    const recordsToImport = filteredRecords
      .filter(r => selectedRowKeys.includes(r.key))
      .filter(r => r.category_name)
      .map(r => {
        const category_id = categoryMap.get(r.category_name) || '';
        return {
          created_at: r.created_at,
          id: crypto.randomUUID(),
          type: r.type,
          amount: r.amount,
          category_id,
          category_name: r.category_name,
          note: r.note,
        };
      })
      .filter(r => r.category_id);

    if (recordsToImport.length === 0) {
      message.error('没有可导入的记录（可能分类名称不匹配）');
      return;
    }

    const skipped = filteredRecords.filter(r => selectedRowKeys.includes(r.key) && !r.category_name).length;
    if (skipped > 0) {
      message.warning(`已跳过 ${skipped} 条无法匹配分类的记录`);
    }

    Modal.confirm({
      title: '确认导入',
      content: `确定要导入 ${recordsToImport.length} 条记录吗？`,
      onOk: async () => {
        setImporting(true);
        setProgress(0);
        setUploaded(0);
        setTotalToImport(recordsToImport.length);

        try {
          const response = await api.batchCreateRecords(
            recordsToImport.map(r => ({
              created_at: r.created_at,
              id: crypto.randomUUID(),
              type: r.type,
              amount: r.amount,
              category_id: r.category_id,
              category_name: r.category_name,
              note: r.note,
            }))
          );

          if (response.code === 0) {
            const { success_count, error_count, errors } = response.data;
            setUploaded(success_count);
            setProgress(100);

            if (error_count === 0) {
              message.success(`成功导入 ${success_count} 条记录`);
              setRawRecords([]);
              setSelectedRowKeys([]);
            } else {
              Modal.warning({
                title: '导入完成',
                content: (
                  <div>
                    <p>成功导入: {success_count} 条</p>
                    <p>失败: {error_count} 条</p>
                    <div style={{ maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 12 }}>
                      {errors.map((err: string, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: '#666' }}>{err}</div>
                      ))}
                    </div>
                  </div>
                ),
              });
            }
          } else {
            throw new Error(response.message || '导入失败');
          }
        } catch (error) {
          console.error('Import error:', error);
          message.error(error instanceof Error ? error.message : '导入失败');
        } finally {
          setImporting(false);
        }
      },
    });
  }, [selectedRowKeys, filteredRecords, categories, loadCategories]);

  const columns: ProColumns<ParsedRecord>[] = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: React.ReactNode, __: ParsedRecord, index: number) => index + 1,
    },
    {
      title: '日期',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (ts: React.ReactNode) => new Date(ts as number).toLocaleDateString('zh-CN'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: React.ReactNode) => (
        <span style={{ color: type === 'income' ? '#52c41a' : '#ff4d4f' }}>
          {type === 'income' ? '收入' : '支出'}
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right',
      render: (_: React.ReactNode, record: ParsedRecord) => (
        <span style={{
          color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {record.type === 'income' ? '+' : '-'} ¥{(record.amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '系统分类',
      dataIndex: 'category_name',
      key: 'category_name',
      width: 120,
      render: (category_name: React.ReactNode, record: ParsedRecord) => (
        <span style={{ color: '#1890ff' }}>
          {category_name}
          {importSource === 'alipay' && 
           record.source_category && 
           record.source_category !== category_name && (
            <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>
              已映射
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: '原始分类',
      dataIndex: 'source_category',
      key: 'source_category',
      width: 120,
      hideInTable: importSource !== 'alipay', // 仅在支付宝模式下显示
      render: (source_category: React.ReactNode) => {
        if (importSource !== 'alipay' || !source_category) return null;
        return (
          <span style={{ color: '#666', fontSize: 12 }}>
            {source_category}
          </span>
        );
      },
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
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space>
            <span>导入来源：</span>
            <Select
              value={importSource}
              onChange={handleSourceChange}
              style={{ width: 150 }}
              disabled={importing || rawRecords.length > 0}
              options={[
                { label: '支付宝', value: 'alipay' },
                { label: '鲨鱼记账', value: 'shark' },
              ]}
            />
          </Space>

          <Upload.Dragger
            accept=".csv"
            showUploadList={false}
            beforeUpload={handleFileChange}
            disabled={importing}
          >
            <p className="ant-upload-drag-icon">
              {React.createElement(InboxOutlined)}
            </p>
            <p className="ant-upload-text">
              点击或拖拽 CSV 文件到此处上传
            </p>
            <p className="ant-upload-hint">
              支持 {importSource === 'alipay' ? '支付宝交易明细' : '鲨鱼记账明细'} CSV 文件
            </p>
          </Upload.Dragger>

          {filteredRecords.length > 0 && (
            <Alert
              message={
                minAmountFilter && minAmountFilter > 0
                  ? `已解析 ${rawRecords.length} 条记录，过滤后 ${filteredRecords.length} 条`
                  : `已解析 ${filteredRecords.length} 条记录，请检查后点击导入`
              }
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>

      {filteredRecords.length > 0 && (
        <>
          {/* 支付宝分类映射统计（仅在导入支付宝账单时显示） */}
          {mappingStats && (
            <Card
              title={
                <Space>
                  {React.createElement(InfoCircleOutlined)}
                  支付宝分类映射统计
                </Space>
              }
              size="small"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {Object.entries(mappingStats).map(([alipayCat, info]) => (
                  <div key={alipayCat} style={{ 
                    padding: '8px 16px', 
                    background: '#f5f5f5', 
                    borderRadius: 8,
                    minWidth: 200
                  }}>
                    <Space direction="vertical" size={4}>
                      <Space>
                        <Tag color="default">{alipayCat}</Tag>
                        <span style={{ fontSize: 12, color: '#999' }}>→</span>
                        <Tag color="blue">{info.target}</Tag>
                      </Space>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {info.count} 条记录
                      </Typography.Text>
                    </Space>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  💡 提示：映射规则在 <code>src/utils/alipayCategoryMapping.ts</code> 中配置，如需要修改请联系开发人员。
                </Typography.Text>
              </div>
            </Card>
          )}

          {/* 缺失分类警告（仅在导入支付宝账单且有缺失时显示） */}
          {missingCategories && (
            <Alert
              message="发现缺失的系统分类"
              description={
                <div>
                  <p>以下映射后的分类在系统分类表中不存在，这些记录将无法导入：</p>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {Array.from(missingCategories.entries()).map(([name, count]) => (
                      <li key={name}><strong>{name}</strong> ({count} 条记录)</li>
                    ))}
                  </ul>
                  <p>请先在系统中添加这些分类，或修改映射规则。</p>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

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
            <ProTable
              columns={columns}
              request={async () => ({
                data: filteredRecords,
                success: true,
                total: filteredRecords.length,
              })}
              rowSelection={{
                selectedRowKeys,
                onChange: (selectedRowKeys) => setSelectedRowKeys(selectedRowKeys as string[]),
              }}
              rowKey="key"
              size="small"
              pagination={{
                defaultPageSize: 15,
                pageSizeOptions: [10, 15, 25, 50, 100],
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              scroll={{ x: 800 }}
              search={false}
              options={false}
            />
          </Card>

          <Card>
            <Row gutter={[24, 0]} align="middle">
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
                    icon={React.createElement(UploadOutlined)}
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
