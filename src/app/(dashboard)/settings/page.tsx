"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AiProviderStatus {
  configured: boolean;
  maskedKey: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/auth/me").then((res) => res.json()),
      fetch("/api/v1/settings/ai-provider").then((res) => res.json()),
    ])
      .then(([profileJson, providerJson]) => {
        if (profileJson.success) setProfile(profileJson.data);
        if (providerJson.success) setProviderStatus(providerJson.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleConnectProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      toast.error("Enter a DeepSeek API key", {
        description: "Paste your key from the DeepSeek dashboard to connect.",
      });
      return;
    }

    setConnecting(true);

    try {
      const response = await fetch("/api/v1/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmedKey }),
      });

      const json = await response.json();

      if (json.success) {
        setProviderStatus(json.data);
        setApiKey("");
        toast.success("Provider connected", {
          description: json.message ?? "DeepSeek API key saved and verified.",
        });
        return;
      }

      toast.error("Connection rejected", {
        description: json.message ?? "Your API key could not be verified.",
      });
    } catch {
      toast.error("Connection failed", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and platform preferences.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First name</label>
                    <Input defaultValue={profile?.firstName ?? ""} readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last name</label>
                    <Input defaultValue={profile?.lastName ?? ""} readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue={profile?.email ?? ""} readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input defaultValue={profile?.role ?? ""} readOnly />
                </div>
                <Button disabled>Save changes</Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Configuration</CardTitle>
            <CardDescription>Connect AI providers for briefings and chat</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleConnectProvider}>
              <div className="space-y-2">
                <label htmlFor="deepseek-api-key" className="text-sm font-medium">
                  DeepSeek API Key
                </label>
                <Input
                  id="deepseek-api-key"
                  type="password"
                  placeholder={providerStatus?.configured ? providerStatus.maskedKey ?? "sk-…" : "sk-…"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  autoComplete="off"
                  disabled={connecting}
                />
                {providerStatus?.configured && !apiKey ? (
                  <p className="text-xs text-muted-foreground">
                    A key is already connected. Enter a new key to replace it.
                  </p>
                ) : null}
              </div>
              <Button type="submit" disabled={connecting}>
                {connecting ? "Verifying…" : providerStatus?.configured ? "Update Provider" : "Connect Provider"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
