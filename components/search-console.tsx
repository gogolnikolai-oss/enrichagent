"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Search, Globe, Briefcase, MapPin, Mail, Phone, Building2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EnrichmentResult, CREDIT_COSTS } from "@/lib/types"

interface SearchConsoleProps {
  onResults: (results: EnrichmentResult[]) => void
}

export function SearchConsole({ onResults }: SearchConsoleProps) {
  const [domain, setDomain] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [location, setLocation] = useState("")
  const [isB2b, setIsB2b] = useState(true)
  const [loading, setLoading] = useState(false)
  
  const [options, setOptions] = useState({
    verifiedEmail: true,
    directPhone: false,
    companyData: true,
  })

  const calculateCredits = () => {
    let credits = 0
    if (options.verifiedEmail) credits += CREDIT_COSTS.email
    if (options.directPhone) credits += CREDIT_COSTS.mobile
    if (options.companyData) credits += CREDIT_COSTS.companyData
    return credits
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain && !jobTitle) {
      toast.error("Please enter a domain or job title")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          jobTitle,
          location,
          isB2b,
          options
        })
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      onResults(data.results)
      toast.success(`Found ${data.results.length} leads`)
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch results")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Parameters</CardTitle>
        <CardDescription>Enter criteria to find new leads</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Company Domain</Label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="domain"
                  placeholder="acme.com"
                  className="pl-9"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Target Job Title</Label>
              <div className="relative">
                <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="jobTitle"
                  placeholder="CEO, VP Sales, Owner"
                  className="pl-9"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  className="pl-9"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="mode"
              checked={isB2b}
              onCheckedChange={setIsB2b}
            />
            <Label htmlFor="mode">{isB2b ? "B2B Corporate" : "SMB Local"}</Label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Data Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={options.verifiedEmail}
                  onCheckedChange={(c) => setOptions(prev => ({ ...prev, verifiedEmail: !!c }))}
                />
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Verified Work Email (1 Credit)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="phone"
                  checked={options.directPhone}
                  onCheckedChange={(c) => setOptions(prev => ({ ...prev, directPhone: !!c }))}
                />
                <Label htmlFor="phone" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Direct Mobile Phone (3 Credits)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="company"
                  checked={options.companyData}
                  onCheckedChange={(c) => setOptions(prev => ({ ...prev, companyData: !!c }))}
                />
                <Label htmlFor="company" className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company Size & Valuation (1 Credit)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="address" checked disabled />
                <Label htmlFor="address" className="text-muted-foreground">Office Address (Included)</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              This search will cost: {calculateCredits()} credits per lead
            </p>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Leads
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
