import React, { ReactNode } from "react";
import { Play, CheckCircle2, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;              // e.g. "How Appointments Works"
  videoUrl?: string;           // optional embed src; falls back to placeholder
  summary: string;             // 1-2 sentence plain-language overview
  bullets?: string[];          // 3-5 short "what you can do here" bullets
  guideUrl?: string;           // link to a full written guide (opens in new tab)
  extraFooterButtons?: ReactNode;
}

export function HowItWorksModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  summary,
  bullets = [],
  guideUrl,
  extraFooterButtons,
}: HowItWorksModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const footer = (
    <div className="flex items-center justify-between w-full">
      {guideUrl ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate(guideUrl, { state: { from: location.pathname } });
          }}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          View Detailed Guide →
        </button>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2">
        {extraFooterButtons}
        <Button onClick={onClose} variant="primary" size="sm">
          Got it
        </Button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} maxWidth="md-plus">
      <div className="space-y-5">
        {/* Video Area */}
        <div className="aspect-video bg-[#F1F5F9] rounded-xl flex items-center justify-center border border-[#E2E8F0] overflow-hidden relative">
          {videoUrl ? (
            <iframe
              src={videoUrl}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="text-center p-6">
              <Play className="w-12 h-12 mx-auto mb-2 text-[#64748B] opacity-80" />
              <p className="font-semibold text-sm text-[#475569]" style={{ fontFamily: "DM Sans, sans-serif" }}>Video tutorial placeholder</p>
              <p className="text-xs text-[#64748B] mt-1" style={{ fontFamily: "Outfit, sans-serif" }}>Embedded video would appear here</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <p className="text-sm text-[#475569] leading-relaxed" style={{ fontFamily: "Outfit, sans-serif" }}>
            {summary}
          </p>

          {/* Bullets Checklist */}
          {bullets.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#334155]" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {bullet}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface HowItWorksButtonProps {
  label: string;
  onClick: () => void;
}

export function HowItWorksButton({ label, onClick }: HowItWorksButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-xs font-semibold text-blue-600 flex items-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95"
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <Play className="w-3 h-3 fill-current" />
      {label}
    </button>
  );
}
