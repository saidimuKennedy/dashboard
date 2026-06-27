import type { PiiProfile } from "@/lib/ai/pii-mask";
import { buildMaskedCustomerContext } from "@/lib/ai/pii-mask";
import { getContractClosureWarning, type CustomerContract, type ContractStatus } from "@/types/customer";

type CustomerWithRelations = {
  industry?: string | null;
  status?: string;
  notes?: string | null;
  products?: { product: { name: string } }[];
  revenue?: { amount: unknown; currency?: string }[];
  contracts?: {
    title: string;
    endDate: Date;
    status: string;
    value?: unknown;
    currency?: string;
    retainers?: unknown[];
  }[];
};

export function buildPiiProfile(
  customer: { name: string; company?: string | null; email?: string | null; phone?: string | null },
  alias: string
): PiiProfile {
  return {
    alias,
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
  };
}

export function buildCustomerMaskedContext(
  profile: PiiProfile,
  customer: CustomerWithRelations
): string {
  const totalRevenue = customer.revenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) ?? 0;
  const currency = customer.revenue?.[0]?.currency ?? "KES";
  const mainContract = customer.contracts?.[0];
  let contractSummary: string | undefined;

  if (mainContract) {
    const { daysUntilEnd } = getContractClosureWarning(mainContract.endDate);
    contractSummary = `${mainContract.title}, status ${mainContract.status}, ends in ${daysUntilEnd} days`;
    if (mainContract.value) {
      contractSummary += `, value ${mainContract.currency ?? "KES"} ${Number(mainContract.value).toLocaleString()}`;
    }
  }

  return buildMaskedCustomerContext(profile, {
    industry: customer.industry,
    status: customer.status,
    notes: customer.notes,
    products: customer.products?.map((item) => item.product.name),
    totalRevenue,
    currency,
    contractSummary,
    retainerCount: mainContract?.retainers?.length,
  });
}

export function serializeContract(contract: {
  id: string;
  customerId: string;
  title: string;
  terms: string | null;
  content: string | null;
  startDate: Date;
  endDate: Date;
  value: unknown;
  currency: string;
  status: string;
  isRetainer: boolean;
  parentId: string | null;
  retainers?: {
    id: string;
    customerId: string;
    title: string;
    terms: string | null;
    content: string | null;
    startDate: Date;
    endDate: Date;
    value: unknown;
    currency: string;
    status: string;
    isRetainer: boolean;
    parentId: string | null;
  }[];
}): CustomerContract {
  const { warning, daysUntilEnd } = getContractClosureWarning(contract.endDate);
  return {
    id: contract.id,
    customerId: contract.customerId,
    title: contract.title,
    terms: contract.terms,
    content: contract.content,
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate.toISOString(),
    value: contract.value != null ? Number(contract.value) : null,
    currency: contract.currency,
    status: contract.status as ContractStatus,
    isRetainer: contract.isRetainer,
    parentId: contract.parentId,
    closureWarning: warning,
    daysUntilEnd,
    retainers: contract.retainers?.map((r) => serializeContract(r)),
  };
}
