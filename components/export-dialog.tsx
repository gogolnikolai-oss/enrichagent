"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { EnrichmentResult } from "@/lib/types"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  leads: EnrichmentResult[]
}

export function ExportDialog({ isOpen, onClose, leads }: ExportDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL")
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch("/api/export/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, leads })
      })
      
      if (!res.ok) {
        throw new Error("Failed to send webhook")
      }
      
      toast.success(`Successfully sent ${leads.length} leads to webhook`)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to Webhook</DialogTitle>
          <DialogDescription>
            Send selected leads to your CRM or automation tool
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input 
              id="webhookUrl" 
              placeholder="https://hooks.zapier.com/..." 
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            You are about to send <strong>{leads.length}</strong> leads.
          </p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Send Leads
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
