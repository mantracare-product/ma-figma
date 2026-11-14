import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../lib/sampleBundlesRegistry";
import "../../../lib/sampleRuleSets";
import {
  disableDemoSet,
  enableDemoSet,
  getSampleSetStatus,
  listSampleRuleSets,
  loadSampleTemplates,
} from "../../../lib/sampleBundles";
import { AUTOMATION_STORE_EVENT } from "../../../lib/useAutomationStore";

const btn = "px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50";

/** "Load sample templates" + "Enable demo set" per capability group (Process and Automation pages). */
export default function SampleTemplatesPanel() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(AUTOMATION_STORE_EVENT, bump);
    return () => window.removeEventListener(AUTOMATION_STORE_EVENT, bump);
  }, []);

  const sets = listSampleRuleSets();

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3" data-testid="sample-templates-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">Sample templates</div>
          <div className="text-xs text-slate-500">
            Loads mock reference data, queue views and sample rules. Sample rules are loaded disabled; nothing is overwritten.
          </div>
        </div>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const r = loadSampleTemplates();
            toast.success(r.total > 0 ? `Loaded ${r.total} sample item${r.total === 1 ? "" : "s"}` : "Sample templates already loaded");
          }}
        >
          Load sample templates
        </button>
      </div>
      {sets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sets.map((s) => {
            const st = getSampleSetStatus(s.id);
            const on = !!st && st.total > 0 && st.enabled === st.total;
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                <div className="text-xs">
                  <b>Set {s.id}</b> · {s.label}
                  <span className="text-slate-500"> ({st ? `${st.enabled}/${st.total} on` : "not loaded"})</span>
                </div>
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    if (on) {
                      disableDemoSet(s.id);
                      toast.success(`Demo set ${s.id} disabled`);
                    } else {
                      const n = enableDemoSet(s.id);
                      toast.success(`Demo set ${s.id}: ${n} rule${n === 1 ? "" : "s"} enabled`);
                    }
                  }}
                >
                  {on ? "Disable" : "Enable demo set"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
