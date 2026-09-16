"use client"

import * as React from "react"
import { Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface CreditBadgeProps {
  credits: number
  isLoading?: boolean
}

export function CreditBadge({ credits, isLoading = false }: CreditBadgeProps) {
  // Simple animation placeholder using key keying
  const [animate, setAnimate] = React.useState(false)

  React.useEffect(() => {
    setAnimate(true)
    const t = setTimeout(() => setAnimate(false), 300)
    return () => clearTimeout(t)
  }, [credits])

  let colorClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  if (credits <= 10) {
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
  } else if (credits <= 50) {
    colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 font-medium transition-all duration-300", 
        colorClass,
        animate && "scale-110",
        isLoading && "opacity-50"
      )}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{isLoading ? "..." : credits.toLocaleString()}</span>
    </Badge>
  )
}
