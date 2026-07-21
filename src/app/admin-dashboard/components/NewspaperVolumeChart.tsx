'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { NEWSPAPER_VOLUME_DATA } from '@/lib/mockData';

const COLORS = [
  'hsl(210,67%,23%)', 'hsl(210,60%,30%)', 'hsl(210,55%,37%)',
  'hsl(210,50%,44%)', 'hsl(210,45%,51%)', 'hsl(210,40%,58%)',
  'hsl(210,35%,65%)', 'hsl(210,30%,72%)', 'hsl(210,25%,79%)', 'hsl(210,20%,86%)',
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[hsl(220,15%,88%)] rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500 mb-1 max-w-[120px] truncate">{label}</p>
        <p className="text-sm font-bold text-slate-900 tabular-nums">{payload[0].value.toLocaleString()} copies</p>
      </div>
    );
  }
  return null;
};

export default function NewspaperVolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={NEWSPAPER_VOLUME_DATA}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,91%)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(220,10%,55%)' }} axisLine={false} tickLine={false} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 10, fill: 'hsl(220,10%,55%)' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="netQty" radius={[0, 3, 3, 0]}>
          {NEWSPAPER_VOLUME_DATA.map((_, index) => (
            <Cell key={`cell-np-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}