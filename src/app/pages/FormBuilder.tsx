import React, { useState, useEffect, useRef } from "react";
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
  Eye,
  CheckCircle2,
  Globe,
  Layout,
  Type,
  AlignLeft,
  Circle,
  Square,
  ListChecks,
  ArrowLeft,
  ArrowRight,
  Check,
  Maximize2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { toast } from "sonner";
import FieldRenderer from "../components/form-builder/FieldRenderer";
import FormSettings from "../components/form-builder/FormSettings";
import PageHeader from "../components/layout/PageHeader";
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
  sourceType?: "system" | "custom" | "template";
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

export interface FormBuilderProps {
  isDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  initialForm?: any;
  formId?: number | string;
  returnTo?: string | { tab: string; flowId: number };
  onSaveSuccess?: (savedForm: any) => void;
}

export default function FormBuilder({
  isDrawer = false,
  isOpen = true,
  onClose,
  initialForm: propInitialForm,
  formId: propFormId,
  returnTo: propReturnTo,
  onSaveSuccess,
}: FormBuilderProps = {}): React.ReactElement | null {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAllFields, addCustomField } = useFieldRegistry();
  const { customFieldsClients } = useClientFields();
  const systemFields = getAllFields("client").filter(f => f.source === "system");
  const template = location.state?.template as Template | undefined;
  const locationForm = location.state?.form as any;
  const existingForm = propInitialForm !== undefined ? propInitialForm : locationForm;
  const returnTo = propReturnTo !== undefined ? propReturnTo : location.state?.returnTo;

  // Stable formId for new or existing forms
  const [formId, setFormId] = useState<number>(() => Number(existingForm?.id ?? propFormId ?? Date.now()));

  const sidebarInputRef = useRef<HTMLInputElement>(null);
  const sidebarSelectRef = useRef<HTMLInputElement>(null);
  // optionSourceRefs not needed with replace mode — removed

  const [currentTab, setCurrentTab] = useState<"build" | "design" | "live">("build");
  const activeStepIndex = currentTab === "build" ? 1 : currentTab === "design" ? 2 : 3;
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
  const [activeSection, setActiveSection] = useState<string>("general");
  const toggleSection = (section: string) => {
    setActiveSection((prev) => (prev === section ? "" : section));
  };

  // Auto-create client state
  const [autoCreateClient, setAutoCreateClient] = useState(existingForm?.autoCreateClient ?? false);
  const [autoCreateProcessId, setAutoCreateProcessId] = useState(existingForm?.autoCreateProcessId ?? "");
  const [autoCreateStageId, setAutoCreateStageId] = useState(existingForm?.autoCreateStageId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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

  // Step progress ring popover state
  const [isProgressPopoverOpen, setIsProgressPopoverOpen] = useState(false);
  const progressPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (progressPopoverRef.current && !progressPopoverRef.current.contains(event.target as Node)) {
        setIsProgressPopoverOpen(false);
      }
    }
    if (isProgressPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isProgressPopoverOpen]);

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
        options: sf?.options?.map((o, idx) => ({ id: typeof o.id === "number" ? o.id : idx + 1, label: o.label, value: String(o.value ?? "") })) ?? [],
      };
    }
    return { type: "text" };
  };

  const inferFieldFromCustom = (cf: CustomField): Partial<FormField> => {
    const t = cf.type.toUpperCase();
    if (t === "SIGNATURE" || t === "DRAWING") return { type: "signature" };
    if (t === "DATE") return { type: "date" };
    if (t === "DATE_TIME" || t === "DATETIME") return { type: "time" };
    if (t === "DROPDOWN" || t === "LIST" || t === "SELECT") return { type: "select", options: [{ id: 1, label: "Option 1", value: "option_1" }, { id: 2, label: "Option 2", value: "option_2" }] };
    if (t === "MULTISELECT" || t === "MULTI_SELECT") return { type: "multiselect", options: [{ id: 1, label: "Option 1", value: "option_1" }, { id: 2, label: "Option 2", value: "option_2" }] };
    if (t === "YES_NO" || t === "YESNO") return { type: "radio", options: [{ id: 1, label: "Yes", value: "yes" }, { id: 2, label: "No", value: "no" }] };
    if (t === "NUMBER" || t === "MONEY") return { type: "number" };
    if (t === "LINK" || t === "WHATSAPP_LINK") return { type: "url" };
    if (t === "FILE") return { type: "file" };
    if (t === "RATING") return { type: "rating" };
    if (t === "TEXTAREA" || t === "RICHTEXT") return { type: "textarea" };
    return { type: "text" };
  };

  /**
   * Directly build a FormField from a FieldDefinition and push it onto the
   * canvas. This is the single source-of-truth for registry-linked fields.
   * Using a FieldDefinition directly avoids the React async state-update delay
   * that occurs when looking up a freshly-added custom field from the context.
   */
  const addFormFieldFromDefinition = (sf: FieldDefinition, source: "system" | "custom" | "template") => {
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
      type: sf.inputType === "signature" || sf.inputType === "drawing" ? "signature" :
        sf.inputType === "rating" ? "rating" :
        sf.inputType === "file" ? "file" :
        sf.inputType === "multiselect" ? "multiselect" :
        sf.inputType === "email" ? "email" :
        sf.inputType === "tel" ? "tel" :
        sf.inputType === "select" || sf.inputType === "list" ? "select" :
        sf.inputType === "date" ? "date" :
        sf.inputType === "date_time" ? "time" :
        sf.inputType === "number" || sf.inputType === "money" ? "number" :
        sf.inputType === "textarea" || sf.inputType === "richtext" ? "textarea" :
        sf.inputType === "link" || sf.inputType === "whatsapp_link" ? "url" :
        sf.inputType === "yes_no" ? "radio" :
        "text",
      placeholder: sf.placeholder || `Enter ${sf.label.toLowerCase()}`,
      required: sf.required || false,
      essential: ["name", "email", "phone"].includes(sf.key) && sf.module === "client",
      label: sf.label,
      helpText: "",
      validation: sf.validation || "",
      options: sf.options?.map((o, idx) => ({ id: typeof o.id === "number" ? o.id : idx + 1, label: o.label, value: String(o.value ?? "") })) ||
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
  const handleAddRegistryField = (fieldKey: string, module: FieldModule, source: "system" | "custom" | "template") => {
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
  }, [existingForm?.id, isOpen]);

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

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Persist form data back to webForms storage
      const saved = sessionStorage.getItem("webForms") || localStorage.getItem("webForms");
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
        formType: existingForm?.formType || "standard",
        createdBy: existingForm?.createdBy || "Admin User",
        fieldCount: formFields.length,
        submissions: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.submissions ?? 0) : 0,
        enabled: false,
        createdAt: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.createdAt ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdated: new Date().toISOString(),
        autoCreateClient,
        autoCreateProcessId,
        autoCreateStageId,
        category: existingForm?.category,
        industry: existingForm?.industry,
        scopingRules: existingForm?.scopingRules,
        roles: existingForm?.roles,
        permissions: existingForm?.permissions,
        entity: existingForm?.entity,
      };
      const nextForms = existingForm?.id
        ? forms.map((f: any) => f.id === formId ? updatedForm : f)
        : [updatedForm, ...forms];

      sessionStorage.setItem("webForms", JSON.stringify(nextForms));
      localStorage.setItem("webForms", JSON.stringify(nextForms));
      window.dispatchEvent(new CustomEvent("ma_web_forms_updated", { detail: nextForms }));

      toast.success("Form saved as draft");
      if (onSaveSuccess) onSaveSuccess(updatedForm);
      if (isDrawer) {
        onClose?.();
        return;
      }
      const defaultReturn = location.pathname.startsWith("/admin") ? "/admin/forms" : "/web-forms";
      if (returnTo) {
        if (typeof returnTo === "string") {
          navigate(returnTo);
        } else {
          navigate(defaultReturn, { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
        }
      } else {
        navigate(defaultReturn);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishForm = async () => {
    // Validate autoCreateClient configuration
    if (autoCreateClient && (!autoCreateProcessId || !autoCreateStageId)) {
      toast.error("Please select a Process and Initial Stage before publishing.");
      return;
    }
    setIsPublishing(true);
    try {
      // Persist form data back to webForms storage
      const saved = sessionStorage.getItem("webForms") || localStorage.getItem("webForms");
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
        formType: existingForm?.formType || "standard",
        createdBy: existingForm?.createdBy || "Admin User",
        fieldCount: formFields.length,
        submissions: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.submissions ?? 0) : 0,
        enabled: true,
        createdAt: existingForm?.id ? (forms.find((f: any) => f.id === existingForm.id)?.createdAt ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdated: new Date().toISOString(),
        autoCreateClient,
        autoCreateProcessId,
        autoCreateStageId,
        category: existingForm?.category,
        industry: existingForm?.industry,
        scopingRules: existingForm?.scopingRules,
        roles: existingForm?.roles,
        permissions: existingForm?.permissions,
        entity: existingForm?.entity,
      };
      const nextForms = existingForm?.id
        ? forms.map((f: any) => f.id === formId ? updatedForm : f)
        : [updatedForm, ...forms];

      sessionStorage.setItem("webForms", JSON.stringify(nextForms));
      localStorage.setItem("webForms", JSON.stringify(nextForms));
      window.dispatchEvent(new CustomEvent("ma_web_forms_updated", { detail: nextForms }));

      toast.success("Form published successfully!");
      if (onSaveSuccess) onSaveSuccess(updatedForm);
      if (isDrawer) {
        onClose?.();
        return;
      }
      const defaultReturn = location.pathname.startsWith("/admin") ? "/admin/forms" : "/web-forms";
      if (returnTo) {
        if (typeof returnTo === "string") {
          navigate(returnTo);
        } else {
          navigate(defaultReturn, { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
        }
      } else {
        navigate(defaultReturn);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = () => {
    if (isDrawer) {
      onClose?.();
      return;
    }
    const defaultReturn = location.pathname.startsWith("/admin") ? "/admin/forms" : "/web-forms";
    if (returnTo) {
      if (typeof returnTo === "string") {
        navigate(returnTo);
      } else {
        navigate(defaultReturn, { state: { returnToTab: returnTo.tab, returnToFlowId: returnTo.flowId } });
      }
    } else {
      navigate(defaultReturn);
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
    setActiveSection("general");
  };

  const handleCloseFieldSettings = () => {
    setShowFieldSettings(false);
    setSelectedField(null);
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


  if (isDrawer && !isOpen) {
    return null;
  }

  const contentJSX = (
    <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden select-none">
      {/* ── Topbar Portal: Mounts "Form Builder" directly into application PageHeader ── */}
      {!isDrawer && (
        <PageHeader
          title="Form Builder"
          subtitle="Build, configure fields, and publish your form"
        />
      )}

      {/* ── Premium SaaS Header Bar (Single 72px row: Back + Title Block | Ring Progress + Actions) ── */}
      <header className="shrink-0 bg-white h-[72px] border-b border-[#E2E8F0] flex items-center">
        <div className="max-w-[1260px] mx-auto w-full px-4 h-full flex items-center justify-between gap-4">
          {/* Left Side: 36px Circular Back Button + Title Block (20px gap) */}
          <div className="flex items-center gap-5 min-w-0 max-w-[500px]">
            {/* 36px Circular Back Button */}
            <button
              type="button"
              onClick={handleCancel}
              title="Back to Form Templates"
              aria-label="Back to Form Templates"
              className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#475569]" strokeWidth={2} />
            </button>

            {/* Title Block: Title (20px, 600, 28px line-height, #0F172A) + Description (13px, 400, 18px line-height, #64748B, 2px mt) */}
            <div className="flex flex-col justify-center min-w-0 max-w-[480px]">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Untitled Form"
                title="Click to edit form title"
                className="text-[20px] font-semibold leading-[28px] text-[#0F172A] bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-[#E2E8F0] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none rounded px-1 -ml-1 py-0 truncate w-full transition-colors cursor-text"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />
              {formDescription ? (
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add description..."
                  title={formDescription}
                  className="text-[13px] font-normal leading-[18px] text-[#64748B] bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-[#E2E8F0] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none rounded px-1 -ml-1 py-0 mt-[2px] truncate w-full transition-colors cursor-text placeholder:text-[#94A3B8]"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                />
              ) : (
                <div className="group/desc relative">
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="+ Add description..."
                    className="text-[13px] font-normal leading-[18px] text-[#94A3B8] opacity-0 group-hover/desc:opacity-100 focus:opacity-100 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-[#E2E8F0] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none rounded px-1 -ml-1 py-0 mt-[2px] truncate w-full transition-opacity cursor-text"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Circular Ring Progress + Divider + Action Buttons */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Circular Ring Progress with Jump Popover */}
            <div className="relative" ref={progressPopoverRef}>
              <button
                type="button"
                onClick={() => setIsProgressPopoverOpen(!isProgressPopoverOpen)}
                role="progressbar"
                aria-valuenow={activeStepIndex}
                aria-valuemin={1}
                aria-valuemax={3}
                aria-label={`Form Builder progress: step ${activeStepIndex} of 3, ${currentTab === "build" ? "Build" : currentTab === "design" ? "Design & Preview" : "Go Live"}`}
                className="flex items-center gap-3 p-1 -m-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 group"
              >
                {/* 40px SVG Ring Progress */}
                <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                  <svg className="w-10 h-10 -rotate-90 transform" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="4"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke={activeStepIndex === 3 ? "#10B981" : "#2563EB"}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={100.53}
                      strokeDashoffset={100.53 - (activeStepIndex / 3) * 100.53}
                      style={{ transition: "stroke-dashoffset 300ms ease-out, stroke 300ms ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {activeStepIndex === 3 ? (
                      <Check className="w-4 h-4 text-[#10B981] stroke-[2.5]" />
                    ) : (
                      <span className="text-[11px] font-semibold text-[#0F172A]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {activeStepIndex}/3
                      </span>
                    )}
                  </div>
                </div>

                {/* Two lines of text next to ring */}
                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[#0F172A] leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {currentTab === "build" ? "Build" : currentTab === "design" ? "Design & Preview" : "Go Live"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <span className="text-[12px] text-[#64748B] leading-tight mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {currentTab === "build"
                      ? "Next: Design & Preview"
                      : currentTab === "design"
                        ? "Next: Go Live"
                        : "Ready to publish"}
                  </span>
                </div>
              </button>

              {/* Steps Jump Popover */}
              {isProgressPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E2E8F0] rounded-[12px] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] border-b border-gray-100 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Step Navigation
                  </div>
                  <div className="space-y-1">
                    {[
                      { tab: "build", step: 1, title: "1. Build", desc: "Form fields and canvas" },
                      { tab: "design", step: 2, title: "2. Design & Preview", desc: "Branding, theme & preview" },
                      { tab: "live", step: 3, title: "3. Go Live", desc: "Publish settings & share URL" },
                    ].map((item) => {
                      const isDone = activeStepIndex > item.step || (item.step === 3 && activeStepIndex === 3);
                      const isCurrent = currentTab === item.tab;
                      return (
                        <button
                          key={item.tab}
                          type="button"
                          onClick={() => {
                            setCurrentTab(item.tab as "build" | "design" | "live");
                            setIsProgressPopoverOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                            isCurrent ? "bg-blue-50/70 text-blue-900" : "hover:bg-slate-50 text-[#0F172A]"
                          }`}
                        >
                          <div className="shrink-0">
                            {isDone && !isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-200">
                                {item.step === 3 ? <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" /> : item.step}
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border border-gray-300 bg-white text-gray-400 flex items-center justify-center text-xs font-medium">
                                {item.step}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[13px] font-semibold ${isCurrent ? "text-[#2563EB]" : "text-[#0F172A]"}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Thin 1px vertical divider (24px tall, #E2E8F0) */}
            <div className="h-6 w-px bg-[#E2E8F0] shrink-0" />

            {/* Action Buttons: 8px gap, 36px tall, 8px radius, 13px font, weight 500 */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Cancel: Ghost button */}
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-3.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] text-[13px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Cancel
              </button>

              {/* Back: Outline button on Design & Preview and Go Live */}
              {currentTab !== "build" && (
                <button
                  type="button"
                  onClick={handleBackTab}
                  className="h-9 px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] hover:border-gray-300 text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>Back</span>
                </button>
              )}

              {/* Save Draft: White, 1px #E2E8F0 border, #0F172A text */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="h-9 px-3.5 rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] hover:border-gray-300 text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {isSaving && (
                  <span className="w-3.5 h-3.5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
                <span>Save Draft</span>
              </button>

              {/* Primary: Solid #0F172A background, white text */}
              {currentTab !== "live" ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublishForm}
                  disabled={isPublishing}
                  className="h-9 px-4 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {isPublishing ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  )}
                  <span>Publish Form</span>
                </button>
              )}

              {/* Drawer Controls (Full Screen & Close X) if in Drawer mode */}
              {isDrawer && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E8F0] shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const currentForm = {
                        id: formId,
                        name: formTitle,
                        description: formDescription,
                        fields: formFields,
                        submitButtonText,
                        status: existingForm?.status || "draft",
                        autoCreateClient,
                        autoCreateProcessId,
                        autoCreateStageId,
                        customUrlSlug,
                        theme: { backgroundTheme, typography, buttonColor },
                        category: existingForm?.category,
                        scopingRules: existingForm?.scopingRules,
                        roles: existingForm?.roles,
                        permissions: existingForm?.permissions,
                      };
                      onClose?.();
                      const targetRoute = location.pathname.startsWith("/admin") ? "/admin/form-builder" : "/web-forms/builder";
                      navigate(targetRoute, { state: { form: currentForm, returnTo: location.pathname } });
                    }}
                    className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer shrink-0"
                    title="Expand to Full Page"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer shrink-0"
                    title="Close Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content area: strictly fixed-height, child panes scroll independently ── */}
      <main className="flex-1 min-h-0 overflow-hidden py-4">
        <div className="max-w-[1260px] mx-auto w-full px-4 h-full">
          {/* ── TAB 1: BUILD ── */}
          {currentTab === "build" && (
            <div className="flex gap-5 h-full items-start">
              {/* Left: Canvas Area (scrolls independently, centers form card) */}
              <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1">
                <div className="max-w-[740px] mx-auto space-y-3.5 pb-4">
                {/* Form Fields Canvas Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`space-y-2.5 min-h-[160px] p-3.5 border-2 border-dashed rounded-xl transition-colors bg-white/60 ${
                    draggedFieldType ? "border-blue-500 bg-blue-50/50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {formFields.length === 0 ? (
                    <div className="text-center py-7">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                        <LayoutGrid className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Form Canvas is Empty
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Click or drag fields from the right panel to build your form
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

                {/* Slim Submit Button Text Row */}
                <div className="bg-white border border-border rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
                  <div className="shrink-0">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Submit Button Text
                    </label>
                  </div>
                  <div className="flex-1 max-w-xs flex items-center gap-2">
                    <input
                      type="text"
                      value={submitButtonText}
                      onChange={(e) => setSubmitButtonText(e.target.value)}
                      maxLength={30}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                      {submitButtonText.length}/30
                    </span>
                  </div>
                </div>
                </div>
              </div>

              {/* Right: Fixed-width (340px) sticky & scrolls independently */}
              <div className={`w-[340px] shrink-0 sticky top-0 self-start max-h-[calc(100vh-104px)] bg-white border border-[#E2E8F0] rounded-xl shadow-2xs flex flex-col ${
                showFieldSettings && selectedField ? "h-[calc(100vh-104px)] overflow-hidden" : "h-auto overflow-y-auto"
              }`}>
                {showFieldSettings && selectedField ? (
                  /* Field Settings Panel */
                  <div className="flex flex-col h-full">
                    {/* Pinned header with field name, type, and close button */}
                    <div className="shrink-0 p-3 border-b border-border bg-gray-50/70 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-xs font-bold text-gray-900 truncate" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                          {selectedField.label || selectedField.name}
                        </h3>
                        <span className="text-[10px] font-mono text-gray-500 uppercase">
                          {selectedField.type} Settings
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseFieldSettings}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors cursor-pointer shrink-0"
                        title="Close Settings (Return to Elements)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable accordion: exactly 1 open at a time */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                      {/* GENERAL SECTION */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => toggleSection('general')}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                            General
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'general' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeSection === 'general' && (
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
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'appearance' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeSection === 'appearance' && (
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
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'validation' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeSection === 'validation' && (
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
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'advanced' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeSection === 'advanced' && (
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
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeSection === 'integrations' ? 'rotate-180' : ''}`} />
                        </button>
                        {activeSection === 'integrations' && (
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
                    </div>

                    {/* Pinned Footer with Delete Field Button */}
                    <div className="shrink-0 p-3 border-t border-border bg-gray-50/60">
                      <button
                        type="button"
                        onClick={() => handleDeleteField(selectedField.id)}
                        className="w-full px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-red-200/60"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Field</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Nothing selected: Form Elements & Create form using existing fields */
                  <div className="p-4 flex flex-col">
                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-[#0F172A]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        Form Elements
                      </h3>
                      <p className="text-[11px] text-[#64748B] mt-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Click or drag elements to canvas
                      </p>
                    </div>

                    {/* 8px gaps between the field tiles (rows and columns) */}
                    <div className="grid grid-cols-2 gap-2">
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
                          type="button"
                          draggable
                          onDragStart={() => handleDragStart(item.type, item.label)}
                          onClick={() => handleAddField(item.type, item.label)}
                          className="group flex flex-col items-center gap-1.5 p-2.5 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#2563EB] hover:shadow-2xs hover:bg-blue-50/20 transition-all cursor-grab active:cursor-grabbing text-center"
                        >
                          <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-[#64748B] group-hover:bg-blue-100 group-hover:text-[#2563EB] transition-colors">
                            <item.icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[11px] font-medium leading-tight truncate w-full text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Section label "EXISTING FIELDS": 11px, weight 600, letter-spacing 0.06em, color #64748B, uppercase. 16px margin-top above it, separated from the tiles by a 1px #E2E8F0 divider. */}
                    <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        EXISTING FIELDS
                      </span>
                      {/* Helper text under it: 12px, line-height 18px, color #64748B, 4px margin-top, 12px margin-bottom. Keep it to its existing wording. */}
                      <p className="text-[12px] leading-[18px] text-[#64748B] mt-1 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Import configured fields from your CRM, Process, or Appointments.
                      </p>
                      {/* Button: full width of the panel, 40px height, 8px radius, white background, 1px SOLID #E2E8F0 border (replace the dashed blue border), #0F172A text at 13px weight 500, with the existing icon in #475569 at 16px and an 8px gap to the label. No blue text.
                          Hover: #F8FAFC background and #CBD5E1 border. Focus: 2px brand-blue focus ring. Active: #F1F5F9 background. */}
                      <button
                        type="button"
                        onClick={() => setShowSelectFieldModal(true)}
                        className="w-full h-10 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:bg-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1 text-[#0F172A] text-[13px] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                        style={{ fontFamily: 'DM Sans, sans-serif' }}
                      >
                        <Sliders className="w-4 h-4 text-[#475569]" />
                        <span>Select from Field Library</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: DESIGN & PREVIEW ── */}
          {currentTab === "design" && (
            <div className="flex gap-5 h-full">
              {/* Left: Settings (~42%) */}
              <div className="w-[440px] shrink-0 h-full">
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

              {/* Right: Live Preview (~58-60%) */}
              <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-100/70 border border-border rounded-xl shadow-2xs overflow-hidden">
                <div className="shrink-0 p-3 px-4 bg-white border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Live End-User Preview
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200/60 rounded-full font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Real-time
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 flex justify-center items-start">
                  <div className={`w-full max-w-[560px] p-6 rounded-2xl border shadow-sm space-y-5 transition-all ${
                    backgroundTheme === "dark" ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-border text-foreground"
                  }`}>
                    <div className="border-b border-border pb-3">
                      <h2 className="text-xl font-bold mb-1" style={{ fontFamily: typography.includes("Outfit") ? "Outfit, sans-serif" : typography.includes("Roboto") ? "Roboto, sans-serif" : "DM Sans, sans-serif" }}>
                        {formTitle || "Untitled Form"}
                      </h2>
                      {formDescription && (
                        <p className="text-xs text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {formDescription}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {formFields.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-8">No fields added to form yet.</p>
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

                    <div className="pt-2 border-t border-border">
                      <button
                        type="button"
                        style={{ backgroundColor: buttonColor, fontFamily: "DM Sans, sans-serif" }}
                        className="w-full py-2.5 px-5 rounded-lg text-white font-semibold shadow-2xs hover:opacity-90 transition-opacity text-xs cursor-pointer"
                      >
                        {submitButtonText || "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: GO LIVE ── */}
          {currentTab === "live" && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-[740px] mx-auto py-2 space-y-3.5 pb-4">
              {/* Header */}
              <div className="text-center py-2">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Your Form is Ready!
                </h2>
                <p className="text-xs text-gray-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Review form details below and publish to make it live.
                </p>
              </div>

              {/* 1. Form Summary Card */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Form Summary
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {formFields.length} {formFields.length === 1 ? 'field' : 'fields'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 bg-gray-50 px-2.5 rounded-lg text-xs">
                  <span className="text-gray-500 font-medium">Title:</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[400px]">{formTitle || "Untitled Form"}</span>
                </div>
                {formFields.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {formFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between py-1 px-2.5 bg-gray-50/60 rounded-md text-xs">
                        <span className="text-gray-700 font-medium truncate max-w-[280px]">{field.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {field.required && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-red-100 text-red-700 rounded font-medium">Required</span>
                          )}
                          {field.essential && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded font-medium">Essential</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded font-mono uppercase">{field.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Design Settings Card */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Design Settings
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Theme</p>
                    <p className="text-xs font-semibold text-gray-900 capitalize mt-0.5">{backgroundTheme}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Typography</p>
                    <p className="text-xs font-semibold text-gray-900 truncate mt-0.5">{typography.split('(')[0].trim()}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Button Color</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-3.5 h-3.5 rounded border border-gray-300 shrink-0" style={{ backgroundColor: buttonColor }} />
                      <p className="text-xs font-mono font-semibold text-gray-900">{buttonColor}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Button Text</p>
                    <p className="text-xs font-semibold text-gray-900 truncate mt-0.5">{submitButtonText}</p>
                  </div>
                </div>
              </div>

              {/* 3. Client Auto-Creation Setting Card */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  Client Auto-Creation Setting
                </h3>
                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">Auto-create clients from submissions</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                    <span className={`w-2 h-2 rounded-full ${autoCreateClient ? "bg-green-500" : "bg-gray-400"}`} />
                    {autoCreateClient ? "Enabled" : "Disabled"}
                  </span>
                </div>
                {autoCreateClient && (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-purple-50/50 border border-purple-100 rounded-lg">
                      <p className="text-[10px] text-purple-600 uppercase font-semibold">Assigned Process</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{autoCreateProcessId || "Default"}</p>
                    </div>
                    <div className="p-2 bg-purple-50/50 border border-purple-100 rounded-lg">
                      <p className="text-[10px] text-purple-600 uppercase font-semibold">Initial Stage</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{autoCreateStageId || "Default"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Share Your Form Card */}
              <div className="bg-white border border-border rounded-xl p-4 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Share Your Form
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Custom URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={customUrlSlug}
                    onChange={(e) => setCustomUrlSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="my-custom-form"
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                  <p className="text-[11px] text-gray-400 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Add a slug to personalize the public URL. A default unique ID will be used if left blank.
                  </p>
                </div>
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-lg p-2.5 text-xs text-blue-800">
                  Your form link will become active immediately upon publishing.
                </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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

  if (isDrawer) {
    return (
      <div className="fixed inset-0 flex justify-end overflow-hidden z-[650] select-none">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={handleCancel}
        />

        {/* Drawer Panel */}
        <div className="relative w-full max-w-[95vw] 2xl:max-w-[1550px] h-full bg-[#F8FAFC] shadow-2xl flex flex-col z-50 border-l border-gray-200 overflow-hidden transform transition-transform duration-300 ease-out">
          {contentJSX}
        </div>
      </div>
    );
  }

  return contentJSX;
}

export function FormBuilderDrawer(props: Omit<FormBuilderProps, "isDrawer">): React.ReactElement | null {
  return <FormBuilder {...props} isDrawer={true} />;
}