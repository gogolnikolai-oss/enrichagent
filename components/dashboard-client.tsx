"use client"

import { useState } from "react"
import { Building2, Store, Rocket, Home } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchConsole } from "@/components/search-console"
import { ResultsTable } from "@/components/results-table"
import { LocalBusinessSearch } from "@/components/local-business-search"
import { StartupsSearch } from "@/components/startups-search"
import { PropertySearch } from "@/components/property-search"
import { EnrichmentResult } from "@/lib/types"

export function DashboardClient() {
  const [b2bResults, setB2bResults] = useState<EnrichmentResult[]>([])

  return (
    <div className="space-y-6">
      <Tabs defaultValue="b2b" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl h-11">
          <TabsTrigger value="b2b" className="flex items-center gap-2 text-xs md:text-sm font-medium">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>B2B Leads</span>
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-2 text-xs md:text-sm font-medium">
            <Store className="h-4 w-4 shrink-0" />
            <span>Google Maps / Local</span>
          </TabsTrigger>
          <TabsTrigger value="startups" className="flex items-center gap-2 text-xs md:text-sm font-medium">
            <Rocket className="h-4 w-4 shrink-0" />
            <span>New Startups</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2 text-xs md:text-sm font-medium">
            <Home className="h-4 w-4 shrink-0" />
            <span>Property & Chalet Owners</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="b2b" className="space-y-8 pt-4">
          <SearchConsole onResults={setB2bResults} />
          <ResultsTable results={b2bResults} />
        </TabsContent>

        <TabsContent value="local" className="space-y-6 pt-4">
          <LocalBusinessSearch />
        </TabsContent>

        <TabsContent value="startups" className="space-y-6 pt-4">
          <StartupsSearch />
        </TabsContent>

        <TabsContent value="properties" className="space-y-6 pt-4">
          <PropertySearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}
