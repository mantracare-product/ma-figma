import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { createPortal } from "react-dom";
import {
  Plus,
  FileText,
  Sliders,
  X,
  Trash2,
  GripVertical,
  Settings as SettingsIcon,
  Minus,
  ChevronDown,
  ChevronRight,
  Upload,
  Star,
  Calendar,
  Clock,
  MapPin,
  Code,
  Minus as MinusIcon,
  Palette,
  Copy,
  Zap,
  User,
  Users,
  Workflow,
  CalendarCheck,
  PhoneCall,
  Wrench,
  Building2,
  LayoutGrid,
  Mail,
  Phone,
  Tag,
  Hash,
  Link,
  ToggleLeft,
  ShieldCheck,
  EyeOff,
  Layout,
  Type,
  AlignLeft,
  Circle,
  Square,
  ListChecks,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import FieldRenderer from "../components/form-builder/FieldRenderer";
import FormSettings from "../components/form-builder/FormSettings";
import { useClientFields } from "../context/ClientFieldsContext";
import type { CustomField } from "../context/ClientFieldsContext";
import { useFieldRegistry, FieldModule, FieldInputType } from "../context/FieldRegistryContext";
import type { FieldDefinition } from "../context/FieldRegistryContext";
import VariablePickerButton from "../components/process/VariablePickerButton";
import { CreateFieldModal, SelectFieldsModal } from "../components/help/FieldManager";
import { INITIAL_FORMS } from "../../data/forms";

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
  module?: FieldModule;
  sourceType?: "system" | "custom";
  sourceFieldKey?: string;
}

