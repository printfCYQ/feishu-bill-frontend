import {
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Category, ExpenseRecord } from '../types';

function RecordForm({
  editingRecord,
  categories,
  onSubmit,
  submitLoading,
}: {
  editingRecord: ExpenseRecord | null;
  categories: Category[];
  onSubmit: (values: any) => void;
  submitLoading: boolean;
}) {
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>(editingRecord?.type || 'expense');

  useEffect(() => {
    if (editingRecord) {
      form.setFieldsValue({
        ...editingRecord,
        created_at: dayjs(editingRecord.created_at),
      });
      setSelectedType(editingRecord.type);
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'expense',
        created_at: dayjs(),
      });
      setSelectedType('expense');
    }
  }, [editingRecord, form]);

  const handleSubmit = async () => {
    if (submitLoading) return;
    try {
      const values = await form.validateFields();
      const category = categories.find((c) => c.id === values.category_id);
      const submitData = {
        ...values,
        category_name: category?.name || '',
        created_at: values.created_at.valueOf(),
      };
      await onSubmit(submitData);
    } catch {
      message.error('保存失败');
    }
  };

  return (
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      <Form.Item name="type" label="类型" rules={[{ required: true }]}>
        <Radio.Group
          size="large"
          style={{ width: '100%' }}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <Radio.Button value="expense" style={{ flex: 1, textAlign: 'center' }}>
            支出
          </Radio.Button>
          <Radio.Button value="income" style={{ flex: 1, textAlign: 'center' }}>
            收入
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
        <InputNumber
          style={{ width: '100%' }}
          size="large"
          placeholder="请输入金额"
          prefix="¥"
          precision={2}
          min={0.01}
        />
      </Form.Item>

      <Form.Item
        name="category_id"
        label="分类"
        rules={[{ required: true, message: '请选择分类' }]}
      >
        <Select
          size="large"
          placeholder="请选择分类"
          options={categories
            .filter((c) => c.type === selectedType)
            .map((c) => ({
              value: c.id,
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  {c.name}
                </span>
              ),
            }))}
        />
      </Form.Item>

      <Form.Item name="created_at" label="日期">
        <DatePicker style={{ width: '100%' }} size="large" />
      </Form.Item>

      <Form.Item name="note" label="备注">
        <Input size="large" placeholder="可选，添加备注信息" />
      </Form.Item>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Button
          type="primary"
          size="large"
          block
          loading={submitLoading}
          onClick={handleSubmit}
        >
          保存
        </Button>
      </div>
    </Form>
  );
}

