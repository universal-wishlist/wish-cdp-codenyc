import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import URI from "urijs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanUrl(url: string) {
  const uri = new URI(url)
  uri.query("")
  return uri.toString()
}

export function formatPrice(price: number): string {
  const hasDecimals = price % 1 !== 0
  const firstDecimal = Math.floor((price % 1) * 10)

  if (!hasDecimals || firstDecimal === 0) {
    return price.toLocaleString("en-US")
  }

  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
