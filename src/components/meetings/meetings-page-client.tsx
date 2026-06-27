"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, RefreshCw, Video } from "lucide-react";
import { toast } from "sonner";
import { MeetingDetailModal } from "@/components/meetings/meeting-detail-modal";
import { UpcomingMeetings } from "@/components/dashboard/upcoming-meetings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { meetingsCreateFields } from "@/config/module-create-fields";
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  type MeetingListItem,
} from "@/types/meeting";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-primary/15 text-primary border-primary/30",
  COMPLETED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-error/15 text-error border-error/30",
};

type CustomerOption = { id: string; name: string };

export function MeetingsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MeetingListItem[]>([]);
  const [upcoming, setUpcoming] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarConfigured, setCalendarConfigured] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const createFormRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/v1/meetings").then((res) => res.json()),
      fetch("/api/v1/meetings?view=upcoming").then((res) => res.json()),
      fetch("/api/v1/meetings/calendar/status").then((res) => res.json()),
      fetch("/api/v1/customers").then((res) => res.json()),
    ])
      .then(([listJson, upcomingJson, calendarJson, customersJson]) => {
        if (listJson.success) {
          const data = listJson.data?.items ?? listJson.data ?? [];
          setItems(Array.isArray(data) ? data : []);
        }
        if (upcomingJson.success) {
          setUpcoming(Array.isArray(upcomingJson.data) ? upcomingJson.data : []);
        }
        if (calendarJson.success) {
          setCalendarConnected(Boolean(calendarJson.data?.google?.connected));
          setCalendarConfigured(Boolean(calendarJson.data?.google?.configured));
        }
        if (customersJson.success) {
          const customerItems = customersJson.data?.items ?? customersJson.data ?? [];
          setCustomers(
            Array.isArray(customerItems)
              ? customerItems.map((c: { id: string; name: string }) => ({
                  id: c.id,
                  name: c.name,
                }))
              : []
          );
        }
      })
      .catch(() => toast.error("Failed to load meetings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(openId);

    const calendar = searchParams.get("calendar");
    if (calendar === "synced") {
      const imported = searchParams.get("imported");
      toast.success(`Calendar synced${imported ? ` (${imported} meetings)` : ""}.`);
      router.replace("/meetings");
    } else if (calendar === "error") {
      toast.error("Calendar connection failed.");
      router.replace("/meetings");
    }
  }, [searchParams, router]);

  useEffect(() => {
    function handleUpdated() {
      fetchItems();
    }
    window.addEventListener("meeting:updated", handleUpdated);
    return () => window.removeEventListener("meeting:updated", handleUpdated);
  }, [fetchItems]);

  function openCreateForm() {
    setFormValues({ type: "VIRTUAL", durationMinutes: "60" });
    setCreating(true);
    requestAnimationFrame(() => {
      createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeCreateForm() {
    setCreating(false);
    setFormValues({});
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formValues.title?.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    const payload: Record<string, string | number> = { title };
    for (const field of meetingsCreateFields) {
      if (field.name === "title") continue;
      const rawValue = formValues[field.name]?.trim() ?? "";
      if (!rawValue) continue;
      if (field.type === "number") {
        payload[field.name] = Number(rawValue);
      } else {
        payload[field.name] = rawValue;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to create meeting.");
        return;
      }
      toast.success("Meeting scheduled.");
      closeCreateForm();
      fetchItems();
      if (json.data?.id) setSelectedId(json.data.id);
    } catch {
      toast.error("Failed to create meeting.");
    } finally {
      setSubmitting(false);
    }
  }

  async function connectGoogleCalendar() {
    try {
      const response = await fetch("/api/v1/meetings/calendar/google");
      const json = await response.json();
      if (!json.success || !json.data?.url) {
        toast.error(json.message ?? "Google Calendar is not configured.");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      toast.error("Failed to start Google Calendar connection.");
    }
  }

  async function syncGoogleCalendar() {
    setSyncing(true);
    try {
      const response = await fetch("/api/v1/meetings/calendar/sync", { method: "POST" });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Calendar sync failed.");
        return;
      }
      toast.success(json.message ?? "Calendar synced.");
      fetchItems();
    } catch {
      toast.error("Calendar sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  function formatScheduled(value: string | null) {
    if (!value) return "—";
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const createForm = creating ? (
    <Card ref={createFormRef}>
      <CardHeader>
        <CardTitle>Schedule Meeting</CardTitle>
        <CardDescription>
          Store the join link and context here. Join the actual call in Zoom, Meet, or Teams.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          {meetingsCreateFields.map((field) => {
            if (field.name === "customerId") {
              return (
                <div key={field.name} className="space-y-2">
                  <label htmlFor="create-customerId" className="text-sm font-medium">
                    Customer
                  </label>
                  <select
                    id="create-customerId"
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={formValues.customerId ?? ""}
                    onChange={(e) =>
                      setFormValues((c) => ({ ...c, customerId: e.target.value }))
                    }
                    disabled={submitting}
                  >
                    <option value="">No customer linked</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            return (
              <div key={field.name} className="space-y-2">
                <label htmlFor={`create-${field.name}`} className="text-sm font-medium">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={`create-${field.name}`}
                    placeholder={field.placeholder}
                    value={formValues[field.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((c) => ({ ...c, [field.name]: e.target.value }))
                    }
                    disabled={submitting}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`create-${field.name}`}
                    className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                    value={formValues[field.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((c) => ({ ...c, [field.name]: e.target.value }))
                    }
                    disabled={submitting}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`create-${field.name}`}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "datetime-local"
                          ? "datetime-local"
                          : "text"
                    }
                    placeholder={field.placeholder}
                    value={formValues[field.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((c) => ({ ...c, [field.name]: e.target.value }))
                    }
                    disabled={submitting}
                  />
                )}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Schedule meeting"}
            </Button>
            <Button type="button" variant="outline" onClick={closeCreateForm} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  ) : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Meetings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Agendas, join links, outcome reports, and AI success reviews.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {calendarConfigured ? (
              calendarConnected ? (
                <Button variant="outline" onClick={syncGoogleCalendar} disabled={syncing}>
                  <RefreshCw className={cn("mr-1 h-4 w-4", syncing && "animate-spin")} />
                  Sync calendar
                </Button>
              ) : (
                <Button variant="outline" onClick={connectGoogleCalendar}>
                  <Calendar className="mr-1 h-4 w-4" />
                  Connect Google Calendar
                </Button>
              )
            ) : null}
            {!creating ? (
              <Button onClick={openCreateForm}>Schedule Meeting</Button>
            ) : null}
          </div>
        </div>

        <UpcomingMeetings
          meetings={upcoming}
          loading={loading}
          onOpenMeeting={setSelectedId}
        />

        {creating ? createForm : null}

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : items.length > 0 ? (
          <div className="border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-20">Join</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MEETING_TYPE_LABELS[item.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", statusStyles[item.status])}>
                        {MEETING_STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatScheduled(item.scheduledAt)}
                    </TableCell>
                    <TableCell>{item.customer?.name ?? "—"}</TableCell>
                    <TableCell>
                      {item.meetingUrl ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.meetingUrl!, "_blank");
                          }}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : !creating ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium">No meetings</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Schedule meetings, store join links, and let AI review outcomes.
            </p>
            <Button className="mt-4" onClick={openCreateForm}>
              Schedule Meeting
            </Button>
          </div>
        ) : null}
      </div>

      <MeetingDetailModal
        meetingId={selectedId}
        onClose={() => {
          setSelectedId(null);
          router.replace("/meetings");
        }}
      />
    </>
  );
}
