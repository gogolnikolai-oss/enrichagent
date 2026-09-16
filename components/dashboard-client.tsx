"use client"

import { useState } from "react"
import { SearchConsole } from "@/components/search-console"
import { ResultsTable } from "@/components/results-table"
import { EnrichmentResult } from "@/lib/types"

export function DashboardClient() {
  const [results, setResults] = useState<EnrichmentResult[]>([])

  return (
    <div className="space-y-8">
      <SearchConsole onResults={setResults} />
      <ResultsTable results={results} />
    </div>
  )
}
