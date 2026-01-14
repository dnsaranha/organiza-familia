import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { getCategoryIcon, getCategoryColor, DEFAULT_CATEGORY_ICONS } from '@/lib/category-icons';
import * as LucideIcons from 'lucide-react';

interface ChartDataItem {
  name: string;
  value: number;
  icon?: string;
  color?: string;
}

interface ExpenseByCategoryBarChartProps {
  data: ChartDataItem[];
  userCategories?: { name: string; icon: string; color: string }[];
}

// Default colors for categories without custom colors
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
};

const CustomXAxisTick = ({ x, y, payload, userCategories }: any) => {
  const categoryName = payload.value;
  const iconName = getCategoryIcon(categoryName, userCategories);
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
  const color = getCategoryColor(categoryName, userCategories);

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-16} y={0} width={32} height={32}>
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: color }}
        >
          <IconComponent className="h-4 w-4 text-white" />
        </div>
      </foreignObject>
    </g>
  );
};

const CustomTooltip = ({ active, payload, userCategories }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const iconName = getCategoryIcon(data.name, userCategories);
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
  const color = getCategoryColor(data.name, userCategories);

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ backgroundColor: color }}
        >
          <IconComponent className="h-3 w-3 text-white" />
        </div>
        <span className="font-medium text-sm">{data.name}</span>
      </div>
      <p className="text-lg font-bold">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.value)}
      </p>
    </div>
  );
};

const ExpenseByCategoryBarChart = ({ data, userCategories = [] }: ExpenseByCategoryBarChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Nenhuma despesa para exibir.
      </div>
    );
  }

  // Sort by value descending and take top 6 categories
  const sortedData = [...data]
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item, index) => ({
      ...item,
      color: getCategoryColor(item.name, userCategories) || CHART_COLORS[index % CHART_COLORS.length],
    }));

  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Total summary */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <LucideIcons.BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total de gastos</span>
        </div>
        <span className="font-bold">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
        </span>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
          >
            <XAxis
              dataKey="name"
              tick={(props) => <CustomXAxisTick {...props} userCategories={userCategories} />}
              tickLine={false}
              axisLine={false}
              interval={0}
              height={50}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} userCategories={userCategories} />} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              <LabelList
                dataKey="value"
                position="top"
                formatter={formatCurrency}
                style={{ fontSize: '11px', fill: 'hsl(var(--foreground))' }}
              />
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExpenseByCategoryBarChart;
