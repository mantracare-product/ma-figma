import React from "react";
import { X, Download } from "lucide-react";
import { toast } from "sonner";

interface ScanShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl: string;
}

export const ScanShareQrModal: React.FC<ScanShareQrModalProps> = ({
  isOpen,
  onClose,
  qrDataUrl,
}) => {
  if (!isOpen) return null;

  const handleDownloadJpg = () => {
    try {
      // Create canvas to render JPG with white background
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const padding = 40;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // White background for clean JPG export
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, padding, padding);

          const jpgUrl = canvas.toDataURL("image/jpeg", 0.95);
          const link = document.createElement("a");
          link.href = jpgUrl;
          link.download = "abdm-scan-and-share-qr.jpg";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("Scan & Share QR downloaded as JPG!");
        }
      };
      img.src = qrDataUrl;
    } catch (err) {
      console.error(err);
      toast.error("Failed to download JPG image");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Top subtle pink/purple accent stripe matching screenshot */}
        <div className="h-1.5 w-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500" />

        {/* Modal Header */}
        <div className="p-6 pb-2 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Scan & Share QR
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Patients scan this to create their ABHA and book appointments.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Large Prominent QR Code */}
        <div className="p-6 flex items-center justify-center">
          <div className="p-4 bg-white rounded-2xl border border-blue-200/80 shadow-xs flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan and Share QR"
                className="w-64 h-64 object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Sticky Download JPG Button */}
        <div className="p-6 pt-3 pb-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={handleDownloadJpg}
            className="w-full py-3 px-4 rounded-2xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download JPG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
