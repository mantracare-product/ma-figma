import React, { useMemo } from "react";
import { X, FileText } from "lucide-react";
import { Stage } from "../../../../lib/useProcessStore";
import { Client } from "../../../../lib/clientsStore";
import { Appointment } from "../../../../lib/appointmentService";
import { ClientInvoice } from "../../../types/invoiceTypes";

export interface StageContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stage: Stage | null;
  processName?: string;
  clientName?: string;
  client?: Client | null;
  appointment?: Appointment | null;
  invoice?: ClientInvoice | null;
  doctorName?: string;
  roomName?: string;
  renderedHtml?: string;
  onConsentSigned?: (signatureDataUrl: string) => void;
}

export default function StageContentDrawer({
  isOpen,
  onClose,
  stage,
  processName = "Patient Care Journey",
  clientName = "Patient",
  client,
  appointment,
  invoice,
  doctorName,
  roomName,
  renderedHtml,
}: StageContentDrawerProps) {
  if (!isOpen || !stage) return null;

  const title = stage.portalReceptionSettings?.cardTitle || stage.name;

  // Resolve dynamic HTML block with variable token substitution (synchronized with Stage Portal & Reception Settings)
  const dynamicHtml = useMemo(() => {
    if (renderedHtml) return renderedHtml;

    const rawHtml =
      stage.portalReceptionSettings?.htmlContent ||
      stage.portalReceptionSettings?.text ||
      `<div class="stage-guide">
        <h3>${title}</h3>
        <p>${stage.portalReceptionSettings?.cardDescription || stage.description || "Stage details and guidance."}</p>
      </div>`;

    const patientName = client?.name || clientName || "Patient";
    const patientFirst = patientName.split(" ")[0];
    const apptDate = appointment?.date || "Today";
    const apptTime = appointment?.time || "11:30 AM";
    const apptAny = appointment as any;
    const invAny = invoice as any;
    const doc = doctorName || appointment?.employeeName || "Dr. Rajesh Patel";
    const room = roomName || apptAny?.room || "Consultation Room 3";
    const invTotal = invoice?.total !== undefined ? `$${invoice.total.toFixed(2)}` : "$78.75";
    const invBalance = invAny?.balanceDue !== undefined ? `$${invAny.balanceDue.toFixed(2)}` : invTotal;

    const tokenMap: Record<string, string> = {
      "client.name": patientName,
      "client.firstName": patientFirst,
      "client.phone": client?.phone || "",
      "client.email": client?.email || "",
      "client.id": client?.id || "CL-101",
      "appointment.date": apptDate,
      "appointment.time": apptTime,
      "appointment.service": apptAny?.service || apptAny?.serviceName || "Clinical Consultation",
      "appointment.provider": doc,
      "appointment.room": room,
      "invoice.id": invoice?.id || "INV-CL-1056",
      "invoice.total": invTotal,
      "invoice.balanceDue": invBalance,
      "stage.name": stage.name,
      "process.name": processName,
      "clinic.name": "Mantra Care",
    };

    let result = rawHtml;
    Object.entries(tokenMap).forEach(([k, v]) => {
      result = result.split(`{{${k}}}`).join(v);
      result = result.split(`{${k}}`).join(v);
    });

    return result;
  }, [stage, renderedHtml, client, clientName, appointment, invoice, doctorName, roomName, processName, title]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-50 border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              <span>{processName}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-xs text-slate-500 font-medium">Stage Guidance &amp; Interactive Details</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - ONLY what the HTML block shows */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div
              className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-2.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mb-2 [&_p]:mb-2.5 [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: dynamicHtml }}
            />
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
