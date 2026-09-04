import React from "react";
import { ShieldCheck, XCircle, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { EligibilityCheck, EligibilityStatus } from "../../types/rcmTypes";

export interface EligibilityBadgeProps {
  status: EligibilityStatus | string;
  check?: Partial<EligibilityCheck> | any;
  className?: string;
}

/**
 * Returns an Athelas-style eligibility badge with tooltip details.
 * Supports: Active, Inactive, Not Covered, Inconclusive, Unable to get a response, Pending, Self-Pay.
 */
export function getEligibilityBadge(status: string, check?: any) {
  const s = (status || "active").toLowerCase().trim();
  let bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let label = "Active";
  let icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;

  if (s === "active" || s === "eligible" || s === "verified") {
    bg = "bg-emerald-50 text-emerald-700 border-emerald-200";
    label = "Active";
    icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
  } else if (s === "inactive") {
    bg = "bg-rose-50 text-rose-700 border-rose-200";
    label = "Inactive";
    icon = <XCircle className="w-3.5 h-3.5 text-rose-600" />;
  } else if (s === "not_covered" || s === "not covered") {
    bg = "bg-rose-50 text-rose-700 border-rose-200";
    label = "Not Covered";
    icon = <XCircle className="w-3.5 h-3.5 text-rose-600" />;
  } else if (s === "inconclusive") {
    bg = "bg-amber-50 text-amber-800 border-amber-200";
    label = "Inconclusive";
    icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
  } else if (s === "unable_to_respond" || s === "unable to get a response" || s === "error") {
    bg = "bg-slate-100 text-slate-700 border-slate-300";
    label = "Unable to get a response";
    icon = <AlertCircle className="w-3.5 h-3.5 text-slate-500" />;
  } else if (s === "self_pay" || s === "self-pay") {
    bg = "bg-indigo-50 text-indigo-700 border-indigo-200";
    label = "Self-Pay";
    icon = <DollarSign className="w-3.5 h-3.5 text-indigo-600" />;
  } else if (s === "pending") {
    bg = "bg-slate-100 text-slate-700 border-slate-200";
    label = "Pending";
    icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
  }

  const tooltipParts: string[] = [];
  if (check?.payerName) tooltipParts.push(check.payerName);
  if (check?.copayAmount !== undefined && check?.copayAmount !== null) tooltipParts.push(`Copay: $${check.copayAmount}`);
  if (check?.deductibleRemaining !== undefined && check?.deductibleRemaining !== null) tooltipParts.push(`Deductible: $${check.deductibleRemaining}`);
  if (check?.coinsurance !== undefined && check?.coinsurance !== null) tooltipParts.push(`Coinsurance: ${check.coinsurance}%`);
  if (check?.terminationReason) tooltipParts.push(check.terminationReason);
  if (check?.inconclusiveReason) tooltipParts.push(check.inconclusiveReason);

  const tooltipText =
    tooltipParts.length > 0
      ? tooltipParts.join(" • ")
      : s === "unable_to_respond" || s === "unable to get a response"
      ? "Unable to get a response from payer clearinghouse. Please retry."
      : `Eligibility: ${label}`;

  return (
    <Tooltip text={tooltipText}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${bg} cursor-help`}
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {icon}
        {label}
      </span>
    </Tooltip>
  );
}

export default function EligibilityBadge({ status, check }: EligibilityBadgeProps) {
  return getEligibilityBadge(status, check);
}
