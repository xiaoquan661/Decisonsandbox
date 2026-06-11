export interface DecisionOption {
  id: string;
  name: string;
  scores: Record<string, number>; // dimensionId -> score 0-10
}

export interface Dimension {
  id: string;
  name: string;
  weight: number; // raw positive number
  aiRecommended?: boolean;
}

export interface TimelineNode {
  id: string;
  optionId: string;
  month: number; // 1-12
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export type DecisionStatus = 'draft' | 'locked';

export interface Decision {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lockedAt?: number;
  status: DecisionStatus;
  options: DecisionOption[];
  dimensions: Dimension[];
  timelineNodes: TimelineNode[];
  timelineSpan: number; // months
  timelineSkipped: boolean;
  selectedOptionId?: string; // F7 选中的最终决定
  reason: string;
  category: 'career' | 'study' | 'project' | 'daily' | 'other';
}

export const DIMENSION_TEMPLATES: Record<string, { label: string; dimensions: string[] }> = {
  career: {
    label: '职业包',
    dimensions: ['薪资', '成长性', '城市', '团队氛围', '行业前景', 'WLB'],
  },
  study: {
    label: '学业包',
    dimensions: ['兴趣', '难度', '导师', '资源', '产出', '就业帮助'],
  },
  project: {
    label: '项目包',
    dimensions: ['ROI', '风险', '资源依赖', '周期', '可验证性'],
  },
  daily: {
    label: '生活包',
    dimensions: ['成本', '社交', '家庭', '时间', '自由度'],
  },
};

export const CATEGORY_LABELS: Record<Decision['category'], string> = {
  career: '职业',
  study: '学业',
  project: '项目',
  daily: '日常',
  other: '其他',
};
