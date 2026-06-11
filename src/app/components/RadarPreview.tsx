// 维度雷达图：把所有选项在每个维度上的分数（已归一化到 0-10）
// 用 recharts RadarChart 叠加显示
// 悬停某选项时高亮该 polyline，其他降到低透明

import { useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Decision } from './types';

const OPTION_COLORS = ['#6366F1', '#A855F7', '#10B981', '#F59E0B', '#EC4899', '#71717A'];

interface RadarPreviewProps {
  decision: Decision;
  hoveredOptionId?: string | null;
}

export function RadarPreview({ decision, hoveredOptionId }: RadarPreviewProps) {
  const data = useMemo(() => {
    if (decision.dimensions.length === 0) return [];
    return decision.dimensions.map((dim) => {
      const point: Record<string, string | number> = { dimension: dim.name };
      decision.options.forEach((opt) => {
        point[opt.id] = opt.scores[dim.id] ?? 5;
      });
      return point;
    });
  }, [decision.dimensions, decision.options]);

  if (data.length === 0) {
    return (
      <div className="aspect-square max-h-[220px] flex items-center justify-center bg-muted/30 border border-dashed border-border rounded-md">
        <p className="text-[11px] text-muted-foreground italic">先选维度</p>
      </div>
    );
  }

  return (
    <div className="aspect-square max-h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <PolarGrid stroke="#1F1F29" strokeDasharray="2 2" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#71717A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#71717A', fontSize: 8 }}
            tickCount={3}
            axisLine={false}
          />
          {decision.options.map((opt, i) => {
            const isHovered = hoveredOptionId === opt.id;
            const othersHovered = hoveredOptionId && hoveredOptionId !== opt.id;
            return (
              <Radar
                key={opt.id}
                name={opt.name}
                dataKey={opt.id}
                stroke={OPTION_COLORS[i % 6]}
                fill={OPTION_COLORS[i % 6]}
                fillOpacity={isHovered ? 0.4 : othersHovered ? 0.05 : 0.18}
                strokeOpacity={isHovered ? 1 : othersHovered ? 0.3 : 0.7}
                strokeWidth={isHovered ? 2 : 1}
                isAnimationActive
                animationDuration={400}
              />
            );
          })}
          <Tooltip
            contentStyle={{
              backgroundColor: '#14141A',
              border: '1px solid #1F1F29',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'JetBrains Mono',
              padding: '6px 10px',
            }}
            labelStyle={{ color: '#E4E4E7', marginBottom: 4 }}
            itemStyle={{ color: '#E4E4E7' }}
            cursor={{ stroke: '#2A2A36', strokeWidth: 1 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
