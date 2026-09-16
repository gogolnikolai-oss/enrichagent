import { DashboardClient } from "@/components/dashboard-client";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Search Console</h1>
      <DashboardClient />
    </div>
  );
}
