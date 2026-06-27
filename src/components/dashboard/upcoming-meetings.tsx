"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ExternalLink, MapPin, Video } from "lucide-react";
import { MEETING_TYPE_LABELS } from "@/types/meeting";
import { cn } from "@/lib/utils";

type UpcomingMeeting = {
  id: string;
  title: string;
  scheduledAt?: string | null;
  endsAt?: string | null;
  type?: string;
  meetingUrl?: string | null;
  location?: string | null;
  customer?: { id: string; name: string } | null;
};

type MeetingReminder = {
  id: string;
  title: string;
  dueAt: string;
  meetingId?: string | null;
  meeting?: {
    id: string;
    title: string;
    scheduledAt?: string | null;
    meetingUrl?: string | null;
  } | null;
};

function formatMeetingWhen(date?: string | null) {
  if (!date) return "Unscheduled";
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReminderWhen(date: string) {
  const d = new Date(date);
  const diff = d.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;
  return formatMeetingWhen(date);
}

interface UpcomingMeetingsProps {
  meetings?: UpcomingMeeting[];
  reminders?: MeetingReminder[];
  loading?: boolean;
  onOpenMeeting?: (id: string) => void;
}

export function UpcomingMeetings({
  meetings,
  reminders,
  loading,
  onOpenMeeting,
}: UpcomingMeetingsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Upcoming Meetings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
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
                      {reminder.meeting?.meetingUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(reminder.meeting!.meetingUrl!, "_blank")}
                        >
                          Join
                        </Button>
                      ) : reminder.meetingId && onOpenMeeting ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenMeeting(reminder.meetingId!)}
                        >
                          Open
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {meetings && meetings.length > 0 ? (
              <ul className="space-y-2">
                {meetings.map((meeting) => (
                  <li
                    key={meeting.id}
                    className={cn(
                      "flex items-start justify-between gap-3 border border-border px-3 py-2",
                      onOpenMeeting && "cursor-pointer hover:border-primary/40"
                    )}
                    onClick={() => onOpenMeeting?.(meeting.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenMeeting?.(meeting.id);
                      }
                    }}
                    role={onOpenMeeting ? "button" : undefined}
                    tabIndex={onOpenMeeting ? 0 : undefined}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMeetingWhen(meeting.scheduledAt)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {meeting.type ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {MEETING_TYPE_LABELS[meeting.type as keyof typeof MEETING_TYPE_LABELS] ??
                              meeting.type}
                          </Badge>
                        ) : null}
                        {meeting.customer ? (
                          <span className="text-[10px] text-muted-foreground">
                            {meeting.customer.name}
                          </span>
                        ) : null}
                        {meeting.location ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {meeting.meetingUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(meeting.meetingUrl!, "_blank");
                          }}
                        >
                          <Video className="mr-1 h-3.5 w-3.5" />
                          Join
                        </Button>
                      ) : null}
                      {onOpenMeeting ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenMeeting(meeting.id);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
