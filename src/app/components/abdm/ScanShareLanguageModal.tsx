import React, { useState } from "react";
import { X, Download, Loader2, AlertCircle } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguageCode,
  selfServicePdfService,
} from "../../services/selfServicePdfService";
import { toast } from "sonner";

interface ScanShareLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl?: string;
}

export const ScanShareLanguageModal: React.FC<ScanShareLanguageModalProps> = ({
  isOpen,
  onClose,
  qrDataUrl,
}) => {
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguageCode>("en");
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    setErrorMessage(null);

    try {
      await selfServicePdfService.generateSelfServicePdf(
        selectedLanguage,
        qrDataUrl
      );
      toast.success(
        `Scan & Share poster downloaded for ${
          SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.label
        }!`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Unable to generate the PDF. Please try again."
      );
      toast.error("Failed to generate PDF poster");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top subtle pink/purple accent stripe matching screenshot */}
        <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-rose-400 to-purple-500" />

        {/* Modal Header */}
        <div className="p-6 pb-3 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 font-display">
            Select language and download
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDownloading}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Radio options list */}
        <div className="p-6 pt-4 overflow-y-auto flex-1 space-y-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <label
                key={lang.code}
                onClick={() => {
                  if (!isDownloading) {
                    setSelectedLanguage(lang.code);
                    if (errorMessage) setErrorMessage(null);
                  }
                }}
                className={`flex items-center gap-3.5 p-2 rounded-xl cursor-pointer transition-all select-none hover:bg-slate-50 ${
                  isSelected ? "text-slate-900 font-bold" : "text-slate-700 font-medium"
                }`}
              >
                {/* Custom radio indicator matching screenshot */}
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-[#1456f0] bg-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-[#1456f0]" />
                  )}
                </div>

                <span className="text-sm">{lang.nativeLabel}</span>
              </label>
            );
          })}

          {/* Inline Error Message if API fails */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 pt-3 pb-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full py-3 px-4 rounded-2xl bg-[#1456f0] hover:bg-[#1147cc] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing your PDF…</span>
              </>
            ) : errorMessage ? (
              <>
                <span>Try Again</span>
              </>
            ) : (
              <>
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
