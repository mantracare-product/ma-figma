import React, { useState } from "react";
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
} from "lucide-react";
import { Link } from "react-router";

interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
  onOpenDocument?: (invoice: ClientInvoice) => void;
}

import InvoiceProgressBar from "./InvoiceProgressBar";

export default function InvoiceDetailDrawer({
  isOpen,
  onClose,
  invoice,
  onOpenDocument,
}: InvoiceDetailDrawerProps) {
  const { updateInvoiceStatus, sendInvoice, simulatePayment, voidInvoice } = useInvoices();
  const [copied, setCopied] = useState(false);
  const [showSendOptions, setShowSendOptions] = useState(false);

  if (!invoice) return null;

  const isAutomated = invoice.createdBy === "system";

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

  const handleSimulatePayment = () => {
    simulatePayment(invoice.id);
    toast.success(`Payment simulated! Invoice ${invoice.id} marked as Paid.`);
  };

  const handleVoid = () => {
    voidInvoice(invoice.id);
    toast.success(`Invoice ${invoice.id} voided`);
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[560px]"
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
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Created on {invoice.createdAt.split("T")[0]}</p>
            </div>
          </div>

          {/* Gap 4: Created By Badge */}
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
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" /> View Document
            </button>
          )}

          {invoice.status !== "paid" && invoice.status !== "void" && (
            <>
              <button
                onClick={handleSimulatePayment}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <CreditCard className="w-3.5 h-3.5" /> Pay
              </button>
              <button
                onClick={() => setShowSendOptions(!showSendOptions)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </>
          )}

          {invoice.status !== "void" && (
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
            <span className="text-slate-400 font-medium block mb-1">Linked Appointment</span>
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
            <p className="text-slate-500 mt-0.5">Due: {invoice.dueDate}</p>
          </div>
        </div>

        {/* Visual Lifecycle Timeline */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Invoice Timeline</p>
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs">
            <div className="flex flex-col items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Created</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${invoice.sentAt ? "bg-emerald-500" : "bg-slate-200"}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${invoice.sentAt ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {invoice.sentAt ? "✓" : "2"}
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Sent {invoice.sentVia ? `(${invoice.sentVia})` : ""}</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${invoice.status === "viewed" || invoice.status === "paid" ? "bg-emerald-500" : "bg-slate-200"}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${invoice.status === "viewed" || invoice.status === "paid" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {invoice.status === "viewed" || invoice.status === "paid" ? "✓" : "3"}
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Viewed</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${invoice.status === "paid" ? "bg-emerald-500" : "bg-slate-200"}`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${invoice.status === "paid" ? "bg-emerald-100 text-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                {invoice.status === "paid" ? "✓" : "4"}
              </div>
              <span className="text-[10px] text-slate-600 font-medium">Paid</span>
            </div>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Line Items</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium">{item.description}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Footer */}
            <div className="bg-slate-50/70 p-4 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (8%)</span>
                <span>${invoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="text-blue-600">${invoice.total.toFixed(2)}</span>
              </div>
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
    </CustomSideDrawer>
  );
}
