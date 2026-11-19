
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./lib/ruleEngine";
  import { ensureDemoData, testRunActive } from "./lib/demoData";
  import { ensureRcmFieldSeeds } from "./lib/rcmFieldSeeds";
  import { ensureRcmDefaults } from "./lib/rcmDefaults";
  import { migrateBillingSetupToOrg } from "./lib/orgBilling";
  import { migrateStripSampleSuffix } from "./lib/sampleSuffixMigration";
  import { seedDemoWorkspace, restoreDemoScribeSessions } from "./lib/rcmDemoWorkspace";
  import { migrateStartCallToStageCalls } from "./lib/stageCallMigration";
  import { migratePaymentModes } from "./lib/paymentMode";
  import { ensureRound4Defaults } from "./lib/rcmDefaultsR4";
import { migrateFeeSchedulesToServicePrices } from "./lib/feeScheduleMigration";
import { migratePayersToThreeFunctionEnrollment } from "./lib/payerMigration";
import { migrateScrubRulesToConditionBlocks } from "./lib/scrubMigration";
import {
  migrateProviderCredentialsToTeamMember,
  migrateTeamMemberProvidesServices,
} from "./lib/providerCredentialMigration";
import { migrateStageCallSwitch } from "./lib/stageCallSwitchMigration";
import { migrateToSingleClaimPipeline } from "./lib/rcmPipelineR6";
  import { logMigration } from "./lib/stageCallMigration";

  // Repairs the demo org (purges leftover test records, re-applies seeds to empty stores). Idempotent.
  // Billing entity and locations (POS) now live on the Organization record: copy the old Billing setup values once.
  try { if (!testRunActive()) migrateBillingSetupToOrg(); } catch { /* ignore */ }
  try { if (!testRunActive()) migrateStripSampleSuffix(); } catch { /* ignore */ }
  ensureDemoData();
  // Registers the revenue-cycle fields and sections in the field registry once (never overwrites edits).
  try { ensureRcmFieldSeeds(); } catch { /* registry unavailable */ }
  // One-time RCM starting set (workflows, queue views, rules, payers, templates), ordinary editable items. Skipped during browser test runs.
  try { if (!testRunActive()) ensureRcmDefaults(); } catch { /* ignore */ }

  // Round 4: calls are stage settings (the Start Call action is gone): migrate stored rules once, logged to mantra_migration_log_v1.
  try { if (!testRunActive()) migrateStartCallToStageCalls(); } catch { /* ignore */ }

  // Round 4: services get the Billable flag and existing appointments a payment mode (once, logged).
  try { if (!testRunActive()) { const r = migratePaymentModes(); if (r.services || r.appointments) logMigration("R4.2", `Payment modes: ${r.services} service(s) marked billable to insurance (they had a CPT code or prior-auth default), ${r.appointments} appointment(s) given a payment mode (insurance only with a coverage and a billable service, else self-pay)`); } } catch { /* ignore */ }

  // Round 4 starting set (flagged steps, ordinary editable items): appointment workflow "Appointment via Insurance"
  try { if (!testRunActive()) ensureRound4Defaults(); } catch { /* ignore */ }

  // Round 5: fees live on the service only (migrate default fee schedule lines to service price once, logged).
  try { if (!testRunActive()) migrateFeeSchedulesToServicePrices(); } catch { /* ignore */ }

  // Round 5: payers 3-function enrollment & type preset (once, logged).
  try { if (!testRunActive()) migratePayersToThreeFunctionEnrollment(); } catch { /* ignore */ }

  // Round 5: scrub rules condition blocks & extra rules (once, logged).
  try { if (!testRunActive()) migrateScrubRulesToConditionBlocks(); } catch { /* ignore */ }

  // Round 5: provider credentials move to team member records (once, logged).
  try { if (!testRunActive()) migrateProviderCredentialsToTeamMember(); } catch { /* ignore */ }
  try { if (!testRunActive()) migrateTeamMemberProvidesServices(); } catch { /* ignore */ }

  // Round 5: global voice switch migrated to Inconclusive stage call setting (once, logged).
  try { if (!testRunActive()) migrateStageCallSwitch(); } catch { /* ignore */ }

  // Round 6: single claim pipeline migration (once, logged).
  try { if (!testRunActive()) migrateToSingleClaimPipeline(); } catch { /* ignore */ }

  // Realistic starting data for the demo organization, once (add-only, never during a test run).
  try { if (!testRunActive()) { seedDemoWorkspace(); restoreDemoScribeSessions(); } } catch { /* ignore */ }

  // Dev-only: test hook for the Tampermonkey RCM tests (tools/tm-tests). Removed from production builds.
  if (import.meta.env.DEV) {
    void import("./lib/rcmTestHook");
  }

  createRoot(document.getElementById("root")!).render(<App />);
  