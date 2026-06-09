import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Asset } from '../types';

interface Props {
  asset: Asset;
  height?: number;
}

export default function PriceChart({ asset, height = 120 }: Props) {
  const data = asset.priceHistory.slice(-50).map((price, i) => ({ i, price }));
  const isUp = data.length >= 2 && data[data.length - 1]!.price >= data[0]!.price;
  const color = isUp ? '#22c55e' : '#ef4444';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="i" hide />
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.[0]) return null;
            return (
              <div className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white">
                ${(payload[0].value as number).toFixed(asset.price < 1 ? 4 : 2)}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${asset.id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
