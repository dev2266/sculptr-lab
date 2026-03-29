import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export const VelocityTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey="fatigue" 
            stroke="#FF3B30" 
            fill="transparent" 
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
