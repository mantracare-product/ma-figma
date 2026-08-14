import { useState, useEffect } from "react";
import { Building2, ChevronDown, Plus, Check, ChevronLeft, CheckCircle, Phone, MessageSquare, Mail, Calendar, Briefcase, Info } from "lucide-react";
import { useOrganization } from "../../context/OrganizationContext";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";

const industries = [
  "Healthcare",
  "Dental",
  "Mental Health",
  "Physical Therapy",
  "Chiropractic",
  "Veterinary",
  "Other Medical Services",
];

interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  stages: number;
}

const processTemplates: ProcessTemplate[] = [
  { id: "1", name: "Patient Intake", description: "Initial patient onboarding and verification", stages: 4 },
  { id: "2", name: "Appointment Scheduling", description: "Schedule and confirm patient appointments", stages: 3 },
  { id: "3", name: "Follow-up Calls", description: "Post-visit patient follow-up workflow", stages: 3 },
  { id: "4", name: "Billing Support", description: "Payment and billing inquiry management", stages: 4 },
];

interface Integration {
  id: string;
  name: string;
  icon: any;
  description: string;
  connected: boolean;
}

// Helper component for labels with tooltips
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <label className="block text-sm font-medium mb-2 text-foreground">
      <span className="flex items-center gap-1.5">
        {label}
        <Tooltip text={tooltip} placement="top">
          <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
        </Tooltip>
      </span>
    </label>
  );
}

