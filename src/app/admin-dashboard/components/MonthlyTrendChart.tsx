'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MONTHLY_CHART_DATA } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[hsl(220,15%,88%)] rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500 mb-1">{label} 2025/26</p>
        <p className="text-sm font-bold text-slate-900 tabular-nums">
          ₹{payload[0].value.toLocaleString('en-IN')}
        </p>
      </div>
    );
  }
  return null;
};

export default function MonthlyTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={MONTHLY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(210,67%,23%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(210,67%,23%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,91%)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'hsl(220,10%,55%)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(220,10%,55%)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(210,67%,23%)"
          strokeWidth={2.5}
          fill="url(#monthlyGrad)"
          dot={{ fill: 'hsl(210,67%,23%)', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}