import React from "react";
import logo from "@/imports/ma_logo-1.png";

export interface CenteredOnboardingShellProps {
  children: React.ReactNode;
  maxWidth?: string; // e.g. "max-w-[640px]", "max-w-[720px]", "max-w-[760px]"
  cardClassName?: string;
}

export const CenteredOnboardingShell: React.FC<CenteredOnboardingShellProps> = ({
  children,
  maxWidth = "max-w-[560px]",
  cardClassName = "",
}) => {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 py-10 overflow-y-auto select-none"
      style={{
        backgroundColor: "#FAFAFA",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="w-full flex flex-col items-center my-auto">
        {/* Centered Logo above the card (24px tall) */}
        <div className="mb-5 flex items-center justify-center">
          <img
            src={logo}
            alt="MantraAssist"
            className="h-6 w-auto drop-shadow-xs transition-opacity duration-200"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>

        {/* Centered Single Card */}
        <main
          className={`w-[calc(100%-32px)] sm:w-full ${maxWidth} bg-white rounded-[24px] border border-slate-200 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-4 sm:p-6 transition-all duration-200 ${cardClassName}`}
          style={{
            animation: "fadeRise 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <style>{`
            @keyframes fadeRise {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          {children}
        </main>

        {/* Footer Links below the card */}
        <footer className="mt-6 flex items-center gap-3 text-xs text-slate-400">
          <button
            type="button"
            className="hover:text-slate-600 transition-colors cursor-pointer"
          >
            English
          </button>
          <span>·</span>
          <button
            type="button"
            className="hover:text-slate-600 transition-colors cursor-pointer"
          >
            Accessibility
          </button>
          <span>·</span>
          <button
            type="button"
            className="hover:text-slate-600 transition-colors cursor-pointer"
          >
            Privacy
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CenteredOnboardingShell;
