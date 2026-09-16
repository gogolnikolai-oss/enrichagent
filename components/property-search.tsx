"use client"

import { useState } from "react"
import { toast } from "sonner"
import { 
  Home, 
  MapPin, 
  Phone, 
  Mail, 
  Download, 
  Loader2, 
  User, 
  Building, 
  CheckCircle2, 
  DollarSign, 
  Filter,
  FileSpreadsheet,
  ExternalLink
} from "lucide-react"
import * as xlsx from "xlsx"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PropertyLead, PropertyType } from "@/lib/types"
import { GoogleSheetsExportDialog } from "@/components/google-sheets-export-dialog"

export function PropertySearch() {
  const [propertyType, setPropertyType] = useState<PropertyType>("chalet")
  const [ownerCategory, setOwnerCategory] = useState<"all" | "individual" | "commercial">("all")
  const [city, setCity] = useState("Aspen")
  const [zipcode, setZipcode] = useState("81611")
  const [country, setCountry] = useState("United States")
  const [requireMobile, setRequireMobile] = useState(false)
  const [requireEmail, setRequireEmail] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PropertyLead[]>([])
  const [isSheetsDialogOpen, setIsSheetsDialogOpen] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyType,
          ownerCategory,
          city,
          areaOrZipcode: zipcode,
          country,
          requireMobile,
          requireEmail,
          limit: 20,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Search failed" }))
        throw new Error(errData.error || "Failed to search properties")
      }

      const data = await res.json()
      setResults(data.results || [])
      toast.success(`Discovered ${data.count || 0} property owner records`)
    } catch (err: any) {
      toast.error(err.message || "Failed to search property owners")
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    if (results.length === 0) return
    const exportData = results.map((p) => ({
      "Property Name": p.property_name,
      "Property Type": p.property_type.toUpperCase(),
      "Owner Name": p.owner_name,
      "Owner Type": p.owner_type,
      "Mobile Phone": p.mobile_phone || "N/A",
      "Direct Dial Phone": p.direct_dial_phone || "N/A",
      "Owner Email": p.email || "N/A",
      "Property Address": p.address,
      "Unit": p.unit || "",
      "City": p.city,
      "Zipcode": p.area_zipcode,
      "State": p.state || "",
      "Country": p.country,
      "Mailing Address": p.mailing_address || p.address,
      "Estimated Value USD": p.estimated_value_usd ? `$${p.estimated_value_usd.toLocaleString()}` : "N/A",
      "Data Source": p.source,
    }))

    const ws = xlsx.utils.json_to_sheet(exportData)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, "Property Owners")
    xlsx.writeFile(wb, `property_owners_${city || zipcode}_${Date.now()}.xlsx`)
    toast.success("Excel report exported successfully")
  }

  const exportToCsv = () => {
    if (results.length === 0) return
    const exportData = results.map((p) => ({
      "Property Name": p.property_name,
      "Property Type": p.property_type.toUpperCase(),
      "Owner Name": p.owner_name,
      "Owner Type": p.owner_type,
      "Mobile Phone": p.mobile_phone || "N/A",
      "Direct Dial Phone": p.direct_dial_phone || "N/A",
      "Owner Email": p.email || "N/A",
      "Property Address": p.address,
      "City": p.city,
      "Zipcode": p.area_zipcode,
      "Country": p.country,
      "Estimated Value": p.estimated_value_usd || 0,
      "Source": p.source,
    }))

    const ws = xlsx.utils.json_to_sheet(exportData)
    const csv = xlsx.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `property_owners_${city || zipcode}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV file downloaded")
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Property, Chalet, Cottage & Condo Owners
              </CardTitle>
              <CardDescription className="mt-1">
                Discover real estate, luxury chalet, cottage, and condominium owners by city or zipcode with verified owner names, mobile numbers, direct dial, and email addresses.
              </CardDescription>
            </div>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToCsv} className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5 text-xs font-semibold">
                  <Download className="h-3.5 w-3.5" /> Excel (XLSX)
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="propType" className="text-xs font-medium">Property Category</Label>
                <Select value={propertyType} onValueChange={(val) => setPropertyType(val as PropertyType)}>
                  <SelectTrigger id="propType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="chalet">🏔️ Chalets & Lodges</SelectItem>
                    <SelectItem value="cottage">🏡 Cottages & Cabins</SelectItem>
                    <SelectItem value="condo">🏢 Condos & Units</SelectItem>
                    <SelectItem value="residential">🏠 Residential Estates</SelectItem>
                    <SelectItem value="vacation_rental">🏖️ Vacation Rentals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ownerCategory" className="text-xs font-medium">Owner Category</Label>
                <Select value={ownerCategory} onValueChange={(val: any) => setOwnerCategory(val)}>
                  <SelectTrigger id="ownerCategory">
                    <SelectValue placeholder="Owner Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Both (Commercial + Deed)</SelectItem>
                    <SelectItem value="individual">👤 Individual Deed Owners</SelectItem>
                    <SelectItem value="commercial">🏢 Commercial Operators</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-medium">City / Region</Label>
                <Input
                  id="city"
                  placeholder="e.g. Mont-Tremblant, Aspen"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="zipcode" className="text-xs font-medium">Area / Zipcode</Label>
                <Input
                  id="zipcode"
                  placeholder="e.g. J8E 1T8, 81611"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-medium">Country</Label>
                <Select
                  value={country}
                  onValueChange={(val) => {
                    setCountry(val)
                    if (val === "United States") { setCity("Aspen"); setZipcode("81611"); }
                    else if (val === "United Kingdom") { setCity("London"); setZipcode("SW1A 1AA"); }
                    else if (val === "Canada") { setCity("Mont-Tremblant"); setZipcode("J8E 1T8"); }
                    else if (val === "Australia") { setCity("Thredbo"); setZipcode("2625"); }
                    else if (val === "Netherlands") { setCity("Apeldoorn"); setZipcode("7311 KZ"); }
                    else if (val === "India") { setCity("Goa"); setZipcode("403516"); }
                  }}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                    <SelectItem value="United States">🇺🇸 United States</SelectItem>
                    <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                    <SelectItem value="Netherlands">🇳🇱 Netherlands (PDOK)</SelectItem>
                    <SelectItem value="India">🇮🇳 India (Bhulekh)</SelectItem>
                    <SelectItem value="Other">🌍 Other / Worldwide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireMobile"
                    checked={requireMobile}
                    onCheckedChange={(c) => setRequireMobile(Boolean(c))}
                  />
                  <Label htmlFor="requireMobile" className="text-xs text-muted-foreground cursor-pointer">
                    Require Mobile Phone
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="requireEmail"
                    checked={requireEmail}
                    onCheckedChange={(c) => setRequireEmail(Boolean(c))}
                  />
                  <Label htmlFor="requireEmail" className="text-xs text-muted-foreground cursor-pointer">
                    Require Owner Email
                  </Label>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="gap-2 min-w-[150px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                {loading ? "Searching..." : "Search Owners"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Showing <strong className="text-foreground">{results.length}</strong> property owner records
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Cadastre / Public Tier
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Skip-Traced Contact
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportToCsv} className="h-8 text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="h-8 text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsSheetsDialogOpen(true)}
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Sync to Google Sheets
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[240px]">Property & Type</TableHead>
                  <TableHead className="w-[200px]">Owner Name</TableHead>
                  <TableHead className="w-[180px]">Mobile & Direct Dial</TableHead>
                  <TableHead className="w-[190px]">Owner Email</TableHead>
                  <TableHead className="w-[220px]">Property Address</TableHead>
                  <TableHead className="w-[120px]">Est. Value</TableHead>
                  <TableHead className="w-[100px] text-right">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold text-sm leading-snug">{p.property_name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5">
                          {p.property_type}
                        </Badge>
                        {p.unit && (
                          <span className="text-xs text-muted-foreground font-mono">{p.unit}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium text-sm">
                        {p.owner_type === "corporate" ? (
                          <Building className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        <span className="truncate">{p.owner_name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {p.owner_type === "corporate" ? "Commercial / Entity" : "Individual Deed Owner"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {p.mobile_phone ? (
                          <a
                            href={`tel:${p.mobile_phone}`}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
                          >
                            <Phone className="h-3 w-3 text-emerald-500" />
                            <span>{p.mobile_phone}</span>
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 ml-0.5">Cell</Badge>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {p.direct_dial_phone && p.direct_dial_phone !== p.mobile_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Phone className="h-3 w-3" />
                            <span>{p.direct_dial_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {p.email ? (
                        <a
                          href={`mailto:${p.email}`}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate max-w-[180px]"
                          title={p.email}
                        >
                          <Mail className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-start gap-1.5 text-xs leading-tight">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{p.address}</span>
                      </div>
                      {p.mailing_address && p.mailing_address !== p.address && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 pl-5">
                          Absentee Mail: {p.mailing_address}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold">
                        {p.estimated_value_usd ? (
                          `$${p.estimated_value_usd.toLocaleString()}`
                        ) : (
                          <span className="text-muted-foreground font-normal">N/A</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize font-medium ${
                          p.source === "dataforseo"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : p.source === "cadastre_deed"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : p.source === "pdok_cadastre"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : p.source === "data_lake"
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : ""
                        }`}
                      >
                        {p.source === "dataforseo"
                          ? "DataForSEO Live"
                          : p.source === "cadastre_deed"
                          ? "Cadastre / Deed"
                          : p.source === "pdok_cadastre"
                          ? "PDOK Cadastre"
                          : p.source === "data_lake"
                          ? "Data Lake"
                          : p.source.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Google Sheets Export Modal */}
      <GoogleSheetsExportDialog
        isOpen={isSheetsDialogOpen}
        onClose={() => setIsSheetsDialogOpen(false)}
        leads={results.map((p) => ({
          name: p.owner_name,
          typeOrTitle: p.owner_type === "corporate" ? "Entity / Trust" : "Individual Owner",
          companyOrProperty: p.property_name,
          addressOrDomain: p.address,
          cityOrState: `${p.city}, ${p.state || ""}`,
          countryOrZip: `${p.country} (${p.area_zipcode})`,
          phone: p.mobile_phone || p.direct_dial_phone || "",
          email: p.email || "",
          source: p.source,
          notesOrValue: p.estimated_value_usd ? `$${p.estimated_value_usd.toLocaleString()}` : "",
        }))}
        defaultTitle={`Property Owners - ${city || zipcode}`}
      />
    </div>
  )
}
