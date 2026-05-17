export interface AlipayCategoryMapping {
  [key: string]: {
    target: string;
    type: 'expense' | 'income' | 'auto';
  };
}

// 支付宝分类到系统分类的映射
export const ALIPAY_CATEGORY_MAPPING: AlipayCategoryMapping = {
  // 支出类
  '餐饮美食': { target: '餐饮', type: 'expense' },
  '交通出行': { target: '交通', type: 'expense' },
  '爱车养车': { target: '交通', type: 'expense' },
  '充值缴费': { target: '通讯', type: 'expense' },
  '服饰装扮': { target: '服饰', type: 'expense' },
  '日用百货': { target: '日用', type: 'expense' },
  '家居家装': { target: '居家', type: 'expense' },
  '数码电器': { target: '数码', type: 'expense' },
  '运动户外': { target: '运动', type: 'expense' },
  '美容美发': { target: '美容', type: 'expense' },
  '母婴亲子': { target: '生活', type: 'expense' },
  '宠物': { target: '生活', type: 'expense' },
  '住房物业': { target: '住房', type: 'expense' },
  '酒店旅游': { target: '旅行', type: 'expense' },
  '文化休闲': { target: '娱乐', type: 'expense' },
  '教育培训': { target: '学习', type: 'expense' },
  '医疗健康': { target: '医疗', type: 'expense' },
  '生活服务': { target: '生活', type: 'expense' },
  '公共服务': { target: '生活', type: 'expense' },
  '商业服务': { target: '生活', type: 'expense' },
  '公益捐赠': { target: '捐赠', type: 'expense' },
  '互助保障': { target: '生活', type: 'expense' },
  '投资理财': { target: '其它', type: 'auto' },
  '保险': { target: '生活', type: 'expense' },
  '信用借还': { target: '其它', type: 'auto' },
  '转账红包': { target: '礼金', type: 'auto' },
  '亲友代付': { target: '礼金', type: 'auto' },
  '账户存取': { target: '其它', type: 'auto' },
  '退款': { target: '其它', type: 'auto' },
  
  // 收入类
  '收入': { target: '工资', type: 'income' },
};

// 所有支付宝分类列表
export const ALL_ALIPAY_CATEGORIES = Object.keys(ALIPAY_CATEGORY_MAPPING);

/**
 * 将支付宝分类映射到系统分类
 * @param alipayCategory 支付宝分类名
 * @param recordType 记录类型（可选，用于自动判断）
 * @returns 映射后的系统分类名
 */
export function mapAlipayCategory(
  alipayCategory: string,
  recordType?: 'income' | 'expense'
): { category: string; type: 'income' | 'expense' } {
  const mapping = ALIPAY_CATEGORY_MAPPING[alipayCategory];
  
  if (mapping) {
    let finalType: 'income' | 'expense';
    
    if (mapping.type === 'auto') {
      // 自动根据记录类型判断
      finalType = recordType || 'expense';
    } else {
      finalType = mapping.type;
    }
    
    return {
      category: mapping.target,
      type: finalType
    };
  }
  
  // 未找到映射时的默认处理
  return {
    category: '其它',
    type: recordType || 'expense'
  };
}

/**
 * 批量获取映射统计
 * @param categories 支付宝分类数组
 * @returns 映射统计信息
 */
export function getMappingStatistics(categories: string[]): {
  [alipayCat: string]: {
    count: number;
    target: string;
  };
} {
  const stats: { [key: string]: { count: number; target: string } } = {};
  
  categories.forEach(cat => {
    if (!stats[cat]) {
      const mapped = mapAlipayCategory(cat);
      stats[cat] = {
        count: 0,
        target: mapped.category
      };
    }
    stats[cat].count++;
  });
  
  return stats;
}
