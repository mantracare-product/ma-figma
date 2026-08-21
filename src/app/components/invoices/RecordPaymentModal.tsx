import React, { useState, useEffect } from "react";
import { CustomSideDrawer } from "../ui/drawer";
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
  Upload,
  CheckCircle,
  Ban,
  Wallet,
  Sparkles,
  ArrowRight,
  Receipt,
  X,
  FileCheck,
} from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  preSelectedInvoiceId?: string | null;
}

const WRITE_OFF_REASONS = [
  { value: "bad_debt", label: "Bad Debt / Uncollectible" },
  { value: "admin_adj", label: "Administrative Adjustment" },
  { value: "hardship", label: "Financial Hardship" },
  { value: "timely_filing", label: "Timely Filing Limit Exceeded" },
  { value: "charity", label: "Charity Care" },
];

export default function RecordPaymentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  preSelectedInvoiceId,
}: RecordPaymentModalProps) {
  const { invoices, recordPayment, sendInvoice, getPaymentsByClient, getClientCredit, addClientCredit } = useInvoices();
  const clientsList = getClientList();
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clientId || clientsList[0]?.id || "c-1"
  );

  const availableClients = [...clientsList];
  if (selectedClientId && !availableClients.some((c) => c.id === selectedClientId)) {
    availableClients.unshift({
      id: selectedClientId,
      name: clientName || "Client",
    });
  }

  const activeClient =
    availableClients.find((c) => c.id === selectedClientId) || {
      id: selectedClientId,
      name: clientName || "Client",
    };

  // Find all unpaid or partially paid invoices for this client
  const clientOutstandingInvoices = invoices.filter(
    (inv) =>
      inv.clientId === selectedClientId &&
      inv.status !== "paid" &&
      inv.status !== "void" &&
      inv.total - (inv.amountPaid || 0) > 0
  );

  const availableCredit = getClientCredit(selectedClientId);

  // Unlinked / Deposit mode state
  const [isUnlinkedMode, setIsUnlinkedMode] = useState<boolean>(false);
  const [unlinkedAmount, setUnlinkedAmount] = useState<string>("100.00");

  // Selection & Amount tracking state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [enteredAmounts, setEnteredAmounts] = useState<Record<string, number>>({});
  const [applyCredit, setApplyCredit] = useState<boolean>(true);

  // Payment Type (Step 2): self_pay | insurance | write_off
  const [paymentType, setPaymentType] = useState<"self_pay" | "insurance" | "write_off">("self_pay");

  // Mode: "add_payment" | "send_link"
  const [mode, setMode] = useState<"add_payment" | "send_link">("add_payment");

  // Method (under "add_payment"): card_on_file | cash | check | external_terminal | bank_transfer
  const [method, setMethod] = useState<"card_on_file" | "cash" | "check" | "external_terminal" | "bank_transfer">(
    "cash"
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = useState<string>("");

  // Method-specific input fields
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [terminalAuthCode, setTerminalAuthCode] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");

  // Insurance details state
  const [insurancePayer, setInsurancePayer] = useState<string>("Blue Cross Blue Shield");
  const [claimRefNumber, setClaimRefNumber] = useState<string>("");

  // Write-off details state
  const [writeOffReason, setWriteOffReason] = useState<string>("bad_debt");
  const [writeOffNote, setWriteOffNote] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);

  // Past payments & Activity section toggle
  const [showHistory, setShowHistory] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (clientId) {
        setSelectedClientId(clientId);
      }
    }
  }, [isOpen, clientId]);

  useEffect(() => {
    if (isOpen) {
      const hasOpenBills = clientOutstandingInvoices.length > 0;
      setIsUnlinkedMode(!hasOpenBills);

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
      setApplyCredit(true);
      setPaymentType("self_pay");
      setMode("add_payment");
      setMethod("cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setCheckNumber("");
      setTerminalAuthCode("");
      setReceiptNumber(`REC-${Date.now().toString().slice(-5)}`);
      setReceiptFileName("");
      setInsurancePayer("Blue Cross Blue Shield");
      setClaimRefNumber("");
      setWriteOffReason("bad_debt");
      setWriteOffNote("");
      setFileNames([]);
      setShowHistory(false);
      setUnlinkedAmount("100.00");
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

  // Calculations for selected open invoices
  const subtotal = isUnlinkedMode
    ? (parseFloat(unlinkedAmount) || 0)
    : Array.from(selectedInvoiceIds).reduce((sum, invId) => sum + (enteredAmounts[invId] || 0), 0);

  const appliedCredit =
    !isUnlinkedMode && applyCredit && availableCredit > 0 && selectedInvoiceIds.size > 0
      ? Math.min(availableCredit, subtotal)
      : 0;

  const amountToPay = Math.max(0, subtotal - appliedCredit);

  // Check if any row payment is entered higher than remaining balance (overpayment)
  const totalRemainingDue = Array.from(selectedInvoiceIds).reduce((sum, invId) => {
    const inv = invoices.find((i) => i.id === invId);
    return sum + (inv ? Math.max(0, inv.total - (inv.amountPaid || 0)) : 0);
  }, 0);

  const excessOverpayment = !isUnlinkedMode && subtotal > totalRemainingDue
    ? parseFloat((subtotal - totalRemainingDue).toFixed(2))
    : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setReceiptFileName(files[0].name);
      setFileNames(Array.from(files).map((f) => f.name));
      toast.success(`Receipt attached: ${files[0].name}`);
    }
  };

  const handleSave = () => {
    if (!isUnlinkedMode && selectedInvoiceIds.size === 0) {
      toast.error("Please select at least one invoice or switch to Unlinked Advance Payment.");
      return;
    }

    if (mode === "send_link" && !isUnlinkedMode) {
      selectedInvoiceIds.forEach((invId) => {
        sendInvoice(invId, "whatsapp");
      });
      toast.success(`Payment link sent via WhatsApp for ${selectedInvoiceIds.size} invoice(s)`);
      onClose();
      return;
    }

    if (isUnlinkedMode) {
      const amt = parseFloat(unlinkedAmount) || 0;
      if (amt <= 0) {
        toast.error("Please enter an advance payment amount greater than $0.00");
        return;
      }

      recordPayment([
        {
          invoiceId: "UNLINKED",
          isUnlinked: true,
          clientId: selectedClientId,
          amount: amt,
          method,
          paymentType: "self_pay",
          paymentDate,
          receiptNumber: receiptNumber.trim() || undefined,
          receiptFileName: receiptFileName || undefined,
          note: note.trim() || `Unlinked deposit on client account balance`,
        },
      ]);

      toast.success(`Deposit of $${amt.toFixed(2)} recorded & credited to ${activeClient.name}'s balance!`);
      onClose();
      return;
    }

    if (amountToPay <= 0 && appliedCredit <= 0 && paymentType !== "write_off") {
      toast.error("Please enter a payment amount greater than $0.00");
      return;
    }

    const paymentRecords: Omit<Payment, "id" | "createdAt">[] = [];
    selectedInvoiceIds.forEach((invId) => {
      const amt = enteredAmounts[invId] || 0;
      if (amt > 0 || paymentType === "write_off") {
        let fullNote = note.trim();
        if (paymentType === "insurance") {
          fullNote = `Insurance (${insurancePayer}${claimRefNumber ? `, Ref: ${claimRefNumber}` : ""}) ${note}`.trim();
        } else if (paymentType === "write_off") {
          const reasonObj = WRITE_OFF_REASONS.find((r) => r.value === writeOffReason);
          fullNote = `Write-off [${reasonObj?.label || writeOffReason}]: ${writeOffNote || note}`.trim();
        } else if (method === "check" && checkNumber) {
          fullNote = `Check #${checkNumber} ${note}`.trim();
        } else if (method === "external_terminal" && terminalAuthCode) {
          fullNote = `Terminal Auth #${terminalAuthCode} ${note}`.trim();
        }

        paymentRecords.push({
          invoiceId: invId,
          clientId: selectedClientId,
          amount: parseFloat(amt.toFixed(2)),
          appliedCreditAmount: appliedCredit > 0 ? appliedCredit : undefined,
          method: paymentType === "insurance" ? "external_terminal" : paymentType === "write_off" ? "cash" : method,
          paymentType,
          paymentDate,
          receiptNumber: receiptNumber.trim() || undefined,
          receiptFileName: receiptFileName || undefined,
          insurancePayer: paymentType === "insurance" ? insurancePayer : undefined,
          claimRefNumber: paymentType === "insurance" ? claimRefNumber : undefined,
          writeOffReason: paymentType === "write_off" ? writeOffReason : undefined,
          note: fullNote || undefined,
        });
      }
    });

    if (paymentRecords.length === 0 && appliedCredit <= 0) {
      toast.error("No invoice amounts were entered to process.");
      return;
    }

    recordPayment(paymentRecords);

    if (paymentType === "write_off") {
      toast.success(`$${subtotal.toFixed(2)} write-off recorded for ${activeClient.name}`);
    } else if (paymentType === "insurance") {
      toast.success(`$${subtotal.toFixed(2)} insurance payment recorded from ${insurancePayer}!`);
    } else {
      const msg = excessOverpayment > 0
        ? `Payment of $${subtotal.toFixed(2)} recorded ($${totalRemainingDue.toFixed(2)} settled, +$${excessOverpayment.toFixed(2)} credited to account)!`
        : `Payment of $${subtotal.toFixed(2)} recorded for ${activeClient.name}!`;
      toast.success(msg);
    }
    onClose();
  };

  return (
    <CustomSideDrawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm:max-w-[70vw] w-full max-w-[70vw]"
      title={
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Record Payment
                </h3>
                {availableCredit > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-600" />
                    Credit Available: ${availableCredit.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Collect bulk/single payments, manage unlinked deposits, and apply client account credits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 transition-all">
            <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Client:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total to Collect:</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-emerald-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                ${amountToPay.toFixed(2)}
              </span>
              {appliedCredit > 0 && (
                <span className="text-xs font-semibold text-slate-400">
                  (${subtotal.toFixed(2)} - ${appliedCredit.toFixed(2)} credit)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-6 py-2.5 text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                paymentType === "write_off"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : mode === "send_link"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : isUnlinkedMode
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {paymentType === "write_off" ? (
                <>
                  <Ban className="w-4 h-4" /> Save ${subtotal.toFixed(2)} Write-off
                </>
              ) : paymentType === "insurance" ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Save ${subtotal.toFixed(2)} Insurance Payment
                </>
              ) : mode === "send_link" && !isUnlinkedMode ? (
                <>
                  <Send className="w-4 h-4" /> Send Payment Link
                </>
              ) : isUnlinkedMode ? (
                <>
                  <Wallet className="w-4 h-4" /> Deposit ${subtotal.toFixed(2)} to Credit
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" /> Save ${amountToPay.toFixed(2)} Payment
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Unlinked / Open Invoices Mode Switcher */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
              1
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                {isUnlinkedMode ? "Unlinked Advance / On-Account Deposit" : "Invoice Allocation & Outstanding Balances"}
              </span>
              <p className="text-[11px] text-slate-500">
                {isUnlinkedMode
                  ? "Directly record an upfront credit for this client without linking to a specific bill"
                  : `Select open invoices to settle and specify individual payment allocations`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsUnlinkedMode(!isUnlinkedMode)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-600" />
            <span>{isUnlinkedMode ? "Switch to Open Invoices" : "+ Unlinked / Advance Deposit"}</span>
          </button>
        </div>

        {/* STEP 1: Content depending on Unlinked Mode */}
        {isUnlinkedMode ? (
          <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-indigo-950">Record Unlinked / Advance Payment</h4>
                <p className="text-[11px] text-indigo-800/80 mt-0.5">
                  This payment will be credited to <strong className="text-indigo-950">{activeClient.name}</strong>'s account balance. It can be automatically applied to future invoices anytime.
                </p>
              </div>
            </div>

            <div className="bg-white border border-indigo-100 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800">
                  Advance Deposit Amount ($) *
                </label>
                <div className="relative inline-block w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={unlinkedAmount}
                    onChange={(e) => setUnlinkedAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-right bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Select Invoices & Enter Payment Amounts
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {selectedInvoiceIds.size} of {clientOutstandingInvoices.length} selected
              </span>
            </div>

            {clientOutstandingInvoices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-slate-800">No Open Invoices Found for {activeClient.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    This client has no pending balances. You can record an unlinked advance payment to credit their account balance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUnlinkedMode(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Wallet className="w-3.5 h-3.5" /> + Enter Unlinked Advance Deposit
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            clientOutstandingInvoices.length > 0 &&
                            selectedInvoiceIds.size === clientOutstandingInvoices.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoiceIds(new Set(clientOutstandingInvoices.map((i) => i.id)));
                            } else {
                              setSelectedInvoiceIds(new Set());
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
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

                {/* Subtotal, Credit Application & Overpayment Notice */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-semibold text-slate-700">
                    <span>Subtotal Selected</span>
                    <span className="font-bold font-mono text-slate-900">${subtotal.toFixed(2)}</span>
                  </div>

                  {availableCredit > 0 && selectedInvoiceIds.size > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={applyCredit}
                          onChange={(e) => setApplyCredit(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-emerald-400 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Apply available client credit (${availableCredit.toFixed(2)})</span>
                      </label>
                      <span className="font-mono font-bold text-emerald-800">
                        -${appliedCredit.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {excessOverpayment > 0 && (
                    <div className="p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg flex items-center justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Excess overpayment will be automatically credited to client's account balance
                      </span>
                      <span className="font-bold font-mono">+{excessOverpayment.toFixed(2)} Credit</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Payment Type Selection (Self-Pay / Insurance / Write-off) */}
        {!isUnlinkedMode && (
          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-2">
              Step 2 — Payment Type
            </span>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700 min-w-28">
                Payment Type:
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="self_pay">Self-Pay (Direct client out-of-pocket payment)</option>
                <option value="insurance">Insurance (Carrier EOB / ERA reimbursement)</option>
                <option value="write_off">Write-off (Contractual discount or bad debt adjustment)</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Method & Details */}
        {paymentType === "self_pay" && (
          <div className="space-y-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Step 3 — Choose Payment Method & Attach Receipt
              </span>

              {!isUnlinkedMode && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMode("add_payment")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      mode === "add_payment"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Add Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("send_link")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      mode === "send_link"
                        ? "bg-white text-blue-600 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Send Payment Link
                  </button>
                </div>
              )}
            </div>

            {mode === "add_payment" || isUnlinkedMode ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "card_on_file", label: "Card on File" },
                    { id: "check", label: "Check" },
                    { id: "bank_transfer", label: "Bank Transfer" },
                    { id: "external_terminal", label: "Terminal / POS" },
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
                      <span className="truncate">{m.label}</span>
                    </label>
                  ))}
                </div>

                {/* Card Brand Badges for Card on File */}
                {method === "card_on_file" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Supported Card Brands</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                        VISA
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                        MC
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                        AMEX
                      </span>
                    </div>
                  </div>
                )}

                {/* Method Specific Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
                      Receipt # / Transaction Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. REC-89421"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {method === "check" ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Check Number *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10492"
                        value={checkNumber}
                        onChange={(e) => setCheckNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ) : method === "external_terminal" ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Terminal Auth Code *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AUTH-99482"
                        value={terminalAuthCode}
                        onChange={(e) => setTerminalAuthCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Note (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Frontdesk settlement"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Receipt Document Upload Box */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Attach Receipt / Proof Document (Optional)
                  </label>
                  <label className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer transition-colors text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium truncate">
                        {receiptFileName ? receiptFileName : "Click or drag to upload receipt PDF / image..."}
                      </span>
                    </div>
                    {receiptFileName ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setReceiptFileName("");
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-500">
                        Browse
                      </span>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1.5">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-blue-600" /> Deliver Payment Link
                </p>
                <p className="text-[11px] text-blue-700">
                  Selecting "Send payment link" will deliver a secure payment link via WhatsApp and SMS to {activeClient.name} without charging immediately.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Insurance Reimbursement Details */}
        {paymentType === "insurance" && (
          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-2">
              Step 3 — Insurance Remittance Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Insurance Payer / Carrier *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue Cross Blue Shield"
                  value={insurancePayer}
                  onChange={(e) => setInsurancePayer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Claim / EFT Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. EFT-884920"
                  value={claimRefNumber}
                  onChange={(e) => setClaimRefNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Remittance Date *
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
                  Remittance / EOB Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional ERA notes"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Attach EOB / Remittance Document (Optional)
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer text-xs text-slate-600">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="truncate">{receiptFileName ? receiptFileName : "Upload EOB document..."}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Write-Off Details */}
        {paymentType === "write_off" && (
          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-2">
              Step 3 — Write-Off Adjustment Details
            </span>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Reason Code *
                </label>
                <select
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {WRITE_OFF_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Note / Justification
                </label>
                <textarea
                  rows={2}
                  value={writeOffNote}
                  onChange={(e) => setWriteOffNote(e.target.value)}
                  placeholder="Reason for write-off or balance adjustment..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Attach Supporting Document (optional)
                </label>
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl cursor-pointer text-xs text-slate-600 transition-colors">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{receiptFileName ? receiptFileName : "Upload document..."}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Past Payments & Account Activity (Expandable Section) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-800"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Past Payments & Activity ({clientPastPayments.length} settled records)</span>
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
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {pmt.invoiceId === "UNLINKED" ? "Account Deposit (Unlinked)" : pmt.invoiceId}
                          </span>
                          {pmt.receiptFileName && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                              <Receipt className="w-2.5 h-2.5" /> Receipt attached
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {pmt.paymentDate} · {pmt.method.replace("_", " ").toUpperCase()} · {pmt.paymentType} {pmt.note ? `· ${pmt.note}` : ""}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm font-mono">
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
    </CustomSideDrawer>
  );
}
