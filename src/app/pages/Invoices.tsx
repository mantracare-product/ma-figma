import React, { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import { useInvoices } from "../context/InvoiceContext";
import { ClientInvoice, InvoiceStatus } from "../types/invoiceTypes";
import InvoiceDetailDrawer from "../components/invoices/InvoiceDetailDrawer";
import CreateInvoiceDrawer from "../components/invoices/CreateInvoiceDrawer";
import InvoiceDocumentModal from "../components/invoices/InvoiceDocumentModal";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { toast } from "sonner";
import {
  Search,
  Filter,
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  CreditCard,
  Ban,
  Eye,
  Bot,
  User,
  MessageCircle,
  MessageSquare,
  Mail,
  Calendar,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Link } from "react-router";

export default function Invoices() {
  const { invoices, sendInvoice, simulatePayment, voidInvoice } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [selectedDocumentInvoice, setSelectedDocumentInvoice] = useState<ClientInvoice | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Compute stat capsule metrics
  const totalInvoiced = invoices.filter((i) => i.status !== "void").reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "viewed" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);
  const totalPaidThisMonth = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      inv.id.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      (inv.appointmentTitle && inv.appointmentTitle.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesClient = clientFilter === "all" || inv.clientId === clientFilter;

    return matchesSearch && matchesStatus && matchesClient;
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Paid</span>;
      case "sent":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">Sent</span>;
      case "viewed":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">Viewed</span>;
      case "overdue":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">Overdue</span>;
      case "void":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Void</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Draft</span>;
    }
  };

  const getSentViaIcon = (sentVia?: string) => {
    switch (sentVia) {
      case "whatsapp":
        return <MessageCircle className="w-4 h-4 text-emerald-600" title="Sent via WhatsApp" />;
      case "sms":
        return <MessageSquare className="w-4 h-4 text-blue-600" title="Sent via SMS" />;
      case "email":
        return <Mail className="w-4 h-4 text-slate-700" title="Sent via Email" />;
      default:
        return <span className="text-slate-300 text-xs">—</span>;
    }
  };

  const handleOpenDetail = (inv: ClientInvoice) => {
    setSelectedInvoice(inv);
    setIsDetailDrawerOpen(true);
  };

  const handleOpenDocument = (inv: ClientInvoice) => {
    setSelectedDocumentInvoice(inv);
    setIsDocumentModalOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-8">
        <PageHeader
          title="Invoices"
          subtitle="Manage client billing, view automated call-flow invoices, and collect payments"
        >
          <div className="flex items-center gap-3">
            <HowItWorksButton onClick={() => setShowHelp(true)} label="How Invoices Works" />
            <button
              onClick={() => setIsCreateDrawerOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <DollarSign className="w-4 h-4" style={{ color: "#3B82F6" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              ${totalInvoiced.toFixed(2)}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Total Invoiced</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              borderColor: "rgba(245, 158, 11, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              ${totalOutstanding.toFixed(2)}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Outstanding</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderColor: "rgba(16, 185, 129, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: "#10B981" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              ${totalPaidThisMonth.toFixed(2)}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Paid This Month</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              borderColor: "rgba(244, 63, 94, 0.2)",
              borderRadius: "999px",
              height: "40px",
            }}
          >
            <AlertCircle className="w-4 h-4" style={{ color: "#F43F5E" }} />
            <span className="font-semibold" style={{ fontSize: "14px", color: "#020817" }}>
              {overdueCount}
            </span>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Overdue Count</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoice #, client, or appointment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredInvoices.length} of {invoices.length} Invoices
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Linked Appointment</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-center">Sent Via</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredInvoices.map((inv) => {
                const isAutomated = inv.createdBy === "system";
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Invoice ID */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenDetail(inv)}
                        className="font-bold text-blue-600 hover:underline text-sm"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {inv.id}
                      </button>
                    </td>

                    {/* Client Name */}
                    <td className="py-3.5 px-4">
                      <Link to={`/clients/${inv.clientId}`} className="font-semibold text-slate-900 hover:text-blue-600">
                        {inv.clientName}
                      </Link>
                    </td>

                    {/* Created By / Source Badge */}
                    <td className="py-3.5 px-4">
                      {isAutomated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Bot className="w-3 h-3 text-blue-600" /> Automated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <User className="w-3 h-3 text-slate-400" /> Manual
                        </span>
                      )}
                    </td>

                    {/* Linked Appointment (Requirement 2: Real Link) */}
                    <td className="py-3.5 px-4">
                      {inv.appointmentId ? (
                        <Link
                          to={`/appointments?id=${inv.appointmentId}`}
                          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-500" /> {inv.appointmentTitle || `Appointment #${inv.appointmentId}`}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Standalone</span>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ${inv.total.toFixed(2)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {inv.dueDate}
                    </td>

                    {/* Sent Via Icon */}
                    <td className="py-3.5 px-4 text-center">
                      {getSentViaIcon(inv.sentVia)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDocument(inv)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
                          title="View Official Full Document"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                          title="Quick Glance Status Drawer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {inv.status !== "paid" && inv.status !== "void" && (
                          <button
                            onClick={() => {
                              simulatePayment(inv.id);
                              toast.success(`Invoice ${inv.id} paid`);
                            }}
                            className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Simulate Payment"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No invoices found</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting a different status or client filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Quick Glance Detail Drawer */}
      <InvoiceDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        invoice={selectedInvoice}
        onOpenDocument={(inv) => {
          setIsDetailDrawerOpen(false);
          handleOpenDocument(inv);
        }}
      />

      {/* Manual Standalone Invoice Creation Drawer */}
      <CreateInvoiceDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
      />

      {/* Official Client-Facing Printable Document Modal */}
      <InvoiceDocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        invoice={selectedDocumentInvoice}
      />

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Invoices Works"
        summary="Invoices seamlessly connects booked appointments to client billing and reports. Create invoices manually or let AI call flows generate them automatically."
        bullets={[
          "Click '+ Create Invoice' to issue standalone invoices without an appointment",
          "Click 'Linked Appointment' to jump directly to the appointment details",
          "Click the document icon to view official printable client invoices",
          "Simulate client payment to watch status update in real time",
        ]}
        guideUrl="/guide/invoices"
      />
    </div>
  );
}
