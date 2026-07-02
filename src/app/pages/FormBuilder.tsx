import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { createPortal } from "react-dom";
import { Plus, FileText, Sliders, X, Trash2, GripVertical, Settings as SettingsIcon, Minus, ChevronDown, Upload, Eye, EyeOff, Star, Calendar, Clock, MapPin, Code, Minus as MinusIcon, Palette, Copy, Zap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import FieldRenderer from "../components/form-builder/FieldRenderer";
import FormSettings from "../components/form-builder/FormSettings";

interface FieldOption {
  id: number;
  label: string;
  value: string;
  sourceVariable?: string;
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

interface Template {
  id: number;
  name: string;
  fields: string[];
  buttonText: string;
  description: string;
  stats: string;
}

const FETCH_FIELD_SOURCES = [
  {
    value: "system", label: "System Fields", fields: [
      { value: "contact_name", label: "Contact Name" },
      { value: "contact_email", label: "Contact Email" },
      { value: "contact_phone", label: "Contact Phone" },
      { value: "country", label: "Country" },
      { value: "language", label: "Language" },
    ]
  },
  {
    value: "call-log", label: "Call Log Fields", fields: [
      { value: "call_status", label: "Call Status" },
      { value: "call_duration", label: "Call Duration" },
      { value: "call_sentiment", label: "Sentiment" },
      { value: "call_intent", label: "Intent" },
      { value: "call_summary", label: "Call Summary" },
      { value: "call_transcription", label: "Call Transcription" },
    ]
  },
  {
    value: "stage", label: "Stage Fields", fields: [
      { value: "stage_name", label: "Stage Name" },
      { value: "stage_entered_at", label: "Stage Entered At" },
    ]
  },
  {
    value: "process", label: "Process Fields", fields: [
      { value: "process_name", label: "Process Name" },
      { value: "process_status", label: "Process Status" },
    ]
  },
  {
    value: "appointment", label: "Appointment Fields", fields: [
      { value: "appointment_date", label: "Appointment Date" },
      { value: "appointment_time", label: "Appointment Time" },
      { value: "appointment_status", label: "Appointment Status" },
      { value: "appointment_with", label: "Appointment With" },
    ]
  },
  {
    value: "org", label: "Organization Fields", fields: [
      { value: "org_name", label: "Organization Name" },
      { value: "org_domain", label: "Organization Domain" },
    ]
  },
  {
    value: "custom", label: "Custom Fields", fields: [
      { value: "custom_field_1", label: "Custom Field 1" },
      { value: "custom_field_2", label: "Custom Field 2" },
    ]
  },
];

const FIELDS_BY_SOURCE_MAP = Object.fromEntries(
  FETCH_FIELD_SOURCES.map(src => [src.value, src.fields])
);

interface VariablePickerButtonProps {
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
  onBeforeOpen?: () => void;
  mode?: "insert" | "replace";
}

const VariablePickerButton: React.FC<VariablePickerButtonProps> = ({
  targetRef,
  value,
  onChange,
  label = "Insert Variable",
  onBeforeOpen,
  mode = "insert"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  const handleSelectField = (fieldValue: string) => {
    const insertText = `{{${fieldValue}}}`;
    if (mode === "replace") {
      onChange(insertText);
      setIsOpen(false);
      return;
    }
    const textarea = targetRef?.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentVal = value || "";

    const newValue = currentVal.slice(0, start) + insertText + currentVal.slice(end);
    onChange(newValue);
    setIsOpen(false);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const openDropdown = () => {
    if (onBeforeOpen) {
      onBeforeOpen();
    }
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
  };

  // Close on ancestor scroll/resize, but NOT when the user scrolls inside the dropdown list itself
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e: Event) => {
      if (dropdownPanelRef.current && dropdownPanelRef.current.contains(e.target as Node)) return;
      closeDropdown();
    };
    const handleResize = () => closeDropdown();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeDropdown() : openDropdown())}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {label}
      </button>

      {isOpen && dropdownPos && createPortal(
        <>
          <div
            className="fixed inset-0 cursor-default"
            style={{ zIndex: 9998 }}
            onClick={closeDropdown}
          />
          <div
            ref={dropdownPanelRef}
            className="bg-white rounded-xl shadow-[0px_8px_32px_rgba(0,0,0,0.12)] border border-gray-200 overflow-hidden flex flex-col"
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              width: '256px',
              maxHeight: '256px',
              zIndex: 9999,
            }}
          >
            <div className="p-2 border-b border-gray-100 bg-gray-50/50">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Insert Field Variable
              </span>
            </div>
            <div className="overflow-y-auto flex-1 py-1 max-h-[220px]">
              {FETCH_FIELD_SOURCES.map(group => (
                <div key={group.value}>
                  <div
                    className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-50/30 border-y border-gray-100/50 first:border-t-0"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {group.label}
                  </div>
                  <div className="py-0.5">
                    {group.fields.map(field => (
                      <button
                        key={field.value}
                        type="button"
                        onClick={() => handleSelectField(field.value)}
                        className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-between"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        <span>{field.label}</span>
                        <span className="text-[9px] text-gray-400 font-mono">
                          {`{{${field.value}}}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template as Template | undefined;
  const existingForm = location.state?.form as {
    id: number;
    name: string;
    description?: string;
    fields?: FormField[];
    submitButtonText?: string;
    status?: string;
  } | undefined;
  const returnTo = location.state?.returnTo as { tab: string; flowId: number } | undefined;

  const sidebarInputRef = useRef<HTMLInputElement>(null);
  const sidebarSelectRef = useRef<HTMLInputElement>(null);
  // optionSourceRefs not needed with replace mode — removed

  const [currentTab, setCurrentTab] = useState<"build" | "design" | "live">("build");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [submitButtonText, setSubmitButtonText] = useState("");
  const [backgroundTheme, setBackgroundTheme] = useState<"light" | "dark">("light");
  const [typography, setTypography] = useState("Open Sans (Friendly)");
  const [buttonColor, setButtonColor] = useState("#007AFF");
  const [customUrlSlug, setCustomUrlSlug] = useState("");
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [draggedFieldType, setDraggedFieldType] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [hoveredFieldId, setHoveredFieldId] = useState<number | null>(null);
  const [fieldValues, setFieldValues] = useState<{ [key: number]: any }>({});
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    general: true,
    appearance: false,
    validation: false,
    conditionalLogic: false,
    advanced: false,
    integrations: false,
  });

  useEffect(() => {
    if (template) {
      setFormTitle(template.name);
      setFormDescription(template.name === "Contact Form"
        ? "We'd love to hear from you. Fill out the form below and we'll get back to you within 24 hours."
        : template.description);
      setSubmitButtonText(template.buttonText);

      const defaultFields: FormField[] = template.fields.map((field, idx) => ({
        id: idx + 1,
        name: field,
        type: field === "Email" ? "email" : field === "Phone" ? "phone" : field.toLowerCase().includes("message") || field.toLowerCase().includes("details") || field.toLowerCase().includes("requirements") ? "textarea" : "text",
        placeholder: `Enter your ${field.toLowerCase()}`,
        required: true,
        essential: idx < 3,
      }));

      setFormFields(defaultFields);
    } else if (existingForm) {
      setFormTitle(existingForm.name);
      setFormDescription(existingForm.description || "");
      setSubmitButtonText(existingForm.submitButtonText || "Submit");
      setFormFields((existingForm.fields || []).map((f: any, idx) => ({
        id: f.id ?? (idx + 1),
        name: f.name || f.label || "",
        type: f.type || "text",
        placeholder: f.placeholder || "",
        required: f.required || false,
        essential: f.essential || false,
        label: f.label || f.name || "",
        helpText: f.helpText || "",
        options: f.options,
        allowOther: f.allowOther || false,
        defaultValue: f.defaultValue || "",
      })));
    } else {
      setFormTitle("Untitled Form");
      setFormDescription("");
      setSubmitButtonText("Submit");
      setFormFields([]);
    }
  }, []);

  const handleNextTab = () => {
    if (currentTab === "build") {
      setCurrentTab("design");
    } else if (currentTab === "design") {
      setCurrentTab("live");
    }
  };

  const handleBackTab = () => {
    if (currentTab === "design") {
      setCurrentTab("build");
    } else if (currentTab === "live") {
      setCurrentTab("design");
    }
  };

  const handleSaveDraft = () => {
    toast.success("Form saved as draft");
    if (returnTo) {
      navigate("/web-forms", { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
    } else {
      navigate("/web-forms");
    }
  };

  const handlePublishForm = () => {
    toast.success("Form published successfully!");
    if (returnTo) {
      navigate("/web-forms", { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
    } else {
      navigate("/web-forms");
    }
  };

  const handleCancel = () => {
    if (returnTo) {
      navigate("/web-forms", { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
    } else {
      navigate("/web-forms");
    }
  };

  const handleAddField = (fieldType: string, fieldName: string) => {
    const needsOptions = ["select", "checkbox", "radio"].includes(fieldType);
    const newField: FormField = {
      id: Date.now(),
      name: fieldName,
      type: fieldType,
      placeholder: `Enter your ${fieldName.toLowerCase()}`,
      required: false,
      essential: false,
      label: fieldName,
      helpText: "",
      validation: "",
      options: needsOptions ? [
        { id: 1, label: "Option 1", value: "option_1" },
        { id: 2, label: "Option 2", value: "option_2" },
        { id: 3, label: "Option 3", value: "option_3" },
      ] : undefined,
      allowOther: false,
      defaultValue: "",
    };
    setFormFields([...formFields, newField]);
    setSelectedField(newField);
    setShowFieldSettings(true);
    toast.success(`${fieldName} field added`);
  };

  const handleFieldClick = (field: FormField) => {
    setSelectedField(field);
    setShowFieldSettings(true);
  };

  const handleUpdateField = (updatedField: FormField) => {
    setFormFields(formFields.map(f => f.id === updatedField.id ? updatedField : f));
    setSelectedField(updatedField);
  };

  const handleDeleteField = (fieldId: number) => {
    setFormFields(formFields.filter(f => f.id !== fieldId));
    setSelectedField(null);
    setShowFieldSettings(false);
    toast.success("Field deleted");
  };

  const handleDuplicateField = (field: FormField) => {
    const duplicatedField: FormField = {
      ...field,
      id: Date.now(),
      name: `${field.name} (Copy)`,
      label: `${field.label || field.name} (Copy)`,
    };
    const fieldIndex = formFields.findIndex(f => f.id === field.id);
    const newFields = [...formFields];
    newFields.splice(fieldIndex + 1, 0, duplicatedField);
    setFormFields(newFields);
    toast.success("Field duplicated");
  };

  const handleDragStart = (fieldType: string, fieldName: string) => {
    setDraggedFieldType(JSON.stringify({ type: fieldType, name: fieldName }));
  };

  const handleFieldDragStart = (e: React.DragEvent, fieldId: number) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFieldDragOver = (e: React.DragEvent, fieldId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetId(fieldId);
  };

  const handleFieldDrop = (e: React.DragEvent, targetFieldId: number) => {
    e.preventDefault();
    if (draggedFieldId !== null && draggedFieldId !== targetFieldId) {
      const draggedIndex = formFields.findIndex(f => f.id === draggedFieldId);
      const targetIndex = formFields.findIndex(f => f.id === targetFieldId);
      const newFields = [...formFields];
      const [draggedField] = newFields.splice(draggedIndex, 1);
      newFields.splice(targetIndex, 0, draggedField);
      setFormFields(newFields);
    }
    setDraggedFieldId(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFieldType) {
      const { type, name } = JSON.parse(draggedFieldType);
      handleAddField(type, name);
      setDraggedFieldType(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto px-8 pt-8 pb-4">
        {/* Header */}
        <div className="border-b border-border pb-6 mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
            Create New Form
          </h1>
          <p className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
            Build, design, and publish your form
          </p>
        </div>

        {/* Tabs - Horizontal Aligned Right */}
        <div className="flex items-center justify-end gap-8 border-b border-border pb-2 mb-4">
          <button
            onClick={() => setCurrentTab("build")}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${currentTab === "build"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Build
            {currentTab === "build" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
          <button
            onClick={() => setCurrentTab("design")}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${currentTab === "design"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Design & Preview
            {currentTab === "design" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
          <button
            onClick={() => setCurrentTab("live")}
            className={`pb-3 px-1 text-sm font-medium transition-colors relative ${currentTab === "live"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
              }`}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Go Live
            {currentTab === "live" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Left - Form Content */}
          <div className="flex-1">
            {/* Build Tab */}
            {currentTab === "build" && (
              <div className="space-y-4">
                {/* Form Title */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                    FORM TITLE
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                    DESCRIPTION
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 h-20"
                    style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}
                  />
                  <div className="text-xs text-right mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#94A3B8' }}>
                    {formDescription.length} / 500
                  </div>
                </div>

                {/* Form Fields Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`space-y-3 min-h-[200px] p-4 border-2 border-dashed rounded-lg transition-colors ${draggedFieldType ? "border-primary bg-blue-50" : "border-gray-300"
                    }`}
                >
                  {formFields.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Drag and drop fields here or click on fields to add them
                      </p>
                    </div>
                  ) : (
                    formFields.map((field) => (
                       <FieldRenderer
                        key={field.id}
                        field={field}
                        isSelected={selectedField?.id === field.id}
                        isDropTarget={dropTargetId === field.id && draggedFieldId !== field.id}
                        fieldValue={fieldValues[field.id]}
                        onFieldClick={() => handleFieldClick(field)}
                        onFieldChange={(value) => setFieldValues({ ...fieldValues, [field.id]: value })}
                        onDuplicate={() => handleDuplicateField(field)}
                        onDelete={() => handleDeleteField(field.id)}
                        onDragStart={(e) => handleFieldDragStart(e, field.id)}
                        onDragOver={(e) => handleFieldDragOver(e, field.id)}
                        onDrop={(e) => handleFieldDrop(e, field.id)}
                        onConditionalLogic={() => toast.info("Conditional logic coming soon")}
                      />
                    ))
                  )}
                </div>

                {/* Submit Button */}
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                    SUBMIT BUTTON TEXT
                  </label>
                  <input
                    type="text"
                    value={submitButtonText}
                    onChange={(e) => setSubmitButtonText(e.target.value)}
                    maxLength={30}
                    className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                  <div className="text-xs text-right mt-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#94A3B8' }}>
                    {submitButtonText.length} / 30
                  </div>
                </div>
              </div>
            )}

            {/* Design Tab */}
            {currentTab === "design" && (
              <FormSettings
                formTitle={formTitle}
                formDescription={formDescription}
                onTitleChange={setFormTitle}
                onDescriptionChange={setFormDescription}
                onPreview={() => toast.info("Preview functionality coming soon")}
                onPublish={handlePublishForm}
              />
            )}

            {/* Go Live Tab */}
            {currentTab === "live" && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                    Your Form is Ready!
                  </h2>
                  <p className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                    Review your form details below and publish it to make it live.
                  </p>
                </div>

                {/* Form Summary */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                    <FileText className="w-4 h-4" />
                    Form Summary
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Form Title
                      </p>
                      <p className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                        {formTitle}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Form Fields ({formFields.length})
                      </p>
                      <div className="space-y-2">
                        {formFields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}>
                                {field.name}
                              </span>
                              <div className="flex gap-1">
                                {field.required && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                    Required
                                  </span>
                                )}
                                {field.essential && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                    Essential
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 bg-gray-200 rounded" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              {field.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Design Settings */}
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                    <Sliders className="w-4 h-4" />
                    Design Settings
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Theme
                      </p>
                      <p className="text-sm font-semibold capitalize" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                        {backgroundTheme}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Typography
                      </p>
                      <p className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                        {typography.split('(')[0].trim()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Button Color
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-border"
                          style={{ backgroundColor: buttonColor }}
                        />
                        <p className="text-sm font-mono font-semibold" style={{ color: '#020817' }}>
                          {buttonColor}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                        Button Text
                      </p>
                      <p className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                        {submitButtonText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Share Your Form */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                    Share Your Form
                  </h3>
                  <p className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                    Configure your form URL now. Once published, your form will be live and accessible via this link.
                  </p>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#020817' }}>
                      Custom URL Slug (Optional)
                    </label>
                    <input
                      type="text"
                      value={customUrlSlug}
                      onChange={(e) => setCustomUrlSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="https://app.myaifrontdesk.com/forms/[uniqueId]/ my-custom-form"
                      className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                    <p className="text-xs mt-2 text-muted-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Add a custom slug to make your form URL more readable. Leave empty for default URL.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                      Your custom URL will be saved with the form. The complete link will be available after you publish.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right - Field Categories / Settings */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              {showFieldSettings && selectedField ? (
                /* Field Settings Panel */
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <h3 className="text-sm font-bold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                      Field Settings
                    </h3>
                    <button
                      onClick={() => setShowFieldSettings(false)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                    {/* GENERAL SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('general')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          General
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.general ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.general && (
                        <div className="p-3 space-y-3 border-t border-gray-200">
                          {/* Field Label */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Field Label
                            </label>
                            <input
                              type="text"
                              value={selectedField.label !== undefined ? selectedField.label : selectedField.name}
                              onChange={(e) => handleUpdateField({ ...selectedField, label: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>

                          {/* Placeholder */}
                          {!["checkbox", "radio", "divider", "pagebreak", "signature", "rating"].includes(selectedField.type) && (
                            <div>
                              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={selectedField.placeholder}
                                onChange={(e) => handleUpdateField({ ...selectedField, placeholder: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                            </div>
                          )}

                          {/* Help Text */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Help Text
                            </label>
                            <textarea
                              value={selectedField.helpText || ""}
                              onChange={(e) => handleUpdateField({ ...selectedField, helpText: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-16"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                              placeholder="Additional guidance for this field"
                            />
                          </div>

                          {/* Required Toggle */}
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Required Field
                            </label>
                            <button
                              onClick={() => handleUpdateField({ ...selectedField, required: !selectedField.required })}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedField.required ? "bg-primary" : "bg-gray-200"
                                }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${selectedField.required ? "translate-x-5" : "translate-x-0.5"
                                  }`}
                              />
                            </button>
                          </div>

                          {/* Default Value for text/number fields */}
                          {["text", "number", "email", "url", "tel"].includes(selectedField.type) && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Default Value
                                </label>
                                <VariablePickerButton
                                  targetRef={sidebarInputRef}
                                  value={selectedField.defaultValue || ""}
                                  onChange={(newValue) => handleUpdateField({ ...selectedField, defaultValue: newValue })}
                                  label="{ } Insert Variable"
                                />
                              </div>
                              <input
                                ref={sidebarInputRef}
                                type="text"
                                value={selectedField.defaultValue || ""}
                                onChange={(e) => handleUpdateField({ ...selectedField, defaultValue: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                            </div>
                          )}

                          {/* Options Management (for select, checkbox, radio) */}
                          {["select", "checkbox", "radio"].includes(selectedField.type) && (
                            <div className="pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <label className="block text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Options
                                </label>
                                <button
                                  onClick={() => {
                                    const nextId = Math.max(0, ...(selectedField.options?.map(o => o.id) || [0])) + 1;
                                    const newOption: FieldOption = {
                                      id: nextId,
                                      label: `Option ${nextId}`,
                                      value: `option_${nextId}`,
                                    };
                                    const newOptions = [...(selectedField.options || []), newOption];
                                    handleUpdateField({ ...selectedField, options: newOptions });
                                  }}
                                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Option
                                </button>
                              </div>
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {selectedField.options?.map((option, index) => (
                                  <div key={option.id} className="border border-gray-200 rounded-lg p-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Option {index + 1}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const newOptions = selectedField.options?.filter((o) => o.id !== option.id);
                                          handleUpdateField({ ...selectedField, options: newOptions });
                                        }}
                                        className="p-1 hover:bg-red-50 rounded text-red-600"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div>
                                      <label className="block text-xs mb-1 text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                        Label
                                      </label>
                                      <input
                                        type="text"
                                        value={option.label}
                                        onChange={(e) => {
                                          const newOptions = selectedField.options?.map((o) =>
                                            o.id === option.id ? { ...o, label: e.target.value } : o
                                          );
                                          handleUpdateField({ ...selectedField, options: newOptions });
                                        }}
                                        className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                        placeholder="Display text"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      {/* Source row: Insert Variable trigger + chip */}
                                      <div>
                                        <div className="flex items-center justify-between mb-1">
                                          <label className="block text-xs text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Source</label>
                                          <VariablePickerButton
                                            mode="replace"
                                            value={option.sourceVariable || ""}
                                            onChange={(newValue) => {
                                              const newOptions = selectedField.options?.map((o) =>
                                                o.id === option.id ? { ...o, sourceVariable: newValue } : o
                                              );
                                              handleUpdateField({ ...selectedField, options: newOptions });
                                            }}
                                            label="{ } Insert Variable"
                                          />
                                        </div>
                                        {option.sourceVariable && (
                                          <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                            <span className="font-mono text-blue-700" style={{ fontFamily: 'Outfit, sans-serif' }}>{option.sourceVariable}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newOptions = selectedField.options?.map((o) =>
                                                  o.id === option.id ? { ...o, sourceVariable: "" } : o
                                                );
                                                handleUpdateField({ ...selectedField, options: newOptions });
                                              }}
                                              className="text-blue-400 hover:text-blue-600 ml-2"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {/* Value row: always-editable, fully independent of Source */}
                                      <div>
                                        <label className="block text-xs mb-1 text-gray-600" style={{ fontFamily: 'Outfit, sans-serif' }}>Value</label>
                                        <input
                                          type="text"
                                          value={option.value}
                                          onChange={(e) => {
                                            const newOptions = selectedField.options?.map((o) =>
                                              o.id === option.id ? { ...o, value: e.target.value } : o
                                            );
                                            handleUpdateField({ ...selectedField, options: newOptions });
                                          }}
                                          className="w-full px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                          style={{ fontFamily: 'Outfit, sans-serif' }}
                                          placeholder="Submitted value"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Allow Other Option Toggle */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allow "Other" Option
                                </label>
                                <button
                                  onClick={() => handleUpdateField({ ...selectedField, allowOther: !selectedField.allowOther })}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedField.allowOther ? "bg-primary" : "bg-gray-200"
                                    }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${selectedField.allowOther ? "translate-x-5" : "translate-x-0.5"
                                      }`}
                                  />
                                </button>
                              </div>

                              {/* Default Value for Select */}
                              {selectedField.type === "select" && (
                                <div className="mt-3">
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Default Selection
                                  </label>
                                  <input
                                    ref={sidebarSelectRef}
                                    type="text"
                                    value={selectedField.defaultValue || ""}
                                    onChange={(e) => handleUpdateField({ ...selectedField, defaultValue: e.target.value })}
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                    placeholder="None, or enter value / {{variable}}"
                                    list={`select-options-${selectedField.id}`}
                                  />
                                  <datalist id={`select-options-${selectedField.id}`}>
                                    {selectedField.options?.map((option) => (
                                      <option key={option.id} value={option.value}>{option.label}</option>
                                    ))}
                                  </datalist>
                                </div>
                              )}

                              {/* Multi-select toggle for dropdown */}
                              {selectedField.type === "select" && (
                                <div className="flex items-center justify-between mt-3">
                                  <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Allow Multiple Selections
                                  </label>
                                  <button
                                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                  >
                                    <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                  </button>
                                </div>
                              )}

                              {/* Checkbox/Radio specific settings */}
                              {(selectedField.type === "checkbox" || selectedField.type === "radio") && (
                                <>
                                  <div className="flex items-center justify-between mt-3">
                                    <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                      Randomize Options
                                    </label>
                                    <button
                                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                    >
                                      <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                      Layout Style
                                    </label>
                                    <select
                                      className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <option value="stacked">Stacked</option>
                                      <option value="inline">Inline</option>
                                      <option value="two-column">Two Column</option>
                                      <option value="three-column">Three Column</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {/* Checkbox min/max selections */}
                              {selectedField.type === "checkbox" && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                      Min Selections
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      min="0"
                                      className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                      Max Selections
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="∞"
                                      min="1"
                                      className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Number Field Specific Settings */}
                          {selectedField.type === "number" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Number Format
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="decimal">Decimal</option>
                                  <option value="currency">Currency</option>
                                  <option value="percentage">Percentage</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Prefix
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="$"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Suffix
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="%"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Step Increment
                                </label>
                                <input
                                  type="number"
                                  placeholder="1"
                                  step="any"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allow Decimals
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-primary"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Date Field Specific Settings */}
                          {selectedField.type === "date" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Date Format
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                                  <option value="mm-dd-yyyy">MM-DD-YYYY</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Disable Past Dates
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Disable Future Dates
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Disable Weekends
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Time Field Specific Settings */}
                          {selectedField.type === "time" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Time Format
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="12">12 Hour (AM/PM)</option>
                                  <option value="24">24 Hour</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Time Interval
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="15">15 minutes</option>
                                  <option value="30">30 minutes</option>
                                  <option value="60">1 hour</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Phone Field Specific Settings */}
                          {selectedField.type === "tel" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Phone Format
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="us">(XXX) XXX-XXXX</option>
                                  <option value="international">+X XXX XXX XXXX</option>
                                  <option value="custom">Custom Format</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Show Country Selector
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* File Upload Field Specific Settings */}
                          {selectedField.type === "file" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allowed File Types
                                </label>
                                <input
                                  type="text"
                                  placeholder=".pdf, .doc, .jpg, .png"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Max File Size (MB)
                                </label>
                                <input
                                  type="number"
                                  placeholder="10"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allow Multiple Files
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Show File Preview
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-primary"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Rating Field Specific Settings */}
                          {selectedField.type === "rating" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Rating Scale
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="5">1 to 5</option>
                                  <option value="10">1 to 10</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Icon Type
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="star">Star</option>
                                  <option value="heart">Heart</option>
                                  <option value="emoji">Emoji</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allow Half Ratings
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Password Field Specific Settings */}
                          {selectedField.type === "password" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Min Password Length
                                </label>
                                <input
                                  type="number"
                                  placeholder="8"
                                  min="1"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Require Numbers
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Require Symbols
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Show Password Strength
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-primary"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Add Confirm Password Field
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Email Field Specific Settings */}
                          {selectedField.type === "email" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Add Confirm Email Field
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Block Disposable Emails
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Allowed Domains (optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="example.com, company.com"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Website/URL Field Specific Settings */}
                          {selectedField.type === "url" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Auto Add HTTPS
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-primary"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Signature Field Specific Settings */}
                          {selectedField.type === "signature" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Canvas Width
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="500"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Canvas Height
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="150"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Pen Color
                                </label>
                                <input
                                  type="color"
                                  defaultValue="#000000"
                                  className="w-full h-9 border border-border rounded cursor-pointer"
                                />
                              </div>
                            </div>
                          )}

                          {/* Color Picker Field Specific Settings */}
                          {selectedField.type === "color" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Default Color
                                </label>
                                <input
                                  type="color"
                                  defaultValue="#3B82F6"
                                  className="w-full h-9 border border-border rounded cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Color Format
                                </label>
                                <select
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                >
                                  <option value="hex">HEX</option>
                                  <option value="rgb">RGB</option>
                                  <option value="rgba">RGBA</option>
                                </select>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Show Opacity Selector
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Textarea-specific settings */}
                          {selectedField.type === "textarea" && (
                            <div className="pt-3 border-t border-gray-200 space-y-3">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Rows
                                </label>
                                <input
                                  type="number"
                                  placeholder="4"
                                  min="2"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Resizable
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-primary"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-5" />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Show Character Counter
                                </label>
                                <button
                                  className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                                >
                                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* APPEARANCE SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('appearance')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Appearance
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.appearance ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.appearance && (
                        <div className="p-3 space-y-3 border-t border-gray-200">
                          {/* Custom CSS Class */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Custom CSS Class
                            </label>
                            <input
                              type="text"
                              placeholder="custom-class-name"
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>

                          {/* Hidden Field Toggle */}
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Hidden Field
                            </label>
                            <button
                              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                            >
                              <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                            </button>
                          </div>

                          {/* Read-only Toggle */}
                          {["text", "textarea", "number", "email"].includes(selectedField.type) && (
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                Read-only
                              </label>
                              <button
                                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-200"
                              >
                                <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-0.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* VALIDATION SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('validation')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Validation
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.validation ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.validation && (
                        <div className="p-3 space-y-3 border-t border-gray-200">
                          {/* Validation Rules */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Validation Type
                            </label>
                            <select
                              value={selectedField.validation || ""}
                              onChange={(e) => handleUpdateField({ ...selectedField, validation: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              <option value="">None</option>
                              <option value="email">Email</option>
                              <option value="phone">Phone Number</option>
                              <option value="url">URL</option>
                              <option value="number">Number Only</option>
                              <option value="alphanumeric">Alphanumeric</option>
                            </select>
                          </div>

                          {/* Character Limit for text fields */}
                          {["text", "textarea"].includes(selectedField.type) && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Min Length
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                    Max Length
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="∞"
                                    className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {/* Min/Max for number fields */}
                          {selectedField.type === "number" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Min Value
                                </label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                  Max Value
                                </label>
                                <input
                                  type="number"
                                  placeholder="∞"
                                  className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ fontFamily: 'Outfit, sans-serif' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Validation Message */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Error Message
                            </label>
                            <input
                              type="text"
                              placeholder="This field is required"
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CONDITIONAL LOGIC SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('conditionalLogic')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Conditional Logic
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.conditionalLogic ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.conditionalLogic && (
                        <div className="p-3 border-t border-gray-200">
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Add conditional rules to show/hide this field
                            </p>
                            <button className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 mx-auto">
                              <Plus className="w-3 h-3" />
                              Add Condition
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ADVANCED SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('advanced')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Advanced
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.advanced ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.advanced && (
                        <div className="p-3 space-y-3 border-t border-gray-200">
                          {/* Field ID */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Field ID
                            </label>
                            <input
                              type="text"
                              value={`field_${selectedField.id}`}
                              disabled
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm bg-gray-50 text-gray-500"
                              style={{ fontFamily: 'monospace' }}
                            />
                          </div>

                          {/* Admin Label */}
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Admin Label
                            </label>
                            <input
                              type="text"
                              placeholder="Internal reference name"
                              className="w-full px-2.5 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INTEGRATIONS SECTION */}
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleSection('integrations')}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Integrations
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.integrations ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedSections.integrations && (
                        <div className="p-3 border-t border-gray-200">
                          <div className="text-center py-4">
                            <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Connect this field to external services
                            </p>
                            <button className="text-xs text-primary hover:text-primary/80 font-medium">
                              Configure Webhooks
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteField(selectedField.id)}
                      className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Field
                    </button>
                  </div>
                </div>
              ) : (
                /* Field Categories */
                <div>
                  {/* Standard Fields */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                        Standard Fields
                      </h4>
                      <svg className="w-4 h-4 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        draggable
                        onDragStart={() => handleDragStart("text", "Single Line Text")}
                        onClick={() => handleAddField("text", "Single Line Text")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Single Line Text
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("textarea", "Paragraph Text")}
                        onClick={() => handleAddField("textarea", "Paragraph Text")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Paragraph Text
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("select", "Dropdown")}
                        onClick={() => handleAddField("select", "Dropdown")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Dropdown
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("multiselect", "Multi Select")}
                        onClick={() => handleAddField("multiselect", "Multi Select")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Multi Select
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("checkbox", "Checkboxes")}
                        onClick={() => handleAddField("checkbox", "Checkboxes")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Checkboxes
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("radio", "Radio Buttons")}
                        onClick={() => handleAddField("radio", "Radio Buttons")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                          <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Radio Buttons
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("number", "Number")}
                        onClick={() => handleAddField("number", "Number")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <span className="text-base font-bold text-orange-600">123</span>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Number
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("hidden", "Hidden Field")}
                        onClick={() => handleAddField("hidden", "Hidden Field")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                          <EyeOff className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Hidden Field
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("html", "HTML Block")}
                        onClick={() => handleAddField("html", "HTML Block")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                          <Code className="w-4 h-4 text-yellow-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          HTML Block
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("divider", "Section Divider")}
                        onClick={() => handleAddField("divider", "Section Divider")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                          <MinusIcon className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Section Divider
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("pagebreak", "Page Break")}
                        onClick={() => handleAddField("pagebreak", "Page Break")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Page Break
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Advanced Fields */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        Advanced Fields
                      </h4>
                      <svg className="w-4 h-4 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        draggable
                        onDragStart={() => handleDragStart("name", "Name")}
                        onClick={() => handleAddField("name", "Name")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Name
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("date", "Date")}
                        onClick={() => handleAddField("date", "Date")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                          <Calendar className="w-4 h-4 text-cyan-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Date
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("time", "Time")}
                        onClick={() => handleAddField("time", "Time")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Time
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("tel", "Phone")}
                        onClick={() => handleAddField("tel", "Phone")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Phone
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("address", "Address")}
                        onClick={() => handleAddField("address", "Address")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <MapPin className="w-4 h-4 text-rose-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Address
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("url", "Website")}
                        onClick={() => handleAddField("url", "Website")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                          <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Website
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("email", "Email")}
                        onClick={() => handleAddField("email", "Email")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                          <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Email
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("file", "File Upload")}
                        onClick={() => handleAddField("file", "File Upload")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-lime-50 flex items-center justify-center group-hover:bg-lime-100 transition-colors">
                          <Upload className="w-4 h-4 text-lime-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          File Upload
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("captcha", "CAPTCHA")}
                        onClick={() => handleAddField("captcha", "CAPTCHA")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          CAPTCHA
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("password", "Password")}
                        onClick={() => handleAddField("password", "Password")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                          <EyeOff className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Password
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("signature", "Signature")}
                        onClick={() => handleAddField("signature", "Signature")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Signature
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("rating", "Rating")}
                        onClick={() => handleAddField("rating", "Rating")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                          <Star className="w-4 h-4 text-yellow-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Rating
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("toggle", "Toggle Switch")}
                        onClick={() => handleAddField("toggle", "Toggle Switch")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Toggle Switch
                        </span>
                      </button>

                      <button
                        draggable
                        onDragStart={() => handleDragStart("color", "Color Picker")}
                        onClick={() => handleAddField("color", "Color Picker")}
                        className="group flex flex-col items-center gap-2 p-3.5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md hover:scale-105 transition-all duration-200 cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                          <Palette className="w-4 h-4 text-pink-600" />
                        </div>
                        <span className="text-xs font-medium text-center leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: '#475569' }}>
                          Color Picker
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 mt-4 border-t border-border">
          <div>
            {currentTab !== "build" && (
              <Button
                variant="outline"
                onClick={handleBackTab}
                className="text-sm"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                ← Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="text-sm"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              className="text-sm"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Save Draft
            </Button>
            {currentTab !== "live" ? (
              <Button
                variant="primary"
                onClick={handleNextTab}
                className="text-sm bg-primary hover:bg-primary/90"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Next →
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePublishForm}
                className="text-sm bg-black hover:bg-black/90 text-white"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Publish Form
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