export default function OrganizationSwitcher() {
  const { organizations, activeOrganization, setActiveOrganization, addOrganization } = useOrganization();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Organization Details
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showMoreSettings, setShowMoreSettings] = useState(false);

  // Advanced/Optional fields
  const [preferredCallingTime, setPreferredCallingTime] = useState("14:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [website, setWebsite] = useState("");
  const [defaultCallingCountry, setDefaultCallingCountry] = useState("United States");
  const [address, setAddress] = useState("");
  const [billingContactName, setBillingContactName] = useState("");
  const [billingContactEmail, setBillingContactEmail] = useState("");

  // Step 2: Process Setup
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

  // Step 3: Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "vapi", name: "Calling (VAPI)", icon: Phone, description: "AI-powered voice calls", connected: false },
    { id: "whatsapp", name: "WhatsApp", icon: MessageSquare, description: "WhatsApp messaging", connected: false },
    { id: "sendgrid", name: "Email (SendGrid)", icon: Mail, description: "Email notifications", connected: false },
    { id: "gcal", name: "Calendar (Google Calendar)", icon: Calendar, description: "Appointment sync", connected: false },
    { id: "crm", name: "CRM (optional)", icon: Briefcase, description: "Customer relationship management", connected: false },
  ]);

  // Initialize all processes as selected when modal opens
  useEffect(() => {
    if (showAddModal && currentStep === 2 && selectedProcesses.length === 0) {
      setSelectedProcesses(processTemplates.map(t => t.id));
    }
  }, [showAddModal, currentStep]);

  const handleSelectOrganization = (org: typeof activeOrganization) => {
    setActiveOrganization(org);
    setShowOrgMenu(false);
    toast.success(`Switched to ${org.name}`);
  };

  const handleOpenAddModal = () => {
    setShowOrgMenu(false);
    setShowAddModal(true);
    setCurrentStep(1);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setCurrentStep(1);
    // Reset form
    setOrgName("");
    setIndustry("");
    setEmail("");
    setPhone("");
    setShowMoreSettings(false);
    setPreferredCallingTime("14:00");
    setTimezone("America/New_York");
    setWebsite("");
    setDefaultCallingCountry("United States");
    setAddress("");
    setBillingContactName("");
    setBillingContactEmail("");
    setSelectedProcesses([]);
    setIntegrations(prev => prev.map(i => ({ ...i, connected: false })));
  };

  const toggleProcessSelection = (processId: string) => {
    setSelectedProcesses(prev => {
      if (prev.includes(processId)) {
        // Only deselect if there's more than one selected
        if (prev.length > 1) {
          return prev.filter(id => id !== processId);
        }
        toast.error("At least one process must remain selected");
        return prev;
      } else {
        return [...prev, processId];
      }
    });
  };

  const toggleIntegration = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(i => i.id === integrationId ? { ...i, connected: !i.connected } : i)
    );
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!orgName || !industry || !email || !phone) {
        toast.error("Please fill all required fields");
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }
    if (currentStep === 2) {
      // Validate step 2
      if (selectedProcesses.length === 0) {
        toast.error("Please select at least one process");
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleFinishSetup = () => {
    // Create organization with all collected data
    // New organizations are always created as Active by default
    addOrganization({
      name: orgName,
      industry,
      email,
      phone,
      status: "Active",
    });

    handleCloseModal();
    toast.success("Organization created successfully");
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Organization Details";
      case 2: return "Process Setup";
      case 3: return "Integrations Setup";
      default: return "";
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowOrgMenu(!showOrgMenu)}
          className="flex items-center gap-2 px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full shadow-2xs transition-colors text-xs font-semibold text-[#222222] cursor-pointer"
        >
          <div className="w-5 h-5 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center font-bold text-[10px]">
            <Building2 className="w-3 h-3" />
          </div>
          <span className="truncate max-w-[140px]">{activeOrganization.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showOrgMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowOrgMenu(false)}
            />
            <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl py-1.5 z-50 text-xs overflow-hidden">
              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Organizations
              </div>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrganization(org)}
                  className={`w-full px-3.5 py-2 text-left text-xs hover:bg-blue-50 transition-colors flex items-center justify-between font-medium cursor-pointer ${
                    activeOrganization.id === org.id
                      ? "bg-blue-50/60 text-[#1456f0] font-bold"
                      : "text-[#222222]"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {activeOrganization.id === org.id && (
                    <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleOpenAddModal}
                className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition-colors text-[#1456f0] font-bold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Organization
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add Organization Modal - Multi-step */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        title="Add Organization"
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Step Label */}
          <div className="text-sm text-muted-foreground font-medium">
            Step {currentStep} of 3 · {getStepTitle()}
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep >= step
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                      currentStep > step ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Basic Fields */}
              <div className="space-y-5">
                <Input
                  label="Organization Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Healthcare"
                  tooltip="Enter your business or practice name."
                />

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="">Select industry</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@acme.com"
                  tooltip="Primary contact email for your organization."
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  tooltip="Main contact number for your organization."
                />
              </div>

              {/* More Settings Toggle */}
              <div className="border-t border-border pt-6">
                <button
                  type="button"
                  onClick={() => setShowMoreSettings(!showMoreSettings)}
                  className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  <span className="font-medium text-sm">More Settings / Detailed View</span>
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showMoreSettings ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showMoreSettings ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>

                {showMoreSettings && (
                  <div className="mt-6 space-y-6 p-6 bg-muted/50 rounded-xl">
                    {/* Other Info Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground">Other Info</h4>

                      {/* Row 1: Preferred Calling Time | Timezone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <LabelWithTooltip
                            label="Preferred Calling Time"
                            tooltip="This is the default time when AI calls will be scheduled if no specific time is provided."
                          />
                          <input
                            type="time"
                            value={preferredCallingTime}
                            onChange={(e) => setPreferredCallingTime(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          />
                        </div>

                        <div>
                          <LabelWithTooltip
                            label="Timezone"
                            tooltip="All calls, schedules, and reports will follow this timezone."
                          />
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="Europe/London">London (GMT)</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Dubai">Dubai (GST)</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Website | Default Calling Country */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Website"
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://acmehealthcare.com"
                          tooltip="Used for branding and AI context (optional). Helps personalize communication."
                        />

                        <div>
                          <LabelWithTooltip
                            label="Default Calling Country"
                            tooltip="Determines the default country code and calling behavior for outbound calls."
                          />
                          <select
                            value={defaultCallingCountry}
                            onChange={(e) => setDefaultCallingCountry(e.target.value)}
                            className="w-full px-4 py-2 bg-input-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          >
                            <option value="United States">United States</option>
                            <option value="Canada">Canada</option>
                            <option value="United Kingdom">United Kingdom</option>
                            <option value="India">India</option>
                            <option value="Australia">Australia</option>
                            <option value="United Arab Emirates">United Arab Emirates</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Billing Info Section */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <h4 className="text-sm font-semibold text-foreground">Billing Info</h4>

                      {/* Full width: Address */}
                      <Input
                        label="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Healthcare Ave, New York, NY 10001"
                        tooltip="Used for billing, invoicing, and compliance records."
                      />

                      {/* Row: Billing Contact Name | Billing Contact Email */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Billing Contact Name"
                          value={billingContactName}
                          onChange={(e) => setBillingContactName(e.target.value)}
                          placeholder="John Doe"
                          tooltip="Primary contact for billing and payment-related communication."
                        />

                        <Input
                          label="Billing Contact Email"
                          type="email"
                          value={billingContactEmail}
                          onChange={(e) => setBillingContactEmail(e.target.value)}
                          placeholder="billing@acme.com"
                          tooltip="Invoices and payment notifications will be sent to this email."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleNext}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Process Setup */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  Choose the processes you need support with
                </p>
                <p className="text-xs text-muted-foreground">
                  All processes are selected by default. Deselect any you do not need.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {processTemplates.map((template) => {
                  const isSelected = selectedProcesses.includes(template.id);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => toggleProcessSelection(template.id)}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        isSelected
                          ? "border-primary bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-gray-900"}`}>
                          {template.name}
                        </h4>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-700"
                      }`}>
                        {template.stages} stages
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleNext}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Integrations Setup */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  Connect integrations to activate workflows
                </p>
                <p className="text-xs text-muted-foreground">
                  You can skip this for now and set it up later
                </p>
              </div>

              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="p-4 border border-border rounded-xl hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <integration.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{integration.name}</h4>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <Button
                        variant={integration.connected ? "outline" : "primary"}
                        size="sm"
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        {integration.connected ? (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Connected
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleFinishSetup}
                >
                  Skip for now
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleFinishSetup}
                >
                  Finish Setup
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
