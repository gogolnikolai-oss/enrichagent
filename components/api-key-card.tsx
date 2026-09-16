"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, RefreshCw, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface ApiKeyCardProps {
  initialApiKey: string;
  userId: string;
}

export function ApiKeyCard({ initialApiKey, userId }: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState(initialApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const maskedKey = apiKey ? `${apiKey.substring(0, 8)}${"•".repeat(24)}` : "No API key found";
  const displayKey = showKey ? apiKey : maskedKey;

  const copyToClipboard = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("API key copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy API key");
    }
  };

  const regenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/user/regenerate-key", {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to regenerate key");
      
      const data = await response.json();
      setApiKey(data.apiKey);
      setDialogOpen(false);
      toast.success("API key regenerated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Error regenerating API key");
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          <CardTitle>API Key</CardTitle>
        </div>
        <CardDescription>
          Use this key to authenticate with the EnrichAgent API or MCP server.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Input
              value={displayKey}
              readOnly
              className="font-mono pr-10"
              type={showKey ? "text" : "password"}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showKey ? "Hide key" : "Show key"}</span>
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy key">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Regenerate Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate API Key?</DialogTitle>
              <DialogDescription className="text-destructive font-medium mt-2">
                Warning: This will invalidate your current API key. Any integrations using the old key will stop working immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isRegenerating}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={regenerateKey} disabled={isRegenerating}>
                {isRegenerating ? "Regenerating..." : "Yes, Regenerate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
