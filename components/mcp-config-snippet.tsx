"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface McpConfigSnippetProps {
  apiKey: string;
}

export function McpConfigSnippet({ apiKey }: McpConfigSnippetProps) {
  const config = {
    mcpServers: {
      enrichagent: {
        command: "npx",
        args: ["-y", "tsx", "path/to/mcp/server.ts"],
        env: {
          ENRICH_AGENT_API_KEY: apiKey || "<your-api-key>",
          ENRICH_AGENT_API_URL: "http://localhost:3000"
        }
      }
    }
  };

  const configString = JSON.stringify(config, null, 2);

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(configString);
      toast.success("Configuration copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy configuration");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Claude Desktop / Cursor MCP Configuration</CardTitle>
            <CardDescription className="mt-1.5">
              Add this to your claude_desktop_config.json to use EnrichAgent with Claude
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyConfig} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border">
            <code>{configString}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
