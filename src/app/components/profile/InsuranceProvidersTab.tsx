import { useState } from "react";
import { Pencil, X, RotateCcw, ShieldCheck, Plus, ChevronLeft, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import AddInsuranceDrawer, { InsuranceFormValues } from "./AddInsuranceDrawer";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsuranceRecord {
  id: string;
  uid: string;
  insuranceProvider: string;
  status: "active" | "no_expiry" | "expired";
  effectiveDate: string | null;
  expiryDate: string | null;
  policyNumber: string;
  groupNumber: string;
  planType: string;
  archived: boolean;
}

// ─── Mock seed data ───────────────────────────────────────────────────────────

const SEED_RECORDS: InsuranceRecord[] = [
  {
    id: "ins-1",
    uid: "174256",
    insuranceProvider: "MVP HEALTH CARE MEDICAID",
    status: "no_expiry",
    effectiveDate: null,
    expiryDate: null,
    policyNumber: "30880293243",
    groupNumber: "-",
    planType: "COMMERCIAL",
    archived: false,
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InsuranceRecord["status"] }) {
  if (status === "no_expiry") {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        No Expiry Date
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Active
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
      Expired
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InsuranceProvidersTab() {
  const [records, setRecords] = useState<InsuranceRecord[]>(() => {
    try {
      const stored = sessionStorage.getItem("client_insurance_records_v1");
      if (stored) return JSON.parse(stored);
    } catch {}
    return SEED_RECORDS;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const updateRecords = (updater: (prev: InsuranceRecord[]) => InsuranceRecord[]) => {
    setRecords((prev) => {
      const next = updater(prev);
      try {
        sessionStorage.setItem("client_insurance_records_v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const displayedRecords = records.filter((r) => !r.archived);

  const totalRows = displayedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRecords = displayedRecords.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleArchive = (id: string) => {
    updateRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, archived: true } : r))
    );
    toast.success("Insurance record archived");
  };

  const handleUnarchive = (id: string) => {
    updateRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, archived: false } : r))
    );
    toast.success("Insurance record restored");
  };

  const handleDelete = (id: string) => {
    updateRecords((prev) => prev.filter((r) => r.id !== id));
    toast.success("Insurance record deleted");
  };

  const handleAddInsurance = (values: InsuranceFormValues) => {
    const newRecord: InsuranceRecord = {
      id: `ins-${Date.now()}`,
      uid: String(Math.floor(100000 + Math.random() * 900000)),
      insuranceProvider: values.insuranceCompany || "Unknown Provider",
      status: !values.expiryDate ? "no_expiry" : "active",
      effectiveDate: values.effectiveDate || null,
      expiryDate: values.expiryDate || null,
      policyNumber: values.policyNumber || "-",
      groupNumber: values.groupNumber || "-",
      planType: values.planType || "COMMERCIAL",
      archived: false,
    };
    updateRecords((prev) => [...prev, newRecord]);
    toast.success("Insurance record added successfully");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-0" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Header row: New Insurance button */}
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer bg-[#181e25] hover:bg-[#2c3e50] transition-colors shadow-sm"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          New Insurance
        </button>
      </div>

      {/* Table container */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-sm">
            <thead className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white">
              <tr>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  UID
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Insurance Provider
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Status
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Effective Date
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Expiry Date
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Policy Number
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Group Number
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Plan Type
                </th>
                <th
                  className="py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap text-right"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        No active insurance records
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer bg-[#181e25] hover:bg-[#2c3e50] transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Insurance
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                    <td
                      className="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {rec.uid}
                    </td>
                    <td
                      className="py-3 px-4 text-sm font-semibold text-blue-600 whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {rec.insuranceProvider}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={rec.status} />
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {formatDate(rec.effectiveDate)}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {formatDate(rec.expiryDate)}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-gray-700 font-mono whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {rec.policyNumber}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {rec.groupNumber}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {rec.planType}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === rec.id ? null : rec.id)}
                          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === rec.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-left">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  toast.info(`Edit insurance ${rec.uid}`);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  rec.archived ? handleUnarchive(rec.id) : handleArchive(rec.id);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                {rec.archived ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                    Restore
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3.5 h-3.5 text-slate-400" />
                                    Archive
                                  </>
                                )}
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleDelete(rec.id);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-end gap-4 text-xs text-gray-500 bg-white">
          <span style={{ fontFamily: "DM Sans, sans-serif" }}>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-700 bg-white focus:outline-none cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {[5, 10, 25].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <span style={{ fontFamily: "DM Sans, sans-serif" }}>
            {totalRows === 0
              ? "0–0 of 0"
              : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, totalRows)} of ${totalRows}`}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Insurance Drawer */}
      <AddInsuranceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleAddInsurance}
      />
    </div>
  );
}
