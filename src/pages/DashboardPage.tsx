import { Column, Line, Pie } from '@ant-design/charts';
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
import type { ChartsData } from '../types';
import { add, divide } from '../utils/math';

type TimeDimension = 'month' | 'year' | 'all';

export function DashboardPage() {
  const [dimension, setDimension] = useState<TimeDimension>('month');
  const [currentPeriod, setCurrentPeriod] = useState(dayjs());
  const [chartsData, setChartsData] = useState<ChartsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChartsData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.client.get('/functions/v1/api_records', {
        params: dimension === 'all'
          ? { action: 'all_summary' }
          : {
              action: 'charts_summary',
              year: currentPeriod.year(),
              ...(dimension === 'month' ? { month: currentPeriod.month() + 1 } : {}),
            },
      });
      
      if (response.data.code === 0) {
        const data = response.data.data;
        
        if (dimension === 'all') {
          // 转换为 ChartsData 格式
          setChartsData({
            year: 0,
            month: 0,
            current_month: {
              total_income: data.total_income,
              total_expense: data.total_expense,
              balance: data.balance,
              category_stats: data.category_stats || {},
              top_categories: data.top_categories || [],
            },
            year_months: data.year_months || [],
            top_categories: data.top_categories || [],
            category_stats: data.category_stats || {},
            total_income: data.total_income,
            total_expense: data.total_expense,
            balance: data.balance,
            years: data.years || [],
            cumulative_years: data.cumulative_years || [],
          });
        } else {
          setChartsData(data);
        }
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
    } else if (dimension === 'year') {
      if (currentPeriod.isBefore(now, 'year')) {
        setCurrentPeriod((prev) => prev.add(1, 'year'));
      }
    }
  };

  const periodLabel = dimension === 'month'
    ? currentPeriod.format('YYYY年MM月')
    : dimension === 'year'
    ? `${currentPeriod.year()}年`
    : '全部数据';

  const isCurrentPeriod = dimension === 'month'
    ? currentPeriod.isSame(dayjs(), 'month')
    : dimension === 'year'
    ? currentPeriod.year() === dayjs().year()
    : false;

  // 准备饼图数据
  const pieData = useMemo(() => {
    if (!chartsData) return [];
    
    const getCategoryStats = () => {
      if (dimension === 'all') return chartsData.category_stats || {};
      if (dimension === 'year' && chartsData.year_total) return chartsData.year_total.category_stats;
      return chartsData.current_month?.category_stats || {};
    };
    const categoryStats = getCategoryStats();
    
    return Object.entries(categoryStats)
      .filter(([, stats]) => stats.expense > 0)
      .map(([name, stats]) => ({
        type: name,
        value: stats.expense,
      }))
      .sort((a, b) => b.value - a.value);
  }, [chartsData, dimension]);

  // 准备月度柱状图数据
  const monthColumnData = useMemo(() => {
    if (!chartsData) return [];
    
    const getIncome = () => {
      if (dimension === 'all') return chartsData.total_income || 0;
      if (dimension === 'year' && chartsData.year_total) return chartsData.year_total.total_income;
      return chartsData.current_month?.total_income || 0;
    };
    const getExpense = () => {
      if (dimension === 'all') return chartsData.total_expense || 0;
      if (dimension === 'year' && chartsData.year_total) return chartsData.year_total.total_expense;
      return chartsData.current_month?.total_expense || 0;
    };
    
    return [
      { type: '收入', value: getIncome() },
      { type: '支出', value: getExpense() },
    ];
  }, [chartsData, dimension]);

  // 准备年度柱状图数据
  const yearColumnData = useMemo(() => {
    if (!chartsData) return [];
    
    if (dimension === 'all' && chartsData.years) {
      // 全部数据：直接使用后端计算好的年份聚合数据
      return chartsData.years.flatMap(y => [
        { month: `${y.year}年`, type: '收入', value: y.total_income },
        { month: `${y.year}年`, type: '支出', value: y.total_expense },
      ]);
    }
    
    return chartsData.year_months.flatMap(d => [
      { month: `${d.month}月`, type: '收入', value: d.total_income },
      { month: `${d.month}月`, type: '支出', value: d.total_expense },
    ]);
  }, [chartsData, dimension]);

  // 准备折线图数据
  const lineData = useMemo(() => {
    if (!chartsData) return [];
    
    if (dimension === 'all' && chartsData.cumulative_years) {
      // 全部数据：直接使用后端计算好的累计趋势
      return chartsData.cumulative_years.flatMap(y => [
        { month: `${y.year}年`, type: '收入', value: y.cumulative_income },
        { month: `${y.year}年`, type: '支出', value: y.cumulative_expense },
      ]);
    }
    
    let cumIncome = 0;
    let cumExpense = 0;
    return chartsData.year_months.flatMap(d => {
      // 精度问题：使用高精度计算工具函数
      cumIncome = add(cumIncome, d.total_income);
      cumExpense = add(cumExpense, d.total_expense);
      return [
        { month: `${d.month}月`, type: '收入', value: cumIncome },
        { month: `${d.month}月`, type: '支出', value: cumExpense },
      ];
    });
  }, [chartsData, dimension]);

  // Top5分类数据
  const topCategories = useMemo(() => {
    if (!chartsData) return [];
    
    if (dimension === 'all') {
      return chartsData.top_categories || [];
    } else if (dimension === 'year' && chartsData.year_total) {
      return chartsData.year_total.top_categories;
    }
    
    return chartsData.current_month?.top_categories || [];
  }, [chartsData, dimension]);

  // 计算总支出用于百分比
  const totalExpense = useMemo(() => {
    // 精度问题：使用高精度计算工具函数
    return topCategories.reduce((sum, item) => add(sum, item.expense), 0);
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
            { label: '全部', value: 'all' },
          ]}
        />
      </div>

      {/* 顶部统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <Statistic
              title={<span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowUp size={18} /> {dimension === 'month' ? '本月' : dimension === 'year' ? '本年' : '累计'}收入
              </span>}
              value={(() => {
                if (dimension === 'all') return chartsData?.total_income || 0;
                if (dimension === 'year' && chartsData?.year_total) return chartsData.year_total.total_income;
                return chartsData?.current_month?.total_income || 0;
              })()}
              precision={2}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
            <Statistic
              title={<span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ArrowDown size={18} /> {dimension === 'month' ? '本月' : dimension === 'year' ? '本年' : '累计'}支出
              </span>}
              value={(() => {
                if (dimension === 'all') return chartsData?.total_expense || 0;
                if (dimension === 'year' && chartsData?.year_total) return chartsData.year_total.total_expense;
                return chartsData?.current_month?.total_expense || 0;
              })()}
              precision={2}
              formatter={(value) => `¥${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}>
            <Statistic
              title={<span style={{ color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={18} /> {dimension === 'month' ? '本月' : dimension === 'year' ? '本年' : '累计'}结余
              </span>}
              value={(() => {
                if (dimension === 'all') return chartsData?.balance || 0;
                if (dimension === 'year' && chartsData?.year_total) return chartsData.year_total.balance;
                return chartsData?.current_month?.balance || 0;
              })()}
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
                      percent={totalExpense > 0 ? Math.round(divide(item.expense * 100, totalExpense)) : 0}
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
