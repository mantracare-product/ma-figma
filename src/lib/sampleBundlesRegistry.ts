/** Registers the sample (mock) data groups with sampleBundles. Imported by the UI that exposes the buttons. */
import { registerTemplateSeeder } from "./sampleBundles";
import { seedBillingSetupSamples } from "./billingSetupStore";
import { seedCoverageSamples } from "./coveragesStore";
import { seedTaskViewSamples } from "./taskViewsStore";
import { ensureRcmFieldSeeds } from "./rcmFieldSeeds";
import { seedPriorAuthRuleSamples } from "./priorAuthRulesStore";
import { addRolesIfMissing } from "./rolesStore";
import { DEFAULT_ROLES } from "./defaultRoles";
import { buildSampleRcmRoles } from "./rcmSampleRoles";

registerTemplateSeeder({ id: "billing-setup", label: "Billing setup (mock payers, entity, locations, fees, scrub rules, providers)", seed: () => seedBillingSetupSamples().added });
registerTemplateSeeder({ id: "coverages", label: "Client coverages and demographics (mock)", seed: () => { const r = seedCoverageSamples(); return r.coverages + r.clients; } });
registerTemplateSeeder({ id: "prior-auth-rules", label: "Prior-auth rules (8 mock rows)", seed: () => seedPriorAuthRuleSamples() });
registerTemplateSeeder({ id: "rcm-fields", label: "Eligibility / authorization field groups (EG1-EG5)", seed: () => ensureRcmFieldSeeds() });
registerTemplateSeeder({ id: "task-views", label: "Task queue views", seed: () => seedTaskViewSamples() });
registerTemplateSeeder({ id: "sample-roles", label: "Sample RCM roles", seed: () => addRolesIfMissing(buildSampleRcmRoles(), DEFAULT_ROLES).added });
