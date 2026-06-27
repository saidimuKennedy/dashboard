import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";

const JOBS = ["scrape", "reindex", "embeddings", "report", "backup", "cleanup"];

export const GET = withAuth(async () => {
  return success({ jobs: JOBS.map((name) => ({ name, status: "idle" })) });
}, "admin.access");
