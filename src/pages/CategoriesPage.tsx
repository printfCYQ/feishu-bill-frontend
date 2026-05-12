import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
} from 'antd';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Category } from '../types';

const defaultIcons = ['🍔', '🚗', '🏠', '🎮', '📚', '💊', '💼', '💰', '🎁', '🛒'];

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(defaultIcons[0]);
  const [form] = Form.useForm();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.getCategories();
      if (res.code === 0) {
        setCategories(res.data || []);
      }
    } catch {
      message.error('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCategoriesAsync = async () => {
      await loadCategories();
    };
    loadCategoriesAsync();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setSelectedIcon(defaultIcons[0]);
    form.resetFields();
    form.setFieldsValue({ type: 'expense', icon: defaultIcons[0] });
    setModalVisible(true);
  };

  const handleEdit = (record: Category) => {
    setEditingCategory(record);
    setSelectedIcon(record.icon);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
    form.setFieldValue('icon', icon);
  };

  const handleDelete = async (record_id: string) => {
    try {
      const res = await api.deleteCategory(record_id);
      if (res.code === 0) {
        message.success('删除成功');
        loadCategories();
      }
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    if (submitLoading) return;

    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      if (editingCategory) {
        const res = await api.updateCategory(editingCategory.record_id!, values);
        if (res.code === 0) {
          message.success('更新成功');
          setModalVisible(false);
          loadCategories();
        }
      } else {
        const res = await api.createCategory(values);
        if (res.code === 0) {
          message.success('创建成功');
          setModalVisible(false);
          loadCategories();
        }
      }
    } catch {
      message.error('保存失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (icon: string) => <span style={{ fontSize: 32 }}>{icon}</span>,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#374151' }}>{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'income' ? 'green' : 'red'}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: unknown, record: Category) => (
        <Space>
          <Button
            type="text"
            icon={<Edit size={16} />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0, marginBottom: 4 }}>
            分类管理
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>
            管理记账分类，自定义你的收支标签
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<Plus size={20} />}
          onClick={handleAdd}
        >
          添加分类
        </Button>
      </div>

      <Card style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="record_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={500}
        confirmLoading={submitLoading}
        okButtonProps={{ disabled: submitLoading }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：餐饮" size="large" />
          </Form.Item>

          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Radio.Group size="large">
              <Radio.Button value="expense">支出</Radio.Button>
              <Radio.Button value="income">收入</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="icon" label="图标" trigger="onChange" getValueFromEvent={() => selectedIcon}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {defaultIcons.map((icon) => (
                <Button
                  key={icon}
                  type={selectedIcon === icon ? 'primary' : 'default'}
                  onClick={() => handleIconSelect(icon)}
                  style={{ fontSize: 24, height: 48, width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
