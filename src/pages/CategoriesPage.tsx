import React from 'react';
import { ModalForm, ProFormRadio, ProFormText, ProTable, type ActionType } from '@ant-design/pro-components';
import { Button, Card, message, Tag } from 'antd';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../lib/api';
import type { Category } from '../types';

const defaultIcons = ['🍔', '🚗', '🏠', '🎮', '📚', '💊', '💼', '💰', '🎁', '🛒'];

export function CategoriesPage() {
  const actionRef = useRef<ActionType>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState(defaultIcons[0]);

  const handleEdit = (record: Category) => {
    setEditingCategory(record);
    setSelectedIcon(record.icon);
  };

  const handleIconSelect = (icon: string) => {
    setSelectedIcon(icon);
  };

  const handleDelete = async (record_id: string) => {
    try {
      const res = await api.deleteCategory(record_id);
      if (res.code === 0) {
        message.success('删除成功');
        actionRef.current?.reload();
      }
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => index + 1,
      search: false,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (icon: React.ReactNode) => <span style={{ fontSize: 32 }}>{icon}</span>,
      search: false,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: React.ReactNode) => <span style={{ fontWeight: 500, color: '#374151' }}>{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: React.ReactNode) => (
        <Tag color={(type as string) === 'income' ? 'green' : 'red'}>
          {(type as string) === 'income' ? '收入' : '支出'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      search: false,
      render: (_: unknown, record: Category) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="text" icon={React.createElement(Edit2, { size: 16 })} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="text" danger icon={React.createElement(Trash2, { size: 16 })} onClick={() => handleDelete(record.record_id!)}>
            删除
          </Button>
        </div>
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
          onClick={() => {
            setEditingCategory(null);
            setSelectedIcon(defaultIcons[0]);
          }}
        >
          添加分类
        </Button>
      </div>

      <Card style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
        <ProTable
          actionRef={actionRef}
          columns={columns}
          request={async () => {
            try {
              const res = await api.getCategories();
              return {
                data: res.data || [],
                success: res.code === 0,
                total: res.data?.length || 0,
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
          search={false}
          pagination={{
            defaultPageSize: 10,
            pageSizeOptions: [10, 25, 50, 100],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          options={false}
        />
      </Card>

      <ModalForm
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={!!editingCategory || false}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
          }
        }}
        onFinish={async (values) => {
          const formValues = values as { name: string; type: 'income' | 'expense' };
          const submitData = {
            ...formValues,
            icon: selectedIcon,
          };

          try {
            if (editingCategory) {
              const res = await api.updateCategory(editingCategory.record_id!, submitData);
              if (res.code === 0) {
                message.success('更新成功');
                actionRef.current?.reload();
              }
            } else {
              const res = await api.createCategory(submitData);
              if (res.code === 0) {
                message.success('创建成功');
                actionRef.current?.reload();
              }
            }
          } catch {
            message.error('保存失败');
          }
        }}
        initialValues={editingCategory || { type: 'expense' }}
      >
        <ProFormText
          name="name"
          label="分类名称"
          placeholder="例如：餐饮"
          rules={[{ required: true, message: '请输入分类名称' }]}
        />

        <ProFormRadio.Group
          name="type"
          label="类型"
          options={[
            { label: '支出', value: 'expense' },
            { label: '收入', value: 'income' },
          ]}
          rules={[{ required: true }]}
        />

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>图标</label>
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
        </div>
      </ModalForm>
    </div>
  );
}
