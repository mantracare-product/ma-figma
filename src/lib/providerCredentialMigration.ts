/**
 * R5-fix.5 Migration: Provider credentials move to Team member profile.
 * Copies credentials from stored mantra_provider_credentials_v1 to team members.
 * Old store remains untouched in storage and unused.
 * Logged to mantra_migration_log_v1.
 */
import { getStoredTeamMembers, saveStoredTeamMembers, type TeamMember } from "./teamStore";
import { providerCredentialsStore, SAMPLE_PROVIDER_CREDENTIALS, type ProviderCredential } from "./billingSetupStore";
import { logMigration } from "./stageCallMigration";

export const PROVIDER_CREDENTIALS_MIGRATION_FLAG = "mantra_provider_credentials_migrated_v1";

export function migrateProviderCredentialsToTeamMember(): { migrated: number } {
  const result = { migrated: 0 };
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(PROVIDER_CREDENTIALS_MIGRATION_FLAG) === "1") {
      return result;
    }

    const creds = providerCredentialsStore.get();
    const credsList: ProviderCredential[] = creds.length > 0 ? creds : SAMPLE_PROVIDER_CREDENTIALS;
    const members = getStoredTeamMembers();
    let changed = false;

    const updatedMembers = members.map((m) => {
      const cred = credsList.find((c) =>
        String(c.id) === String(m.id) ||
        (c.name && m.name && c.name.trim().toLowerCase() === m.name.trim().toLowerCase())
      );
      if (!cred) return m;

      const npi = (m as any).npi || cred.npi;
      const taxonomy = (m as any).taxonomy || cred.taxonomy;
      const licenseNumber = (m as any).licenseNumber || cred.licenseNumber;
      const licenseState = (m as any).licenseState || cred.licenseState;

      const customFields = {
        ...((m as any).customFields || {}),
        npi,
        taxonomy,
        licenseNumber,
        licenseState,
      };

      changed = true;
      result.migrated++;

      return {
        ...m,
        npi,
        taxonomy,
        licenseNumber,
        licenseState,
        customFields,
      };
    });

    if (changed) {
      saveStoredTeamMembers(updatedMembers);
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROVIDER_CREDENTIALS_MIGRATION_FLAG, "1");
    }

    logMigration(
      "R5-fix.5",
      `Migrated ${result.migrated} provider credentials to Team member records. Old store untouched.`
    );
  } catch (e) {
    console.error("[migrateProviderCredentialsToTeamMember] Failed:", e);
  }
  return result;
}
