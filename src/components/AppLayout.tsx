import type { MenuProps } from 'antd';
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from 'antd';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LogOut,
  Receipt,
  Tags,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <BarChart3 size={20} />,
    label: <Link to="/">统计分析</Link>,
  },
  {
    key: '/records',
    icon: <Receipt size={20} />,
    label: <Link to="/records">账单记录</Link>,
  },
  {
    key: '/categories',
    icon: <Tags size={20} />,
    label: <Link to="/categories">分类管理</Link>,
  },
];

interface LabelWithProps {
  props?: {
    children?: string;
  };
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getPageTitle = () => {
    const currentItem = menuItems?.find((item) => item?.key === location.pathname);
    if (currentItem && 'label' in currentItem && currentItem.label) {
      if (typeof currentItem.label === 'object' && currentItem.label !== null && 'props' in currentItem.label) {
        return (currentItem.label as LabelWithProps).props?.children || '首页';
      }
    }
    return '首页';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        width={260}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign size={22} style={{ color: 'white' }} />
            </div>
            {!collapsed && (
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>飞书记账</span>
            )}
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ border: 'none', marginTop: 16 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Button
            type="text"
            icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginRight: 16 }}
          />
          <Title level={4} style={{ margin: 0 }}>
            {getPageTitle()}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 8,
              }}>
                <Avatar
                  size="large"
                  icon={<User size={20} />}
                  src={user?.avatar}
                />
                {user?.name && (
                  <span style={{ color: '#374151', fontWeight: 500 }}>{user.name}</span>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ background: '#f9fafb', padding: 24, overflow: 'auto' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
