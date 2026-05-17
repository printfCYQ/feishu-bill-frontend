import { PlusOutlined } from '@ant-design/icons';
import { ModalForm, ProFormDatePicker, ProFormDigit, ProFormRadio, ProFormSelect, ProFormText, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Button, Card, Col, DatePicker, message, Modal, Row, Statistic, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, DollarSign, Edit2, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Category, ExpenseRecord, RecordFormValues } from '../types';

export function RecordsPage() {
  const actionRef = useRef<ActionType>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.getCategories();
      if (res.code === 0) {
        setCategories(res.data || []);
      }
    } catch {
      message.error('加载分类失败');
    }
  }, []);

  const loadSummary = useCallback(async (month: Dayjs) => {
    try {
      const res = await api.getSummary(month.year(), month.month() + 1);
      if (res.code === 0 && res.data) {
        setSummary({
          income: res.data.total_income || 0,
          expense: res.data.total_expense || 0,
          balance: res.data.balance || 0,
        });
      }
    } catch {
      message.error('加载统计失败');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSummary(currentMonth);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentMonth, loadSummary]);

  const handleDelete = useCallback(async (record_id: string) => {
    try {
      const res = await api.deleteRecord(record_id);
      if (res.code === 0) {
        message.success('删除成功');
        actionRef.current?.reload();
        loadSummary(currentMonth);
      }
    } catch {
      message.error('删除失败');
    }
  }, [currentMonth, loadSummary]);

  const handleSubmit = useCallback(async (values: RecordFormValues) => {
    try {
      const category = categories.find((c) => c.id === values.category_id);
      let createdAt: number;

      const dateValue = values.created_at;

      if (dayjs.isDayjs(dateValue)) {
        createdAt = dateValue.valueOf();
      } else if (typeof dateValue === 'number' && dateValue > 0) {
        createdAt = dateValue;
      } else if (typeof dateValue === 'string' && dateValue) {
        const parsed = dayjs(dateValue);
        if (parsed.isValid()) {
          createdAt = parsed.valueOf();
        } else {
          createdAt = Date.now();
        }
      } else {
        createdAt = Date.now();
      }

      const submitData = {
        id: crypto.randomUUID(),
        type: values.type,
        amount: values.amount,
        category_id: values.category_id,
        category_name: category?.name || '',
        note: values.note || '',
        created_at: createdAt,
      };

      if (editingRecord) {
        const res = await api.updateRecord(editingRecord.record_id!, submitData);
        if (res.code === 0) {
          message.success('更新成功');
          setEditingRecord(null);
          actionRef.current?.reload();
          loadSummary(currentMonth);
        }
      } else {
        const res = await api.createRecord(submitData);
        if (res.code === 0) {
          message.success('创建成功');
          setEditingRecord(null);
          actionRef.current?.reload();
          loadSummary(currentMonth);
        }
      }
    } catch {
      message.error('保存失败');
    }
  }, [categories, editingRecord, currentMonth, loadSummary]);

  const categoryOptions = useMemo(() => {
    const filtered = categories.filter((c) => {
      if (formType === 'income') return c.type === 'income';
      return c.type === 'expense';
    });
    return filtered.map((c) => ({
      value: c.id,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{c.icon}</span>
          {c.name}
        </span>
      ),
    }));
  }, [categories, formType]);

  const columns: ProColumns<ExpenseRecord>[] = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
      search: false,
    },
    {
      title: '日期',
      dataIndex: 'created_at',
      valueType: 'date',
      width: 120,
      render: (_: React.ReactNode, record: ExpenseRecord) => dayjs(record.created_at).format('YYYY-MM-DD'),
      sorter: (a: ExpenseRecord, b: ExpenseRecord) => a.created_at - b.created_at,
    },
    {
      title: '分类',
      dataIndex: 'category_name',
      valueType: 'select',
      width: 180,
      render: (_: React.ReactNode, record: ExpenseRecord) => {
        const cat = categories.find((c) => c.id === record.category_id);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{cat?.icon || '💰'}</span>
            <span>{record.category_name}</span>
          </div>
        );
      },
      fieldProps: {
        placeholder: '选择分类',
        options: categoryOptions,
        allowClear: true,
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      width: 100,
      render: (_: React.ReactNode, record: ExpenseRecord) => (
        <Tag color={record.type === 'income' ? 'green' : 'red'}>
          {record.type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
      fieldProps: {
        placeholder: '类型',
        options: [
          { value: 'income', label: '收入' },
          { value: 'expense', label: '支出' },
        ],
        allowClear: true,
      },
      valueEnum: {
        income: { text: '收入', status: 'Success' },
        expense: { text: '支出', status: 'Error' },
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      valueType: 'money',
      width: 150,
      align: 'right',
      render: (_: React.ReactNode, record: ExpenseRecord) => (
        <span style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: record.type === 'income' ? '#16a34a' : '#dc2626',
        }}>
          {record.type === 'income' ? '+' : '-'} ¥{record.amount.toLocaleString()}
        </span>
      ),
      sorter: (a: ExpenseRecord, b: ExpenseRecord) => a.amount - b.amount,
      search: false,
    },
    {
      title: '备注',
      dataIndex: 'note',
      valueType: 'text',
      render: (text: React.ReactNode) => (text as string) || '-',
      fieldProps: {
        placeholder: '搜索备注',
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      search: false,
      render: (_: React.ReactNode, record: ExpenseRecord) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="text"
            icon={React.createElement(Edit2, { size: 16 })}
            onClick={() => { setEditingRecord(record); setModalOpen(true); }}
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={React.createElement(Trash2, { size: 16 })}
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这条记录吗？',
                onOk: () => handleDelete(record.record_id!),
              });
            }}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text"
            icon={<ChevronLeft size={18} />}
            onClick={() => setCurrentMonth((prev) => prev.subtract(1, 'month'))}
          />
          <DatePicker
            picker="month"
            value={currentMonth}
            onChange={(date) => date && setCurrentMonth(date)}
            style={{ width: 140 }}
            allowClear={false}
            format="YYYY年MM月"
          />
          <Button
            type="text"
            icon={<ChevronRight size={18} />}
            onClick={() => setCurrentMonth((prev) => prev.add(1, 'month'))}
          />
          <Button type="link" onClick={() => setCurrentMonth(dayjs())}>
            今天
          </Button>
        </div>
        <Button type="primary" size="large" icon={React.createElement(PlusOutlined)} onClick={() => { setEditingRecord(null); setModalOpen(true); }}>
          记一笔
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ color: '#15803d' }}>本月收入</span>}
              value={summary.income}
              precision={2}
              prefix={<ArrowUp style={{ color: '#16a34a' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <Statistic
              title={<span style={{ color: '#b91c1c' }}>本月支出</span>}
              value={summary.expense}
              precision={2}
              prefix={<ArrowDown style={{ color: '#dc2626' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
            <Statistic
              title={<span style={{ color: '#1d4ed8' }}>本月结余</span>}
              value={summary.balance}
              precision={2}
              prefix={<DollarSign style={{ color: '#2563eb' }} />}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <ProTable
          actionRef={actionRef}
          columns={columns}
          request={async (params) => {
            try {
              const response = await api.client.get('/functions/v1/api_records', {
                params: {
                  year: currentMonth.year(),
                  month: currentMonth.month() + 1,
                  type: params.type,
                  category_id: params.category_id,
                  note: params.note,
                  page: params.current || 1,
                  pageSize: params.pageSize || 25,
                },
              });
              
              if (response.data.code === 0) {
                const data = response.data.data;
                return {
                  data: data.records || [],
                  success: true,
                  total: data.total || 0,
                };
              }
              
              return {
                data: [],
                success: false,
                total: 0,
              };
            } catch {
              return {
                data: [],
                success: false,
                total: 0,
              };
            }
          }}
          rowKey="record_id"
          search={{}}
          pagination={{
            defaultPageSize: 25,
            pageSizeOptions: [10, 25, 50, 100],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          options={false}
          toolBarRender={() => []}
        />
      </Card>

      <ModalForm
        key={`${modalOpen}-${editingRecord?.record_id || 'new'}`}
        title={editingRecord ? '编辑记录' : '记一笔'}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setEditingRecord(null);
            setFormType('expense');
          }
        }}
        onFinish={async (values) => {
          await handleSubmit(values as RecordFormValues);
          setModalOpen(false);
          return true;
        }}
        initialValues={editingRecord ? {
          ...editingRecord,
          type: editingRecord.type === 'income' ? 'income' : 'expense',
          created_at: editingRecord.created_at ? dayjs(editingRecord.created_at) : dayjs(),
        } : {
          type: formType,
          created_at: dayjs(),
        }}
      >
        <ProFormRadio.Group
          name="type"
          label="类型"
          options={[
            { label: '支出', value: 'expense' },
            { label: '收入', value: 'income' },
          ]}
          rules={[{ required: true }]}
          fieldProps={{ onChange: (e) => setFormType(e.target.value) }}
        />
        <ProFormDigit
          name="amount"
          label="金额"
          min={0.01}
          precision={2}
          fieldProps={{ prefix: '¥' }}
          rules={[{ required: true, message: '请输入金额' }]}
        />
        <ProFormSelect
          name="category_id"
          label="分类"
          options={categoryOptions}
          rules={[{ required: true, message: '请选择分类' }]}
        />
        <ProFormDatePicker name="created_at" label="日期" />
        <ProFormText name="note" label="备注" placeholder="可选，添加备注信息" />
      </ModalForm>
    </div>
  );
}
