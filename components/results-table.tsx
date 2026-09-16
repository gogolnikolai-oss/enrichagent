"use client"

import { useState } from "react"
import { Download, Send, Eye, EyeOff, Bookmark, FileSpreadsheet, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import * as xlsx from "xlsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EnrichmentResult } from "@/lib/types"
import { ExportDialog } from "@/components/export-dialog"
import { GoogleSheetsExportDialog } from "@/components/google-sheets-export-dialog"

export function ResultsTable({ results }: { results: EnrichmentResult[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [isExportOpen, setIsExportOpen] = useState(false)

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/20 text-center">
        <h3 className="text-xl font-semibold mb-2">No results yet</h3>
        <p className="text-muted-foreground">Search for leads to get started</p>
      </div>
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(results.map((r, i) => r.contact?.id || i.toString())))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleReveal = (id: string) => {
    const next = new Set(revealedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setRevealedIds(next)
  }

  const maskString = (str?: string | null) => {
    if (!str) return "-"
    return str.substring(0, 3) + "***" + str.substring(str.length - 3)
  }

  const maskEmail = (email?: string | null) => {
    if (!email) return "-"
    const [local, domain] = email.split("@")
    if (!domain) return maskString(email)
    return local.substring(0, 2) + "***@" + domain
  }

  const selectedLeads = results.filter((r, i) => selectedIds.has(r.contact?.id || i.toString()))

  const exportCsv = () => {
    if (selectedLeads.length === 0) return
    const ws = xlsx.utils.json_to_sheet(selectedLeads)
    const csv = xlsx.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "leads.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportXlsx = () => {
    if (selectedLeads.length === 0) return
    const ws = xlsx.utils.json_to_sheet(selectedLeads)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Leads")
    xlsx.writeFile(wb, "leads.xlsx")
  }

  const [isSheetsOpen, setIsSheetsOpen] = useState(false)

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-md">
          <span className="text-sm font-medium mr-auto pl-2">
            {selectedIds.size} selected
          </span>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={exportXlsx}>
            <Download className="h-4 w-4 mr-2" />
            XLSX
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsSheetsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Sync Google Sheets
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsExportOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Webhook
          </Button>
          <Button variant="secondary" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Save to My Leads
          </Button>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedIds.size === results.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((lead, index) => {
              const leadId = lead.contact?.id || index.toString()
              const isRevealed = revealedIds.has(leadId)
              return (
                <TableRow key={leadId}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.has(leadId)}
                      onCheckedChange={() => toggleSelect(leadId)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lead.contact?.first_name} {lead.contact?.last_name}</TableCell>
                  <TableCell>{lead.contact?.title}</TableCell>
                  <TableCell>{lead.company?.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{isRevealed ? lead.contact?.email : maskEmail(lead.contact?.email)}</span>
                      <Button variant="ghost" size="icon" onClick={() => toggleReveal(leadId)} className="h-6 w-6">
                        {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{isRevealed ? (lead.contact?.mobile_phone || lead.contact?.direct_dial || "-") : maskString(lead.contact?.mobile_phone || lead.contact?.direct_dial)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.source === "data_lake" ? "default" : "secondary"} className={lead.source === "data_lake" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}>
                      {lead.source === "data_lake" ? "Data Lake" : "Waterfall"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ExportDialog 
        isOpen={isExportOpen} 
        onClose={() => setIsExportOpen(false)} 
        leads={selectedLeads} 
      />

      <GoogleSheetsExportDialog
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
        leads={selectedLeads.map((r) => ({
          name: `${r.contact?.first_name || ""} ${r.contact?.last_name || ""}`.trim() || "Lead Contact",
          typeOrTitle: r.contact?.title || "Executive",
          companyOrProperty: r.company?.name || r.contact?.company_domain || "",
          addressOrDomain: r.company?.domain || r.contact?.company_domain || "",
          cityOrState: (r.company?.address as any)?.city || "",
          countryOrZip: (r.company?.address as any)?.country || "US",
          phone: r.contact?.mobile_phone || r.contact?.direct_dial || "",
          email: r.contact?.email || "",
          source: r.contact?.source || "enrichment",
          notesOrValue: r.company?.industry || "",
        }))}
        defaultTitle="EnrichAgent B2B Leads"
      />
    </div>
  )
}
