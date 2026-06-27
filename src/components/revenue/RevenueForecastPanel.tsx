import { formatCurrency } from "@/lib/utils";
import type { ForecastSummary } from "@/lib/finance/reports";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  forecast: ForecastSummary;
};

export function RevenueForecastPanel({ forecast }: Props) {
  return (
    <Card className="space-y-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Forecasting</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on active contracts, pipeline, and renewal risk
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-muted-foreground">Expected next month</p>
          <p className="text-2xl font-bold">{formatCurrency(forecast.expectedNextMonth)}</p>
          <p className="text-xs text-muted-foreground">Confidence {forecast.confidencePct}%</p>
        </div>
      </div>

      {forecast.risks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Possible risks</p>
          {forecast.risks.map((r, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
                {r.amount != null && (
                  <p className="mt-1 text-xs text-amber-600">
                    Expected loss: {formatCurrency(r.amount)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {forecast.scenarios.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Scenarios</p>
          {forecast.scenarios.map((s, i) => (
            <div key={i} className="rounded-lg border border-border px-3 py-2">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
