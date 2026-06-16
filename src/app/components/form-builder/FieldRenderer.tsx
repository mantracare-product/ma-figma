import { useState } from "react";
import {
  GripVertical,
  Settings as SettingsIcon,
  Copy,
  Trash2,
  Zap,
  Upload,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";

interface FieldOption {
  id: number;
  label: string;
  value: string;
}

interface FormField {
  id: number;
  name: string;
  type: string;
  placeholder: string;
  required: boolean;
  essential: boolean;
  label?: string;
  helpText?: string;
  validation?: string;
  options?: FieldOption[];
  allowOther?: boolean;
  defaultValue?: string;
}

interface FieldRendererProps {
  field: FormField;
  isSelected: boolean;
  isDropTarget: boolean;
  fieldValue: any;
  onFieldClick: () => void;
  onFieldChange: (value: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onConditionalLogic: () => void;
}

export default function FieldRenderer({
  field,
  isSelected,
  isDropTarget,
  fieldValue,
  onFieldClick,
  onFieldChange,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onConditionalLogic,
}: FieldRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const renderFieldInput = () => {
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            placeholder={field.placeholder}
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        );

      case "select":
        return (
          <select
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
            style={{
              fontFamily: "Outfit, sans-serif",
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0.5rem center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.5em 1.5em",
              paddingRight: "2.5rem",
            }}
          >
            <option value="">{field.placeholder || "Select an option..."}</option>
            {field.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
            {field.allowOther && <option value="other">Other</option>}
          </select>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-sm text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {option.label}
                </span>
              </label>
            ))}
            {field.allowOther && (
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <input
                  type="checkbox"
                  value="other"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-sm text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Other
                </span>
              </label>
            )}
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
              >
                <input
                  type="radio"
                  name={`radio-${field.id}`}
                  value={option.value}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-sm text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {option.label}
                </span>
              </label>
            ))}
            {field.allowOther && (
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                <input
                  type="radio"
                  name={`radio-${field.id}`}
                  value="other"
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-sm text-gray-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Other
                </span>
              </label>
            )}
          </div>
        );

      case "file":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary hover:bg-blue-50/50 transition-all cursor-pointer">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
              PDF, DOC, JPG, PNG (max 10MB)
            </p>
          </div>
        );

      case "date":
        return (
          <div className="relative">
            <input
              type="date"
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        );

      case "time":
        return (
          <div className="relative">
            <input
              type="time"
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        );

      case "tel":
        return (
          <div className="flex gap-2">
            <select
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-20"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <option>🇺🇸 +1</option>
              <option>🇬🇧 +44</option>
              <option>🇨🇦 +1</option>
            </select>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        );

      case "address":
        return (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Street Address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <input
              type="text"
              placeholder="Apartment, suite, etc. (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="City"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <input
                type="text"
                placeholder="State"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="ZIP Code"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
              </select>
            </div>
          </div>
        );

      case "signature":
        return (
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
            <div className="border-b-2 border-dashed border-gray-300 h-24 flex items-end justify-center pb-2">
              <span className="text-xs text-gray-400 italic" style={{ fontFamily: "Courier New, monospace" }}>
                Sign here
              </span>
            </div>
            <button className="mt-2 text-xs text-primary hover:text-primary/80 font-medium">Clear</button>
          </div>
        );

      case "rating":
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onFieldChange(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (fieldValue || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case "toggle":
        return (
          <button
            onClick={() => onFieldChange(!fieldValue)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              fieldValue ? "bg-primary" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                fieldValue ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        );

      case "color":
        return (
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={fieldValue || "#3B82F6"}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={fieldValue || "#3B82F6"}
              onChange={(e) => onFieldChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        );

      case "password":
        return (
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={field.placeholder}
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        );

      case "divider":
        return <div className="border-t-2 border-gray-300 my-4"></div>;

      case "pagebreak":
        return (
          <div className="border-2 border-dashed border-primary rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
              <span>Page Break</span>
              <span className="text-xs bg-primary/10 px-2 py-1 rounded">Step 1 of 3</span>
            </div>
          </div>
        );

      case "number":
        return (
          <div className="relative">
            <input
              type="number"
              placeholder={field.placeholder}
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
              <button className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-500 text-xs">▲</button>
              <button className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-500 text-xs">▼</button>
            </div>
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        );
    }
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative border rounded-lg p-4 cursor-move transition-all ${
        isSelected
          ? "border-primary bg-blue-50 shadow-sm"
          : isDropTarget
          ? "border-primary border-2 bg-blue-50"
          : "border-gray-200 hover:border-primary hover:bg-gray-50 hover:shadow-md"
      }`}
      onClick={onFieldClick}
    >
      {/* Drop indicator line */}
      {isDropTarget && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary"></div>
      )}

      <div className="flex items-start gap-3">
        <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing" />

        <div className="flex-1 min-w-0">
          <label
            className="block text-sm font-medium mb-2"
            style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}
          >
            {field.label || field.name} {field.required && <span className="text-red-500">*</span>}{" "}
            {field.essential && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Essential
              </span>
            )}
          </label>

          {renderFieldInput()}

          {field.helpText && (
            <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              {field.helpText}
            </p>
          )}
        </div>

        {/* Hover Toolbar */}
        <div
          className={`flex items-center gap-1 transition-opacity ${
            isHovered || isSelected ? "opacity-100" : "opacity-0"
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFieldClick();
            }}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors group/btn"
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4 text-gray-500 group-hover/btn:text-primary" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors group/btn"
            title="Duplicate"
          >
            <Copy className="w-4 h-4 text-gray-500 group-hover/btn:text-primary" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConditionalLogic();
            }}
            className="p-1.5 hover:bg-blue-100 rounded transition-colors group/btn"
            title="Conditional Logic"
          >
            <Zap className="w-4 h-4 text-gray-500 group-hover/btn:text-amber-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 hover:bg-red-100 rounded transition-colors group/btn"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-gray-500 group-hover/btn:text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
