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
import { getStoredAdvanceListById } from "../../../lib/advanceListStore";

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

    let initialTableRows: any[] = [];
    if (Array.isArray(storedCustom.line_items_summary) && storedCustom.line_items_summary.length > 0) {
      initialTableRows = storedCustom.line_items_summary.map((item: any, idx: number) => {
        const pName = item.product_name || item.col_item_name || item.name || item.description || item.primaryValue || "Line Item";
        const qty = item.quantity !== undefined ? Number(item.quantity) : (item.col_quantity !== undefined ? Number(item.col_quantity) : 1);
        const price = item.unit_price !== undefined ? Number(item.unit_price) : (item.col_unit_price !== undefined ? Number(item.col_unit_price) : (item.unitPrice !== undefined ? Number(item.unitPrice) : (item.overrides?.col_unit_price ?? 0)));
        const tax = item.tax_rate !== undefined ? Number(item.tax_rate) : (item.col_tax_rate !== undefined ? Number(item.col_tax_rate) : (item.taxPercent !== undefined ? Number(item.taxPercent) : (item.overrides?.col_tax_rate ?? 5)));
        return {
          id: item.id || `row_${idx + 1}`,
          product_name: pName,
          quantity: qty,
          unit_price: price,
          tax_rate: tax,
          col_item_name: pName,
          col_quantity: qty,
          col_unit_price: price,
          col_tax_rate: tax,
        };
      });
    } else if (liveInvoice.lineItems && liveInvoice.lineItems.length > 0) {
      initialTableRows = liveInvoice.lineItems.map((li, idx) => ({
        id: li.id || `row_${idx + 1}`,
        product_name: li.description,
        quantity: li.quantity || 1,
        unit_price: li.unitPrice || 0,
        tax_rate: li.taxPercent ?? 5,
        col_item_name: li.description,
        col_quantity: li.quantity || 1,
        col_unit_price: li.unitPrice || 0,
        col_tax_rate: li.taxPercent ?? 5,
      }));
    } else {
      initialTableRows = [
        {
          id: "row_1",
          product_name: "Initial Comprehensive Consultation",
          quantity: 1,
          unit_price: 150,
          tax_rate: 5,
          col_item_name: "Initial Comprehensive Consultation",
          col_quantity: 1,
          col_unit_price: 150,
          col_tax_rate: 5,
        },
      ];
    }

    const sanitizedStored = { ...storedCustom, line_items_summary: initialTableRows };

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
      line_items_summary: initialTableRows,
      subtotal: `$${(liveInvoice.subtotal || liveInvoice.total * 0.95).toFixed(2)}`,
      tax_amount: `$${(liveInvoice.tax || liveInvoice.total * 0.05).toFixed(2)}`,
      discount_applied: liveInvoice.discount ? `$${liveInvoice.discount.toFixed(2)}` : "$0.00",
      payment_url: `https://pay.mantra-assist.mock/${liveInvoice.id}`,
      ...sanitizedStored,
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

      if (key === "line_items_summary" && Array.isArray(value)) {
        let calcSubtotal = 0;
        let calcTax = 0;
        const newLineItems: InvoiceLineItem[] = value.map((item: any, idx: number) => {
          const desc = item.product_name || item.col_item_name || item.name || item.description || item.primaryValue || `Item ${idx + 1}`;
          const qty = Number(item.quantity ?? item.col_quantity ?? 1) || 1;
          const price = Number(item.unit_price ?? item.col_unit_price ?? item.unitPrice ?? item.price ?? item.overrides?.col_unit_price ?? 0);
          const taxRate = Number(item.tax_rate ?? item.col_tax_rate ?? item.taxRate ?? item.taxPercent ?? item.overrides?.col_tax_rate ?? 5);
          const rowSubtotal = price * qty;
          calcSubtotal += rowSubtotal;
          calcTax += rowSubtotal * (taxRate / 100);
          return {
            id: item.id || `li-${Date.now()}-${idx}`,
            source: "service" as const,
            description: desc,
            quantity: qty,
            unitPrice: price,
            taxPercent: taxRate,
          };
        });
        const calcTotal = Math.round((calcSubtotal + calcTax) * 100) / 100;
        patch.lineItems = newLineItems;
        patch.subtotal = calcSubtotal;
        patch.taxAmount = calcTax;
        patch.total = calcTotal;

        setFieldValues((prev) => ({
          ...prev,
          subtotal: `$${calcSubtotal.toFixed(2)}`,
          tax_amount: `$${calcTax.toFixed(2)}`,
          total_amount: `$${calcTotal.toFixed(2)}`,
          balance_due: `$${Math.max(0, calcTotal - (liveInvoice.amountPaid || 0)).toFixed(2)}`,
        }));
      }

      if (key === "subtotal") {
        const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, "")) || 0;
        patch.subtotal = parsed;
        patch.total = parsed + (liveInvoice.taxAmount || 0) - (liveInvoice.discountAmount || 0);
      }
      if (key === "tax_amount") {
        const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, "")) || 0;
        patch.taxAmount = parsed;
        patch.total = (liveInvoice.subtotal || 0) + parsed - (liveInvoice.discountAmount || 0);
      }
      if (key === "discount_applied") {
        const parsed = parseFloat(String(value).replace(/[^0-9.-]+/g, "")) || 0;
        patch.discountAmount = parsed;
        patch.total = Math.max(0, (liveInvoice.subtotal || 0) + (liveInvoice.taxAmount || 0) - parsed);
      }

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
              {/* Invoice-scoped Documents & Templates Tab */}
              <DocumentsTab
                client={{
                  id: effectiveClientId,
                  name: liveInvoice.clientName || "Client",
                  email: liveInvoice.clientEmail || "",
                  phone: liveInvoice.clientPhone || "",
                }}
                processName="Invoice"
                title="Invoice Documents"
                entityType="invoice"
                entityId={liveInvoice.id}
                invoiceData={liveInvoice}
                hideClientDefaultDocs={true}
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
          initiallySelected={invoiceSections.flatMap((s) => s.fieldKeys)}
          onlyModules={["invoice"]}
          isAdmin={false}
          onClose={() => setFieldManagerOpen(false)}
          onOpenCreateModal={() => setFieldManagerMode("create")}
          onApply={(selectedKeys) => {
            setInvoiceSections((prev) =>
              prev.map((sec, idx) => {
                if (idx === 0) {
                  const existing = new Set(sec.fieldKeys);
                  selectedKeys.forEach((k) => existing.add(k));
                  return { ...sec, fieldKeys: Array.from(existing) };
                }
                return sec;
              })
            );
            setFieldManagerOpen(false);
            toast.success("Fields added to invoice overview");
          }}
        />
      )}

      {/* Create Custom Field Modal */}
      {fieldManagerOpen && fieldManagerMode === "create" && (
        <CreateFieldModal
          lockModule="invoice"
          isAdmin={false}
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
