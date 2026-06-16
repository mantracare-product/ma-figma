import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useHowItWorks } from "../../context/HowItWorksContext";
import GuestRoute from "../../components/auth/GuestRoute";
import { Tooltip } from "../../components/ui/Tooltip";
import { Check, ChevronLeft, ChevronDown, Search, CheckCircle, Info } from "lucide-react";

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const countries: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
];

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
  industry: string;
}

const processTemplates: ProcessTemplate[] = [
  { id: "1", name: "Patient Intake", description: "Initial patient onboarding and verification", stages: 4, industry: "Healthcare" },
  { id: "2", name: "Appointment Scheduling", description: "Schedule and confirm patient appointments", stages: 3, industry: "Healthcare" },
  { id: "3", name: "Follow-up Calls", description: "Post-visit patient follow-up workflow", stages: 3, industry: "Healthcare" },
  { id: "4", name: "Billing Support", description: "Payment and billing inquiry management", stages: 4, industry: "Healthcare" },
  { id: "5", name: "Dental Appointment", description: "Dental visit scheduling and reminders", stages: 3, industry: "Dental" },
  { id: "6", name: "Therapy Session Booking", description: "Mental health session management", stages: 3, industry: "Mental Health" },
];

// Helper component for labels with tooltips
function LabelWithTooltip({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-2">
      <span className="flex items-center gap-1.5">
        {label}
        <Tooltip text={tooltip} placement="top">
          <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" />
        </Tooltip>
      </span>
    </label>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { triggerAutoOpen } = useHowItWorks();

  // Check if coming from login with pre-filled data
  const prefilledData = location.state as { email?: string; name?: string; phone?: string; password?: string } | null;
  const [currentStep, setCurrentStep] = useState(prefilledData ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Form Data
  const [name, setName] = useState(prefilledData?.name || "");
  const [email, setEmail] = useState(prefilledData?.email || "");
  const [password, setPassword] = useState(prefilledData?.password || "");
  const [phone, setPhone] = useState(prefilledData?.phone || "");
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [agreedToTerms, setAgreedToTerms] = useState(prefilledData ? true : false);

  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [mantraProviderEnabled, setMantraProviderEnabled] = useState(true);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [preferredCallingTime, setPreferredCallingTime] = useState("14:00");
  const [timeZone, setTimeZone] = useState("America/New_York");

  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const [selectedEHR, setSelectedEHR] = useState<string | null>(null);
  const [ehrField1, setEhrField1] = useState("");
  const [ehrField2, setEhrField2] = useState("");
  const [ehrField3, setEhrField3] = useState("");

  // UI State
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.dialCode.includes(countrySearch)
  );

  const filteredTemplates = processTemplates.filter((template) => template.industry === industry);

  const totalSteps = 4;

  // Initialize all templates as selected when entering step 3
  useEffect(() => {
    if (currentStep === 3 && filteredTemplates.length > 0 && selectedTemplates.length === 0) {
      const allTemplateIds = filteredTemplates.map(t => t.id);
      setSelectedTemplates(allTemplateIds);
    }
  }, [currentStep, filteredTemplates]);

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => {
      if (prev.includes(templateId)) {
        // Only deselect if there's more than one selected
        if (prev.length > 1) {
          return prev.filter(id => id !== templateId);
        }
        toast.error("At least one process must remain selected");
        return prev;
      } else {
        return [...prev, templateId];
      }
    });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!name || !email || !password || !phone || !agreedToTerms) {
        toast.error("Please fill all fields and agree to terms");
        return;
      }
    }
    if (currentStep === 2) {
      // Validate step 2
      if (!organizationName || !industry || !orgEmail || !orgPhone) {
        toast.error("Please fill all organization details");
        return;
      }
    }
    if (currentStep === 3) {
      // Validate step 3
      if (selectedTemplates.length === 0) {
        toast.error("Please select at least one process template");
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setLoading(true);
    setTimeout(() => {
      login();
      setLoading(false);
      toast.success("Account created successfully!");
      navigate("/");
      // Trigger auto-open of How It Works modal
      setTimeout(() => triggerAutoOpen(), 500);
    }, 1500);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Account Details";
      case 2: return "Organization Setup";
      case 3: return "Process Template";
      case 4: return mantraProviderEnabled ? "Complete Setup" : "EHR Integration";
      default: return "";
    }
  };

  return (
    <GuestRoute>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
            <p className="text-gray-600">Get started with MantraAssist</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex items-center ${step < 4 ? "flex-1" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep >= step
                        ? "bg-primary text-white shadow-md"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > step ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                        currentStep > step ? "bg-primary" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-gray-700">{getStepTitle()}</p>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {/* Step 1: Account Details */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <Input
                  label="Full Name"
                  tooltip="Enter your full name as it will appear in your account."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />

                <Input
                  label="Email"
                  type="email"
                  tooltip="This will be used for login and communication."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <Input
                  label="Password"
                  type="password"
                  tooltip="Use at least 8 characters with a mix of letters and numbers."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                {/* Phone with Country Code */}
                <div>
                  <LabelWithTooltip
                    label="Phone Number"
                    tooltip="Include your active number with country code for communication and verification."
                  />
                  <div className="flex gap-2">
                    {/* Country Selector */}
                    <div className="relative w-32">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{selectedCountry.flag}</span>
                          <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>

                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                          <div className="p-3 border-b border-gray-200">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                placeholder="Search countries..."
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(country);
                                  setShowCountryDropdown(false);
                                  setCountrySearch("");
                                }}
                                className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span className="flex-1 text-sm font-medium">{country.name}</span>
                                <span className="text-sm text-gray-500">{country.dialCode}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phone Input */}
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="1234567890"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700 flex items-start gap-1.5">
                      <span>
                        I agree to the{" "}
                        <a href="#" className="text-primary hover:underline font-medium">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-primary hover:underline font-medium">
                          Privacy Policy
                        </a>
                      </span>
                      <Tooltip text="You must agree before creating your account." placement="top">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-help flex-shrink-0 mt-0.5" />
                      </Tooltip>
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => navigate("/login")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 h-12 font-semibold"
                    onClick={handleNext}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Organization Setup */}
            {currentStep === 2 && (
              <div className="space-y-5">
                {/* MantraProvider Toggle */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">MantraProvider</p>
                      <p className="text-sm text-gray-600">Enhanced AI calling features</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMantraProviderEnabled(!mantraProviderEnabled)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        mantraProviderEnabled ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          mantraProviderEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <Input
                  label="Organization / Practitioner Name"
                  tooltip="Enter your business or practice name."
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Acme Healthcare"
                />

                <div>
                  <LabelWithTooltip
                    label="Industry"
                    tooltip="Used to suggest relevant process templates and workflows."
                  />
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select industry</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Organization Email"
                  type="email"
                  tooltip="Primary contact email for your organization."
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  placeholder="contact@acme.com"
                />

                <Input
                  label="Organization Phone"
                  type="tel"
                  tooltip="Main contact number for your organization."
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />

                {/* More Settings Toggle */}
                <div className="border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMoreSettings(!showMoreSettings)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <span className="font-medium text-gray-900">More Settings / Detailed View</span>
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
                    <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <LabelWithTooltip
                          label="Preferred Calling Time"
                          tooltip="Set the preferred time window for outbound calls."
                        />
                        <input
                          type="time"
                          value={preferredCallingTime}
                          onChange={(e) => setPreferredCallingTime(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>

                      <div>
                        <LabelWithTooltip
                          label="Time Zone"
                          tooltip="Automatically detected, but you can change it if needed."
                        />
                        <select
                          value={timeZone}
                          onChange={(e) => setTimeZone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 h-12 font-semibold"
                    onClick={handleNext}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Process Template Selection */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                    Select Process Template
                    <Tooltip text="Choose a ready-made workflow based on your industry." placement="top">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" />
                    </Tooltip>
                  </h3>
                  <p className="text-sm text-gray-700 font-medium mb-1">
                    Choose the processes you need support with.
                  </p>
                  <p className="text-xs text-gray-500">
                    All processes are selected by default. Deselect any you do not need support with.
                  </p>
                </div>

                {!industry ? (
                  <div className="p-8 bg-gray-50 rounded-xl text-center">
                    <p className="text-gray-600">Please select an industry in the previous step to see templates</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-xl text-center">
                    <p className="text-gray-600">No templates available for {industry}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => {
                      const isSelected = selectedTemplates.includes(template.id);
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => toggleTemplateSelection(template.id)}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${
                            isSelected
                              ? "border-primary bg-blue-50 shadow-md"
                              : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className={`font-semibold ${isSelected ? "text-primary" : "text-gray-900"}`}>
                              {template.name}
                            </h4>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-700"
                          }`}>
                            {template.stages} stages
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 h-12 font-semibold"
                    onClick={handleNext}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Conditional Final Step */}
            {currentStep === 4 && (
              <div className="space-y-5">
                {mantraProviderEnabled ? (
                  /* Success Screen */
                  <div className="py-8">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">All done!</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Your setup is complete and your workspace is ready. You can start making AI-powered calls right away.
                      </p>
                    </div>

                    {selectedTemplates.length > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          {selectedTemplates.length} Process{selectedTemplates.length > 1 ? 'es' : ''} Selected
                        </p>
                        <div className="space-y-1">
                          {selectedTemplates.map(templateId => {
                            const template = processTemplates.find(t => t.id === templateId);
                            return template ? (
                              <p key={templateId} className="text-sm text-blue-700">
                                • {template.name}
                              </p>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={handleBack}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1 h-12 font-semibold"
                        onClick={handleComplete}
                        loading={loading}
                      >
                        Complete Setup
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* EHR Integration */
                  <div>
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center justify-center gap-2">
                        Connect with EHR
                        <Tooltip text="Select your existing system to integrate with MantraAssist." placement="top">
                          <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-help" />
                        </Tooltip>
                      </h3>
                      <p className="text-sm text-gray-600">
                        Integrate with your existing Electronic Health Record system
                      </p>
                    </div>

                    {/* EHR Options */}
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {[
                        { id: "mantracare", name: "MantraCare", description: "Seamless integration with MantraCare" },
                        { id: "epic", name: "Epic", description: "Connect with Epic EHR system" },
                        { id: "athena", name: "Athena Health", description: "Integrate with Athena Health" },
                      ].map((ehr) => (
                        <button
                          key={ehr.id}
                          type="button"
                          onClick={() => setSelectedEHR(ehr.id)}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${
                            selectedEHR === ehr.id
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{ehr.name}</h4>
                              <p className="text-sm text-gray-600">{ehr.description}</p>
                            </div>
                            {selectedEHR === ehr.id && (
                              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* EHR-specific fields */}
                    {selectedEHR === "mantracare" && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                        <Input
                          label="Organization ID"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField1}
                          onChange={(e) => setEhrField1(e.target.value)}
                          placeholder="ORG-12345"
                        />
                        <Input
                          label="Registered Email"
                          type="email"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField2}
                          onChange={(e) => setEhrField2(e.target.value)}
                          placeholder="admin@organization.com"
                        />
                        <Input
                          label="API Key / Access Token"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField3}
                          onChange={(e) => setEhrField3(e.target.value)}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    )}

                    {selectedEHR === "epic" && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                        <Input
                          label="Instance / Tenant Name"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField1}
                          onChange={(e) => setEhrField1(e.target.value)}
                          placeholder="production"
                        />
                        <Input
                          label="Client ID"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField2}
                          onChange={(e) => setEhrField2(e.target.value)}
                          placeholder="client-abc-123"
                        />
                        <Input
                          label="Client Secret"
                          type="password"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField3}
                          onChange={(e) => setEhrField3(e.target.value)}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    )}

                    {selectedEHR === "athena" && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                        <Input
                          label="Practice ID"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField1}
                          onChange={(e) => setEhrField1(e.target.value)}
                          placeholder="12345"
                        />
                        <Input
                          label="Username / Email"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField2}
                          onChange={(e) => setEhrField2(e.target.value)}
                          placeholder="admin@practice.com"
                        />
                        <Input
                          label="API Key / Secret"
                          type="password"
                          tooltip="Enter secure credentials provided by your system."
                          value={ehrField3}
                          onChange={(e) => setEhrField3(e.target.value)}
                          placeholder="••••••••••••••••"
                        />
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleComplete}
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Skip for now
                      </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={handleBack}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1 h-12 font-semibold"
                        onClick={handleComplete}
                        loading={loading}
                      >
                        Complete Setup
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2026 MantraAssist. All rights reserved.
        </p>
      </div>
    </div>
    </GuestRoute>
  );
}
