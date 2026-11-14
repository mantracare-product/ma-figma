/**
 * DEV-ONLY test hook for the Tampermonkey RCM tests (tools/tm-tests). Imported from main.tsx behind
 * `import.meta.env.DEV`, so it is removed from production builds.
 *
 * `window.__rcm` exposes the real stores/services as namespaces (no behavior of its own) plus a few helpers:
 *   snapshot() / restore(snap)  - copy / put back all localStorage + sessionStorage
 *   freshWorld()                - clear the RCM-affected keys and seed one RCMTEST- client
 *   TEST_PREFIX                 - "RCMTEST-"
 */
import * as processLogs from "../lib/processLogsStore";
import * as automation from "../lib/useAutomationStore";
import * as engine from "../lib/ruleEngine";
import * as eventBus from "../lib/eventBus";
import * as tasks from "../lib/tasksStore";
import * as taskViews from "../lib/taskViewsStore";
import * as taskAutoClose from "../lib/taskAutoClose";
import * as claims from "../lib/claimsStore";
import * as claimService from "../lib/claimService";
import * as claimWorkflows from "../lib/claimWorkflows";
import * as claimActions from "../lib/claimActions";
import * as claimStatusAndCalls from "../lib/claimStatusAndCalls";
import * as appointments from "../lib/appointmentService";
import * as clients from "../lib/clientsStore";
import * as rolesStore from "../lib/rolesStore";
import * as permissions from "../lib/permissions";
import * as defaultRoles from "../lib/defaultRoles";
import * as sampleRoles from "../lib/rcmSampleRoles";
import * as billing from "../lib/billingSetupStore";
import * as priorAuth from "../lib/priorAuthRulesStore";
import * as eligibility from "../lib/eligibility";
import * as runEligibility from "../lib/runEligibility";
import * as authActions from "../lib/authActions";
import * as coverages from "../lib/coveragesStore";
import * as invoices from "../lib/invoiceService";
import * as invoiceFromClaim from "../lib/invoiceFromClaim";
import * as reports from "../lib/rcmReportSources";
import * as kpis from "../lib/rcmKpis";
import * as jobs from "../lib/rcmJobs";
import * as sampleBundles from "../lib/sampleBundles";
import "../lib/sampleBundlesRegistry";
import "../lib/sampleRuleSets";
import * as era from "../lib/eraStore";
import * as remittance from "../lib/remittanceActions";
import * as voice from "../lib/voiceBenefits";
import * as scribeBilling from "../lib/scribeBilling";
import * as scribe from "../lib/scribeSessionStore";
import * as recordWriter from "../lib/recordWriter";
import * as recordContext from "../lib/recordContext";
import * as actionRuns from "../lib/actionRuns";
import * as audit from "../lib/auditLogsStore";
import * as notifSettings from "../lib/rcmNotificationSettings";
import * as team from "../lib/teamStore";
import * as processStore from "../lib/useProcessStore";
import * as dealCards from "../lib/dealCards";
import * as claimSamples from "../lib/rcmSampleClaimWorkflows";
import * as sampleIds from "../lib/rcmSampleIds";
import * as ruleContext from "../lib/ruleContextFields";
import * as fieldSeeds from "../lib/rcmFieldSeeds";
import * as fieldRegistry from "../lib/fieldRegistryCore";
import * as messages from "../lib/messageActions";
import * as conversations from "../lib/useConversations";
import * as taskLinks from "../lib/taskLinks";
import * as coverageProcess from "../lib/rcmSampleProcess";
import * as verifyNow from "../lib/verifyNow";
import * as startProcess from "../lib/startProcessAction";
import * as notifications from "../lib/notificationsStore";
import * as activity from "../lib/activityEngine";
import * as cptCodes from "../lib/cptCodes";

const TEST_PREFIX = "RCMTEST-";

