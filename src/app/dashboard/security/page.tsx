"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Setup = { otpauthUrl: string; secret: string };

// First-time TOTP setup. R1: show the secret / otpauth string as text (QR image
// is optional per the kickoff). Add the secret to an authenticator app, then
// confirm a code to activate.
export default function SecurityPage() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      setSetup(await postJson<Setup>("/api/auth/2fa/setup", {}));
      setEnabled(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postJson("/api/auth/2fa/enable", { code });
      setEnabled(true);
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
        <p className="text-sm text-muted-foreground">
          Administrator accounts require a TOTP authenticator app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set up authenticator</CardTitle>
          <CardDescription>
            Generate a secret, add it to your authenticator app, then confirm a code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={generate} disabled={busy}>
            {setup ? "Regenerate secret" : "Generate secret"}
          </Button>

          {setup && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Secret</Label>
                <code className="block break-all rounded-md bg-muted p-2 text-sm">
                  {setup.secret}
                </code>
              </div>
              <div className="space-y-1">
                <Label>otpauth URL</Label>
                <code className="block break-all rounded-md bg-muted p-2 text-xs">
                  {setup.otpauthUrl}
                </code>
              </div>

              <form onSubmit={enable} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Enabling…" : "Enable 2FA"}
                </Button>
              </form>
            </div>
          )}

          {enabled && (
            <p className="text-sm font-medium text-green-600">
              Two-factor authentication is now enabled.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
