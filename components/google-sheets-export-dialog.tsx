"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileSpreadsheet, Loader2, ExternalLink, PlusCircle, Link as LinkIcon, CheckCircle2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export interface LeadExportItem {
  name: string
  typeOrTitle: string
  companyOrProperty: string
  addressOrDomain: string
  cityOrState: string
  countryOrZip: string
  phone: string
  email: string
  source: string
  notesOrValue?: string
}

interface GoogleSheetsExportDialogProps {
  isOpen: boolean
  onClose: () => void
  leads: LeadExportItem[]
  defaultTitle?: string
}

export function GoogleSheetsExportDialog({
  isOpen,
  onClose,
  leads,
  defaultTitle = "EnrichAgent Leads",
}: GoogleSheetsExportDialogProps) {
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(defaultTitle)
  const [existingIdOrUrl, setExistingIdOrUrl] = useState("")
  const [sheetName, setSheetName] = useState("Leads")
  const [loading, setLoading] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [rowsCount, setRowsCount] = useState<number>(0)

  const handleSync = async () => {
    if (leads.length === 0) {
      toast.error("No leads available to export")
      return
    }

    if (mode === "new" && !spreadsheetTitle.trim()) {
      toast.error("Please enter a title for the new spreadsheet")
      return
    }

    if (mode === "existing" && !existingIdOrUrl.trim()) {
      toast.error("Please enter a Google Sheet URL or ID")
      return
    }

    setLoading(true)
    setSuccessUrl(null)

    try {
      const payload = {
        leads,
        title: mode === "new" ? spreadsheetTitle.trim() : undefined,
        spreadsheetId: mode === "existing" ? existingIdOrUrl.trim() : undefined,
        sheetName: sheetName.trim() || "Leads",
      }

      const res = await fetch("/api/export/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.connectUrl) {
          toast.info("Connecting Google Account for Sheets access...")
          window.location.href = data.connectUrl
          return
        }
        throw new Error(data.error || "Failed to sync leads to Google Sheets")
      }

      setSuccessUrl(data.spreadsheetUrl)
      setRowsCount(data.rowsAppended || leads.length)
      toast.success(`Successfully appended ${data.rowsAppended} leads to Google Sheets!`)
    } catch (err: any) {
      toast.error(err.message || "An error occurred while syncing with Google Sheets")
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setSuccessUrl(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Sync Leads to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Export <strong>{leads.length}</strong> discovered lead{leads.length !== 1 ? "s" : ""} directly to your Google Drive.
          </DialogDescription>
        </DialogHeader>

        {successUrl ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-base">Leads Successfully Synced!</h4>
              <p className="text-xs text-muted-foreground">
                Appended {rowsCount} lead rows with verified emails, phones, and cadastre data.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                asChild
              >
                <a href={successUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Google Sheet
                </a>
              </Button>
              <Button variant="outline" onClick={handleModalClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`text-left flex items-start space-x-2.5 p-3 rounded-lg border transition-colors ${
                  mode === "new" ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-500" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${mode === "new" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground"}`}>
                  {mode === "new" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                    New Spreadsheet
                  </div>
                  <p className="text-[11px] text-muted-foreground">Create a new file in Drive</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`text-left flex items-start space-x-2.5 p-3 rounded-lg border transition-colors ${
                  mode === "existing" ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-500" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center ${mode === "existing" ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground"}`}>
                  {mode === "existing" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-emerald-600" />
                    Existing Sheet
                  </div>
                  <p className="text-[11px] text-muted-foreground">Append to an existing file</p>
                </div>
              </button>
            </div>

            {mode === "new" ? (
              <div className="space-y-2">
                <Label htmlFor="sheetTitle" className="text-xs font-medium">
                  Spreadsheet File Name
                </Label>
                <Input
                  id="sheetTitle"
                  value={spreadsheetTitle}
                  onChange={(e) => setSpreadsheetTitle(e.target.value)}
                  placeholder="e.g. Aspen Vacation Chalet Leads - 2026"
                  className="h-9 text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="sheetUrl" className="text-xs font-medium">
                  Google Sheet URL or Spreadsheet ID
                </Label>
                <Input
                  id="sheetUrl"
                  value={existingIdOrUrl}
                  onChange={(e) => setExistingIdOrUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                  className="h-9 text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tabName" className="text-xs font-medium">
                Sheet / Tab Name
              </Label>
              <Input
                id="tabName"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. Leads or Properties"
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                The specific tab within the spreadsheet where rows will be appended.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <Button variant="outline" size="sm" onClick={handleModalClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSync}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                {loading ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
