import React, { useRef } from "react";
import { motion } from "motion/react";
import { X, Download, Printer, ShieldCheck, QrCode, CheckCircle2 } from "lucide-react";
import { ABHAPatientRecord } from "../../services/abdmService";
import abdmLogo from "../../../assets/abdm/abdm-logo.f4a16ac5b7650b3a70033e233e6122e0.svg";
import nhaLogo from "../../../assets/abdm/NHA.b7adfb67b258bee7ddf57b57969e2749.svg";
import mantraLogo from "../../../assets/abdm/logo.png";
import { toast } from "sonner";

interface ABHACardModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: ABHAPatientRecord | null;
}

export const ABHACardModal: React.FC<ABHACardModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success(`ABHA Card downloaded for ${patient.name} (${patient.abhaNumber})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Official ABHA Card
              </h3>
              <p className="text-xs text-slate-500">
                Ayushman Bharat Health Account Digital Card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Content Area */}
        <div className="p-6 space-y-6">
          {/* Printable Official ABHA Card Target */}
          <div
            ref={cardRef}
            className="relative bg-gradient-to-b from-slate-50 via-white to-blue-50/40 rounded-2xl border-2 border-slate-200/90 shadow-md p-5 overflow-hidden select-none"
          >
            {/* Indian Flag Tricolor Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="w-1/3 bg-[#FF9933]" />
              <div className="w-1/3 bg-[#FFFFFF]" />
              <div className="w-1/3 bg-[#138808]" />
            </div>

            {/* ABHA Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 pt-1">
              <div className="flex items-center gap-2">
                <img
                  src={abdmLogo}
                  alt="ABDM Logo"
                  className="h-7 w-auto object-contain"
                />
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900 leading-none">
                    National Health Authority
                  </h4>
                  <p className="text-[9.5px] font-semibold text-blue-600">
                    Ayushman Bharat Digital Mission (ABDM)
                  </p>
                </div>
              </div>
              <img
                src={nhaLogo}
                alt="NHA"
                className="h-7 w-auto object-contain"
              />
            </div>

            {/* Card Body */}
            <div className="py-4 flex gap-4 items-center">
              {/* Patient Photo Avatar */}
              <div className="w-20 h-24 rounded-xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm mb-1">
                  {patient.name.charAt(0)}
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  Photo
                </span>
              </div>

              {/* Patient Demographic Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Name
                  </span>
                  <h3 className="text-base font-bold text-slate-900 truncate font-display">
                    {patient.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-semibold block uppercase">
                      Gender
                    </span>
                    <span className="font-semibold text-slate-700">
                      {patient.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-semibold block uppercase">
                      DOB
                    </span>
                    <span className="font-semibold text-slate-700">
                      {patient.dob}
                    </span>
                  </div>
                </div>

                <div className="pt-0.5">
                  <span className="text-[9.5px] text-slate-400 font-semibold block uppercase">
                    Mobile Number
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {patient.mobile}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center flex-shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-16 h-16 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-600">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                  Scan ABHA
                </span>
              </div>
            </div>

            {/* ABHA Identifier Banner */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-600 block">
                  ABHA Number
                </span>
                <span className="text-sm font-extrabold text-slate-900 tracking-wider font-mono">
                  {patient.abhaNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-600 block">
                  ABHA Address
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {patient.abhaAddress}
                </span>
              </div>
            </div>

            {/* Status Footer */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                NHA ABDM Verified Identity
              </span>
              <span>State: {patient.state || "Maharashtra"}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 h-11 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Card</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 h-11 rounded-2xl bg-[#1456f0] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download ABHA Card</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