/** localStorage keys the RCM features read or write (cleared by freshWorld). */
const RCM_KEYS = [
  "callLogs", "callLogs_demo", "callLogs_schema_v2", "deals", "clients", "clients_demo", "appointments_v1", "mantra_claims_v1", "claims_schema_v2",
  "mantra_invoices_v1", "mantra_tasks_store", "mantra_task_views_v1", "mantra_global_automation_rules_v1", "mantra_stage_moves_log_v1", "activityEngine_v1",
  "mantra_coverages_v1", "mantra_payers_v1", "mantra_billing_entity_v1", "mantra_billing_locations_v1", "mantra_fee_schedules_v1", "mantra_claim_defaults_v1",
  "mantra_scrub_rules_v1", "mantra_provider_credentials_v1", "mantra_prior_auth_rules_v1", "mantra_eligibility_results_v1", "mantra_eligibility_settings_v1",
  "mantra_message_templates_v1", "mantra_eras_v1", "mantra_rcm_calls_v1", "mantra_clearinghouse_settings_v1", "automation_action_runs_v1", "settings_roles_v2",
  "mantra_rcm_notification_settings_v1", "mantra_rcm_voice_enabled", "mantra_field_registry_v1", "whatsappMockConversations", "mantra_admin_audit_logs",
  "process_store_processes", "mantra_team_members", "settings_allUsers", "ma_services_store", "ma_services_demo", "ma_services_store_signup",
];

function snapshot(): { local: Record<string, string>; session: Record<string, string> } {
  const dump = (s: Storage) => {
    const o: Record<string, string> = {};
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)!;
      o[k] = s.getItem(k) as string;
    }
    return o;
  };
  return { local: dump(localStorage), session: dump(sessionStorage) };
}

function restore(snap: { local: Record<string, string>; session: Record<string, string> }, keepKeys: string[] = []): void {
  const keep = new Set(keepKeys);
  const keepLocal: Record<string, string | null> = {};
  const keepSession: Record<string, string | null> = {};
  keep.forEach((k) => {
    keepLocal[k] = localStorage.getItem(k);
    keepSession[k] = sessionStorage.getItem(k);
  });
  localStorage.clear();
  sessionStorage.clear();
  Object.entries(snap.local).forEach(([k, v]) => localStorage.setItem(k, v));
  Object.entries(snap.session).forEach(([k, v]) => sessionStorage.setItem(k, v));
  keep.forEach((k) => {
    if (keepLocal[k] !== null) localStorage.setItem(k, keepLocal[k] as string);
    if (keepSession[k] !== null) sessionStorage.setItem(k, keepSession[k] as string);
  });
}

/** Clear every RCM-affected key (data only; auth/session keys stay) and seed one test client. Re-runnable. */
function freshWorld(opts: { client?: Record<string, any> } = {}): { clientId: string } {
  RCM_KEYS.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  // demo-mode workspaces read these variants as well
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)!;
    if (/^(callLogs_|clients_|claims_|mantra_appt_fields_|mantra_claim_fieldvalues_|mantra_inv_fields_)/.test(k)) localStorage.removeItem(k);
  }
  const client = {
    id: `${TEST_PREFIX}CL-1`,
    name: `${TEST_PREFIX}Patient One`,
    email: "rcmtest@example.test",
    phone: "5550001111",
    country: "US",
    countryCode: "+1",
    countryFlag: "",
    processes: [],
    stage: "Initial Contact",
    lastContact: "2030-01-01",
    status: "Active",
    contactType: "Client",
    contact_type: "Client",
    dob: "1980-01-01",
    consents: { sms: true, voice: true },
    ...(opts.client || {}),
  };
  localStorage.setItem("clients", JSON.stringify([client]));
  localStorage.setItem("mantra_tasks_store", JSON.stringify([]));
  return { clientId: client.id };
}

const api = {
  TEST_PREFIX,
  RCM_KEYS,
  snapshot,
  restore,
  freshWorld,
  processLogs, automation, engine, eventBus, tasks, taskViews, taskAutoClose, claims, claimService, claimWorkflows, claimActions, claimStatusAndCalls,
  appointments, clients, rolesStore, permissions, defaultRoles, sampleRoles, billing, priorAuth, eligibility, runEligibility, authActions, coverages,
  invoices, invoiceFromClaim, reports, kpis, jobs, sampleBundles, era, remittance, voice, scribeBilling, scribe, recordWriter, recordContext, actionRuns,
  audit, notifSettings, team, processStore, dealCards, claimSamples, sampleIds, ruleContext, fieldSeeds, fieldRegistry, messages, conversations, taskLinks,
  coverageProcess, verifyNow, startProcess, notifications, activity, cptCodes,
};

(window as any).__rcm = api;
export type RcmTestHook = typeof api;
