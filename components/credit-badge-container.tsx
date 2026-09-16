"use client"

import { useEffect, useState } from "react"
import { CreditBadge } from "@/components/credit-badge"

export function CreditBadgeContainer() {
  const [credits, setCredits] = useState<number | null>(null)
  
  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch("/api/user/credits")
        if (res.ok) {
          const data = await res.json()
          setCredits(data.credits ?? 0)
        } else {
          setCredits(0)
        }
      } catch (err) {
        console.error("Error fetching credits:", err)
        setCredits(0)
      }
    }
    
    fetchCredits()
  }, [])
  
  return <CreditBadge credits={credits ?? 0} isLoading={credits === null} />
}
