"use client"

import { useState } from "react"
import { toast } from "sonner"
import { KeyRound, Loader2, CheckCircle2, Lock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface ChangePasswordCardProps {
  hasExistingPassword: boolean
}

export function ChangePasswordCard({ hasExistingPassword }: ChangePasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasExistingPassword ? currentPassword : undefined,
          newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password")
      }

      toast.success("Password changed successfully!")
      setUpdated(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      toast.error(err.message || "Could not update password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Security & Password
        </CardTitle>
        <CardDescription>
          {hasExistingPassword
            ? "Update your password to keep your administrator account secure."
            : "You currently sign in with Google. Set a direct password here if you want to sign in with email/password as well."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {updated && (
          <div className="mb-4 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Your password was successfully updated and is active immediately!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {hasExistingPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="current-pwd" className="text-xs font-medium">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-pwd"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="h-9 text-sm pr-9"
                />
                <Lock className="h-4 w-4 text-muted-foreground absolute right-2.5 top-2.5" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-pwd" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="h-9 text-sm pr-9"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute right-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd" className="text-xs font-medium">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-pwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                className="h-9 text-sm pr-9"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute right-2.5 top-2.5" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