interface Template {
  id: number;
  name: string;
  fields: string[];
  buttonText: string;
  description: string;
  stats: string;
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAllFields, addCustomField } = useFieldRegistry();
  const { customFieldsClients } = useClientFields();
  const systemFields = getAllFields("client").filter(f => f.source === "system");
  const template = location.state?.template as Template | undefined;
  const existingForm = location.state?.form as {
    id: number;
    name: string;
    description?: string;
    fields?: FormField[];
    submitButtonText?: string;
    status?: string;
    autoCreateClient?: boolean;
    autoCreateProcessId?: string;
    autoCreateStageId?: string;
  } | undefined;
  const returnTo = location.state?.returnTo as { tab: string; flowId: number } | undefined;

  // Stable formId for new or existing forms
  const [formId] = useState(() => existingForm?.id ?? Date.now());

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

  // Auto-create client state
  const [autoCreateClient, setAutoCreateClient] = useState(existingForm?.autoCreateClient ?? false);
  const [autoCreateProcessId, setAutoCreateProcessId] = useState(existingForm?.autoCreateProcessId ?? "");
  const [autoCreateStageId, setAutoCreateStageId] = useState(existingForm?.autoCreateStageId ?? "");

  // Inline custom field creation state
  const [showInlineCreateField, setShowInlineCreateField] = useState(false);
  const [inlineFieldLabel, setInlineFieldLabel] = useState("");
  const [inlineFieldType, setInlineFieldType] = useState("TEXT");
  const [inlineFieldRequired, setInlineFieldRequired] = useState(false);

  const [sidebarSections, setSidebarSections] = useState<{ [key: string]: boolean }>({
    formElements: true,
    existingFields: true,
  });

  // State for SelectFieldsModal
  const [showSelectFieldModal, setShowSelectFieldModal] = useState(false);

  const toggleSidebarSection = (section: string) => {
    setSidebarSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Smart type inference for system/custom fields
  const inferFieldFromSystem = (sysKey: string): Partial<FormField> => {
    if (sysKey === "email") return { type: "email", validation: "email" };
    if (sysKey === "phone") return { type: "tel", validation: "phone" };
    if (sysKey === "status" || sysKey === "processes") {
      const sf = systemFields.find(f => f.key === sysKey);
      return {
        type: "select",
        options: sf?.options?.map(o => ({ id: o.id, label: o.label, value: o.value })) ?? [],
      };
    }
    return { type: "text" };
  };

  const inferFieldFromCustom = (cf: CustomField): Partial<FormField> => {
    const t = cf.type.toUpperCase();
    if (t === "DATE") return { type: "date" };
    if (t === "DATE_TIME" || t === "DATETIME") return { type: "time" };
    if (t === "DROPDOWN" || t === "LIST") return { type: "select", options: [{ id: 1, label: "Option 1", value: "option_1" }, { id: 2, label: "Option 2", value: "option_2" }] };
    if (t === "YES_NO" || t === "YESNO") return { type: "radio", options: [{ id: 1, label: "Yes", value: "yes" }, { id: 2, label: "No", value: "no" }] };
    if (t === "NUMBER" || t === "MONEY") return { type: "number" };
    if (t === "LINK" || t === "WHATSAPP_LINK") return { type: "url" };
    return { type: "text" };
  };

  /**
   * Directly build a FormField from a FieldDefinition and push it onto the
   * canvas. This is the single source-of-truth for registry-linked fields.
   * Using a FieldDefinition directly avoids the React async state-update delay
   * that occurs when looking up a freshly-added custom field from the context.
   */
  const addFormFieldFromDefinition = (sf: FieldDefinition, source: "system" | "custom") => {
    const isAlreadyAdded = formFields.some(
      f => f.sourceFieldKey === sf.key && f.module === sf.module
    );
    if (isAlreadyAdded) {
      toast.info(`"${sf.label}" is already in the form`);
      return;
    }
    const newField: FormField = {
      id: Date.now(),
      name: sf.label,
      type: sf.inputType === "email" ? "email" :
        sf.inputType === "tel" ? "tel" :
          sf.inputType === "select" ? "select" :
            sf.inputType === "date" ? "date" :
              sf.inputType === "date_time" ? "time" :
                sf.inputType === "number" || sf.inputType === "money" ? "number" :
                  sf.inputType === "textarea" ? "textarea" :
                    sf.inputType === "link" || sf.inputType === "whatsapp_link" ? "url" :
                      sf.inputType === "yes_no" ? "radio" :
                        "text",
      placeholder: sf.placeholder || `Enter ${sf.label.toLowerCase()}`,
      required: sf.required || false,
      essential: ["name", "email", "phone"].includes(sf.key) && sf.module === "client",
      label: sf.label,
      helpText: "",
      validation: sf.validation || "",
      options: sf.options?.map(o => ({ id: o.id, label: o.label, value: o.value })) ||
        (sf.inputType === "yes_no" ? [{ id: 1, label: "Yes", value: "yes" }, { id: 2, label: "No", value: "no" }] : undefined),
      allowOther: false,
      defaultValue: "",
      sourceType: source,
      sourceFieldKey: sf.key,
      module: sf.module as FieldModule,
    };
    setFormFields(prev => [...prev, newField]);
    setSelectedField(newField);
    setShowFieldSettings(true);
    toast.success(`${sf.label} field added`);
  };

  /** Look up a field in the registry then delegate to addFormFieldFromDefinition. */
  const handleAddRegistryField = (fieldKey: string, module: FieldModule, source: "system" | "custom") => {
    const fields = getAllFields(module);
    const sf = fields.find(f => f.key === fieldKey);
    if (!sf) return;
    addFormFieldFromDefinition(sf, source);
  };

  const handleAddSystemField = (key: string) => {
    const sf = systemFields.find(f => f.key === key);
    if (!sf) return;
    const inferred = inferFieldFromSystem(key);
    const newField: FormField = {
      id: Date.now(),
      name: sf.label,
      type: inferred.type ?? "text",
      placeholder: sf.placeholder,
      required: false,
      essential: ["name", "email", "phone"].includes(key),
      label: sf.label,
      helpText: "",
      validation: inferred.validation ?? "",
      options: inferred.options,
      allowOther: false,
      defaultValue: "",
      sourceType: "system",
      sourceFieldKey: key,
    };
    setFormFields(prev => [...prev, newField]);
    setSelectedField(newField);
    setShowFieldSettings(true);
    toast.success(`${sf.label} field added`);
  };

  const handleAddCustomField = (cf: CustomField) => {
    const inferred = inferFieldFromCustom(cf);
    const newField: FormField = {
      id: Date.now(),
      name: cf.label,
      type: inferred.type ?? "text",
      placeholder: `Enter ${cf.label.toLowerCase()}`,
      required: cf.required,
      essential: false,
      label: cf.label,
      helpText: "",
      validation: "",
      options: inferred.options,
      allowOther: false,
      defaultValue: "",
      sourceType: "custom",
      sourceFieldKey: cf.key,
    };
    setFormFields(prev => [...prev, newField]);
    setSelectedField(newField);
    setShowFieldSettings(true);
    toast.success(`${cf.label} field added`);
  };

  const handleInlineCreateField = () => {
    if (!inlineFieldLabel.trim()) {
      toast.error("Please enter a field name");
      return;
    }
    const created = addCustomField("client", {
      label: inlineFieldLabel.trim(),
      key: inlineFieldLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      inputType: (inlineFieldType.toLowerCase() === "dropdown" ? "select" : inlineFieldType.toLowerCase()) as FieldInputType,
      required: inlineFieldRequired,
      showAlways: false,
      sourceFormId: formId,
      module: "client",
    });
    const newCf: CustomField = {
      id: created.id,
      label: created.label,
      key: created.key,
      type: created.inputType.toUpperCase(),
      required: created.required || false,
      showAlways: created.showAlways,
      sourceFormId: created.sourceFormId,
    };
    setInlineFieldLabel("");
    setInlineFieldType("TEXT");
    setInlineFieldRequired(false);
    setShowInlineCreateField(false);
    handleAddCustomField(newCf);
    toast.success(`Custom field "${newCf.label}" created and added`);
  };

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
        module: f.module,
        sourceType: f.sourceType,
        sourceFieldKey: f.sourceFieldKey,
      })));
      // Restore autoCreateClient settings if editing
      if (existingForm.autoCreateClient !== undefined) setAutoCreateClient(existingForm.autoCreateClient);
      if (existingForm.autoCreateProcessId) setAutoCreateProcessId(existingForm.autoCreateProcessId);
      if (existingForm.autoCreateStageId) setAutoCreateStageId(existingForm.autoCreateStageId);
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
    // Persist form data back to webForms sessionStorage
    const saved = sessionStorage.getItem("webForms");
    const forms = saved ? JSON.parse(saved) : INITIAL_FORMS;
    const updatedForm = {
      id: formId,
      name: formTitle,
      description: formDescription,
      fields: formFields.map(f => ({
        label: f.label || f.name,
        type: f.type,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options?.map(o => ({ label: o.label, value: o.value })),
        module: f.module,
        sourceType: f.sourceType,
        sourceFieldKey: f.sourceFieldKey,
      })),
      status: "draft" as const,
      formType: "standard" as const,
      createdBy: "Admin User",
      fieldCount: formFields.length,
      submissions: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.submissions ?? 0) : 0,
      enabled: false,
      createdAt: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.createdAt ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUpdated: new Date().toISOString(),
      autoCreateClient,
      autoCreateProcessId,
      autoCreateStageId,
    };
    if (existingForm?.id) {
      sessionStorage.setItem("webForms", JSON.stringify(forms.map((f: any) => f.id === formId ? updatedForm : f)));
    } else {
      sessionStorage.setItem("webForms", JSON.stringify([updatedForm, ...forms]));
    }
    toast.success("Form saved as draft");
    if (returnTo) {
      navigate("/web-forms", { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
    } else {
      navigate("/web-forms");
    }
  };

  const handlePublishForm = () => {
    // Validate autoCreateClient configuration
    if (autoCreateClient && (!autoCreateProcessId || !autoCreateStageId)) {
      toast.error("Please select a Process and Initial Stage before publishing.");
      return;
    }
    // Persist form data back to webForms sessionStorage
    const saved = sessionStorage.getItem("webForms");
    const forms = saved ? JSON.parse(saved) : INITIAL_FORMS;
    const updatedForm = {
      id: formId,
      name: formTitle,
      description: formDescription,
      fields: formFields.map(f => ({
        label: f.label || f.name,
        type: f.type,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options?.map(o => ({ label: o.label, value: o.value })),
        module: f.module,
        sourceType: f.sourceType,
        sourceFieldKey: f.sourceFieldKey,
      })),
      status: "live" as const,
      formType: "standard" as const,
      createdBy: "Admin User",
      fieldCount: formFields.length,
      submissions: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.submissions ?? 0) : 0,
      enabled: true,
      createdAt: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.createdAt ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUpdated: new Date().toISOString(),
      autoCreateClient,
      autoCreateProcessId,
      autoCreateStageId,
    };
    if (existingForm?.id) {
      sessionStorage.setItem("webForms", JSON.stringify(forms.map((f: any) => f.id === formId ? updatedForm : f)));
    } else {
      sessionStorage.setItem("webForms", JSON.stringify([updatedForm, ...forms]));
    }
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
    const needsOptions = ["select", "multiselect", "checkbox", "radio"].includes(fieldType);
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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                  <FormSettings
                    formTitle={formTitle}
                    formDescription={formDescription}
                    onTitleChange={setFormTitle}
                    onDescriptionChange={setFormDescription}
                    onPreview={() => toast.info("Live preview updated")}
                    onPublish={handlePublishForm}
                    autoCreateClient={autoCreateClient}
                    onAutoCreateClientChange={setAutoCreateClient}
                    autoCreateProcessId={autoCreateProcessId}
                    onAutoCreateProcessIdChange={setAutoCreateProcessId}
                    autoCreateStageId={autoCreateStageId}
                    onAutoCreateStageIdChange={setAutoCreateStageId}
                  />
                </div>
                {/* Live Form Preview Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                      Live End-User Preview
                    </h3>
                    <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      ● Real-time
                    </span>
                  </div>
                  <div className={`p-8 rounded-2xl border shadow-md space-y-6 transition-all ${backgroundTheme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-border text-foreground"
                    }`}>
                    <div className="border-b border-border pb-4">
                      <h2 className="text-2xl font-bold mb-1.5" style={{ fontFamily: typography.includes("Outfit") ? "Outfit, sans-serif" : typography.includes("Roboto") ? "Roboto, sans-serif" : "DM Sans, sans-serif" }}>
                        {formTitle || "Untitled Form"}
                      </h2>
                      {formDescription && (
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {formDescription}
                        </p>
                      )}
                    </div>
                    <div className="space-y-5">
                      {formFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-8">No fields added to form yet.</p>
                      ) : (
                        formFields.map(field => (
                          <FieldRenderer
                            key={field.id}
                            field={field}
                            isSelected={false}
                            isDropTarget={false}
                            fieldValue={fieldValues[field.id]}
                            onFieldClick={() => { }}
                            onFieldChange={(val) => setFieldValues({ ...fieldValues, [field.id]: val })}
                            onDuplicate={() => { }}
                            onDelete={() => { }}
                            onDragStart={() => { }}
                            onDragOver={() => { }}
                            onDrop={() => { }}
                            onConditionalLogic={() => { }}
                          />
                        ))
                      )}
                    </div>
                    <div className="pt-3 border-t border-border">
                      <button
                        style={{ backgroundColor: buttonColor, fontFamily: "DM Sans, sans-serif" }}
                        className="w-full py-3 px-6 rounded-lg text-white font-semibold shadow hover:opacity-90 transition-opacity text-sm"
                      >
                        {submitButtonText || "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Go Live Tab */}
            {currentTab === "live" && (
              <div className="space-y-6">
                <div className="text-center py-6">
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Column 1 */}
                  <div className="space-y-6">
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
                  </div>

                  {/* Column 2 */}
                  <div className="space-y-6">
                    {/* Client Auto-Creation Settings */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                        <Zap className="w-4 h-4 text-purple-600" />
                        Client Auto-Creation Setting
                      </h3>
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                          Status
                        </p>
                        <p className="text-sm font-semibold flex items-center gap-1.5" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                          <span className={`w-2 h-2 rounded-full ${autoCreateClient ? "bg-green-500" : "bg-gray-400"}`} />
                          {autoCreateClient ? "Enabled — Submissions will automatically create/link client profiles" : "Disabled — Submissions will not create client profiles"}
                        </p>
                      </div>
                      {autoCreateClient && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200/50">
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Assign to Process
                            </p>
                            <p className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                              {autoCreateProcessId || "None"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Initial Stage
                            </p>
                            <p className="text-sm font-semibold" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                              {autoCreateStageId || "None"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Share Your Form */}
                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
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
                </div>
              </div>
            )}
          </div>

          {/* Right - Field Categories / Settings (Build Tab Only) */}
          {currentTab === "build" && (
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

                            {/* Options Management (for select, multiselect, checkbox, radio) */}
                            {["select", "multiselect", "checkbox", "radio"].includes(selectedField.type) && (
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                              Validation
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${selectedField.required ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                              {selectedField.required ? "Required" : "Optional"}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.validation ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedSections.validation && (
                          <div className="p-3 space-y-3 border-t border-gray-200">
                            {/* Validation Summary */}
                            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/60 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Status:</span>
                                <span className="font-semibold text-gray-700">{selectedField.required ? "Required" : "Optional"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Rule:</span>
                                <span className="font-semibold text-gray-700 capitalize">{selectedField.validation || "Standard input validation"}</span>
                              </div>
                            </div>

                            {/* Validation Type (only for text/input fields) */}
                            {["text", "email", "tel", "url", "number", "textarea"].includes(selectedField.type) && (
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
                            )}

                            {/* Character Limit for text/textarea fields */}
                            {["text", "textarea"].includes(selectedField.type) && (
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

                            {/* Error Message */}
                            {["text", "textarea", "number", "email", "tel", "url", "date", "file", "select", "radio", "checkbox"].includes(selectedField.type) && (
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
                            )}
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
                          <div className="p-3 border-t border-gray-200 space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                Link to Registry Field
                              </label>
                              <select
                                value={selectedField.sourceFieldKey ? `${selectedField.module || "client"}:${selectedField.sourceFieldKey}` : ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) {
                                    handleUpdateField({
                                      ...selectedField,
                                      module: undefined,
                                      sourceType: undefined,
                                      sourceFieldKey: undefined,
                                    });
                                  } else if (val === "__create_client__" || val === "__create_appointment__") {
                                    const targetMod = val === "__create_client__" ? "client" : "appointment";
                                    const name = prompt(`Enter new custom field name for ${targetMod === "client" ? "Client" : "Appointment"}:`);
                                    if (name && name.trim()) {
                                      const key = name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
                                      const added = addCustomField(targetMod, {
                                        key,
                                        label: name.trim(),
                                        module: targetMod,
                                        inputType: "text",
                                        required: false,
                                        showAlways: true,
                                        placeholder: `Enter ${name.toLowerCase()}`,
                                      });
                                      handleUpdateField({
                                        ...selectedField,
                                        module: targetMod,
                                        sourceType: "custom",
                                        sourceFieldKey: added.key,
                                        label: added.label,
                                      });
                                      toast.success(`Created & linked: ${added.label}`);
                                    }
                                  } else {
                                    const [m, k] = val.split(":");
                                    const allM = getAllFields(m as FieldModule);
                                    const f = allM.find(field => field.key === k);
                                    if (f) {
                                      handleUpdateField({
                                        ...selectedField,
                                        module: m as FieldModule,
                                        sourceType: f.source,
                                        sourceFieldKey: f.key,
                                        label: f.label,
                                      });
                                      toast.success(`Mapped to ${f.label}`);
                                    }
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 border border-border rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                <option value="">No linkage</option>
                                <optgroup label="Client Fields">
                                  {getAllFields("client").map(f => (
                                    <option key={f.key} value={`client:${f.key}`}>{f.label} ({f.source})</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Appointment Fields">
                                  {getAllFields("appointment").map(f => (
                                    <option key={f.key} value={`appointment:${f.key}`}>{f.label} ({f.source})</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Create New Field">
                                  <option value="__create_client__">+ Create Client field inline...</option>
                                  <option value="__create_appointment__">+ Create Appointment field inline...</option>
                                </optgroup>
                              </select>
                            </div>
                            {selectedField.sourceFieldKey && (
                              <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100/70 text-[10px] text-blue-700 font-mono">
                                Mapped: {selectedField.module || "client"}.{selectedField.sourceFieldKey} ({selectedField.sourceType})
                              </div>
                            )}
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
                  /* Field Categories — Restructured into Exactly Two Sections */
                  <div className="divide-y divide-gray-100/80">
                    {/* ── Form Elements ── */}
                    <div>
                      <button
                        onClick={() => toggleSidebarSection("formElements")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left ${sidebarSections.formElements
                            ? "bg-gray-50/80 border-l-2 border-gray-400"
                            : "hover:bg-gray-50"
                          }`}
                      >
                        <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${sidebarSections.formElements ? "text-[#374151]" : "text-[#475569]"
                          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                          <LayoutGrid className={`w-3.5 h-3.5 flex-shrink-0 ${sidebarSections.formElements ? "text-gray-500" : "text-gray-400"
                            }`} />
                          Form Elements
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${sidebarSections.formElements ? "text-gray-500 rotate-180" : "text-gray-300"
                          }`} />
                      </button>

                      {sidebarSections.formElements && (
                        <div className="px-3 pt-2 pb-3 grid grid-cols-2 gap-2">
                          {[
                            { type: "text", label: "Short Text", icon: Type },
                            { type: "textarea", label: "Long Text", icon: AlignLeft },
                            { type: "number", label: "Number", icon: Hash },
                            { type: "date", label: "Date", icon: Calendar },
                            { type: "select", label: "Dropdown", icon: ChevronDown },
                            { type: "multiselect", label: "Multi-Select", icon: ListChecks },
                            { type: "radio", label: "Radio Button", icon: Circle },
                            { type: "checkbox", label: "Checkbox", icon: Square },
                            { type: "file", label: "File Upload", icon: Upload },
                          ].map((item) => (
                            <button
                              key={item.type}
                              draggable
                              onDragStart={() => handleDragStart(item.type, item.label)}
                              onClick={() => handleAddField(item.type, item.label)}
                              className="group flex flex-col items-center gap-1.5 p-2 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-sm hover:scale-[1.02] transition-all cursor-grab active:cursor-grabbing"
                            >
                              <div className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-gray-100 transition-colors">
                                <item.icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-medium text-center leading-tight truncate w-full" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── Create form using existing fields ── */}
                    <div className="border-t border-gray-100/80">
                      <button
                        onClick={() => toggleSidebarSection("existingFields")}
                        className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left ${sidebarSections.existingFields
                            ? "bg-gray-50/80 border-l-2 border-gray-400"
                            : "hover:bg-gray-50"
                          }`}
                      >
                        <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${sidebarSections.existingFields ? "text-[#374151]" : "text-[#475569]"
                          }`} style={{ fontFamily: 'Outfit, sans-serif' }}>
                          <Sliders className={`w-3.5 h-3.5 flex-shrink-0 ${sidebarSections.existingFields ? "text-gray-500" : "text-gray-400"
                            }`} />
                          Create form using existing fields
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${sidebarSections.existingFields ? "text-gray-500 rotate-180" : "text-gray-300"
                          }`} />
                      </button>

                      {sidebarSections.existingFields && (
                        <div className="px-3 pt-3 pb-3">
                          <button
                            onClick={() => setShowSelectFieldModal(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-blue-300 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            Select
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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

      {showSelectFieldModal && (
        <SelectFieldsModal
          initiallySelected={formFields.filter(f => f.sourceFieldKey).map(f => f.sourceFieldKey!)}
          onClose={() => setShowSelectFieldModal(false)}
          onApply={(keys) => {
            keys.forEach(key => {
              const allModules: FieldModule[] = ["client", "process", "appointment", "call", "service", "organization"];
              for (const mod of allModules) {
                const fields = getAllFields(mod);
                const match = fields.find(f => f.key === key);
                if (match) {
                  const exists = formFields.some(ff => ff.sourceFieldKey === key && ff.module === mod);
                  if (!exists) {
                    handleAddRegistryField(key, mod, match.source);
                  }
                  break;
                }
              }
            });
          }}
        />
      )}
    </div>
  );
}
