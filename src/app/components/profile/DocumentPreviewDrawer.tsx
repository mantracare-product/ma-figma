import React from "react";
import { FileText, Download, CheckCircle2, Clock, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StoredClientDocument } from "../../../lib/clientDocumentsStore";
import DrawerShell from "../ui/DrawerShell";

export interface DocumentPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: StoredClientDocument | null;
  clientName: string;
  onToggleStatus?: (docId: string) => void;
}

export default function DocumentPreviewDrawer({
  isOpen,
  onClose,
  document,
  clientName,
  onToggleStatus,
}: DocumentPreviewDrawerProps) {
  if (!isOpen || !document) return null;

  const downloadUrl = document.pdfBlobUrl || document.pdfBase64;

  const handleDownload = () => {
    if (downloadUrl) {
      const link = window.document.createElement("a");
      link.href = downloadUrl;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success(`Downloaded "${document.name}"!`);
    } else {
      // Fallback text download
      const textBlob = new Blob([document.generatedContent || document.name], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(textBlob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success(`Downloaded "${document.name}"!`);
    }
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={document.name}
      subtitle={`${document.category} • ${document.fileSize}`}
      icon={<FileText className="w-5 h-5 text-blue-600" />}
      width="max-w-2xl"
      zIndex={600}
      footer={
        <div className="flex items-center justify-between w-full">
          {onToggleStatus ? (
            <button
              type="button"
              onClick={() => onToggleStatus(document.id)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 transition-colors cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Change Status ({document.status})
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* PDF Viewer iFrame or Fallback View */}
        {downloadUrl ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Live PDF Document Viewer
              </span>
              <span>Doc ID: {document.id}</span>
            </div>
            <iframe
              src={downloadUrl}
              title={document.name}
              className="w-full h-[65vh] border border-gray-200 rounded-xl shadow-xs bg-gray-100"
            />
          </div>
        ) : (
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-5 text-left font-sans">
            {document.generatedContent ? (
              <pre className="whitespace-pre-wrap text-xs text-gray-800 font-sans leading-relaxed">
                {document.generatedContent}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <FileText className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-700" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Document Preview: {document.name}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-xs" style={{ fontFamily: "Outfit, sans-serif" }}>
                  [Standard document record for {clientName}]
                </p>
              </div>
            )}
          </div>
        )}

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl text-xs">
          <div>
            <span className="text-gray-500 block">Uploaded By:</span>
            <span className="font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {document.uploadedBy}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Uploaded Date:</span>
            <span className="font-semibold text-gray-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {document.uploadedDate}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Status:</span>
            <span
              className="font-semibold inline-flex items-center gap-1 mt-0.5"
              style={{
                color:
                  document.status === "Verified"
                    ? "#047857"
                    : document.status === "Pending Review"
                      ? "#B45309"
                      : "#B91C1C",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {document.status === "Verified" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : document.status === "Pending Review" ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>{document.status}</span>
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Category:</span>
            <span className="font-semibold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {document.category}
            </span>
          </div>
        </div>

        {document.notes && (
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
            <span className="font-semibold text-blue-900 block mb-0.5">Notes:</span>
            <span className="text-blue-700">{document.notes}</span>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
