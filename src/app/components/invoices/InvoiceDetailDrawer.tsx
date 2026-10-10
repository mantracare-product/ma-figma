import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  FileText,
  User,
  Calendar,
  Send,
  CreditCard,
  Ban,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  MessageSquare,
  Upload,
  Plus,
  Printer,
  ChevronDown,
  FileCheck,
  Download,
  Wallet,
  Receipt,
  Sparkles,
  X,
  Link as LinkIcon,
  Shield,
  Layers,
  Settings,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ClientInvoice, InvoiceStatus, InvoicePaymentRecord, InvoiceLineItem } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { ChevronStageRibbon } from "../common/ChevronStageRibbon";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import ActivityTab, { ActivityLogEntry } from "../activity/ActivityTab";
import DocumentsTab from "../profile/DocumentsTab";
import RecordPaymentModal from "./RecordPaymentModal";
import { TableComponent, TableColumn } from "../ui/TableComponent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
  SECTION_REGISTRY_EVENT,
  FIELD_REGISTRY_EVENT,
} from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, DEFAULT_ENTITY_PROCESSES, Process, Stage } from "../../../lib/useProcessStore";
import { invoiceService } from "../../../lib/invoiceService";
import { appendActivity, getActivity, subscribeToActivity } from "../../../lib/activityEngine";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import { getStoredServices, onServicesChanged, Service } from "../../../lib/servicesStore";

export interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  onOpenDocument?: (invoice: ClientInvoice) => void;
}

const DEFAULT_INVOICE_SECTIONS: OverviewSection[] = [
  {
    id: "sec-inv-details",
    title: "Invoice Details",
    description: "Issue date, due date, payment mode, totals, and balance",
    iconName: "file-text",
    source: "system",
    module: "invoice",
    fieldKeys: [
      "invoice_number",
      "issue_date",
      "due_date",
      "payment_mode",
      "status",
      "stage",
      "total_amount",
      "amount_paid",
      "balance_due",
      "client_credit",
    ],
  },
  {
    id: "sec-inv-items",
    title: "Product / Line Items",
    description: "Itemized services, consultation rates, and totals",
    iconName: "table",
    source: "system",
    module: "invoice",
    fieldKeys: [
      "line_items_summary",
      "subtotal",
      "tax_amount",
      "discount_applied",
    ],
  },
  {
    id: "sec-inv-payment-link",
    title: "Shareable Payment Link",
    description: "Online checkout and direct payment portal for client",
    iconName: "link",
    source: "system",
    module: "invoice",
    fieldKeys: [
      "payment_url",
    ],
  },
];

// ─── Custom Tabular Line Items Section Component ─────────────────────────────

interface InvoiceLineItemsSectionProps {
  invoice: ClientInvoice;
  onUpdateInvoice: (patch: Partial<ClientInvoice>) => void;
}

