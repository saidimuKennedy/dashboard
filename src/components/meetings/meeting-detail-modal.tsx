"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Copy,
  Gavel,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DetailModalShell,
  detailModalActionsClassName,
  detailModalHeaderClassName,
} from "@/components/ui/detail-modal-shell";
import { cn } from "@/lib/utils";
import {
  MEETING_OUTCOME_LABELS,
  MEETING_OUTCOME_OPTIONS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_OPTIONS,
  MEETING_TYPE_LABELS,
  MEETING_TYPE_OPTIONS,
  parseMeetingEvaluation,
  toDatetimeLocalValue,
  type MeetingDetail,
  type MeetingEvaluation,
} from "@/types/meeting";

type CustomerOption = { id: string; name: string };

interface MeetingDetailModalProps {
  meetingId: string | null;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-primary/15 text-primary border-primary/30",
  COMPLETED: "bg-success/15 text-success border-success/30",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-error/15 text-error border-error/30",
};

const outcomeStyles: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  SUCCESSFUL: "bg-success/15 text-success border-success/30",
  PARTIAL: "bg-warning/15 text-warning border-warning/30",
  UNSUCCESSFUL: "bg-error/15 text-error border-error/30",
};

export function MeetingDetailModal({ meetingId, onClose }: MeetingDetailModalProps) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState<"summary" | "actions" | "evaluate" | "decisions" | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    scheduledAt: "",
    durationMinutes: "",
    type: "VIRTUAL",
    customerId: "",
    status: "SCHEDULED",
    outcome: "PENDING",
    meetingUrl: "",
    location: "",
    agenda: "",
    minutes: "",
    outcomeReport: "",
  });
  const [evaluation, setEvaluation] = useState<MeetingEvaluation | null>(null);

  const fetchMeeting = useCallback(() => {
    if (!meetingId) return;
    setLoading(true);
    fetch(`/api/v1/meetings/${meetingId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          toast.error(json.message ?? "Failed to load meeting.");
          return;
        }
        const data = json.data as MeetingDetail;
        setMeeting({
          ...data,
          externalParticipants: Array.isArray(data.externalParticipants)
            ? data.externalParticipants
            : null,
        } as MeetingDetail);
        setDraft({
          title: data.title,
          scheduledAt: toDatetimeLocalValue(data.scheduledAt),
          durationMinutes: data.durationMinutes?.toString() ?? "",
          type: data.type,
          customerId: data.customerId ?? data.customer?.id ?? "",
          status: data.status,
          outcome: data.outcome,
          agenda: data.agenda ?? "",
          minutes: data.minutes ?? "",
          outcomeReport: data.outcomeReport ?? "",
          meetingUrl: data.meetingUrl ?? "",
          location: data.location ?? "",
        });
        setEvaluation(parseMeetingEvaluation(data.aiEvaluation));
      })
      .catch(() => toast.error("Failed to load meeting."))
      .finally(() => setLoading(false));
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) {
      setMeeting(null);
      setEvaluation(null);
      return;
    }
    fetchMeeting();
    fetch("/api/v1/customers")
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        const customerItems = json.data?.items ?? json.data ?? [];
        setCustomers(
          Array.isArray(customerItems)
            ? customerItems.map((c: { id: string; name: string }) => ({
                id: c.id,
                name: c.name,
              }))
            : []
        );
      })
      .catch(() => {});
  }, [meetingId, fetchMeeting]);

  if (!meetingId) return null;

  async function saveMeeting() {
    if (!meetingId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          scheduledAt: draft.scheduledAt || null,
          durationMinutes: draft.durationMinutes ? Number(draft.durationMinutes) : null,
          type: draft.type,
          customerId: draft.customerId || null,
          status: draft.status,
          outcome: draft.outcome,
          agenda: draft.agenda || null,
          minutes: draft.minutes || null,
          outcomeReport: draft.outcomeReport || null,
          meetingUrl: draft.meetingUrl || null,
          location: draft.location || null,
        }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to save meeting.");
        return;
      }
      toast.success("Meeting saved.");
      fetchMeeting();
      window.dispatchEvent(new CustomEvent("meeting:updated"));
    } catch {
      toast.error("Failed to save meeting.");
    } finally {
      setSaving(false);
    }
  }

  async function runAi(task: "summary" | "actions" | "evaluate" | "decisions") {
    if (!meetingId) return;
    setAiLoading(task);
    try {
      if (task === "decisions") {
        const response = await fetch("/api/v1/decisions/from-meeting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        });
        const json = await response.json();
        if (!json.success) {
          toast.error(json.message ?? "Failed to extract decisions.");
          return;
        }
        const count = json.data?.count ?? 0;
        if (count === 0) {
          toast.message("No decisions found in this meeting.");
          return;
        }
        window.dispatchEvent(new CustomEvent("decision:updated"));
        toast.success(count === 1 ? "1 decision logged." : `${count} decisions logged.`, {
          action: {
            label: "View",
            onClick: () => {
              const firstId = json.data?.items?.[0]?.id;
              router.push(firstId ? `/decisions?open=${firstId}` : "/decisions");
            },
          },
        });
        return;
      }

      const endpoint =
        task === "summary"
          ? "/api/v1/meetings/summary"
          : task === "actions"
            ? "/api/v1/meetings/action-items"
            : "/api/v1/meetings/evaluate";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      const json = await response.json();
      if (!json.success) {
        toast.error(json.message ?? `Failed to run ${task}.`);
        return;
      }

      if (task === "evaluate") {
        setEvaluation(json.data.evaluation);
        toast.success("Meeting evaluated.");
      } else {
        toast.success(task === "summary" ? "Summary generated." : "Action items extracted.");
      }
      fetchMeeting();
      window.dispatchEvent(new CustomEvent("meeting:updated"));
    } catch {
      toast.error("AI request failed.");
    } finally {
      setAiLoading(null);
    }
  }

  async function markCompleted() {
    setDraft((current) => ({ ...current, status: "COMPLETED" }));
    if (!meetingId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const json = await response.json();
      if (json.success) {
        toast.success("Meeting marked complete.");
        fetchMeeting();
        window.dispatchEvent(new CustomEvent("meeting:updated"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyJoinUrl() {
    if (!draft.meetingUrl) return;
    await navigator.clipboard.writeText(draft.meetingUrl);
    toast.success("Join URL copied.");
  }

  const scheduledLabel = draft.scheduledAt
    ? new Date(draft.scheduledAt).toLocaleString()
    : meeting?.scheduledAt
      ? new Date(meeting.scheduledAt).toLocaleString()
      : "Not scheduled";

  const selectedCustomer =
    customers.find((c) => c.id === draft.customerId) ?? meeting?.customer ?? null;

  return (
    <DetailModalShell onClose={onClose} closeLabel="Close meeting details" maxWidth="5xl">
        <div className={detailModalHeaderClassName()}>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h2 className="truncate text-lg font-semibold">{draft.title || meeting?.title || "Meeting"}</h2>
                  {draft.status || meeting?.status ? (
                    <Badge className={cn("capitalize", statusStyles[draft.status || meeting!.status])}>
                      {MEETING_STATUS_LABELS[(draft.status || meeting!.status) as keyof typeof MEETING_STATUS_LABELS]}
                    </Badge>
                  ) : null}
                  {draft.type || meeting?.type ? (
                    <Badge variant="secondary">
                      {MEETING_TYPE_LABELS[(draft.type || meeting!.type) as keyof typeof MEETING_TYPE_LABELS]}
                    </Badge>
                  ) : null}
                  {draft.outcome || meeting?.outcome ? (
                    <Badge className={cn(outcomeStyles[draft.outcome || meeting!.outcome])}>
                      {MEETING_OUTCOME_LABELS[(draft.outcome || meeting!.outcome) as keyof typeof MEETING_OUTCOME_LABELS]}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{scheduledLabel}</p>
                {selectedCustomer ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Customer: {selectedCustomer.name}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className={detailModalActionsClassName()}>
            {draft.meetingUrl ? (
              <>
                <Button variant="outline" size="sm" onClick={copyJoinUrl}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(draft.meetingUrl, "_blank")}
                >
                  <Video className="mr-1 h-3.5 w-3.5" />
                  Join
                </Button>
              </>
            ) : null}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Meeting details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Field label="Title">
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                      placeholder="Meeting title"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Scheduled">
                      <Input
                        type="datetime-local"
                        value={draft.scheduledAt}
                        onChange={(e) => setDraft((c) => ({ ...c, scheduledAt: e.target.value }))}
                      />
                    </Field>
                    <Field label="Duration (minutes)">
                      <Input
                        type="number"
                        min={1}
                        value={draft.durationMinutes}
                        onChange={(e) => setDraft((c) => ({ ...c, durationMinutes: e.target.value }))}
                        placeholder="60"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Type">
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                        value={draft.type}
                        onChange={(e) => setDraft((c) => ({ ...c, type: e.target.value }))}
                      >
                        {MEETING_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                        value={draft.status}
                        onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value }))}
                      >
                        {MEETING_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Customer">
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                      value={draft.customerId}
                      onChange={(e) => setDraft((c) => ({ ...c, customerId: e.target.value }))}
                    >
                      <option value="">No customer linked</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Join URL">
                    <Input
                      value={draft.meetingUrl}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, meetingUrl: e.target.value }))
                      }
                      placeholder="https://zoom.us/j/... or meet.google.com/..."
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={draft.location}
                      onChange={(e) => setDraft((c) => ({ ...c, location: e.target.value }))}
                      placeholder="Physical location"
                    />
                  </Field>
                  <Field label="Agenda">
                    <Textarea
                      value={draft.agenda}
                      onChange={(e) => setDraft((c) => ({ ...c, agenda: e.target.value }))}
                      rows={3}
                      placeholder="Topics to cover"
                    />
                  </Field>
                  <Field label="Outcome report">
                    <Textarea
                      value={draft.outcomeReport}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, outcomeReport: e.target.value }))
                      }
                      rows={5}
                      placeholder="What happened? Decisions, concerns, next steps..."
                    />
                  </Field>
                  <Field label="Outcome rating">
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-muted/50 px-3 py-1 text-sm"
                      value={draft.outcome}
                      onChange={(e) => setDraft((c) => ({ ...c, outcome: e.target.value }))}
                    >
                      {MEETING_OUTCOME_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minutes / notes">
                    <Textarea
                      value={draft.minutes}
                      onChange={(e) => setDraft((c) => ({ ...c, minutes: e.target.value }))}
                      rows={4}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={saveMeeting} disabled={saving}>
                      Save
                    </Button>
                    {draft.status === "SCHEDULED" ? (
                      <Button size="sm" variant="outline" onClick={markCompleted} disabled={saving}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Mark complete
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {meeting?.actionItems?.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Action items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {meeting.actionItems.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "border border-border px-3 py-2 text-sm",
                            item.completed && "opacity-60 line-through"
                          )}
                        >
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={aiLoading !== null}
                      onClick={() => runAi("summary")}
                    >
                      {aiLoading === "summary" ? "Summarizing..." : "Summarize"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={aiLoading !== null}
                      onClick={() => runAi("actions")}
                    >
                      {aiLoading === "actions" ? "Extracting..." : "Action items"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={aiLoading !== null}
                      onClick={() => runAi("evaluate")}
                    >
                      {aiLoading === "evaluate" ? "Evaluating..." : "Evaluate success"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={aiLoading !== null}
                      onClick={() => runAi("decisions")}
                    >
                      <Gavel className="mr-1 h-3.5 w-3.5" />
                      {aiLoading === "decisions" ? "Extracting..." : "Log decisions"}
                    </Button>
                  </div>

                  {meeting?.aiSummary ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Summary
                      </p>
                      <div className="border border-border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                        {meeting.aiSummary}
                      </div>
                    </div>
                  ) : null}

                  {evaluation ? (
                    <div className="space-y-3 border border-border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">{evaluation.summary}</p>
                      {evaluation.achievements.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Achievements</p>
                          <ul className="mt-1 list-disc pl-4">
                            {evaluation.achievements.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {evaluation.gaps.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Gaps</p>
                          <ul className="mt-1 list-disc pl-4">
                            {evaluation.gaps.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {evaluation.nextSteps.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Next steps</p>
                          <ul className="mt-1 list-disc pl-4">
                            {evaluation.nextSteps.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {evaluation.risks.length > 0 ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Risks</p>
                          <ul className="mt-1 list-disc pl-4">
                            {evaluation.risks.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {meeting?.externalParticipants && meeting.externalParticipants.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">External participants</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {meeting.externalParticipants.map((guest, index) => (
                      <p key={`${guest.email ?? guest.name}-${index}`}>
                        {guest.name}
                        {guest.email ? (
                          <span className="text-muted-foreground"> · {guest.email}</span>
                        ) : null}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
    </DetailModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
