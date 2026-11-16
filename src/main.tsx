
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./lib/ruleEngine";
  import { ensureDemoData, testRunActive } from "./lib/demoData";
  import { ensureRcmFieldSeeds } from "./lib/rcmFieldSeeds";
  import { ensureRcmDefaults } from "./lib/rcmDefaults";
  import { migrateBillingSetupToOrg } from "./lib/orgBilling";
  import { migrateStripSampleSuffix } from "./lib/sampleSuffixMigration";

  // Repairs the demo org (purges leftover test records, re-applies seeds to empty stores). Idempotent.
  // Billing entity and locations (POS) now live on the Organization record: copy the old Billing setup values once.
  try { if (!testRunActive()) migrateBillingSetupToOrg(); } catch { /* ignore */ }
  try { if (!testRunActive()) migrateStripSampleSuffix(); } catch { /* ignore */ }
  ensureDemoData();
  // Registers the revenue-cycle fields and sections in the field registry once (never overwrites edits).
  try { ensureRcmFieldSeeds(); } catch { /* registry unavailable */ }
  // One-time RCM starting set (workflows, queue views, rules, payers, templates), ordinary editable items. Skipped during browser test runs.
  try { if (!testRunActive()) ensureRcmDefaults(); } catch { /* ignore */ }

  // Dev-only: test hook for the Tampermonkey RCM tests (tools/tm-tests). Removed from production builds.
  if (import.meta.env.DEV) {
    void import("./dev/rcmTestHook");
  }

  createRoot(document.getElementById("root")!).render(<App />);
  