import React, { useState, useEffect, useMemo } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList } from "../../../lib/getClientList";
import { MOCK_SERVICES } from "../../../lib/mockServicesData";
import { getStoredServices } from "../../../lib/servicesStore";
import { ClientInvoice, InvoiceLineItem, InvoiceStatus } from "../../types/invoiceTypes";
import { toast } from "sonner";
import { hasInvoiceAutomation } from "../../../lib/invoiceService";
import { Link } from "react-router";
import DraggableOverviewSections, { OverviewSection } from "../profile/DraggableOverviewSections";
import {
  Receipt,
  Send,
} from "lucide-react";

interface CreateInvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvoice?: ClientInvoice | null;
  prefillClientId?: string;
  prefillClientName?: string;
  prefillAppointmentId?: string | number;
  prefillAppointmentTitle?: string;
}

const DEFAULT_INVOICE_SECTIONS: OverviewSection[] = [
  {
    id: "sec-inv-details",
    title: "Client Detail",
    description: "Client contact coordinates and invoice terms",
    iconName: "user",
    source: "system",
    module: "invoice",
    fieldKeys: [
      "client_name",
      "client_email",
      "client_phone",
      "invoice_number",
      "issue_date",
      "due_date",
      "payment_mode",
    ],
  },
  {
    id: "sec-inv-items",
    title: "Product",
    description: "Itemized services, consultation rates, discounts, and totals",
    iconName: "table",
    source: "system",
    module: "invoice",
    fieldKeys: [
      "line_items_summary",
    ],
  },
];

const EXCLUDED_FIELD_KEYS = new Set([
  "total_amount",
  "amount_paid",
  "balance_due",
  "client_credit",
  "payment_url",
  "subtotal",
  "tax_amount",
  "discount_applied",
]);

const EXCLUDED_SECTION_IDS = new Set([
  "sec-inv-payment-link",
]);

function sanitizeInvoiceSections(sections: OverviewSection[]): OverviewSection[] {
  if (!Array.isArray(sections) || sections.length === 0) return DEFAULT_INVOICE_SECTIONS;

  const filtered = sections
    .filter((s) => !EXCLUDED_SECTION_IDS.has(s.id))
    .map((s) => {
      let title = s.title;
      if (s.id === "sec-inv-details" || title.toLowerCase().includes("invoice detail") || title.toLowerCase().includes("client detail")) {
        title = "Client Detail";
      } else if (s.id === "sec-inv-items" || title.toLowerCase().includes("product")) {
        title = "Product";
      }

      const filteredKeys = (s.fieldKeys || []).filter((k) => !EXCLUDED_FIELD_KEYS.has(k));

      if (title === "Client Detail" || s.id === "sec-inv-details") {
        const clientKeys = ["client_name", "client_email", "client_phone"];
        const remainingKeys = filteredKeys.filter((k) => !clientKeys.includes(k));
        return {
          ...s,
          title,
          fieldKeys: [...clientKeys, ...remainingKeys],
        };
      }

      return {
        ...s,
        title,
        fieldKeys: filteredKeys,
      };
    });

  return filtered.length > 0 ? filtered : DEFAULT_INVOICE_SECTIONS;
}

const STORAGE_SECTION_KEY = "mantra_inv_sections_layout";

