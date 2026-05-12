import { Button, Card, message, Spin, Typography } from 'antd';
import { DollarSign, LogIn } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

export function LoginPage() {
  const { setUser, setAccessToken } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const loginAttemptedRef = useRef(false);

  const handleLogin = useCallback(async (code: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await api.login(code);
      if (res.code === 0) {
        setAccessToken(res.data.access_token);
        setUser({
          open_id: res.data.feishu_user.open_id,
          name: res.data.feishu_user.name,
          avatar: res.data.feishu_user.avatar_url,
        });
        message.success('登录成功！');
        navigate('/');
      } else {
        message.error(res.message || '登录失败，请重新登录');
        loginAttemptedRef.current = false;
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    } catch (error) {
      console.error('Login failed:', error);
      message.error('登录失败，请重新登录');
      loginAttemptedRef.current = false;
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [loading, setAccessToken, setUser, navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !loginAttemptedRef.current) {
      loginAttemptedRef.current = true;
      handleLogin(code);
    }
  }, [handleLogin, searchParams]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <Spin size="large" description="正在登录..." />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #eff6ff, #eef2ff)',
    }}>
      <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(to bottom right, #2563eb, #4f46e5)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}>
            <DollarSign size={40} style={{ color: 'white' }} />
          </div>
          <Title level={2} style={{ marginBottom: 8 }}>飞书记账</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>使用飞书账号登录，开始记账</Text>
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<LogIn size={20} />}
          href={api.getFeishuAuthUrl()}
          style={{ height: 56, fontSize: 18 }}
        >
          飞书账号登录
        </Button>
      </Card>
    </div>
  );
}
