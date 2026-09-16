"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Search, MapPin, Phone, Globe, Star, ExternalLink, Download, Store, Loader2 } from "lucide-react"
import * as xlsx from "xlsx"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LocalBusiness } from "@/lib/types"

export function LocalBusinessSearch() {
  const [category, setCategory] = useState("Dentists")
  const [city, setCity] = useState("Austin")
  const [pincode, setPincode] = useState("78701")
  const [country, setCountry] = useState("US")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LocalBusiness[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) {
      toast.error("Please enter a business category (e.g. Dentists, Real Estate)")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/local-businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          city,
          areaOrPincode: pincode,
          country,
        }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      setResults(data.results || [])
      toast.success(`Found ${data.count || 0} local businesses`)
    } catch (err: any) {
      toast.error(err.message || "Failed to search local businesses")
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (results.length === 0) return
    const exportData = results.map((b) => ({
      Name: b.name,
      Category: b.category,
      Address: b.address,
      City: b.city,
      Pincode: b.area_pincode,
      Country: b.country,
      Phone: b.phone || "N/A",
      Website: b.website || "N/A",
      Rating: b.rating || "N/A",
      Reviews: b.reviews_count || 0,
      Google_Maps_URL: b.google_maps_url || "",
      Source: b.source,
    }))
    const ws = xlsx.utils.json_to_sheet(exportData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Local_Businesses")
    xlsx.writeFile(wb, `local_businesses_${category.toLowerCase()}_${city.toLowerCase()}.xlsx`)
    toast.success("Downloaded Excel spreadsheet")
  }

  const exportToCSV = () => {
    if (results.length === 0) return
    const exportData = results.map((b) => ({
      Name: b.name,
      Category: b.category,
      Address: b.address,
      City: b.city,
      Pincode: b.area_pincode,
      Country: b.country,
      Phone: b.phone || "N/A",
      Website: b.website || "N/A",
      Rating: b.rating || "N/A",
      Reviews: b.reviews_count || 0,
      Google_Maps_URL: b.google_maps_url || "",
    }))
    const ws = xlsx.utils.json_to_sheet(exportData)
    const csvOutput = xlsx.utils.sheet_to_csv(ws)
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `local_businesses_${category.toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Downloaded CSV file")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Google Maps & Local SMB Lead Finder
          </CardTitle>
          <CardDescription>
            Find local businesses by category, city, area, or postal pincode worldwide. Cost: 1 credit per batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Business Category / Keyword</Label>
                <Input
                  id="category"
                  placeholder="Dentists, Realtors, HVAC..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City / Area</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Austin, Miami, London..."
                    className="pl-9"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode / Postal Code (Optional)</Label>
                <Input
                  id="pincode"
                  placeholder="78701, 10012, 560038..."
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="US">United States (US)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="UK">United Kingdom (UK)</option>
                  <option value="IN">India (IN)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="FR">France (FR)</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching Google Maps...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Search Local Businesses
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
              <CardTitle className="text-lg">Found {results.length} Local Businesses</CardTitle>
              <CardDescription>Direct phone numbers, addresses, ratings, and Google Maps listings</CardDescription>
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
                  <TableHead>Business Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Address & Pincode</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Maps Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((biz) => (
                  <TableRow key={biz.id}>
                    <TableCell className="font-semibold">{biz.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{biz.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={biz.address}>
                      {biz.address}
                    </TableCell>
                    <TableCell>
                      {biz.phone ? (
                        <span className="flex items-center gap-1 font-mono text-xs">
                          <Phone className="h-3 w-3 text-emerald-500" />
                          {biz.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {biz.website ? (
                        <a
                          href={biz.website.startsWith("http") ? biz.website : `https://${biz.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Visit
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {biz.rating ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {biz.rating} ({biz.reviews_count || 0})
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {biz.google_maps_url && (
                        <a
                          href={biz.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Maps
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