function InvoiceLineItemsSection({ invoice, onUpdateInvoice }: InvoiceLineItemsSectionProps) {
  const [catalogServices, setCatalogServices] = useState<Service[]>(() => getStoredServices());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    return onServicesChanged(() => {
      setCatalogServices(getStoredServices());
    });
  }, []);

  const lineItems: InvoiceLineItem[] = invoice.lineItems || [];

  const filteredCatalog = useMemo(() => {
    if (!searchFilter.trim()) return catalogServices;
    const q = searchFilter.toLowerCase();
    return catalogServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q))
    );
  }, [catalogServices, searchFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    filteredCatalog.forEach((s) => set.add(s.category || "Product / Services"));
    return Array.from(set);
  }, [filteredCatalog]);

  const isItemSelected = (service: Service) => {
    return lineItems.some(
      (item) =>
        (item.serviceId !== undefined && String(item.serviceId) === String(service.id)) ||
        item.description.trim().toLowerCase() === service.name.trim().toLowerCase()
    );
  };

  const recalcAndSync = (items: InvoiceLineItem[]) => {
    const subtotal = items.reduce(
      (acc, it) => acc + (it.unitPrice * (it.quantity || 1)),
      0
    );
    const totalDiscount = items.reduce(
      (acc, it) => acc + (it.discountAmount || 0),
      0
    );
    const taxable = Math.max(0, subtotal - totalDiscount);
    const taxSum = items.reduce((acc, it) => {
      const itemSub = Math.max(0, (it.unitPrice * (it.quantity || 1)) - (it.discountAmount || 0));
      const rate = it.taxPercent !== undefined ? it.taxPercent : 5;
      return acc + (itemSub * rate) / 100;
    }, 0);
    const tax = Math.round(taxSum * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    onUpdateInvoice({
      lineItems: items,
      subtotal,
      discountAmount: totalDiscount,
      taxAmount: tax,
      total,
    });
  };

  const handleToggleService = (service: Service) => {
    const existingIndex = lineItems.findIndex(
      (item) =>
        (item.serviceId !== undefined && String(item.serviceId) === String(service.id)) ||
        item.description.trim().toLowerCase() === service.name.trim().toLowerCase()
    );

    let updated: InvoiceLineItem[];
    if (existingIndex >= 0) {
      updated = lineItems.filter((_, idx) => idx !== existingIndex);
    } else {
      const newItem: InvoiceLineItem = {
        id: `li-${Date.now()}-${service.id}`,
        source: "service",
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: service.price,
        discountAmount: 0,
        taxPercent: service.tax ?? 5,
      };
      updated = [...lineItems, newItem];
    }
    recalcAndSync(updated);
  };

  const handleUpdateQty = (itemId: string, qty: number) => {
    const updated = lineItems.map((item) =>
      item.id === itemId ? { ...item, quantity: Math.max(1, qty) } : item
    );
    recalcAndSync(updated);
  };

  const handleUpdateDiscount = (itemId: string, disc: number) => {
    const updated = lineItems.map((item) =>
      item.id === itemId ? { ...item, discountAmount: Math.max(0, disc) } : item
    );
    recalcAndSync(updated);
  };

  const handleRemoveItem = (itemId: string) => {
    const updated = lineItems.filter((item) => item.id !== itemId);
    recalcAndSync(updated);
  };

  const subtotal = lineItems.reduce(
    (acc, it) => acc + (it.unitPrice * (it.quantity || 1)),
    0
  );
  const totalDiscount = lineItems.reduce(
    (acc, it) => acc + (it.discountAmount || 0),
    0
  );
  const taxAmount = invoice.taxAmount ?? Math.round(Math.max(0, subtotal - totalDiscount) * 0.05 * 100) / 100;
  const grandTotal = Math.round((Math.max(0, subtotal - totalDiscount) + taxAmount) * 100) / 100;

  return (
    <div className="space-y-4 pt-1">
      {/* Multiselect Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Line Items ({lineItems.length})
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Product/services
          </span>
        </div>

        {/* Advance List > Multiselect Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Products / Services (Multiselect)</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl p-3 z-50 space-y-2.5"
              style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)" }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  Product / Services Catalogue
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {catalogServices.length} items available
                </span>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products & services..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                  autoFocus
                />
              </div>

              {/* Multiselect options grouped by category */}
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No matching products found</p>
                ) : (
                  categories.map((cat) => {
                    const groupItems = filteredCatalog.filter(
                      (s) => (s.category || "Product / Services") === cat
                    );
                    if (groupItems.length === 0) return null;

                    return (
                      <div key={cat} className="pt-2 first:pt-0 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                          {cat}
                        </div>
                        {groupItems.map((svc) => {
                          const selected = isItemSelected(svc);
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => handleToggleService(svc)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                                selected ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    selected
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {selected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="truncate">
                                  <p className="font-semibold text-xs truncate leading-tight">{svc.name}</p>
                                  <span className="text-[10px] text-purple-700 font-medium">CRM bind</span>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-900 ml-2 font-mono shrink-0">
                                ${svc.price.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-100 pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabular View */}
      {lineItems.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-slate-600">No product/service line items added</p>
          <p className="text-[11px] text-slate-400">
            Use the multiselect dropdown above to add products & services from the catalog.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-right">Price (CRM)</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Discount ($)</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item) => {
                const rowTotal = Math.max(
                  0,
                  (item.unitPrice * (item.quantity || 1)) - (item.discountAmount || 0)
                );
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Product Name (CRM bind) */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">{item.description}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 select-none">
                          CRM bind
                        </span>
                      </div>
                    </td>

                    {/* Money (CRM bind) */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1 font-mono text-slate-700">
                        <span className="font-semibold">${item.unitPrice.toFixed(2)}</span>
                        <span className="px-1 py-0.2 rounded text-[8px] font-medium bg-slate-100 text-slate-500 select-none">
                          bind
                        </span>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity || 1}
                        onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1 text-center bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Discount (number) */}
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={item.discountAmount ?? 0}
                        onChange={(e) => handleUpdateDiscount(item.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-right bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Row Total */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      ${rowTotal.toFixed(2)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Section Summary Totals */}
          <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-500">
              <span>Subtotal: <strong className="text-slate-800">${subtotal.toFixed(2)}</strong></span>
              {totalDiscount > 0 && (
                <span className="text-emerald-600 font-medium">
                  Discount: -${totalDiscount.toFixed(2)}
                </span>
              )}
              <span>Tax (5%): <strong className="text-slate-800">${taxAmount.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider">Total Due:</span>
              <span className="text-base font-bold text-blue-600 font-mono">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceDetailDrawer({
  isOpen,
  onClose,
  invoice,
  onOpenDocument,
}: InvoiceDetailDrawerProps) {
  const { invoices, updateInvoiceStatus, sendInvoice, voidInvoice, getPaymentsByInvoice, getClientCredit } = useInvoices();
  const { activeOrganization } = useOrganization();
  const { getSectionsForOrg, getFieldsForOrg, addCustomSection, updateCustomSection } = useFieldRegistry();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "payments">("overview");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Field Management Modals
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
  const [fieldManagerMode, setFieldManagerMode] = useState<"select" | "create">("select");
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionDefinition | null>(null);

  // Live Invoice state from store / context
  const liveInvoice = useMemo(() => {
    if (!invoice) return null;
    return invoices.find((i) => i.id === invoice.id) || invoiceService.getInvoiceById(invoice.id) || invoice;
  }, [invoices, invoice]);

  // Invoice Process & Stages
  const invoiceProcess: Process = useMemo(() => {
    const procs = getStoredProcesses();
    const invProcs = procs.filter((p) => p.entityType === "invoice");
    return invProcs[0] || DEFAULT_ENTITY_PROCESSES.invoice;
  }, []);

  const invoiceStages: Stage[] = useMemo(() => {
    return invoiceProcess.stages || DEFAULT_ENTITY_PROCESSES.invoice.stages;
  }, [invoiceProcess]);

  // Current stage matching
  const currentInvoiceStage: Stage | undefined = useMemo(() => {
    if (!liveInvoice) return undefined;
    if (liveInvoice.currentStageId && liveInvoice.currentStageId.trim() !== "") {
      const stageKey = liveInvoice.currentStageId.trim().toLowerCase();
      const match = invoiceStages.find(
        (s) =>
          s.id.toLowerCase() === stageKey ||
          s.name.toLowerCase() === stageKey ||
          (liveInvoice.statusLabel && s.name.toLowerCase() === liveInvoice.statusLabel.toLowerCase())
      );
      if (match) return match;
    }

    if (liveInvoice.statusLabel) {
      const match = invoiceStages.find(
        (s) => s.name.toLowerCase() === liveInvoice.statusLabel!.toLowerCase()
      );
      if (match) return match;
    }

    if (liveInvoice.status) {
      const sysCat = liveInvoice.status === "partial" ? "partially_paid" : liveInvoice.status;
      const match = invoiceStages.find(
        (s) => s.systemCategory === sysCat || s.systemCategory === liveInvoice.status || s.name.toLowerCase() === sysCat
      );
      if (match) return match;
    }

    return undefined;
  }, [invoiceStages, liveInvoice?.currentStageId, liveInvoice?.statusLabel, liveInvoice?.status]);

  // Client Identifier for documents and activities
  const effectiveClientId = useMemo(() => {
    if (!liveInvoice) return "CL-0";
    return liveInvoice.clientId || `INV-${liveInvoice.id}`;
  }, [liveInvoice]);

  const availableCredit = useMemo(() => {
    if (!liveInvoice) return 0;
    return getClientCredit(liveInvoice.clientId);
  }, [liveInvoice, getClientCredit]);

  // Overview Sections & Fields State
  const storageSectionKey = `mantra_inv_sections_layout`;
  const [invoiceSections, setInvoiceSections] = useState<OverviewSection[]>(() => {
    try {
      const raw = localStorage.getItem(storageSectionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((s: OverviewSection) => s.id !== "sec-inv-client");
          return filtered.length > 0 ? filtered : DEFAULT_INVOICE_SECTIONS;
        }
      }
    } catch {}
    return DEFAULT_INVOICE_SECTIONS;
  });

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    const filtered = newSections.filter((s) => s.id !== "sec-inv-client");
    setInvoiceSections(filtered);
    try {
      localStorage.setItem(storageSectionKey, JSON.stringify(filtered));
    } catch {}
  };

  // Field values mapping
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!liveInvoice) return;

    let storedCustom: Record<string, any> = {};
    try {
      const raw = localStorage.getItem(`mantra_inv_fields_${liveInvoice.id}`);
      if (raw) storedCustom = JSON.parse(raw);
    } catch {}

    const balance = Math.max(0, liveInvoice.total - (liveInvoice.amountPaid || 0));
    const itemsSummary = (liveInvoice.lineItems || [])
      .map((item) => `${item.description} (x${item.quantity}) - $${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}`)
      .join("\n");

    setFieldValues({
      invoice_number: liveInvoice.id,
      issue_date: liveInvoice.issueDate || liveInvoice.date || new Date().toISOString().split("T")[0],
      due_date: liveInvoice.dueDate || "",
      payment_mode: liveInvoice.paymentMethod || "Bank Transfer",
      status: liveInvoice.status || "draft",
      stage: currentInvoiceStage?.name || liveInvoice.statusLabel || "Draft",
      total_amount: `$${liveInvoice.total.toFixed(2)}`,
      amount_paid: `$${(liveInvoice.amountPaid || 0).toFixed(2)}`,
      balance_due: `$${balance.toFixed(2)}`,
      client_credit: `$${availableCredit.toFixed(2)}`,
      client_name: liveInvoice.clientName || "",
      client_email: liveInvoice.clientEmail || "",
      client_phone: liveInvoice.clientPhone || "",
      billing_address: liveInvoice.billingAddress || "123 Health Tech Ave, Suite 400, San Francisco, CA",
      line_items_summary: itemsSummary || "Standard Consultation - $150.00",
      subtotal: `$${(liveInvoice.subtotal || liveInvoice.total * 0.95).toFixed(2)}`,
      tax_amount: `$${(liveInvoice.tax || liveInvoice.total * 0.05).toFixed(2)}`,
      discount_applied: liveInvoice.discount ? `$${liveInvoice.discount.toFixed(2)}` : "$0.00",
      payment_url: `https://pay.mantra-assist.mock/${liveInvoice.id}`,
      ...storedCustom,
    });
  }, [liveInvoice, currentInvoiceStage?.name, availableCredit]);

  const handleFieldValueChange = (key: string, value: any) => {
    setFieldValues((prev) => {
      const next = { ...prev, [key]: value };
      if (liveInvoice) {
        try {
          localStorage.setItem(`mantra_inv_fields_${liveInvoice.id}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    if (liveInvoice) {
      let patch: any = {};
      if (key === "due_date") patch.dueDate = value;
      if (key === "payment_mode") patch.paymentMethod = value;
      if (key === "billing_address") patch.billingAddress = value;

      if (Object.keys(patch).length > 0) {
        invoiceService.updateInvoice(liveInvoice.id, patch);
      }
    }
  };

  // Stage Progression Handler
  const handleStageSelect = (targetStage: Stage) => {
    if (!liveInvoice || targetStage.id === currentInvoiceStage?.id) return;

    try {
      const moved = invoiceService.moveToStage(liveInvoice.id, targetStage.id, {
        type: "manual",
        ruleName: `Stage changed to ${targetStage.name} from drawer`,
      });

      const primaryId = liveInvoice.clientId || effectiveClientId;
      appendActivity({
        clientId: primaryId,
        appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
        processId: invoiceProcess.id,
        processName: invoiceProcess.name,
        type: "stage_update" as any,
        refId: liveInvoice.id,
        fromStage: currentInvoiceStage?.name || "Draft",
        toStage: targetStage.name,
        status: "completed",
        createdBy: "user",
        details: {
          primary: `Invoice stage updated to "${targetStage.name}"`,
          secondary: `Moved from ${currentInvoiceStage?.name || "Draft"}`,
        },
      });

      toast.success(`Invoice moved to "${targetStage.name}"`);
    } catch (e) {
      console.warn("[InvoiceDetailDrawer] Failed to move stage:", e);
    }
  };

  // Activity logs subscription
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  useEffect(() => {
    if (!liveInvoice) return;

    const candidateIds = [
      liveInvoice.clientId,
      effectiveClientId,
      liveInvoice.id,
      String(liveInvoice.appointmentId || ""),
    ].filter(Boolean) as string[];

    const load = () => {
      let list = getActivity(candidateIds, undefined, {
        appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
      });

      // Ensure exact lifecycle sequence for this invoice:
      // Invoice Created (with Source) -> Document Generated -> Stage Updated -> Payment Recorded
      const hasInvoiceCreated = list.some(
        (e) => (e.type === "invoice_created" || e.type === "process_entry") &&
               (e.details?.primary?.includes(liveInvoice.id) || (e as any).refId === liveInvoice.id)
      );

      if (!hasInvoiceCreated) {
        const primaryId = liveInvoice.clientId || effectiveClientId;
        const sourceLabel = liveInvoice.createdBy === "rule"
          ? "Automation / Rule"
          : liveInvoice.appointmentId
          ? `Appointment #${liveInvoice.appointmentId}`
          : "Standalone";

        const baseTime = liveInvoice.createdAt ? new Date(liveInvoice.createdAt).getTime() : Date.now() - 300000;

        // 1. Invoice Created
        appendActivity({
          clientId: primaryId,
          appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
          processId: invoiceProcess.id,
          processName: invoiceProcess.name,
          type: "invoice_created" as any,
          refId: liveInvoice.id,
          status: "completed",
          createdBy: liveInvoice.createdBy === "rule" ? "system" : "user",
          sourceStepName: sourceLabel,
          timestamp: new Date(baseTime).toISOString(),
          details: {
            primary: `Invoice ${liveInvoice.id} created for ${liveInvoice.clientName}`,
            secondary: `Source: ${sourceLabel} · Total: $${liveInvoice.total.toFixed(2)} · Due: ${liveInvoice.dueDate || "On Receipt"}`,
          },
        });

        // 2. Document Generated
        appendActivity({
          clientId: primaryId,
          appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
          processId: invoiceProcess.id,
          processName: invoiceProcess.name,
          type: "document_generated" as any,
          refId: liveInvoice.id,
          status: "completed",
          createdBy: "system",
          timestamp: new Date(baseTime + 60000).toISOString(),
          details: {
            primary: "Official invoice document generated",
            secondary: "System template applied · Ready for client download & dispatch",
          },
        });

        // 3. Stage Updated
        const activeStageName = currentInvoiceStage?.name || liveInvoice.statusLabel || "Draft";
        appendActivity({
          clientId: primaryId,
          appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
          processId: invoiceProcess.id,
          processName: invoiceProcess.name,
          type: "stage_update" as any,
          refId: liveInvoice.id,
          fromStage: "Draft",
          toStage: activeStageName,
          status: "completed",
          createdBy: "system",
          timestamp: new Date(baseTime + 120000).toISOString(),
          details: {
            primary: `Invoice stage updated to "${activeStageName}"`,
            secondary: `Current status: ${liveInvoice.status}`,
          },
        });

        // 4. Payment Recorded (if payment was settled)
        if ((liveInvoice.amountPaid && liveInvoice.amountPaid > 0) || liveInvoice.status === "paid" || liveInvoice.status === "partial") {
          appendActivity({
            clientId: primaryId,
            appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
            processId: invoiceProcess.id,
            processName: invoiceProcess.name,
            type: "payment_recorded" as any,
            refId: liveInvoice.id,
            status: "completed",
            createdBy: "user",
            timestamp: liveInvoice.paidAt || new Date(baseTime + 180000).toISOString(),
            details: {
              primary: `Payment of $${(liveInvoice.amountPaid || liveInvoice.total).toFixed(2)} recorded`,
              secondary: `Method: ${liveInvoice.paymentMethod || "Bank Transfer"} · Remaining Balance: $${Math.max(0, liveInvoice.total - (liveInvoice.amountPaid || liveInvoice.total)).toFixed(2)}`,
            },
          });
        }

        list = getActivity(candidateIds, undefined, {
          appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
        });
      }

      setActivities(list as any);
    };

    load();
    const unsub = subscribeToActivity(candidateIds, load, {
      appointmentId: liveInvoice.appointmentId ? String(liveInvoice.appointmentId) : undefined,
    });
    return unsub;
  }, [liveInvoice?.id, liveInvoice?.status, liveInvoice?.currentStageId, effectiveClientId, invoiceProcess.name, currentInvoiceStage?.name]);

  // Settled Payments records for this invoice
  const settledPayments = useMemo(() => {
    if (!liveInvoice) return [];
    const directPayments = getPaymentsByInvoice(liveInvoice.id);
    if (directPayments && directPayments.length > 0) return directPayments;

    // If marked paid, create a synthetic settled record so table is complete
    if (liveInvoice.status === "paid" || (liveInvoice.amountPaid && liveInvoice.amountPaid > 0)) {
      return [
        {
          id: `pay-${liveInvoice.id}-1`,
          date: liveInvoice.issueDate || new Date().toISOString().split("T")[0],
          invoiceId: liveInvoice.id,
          clientId: liveInvoice.clientId,
          amount: liveInvoice.amountPaid || liveInvoice.total,
          method: liveInvoice.paymentMethod || "Bank Transfer",
          reference: `REC-${liveInvoice.id.replace(/[^0-9]/g, "").slice(-5) || "92831"}`,
          status: "completed",
        } as InvoicePaymentRecord,
      ];
    }
    return [];
  }, [liveInvoice, getPaymentsByInvoice]);

  if (!isOpen || !liveInvoice) return null;

  const handleCopyLink = () => {
    const url = `https://pay.mantra-assist.mock/${liveInvoice.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    toast.success("Shareable payment link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvoice = (method: "email" | "sms" | "whatsapp") => {
    sendInvoice(liveInvoice.id, method);
  };

  const handleVoidInvoice = () => {
    voidInvoice(liveInvoice.id);
    toast.success(`Invoice ${liveInvoice.id} voided`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* ── Top Header (DESIGN.md Light Architectural Standard) ── */}
        <div className="flex-shrink-0 bg-white px-7 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-base font-bold text-slate-900 tracking-tight"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Invoice View
                </h1>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  #{liveInvoice.id}
                </span>
                {liveInvoice.createdBy === "system" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Sparkles className="w-2.5 h-2.5" /> Automated Flow
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                <span>Created {liveInvoice.issueDate || liveInvoice.date || "recently"}</span>
                <span>•</span>
                <span>{liveInvoice.clientName || "Client"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  Actions
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white shadow-xl rounded-xl border border-slate-200 p-1">
                <DropdownMenuItem
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="text-xs font-medium cursor-pointer flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Record Payment
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSendInvoice("email")}
                  className="text-xs font-medium cursor-pointer flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Send via Email
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSendInvoice("whatsapp")}
                  className="text-xs font-medium cursor-pointer flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Send via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyLink}
                  className="text-xs font-medium cursor-pointer flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                  Copy Payment Link
                </DropdownMenuItem>
                {onOpenDocument && (
                  <DropdownMenuItem
                    onClick={() => onOpenDocument(liveInvoice)}
                    className="text-xs font-medium cursor-pointer flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-100"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Printable Document
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuItem
                  onClick={handleVoidInvoice}
                  disabled={liveInvoice.status === "void"}
                  className="text-xs font-medium cursor-pointer text-rose-600 flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-rose-50"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  Void Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Direct Action: Record Payment */}
            {liveInvoice.status !== "paid" && (
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Record Payment
              </button>
            )}

            {/* Direct Action: Printable View */}
            {onOpenDocument && (
              <button
                type="button"
                onClick={() => onOpenDocument(liveInvoice)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Printable View
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Stage Pipeline Bar (Chevron Stage Ribbon) ── */}
        <div className="flex-shrink-0 px-7 py-2.5 bg-white border-b border-slate-200">
          <ChevronStageRibbon
            stages={invoiceStages.map((s) => ({
              id: s.id,
              name: s.name,
              color: s.color,
              isFinalStage: s.isFinalStage || s.isFinal || s.systemCategory === "paid" || s.systemCategory === "void",
              isFinal: s.isFinal || s.isFinalStage,
              systemCategory: s.systemCategory,
            }))}
            activeStageId={currentInvoiceStage?.id}
            onStageClick={(stg) => {
              const matched = invoiceStages.find((s) => String(s.id) === String(stg.id));
              if (matched) handleStageSelect(matched);
            }}
            showAddButton={true}
          />
          {!currentInvoiceStage && (
            <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 bg-amber-50/90 border border-amber-200/90 rounded-lg text-xs font-medium text-amber-800">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Stage not marked — please build the automation first
              </span>
              <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
                Build automation &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* ── Tabs Bar ── */}
        <div className="flex-shrink-0 bg-white px-6 flex border-b border-slate-200 gap-8">
          {(
            [
              { id: "overview", label: "Overview", icon: <FileText className="w-3.5 h-3.5" /> },
              { id: "documents", label: "Documents", icon: <FileCheck className="w-3.5 h-3.5" />, count: 1 },
              { id: "payments", label: "Payments", icon: <Wallet className="w-3.5 h-3.5" />, count: settledPayments.length },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 text-xs font-semibold transition-all flex items-center gap-2 relative cursor-pointer ${
                  isSelected ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof (tab as any).count === "number" && (tab as any).count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {(tab as any).count}
                  </span>
                )}
                {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable Tab Body ── */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          
          {/* ─────────────────────────────────────────────────────────────
              TAB 1: OVERVIEW (2-Column Split: Sections on Left, Activity on Right)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN: Draggable Sections & Custom Fields */}
                <div className="lg:col-span-6 space-y-4">
                  <DraggableOverviewSections
                    mode="invoice"
                    customFieldsModule="invoice"
                    sections={invoiceSections}
                    onSectionsChange={handleSectionsChange}
                    fieldValues={fieldValues}
                    onFieldValueChange={handleFieldValueChange}
                    client={{
                      id: effectiveClientId,
                      name: liveInvoice.clientName,
                      phone: liveInvoice.clientPhone,
                      email: liveInvoice.clientEmail,
                    }}
                    renderCustomSection={(section) => {
                      if (section.id === "sec-inv-items") {
                        return (
                          <InvoiceLineItemsSection
                            invoice={liveInvoice}
                            onUpdateInvoice={(patch) => {
                              invoiceService.updateInvoice(liveInvoice.id, patch);
                              if (patch.lineItems) {
                                const itemsSummary = patch.lineItems
                                  .map((item) => `${item.description} (x${item.quantity}) - $${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}`)
                                  .join("\n");
                                setFieldValues((prev) => ({
                                  ...prev,
                                  line_items_summary: itemsSummary,
                                  subtotal: `$${(patch.subtotal ?? liveInvoice.subtotal).toFixed(2)}`,
                                  tax_amount: `$${(patch.taxAmount ?? liveInvoice.taxAmount ?? 0).toFixed(2)}`,
                                  discount_applied: `$${(patch.discountAmount ?? 0).toFixed(2)}`,
                                  total_amount: `$${(patch.total ?? liveInvoice.total).toFixed(2)}`,
                                }));
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    }}
                  />
                </div>

                {/* RIGHT COLUMN: Real-Time Activity Feed */}
                <div className="lg:col-span-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                    <ActivityTab
                      activity={activities}
                      clientId={effectiveClientId}
                      clientName={liveInvoice.clientName}
                      clientEmail={liveInvoice.clientEmail}
                      clientPhone={liveInvoice.clientPhone}
                      onCloseParentDrawer={onClose}
                      emptyMessage="No activity logs yet for this invoice"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: DOCUMENTS (Templates, Invoice Document, Add Template)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "documents" && (
            <div className="p-6 space-y-6">
              {/* Highlight Card for this Invoice's Official PDF Document */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Official Invoice Document (#{liveInvoice.id})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ready for printing, direct download, or client dispatch. Total: ${liveInvoice.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenDocument && (
                    <button
                      type="button"
                      onClick={() => onOpenDocument(liveInvoice)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print / Download Invoice
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    {copiedLink ? "Link Copied" : "Copy Payment Link"}
                  </button>
                </div>
              </div>

              {/* Standard Documents & Templates Tab */}
              <DocumentsTab
                client={{
                  id: effectiveClientId,
                  name: liveInvoice.clientName || "Client",
                  email: liveInvoice.clientEmail || "",
                  phone: liveInvoice.clientPhone || "",
                }}
                processName={invoiceProcess.name}
              />
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3: PAYMENTS (Settled & Applied Payments Table + Metrics)
             ───────────────────────────────────────────────────────────── */}
          {activeTab === "payments" && (
            <div className="p-6 space-y-6">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-xs text-slate-500 font-medium">TOTAL AMOUNT</p>
                  <p className="text-xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    ${liveInvoice.total.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-xs text-emerald-600 font-medium">AMOUNT PAID</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    ${(liveInvoice.amountPaid || (liveInvoice.status === "paid" ? liveInvoice.total : 0)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-xs text-blue-600 font-medium">BALANCE DUE</p>
                  <p className="text-xl font-bold text-blue-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    ${Math.max(0, liveInvoice.total - (liveInvoice.amountPaid || (liveInvoice.status === "paid" ? liveInvoice.total : 0))).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                  <p className="text-xs text-purple-600 font-medium">CLIENT CREDIT</p>
                  <p className="text-xl font-bold text-purple-600 mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                    ${availableCredit.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Settled Payments Table Section */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Settled & Applied Payments
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Itemized transaction records and attached receipts for {liveInvoice.id}
                    </p>
                  </div>

                  {liveInvoice.status !== "paid" && (
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record Payment
                    </button>
                  )}
                </div>

                {settledPayments.length > 0 ? (
                  <div className="p-3">
                    <TableComponent<InvoicePaymentRecord>
                      data={settledPayments}
                      columns={[
                        {
                          id: "date",
                          header: "Date",
                          render: (row) => (
                            <span className="text-xs font-medium text-slate-700">
                              {row.date || "2026-10-10"}
                            </span>
                          ),
                        },
                        {
                          id: "method",
                          header: "Method & Type",
                          render: (row) => (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                {row.method || "Cash"}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">settled_pay</p>
                            </div>
                          ),
                        },
                        {
                          id: "receipt",
                          header: "Receipt / Ref",
                          render: (row) => (
                            <span className="text-xs font-mono text-slate-600">
                              {row.reference || `REC-${row.id.slice(-5)}`}
                            </span>
                          ),
                        },
                        {
                          id: "status",
                          header: "Status",
                          render: () => (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                            </span>
                          ),
                        },
                        {
                          id: "amount",
                          header: "Amount",
                          align: "right",
                          render: (row) => (
                            <span className="text-xs font-bold text-emerald-600 font-mono">
                              +${Number(row.amount || 0).toFixed(2)}
                            </span>
                          ),
                        },
                      ]}
                      getRowId={(row) => row.id}
                      emptyMessage="No payments recorded yet for this invoice."
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">No payments settled yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;Record Payment&quot; above to log cash, card, or credit transactions.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      Record First Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Sub-Modals ── */}
      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          clientId={liveInvoice.clientId}
          clientName={liveInvoice.clientName}
          preSelectedInvoiceId={liveInvoice.id}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}

      {/* Select Predefined Fields Modal */}
      {fieldManagerOpen && fieldManagerMode === "select" && (
        <SelectFieldsModal
          isOpen={fieldManagerOpen}
          onClose={() => setFieldManagerOpen(false)}
          onSelect={(selectedFieldIds) => {
            const orgFields = getFieldsForOrg(activeOrganization?.id || "default");
            const newlySelected = orgFields.filter((f) => selectedFieldIds.includes(f.id));

            setInvoiceSections((prev) =>
              prev.map((sec, idx) => {
                if (idx === 0) {
                  const existing = new Set(sec.fieldKeys);
                  newlySelected.forEach((f) => existing.add(f.key));
                  return { ...sec, fieldKeys: Array.from(existing) };
                }
                return sec;
              })
            );

            setFieldManagerOpen(false);
            toast.success("Fields added to invoice overview");
          }}
          alreadySelectedKeys={invoiceSections.flatMap((s) => s.fieldKeys)}
        />
      )}

      {/* Create Custom Field Modal */}
      {fieldManagerOpen && fieldManagerMode === "create" && (
        <CreateFieldModal
          isOpen={fieldManagerOpen}
          onClose={() => setFieldManagerOpen(false)}
          onCreated={(newField) => {
            setInvoiceSections((prev) =>
              prev.map((sec, idx) => {
                if (idx === 0) {
                  return { ...sec, fieldKeys: [...sec.fieldKeys, newField.key] };
                }
                return sec;
              })
            );
            setFieldManagerOpen(false);
            toast.success(`Custom field "${newField.label}" added to invoice overview`);
          }}
        />
      )}

      {/* Admin Section Drawer */}
      {sectionDrawerOpen && (
        <AdminSectionDrawer
          section={editingSection}
          initialModule="invoice"
          onClose={() => {
            setSectionDrawerOpen(false);
            setEditingSection(null);
          }}
          onSaved={(savedSection) => {
            if (editingSection) {
              updateCustomSection(savedSection);
              setInvoiceSections((prev) =>
                prev.map((s) => (s.id === savedSection.id ? { ...s, title: savedSection.title } : s))
              );
              toast.success("Section updated successfully");
            } else {
              addCustomSection(savedSection);
              setInvoiceSections((prev) => [
                ...prev,
                {
                  id: savedSection.id,
                  title: savedSection.title,
                  description: savedSection.description,
                  iconName: savedSection.iconName as any,
                  source: "custom",
                  module: "invoice",
                  fieldKeys: [],
                },
              ]);
              toast.success("New section added to invoice overview");
            }
            setSectionDrawerOpen(false);
            setEditingSection(null);
          }}
        />
      )}
    </div>
  );
}
