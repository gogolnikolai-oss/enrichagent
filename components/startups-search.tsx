"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Rocket, DollarSign, Calendar, Users, Building, ExternalLink, Download, Search, Loader2 } from "lucide-react"
import * as xlsx from "xlsx"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StartupFunding } from "@/lib/types"

export function StartupsSearch() {
  const [timeWindowMonths, setTimeWindowMonths] = useState(6)
  const [round, setRound] = useState("")
  const [industry, setIndustry] = useState("")
  const [minFunding, setMinFunding] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<StartupFunding[]>([])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    setLoading(true)
    try {
      const res = await fetch("/api/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeWindowMonths,
          round: round || undefined,
          industry: industry || undefined,
          minFunding: minFunding > 0 ? minFunding : undefined,
        }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setResults(data.results || [])
      toast.success(`Found ${data.count || 0} funded startups in last ${timeWindowMonths} months`)
    } catch (err: any) {
      toast.error(err.message || "Failed to search startups")
    } finally {
      setLoading(false)
    }
  }

  // Load initial results on mount
  useEffect(() => {
    handleSearch()
  }, [])

  const exportToExcel = () => {
    if (results.length === 0) return
    const exportData = results.map((s) => ({
      Company: s.name,
      Domain: s.domain || "N/A",
      Industry: s.industry,
      Funding_Round: s.funding_round,
      Amount_USD: s.funding_amount_usd,
      Funding_Date: s.funding_date,
      City: s.city,
      State: s.state || "",
      Investors: (s.investors || []).join(", "),
      Founders: (s.founders || []).join(", "),
      SEC_Filing: s.sec_filing_url || "",
      Description: s.description,
    }))
    const ws = xlsx.utils.json_to_sheet(exportData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Startups_Funding")
    xlsx.writeFile(wb, `startups_funding_last_${timeWindowMonths}m.xlsx`)
    toast.success("Downloaded Excel spreadsheet")
  }

  const exportToCSV = () => {
    if (results.length === 0) return
    const exportData = results.map((s) => ({
      Company: s.name,
      Domain: s.domain || "N/A",
      Industry: s.industry,
      Funding_Round: s.funding_round,
      Amount_USD: s.funding_amount_usd,
      Funding_Date: s.funding_date,
      City: s.city,
      State: s.state || "",
      Investors: (s.investors || []).join("; "),
      Founders: (s.founders || []).join("; "),
    }))
    const ws = xlsx.utils.json_to_sheet(exportData)
    const csvOutput = xlsx.utils.sheet_to_csv(ws)
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `startups_funding_last_${timeWindowMonths}m.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Downloaded CSV file")
  }

  const formatFunding = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`
    }
    return `$${amount}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            New Startups & Venture Funding Intelligence
          </CardTitle>
          <CardDescription>
            Real-time startup venture funding rounds and angel investments from SEC EDGAR Form D filings & open tech directories. Cost: 1 credit per search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeWindow">Funding Timeframe</Label>
                <select
                  id="timeWindow"
                  value={timeWindowMonths}
                  onChange={(e) => setTimeWindowMonths(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value={1}>Last 30 Days (Recent)</option>
                  <option value={3}>Last 3 Months (Quarter)</option>
                  <option value={6}>Last 6 Months (Recommended)</option>
                  <option value={12}>Last 12 Months (Full Year)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="round">Funding Stage / Round</Label>
                <select
                  id="round"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">All Stages</option>
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Venture">Growth / Venture</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry / Sector</Label>
                <Input
                  id="industry"
                  placeholder="AI, FinTech, Robotics, Health..."
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minFunding">Min Funding Amount</Label>
                <select
                  id="minFunding"
                  value={minFunding}
                  onChange={(e) => setMinFunding(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value={0}>Any Amount</option>
                  <option value={500000}>$500k+</option>
                  <option value={1000000}>$1M+ (Institutional)</option>
                  <option value={5000000}>$5M+ (Early Growth)</option>
                  <option value={10000000}>$10M+ (Scale)</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Querying SEC EDGAR & YC Feeds...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Filter Startups
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Found {results.length} Funded Startups</CardTitle>
              <CardDescription>
                Funded in the last {timeWindowMonths} months • Verified amounts, lead investors, and founders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
              <Button variant="default" size="sm" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Funding Round</TableHead>
                  <TableHead>Amount Raised</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead Investors</TableHead>
                  <TableHead>Founders</TableHead>
                  <TableHead>SEC Filing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-semibold">{s.name}</div>
                      {s.domain && (
                        <a
                          href={`https://${s.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {s.domain}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {s.industry}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          s.funding_round === "Series A" || s.funding_round === "Series B"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }
                      >
                        {s.funding_round}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatFunding(s.funding_amount_usd)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.funding_date}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={(s.investors || []).join(", ")}>
                      {(s.investors || []).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={(s.founders || []).join(", ")}>
                      {(s.founders || []).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {s.sec_filing_url && (
                        <a
                          href={s.sec_filing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Form D
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
