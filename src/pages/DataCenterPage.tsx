import { ArrowDownOutlined, ArrowUpOutlined, DownloadOutlined } from '@ant-design/icons';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Card, message, Statistic } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { ExpenseRecord, GetRecordsParams, StatsData, TableRecord } from '../types';

// @ts-expect-error - Antd icon type mismatch
const UpIcon = () => <ArrowUpOutlined />;
// @ts-expect-error - Antd icon type mismatch
const DownIcon = () => <ArrowDownOutlined />;
// @ts-expect-error - Antd icon type mismatch
const DownloadIcon = () => <DownloadOutlined />;

export function DataCenterPage() {
  const actionRef = useRef<ActionType>();
  const [stats, setStats] = useState<StatsData>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalRecords: 0,
  });
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const queryParams: GetRecordsParams = {
        page: 1,
        pageSize: 10000,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      const response = await api.client.get('/functions/v1/api_records', {
        params: queryParams,
      });

      if (response.data.code === 0) {
        const records = response.data.data.records || [];
        
        const headers = ['日期', '时间', '类型', '分类', '金额', '备注'];
        const csvRows = [
          headers.join(','),
          ...records.map((r: ExpenseRecord) => {
            const date = new Date(r.created_at);
            const dateStr = date.toLocaleDateString('zh-CN');
            const timeStr = date.toLocaleTimeString('zh-CN');
            const typeStr = r.type === 'income' ? '收入' : '支出';
            const note = r.note ? `"${r.note.replace(/"/g, '""')}"` : '';
            return `${dateStr},${timeStr},${typeStr},${r.category_name},${r.amount},${note}`;
          }),
        ].join('\n');

        const BOM = '\ufeff';
        const blob = new Blob([BOM + csvRows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `账单数据_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        message.success(`成功导出 ${records.length} 条记录`);
      } else {
        message.error(response.data.message || '导出失败');
      }
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  }, []);

  const columns: ProColumns<TableRecord>[] = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => index + 1,
      search: false,
    },
    {
      title: '日期',
      dataIndex: 'created_at',
      valueType: 'date',
      sorter: true,
      render: (_: unknown, record: TableRecord) => dayjs(record.created_at).format('YYYY-MM-DD'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: {
        income: { text: '收入', status: 'Success' },
        expense: { text: '支出', status: 'Error' },
      },
      render: (_: unknown, record: TableRecord) => (
        <span style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {record.type === 'income' ? '收入' : '支出'}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category_name',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      valueType: 'money',
      sorter: true,
      render: (_: unknown, record: TableRecord) => (
        <span style={{
          color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
          fontWeight: 600,
          fontSize: 16,
        }}>
          {record.type === 'income' ? '+' : '-'}{record.amount.toFixed(2)}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      render: (_: unknown, record: TableRecord) => record.note || '-',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
            数据中心
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            查看全部账单数据，支持筛选和导出
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<DownloadIcon />} 
          loading={exportLoading}
          onClick={handleExport}
        >
          导出 CSV
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card size="small" style={{ flex: 1, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <Statistic
            title={<span style={{ color: '#15803d' }}>总收入</span>}
            value={stats.totalIncome}
            precision={2}
            prefix={<UpIcon />}
            suffix="元"
            valueStyle={{ color: '#16a34a' }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, borderColor: '#fecaca', background: '#fef2f2' }}>
          <Statistic
            title={<span style={{ color: '#b91c1c' }}>总支出</span>}
            value={stats.totalExpense}
            precision={2}
            prefix={<DownIcon />}
            suffix="元"
            valueStyle={{ color: '#dc2626' }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, borderColor: '#bfdbfe', background: '#eff6ff' }}>
          <Statistic
            title={<span style={{ color: '#1d4ed8' }}>净收入</span>}
            value={stats.balance}
            precision={2}
            suffix="元"
            valueStyle={{ color: stats.balance >= 0 ? '#16a34a' : '#dc2626' }}
          />
        </Card>
        <Card size="small" style={{ flex: 1, borderColor: '#e5e7eb', background: '#f9fafb' }}>
          <Statistic
            title={<span style={{ color: '#6b7280' }}>记录总数</span>}
            value={stats.totalRecords}
            suffix="条"
            valueStyle={{ color: '#374151' }}
          />
        </Card>
      </div>

      <Card style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
        <ProTable<TableRecord>
          actionRef={actionRef}
          headerTitle="全部账单"
          rowKey="record_id"
          columns={columns}
          request={async (params, sort) => {
            try {
              const page = params.current || 1;
              const pageSize = params.pageSize || 50;

              const queryParams: GetRecordsParams = {
                page,
                pageSize,
                include_stats: true,
              };

              if (params.created_at) {
                queryParams.start_date = dayjs(params.created_at).format('YYYY-MM-DD');
              }

              if (params.type) {
                queryParams.type = params.type;
              }

              if (sort?.created_at) {
                queryParams.sortBy = 'created_at';
                queryParams.sortOrder = sort.created_at === 'ascend' ? 'asc' : 'desc';
              } else if (sort?.amount) {
                queryParams.sortBy = 'amount';
                queryParams.sortOrder = sort.amount === 'ascend' ? 'asc' : 'desc';
              } else {
                queryParams.sortBy = 'created_at';
                queryParams.sortOrder = 'desc';
              }

              const response = await api.client.get('/functions/v1/api_records', {
                params: queryParams,
              });

              if (response.data.code === 0) {
                const data = response.data.data;
                
                setStats({
                  totalIncome: data.totalIncome || 0,
                  totalExpense: data.totalExpense || 0,
                  balance: data.balance || 0,
                  totalRecords: data.total || 0,
                });

                return {
                  data: (data.records || []).map((r: ExpenseRecord) => ({
                    ...r,
                    key: r.record_id,
                  })),
                  success: true,
                  total: data.total || 0,
                };
              }

              message.error(response.data.message || '加载数据失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            } catch (error) {
              console.error('Failed to load records:', error);
              message.error('加载数据失败');
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          }}
          pagination={{
            defaultPageSize: 50,
            pageSizeOptions: ['50', '100', '200', '500'],
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          search={{
            labelWidth: 'auto',
          }}
          options={false}
          toolBarRender={() => []}
        />
      </Card>
    </div>
  );
}
