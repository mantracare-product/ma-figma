import { Check, CheckCircle, Play } from "lucide-react";

interface VoiceCardProps {
  name: string;
  gender: string;
  country: string;
  tags: string[];
  isSelected: boolean;
  onSelect?: () => void;
  onPreview?: () => void;
  showSelectButton?: boolean;
}

export default function VoiceCard({
  name,
  gender,
  country,
  tags,
  isSelected,
  onSelect,
  onPreview,
  showSelectButton = true,
}: VoiceCardProps) {
  return (
    <div
      className="relative bg-white rounded-lg p-4"
      style={{
        border: isSelected ? "2px solid #1A73E8" : "1px solid #E5E7EB",
        backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
      }}
    >
      {/* Selected Badge - Top Right */}
      {isSelected && (
        <div
          className="absolute top-3 right-3 flex items-center justify-center"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "#1A73E8",
          }}
        >
          <Check className="w-3.5 h-3.5" style={{ color: "#FFFFFF" }} />
        </div>
      )}

      {/* Voice Name */}
      <h3
        style={{
          fontSize: "15px",
          fontWeight: "bold",
          color: "#111827",
          fontFamily: "DM Sans, sans-serif",
          marginBottom: "4px",
        }}
      >
        {name}
      </h3>

      {/* Gender • Country */}
      <p
        style={{
          fontSize: "13px",
          color: "#6B7280",
          fontFamily: "Outfit, sans-serif",
          marginBottom: "8px",
        }}
      >
        {gender} • {country}
      </p>

      {/* Tag Pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map((tag, index) => (
          <span
            key={index}
            style={{
              backgroundColor: "#F3F4F6",
              color: "#374151",
              fontSize: "11px",
              borderRadius: "4px",
              padding: "4px 6px",
              height: "24px",
              display: "inline-flex",
              alignItems: "center",
              fontFamily: "Outfit, sans-serif",
              fontWeight: 500,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {showSelectButton && (
          <button
            onClick={onSelect}
            className="flex-1 flex items-center justify-center gap-1.5 transition-colors"
            style={{
              height: "36px",
              backgroundColor: isSelected ? "#22C55E" : "#1A73E8",
              color: "#FFFFFF",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 500,
              fontFamily: "Outfit, sans-serif",
              cursor: "pointer",
            }}
          >
            <Check className="w-3.5 h-3.5" />
            {isSelected ? "Selected" : "Select"}
          </button>
        )}
        <button
          onClick={onPreview}
          className={`${showSelectButton ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors`}
          style={{
            height: "36px",
            backgroundColor: "#FFFFFF",
            color: "#374151",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "Outfit, sans-serif",
            cursor: "pointer",
          }}
        >
          <Play className="w-3.5 h-3.5" />
          Preview
        </button>
      </div>
    </div>
  );
}
