import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Package,
  ChevronDown,
  Check,
} from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category: string;
  isActive: boolean;
  assignedEmployees?: number[]; // employee IDs
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([
    {
      id: 1,
      name: "Initial Consultation",
      description: "Comprehensive first-time patient consultation and assessment",
      duration: 60,
      price: 150,
      category: "Consultation",
      isActive: true,
      assignedEmployees: [1, 2],
    },
    {
      id: 2,
      name: "Follow-up Visit",
      description: "Regular follow-up appointment for existing patients",
      duration: 30,
      price: 75,
      category: "Consultation",
      isActive: true,
      assignedEmployees: [1, 2, 4],
    },
    {
      id: 3,
      name: "Dental Cleaning",
      description: "Professional teeth cleaning and oral hygiene maintenance",
      duration: 45,
      price: 120,
      category: "Dental",
      isActive: true,
      assignedEmployees: [5, 6],
    },
    {
      id: 4,
      name: "X-Ray Imaging",
      description: "Digital radiographic imaging for diagnostic purposes",
      duration: 20,
      price: 80,
      category: "Diagnostic",
      isActive: true,
      assignedEmployees: [1],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [serviceFormData, setServiceFormData] = useState({
    name: "",
    description: "",
    duration: 30,
    price: 0,
    category: "",
    isActive: true,
    selectedEmployee: null as { id: number; name: string; initials: string; color: string; role: string } | null,
  });

  const categories = ["Consultation", "Dental", "Diagnostic", "Treatment", "Therapy", "Other"];

  const employees = [
    { id: 1, name: "James Davis", initials: "JD", color: "#3B82F6", role: "Senior Agent" },
    { id: 2, name: "Sarah Miller", initials: "SM", color: "#10B981", role: "Agent" },
    { id: 3, name: "Rachel Park", initials: "RP", color: "#8B5CF6", role: "Manager" },
    { id: 4, name: "Tom Kumar", initials: "TK", color: "#F97316", role: "Agent" },
    { id: 5, name: "Amy Lee", initials: "AL", color: "#3B82F6", role: "Senior Agent" },
    { id: 6, name: "David Chen", initials: "DC", color: "#EC4899", role: "Agent" },
    { id: 7, name: "Emma Wilson", initials: "EW", color: "#14B8A6", role: "Senior Agent" },
    { id: 8, name: "Michael Brown", initials: "MB", color: "#F59E0B", role: "Supervisor" },
  ];

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddService = () => {
    if (!serviceFormData.name || !serviceFormData.selectedEmployee) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newService: Service = {
      id: Math.max(...services.map((s) => s.id)) + 1,
      ...serviceFormData,
      assignedEmployees: [],
    };

    setServices([...services, newService]);
    toast.success("Service added successfully");
    setShowAddModal(false);
    resetForm();
  };

  const handleEditService = () => {
    if (!selectedService) return;

    setServices(
      services.map((s) =>
        s.id === selectedService.id
          ? {
              ...s,
              ...serviceFormData,
            }
          : s
      )
    );
    toast.success("Service updated successfully");
    setShowEditModal(false);
    resetForm();
  };

  const handleDeleteService = (serviceId: number) => {
    setServices(services.filter((s) => s.id !== serviceId));
    toast.success("Service deleted successfully");
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setServiceFormData({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price,
      category: service.category,
      isActive: service.isActive,
      selectedEmployee: null,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setServiceFormData({
      name: "",
      description: "",
      duration: 30,
      price: 0,
      category: "",
      isActive: true,
      selectedEmployee: null,
    });
    setSelectedService(null);
    setEmployeeSearchQuery("");
  };

  const toggleServiceStatus = (serviceId: number) => {
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, isActive: !s.isActive } : s))
    );
    const service = services.find((s) => s.id === serviceId);
    toast.success(`Service ${service?.isActive ? "deactivated" : "activated"} successfully`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-8">
        <PageHeader title="Services" subtitle="Define what you offer, how long it takes, and who's qualified to deliver it">
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Services Works" />
        </PageHeader>

        {/* Stats Capsules */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <Package className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{services.length}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Total Services</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderColor: 'rgba(16, 185, 129, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <Check className="w-4 h-4" style={{ color: '#10B981' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{services.filter((s) => s.isActive).length}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Active Services</span>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <DollarSign className="w-4 h-4" style={{ color: '#3B82F6' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>${services.reduce((acc, s) => acc + s.price, 0)}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Revenue Potential</span>
            <InfoTooltip text="Sum of all active service prices — a rough estimate, not actual revenue." />
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2.5 border"
            style={{
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderColor: 'rgba(139, 92, 246, 0.2)',
              borderRadius: '999px',
              height: '40px'
            }}
          >
            <Users className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            <span className="font-semibold" style={{ fontSize: '14px', color: '#020817' }}>{new Set(services.flatMap((s) => s.assignedEmployees || [])).size}</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Assigned Employees</span>
            <InfoTooltip text="Number of team members who can be booked for this service." />
          </div>
        </div>

        {/* Search and Add */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Service
          </Button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-border shadow-sm p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
                      {service.name}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        service.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                  <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                    {service.category}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium" style={{ color: "#020817" }}>
                    {service.duration} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium" style={{ color: "#020817" }}>
                    ${service.price}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium" style={{ color: "#020817" }}>
                    {service.assignedEmployees?.length || 0} assigned
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleServiceStatus(service.id)}
                  className="flex-1"
                >
                  {service.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditModal(service)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteService(service.id)}
                  className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-border">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#020817" }}>
              No services found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search" : "Get started by adding your first service"}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Service
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEmployeeDropdown(false);
          resetForm();
        }}
        title="Add New Service"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setShowEmployeeDropdown(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddService}>
              <Plus className="w-4 h-4" />
              Add Service
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service Name *</label>
            <Input
              type="text"
              placeholder="e.g., Initial Consultation"
              value={serviceFormData.name}
              onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Brief description of the service"
              value={serviceFormData.description}
              onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
              <Input
                type="number"
                placeholder="30"
                value={serviceFormData.duration}
                onChange={(e) => setServiceFormData({ ...serviceFormData, duration: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price ($) *</label>
              <Input
                type="number"
                placeholder="0"
                value={serviceFormData.price}
                onChange={(e) => setServiceFormData({ ...serviceFormData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Employee *</label>
            <button
              type="button"
              onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
              className="w-full h-10 px-3 border border-[#D1D5DB] rounded-lg bg-white flex items-center justify-between text-sm focus:outline-none focus:ring-[3px] focus:ring-[rgba(37,99,235,0.1)] focus:border-[1.5px] focus:border-[#2563EB] transition-all"
            >
              {serviceFormData.selectedEmployee ? (
                <span className="text-[#111827]">{serviceFormData.selectedEmployee.name}</span>
              ) : (
                <span className="text-[#9CA3AF]">Select employee</span>
              )}
              <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showEmployeeDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Employee Dropdown - Normal Flow Inside Modal */}
            {showEmployeeDropdown && (
              <>
                {/* Invisible backdrop for outside clicks */}
                <div
                  className="fixed inset-0 z-[5]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEmployeeDropdown(false);
                    setEmployeeSearchQuery("");
                  }}
                />
                <div className="relative z-10 w-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-[0px_4px_16px_rgba(0,0,0,0.12)] max-h-[220px] overflow-hidden flex flex-col">
                  {/* Search Input - Sticky */}
                  <div className="flex-shrink-0 bg-[#FAFAFA] border-b border-[#F3F4F6]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                      <input
                        type="text"
                        placeholder="Search employee..."
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-transparent text-[13px] placeholder:text-[#9CA3AF] focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Employee List - Scrollable */}
                  <div className="overflow-y-auto flex-1">
                    {filteredEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => {
                          setServiceFormData({ ...serviceFormData, selectedEmployee: employee });
                          setShowEmployeeDropdown(false);
                          setEmployeeSearchQuery("");
                        }}
                        className={`w-full h-[42px] px-3.5 flex items-center gap-2.5 text-left transition-colors ${
                          serviceFormData.selectedEmployee?.id === employee.id
                            ? "bg-[#EFF6FF]"
                            : "hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <div className="flex-1">
                          <span
                            className={`text-[13px] font-medium ${
                              serviceFormData.selectedEmployee?.id === employee.id
                                ? "text-[#2563EB]"
                                : "text-[#111827]"
                            }`}
                          >
                            {employee.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#6B7280]">{employee.role}</span>
                        {serviceFormData.selectedEmployee?.id === employee.id && (
                          <Check className="w-4 h-4 text-[#2563EB]" />
                        )}
                      </button>
                    ))}

                    {filteredEmployees.length === 0 && (
                      <div className="px-3.5 py-6 text-center text-sm text-[#9CA3AF]">
                        No employees found
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={serviceFormData.isActive}
              onChange={(e) => setServiceFormData({ ...serviceFormData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
              Service is active and available for booking
            </label>
          </div>
        </div>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Service"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditService}>
              <Edit className="w-4 h-4" />
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service Name *</label>
            <Input
              type="text"
              placeholder="e.g., Initial Consultation"
              value={serviceFormData.name}
              onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Brief description of the service"
              value={serviceFormData.description}
              onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes) *</label>
              <Input
                type="number"
                placeholder="30"
                value={serviceFormData.duration}
                onChange={(e) => setServiceFormData({ ...serviceFormData, duration: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price ($) *</label>
              <Input
                type="number"
                placeholder="0"
                value={serviceFormData.price}
                onChange={(e) => setServiceFormData({ ...serviceFormData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              value={serviceFormData.category}
              onChange={(e) => setServiceFormData({ ...serviceFormData, category: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActiveEdit"
              checked={serviceFormData.isActive}
              onChange={(e) => setServiceFormData({ ...serviceFormData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="isActiveEdit" className="text-sm font-medium cursor-pointer">
              Service is active and available for booking
            </label>
          </div>
        </div>
      </Modal>

      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Services Works"
        summary="Services are the offerings your team delivers. Define each service's name, duration, price, and category, then assign the staff members who provide it."
        bullets={[
          "Create and categorise services (e.g. Consultation, Dental, Therapy)",
          "Set duration and price for each service",
          "Assign one or more team members per service",
          "Toggle services active/inactive without deleting them",
        ]}
      />
    </div>
  );
}