export default function CreateInvoiceDrawer({
  isOpen,
  onClose,
  editingInvoice,
  prefillClientId,
  prefillClientName,
  prefillAppointmentId,
  prefillAppointmentTitle,
}: CreateInvoiceDrawerProps) {
  const {
    createInvoiceFromAppointment,
    updateInvoice,
  } = useInvoices();
  const clientsList = getClientList();

  // Selected Client
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    if (editingInvoice?.clientId) return editingInvoice.clientId;
    if (prefillClientId) {
      const match = clientsList.find((c) => c.id === prefillClientId || c.name === prefillClientName);
      if (match) return match.id;
    }
    return clientsList[0]?.id || "c-1";
  });

  const selectedClient = useMemo(() => {
    return clientsList.find((c) => c.id === selectedClientId) || clientsList[0];
  }, [clientsList, selectedClientId]);

  // Draggable Sections state: Strictly Client Detail & Product sections only
  const [invoiceSections, setInvoiceSections] = useState<OverviewSection[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SECTION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeInvoiceSections(parsed);
          if (sanitized.length > 0) return sanitized;
        }
      }
    } catch {}
    return DEFAULT_INVOICE_SECTIONS;
  });

  const handleSectionsChange = (newSections: OverviewSection[]) => {
    const sanitized = sanitizeInvoiceSections(newSections);
    setInvoiceSections(sanitized);
    try {
      localStorage.setItem(STORAGE_SECTION_KEY, JSON.stringify(sanitized));
    } catch {}
  };

  // Field Values state
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // Initialize or reset form state on drawer open / editing invoice change
  useEffect(() => {
    if (!isOpen) return;

    const allCatalogueServices = [...getStoredServices(), ...MOCK_SERVICES];
    const firstService = allCatalogueServices[0];

    const targetClientId = editingInvoice?.clientId || prefillClientId || clientsList[0]?.id || "c-1";
    setSelectedClientId(targetClientId);

    const client = clientsList.find((c) => c.id === targetClientId) || clientsList[0];

    const invoiceId = editingInvoice?.id || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = editingInvoice?.issueDate || (editingInvoice?.createdAt ? editingInvoice.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);
    const dueDate = editingInvoice?.dueDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().split("T")[0];
    })();
    const paymentMode = editingInvoice?.paymentMode || "Bank Transfer";

    let initialRows: any[] = [];
    if (editingInvoice?.lineItems && editingInvoice.lineItems.length > 0) {
      initialRows = editingInvoice.lineItems.map((li, idx) => ({
        id: li.id || `row_${idx + 1}`,
        product_name: li.description,
        quantity: li.quantity || 1,
        unit_price: li.unitPrice || 0,
        tax_rate: li.taxPercent ?? 5,
      }));
    } else {
      initialRows = [
        {
          id: "row_1",
          product_name: firstService?.name || "Initial Consultation",
          quantity: 1,
          unit_price: firstService?.price ?? 150,
          tax_rate: firstService?.tax ?? 5,
        },
      ];
    }

    // Calculate initial totals
    let calcSub = 0;
    let calcTax = 0;
    initialRows.forEach((r) => {
      const q = Number(r.quantity ?? 1) || 1;
      const p = Number(r.unit_price ?? 0) || 0;
      const t = Number(r.tax_rate ?? 0) || 0;
      calcSub += q * p;
      calcTax += q * p * (t / 100);
    });

    const disc = editingInvoice?.discountValue || editingInvoice?.discountAmount || 0;

    let storedCustom: Record<string, any> = {};
    if (editingInvoice) {
      try {
        const raw = localStorage.getItem(`mantra_inv_fields_${editingInvoice.id}`);
        if (raw) storedCustom = JSON.parse(raw);
      } catch {}
    }

    setFieldValues({
      client_name: client?.name || "",
      client_email: client?.email || "",
      client_phone: client?.phoneNumber || "",
      invoice_number: invoiceId,
      issue_date: issueDate,
      due_date: dueDate,
      payment_mode: paymentMode,
      line_items_summary: initialRows,
      subtotal: `$${calcSub.toFixed(2)}`,
      tax_amount: `$${calcTax.toFixed(2)}`,
      discount_applied: `$${disc.toFixed(2)}`,
      ...storedCustom,
    });
  }, [isOpen, editingInvoice, prefillClientId, prefillClientName]);

  // Recalculate totals helper
  const recalculateTotals = (
    rows: any[],
    discountRaw?: any
  ) => {
    let calcSub = 0;
    let calcTax = 0;
    rows.forEach((r) => {
      const q = Number(r.quantity ?? 1) || 1;
      const p = Number(r.unit_price ?? 0) || 0;
      const t = Number(r.tax_rate ?? 0) || 0;
      calcSub += q * p;
      calcTax += q * p * (t / 100);
    });

    const discStr = discountRaw !== undefined ? String(discountRaw) : String(fieldValues.discount_applied || "0");
    const disc = parseFloat(discStr.replace(/[^0-9.-]+/g, "")) || 0;
    const calcTotal = Math.max(0, calcSub - disc + calcTax);

    return {
      subtotal: calcSub,
      taxAmount: calcTax,
      discountAmount: disc,
      total: calcTotal,
    };
  };

  // Field value changes
  const handleFieldValueChange = (key: string, value: any) => {
    setFieldValues((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "client_name") {
        const valStr = String(value || "").trim().toLowerCase();
        const matched = clientsList.find(
          (c) => c.name.toLowerCase() === valStr || String(c.id) === String(value)
        );
        if (matched) {
          setSelectedClientId(matched.id);
          next.client_name = matched.name;
          next.client_email = matched.email || "";
          next.client_phone = matched.phoneNumber || "";
        }
      } else if (key === "line_items_summary" && Array.isArray(value)) {
        const { subtotal, taxAmount } = recalculateTotals(value, prev.discount_applied);
        next.subtotal = `$${subtotal.toFixed(2)}`;
        next.tax_amount = `$${taxAmount.toFixed(2)}`;
      }

      return next;
    });
  };

  // Save handler
  const handleSave = (finalStatus: InvoiceStatus = "draft") => {
    if (!editingInvoice && !hasInvoiceAutomation()) {
      toast.error("Cannot create invoice: Please build the automation first in Automation.");
      return;
    }
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    const rows: any[] = Array.isArray(fieldValues.line_items_summary) ? fieldValues.line_items_summary : [];
    if (rows.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    const lineItems: InvoiceLineItem[] = rows.map((r, idx) => ({
      id: r.id || `li-${Date.now()}-${idx}`,
      source: "service" as const,
      description: r.product_name || r.col_item_name || `Service Item ${idx + 1}`,
      quantity: Number(r.quantity || 1) || 1,
      unitPrice: Number(r.unit_price || r.col_unit_price || 0) || 0,
      taxPercent: Number(r.tax_rate ?? r.col_tax_rate ?? 5),
    }));

    const { subtotal, taxAmount, discountAmount, total } = recalculateTotals(rows, fieldValues.discount_applied);

    const dueDate = fieldValues.due_date || new Date().toISOString().split("T")[0];
    const paymentMode = fieldValues.payment_mode || "Bank Transfer";

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phoneNumber,
        status: finalStatus,
        lineItems,
        subtotal,
        discountType: "amount",
        discountValue: discountAmount,
        discountAmount,
        taxAmount,
        total,
        dueDate,
        paymentMode,
      });

      try {
        localStorage.setItem(`mantra_inv_fields_${editingInvoice.id}`, JSON.stringify(fieldValues));
      } catch {}

      toast.success(`Invoice ${editingInvoice.id} updated!`);
    } else {
      const created = createInvoiceFromAppointment(
        {
          id: prefillAppointmentId,
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          clientEmail: selectedClient.email,
          clientPhone: selectedClient.phoneNumber,
          title: prefillAppointmentTitle,
        },
        lineItems,
        {
          createdBy: "Admin User",
          discountType: "amount",
          discountValue: discountAmount,
          discountAmount,
          dueDate,
          paymentMode,
        }
      );

      if (finalStatus !== "draft") {
        updateInvoice(created.id, { status: finalStatus });
      }

      try {
        localStorage.setItem(`mantra_inv_fields_${created.id}`, JSON.stringify(fieldValues));
      } catch {}

      toast.success(`Invoice ${created.id} generated!`);
    }

    onClose();
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-4xl w-full max-w-4xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {editingInvoice ? `Edit Invoice ${editingInvoice.id}` : "Create Standalone Invoice"}
              </h3>
              <p className="text-xs text-slate-500">
                Enter invoice details, client coordinates, and itemized services
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end w-full">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={!editingInvoice && !hasInvoiceAutomation()}
              className={`px-4 py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold transition-all ${
                !editingInvoice && !hasInvoiceAutomation() ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-200 cursor-pointer"
              }`}
              title={!editingInvoice && !hasInvoiceAutomation() ? "Please build the automation first" : undefined}
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("sent")}
              disabled={!editingInvoice && !hasInvoiceAutomation()}
              className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                !editingInvoice && !hasInvoiceAutomation() ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
              title={!editingInvoice && !hasInvoiceAutomation() ? "Please build the automation first" : undefined}
            >
              <Send className="w-4 h-4" /> Save & Send Invoice
            </button>
          </div>
        </div>
      }
    >
      {!editingInvoice && !hasInvoiceAutomation() && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-medium text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Invoice creation is locked — please build the automation first in the Automation page.
          </span>
          <Link to="/automation" className="text-blue-600 hover:underline font-semibold text-xs ml-2">
            Build automation &rarr;
          </Link>
        </div>
      )}

      <div className="space-y-5">
        {/* ── Only 2 Sections: Client Detail and Product ── */}
        <DraggableOverviewSections
          mode="invoice"
          customFieldsModule="invoice"
          sections={invoiceSections}
          onSectionsChange={handleSectionsChange}
          fieldValues={fieldValues}
          onFieldValueChange={handleFieldValueChange}
          client={{
            id: selectedClient?.id,
            name: selectedClient?.name,
            phone: selectedClient?.phoneNumber,
            email: selectedClient?.email,
          }}
        />
      </div>
    </CustomSideDrawer>
  );
}
