import { useState } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";

interface VoiceSearchFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onFilterApply: (filters: VoiceFilters) => void;
}

export interface VoiceFilters {
  language: string;
  tone: string;
  gender: string;
  age: string;
  country: string;
}

export default function VoiceSearchFilter({
  searchQuery,
  onSearchChange,
  onFilterApply,
}: VoiceSearchFilterProps) {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<VoiceFilters>({
    language: "All Languages",
    tone: "All Tones",
    gender: "All Genders",
    age: "All Ages",
    country: "All Countries",
  });

  const handleApplyFilters = () => {
    onFilterApply(filters);
    setShowFilterPanel(false);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      language: "All Languages",
      tone: "All Tones",
      gender: "All Genders",
      age: "All Ages",
      country: "All Countries",
    };
    setFilters(clearedFilters);
    onFilterApply(clearedFilters);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#9CA3AF" }}
          />
          <input
            type="text"
            placeholder="Search voices..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              height: "40px",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              paddingLeft: "40px",
              paddingRight: "16px",
              fontSize: "14px",
              color: "#111827",
              fontFamily: "Outfit, sans-serif",
            }}
            className="focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="flex items-center justify-center hover:bg-gray-50 transition-colors"
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Dropdown Panel */}
      {showFilterPanel && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            onClick={() => setShowFilterPanel(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "48px",
              right: 0,
              width: "320px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "16px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 50,
            }}
          >
            <div className="space-y-3">
              {/* Language Filter */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#374151",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Language
                </label>
                <div className="relative">
                  <select
                    value={filters.language}
                    onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                    style={{
                      width: "100%",
                      height: "36px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "0 32px 0 12px",
                      fontSize: "13px",
                      color: "#374151",
                      fontFamily: "Outfit, sans-serif",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All Languages">All Languages</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="Korean">Korean</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#9CA3AF", width: "14px", height: "14px" }}
                  />
                </div>
              </div>

              {/* Tone Filter */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#374151",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Tone
                </label>
                <div className="relative">
                  <select
                    value={filters.tone}
                    onChange={(e) => setFilters({ ...filters, tone: e.target.value })}
                    style={{
                      width: "100%",
                      height: "36px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "0 32px 0 12px",
                      fontSize: "13px",
                      color: "#374151",
                      fontFamily: "Outfit, sans-serif",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All Tones">All Tones</option>
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Casual">Casual</option>
                    <option value="Formal">Formal</option>
                    <option value="Empathetic">Empathetic</option>
                    <option value="Energetic">Energetic</option>
                    <option value="Calm">Calm</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#9CA3AF", width: "14px", height: "14px" }}
                  />
                </div>
              </div>

              {/* Gender Filter */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#374151",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Gender
                </label>
                <div className="relative">
                  <select
                    value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                    style={{
                      width: "100%",
                      height: "36px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "0 32px 0 12px",
                      fontSize: "13px",
                      color: "#374151",
                      fontFamily: "Outfit, sans-serif",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All Genders">All Genders</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#9CA3AF", width: "14px", height: "14px" }}
                  />
                </div>
              </div>

              {/* Age Filter */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#374151",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Age
                </label>
                <div className="relative">
                  <select
                    value={filters.age}
                    onChange={(e) => setFilters({ ...filters, age: e.target.value })}
                    style={{
                      width: "100%",
                      height: "36px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "0 32px 0 12px",
                      fontSize: "13px",
                      color: "#374151",
                      fontFamily: "Outfit, sans-serif",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All Ages">All Ages</option>
                    <option value="Young">Young</option>
                    <option value="Mid">Mid</option>
                    <option value="Mature">Mature</option>
                    <option value="Senior">Senior</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#9CA3AF", width: "14px", height: "14px" }}
                  />
                </div>
              </div>

              {/* Country Filter */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#374151",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  Country
                </label>
                <div className="relative">
                  <select
                    value={filters.country}
                    onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                    style={{
                      width: "100%",
                      height: "36px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      padding: "0 32px 0 12px",
                      fontSize: "13px",
                      color: "#374151",
                      fontFamily: "Outfit, sans-serif",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="All Countries">All Countries</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="India">India</option>
                    <option value="Australia">Australia</option>
                    <option value="Canada">Canada</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Ireland">Ireland</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Singapore">Singapore</option>
                    <option value="UAE">UAE</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#9CA3AF", width: "14px", height: "14px" }}
                  />
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyFilters}
              className="hover:opacity-90 transition-opacity"
              style={{
                width: "100%",
                height: "40px",
                backgroundColor: "#1A73E8",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: "bold",
                fontFamily: "Outfit, sans-serif",
                borderRadius: "8px",
                border: "none",
                marginTop: "16px",
                cursor: "pointer",
              }}
            >
              Apply Filters
            </button>

            {/* Clear All Link */}
            <button
              onClick={handleClearAll}
              className="hover:underline"
              style={{
                width: "100%",
                backgroundColor: "transparent",
                border: "none",
                color: "#1A73E8",
                fontSize: "12px",
                fontFamily: "Outfit, sans-serif",
                marginTop: "8px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Clear All
            </button>
          </div>
        </>
      )}
    </div>
  );
}
