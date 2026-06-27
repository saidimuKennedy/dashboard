import type { DecisionStatus } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<DecisionStatus, DecisionStatus[]> = {
  PROPOSED: ["APPROVED", "SUPERSEDED"],
  APPROVED: ["IMPLEMENTED", "REVIEWED", "SUPERSEDED"],
  IMPLEMENTED: ["REVIEWED", "SUPERSEDED"],
  REVIEWED: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export class InvalidStatusTransitionError extends Error {
  readonly code = "INVALID_TRANSITION";

  constructor(
    public readonly from: DecisionStatus,
    public readonly to: DecisionStatus
  ) {
    super(`Cannot move from ${from} to ${to}.`);
    this.name = "InvalidStatusTransitionError";
  }
}

export function getAllowedNextStatuses(current: DecisionStatus): DecisionStatus[] {
  return ALLOWED_TRANSITIONS[current];
}

export function assertStatusTransition(from: DecisionStatus, to: DecisionStatus): void {
  if (from === to) return;
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

export function getSelectableStatuses(current: DecisionStatus): DecisionStatus[] {
  return [current, ...ALLOWED_TRANSITIONS[current]];
}
