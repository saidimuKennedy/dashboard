import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatRelative(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string | Date;
}

interface RecentActivityProps {
  title: string;
  items?: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  onItemClick?: (id: string) => void;
}

export function RecentActivity({ title, items, loading, emptyMessage, onItemClick }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "border-b border-border pb-3 last:border-0 last:pb-0",
                  onItemClick && "cursor-pointer rounded-md transition-colors hover:bg-muted/50 -mx-2 px-2 py-1"
                )}
                onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                onKeyDown={
                  onItemClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onItemClick(item.id);
                        }
                      }
                    : undefined
                }
                role={onItemClick ? "button" : undefined}
                tabIndex={onItemClick ? 0 : undefined}
              >
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                {item.subtitle && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
                {item.date && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatRelative(item.date)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {emptyMessage ?? "No recent activity."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
