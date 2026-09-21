/**
 * KioskDeviceGuard.tsx
 * Path: src/reception/kiosk/components/KioskDeviceGuard.tsx
 *
 * Checks device registration token. If unprovisioned, displays an interactive
 * pairing screen for facility administrators to enter a device key or use quick demo setup.
 */

import React, { useState } from "react";
import { ShieldCheck, Key, ArrowRight, Laptop, CheckCircle, Sparkles } from "lucide-react";
import { getMaClient } from "../../lib/api/maClient";
import { toast } from "sonner";

interface KioskDeviceGuardProps {
  onAuthenticated: (deviceId: string, token: string) => void;
}

export const KioskDeviceGuard: React.FC<KioskDeviceGuardProps> = ({ onAuthenticated }) => {
  const [deviceKeyInput, setDeviceKeyInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePairDevice = async (keyToUse?: string) => {
    const key = keyToUse || deviceKeyInput.trim() || "kiosk_demo_key_1234";
    setLoading(true);
    try {
      const maClient = getMaClient();
      const auth = await maClient.authenticateDevice(key);
      localStorage.setItem("ma_kiosk_device_token", auth.token);
      localStorage.setItem("ma_kiosk_device_id", auth.deviceId);
      toast.success("Kiosk hardware paired successfully!");
      onAuthenticated(auth.deviceId, auth.token);
    } catch (err: any) {
      toast.error(err.message || "Failed to pair device.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 select-none font-['Outfit']">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Kiosk Terminal Setup</h2>
          <p className="text-sm text-slate-400">
            Pair this physical tablet terminal with your MantraAssist clinic account.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Kiosk Device Key (from Settings &gt; AI Reception)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deviceKeyInput}
                onChange={(e) => setDeviceKeyInput(e.target.value)}
                placeholder="Enter 16-character device key..."
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handlePairDevice()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Pair Terminal"}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold">Or for testing</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handlePairDevice("kiosk_demo_auto_key")}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            Launch Instant Demo Mode
          </button>
        </div>

        {/* Footer Note */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-300 mb-0.5">Prototype Security Note:</p>
          Client-side device tokens are UI gating for demo and simulation purposes. Real hardware keys and HSM signing will be enforced on backend handoff.
        </div>
      </div>
    </div>
  );
};
