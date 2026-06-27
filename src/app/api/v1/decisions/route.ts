import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success } from "@/lib/api/response";
import { parseBody, getClientIp, paginatedData } from "@/lib/api/helpers";
import { parsePagination } from "@/lib/api/response";
import { createDecisionSchema } from "@/lib/validations";
import { decisionRepository } from "@/server/repositories/domains.repository";
import { auditLog } from "@/lib/logger/audit";
import { aiService } from "@/server/ai/ai.service";
import { formatPremortemEvidence } from "@/types/decision";

export const GET = withAuth(async (request) => {
  const { page, limit, skip } = parsePagination(request.nextUrl.searchParams);
  const { items, total } = await decisionRepository.list(skip, limit);
  return success(paginatedData(items, total, page, limit));
});

export const POST = withAuth(async (request, { user }) => {
  const parsed = await parseBody(request, createDecisionSchema);
  if (!parsed.ok) return parsed.response;

  const { runPremortem, status, ...rest } = parsed.data;
  let evidence = rest.evidence;
  let premortemTokens = 0;

  if (runPremortem) {
    const { premortem, tokens } = await aiService.premortemDecision({
      title: rest.title,
      context: rest.context,
      decision: rest.decision,
      alternatives: rest.alternatives,
      reasoning: rest.reasoning,
    });
    premortemTokens = tokens;
    const premortemBlock = formatPremortemEvidence(premortem);
    evidence = evidence ? `${evidence}\n\n${premortemBlock}` : premortemBlock;
  }

  const decision = await decisionRepository.create({
    ...rest,
    evidence,
    status: status ?? "APPROVED",
    ownerId: rest.ownerId ?? user.id,
  });

  await auditLog({
    userId: user.id,
    action: "decision.create",
    resource: "decisions",
    resourceId: decision.id,
    ipAddress: getClientIp(request),
    metadata: runPremortem ? { premortemTokens } : undefined,
  });
  return success(decision, "Decision created.", 201);
});
