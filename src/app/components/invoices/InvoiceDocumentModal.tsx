import React from "react";
import { Modal } from "../ui/Modal";
import { ClientInvoice, InvoiceStatus } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { toast } from "sonner";
import {
  Printer,
  Download,
  Send,
  Building2,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
} from "lucide-react";

interface InvoiceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClientInvoice | null;
}

export default function InvoiceDocumentModal({
  isOpen,
  onClose,
  invoice,
}: InvoiceDocumentModalProps) {
  const { sendInvoice } = useInvoices();

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            PAID
          </span>
        );
      case "sent":
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
            SENT
          </span>
        );
      case "viewed":
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300">
            VIEWED
          </span>
        );
      case "overdue":
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            OVERDUE
          </span>
        );
      case "void":
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-gray-200 text-gray-700 border border-gray-400">
            VOID
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            DRAFT
          </span>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Invoice Document View
            </h3>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            Client-Facing Official Printable Document
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Printer className="w-4 h-4" /> Print / Download PDF
            </button>
            <button
              onClick={() => {
                sendInvoice(invoice.id, "whatsapp");
                toast.success(`Invoice ${invoice.id} sent via WhatsApp`);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Send className="w-4 h-4" /> Send Invoice
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      {/* Printable Sheet Card */}
      <div className="bg-white p-8 border border-slate-200 rounded-2xl shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none max-h-[78vh] overflow-y-auto">
        {/* Business Letterhead & Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                M
              </div>
              <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                MantraAssist RCM
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium pt-1">Healthcare Billing & Revenue Services</p>
            <p className="text-xs text-slate-400">123 Health Tech Ave, Suite 400, New York, NY 10001</p>
            <p className="text-xs text-slate-400">Phone: +1 (800) 555-0199 · Email: billing@mantraassist.com</p>
          </div>

          <div className="text-right space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              INVOICE
            </h2>
            <div className="text-sm font-bold text-blue-600">{invoice.id}</div>
            <div>{getStatusBadge(invoice.status)}</div>
          </div>
        </div>

        {/* Bill To & Invoice Info Grid */}
        <div className="grid grid-cols-2 gap-8 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed To
            </span>
            <p className="text-sm font-bold text-slate-900">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-slate-600">{invoice.clientEmail}</p>}
            {invoice.clientPhone && <p className="text-slate-600">{invoice.clientPhone}</p>}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-semibold text-slate-800">{invoice.createdAt.split("T")[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Due Date:</span>
              <span className="font-semibold text-slate-800">{invoice.dueDate}</span>
            </div>
            {invoice.appointmentTitle && (
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Service:</span>
                <span className="font-semibold text-slate-800">{invoice.appointmentTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{item.description}</td>
                  <td className="py-3.5 px-4 text-center">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-bold">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Footer & Totals Summary */}
        <div className="flex justify-end pt-2">
          <div className="w-72 space-y-2 text-xs text-slate-700 bg-slate-50 p-4 border border-slate-200 rounded-xl">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount</span>
                <span>-${invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Sales Tax (8%)</span>
              <span>${invoice.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 text-base font-bold text-slate-900">
              <span>Total Amount Due</span>
              <span className="text-blue-600">${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Terms & Instructions Footer */}
        <div className="border-t border-slate-200 pt-6 text-[11px] text-slate-400 space-y-1 text-center">
          <p className="font-semibold text-slate-600">Payment Terms & Instructions</p>
          <p>Payment is due within 14 days of issue. Please include invoice number {invoice.id} with your transfer.</p>
          <p>Thank you for choosing MantraAssist RCM Healthcare Services.</p>
        </div>
      </div>
    </Modal>
  );
}
