import { Pie, Column, Line } from '@ant-design/charts';
import { Button, Card, Col, Empty, message, Progress, Row, Segmented, Spin, Statistic } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type TimeDimension = 'month' | 'year';

interface MonthData {
  month: number;
  total_income: number;
  total_expense: number;
  balance: number;
  category_stats: Record<string, { income: number; expense: number }>;
}

interface TopCategory {
  name: string;
  expense: number;
}

interface ChartsData {
  year: number;
  month: number;
  current_month: {
    total_income: number;
    total_expense: number;
    balance: number;
    category_stats: Record<string, { income: number; expense: number }>;
    top_categories: TopCategory[];
  };
  year_months: MonthData[];
}

export function DashboardPage() {
  const [dimension, setDimension] = useState<TimeDimension>('month');
  const [currentPeriod, setCurrentPeriod] = useState(dayjs());
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChartsData = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentPeriod.year();
      const month = dimension === 'month' ? currentPeriod.month() + 1 : undefined;
      
      const params: { action: string; year: number; month?: number } = {
        action: 'charts_summary',
        year,
      };
      
      if (month) {
        params.month = month;
      }
      
      const response = await api.client.get('/functions/v1/api_records', { params });
      
      if (response.data.code === 0) {
        setChartsData(response.data.data);
      }
    } catch {
      message.error('加载图表数据失败');
    } finally {
      setLoading(false);
    }
  }, [currentPeriod, dimension]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChartsData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadChartsData]);

  const handlePrevPeriod = () => {
    if (dimension === 'month') {
      setCurrentPeriod((prev) => prev.subtract(1, 'month'));
    } else {
      setCurrentPeriod((prev) => prev.subtract(1, 'year'));
    }
  };

  const handleNextPeriod = () => {
    const now = dayjs();
    if (dimension === 'month') {
      if (currentPeriod.isBefore(now, 'month')) {
        setCurrentPeriod((prev) => prev.add(1, 'month'));
      }
    } else {
      if (currentPeriod.isBefore(now, 'year')) {
        setCurrentPeriod((prev) => prev.add(1, 'year'));
      }
    }
  };

  const periodLabel = dimension === 'month'
    ? currentPeriod.format('YYYY年MM月')
    : `${currentPeriod.year()}年`;

  const isCurrentPeriod = dimension === 'month'
    ? currentPeriod.isSame(dayjs(), 'month')
    : currentPeriod.year() === dayjs().year();

  // 准备饼图数据
  const pieData = useMemo(() => {
    if (!chartsData?.current_month?.category_stats) return [];
    return Object.entries(chartsData.current_month.category_stats)
      .filter(([, stats]) => stats.expense > 0)
      .map(([name, stats]) => ({
        type: name,
        value: stats.expense,
      }))
      .sort((a, b) => b.value - a.value);
  }, [chartsData]);

  // 准备月度柱状图数据
  const monthColumnData = useMemo(() => {
    if (!chartsData?.current_month) return [];
    return [
      { type: '收入', value: chartsData.current_month.total_income },
      { type: '支出', value: chartsData.current_month.total_expense },
    ];
  }, [chartsData]);

  // 准备年度柱状图数据
  const yearColumnData = useMemo(() => {
    if (!chartsData?.year_months) return [];
    return chartsData.year_months.flatMap(d => [
      { month: `${d.month}月`, type: '收入', value: d.total_income },
      { month: `${d.month}月`, type: '支出', value: d.total_expense },
    ]);
  }, [chartsData]);

  // 准备折线图数据
  const lineData = useMemo(() => {
    if (!chartsData?.year_months) return [];
    return chartsData.year_months.flatMap(d => [
      { month: `${d.month}月`, type: '收入', value: d.total_income },
      { month: `${d.month}月`, type: '支出', value: d.total_expense },
    ]);
  }, [chartsData]);

  // Top5分类数据
  const topCategories = useMemo(() => {
    if (!chartsData?.current_month?.top_categories) return [];
    return chartsData.current_month.top_categories;
  }, [chartsData]);

  // 计算总支出用于百分比
  const totalExpense = useMemo(() => {
    return topCategories.reduce((sum, item) => sum + item.expense, 0);
  }, [topCategories]);

  // 饼图配置
  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'outer',
      content: '{percentage}',
    } as const,
    legend: {
      position: 'bottom' as const,
    } as const,
    statistic: {
      title: {
        content: '支出总计',
        style: { fontSize: 14 },
      },
      content: {
        content: `¥${(chartsData?.current_month?.total_expense || 0).toLocaleString()}`,
        style: { fontSize: 20, fontWeight: 'bold' },
      },
    } as const,
  };

  // 月度柱状图配置
  const monthColumnConfig = {
    data: monthColumnData,
    xField: 'type',
    yField: 'value',
    colorField: 'type',
    color: ['#22c55e', '#ef4444'],
    label: {
      position: 'middle' as const,
      style: { fill: '#fff', fontWeight: 'bold' },
    } as const,
    xAxis: {
      label: {
        style: { fontSize: 14 },
      },
    } as const,
    yAxis: {
      label: {
        style: { fontSize: 12 },
      },
    } as const,
    legend: false,
  };

  // 年度柱状图配置
  const yearColumnConfig = {
    data: yearColumnData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    color: ['#22c55e', '#ef4444'],
    label: {
      position: 'middle' as const,
      style: { fill: '#fff', fontSize: 10, fontWeight: 'bold' },
    } as const,
    xAxis: {
      label: {
        style: { fontSize: 12 },
      },
    } as const,
    yAxis: {
      label: {
        style: { fontSize: 12 },
      },
    } as const,
    legend: {
      position: 'bottom' as const,
    } as const,
  };

  // 折线图配置
  const lineConfig = {
    data: lineData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    color: ['#22c55e', '#ef4444'],
    point: {
      size: 5,
      shape: 'circle',
    } as const,
    smooth: true,
    xAxis: {
      label: {
        style: { fontSize: 12 },
      },
    } as const,
    yAxis: {
      label: {
        style: { fontSize: 12 },
      },
    } as const,
    legend: {
      position: 'bottom' as const,
    } as const,
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
      }}>
        <Spin size="large" />
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
            onClick={handlePrevPeriod}
          />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            {periodLabel}图表统计
          </h2>
          <Button
            type="text"
            icon={<ChevronRight size={18} />}
            onClick={handleNextPeriod}
            disabled={isCurrentPeriod}
          />
        </div>
        <Segmented
          value={dimension}
          onChange={(value) => setDimension(value as TimeDimension)}
          options={[
            { label: '月度', value: 'month' },
            { label: '年度', value: 'year' },
          ]}
        />
      </div>

      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUp size={18} /> {dimension === 'month' ? '本月' : '本年'}收入
              </span>}
              value={dimension === 'month' 
                ? (chartsData?.current_month?.total_income || 0) 
                : (chartsData?.year_months?.reduce((sum, d) => sum + d.total_income, 0) || 0)
              }
              precision={2}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <Statistic
              title={<span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDown size={18} /> {dimension === 'month' ? '本月' : '本年'}支出
              </span>}
              value={dimension === 'month' 
                ? (chartsData?.current_month?.total_expense || 0) 
                : (chartsData?.year_months?.reduce((sum, d) => sum + d.total_expense, 0) || 0)
              }
              precision={2}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
            <Statistic
              title={<span style={{ color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={18} /> {dimension === 'month' ? '本月' : '本年'}结余
              </span>}
              value={dimension === 'month' 
                ? (chartsData?.current_month?.balance || 0) 
                : (chartsData?.year_months?.reduce((sum, d) => sum + d.balance, 0) || 0)
              }
              precision={2}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 第一排：饼图 + 柱状图 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="支出分类占比（饼图）">
            {pieData.length === 0 ? (
              <Empty description="暂无支出数据" />
            ) : (
              <div style={{ height: 350 }}>
                <Pie {...pieConfig} />
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="收支对比（柱状图）">
            {dimension === 'month' ? (
              <div style={{ height: 350 }}>
                <Column {...monthColumnConfig} />
              </div>
            ) : (
              <div style={{ height: 350 }}>
                <Column {...yearColumnConfig} />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 第二排：折线图 + Top5排行 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="收支趋势（折线图）">
            <div style={{ height: 350 }}>
              <Line {...lineConfig} />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top 5 支出排行">
            {topCategories.length === 0 ? (
              <Empty description="暂无支出数据" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topCategories.map((item, index) => (
                  <div key={item.name}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}>
                      <span style={{ fontWeight: 500 }}>
                        {index + 1}. {item.name}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#dc2626' }}>
                        ¥{item.expense.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      percent={totalExpense > 0 ? Math.round((item.expense / totalExpense) * 100) : 0}
                      strokeColor="#ef4444"
                      showInfo={false}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
