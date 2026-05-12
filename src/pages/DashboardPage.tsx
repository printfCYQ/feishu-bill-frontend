import { Button, Card, Col, Empty, message, Row, Spin, Statistic } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SummaryData } from '../types';

export function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSummary(currentMonth.year(), currentMonth.month() + 1);
      if (res.code === 0) {
        setSummary(res.data);
      }
    } catch {
      message.error('加载财务概览失败');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    const fetchData = async () => {
      await loadSummary();
    };
    fetchData();
  }, [currentMonth, loadSummary]);

  const categoryStats = summary?.category_stats
    ? Object.entries(summary.category_stats).map(([name, stats]) => ({
        name,
        income: stats.income,
        expense: stats.expense,
        total: stats.income - stats.expense,
      }))
    : [];

  const sortedCategoryStats = [...categoryStats].sort((a, b) => {
    const absA = Math.abs(a.income) + Math.abs(a.expense);
    const absB = Math.abs(b.income) + Math.abs(b.expense);
    return absB - absA;
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 384,
      }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            type="text"
            icon={<ChevronLeft size={18} />}
            onClick={() => setCurrentMonth((prev) => prev.subtract(1, 'month'))}
          />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            {currentMonth.format('YYYY年MM月')}财务概览
          </h2>
          <Button
            type="text"
            icon={<ChevronRight size={18} />}
            onClick={() => setCurrentMonth((prev) => prev.add(1, 'month'))}
          />
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bbf7d0', background: '#f0fdf4', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <Statistic
              title={<span style={{ color: '#15803d', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUp size={18} /> 本月收入
              </span>}
              value={summary?.total_income || 0}
              precision={2}
              styles={{ content: { color: '#15803d', fontWeight: 'bold', fontSize: '2rem' } }}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#fecaca', background: '#fef2f2', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
            <Statistic
              title={<span style={{ color: '#b91c1c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDown size={18} /> 本月支出
              </span>}
              value={summary?.total_expense || 0}
              precision={2}
              styles={{ content: { color: '#b91c1c', fontWeight: 'bold', fontSize: '2rem' } }}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{
            borderColor: '#bfdbfe',
            background: '#eff6ff',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)',
          }}>
            <Statistic
              title={<span style={{
                color: '#1d4ed8',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <DollarSign size={18} /> 本月结余
              </span>}
              value={summary?.balance || 0}
              precision={2}
              styles={{
                content: {
                  color: (summary?.balance || 0) >= 0 ? '#1d4ed8' : '#b91c1c',
                  fontWeight: 'bold',
                  fontSize: '2rem',
                },
              }}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <PieChart size={20} /> 分类统计
        </span>}
        style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}
      >
        {sortedCategoryStats.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedCategoryStats.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  backgroundColor: '#f9fafb',
                  transition: 'background-color 0.2s',
                }}
              >
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  {item.income > 0 && (
                    <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 18 }}>
                      +¥{item.income.toLocaleString()}
                    </span>
                  )}
                  {item.expense > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 18 }}>
                      -¥{item.expense.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
