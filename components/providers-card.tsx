"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Key, MapPin, Database, Cpu, Check, Save, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ProvidersCardProps {
  initialGoogleKey?: string
  initialDataforseoKey?: string
  initialSkipTraceKey?: string
  initialMcpUrl?: string
}

export function ProvidersCard({
  initialGoogleKey = "",
  initialDataforseoKey = "",
  initialSkipTraceKey = "",
  initialMcpUrl = "",
}: ProvidersCardProps) {
  const [googleKey, setGoogleKey] = useState(initialGoogleKey)
  const [dataforseoKey, setDataforseoKey] = useState(initialDataforseoKey)
  const [skipTraceKey, setSkipTraceKey] = useState(initialSkipTraceKey)
  const [mcpUrl, setMcpUrl] = useState(initialMcpUrl)
  const [saving, setSaving] = useState(false)

  const handleSave = async (provider: string, apiKey?: string, mcpEndpoint?: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/user/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          mcpEndpoint,
          enabled: true,
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      toast.success(`${provider.replace("_", " ").toUpperCase()} connection updated`)
    } catch (err: any) {
      toast.error(err.message || "Failed to save provider")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Connected Data Providers & MCP Connectors
        </CardTitle>
        <CardDescription>
          Connect free or cheap pay-as-you-go data providers and custom Model Context Protocol (MCP) tools.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Places API */}
        <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-sm">Google Places & Maps Platform</span>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
              $200/mo Free Tier Included
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Google provides $200 recurring free credit every month (~40,000 free searches). Add your API key to search any business, phone, or rating.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="AIzaSy..."
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              className="text-sm font-mono"
            />
            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave("google_maps", googleKey)}
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>

        {/* DataForSEO Pay-As-You-Go */}
        <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">DataForSEO (Google Maps & SERP)</span>
            </div>
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
              Pay-As-You-Go ($0.001/query)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            On-demand Google Maps local scraping with no monthly commitment. Format: <code>login:password</code> or base64 token.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="login:password"
              value={dataforseoKey}
              onChange={(e) => setDataforseoKey(e.target.value)}
              className="text-sm font-mono"
            />
            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave("dataforseo", dataforseoKey)}
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>

        {/* Skip Tracing Provider */}
        <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-sm">Real Estate Skip Tracing API (Tracerfy / DataZapp / Searchbug)</span>
            </div>
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
              ~$0.02 / Match
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Connect your pay-as-you-go Skip Tracing API key to resolve verified mobile phones, landlines, and direct emails for property & chalet owners without monthly subscriptions.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter Tracerfy or DataZapp API Key..."
              value={skipTraceKey}
              onChange={(e) => setSkipTraceKey(e.target.value)}
              className="text-sm font-mono"
            />
            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave("skip_trace", skipTraceKey)}
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>

        {/* Custom MCP Connector */}
        <div className="p-4 border rounded-lg space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-500" />
              <span className="font-semibold text-sm">Custom MCP Server Tool Connector</span>
            </div>
            <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
              Open Protocol
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Connect an external Model Context Protocol (MCP) server endpoint for custom lead scrapers or CRM enrichment streams.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://mcp.yourdomain.com/sse or ws://..."
              value={mcpUrl}
              onChange={(e) => setMcpUrl(e.target.value)}
              className="text-sm font-mono"
            />
            <Button
              size="sm"
              disabled={saving}
              onClick={() => handleSave("custom_mcp", undefined, mcpUrl)}
            >
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
