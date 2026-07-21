'use client';

import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { PAYMENT_STATUS_DATA } from '@/lib/mockData';

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[hsl(220,15%,88%)] rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500 mb-0.5">{payload[0].name}</p>
        <p className="text-sm font-bold text-slate-900 tabular-nums">{payload[0].value} hawkers</p>
      </div>
    );
  }
  return null;
};

export default function PaymentStatusChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={PAYMENT_STATUS_DATA}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {PAYMENT_STATUS_DATA.map((entry, index) => (
            <Cell key={`cell-ps-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}