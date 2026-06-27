import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  fullValue?: string;
  change?: number;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "error" | "revenue" | "analytics";
}

const accentClasses = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  revenue: "text-revenue",
  analytics: "text-analytics",
};

export function MetricCard({ title, value, fullValue, change, icon: Icon, accent = "default" }: MetricCardProps) {
  const positive = change !== undefined && change >= 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
        <CardTitle className="truncate text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 shrink-0", accentClasses[accent])} />
      </CardHeader>
      <CardContent className="min-w-0">
        <p
          className="truncate text-base font-semibold tracking-tight tabular-nums sm:text-lg xl:text-xl"
          title={fullValue ?? String(value)}
        >
          {value}
        </p>
        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {positive ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-error" />
            )}
            <span className={positive ? "text-success" : "text-error"}>
              {positive ? "+" : ""}
              {change}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
