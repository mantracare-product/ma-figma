import React, { useState, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
import { ClientInvoice, InvoiceStatus } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { toast } from "sonner";
import {
  FileText,
  User,
  Bot,
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
  History,
  Upload,
  Plus,
  Printer,
  ChevronDown,
  FileCheck,
  Download,
  Wallet,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";
import InvoiceProgressBar from "./InvoiceProgressBar";
import RecordPaymentModal from "./RecordPaymentModal";
import {
  getActivityForClient,
  addActivityEntry,
  ACTIVITY_LOG_EVENT,
} from "../../../lib/activityLog";
import { ACTIVITY_ENGINE_EVENT } from "../../../lib/activityEngine";

interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  onOpenDocument?: (invoice: ClientInvoice) => void;
}

const DEFAULT_DOC_TEMPLATES = ["Receipt", "Invoice Copy", "Payment Confirmation"];

export default function InvoiceDetailDrawer({
  isOpen,
  onClose,
  invoice,
  onOpenDocument,
}: InvoiceDetailDrawerProps) {
  const { updateInvoiceStatus, sendInvoice, voidInvoice, getPaymentsByInvoice, getClientCredit } = useInvoices();
  const [activeTab, setActiveTab] = useState<"general" | "activity" | "documents" | "payments">("general");
  const [copied, setCopied] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const [isUploadReceiptOpen, setIsUploadReceiptOpen] = useState(false);
  const [uploadReceiptFileName, setUploadReceiptFileName] = useState("");

  // Live activity log state for documents & activity tab
  const [activityEntries, setActivityEntries] = useState<any[]>([]);

  useEffect(() => {
    if (invoice?.clientId) {
      const load = () => {
        const clientLogs = getActivityForClient(invoice.clientId);
        setActivityEntries(clientLogs);
      };
      load();

      const handleUpdate = () => load();
      window.addEventListener(ACTIVITY_ENGINE_EVENT, handleUpdate);
      window.addEventListener(ACTIVITY_LOG_EVENT, handleUpdate);

      return () => {
        window.removeEventListener(ACTIVITY_ENGINE_EVENT, handleUpdate);
        window.removeEventListener(ACTIVITY_LOG_EVENT, handleUpdate);
      };
    }
  }, [invoice?.clientId, invoice?.id]);

  if (!invoice) return null;

  const isAutomated = invoice.createdBy === "system";
  const availableCredit = getClientCredit(invoice.clientId);

  const handleCopyLink = () => {
    if (invoice.paymentLinkUrl) {
      navigator.clipboard.writeText(invoice.paymentLinkUrl);
      setCopied(true);
      toast.success("Payment link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = (channel: "whatsapp" | "sms" | "email") => {
    sendInvoice(invoice.id, channel);
    toast.success(`Invoice ${invoice.id} sent via ${channel.toUpperCase()}`);
    setShowSendOptions(false);
  };

  const handleVoid = () => {
    voidInvoice(invoice.id);
    toast.success(`Invoice ${invoice.id} voided`);
  };

  const handleGenerateDoc = (docType: string) => {
    addActivityEntry({
      clientId: invoice.clientId,
      processId: "billing",
      processName: "Billing & Invoicing",
      type: "document_generated",
      status: "success",
      refId: invoice.id,
      details: {
        primary: `Document generated (${docType})`,
        secondary: `Official ${docType} generated for Invoice ${invoice.id}`,
      },
    });
    toast.success(`Document generated: ${docType}`);
    setIsDocMenuOpen(false);
  };

  const handleUploadReceiptSubmit = () => {
    const fileName = uploadReceiptFileName.trim() || `Receipt_${invoice.id}_${Date.now()}.pdf`;
    addActivityEntry({
      clientId: invoice.clientId,
      processId: "billing",
      processName: "Billing & Invoicing",
      type: "receipt_uploaded",
      status: "success",
      refId: invoice.id,
      details: {
        primary: `Receipt uploaded: ${fileName}`,
        secondary: `Uploaded on ${new Date().toLocaleDateString()} · ${invoice.id}`,
      },
    });
    toast.success(`Receipt "${fileName}" uploaded successfully!`);
    setUploadReceiptFileName("");
    setIsUploadReceiptOpen(false);
  };

  const invoicePayments = getPaymentsByInvoice(invoice.id);

  // Filter activity entries for this invoice's documents
  const invoiceDocEntries = activityEntries.filter(
    (e) =>
      e.refId === invoice.id ||
      (e.details?.primary && (e.details.primary.includes("Document generated") || e.details.primary.includes("Receipt uploaded")))
  );

  const clientActivityLogs = activityEntries.filter(
    (e) =>
      !e.details?.primary?.includes("Document generated") &&
      !e.details?.primary?.includes("Receipt uploaded")
  );

  const activityCount = 1 + (invoice.sentAt ? 1 : 0) + invoicePayments.length + clientActivityLogs.length;

  return (
    <>
      <CustomSideDrawer
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="sm:max-w-[70vw] w-full max-w-[70vw]"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {invoice.id}
                  </span>
                  <InvoiceProgressBar
                    status={invoice.status}
                    onStatusChange={(newSt) => updateInvoiceStatus(invoice.id, newSt)}
                    interactive={true}
                    size="sm"
                  />
                  {availableCredit > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-600" /> Credit Available: ${availableCredit.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Created on {invoice.createdAt.split("T")[0]}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
              {isAutomated ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-blue-700 font-semibold">Automated Flow</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>{invoice.createdBy}</span>
                </>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex items-center gap-2.5 w-full">
            {onOpenDocument && (
              <button
                onClick={() => onOpenDocument(invoice)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" /> Printable View
              </button>
            )}

            <button
              onClick={() => setShowSendOptions(!showSendOptions)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" /> Send Invoice
            </button>

            {invoice.status !== "paid" && invoice.status !== "void" && (
              <button
                onClick={() => setIsRecordPaymentOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5" /> Record Payment
              </button>
            )}

            <div className="flex-1" />

            {invoice.status !== "void" && invoice.status !== "paid" && (
              <button
                onClick={handleVoid}
                className="px-3 py-2.5 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              >
                <Ban className="w-3.5 h-3.5" /> Void
              </button>
            )}
          </div>
        }
      >
        {/* Tab Bar: General | Activity | Documents | Payments */}
        <div className="border-b border-slate-200 mb-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeTab === "general"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === "activity"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Activity
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {activityCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === "documents"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Documents
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {invoiceDocEntries.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === "payments"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Payments
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                invoicePayments.length > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}>
                {invoicePayments.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Send Channel Picker Modal Popover */}
            {showSendOptions && (
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-blue-900">Select Delivery Channel</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSend("whatsapp")}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    onClick={() => handleSend("sms")}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4" /> SMS
                  </button>
                  <button
                    onClick={() => handleSend("email")}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                </div>
              </div>
            )}

            {/* Client & Appointment Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Client</span>
                <Link
                  to={`/clients/${invoice.clientId}`}
                  onClick={onClose}
                  className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" /> {invoice.clientName}
                </Link>
                {invoice.clientEmail && <p className="text-slate-500 mt-0.5">{invoice.clientEmail}</p>}
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-1 font-bold uppercase tracking-wider text-[10px]">
                  Linked Service & Payment
                </span>
                {invoice.appointmentId ? (
                  <Link
                    to={`/appointments?id=${invoice.appointmentId}`}
                    onClick={onClose}
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> {invoice.appointmentTitle || `Appointment #${invoice.appointmentId}`}
                  </Link>
                ) : (
                  <span className="text-slate-400 italic">Standalone Invoice</span>
                )}
                <p className="text-slate-600 mt-0.5 font-medium">Due Date: {invoice.dueDate}</p>
                {invoice.paymentMode && (
                  <p className="text-slate-700 font-semibold mt-1 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 inline-block text-[11px]">
                    Payment Mode: {invoice.paymentMode}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2 font-bold uppercase tracking-wider text-[10px]">
                Line Items ({invoice.lineItems.length})
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Description</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Price</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Totals */}
            <div className="flex justify-end">
              <div className="w-60 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-${invoice.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span>${invoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Total</span>
                  <span>${invoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 text-emerald-600 font-semibold">
                  <span>Amount Paid</span>
                  <span>${(invoice.amountPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs">
                  <span>Remaining Balance</span>
                  <span className={invoice.total - (invoice.amountPaid || 0) > 0 ? "text-rose-600" : "text-emerald-600"}>
                    ${Math.max(0, invoice.total - (invoice.amountPaid || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Copy Payment Link */}
            {invoice.paymentLinkUrl && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Shareable Payment Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={invoice.paymentLinkUrl}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Amount</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono mt-0.5 block">${invoice.total.toFixed(2)}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount Paid</span>
                <span className="text-lg font-extrabold text-emerald-600 font-mono mt-0.5 block">${(invoice.amountPaid || 0).toFixed(2)}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Balance Due</span>
                <span className={`text-lg font-extrabold font-mono mt-0.5 block ${invoice.total - (invoice.amountPaid || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ${Math.max(0, invoice.total - (invoice.amountPaid || 0)).toFixed(2)}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Client Credit</span>
                <span className="text-lg font-extrabold text-indigo-600 font-mono mt-0.5 block">${availableCredit.toFixed(2)}</span>
              </div>
            </div>

            {/* Payments Action Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Settled & Applied Payments</h4>
                <p className="text-[11px] text-slate-500">Itemized transaction records and attached payment receipts for {invoice.id}</p>
              </div>

              {invoice.status !== "paid" && invoice.status !== "void" && (
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> + Record Payment
                </button>
              )}
            </div>

            {/* Payments Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {invoicePayments.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">No Payments Recorded Yet</p>
                    <p className="text-[11px] text-slate-400">Click "+ Record Payment" above to collect payments or apply client credit.</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Method & Type</th>
                      <th className="py-3 px-4">Receipt / Ref</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {invoicePayments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{pmt.paymentDate}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold uppercase inline-block mb-0.5">
                            {pmt.method.replace("_", " ")}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{pmt.paymentType}</span>
                        </td>
                        <td className="py-3 px-4">
                          {pmt.receiptFileName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <Receipt className="w-3 h-3" /> {pmt.receiptFileName}
                            </span>
                          ) : pmt.receiptNumber ? (
                            <span className="text-slate-600 font-mono text-[11px]">{pmt.receiptNumber}</span>
                          ) : (
                            <span className="text-slate-400 italic">No receipt attached</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                          +${pmt.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Combined Activity & Lifecycle Timeline
              </h4>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                {/* Created Event */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Invoice Created</span>
                    <span className="text-[11px] text-slate-500">
                      Created on {invoice.createdAt.split("T")[0]} · By {isAutomated ? "Automated Flow" : invoice.createdBy}
                    </span>
                  </div>
                </div>

                {/* Sent Event */}
                {invoice.sentAt && (
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Invoice Sent via {invoice.sentVia?.toUpperCase()}</span>
                      <span className="text-[11px] text-slate-500">{invoice.sentAt}</span>
                    </div>
                  </div>
                )}

                {/* Viewed Event */}
                {(invoice.status === "viewed" || invoice.status === "paid") && (
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Invoice Viewed by Client</span>
                      <span className="text-[11px] text-slate-500">Client accessed payment portal</span>
                    </div>
                  </div>
                )}

                {/* Recorded Payments */}
                {invoicePayments.map((pmt) => (
                  <div key={pmt.id} className="flex items-start justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Payment Settled ({pmt.paymentType === "insurance" ? "Insurance" : pmt.paymentType === "write_off" ? "Write-off" : "Self-Pay"})
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {pmt.paymentDate} · Method: {pmt.method.replace("_", " ").toUpperCase()} {pmt.note ? `· ${pmt.note}` : ""}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                      +${pmt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}

                {/* Void Event */}
                {invoice.status === "void" && (
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      <Ban className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-rose-700 block">Invoice Voided</span>
                      <span className="text-[11px] text-slate-500">Invoice cancelled and marked void</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Generated Documents & Uploaded Receipts
                </h4>
                <p className="text-[11px] text-slate-400">
                  Read directly from real activity logs for {invoice.id}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Generate Document Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDocMenuOpen(!isDocMenuOpen)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Generate Document <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isDocMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDocMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 z-20 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          Select Template
                        </div>
                        {DEFAULT_DOC_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl}
                            type="button"
                            onClick={() => handleGenerateDoc(tmpl)}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 font-semibold text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                            <span>{tmpl}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsUploadReceiptOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> + Upload Receipt
                </button>
              </div>
            </div>

            {/* Documents Log Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {invoiceDocEntries.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Documents or Receipts Logged</p>
                  <p className="text-[11px] text-slate-400">
                    Use "Generate Document" or "+ Upload Receipt" above to attach documents to this invoice.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Document / File</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date Logged</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {invoiceDocEntries.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          {doc.type === "receipt_uploaded" ? (
                            <Upload className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <span>{doc.details?.primary || "Invoice Document"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              doc.type === "receipt_uploaded"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {doc.type === "receipt_uploaded" ? "Receipt" : "Generated Doc"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {doc.timestamp ? doc.timestamp.split("T")[0] : "Today"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenDocument && onOpenDocument(invoice)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> View / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </CustomSideDrawer>

      {/* Embedded Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          clientId={invoice.clientId}
          clientName={invoice.clientName}
          preSelectedInvoiceId={invoice.id}
        />
      )}

      {/* Upload Receipt Modal */}
      {isUploadReceiptOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" /> Upload Receipt
              </h3>
              <button
                onClick={() => setIsUploadReceiptOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Attach an official receipt or proof of payment for Invoice <strong>{invoice.id}</strong>.
            </p>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Receipt File Name / Title</label>
              <input
                type="text"
                placeholder="e.g. payment_receipt_08142026.pdf"
                value={uploadReceiptFileName}
                onChange={(e) => setUploadReceiptFileName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadReceiptOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadReceiptSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
