import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Database, 
  Layers, 
  Bot, 
  Coins, 
  Download, 
  Shield, 
  Check, 
  ArrowRight
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">EnrichAgent</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary">Features</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary">Pricing</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 lg:py-40 flex items-center justify-center text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background -z-10" />
          <div className="max-w-4xl space-y-8">
            <Badge variant="secondary" className="px-4 py-1 text-sm rounded-full">
              ✨ Introducing AI-Powered Enrichment
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Lead Enrichment</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your B2B and SMB lead data with our intelligent waterfall enrichment engine. Find valid emails, verified phone numbers, and deep company insights in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Everything you need for lead intelligence</h2>
              <p className="text-muted-foreground mt-4">Powerful tools to scale your outbound campaigns</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Data Lake Intelligence", icon: Database, desc: "Access millions of B2B contacts and company records." },
                { title: "Waterfall Enrichment", icon: Layers, desc: "Multi-provider waterfall to maximize match rates." },
                { title: "MCP Integration", icon: Bot, desc: "Agentic AI workflows powered by Model Context Protocol." },
                { title: "Credit System", icon: Coins, desc: "Pay only for valid, verified data. No hidden fees." },
                { title: "Export Anywhere", icon: Download, desc: "1-click export to CSV, HubSpot, or Salesforce." },
                { title: "Enterprise Security", icon: Shield, desc: "SOC2 compliant with enterprise-grade data privacy." }
              ].map((feature, i) => (
                <Card key={i} className="border-none shadow-md bg-background">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
              <p className="text-muted-foreground mt-4">Choose the right plan for your growth</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 max-w-7xl mx-auto">
              {[
                { name: "Micro Starter", price: "$10", credits: "250 Credits", badge: "Taste Test" },
                { name: "Growth Pack", price: "$29", credits: "1,000 Credits", popular: true },
                { name: "Scale Pack", price: "$79", credits: "3,000 Credits" },
                { name: "BYOK Software", price: "$19", credits: "Software-Only /mo", byok: true },
              ].map((plan, i) => (
                <Card key={i} className={plan.popular ? "border-primary shadow-lg relative flex flex-col justify-between" : "flex flex-col justify-between"}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm">Most Popular</Badge>
                  )}
                  {plan.badge && (
                    <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white border-emerald-600 shadow-sm text-[11px]">
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.byok && <span className="text-xs text-muted-foreground ml-1">/mo</span>}
                    </div>
                    <CardDescription>{plan.credits}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5 text-primary" /> {plan.byok ? "Bring own API keys" : "Credits never expire"}</li>
                      <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5 text-primary" /> Excel & CSV exports</li>
                      <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5 text-primary" /> Claude & Cursor MCP</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link href="/dashboard/billing" className="w-full">
                      <Button className="w-full" size="sm" variant={plan.popular ? "default" : "outline"}>
                        {plan.byok ? "Subscribe" : "Get Pack"}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}

              <Card className="bg-primary text-primary-foreground flex flex-col justify-between shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Pro All-Inclusive</CardTitle>
                    <Badge variant="secondary" className="text-[10px] uppercase">Turnkey</Badge>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$39</span>
                    <span className="text-primary-foreground/80 text-sm">/mo</span>
                  </div>
                  <CardDescription className="text-primary-foreground/80 text-xs">1,200 credits / mo included</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5" /> All API keys provided</li>
                    <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5" /> Direct dials & mobile phones</li>
                    <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5" /> Startups & Real Estate data</li>
                    <li className="flex items-center gap-2 text-xs"><Check className="h-3.5 w-3.5" /> Priority waterfall speed</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/dashboard/billing" className="w-full">
                    <Button className="w-full bg-background text-foreground hover:bg-background/90" size="sm">
                      Go Pro
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">EnrichAgent</span>
          </div>
          <p>© {new Date().getFullYear()} EnrichAgent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
