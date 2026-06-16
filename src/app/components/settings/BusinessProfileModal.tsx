import { X, Edit, Info } from "lucide-react";

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export default function BusinessProfileModal({
  isOpen,
  onClose,
  phoneNumber,
}: BusinessProfileModalProps) {
  if (!isOpen) return null;

  const businessData = {
    businessName: "HealthCare Solutions Inc.",
    businessType: "Corporation",
    businessIndustry: "Healthcare",
    businessRegions: "National",
    registrationIdType: "EIN (Employer Identification Number)",
    registrationNumber: "12-3456789",
    websiteUrl: "https://healthcaresolutions.com",
    socialMediaUrl: "https://linkedin.com/company/healthcaresolutions",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white relative"
        style={{
          width: "680px",
          borderRadius: "12px",
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#111827",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Business Profile
          </h2>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
              style={{
                height: "32px",
                padding: "0 12px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "6px",
                fontSize: "13px",
                color: "#374151",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="hover:opacity-70 transition-opacity"
              style={{ color: "#6B7280" }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Phone Number */}
        <div
          style={{
            fontSize: "14px",
            color: "#6B7280",
            fontFamily: "Outfit, sans-serif",
            marginBottom: "16px",
          }}
        >
          {phoneNumber}
        </div>

        {/* Info Banner */}
        <div
          className="flex items-start gap-3 mb-6"
          style={{
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          <Info className="w-4 h-4" style={{ color: "#1A73E8", flexShrink: 0, marginTop: "2px" }} />
          <p
            style={{
              fontSize: "13px",
              color: "#374151",
              fontFamily: "Outfit, sans-serif",
              lineHeight: "1.5",
            }}
          >
            Business profile information is required for US numbers only to comply with carrier
            regulations and improve call delivery rates.
          </p>
        </div>

        {/* Business Information Section */}
        <div className="mb-6">
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#111827",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: "16px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            BUSINESS INFORMATION
          </h3>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Business Name */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Name
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.businessName}
              </div>
            </div>

            {/* Business Type */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Type
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.businessType}
              </div>
            </div>

            {/* Business Industry */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Industry
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.businessIndustry}
              </div>
            </div>

            {/* Business Regions of Operations */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Regions of Operations
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.businessRegions}
              </div>
            </div>

            {/* Business Registration ID Type */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Registration ID Type
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.registrationIdType}
              </div>
            </div>

            {/* Business Registration Number */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Business Registration Number
              </label>
              <div
                style={{
                  fontSize: "14px",
                  color: "#111827",
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                {businessData.registrationNumber}
              </div>
            </div>

            {/* Website URL */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Website URL
              </label>
              <a
                href={businessData.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "14px",
                  color: "#1A73E8",
                  fontFamily: "Outfit, sans-serif",
                  textDecoration: "underline",
                }}
              >
                {businessData.websiteUrl}
              </a>
            </div>

            {/* Social Media Profile URL */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#6B7280",
                  marginBottom: "6px",
                  fontFamily: "Outfit, sans-serif",
                  fontWeight: 500,
                }}
              >
                Social Media Profile URL
              </label>
              <a
                href={businessData.socialMediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "14px",
                  color: "#1A73E8",
                  fontFamily: "Outfit, sans-serif",
                  textDecoration: "underline",
                }}
              >
                {businessData.socialMediaUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
