import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import { success, notFound } from "@/lib/api/response";
import { customerTimelineSchema } from "@/lib/validations";
import { customerRepository } from "@/server/repositories/dashboard.repository";

export const GET = withAuth(async (request) => {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = customerTimelineSchema.safeParse(params);
  if (!parsed.success) return notFound("Customer ID required.");
  const customer = await customerRepository.getById(parsed.data.customerId);
  if (!customer) return notFound("Customer not found.");
  const timeline = await customerRepository.getTimeline(parsed.data.customerId);
  return success(timeline);
}, "customer.manage");
