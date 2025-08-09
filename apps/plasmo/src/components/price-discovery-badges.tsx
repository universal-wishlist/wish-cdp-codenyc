import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Target, TrendingDown, TrendingUp } from "lucide-react"

interface PriceDiscoveryBadgesProps {
  currentPrice: number
  previousPrice?: number
  priceHistory?: Array<{ date: string; price: number }>
  targetPrice?: number
  maxBadges?: number
  className?: string
}

export function PriceDiscoveryBadges({
  currentPrice,
  previousPrice,
  priceHistory = [],
  targetPrice,
  maxBadges = 2,
  className
}: PriceDiscoveryBadgesProps) {
  const badges = []

  if (targetPrice && currentPrice <= targetPrice) {
    badges.push({
      key: "target-reached",
      variant: "default" as const,
      icon: Target,
      text: "Target Hit",
      className: "bg-emerald-100 text-emerald-800 border-emerald-300",
      priority: 1
    })
  }

  if (priceHistory.length >= 3) {
    const recentPrices = priceHistory.slice(-5).map((p) => p.price)
    const avgRecentPrice =
      recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    const dealThreshold = avgRecentPrice * 0.9

    if (currentPrice <= dealThreshold) {
      badges.push({
        key: "deal-alert",
        variant: "default" as const,
        icon: Target,
        text: "Deal!",
        className: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse",
        priority: 2
      })
    }
  }

  if (previousPrice && previousPrice !== currentPrice) {
    const change = currentPrice - previousPrice
    const changePercent = ((change / previousPrice) * 100).toFixed(1)
    const isDecrease = change < 0

    badges.push({
      key: "price-change",
      variant: isDecrease ? "default" : ("destructive" as const),
      icon: isDecrease ? TrendingDown : TrendingUp,
      text: `${isDecrease ? "" : "+"}${changePercent}%`,
      className: isDecrease
        ? "bg-green-100 text-green-800 border-green-300"
        : "bg-red-100 text-red-800 border-red-300",
      priority: 3
    })
  }

  if (priceHistory.length >= 7) {
    const prices = priceHistory.slice(-7).map((p) => p.price)
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const volatility = ((maxPrice - minPrice) / minPrice) * 100

    if (volatility > 15) {
      badges.push({
        key: "volatility",
        variant: "outline" as const,
        icon: AlertTriangle,
        text: "Volatile",
        className: "text-orange-600 border-orange-300",
        priority: 4
      })
    }
  }

  const prioritizedBadges = badges
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxBadges)

  if (prioritizedBadges.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {prioritizedBadges.map(
        ({ key, variant, icon: Icon, text, className: badgeClassName }) => (
          <Badge
            key={key}
            variant={variant}
            className={`px-1 py-0.5 text-[10px] leading-none ${badgeClassName}`}>
            <Icon className="mr-0.5 h-2.5 w-2.5" />
            {text}
          </Badge>
        )
      )}
    </div>
  )
}
