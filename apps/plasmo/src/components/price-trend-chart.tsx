import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { formatPrice } from "@/lib/utils"
import { Line, LineChart } from "recharts"

interface PricePoint {
  date: string
  price: number
}

interface PriceTrendChartProps {
  data: PricePoint[]
  currentPrice: number
  className?: string
}

export function PriceTrendChart({
  data,
  currentPrice,
  className
}: PriceTrendChartProps) {
  if (!data || data.length === 0) {
    return null
  }

  const priceChange = data.length > 1 ? currentPrice - data[0].price : 0
  const isPositive = priceChange >= 0

  const chartConfig = {
    price: {
      label: "Price",
      color: isPositive ? "hsl(var(--destructive))" : "hsl(var(--chart-2))"
    }
  }

  return (
    <ChartContainer config={chartConfig} className={`h-12 w-20 ${className}`}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--color-price)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 2, stroke: "var(--color-price)" }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`$${formatPrice(Number(value))}`, "Price"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
          }
        />
      </LineChart>
    </ChartContainer>
  )
}
