"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Gavel } from "lucide-react";
import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/types/decision";
import { cn } from "@/lib/utils";

type DecisionDueItem = {
  id: string;
  title: string;
  reviewDate: string | null;
  status: DecisionStatus;
  owner?: { id: string; firstName: string; lastName: string } | null;
};

type DecisionReminder = {
  id: string;
  title: string;
  dueAt: string;
  decisionId?: string | null;
  decision?: {
    id: string;
    title: string;
    reviewDate?: string | null;
    status?: DecisionStatus;
  } | null;
};

function formatReviewWhen(date?: string | null) {
  if (!date) return "No date set";
  const d = new Date(date);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function formatReminderWhen(date: string) {
  const d = new Date(date);
  const diff = d.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `in ${hours}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface DecisionsDueForReviewProps {
  due?: DecisionDueItem[];
  reminders?: DecisionReminder[];
  loading?: boolean;
  onOpenDecision?: (id: string) => void;
}

export function DecisionsDueForReview({
  due,
  reminders,
  loading,
  onOpenDecision,
}: DecisionsDueForReviewProps) {
  const hasContent = (due && due.length > 0) || (reminders && reminders.length > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" />
          Decision Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : hasContent ? (
          <>
            {reminders && reminders.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reminders
                </p>
                <ul className="space-y-2">
                  {reminders.map((reminder) => (
                    <li
                      key={reminder.id}
                      className="flex items-center justify-between gap-3 border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatReminderWhen(reminder.dueAt)}
                        </p>
                      </div>
                      {reminder.decisionId && onOpenDecision ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenDecision(reminder.decisionId!)}
                        >
                          Open
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {due && due.length > 0 ? (
              <ul className="space-y-2">
                {due.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-start justify-between gap-3 border border-destructive/20 bg-destructive/5 px-3 py-2",
                      onOpenDecision && "cursor-pointer hover:border-destructive/40"
                    )}
                    onClick={() => onOpenDecision?.(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenDecision?.(item.id);
                      }
                    }}
                    role={onOpenDecision ? "button" : undefined}
                    tabIndex={onOpenDecision ? 0 : undefined}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="error" className="gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" />
                          {formatReviewWhen(item.reviewDate)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {DECISION_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No decisions due for review.</p>
        )}
      </CardContent>
    </Card>
  );
}
