import { useState } from "react";
import { Search, X } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useFieldRegistry, FieldModule } from "../../context/FieldRegistryContext";

interface VariableSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (variable: string) => void;
    mode?: "insert" | "select";
}

const MODULE_LABELS: Record<string, string> = {
  client: "Client Fields",
  process: "Process Fields",
  appointment: "Appointment Fields",
  call: "Call Fields",
  service: "Service Fields",
  organization: "Organization Fields",
  teamMember: "Team Member Fields",
};

const ALL_MODULES: Exclude<FieldModule, "deal">[] = ["client", "process", "appointment", "call", "service", "organization", "teamMember"];

export default function VariableSelectorModal({ isOpen, onClose, onInsert, mode = "insert" }: VariableSelectorModalProps) {
    const { getAllFields } = useFieldRegistry();
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string | null>(null);

    const handleInsert = (token: string) => {
        onInsert(token);
        onClose();
        setSelected(null);
        setSearch("");
    };

    // Construct categories dynamically from the field registry
    const categories = ALL_MODULES.map((module) => {
        const fields = getAllFields(module).map((f) => {
            const tokenVal = module === "teamMember" 
                ? `teamMember.${f.key}` 
                : (module === "client" ? f.key : `${module}.${f.key}`);
            return {
                name: f.label,
                token: `{{${tokenVal}}}`
            };
        });
        return {
            id: module,
            label: MODULE_LABELS[module] || module,
            variables: fields
        };
    }).filter(cat => cat.variables.length > 0);

    const q = search.toLowerCase();
    const visible = categories.map((cat) => ({
        ...cat,
        variables: cat.variables.filter(
            (v) => !q || v.name.toLowerCase().includes(q) || v.token.toLowerCase().includes(q)
        ),
    })).filter((cat) => cat.variables.length > 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { onClose(); setSelected(null); setSearch(""); }}
            title={mode === "select" ? "Select Field" : "Insert Variable"}
            maxWidth="sm"
            footer={
                <div className="flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => selected && handleInsert(selected)} disabled={!selected}>
                        {mode === "select" ? "Select" : "Insert"}
                    </Button>
                </div>
            }
        >
            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search variables..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-input-background border border-input rounded-lg text-sm"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                    {visible.length === 0 ? (
                        <p className="text-center py-8 text-sm text-muted-foreground">No variables found</p>
                    ) : (
                        visible.map((cat) => (
                            <div key={cat.id}>
                                <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {cat.label}
                                </div>
                                {cat.variables.map((v) => (
                                    <button
                                        key={v.token}
                                        type="button"
                                        onClick={() => setSelected(v.token)}
                                        onDoubleClick={() => handleInsert(v.token)}
                                        className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors ${selected === v.token ? "bg-primary/10" : ""
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${selected === v.token ? "text-primary" : ""}`}>{v.name}</span>
                                        <code className="text-[11px] text-muted-foreground font-mono shrink-0">{v.token}</code>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                <p className="text-xs text-muted-foreground">Double-click a variable to insert instantly.</p>
            </div>
        </Modal>
    );
}