export function RecordsPage() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterNote, setFilterNote] = useState<string>('');
  const [filterAmountMin, setFilterAmountMin] = useState<number | undefined>();
  const [filterAmountMax, setFilterAmountMax] = useState<number | undefined>();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, categoriesRes, summaryRes] = await Promise.all([
        api.getRecords({
          year: currentMonth.year(),
          month: currentMonth.month() + 1,
          type: filterType || undefined,
          category_id: filterCategory || undefined,
          note: filterNote || undefined,
          amount_min: filterAmountMin,
          amount_max: filterAmountMax,
        }),
        api.getCategories(),
        api.getSummary(currentMonth.year(), currentMonth.month() + 1),
      ]);
      if (recordsRes.code === 0) {
        setRecords(recordsRes.data || []);
      }
      if (categoriesRes.code === 0) {
        setCategories(categoriesRes.data || []);
      }
      if (summaryRes.code === 0 && summaryRes.data) {
        setSummary({
          income: summaryRes.data.total_income || 0,
          expense: summaryRes.data.total_expense || 0,
          balance: summaryRes.data.balance || 0,
        });
      }
    } catch {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, filterType, filterCategory, filterNote, filterAmountMin, filterAmountMax]);

  const handleAdd = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleEdit = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  const handleDelete = async (record_id: string) => {
    try {
      const res = await api.deleteRecord(record_id);
      if (res.code === 0) {
        message.success('删除成功');
        loadData();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (submitData: any) => {
    setSubmitLoading(true);
    try {
      if (editingRecord) {
        const res = await api.updateRecord(editingRecord.record_id!, submitData);
        if (res.code === 0) {
          message.success('更新成功');
          setModalVisible(false);
          loadData();
        }
      } else {
        const res = await api.createRecord(submitData);
        if (res.code === 0) {
          message.success('创建成功');
          setModalVisible(false);
          loadData();
        }
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD'),
      sorter: (a: ExpenseRecord, b: ExpenseRecord) => a.created_at - b.created_at,
    },
    {
      title: '分类',
      key: 'category',
      width: 180,
      render: (_: unknown, record: ExpenseRecord) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>
            {categories.find((c) => c.id === record.category_id)?.icon || '💰'}
          </span>
          <span>{record.category_name}</span>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      align: 'right' as const,
      render: (amount: number, record: ExpenseRecord) => (
        <span style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: record.type === 'income' ? '#16a34a' : '#dc2626',
        }}>
          {record.type === 'income' ? '+' : '-'} ¥{amount.toLocaleString()}
        </span>
      ),
      sorter: (a: ExpenseRecord, b: ExpenseRecord) => a.amount - b.amount,
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: ExpenseRecord) => (
        <Space>
          <Button type="text" icon={<Edit size={16} />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.record_id!)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<Trash2 size={16} />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sortedRecords = [...records].sort((a, b) => b.created_at - a.created_at);

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
          <Button
            type="link"
            onClick={() => setCurrentMonth(dayjs())}
          >
            今天
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Select
            placeholder="全部类型"
            style={{ width: 120 }}
            value={filterType || undefined}
            onChange={setFilterType}
            options={[
              { value: '', label: '全部类型' },
              { value: 'income', label: '收入' },
              { value: 'expense', label: '支出' },
            ]}
          />
          <Select
            placeholder="全部分类"
            style={{ width: 150 }}
            value={filterCategory || undefined}
            onChange={setFilterCategory}
            options={[
              { value: '', label: '全部分类' },
              ...categories.map((c) => ({
                value: c.id,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                    {c.name}
                  </span>
                ),
              })),
            ]}
          />
          <Button
            type="primary"
            size="large"
            icon={<Plus size={20} />}
            onClick={handleAdd}
          >
            记一笔
          </Button>
        </div>
      </div>

      <Collapse
        ghost
        items={[{
          key: 'filters',
          label: '更多筛选条件',
          children: (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Input
                placeholder="备注搜索"
                style={{ width: 200 }}
                allowClear
                value={filterNote}
                onChange={(e) => setFilterNote(e.target.value)}
              />
              <span style={{ color: '#666' }}>金额:</span>
              <InputNumber
                placeholder="最小"
                style={{ width: 120 }}
                min={0}
                precision={2}
                value={filterAmountMin}
                onChange={(v) => setFilterAmountMin(v ?? undefined)}
              />
              <span style={{ color: '#666' }}>-</span>
              <InputNumber
                placeholder="最大"
                style={{ width: 120 }}
                min={0}
                precision={2}
                value={filterAmountMax}
                onChange={(v) => setFilterAmountMax(v ?? undefined)}
              />
              {(filterNote || filterAmountMin !== undefined || filterAmountMax !== undefined) && (
                <Button
                  type="link"
                  onClick={() => {
                    setFilterNote('');
                    setFilterAmountMin(undefined);
                    setFilterAmountMax(undefined);
                  }}
                >
                  清空筛选
                </Button>
              )}
            </div>
          ),
        }]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ color: '#15803d' }}>本月收入</span>}
              value={summary.income}
              precision={2}
              prefix={<ArrowUp style={{ color: '#16a34a' }} size={20} />}
              styles={{ content: { color: '#15803d', fontWeight: 'bold', fontSize: '1.5rem' } }}
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
              prefix={<ArrowDown style={{ color: '#dc2626' }} size={20} />}
              styles={{ content: { color: '#b91c1c', fontWeight: 'bold', fontSize: '1.5rem' } }}
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
              prefix={<DollarSign style={{ color: '#2563eb' }} size={20} />}
              styles={{ content: { color: '#1d4ed8', fontWeight: 'bold', fontSize: '1.5rem' } }}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={sortedRecords}
          rowKey="record_id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑记录' : '记一笔'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        cancelText="取消"
        width={500}
        footer={null}
      >
        <RecordForm
          editingRecord={editingRecord}
          categories={categories}
          onSubmit={handleSubmit}
          submitLoading={submitLoading}
        />
      </Modal>
    </div>
  );
}
