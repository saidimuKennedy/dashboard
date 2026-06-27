"use client";

import { useEffect, useState } from "react";
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

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProfile(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">DeepSeek API Key</label>
              <Input type="password" placeholder="sk-…" />
            </div>
            <Button>Connect Provider</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
