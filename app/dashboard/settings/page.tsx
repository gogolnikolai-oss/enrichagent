import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { d1, UserRecord } from "@/lib/d1";
import { ApiKeyCard } from "@/components/api-key-card";
import { McpConfigSnippet } from "@/components/mcp-config-snippet";
import { ProvidersCard } from "@/components/providers-card";
import { ChangePasswordCard } from "@/components/change-password-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const user = await d1
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(session.userId)
    .first<UserRecord>();

  if (!user) {
    redirect("/login");
  }

  const providerRows = await d1
    .prepare("SELECT provider, api_key, mcp_endpoint FROM user_provider_keys WHERE user_id = ?")
    .bind(session.userId)
    .all<{ provider: string; api_key: string | null; mcp_endpoint: string | null }>();

  const googleKeyRow = providerRows.results?.find((r) => r.provider === "google_maps");
  const dataforseoRow = providerRows.results?.find((r) => r.provider === "dataforseo");
  const skipTraceRow = providerRows.results?.find((r) => r.provider === "skip_trace");
  const mcpRow = providerRows.results?.find((r) => r.provider === "custom_mcp");

  async function updateWebhook(formData: FormData) {
    "use server";
    const currentSession = await getCurrentSession();
    if (!currentSession) return;
    
    const webhookUrl = formData.get("webhookUrl") as string;
    await d1
      .prepare('UPDATE users SET webhook_url = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(webhookUrl || null, currentSession.userId)
      .run();
    
    revalidatePath("/dashboard/settings");
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 md:p-8 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, API keys, and integrations (Cloudflare D1 & KV).
        </p>
      </div>

      <div className="grid gap-6">
        <ApiKeyCard initialApiKey={user.api_key} userId={user.id} />
        <McpConfigSnippet apiKey={user.api_key} />

        <ProvidersCard
          initialGoogleKey={googleKeyRow?.api_key || ""}
          initialDataforseoKey={dataforseoRow?.api_key || ""}
          initialSkipTraceKey={skipTraceRow?.api_key || ""}
          initialMcpUrl={mcpRow?.mcp_endpoint || ""}
        />

        <ChangePasswordCard hasExistingPassword={user.password_hash !== null} />

        <Card>
          <CardHeader>
            <CardTitle>Webhook Integration</CardTitle>
            <CardDescription>
              Set up a webhook to receive updates when your leads are enriched.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateWebhook} className="flex gap-4 max-w-xl">
              <Input
                name="webhookUrl"
                placeholder="https://your-domain.com/webhook"
                defaultValue={user.webhook_url || ""}
                type="url"
              />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
