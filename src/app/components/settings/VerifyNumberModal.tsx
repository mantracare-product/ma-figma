import { X, Check, Info, Plus, Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Representative {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  businessTitle: string;
  jobPosition: string;
}

interface VerifyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export default function VerifyNumberModal({
  isOpen,
  onClose,
  phoneNumber,
}: VerifyNumberModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = useState(false);
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [showRegionsDropdown, setShowRegionsDropdown] = useState(false);
  const [showIdTypeDropdown, setShowIdTypeDropdown] = useState(false);
  const [showJobPositionDropdown, setShowJobPositionDropdown] = useState<string | null>(null);
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState<string | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Step 1 - Business Profile
  const [businessProfile, setBusinessProfile] = useState({
    businessName: "",
    businessType: "",
    businessIndustry: "",
    businessRegions: "",
    registrationIdType: "",
    registrationNumber: "",
    websiteUrl: "https://",
    socialMediaUrl: "https://",
  });

  // Step 2 - Representatives
  const [representatives, setRepresentatives] = useState<Representative[]>([
    {
      id: "1",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      countryCode: "+1",
      businessTitle: "",
      jobPosition: "",
    },
  ]);

  // Step 3 - Physical Address
  const [address, setAddress] = useState({
    customerName: "",
    street: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
  });

  // Step 4 - Phone Numbers
  const [displayNames, setDisplayNames] = useState<{ [key: string]: string }>({
    [phoneNumber]: "",
  });

  if (!isOpen) return null;

  const steps = [
    { number: 1, label: "Business Profile" },
    { number: 2, label: "Representatives" },
    { number: 3, label: "Physical Address" },
    { number: 4, label: "Phone Numbers" },
    { number: 5, label: "Review & Submit" },
  ];

  const businessTypes = ["Sole Proprietor", "Partnership", "Corporation", "LLC", "Non-Profit"];
  const industries = ["Healthcare", "Technology", "Finance", "Real Estate", "Retail", "Education"];
  const regions = ["Local", "Regional", "National", "International"];
  const idTypes = ["EIN (Employer Identification Number)", "SSN (Social Security Number)", "DUNS Number", "State Tax ID"];
  const jobPositions = ["CEO", "CFO", "CTO", "Director", "Manager", "Representative", "Owner"];
  const countryCodes = ["+1", "+44", "+91", "+61", "+86"];
  const countries = ["United States", "United Kingdom", "Canada", "Australia", "India"];

  const addRepresentative = () => {
    setRepresentatives([
      ...representatives,
      {
        id: Date.now().toString(),
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        countryCode: "+1",
        businessTitle: "",
        jobPosition: "",
      },
    ]);
  };

  const removeRepresentative = (id: string) => {
    if (representatives.length > 1) {
      setRepresentatives(representatives.filter((r) => r.id !== id));
    }
  };

  const updateRepresentative = (id: string, field: keyof Representative, value: string) => {
    setRepresentatives(
      representatives.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white relative"
        style={{
          width: "800px",
          maxWidth: "90vw",
          borderRadius: "12px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 bg-white z-10"
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#111827",
              }}
            >
              Verify Phone Number
            </h2>
            <button
              onClick={onClose}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "#6B7280" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            {phoneNumber}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center" style={{ minWidth: "80px" }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: step.number <= currentStep ? "#4F8EF7" : "#E5E7EB",
                      color: step.number <= currentStep ? "#FFFFFF" : "#6B7280",
                      fontWeight: "bold",
                      fontSize: "14px",
                      marginBottom: "6px",
                    }}
                  >
                    {step.number < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: step.number === currentStep ? "#4F8EF7" : "#6B7280",
                      fontWeight: step.number === currentStep ? "600" : "400",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: "2px",
                      backgroundColor: step.number < currentStep ? "#4F8EF7" : "#E5E7EB",
                      marginBottom: "30px",
                      marginLeft: "4px",
                      marginRight: "4px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Info Banner */}
          <div
            className="flex items-start gap-3"
            style={{
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <Info className="w-4 h-4" style={{ color: "#4F8EF7", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
              🇺🇸 US numbers only — Business Verification, Spam Call Protection, and Caller ID are only applicable for US phone numbers.
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div style={{ padding: "24px" }}>
          {/* Step 1 - Business Profile */}
          {currentStep === 1 && (
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                }}
              >
                Business Profile
              </h3>

              <div className="space-y-4">
                {/* Business Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Business Name <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={businessProfile.businessName}
                    onChange={(e) =>
                      setBusinessProfile({ ...businessProfile, businessName: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="Enter business name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Business Type */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Business Type <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowBusinessTypeDropdown(!showBusinessTypeDropdown)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "6px",
                          fontSize: "14px",
                          textAlign: "left",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: businessProfile.businessType ? "#111827" : "#9CA3AF" }}>
                          {businessProfile.businessType || "Select type"}
                        </span>
                        <ChevronDown className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                      {showBusinessTypeDropdown && (
                        <>
                          <div
                            className="fixed inset-0"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowBusinessTypeDropdown(false)}
                          />
                          <div
                            className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {businessTypes.map((type) => (
                              <button
                                key={type}
                                onClick={() => {
                                  setBusinessProfile({ ...businessProfile, businessType: type });
                                  setShowBusinessTypeDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Business Industry */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Business Industry <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowIndustryDropdown(!showIndustryDropdown)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "6px",
                          fontSize: "14px",
                          textAlign: "left",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: businessProfile.businessIndustry ? "#111827" : "#9CA3AF" }}>
                          {businessProfile.businessIndustry || "Select industry"}
                        </span>
                        <ChevronDown className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                      {showIndustryDropdown && (
                        <>
                          <div
                            className="fixed inset-0"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowIndustryDropdown(false)}
                          />
                          <div
                            className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {industries.map((industry) => (
                              <button
                                key={industry}
                                onClick={() => {
                                  setBusinessProfile({ ...businessProfile, businessIndustry: industry });
                                  setShowIndustryDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              >
                                {industry}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Business Regions */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Business Regions of Operations <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowRegionsDropdown(!showRegionsDropdown)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "6px",
                          fontSize: "14px",
                          textAlign: "left",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: businessProfile.businessRegions ? "#111827" : "#9CA3AF" }}>
                          {businessProfile.businessRegions || "Select regions"}
                        </span>
                        <ChevronDown className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                      {showRegionsDropdown && (
                        <>
                          <div
                            className="fixed inset-0"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowRegionsDropdown(false)}
                          />
                          <div
                            className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {regions.map((region) => (
                              <button
                                key={region}
                                onClick={() => {
                                  setBusinessProfile({ ...businessProfile, businessRegions: region });
                                  setShowRegionsDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              >
                                {region}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Registration ID Type */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Business Registration ID Type <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowIdTypeDropdown(!showIdTypeDropdown)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "6px",
                          fontSize: "14px",
                          textAlign: "left",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: businessProfile.registrationIdType ? "#111827" : "#9CA3AF" }}>
                          {businessProfile.registrationIdType || "Select ID type"}
                        </span>
                        <ChevronDown className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                      {showIdTypeDropdown && (
                        <>
                          <div
                            className="fixed inset-0"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowIdTypeDropdown(false)}
                          />
                          <div
                            className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {idTypes.map((type) => (
                              <button
                                key={type}
                                onClick={() => {
                                  setBusinessProfile({ ...businessProfile, registrationIdType: type });
                                  setShowIdTypeDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Registration Number */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Business Registration Number <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={businessProfile.registrationNumber}
                    onChange={(e) =>
                      setBusinessProfile({ ...businessProfile, registrationNumber: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="Enter registration number"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Website URL <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={businessProfile.websiteUrl}
                    onChange={(e) =>
                      setBusinessProfile({ ...businessProfile, websiteUrl: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="https://"
                  />
                </div>

                {/* Social Media URL */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Social Media Profile URL <span style={{ color: "#9CA3AF", fontWeight: "400" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={businessProfile.socialMediaUrl}
                    onChange={(e) =>
                      setBusinessProfile({ ...businessProfile, socialMediaUrl: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 - Representatives */}
          {currentStep === 2 && (
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                }}
              >
                Representatives
              </h3>

              <div className="space-y-6">
                {representatives.map((rep, index) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      position: "relative",
                    }}
                  >
                    {representatives.length > 1 && (
                      <button
                        onClick={() => removeRepresentative(rep.id)}
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          color: "#DC2626",
                        }}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#6B7280",
                        marginBottom: "12px",
                      }}
                    >
                      Representative {index + 1}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                              fontWeight: "500",
                            }}
                          >
                            First Name <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={rep.firstName}
                            onChange={(e) => updateRepresentative(rep.id, "firstName", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                              fontWeight: "500",
                            }}
                          >
                            Last Name <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={rep.lastName}
                            onChange={(e) => updateRepresentative(rep.id, "lastName", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#374151",
                            marginBottom: "6px",
                            fontWeight: "500",
                          }}
                        >
                          Email <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={rep.email}
                          onChange={(e) => updateRepresentative(rep.id, "email", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid #D1D5DB",
                            borderRadius: "6px",
                            fontSize: "14px",
                          }}
                          placeholder="email@example.com"
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#374151",
                            marginBottom: "6px",
                            fontWeight: "500",
                          }}
                        >
                          Phone Number <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="relative" style={{ width: "100px" }}>
                            <button
                              onClick={() =>
                                setShowCountryCodeDropdown(
                                  showCountryCodeDropdown === rep.id ? null : rep.id
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #D1D5DB",
                                borderRadius: "6px",
                                fontSize: "14px",
                                textAlign: "left",
                                backgroundColor: "#FFFFFF",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>{rep.countryCode}</span>
                              <ChevronDown className="w-3 h-3" style={{ color: "#6B7280" }} />
                            </button>
                            {showCountryCodeDropdown === rep.id && (
                              <>
                                <div
                                  className="fixed inset-0"
                                  style={{ zIndex: 5 }}
                                  onClick={() => setShowCountryCodeDropdown(null)}
                                />
                                <div
                                  className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                                  style={{ maxHeight: "200px", overflowY: "auto" }}
                                >
                                  {countryCodes.map((code) => (
                                    <button
                                      key={code}
                                      onClick={() => {
                                        updateRepresentative(rep.id, "countryCode", code);
                                        setShowCountryCodeDropdown(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                    >
                                      {code}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <input
                            type="tel"
                            value={rep.phoneNumber}
                            onChange={(e) => updateRepresentative(rep.id, "phoneNumber", e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px 10px",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                              fontWeight: "500",
                            }}
                          >
                            Business Title <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={rep.businessTitle}
                            onChange={(e) => updateRepresentative(rep.id, "businessTitle", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              fontSize: "14px",
                            }}
                            placeholder="e.g., Account Manager"
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                              fontWeight: "500",
                            }}
                          >
                            Job Position <span style={{ color: "#DC2626" }}>*</span>
                          </label>
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowJobPositionDropdown(
                                  showJobPositionDropdown === rep.id ? null : rep.id
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #D1D5DB",
                                borderRadius: "6px",
                                fontSize: "14px",
                                textAlign: "left",
                                backgroundColor: "#FFFFFF",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ color: rep.jobPosition ? "#111827" : "#9CA3AF" }}>
                                {rep.jobPosition || "Select position"}
                              </span>
                              <ChevronDown className="w-3 h-3" style={{ color: "#6B7280" }} />
                            </button>
                            {showJobPositionDropdown === rep.id && (
                              <>
                                <div
                                  className="fixed inset-0"
                                  style={{ zIndex: 5 }}
                                  onClick={() => setShowJobPositionDropdown(null)}
                                />
                                <div
                                  className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                                  style={{ maxHeight: "200px", overflowY: "auto" }}
                                >
                                  {jobPositions.map((position) => (
                                    <button
                                      key={position}
                                      onClick={() => {
                                        updateRepresentative(rep.id, "jobPosition", position);
                                        setShowJobPositionDropdown(null);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                                    >
                                      {position}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addRepresentative}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#4F8EF7",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Add Representative
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Physical Address */}
          {currentStep === 3 && (
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                }}
              >
                Physical Address
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Customer Name <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={address.customerName}
                    onChange={(e) => setAddress({ ...address, customerName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#374151",
                      marginBottom: "6px",
                      fontWeight: "500",
                    }}
                  >
                    Street <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="Enter street address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      City <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Enter city"
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Region <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={address.region}
                      onChange={(e) => setAddress({ ...address, region: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Enter region/state"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Postal Code <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={address.postalCode}
                      onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Enter postal code"
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Country <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #D1D5DB",
                          borderRadius: "6px",
                          fontSize: "14px",
                          textAlign: "left",
                          backgroundColor: "#FFFFFF",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: address.country ? "#111827" : "#9CA3AF" }}>
                          {address.country || "Select country"}
                        </span>
                        <ChevronDown className="w-4 h-4" style={{ color: "#6B7280" }} />
                      </button>
                      {showCountryDropdown && (
                        <>
                          <div
                            className="fixed inset-0"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowCountryDropdown(false)}
                          />
                          <div
                            className="absolute left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-10 py-1"
                            style={{ maxHeight: "200px", overflowY: "auto" }}
                          >
                            {countries.map((country) => (
                              <button
                                key={country}
                                onClick={() => {
                                  setAddress({ ...address, country });
                                  setShowCountryDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 - Phone Numbers */}
          {currentStep === 4 && (
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "12px",
                }}
              >
                Phone Numbers
              </h3>

              <div
                className="flex items-start gap-3 mb-5"
                style={{
                  backgroundColor: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <Info className="w-4 h-4" style={{ color: "#4F8EF7", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                  🇺🇸 US numbers only — Only US phone numbers are shown here. Add a US number to assign display names.
                </p>
              </div>

              <div className="space-y-4">
                <div
                  style={{
                    padding: "16px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
                    {phoneNumber}
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        color: "#374151",
                        marginBottom: "6px",
                        fontWeight: "500",
                      }}
                    >
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayNames[phoneNumber]}
                      onChange={(e) => setDisplayNames({ ...displayNames, [phoneNumber]: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #D1D5DB",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 - Review & Submit */}
          {currentStep === 5 && (
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "20px",
                }}
              >
                Review your submission
              </h3>

              <div className="space-y-6">
                {/* Business Profile Section */}
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Business Profile
                  </h4>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#F9FAFB",
                      borderRadius: "8px",
                    }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Business Name</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.businessName || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Business Type</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.businessType || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Industry</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.businessIndustry || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Regions</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.businessRegions || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>ID Type</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.registrationIdType || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Registration Number</div>
                        <div style={{ fontSize: "14px", color: "#111827" }}>{businessProfile.registrationNumber || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Website URL</div>
                        <div style={{ fontSize: "14px", color: "#4F8EF7" }}>{businessProfile.websiteUrl}</div>
                      </div>
                      {businessProfile.socialMediaUrl !== "https://" && (
                        <div>
                          <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "4px" }}>Social Media</div>
                          <div style={{ fontSize: "14px", color: "#4F8EF7" }}>{businessProfile.socialMediaUrl}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Representatives Section */}
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Representatives
                  </h4>
                  <div className="space-y-3">
                    {representatives.map((rep, index) => (
                      <div
                        key={rep.id}
                        style={{
                          padding: "12px",
                          backgroundColor: "#F9FAFB",
                          borderRadius: "8px",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                          Representative {index + 1}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span style={{ color: "#6B7280" }}>Name: </span>
                            <span style={{ color: "#111827" }}>{rep.firstName} {rep.lastName}</span>
                          </div>
                          <div>
                            <span style={{ color: "#6B7280" }}>Email: </span>
                            <span style={{ color: "#111827" }}>{rep.email || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "#6B7280" }}>Phone: </span>
                            <span style={{ color: "#111827" }}>{rep.countryCode} {rep.phoneNumber || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "#6B7280" }}>Title: </span>
                            <span style={{ color: "#111827" }}>{rep.businessTitle || "—"}</span>
                          </div>
                          <div>
                            <span style={{ color: "#6B7280" }}>Position: </span>
                            <span style={{ color: "#111827" }}>{rep.jobPosition || "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address Section */}
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Physical Address
                  </h4>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#F9FAFB",
                      borderRadius: "8px",
                    }}
                  >
                    <div className="space-y-2 text-sm">
                      <div>
                        <span style={{ color: "#6B7280" }}>Customer Name: </span>
                        <span style={{ color: "#111827" }}>{address.customerName || "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Street: </span>
                        <span style={{ color: "#111827" }}>{address.street || "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>City: </span>
                        <span style={{ color: "#111827" }}>{address.city || "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Region: </span>
                        <span style={{ color: "#111827" }}>{address.region || "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Postal Code: </span>
                        <span style={{ color: "#111827" }}>{address.postalCode || "—"}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Country: </span>
                        <span style={{ color: "#111827" }}>{address.country || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Numbers Section */}
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#6B7280",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Phone Numbers
                  </h4>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#F9FAFB",
                      borderRadius: "8px",
                    }}
                  >
                    <div className="space-y-2 text-sm">
                      <div>
                        <span style={{ color: "#6B7280" }}>Number: </span>
                        <span style={{ color: "#111827" }}>{phoneNumber}</span>
                      </div>
                      <div>
                        <span style={{ color: "#6B7280" }}>Display Name: </span>
                        <span style={{ color: "#111827" }}>{displayNames[phoneNumber] || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 bg-white"
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              style={{
                padding: "10px 20px",
                border: "1px solid #D1D5DB",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#374151",
                backgroundColor: "#FFFFFF",
              }}
              className="hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep === 5 ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onClose();
                }}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #4F8EF7",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#4F8EF7",
                  backgroundColor: "#FFFFFF",
                }}
                className="hover:bg-blue-50 transition-colors"
              >
                Verify
              </button>
              <button
                onClick={() => {
                  onClose();
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#FFFFFF",
                  backgroundColor: "#4F8EF7",
                }}
                className="hover:opacity-90 transition-opacity"
              >
                Submit profile
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              style={{
                padding: "10px 24px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#FFFFFF",
                backgroundColor: "#4F8EF7",
              }}
              className="hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
