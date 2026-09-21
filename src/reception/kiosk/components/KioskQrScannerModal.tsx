/**
 * KioskQrScannerModal.tsx
 * Path: src/reception/kiosk/components/KioskQrScannerModal.tsx
 *
 * QR scanner modal for instant appointment check-in.
 * Supports opaque appointment ID verification and one-click demo pass simulation.
 */

import React, { useState } from "react";
import { QrCode, X, Sparkles, Camera, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getMaClient } from "../../lib/api/maClient";
import type { QueueTicket, Journey } from "../../types/reception";

interface KioskQrScannerModalProps {
  onClose: () => void;
  onCheckinSuccess: (ticket: QueueTicket, journey: Journey) => void;
}

export const KioskQrScannerModal: React.FC<KioskQrScannerModalProps> = ({
  onClose,
  onCheckinSuccess,
}) => {
  const maClient = getMaClient();
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProcessQr = async (payload: string) => {
    setLoading(true);
    try {
      const res = await maClient.checkinByQrCode(payload, "", `kiosk_qr_${Date.now()}`);
      toast.success("QR Pass recognized!");
      onClose();
      onCheckinSuccess(res.ticket, res.journey);
    } catch (err: any) {
      toast.error(err.message || "Invalid or unrecognized appointment QR pass.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none font-['Outfit'] animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Scan Appointment QR</h3>
              <p className="text-xs text-slate-400">Hold your pass in front of the camera</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Scanner Viewfinder Simulator */}
        <div className="relative aspect-square max-h-[220px] bg-slate-950 rounded-2xl border-2 border-dashed border-purple-500/50 flex flex-col items-center justify-center text-center p-6 overflow-hidden mx-auto w-full">
          {/* Scanning animation bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500 animate-[bounce_2s_infinite]" />

          <Camera className="w-10 h-10 text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-400">
            Position QR code within frame
          </p>
          <span className="text-[10px] text-slate-500 mt-1">Optical auto-detector active</span>
        </div>

        {/* Demo Fast-Pass Selector */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Or test with a demo appointment pass:
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleProcessQr("apt-101")}
            className="w-full p-3.5 bg-slate-800/80 hover:bg-purple-600/20 border border-slate-700 hover:border-purple-500/80 rounded-2xl text-left flex items-center justify-between transition-all group cursor-pointer"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-purple-300">
                Eleanor Vance (Dr. Sharma • 10:30 AM)
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Pass ID: apt-101</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400" />
          </button>
        </div>

        {/* Manual Code Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) handleProcessQr(manualCode.trim());
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-800"
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter appointment ID..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={loading || !manualCode.trim()}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
};
