import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { ClientInvoice, Payment } from "../../types/invoiceTypes";
import { useInvoices } from "../../context/InvoiceContext";
import { getClientList } from "../../../lib/getClientList";
import { toast } from "sonner";
import {
  DollarSign,
  CreditCard,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Shield,
  FileSpreadsheet,
} from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  preSelectedInvoiceId?: string | null;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  preSelectedInvoiceId,
}: RecordPaymentModalProps) {
  const { invoices, payments, recordPayment, sendInvoice, getPaymentsByClient } = useInvoices();
  const clientsList = getClientList();

  const [selectedClientId, setSelectedClientId] = useState<string>(
    clientId || clientsList[0]?.id || "c-1"
  );

  const activeClient =
    clientsList.find((c) => c.id === selectedClientId) || {
      id: selectedClientId,
      name: clientName || "Client",
    };

  // Find all unpaid or partially paid invoices for this client
  const clientOutstandingInvoices = invoices.filter(
    (inv) =>
      inv.clientId === selectedClientId &&
      inv.status !== "paid" &&
      inv.status !== "void" &&
      (inv.total - (inv.amountPaid || 0)) > 0
  );

  // Selection & Amount tracking state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [enteredAmounts, setEnteredAmounts] = useState<Record<string, number>>({});

  // Payment Type (Step 2): self_pay | insurance | write_off
  const [paymentType, setPaymentType] = useState<"self_pay" | "insurance" | "write_off">("self_pay");

  // Mode: "add_payment" | "send_link"
  const [mode, setMode] = useState<"add_payment" | "send_link">("add_payment");

  // Method (under "add_payment"): card_on_file | cash | check | external_terminal
  const [method, setMethod] = useState<"card_on_file" | "cash" | "check" | "external_terminal">(
    "cash"
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");

  // History section toggle
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (clientId) {
        setSelectedClientId(clientId);
      }
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    if (isOpen) {
      if (preSelectedInvoiceId) {
        setSelectedInvoiceIds(new Set([preSelectedInvoiceId]));
      } else {
        setSelectedInvoiceIds(new Set(clientOutstandingInvoices.map((i) => i.id)));
      }

      const amounts: Record<string, number> = {};
      clientOutstandingInvoices.forEach((inv) => {
        const remaining = Math.max(0, inv.total - (inv.amountPaid || 0));
        amounts[inv.id] = parseFloat(remaining.toFixed(2));
      });
      setEnteredAmounts(amounts);
      setPaymentType("self_pay");
      setMode("add_payment");
      setMethod("cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setShowHistory(false);
    }
  }, [isOpen, selectedClientId, preSelectedInvoiceId]);

  if (!isOpen) return null;

  const clientPastPayments = getPaymentsByClient(selectedClientId);

  const toggleInvoiceSelect = (id: string) => {
    const next = new Set(selectedInvoiceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedInvoiceIds(next);
  };

  const handleAmountChange = (id: string, value: number) => {
    setEnteredAmounts((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  // Calculate total charge amount
  const totalToCharge = Array.from(selectedInvoiceIds).reduce((sum, invId) => {
    return sum + (enteredAmounts[invId] || 0);
  }, 0);

  const handleSave = () => {
    if (selectedInvoiceIds.size === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (mode === "send_link") {
      // REQUIREMENT 3: "Send payment link" must NOT create a Payment record or mark anything paid!
      // Calls sendInvoice for checked invoices and delivers link.
      selectedInvoiceIds.forEach((invId) => {
        sendInvoice(invId, "whatsapp");
      });
      toast.success(`Payment link sent via WhatsApp for ${selectedInvoiceIds.size} invoice(s)`);
      onClose();
      return;
    }

    // mode === "add_payment": Create Payment records
    if (totalToCharge <= 0) {
      toast.error("Please enter a payment amount greater than $0.00");
      return;
    }

    const paymentRecords: Omit<Payment, "id" | "createdAt">[] = [];
    selectedInvoiceIds.forEach((invId) => {
      const amt = enteredAmounts[invId] || 0;
      if (amt > 0) {
        paymentRecords.push({
          invoiceId: invId,
          clientId: selectedClientId,
          amount: parseFloat(amt.toFixed(2)),
          method,
          paymentType,
          paymentDate,
          note: note.trim() || undefined,
        });
      }
    });

    if (paymentRecords.length === 0) {
      toast.error("No invoice amounts were entered to charge.");
      return;
    }

    recordPayment(paymentRecords);
    toast.success(`$${totalToCharge.toFixed(2)} payment recorded for ${activeClient.name}!`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Add Payment
            </h3>
            <p className="text-xs text-slate-500">
              Collect bulk or single payments across outstanding client invoices
            </p>
          </div>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 transition-all">
          <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Client:</span>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {clientsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total to Charge:</span>
            <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: "Outfit, sans-serif" }}>
              ${totalToCharge.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-6 py-2.5 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                mode === "send_link"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {mode === "send_link" ? (
                <>
                  <Send className="w-4 h-4" /> Send Payment Link
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Save ${totalToCharge.toFixed(2)} Payment
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs text-slate-700 max-h-[75vh] overflow-y-auto pr-1">

        {/* STEP 1: Select Invoices & Confirm Amount */}
        <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 1 — Select Invoices & Enter Payment Amounts
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {selectedInvoiceIds.size} of {clientOutstandingInvoices.length} selected
            </span>
          </div>

          {clientOutstandingInvoices.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Outstanding Invoices</p>
              <p className="text-xs text-slate-400">This client has no pending balances to collect.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">Invoice</th>
                    <th className="py-2.5 px-3">Details / Title</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-right w-32">Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clientOutstandingInvoices.map((inv) => {
                    const isChecked = selectedInvoiceIds.has(inv.id);
                    const remainingBalance = Math.max(0, inv.total - (inv.amountPaid || 0));

                    return (
                      <tr key={inv.id} className={isChecked ? "bg-emerald-50/40" : "bg-white"}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleInvoiceSelect(inv.id)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">{inv.id}</td>
                        <td className="py-2.5 px-3 text-slate-800">
                          {inv.appointmentTitle || "Standalone Invoice"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          ${inv.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ${remainingBalance.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-block w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={remainingBalance}
                              step="0.01"
                              disabled={!isChecked}
                              value={enteredAmounts[inv.id] ?? remainingBalance}
                              onChange={(e) =>
                                handleAmountChange(inv.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-full pl-6 pr-2 py-1 text-right bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STEP 2: Payment Type Selection Cards */}
        <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-2">
            Step 2 — What is this payment for?
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              {
                id: "self_pay",
                title: "Self-Pay",
                desc: "Direct payment by client / out of pocket",
                icon: User,
                color: "blue",
              },
              {
                id: "insurance",
                title: "Insurance",
                desc: "Reimbursement from insurance carrier",
                icon: Shield,
                color: "emerald",
              },
              {
                id: "write_off",
                title: "Write-off",
                desc: "Contractual discount or bad debt write-off",
                icon: FileSpreadsheet,
                color: "purple",
              },
            ].map((card) => {
              const isSelected = paymentType === card.id;
              const Icon = card.icon;

              return (
                <div
                  key={card.id}
                  onClick={() => setPaymentType(card.id as any)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-emerald-500 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <span className="font-bold text-slate-900 block text-xs">{card.title}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{card.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 3: Payment Method Selection */}
        <div className="space-y-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 3 — Choose Payment Method
            </span>

            {/* Top Toggle: Add Payment vs Send Payment Link */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("add_payment")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mode === "add_payment" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Add Payment
              </button>
              <button
                type="button"
                onClick={() => setMode("send_link")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mode === "send_link" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Send Payment Link
              </button>
            </div>
          </div>

          {mode === "add_payment" ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "cash", label: "Cash" },
                  { id: "card_on_file", label: "Card on File" },
                  { id: "check", label: "Check" },
                  { id: "external_terminal", label: "External Terminal" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      method === m.id
                        ? "border-emerald-500 bg-emerald-50/40 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={method === m.id}
                      onChange={() => setMethod(m.id as any)}
                      className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>

              {/* Editable Payment Date for Cash/Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Note / Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="Check #, Auth code, etc."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1.5">
              <p className="font-bold text-xs">Send Payment Link Channel</p>
              <p className="text-[11px] text-blue-700">
                Selecting "Send payment link" will deliver a shareable payment link via WhatsApp without recording an immediate payment.
              </p>
            </div>
          )}
        </div>

        {/* STEP 4: Past Payments History (Expandable Section) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-800"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Past Payments ({clientPastPayments.length} settled)</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showHistory && (
            <div className="p-4 border-t border-slate-200 space-y-2">
              {clientPastPayments.length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">No settled payments recorded for this client yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {clientPastPayments.map((pmt) => (
                    <div key={pmt.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{pmt.invoiceId}</span>
                        <span className="text-[11px] text-slate-400">
                          {pmt.paymentDate} · {pmt.method.replace("_", " ").toUpperCase()} · {pmt.paymentType}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">
                        +${pmt.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
