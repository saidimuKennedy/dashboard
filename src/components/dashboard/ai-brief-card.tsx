import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AiMessageContent } from "@/components/ai/ai-message-content";

interface AiBriefCardProps {
  brief?: string;
  loading?: boolean;
}

export function AiBriefCard({ brief, loading }: AiBriefCardProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle>AI Brief</CardTitle>
        <Badge variant="default" className="ml-auto">
          Daily
        </Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <AiMessageContent content={brief ?? "Your AI brief will appear here once data is available."} role="assistant" />
        )}
      </CardContent>
    </Card>
  );
}
