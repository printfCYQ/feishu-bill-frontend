import {
  LogoutOutlined,
  BarChartOutlined,
  FileTextOutlined,
  UploadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import React from 'react';
import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem } from '@ant-design/pro-components';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const menuData: MenuDataItem[] = [
  {
    path: '/',
    name: '统计分析',
    icon: React.createElement(BarChartOutlined),
  },
  {
    path: '/records',
    name: '账单记录',
    icon: React.createElement(FileTextOutlined),
  },
  {
    path: '/import',
    name: '导入数据',
    icon: React.createElement(UploadOutlined),
  },
  {
    path: '/categories',
    name: '分类管理',
    icon: React.createElement(TagsOutlined),
  },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ProLayout
      location={{
        pathname: location.pathname,
      }}
      logo={
        <div style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: 'white',
          fontWeight: 'bold',
        }}>
          ¥
        </div>
      }
      title="飞书记账"
      layout="mix"
      splitMenus={false}
      fixedHeader
      contentWidth="Fluid"
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <div onClick={() => navigate(item.path || '/')}>
          {dom}
        </div>
      )}
      actionsRender={() => [
        React.createElement(
          'div',
          {
            key: 'logout',
            onClick: handleLogout,
            style: { cursor: 'pointer', color: '#666', fontSize: 16 },
          },
          React.createElement(LogoutOutlined)
        ),
      ]}
    >
      {children}
    </ProLayout>
  );
}
