import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  QrCode,
  CheckCircle2,
  Receipt,
  ShieldCheck,
  CreditCard,
  Building2,
  ExternalLink,
  Sparkles,
  Loader2,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { PatientInvoiceSummary } from '../types/reception';

export interface InvoiceQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PatientInvoiceSummary | null;
  patientName?: string;
  onPaymentConfirmed: (invoiceId: string, amount: number) => Promise<void>;
}

export default function InvoiceQrPaymentModal({
  isOpen,
  onClose,
  invoice,
  patientName,
  onPaymentConfirmed,
}: InvoiceQrPaymentModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  const amountToPay = invoice ? (invoice.balanceDue ?? invoice.amount) : 0;
  const invoiceId = invoice?.invoiceNumber || invoice?.id || 'INV-001';
  const clientDisplayName = patientName || invoice?.clientName || 'Patient';

  // Construct UPI / Digital Payment payload
  const upiPayload = `upi://pay?pa=billing@mantracare.com&pn=MantraCare+Health&am=${amountToPay.toFixed(
    2
  )}&cu=USD&tr=${invoiceId}&tn=Invoice+Settlement+${invoiceId}`;

  useEffect(() => {
    if (!isOpen || !invoice) {
      setIsPaid(false);
      setIsProcessing(false);
      return;
    }

    setIsPaid(invoice.status === 'paid' || amountToPay === 0);

    // Generate real QR code image
    QRCode.toDataURL(
      upiPayload,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        } else {
          console.error('[InvoiceQrPaymentModal] Error generating QR code:', err);
        }
      }
    );
  }, [isOpen, invoice, amountToPay, upiPayload]);

  if (!isOpen || !invoice) return null;

  const handleSimulatePayment = async () => {
    if (isProcessing || isPaid) return;
    setIsProcessing(true);

    try {
      await onPaymentConfirmed(invoice.id, amountToPay);
      setIsPaid(true);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#6366f1', '#f59e0b'],
      });

      toast.success(`Payment of $${amountToPay.toFixed(2)} recorded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(upiPayload);
    setCopied(true);
    toast.success('Payment URI copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 backdrop-blur-2xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md sm:max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-300 border border-white/15">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight font-display">
                Instant QR Checkout
              </h3>
              <p className="text-xs text-blue-200/80 font-medium">
                MantraCare Touchless Reception Kiosk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {isPaid ? (
            <div className="py-8 space-y-4 flex flex-col items-center animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 font-display">
                  Payment Succeeded!
                </h4>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  Invoice <span className="font-mono font-semibold text-slate-800">{invoiceId}</span> has been paid in full and synced with MantraAssist.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 w-full text-left space-y-1.5">
                <div className="flex justify-between text-xs text-emerald-800">
                  <span>Patient</span>
                  <span className="font-semibold">{clientDisplayName}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-800">
                  <span>Amount Settled</span>
                  <span className="font-bold text-emerald-700 text-sm">${amountToPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-800">
                  <span>Method</span>
                  <span className="font-semibold">Touchless QR Code</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-md cursor-pointer mt-2"
              >
                Done / Back to Invoices
              </button>
            </div>
          ) : (
            <>
              {/* Invoice Pill */}
              <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/80 p-3 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Invoice #{invoiceId}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px] block">
                    {clientDisplayName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Due
                  </span>
                  <span className="text-lg font-bold text-blue-600 font-mono">
                    ${amountToPay.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner group">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for Invoice ${invoiceId}`}
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-50 text-slate-400 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                    <span className="text-xs">Generating secure QR...</span>
                  </div>
                )}

                {/* Scan Frame Overlay Corner Accents */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-600 rounded-tl-sm pointer-events-none"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-600 rounded-tr-sm pointer-events-none"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-600 rounded-bl-sm pointer-events-none"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-600 rounded-br-sm pointer-events-none"></div>
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Scan with any UPI, PhonePe, Google Pay, or Banking App
                </p>
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Encrypted 256-bit Healthcare Payment Gateway
                </p>
              </div>

              {/* Simulation / Payment Action */}
              <div className="w-full pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Record Payment (${amountToPay.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy UPI Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
