/**
 * R5-fix.4 Migration: Scrub rules as condition blocks.
 *
 * Migrates legacy scrub rules ({ check, target }) into condition blocks (WHEN groups/conditions, THEN severity + message).
 * Preserves On/Off state and severity.
 * Converts "Prior auth number present" to Error and On if still holding seeded values.
 * Seeds extra rules: member ID missing, duplicate claim, date of service in the future, filing deadline passed, NPI invalid.
 * Ensures demo NPIs pass 10-digit Luhn checksum.
 * Logged to mantra_migration_log_v1.
 */
import {
  scrubRulesStore,
  type ScrubRule,
  type ScrubCondition,
  type ScrubConditionGroup,
} from "./billingSetupStore";
import { logMigration } from "./stageCallMigration";

export const SCRUB_RULES_MIGRATION_FLAG = "mantra_scrub_rules_migrated_v1";

/**
 * 10-digit National Provider Identifier (NPI) Luhn algorithm checksum.
 * Uses the constant CMS / ISO health card prefix "80840" prepended to the 10-digit NPI (15 digits total).
 */
export function isValidNpiLuhn(npi?: string | null): boolean {
  if (!npi) return false;
  const clean = String(npi).trim();
  if (!/^\d{10}$/.test(clean)) return false;
  const full = "80840" + clean;
  let sum = 0;
  for (let i = 0; i < full.length; i++) {
    let digit = parseInt(full[full.length - 1 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const SEEDED_SCRUB_RULES: ScrubRule[] = [
  {
    id: "scrub-sample-icd",
    name: "At least one diagnosis code",
    enabled: true,
    severity: "error",
    message: "Add at least one ICD-10 code",
    matchType: "ALL",
    groups: [
      {
        id: "g-icd",
        matchType: "ALL",
        conditions: [
          {
            id: "c-icd-1",
            record: "claim",
            field: "diagnosisCodes",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-sample-entity",
    name: "Billing entity is set",
    enabled: true,
    severity: "error",
    message: "Fill in Billing Info on the Organization (legal name, EIN and group NPI)",
    matchType: "ALL",
    groups: [
      {
        id: "g-entity",
        matchType: "ANY",
        conditions: [
          {
            id: "c-ent-1",
            record: "organization",
            field: "legalName",
            operator: "is_empty",
          },
          {
            id: "c-ent-2",
            record: "organization",
            field: "ein",
            operator: "is_empty",
          },
          {
            id: "c-ent-3",
            record: "organization",
            field: "groupNpi",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-sample-npi",
    name: "Rendering provider NPI",
    enabled: true,
    severity: "error",
    message: "Rendering provider NPI is missing",
    matchType: "ALL",
    groups: [
      {
        id: "g-npi",
        matchType: "ALL",
        conditions: [
          {
            id: "c-npi-1",
            record: "rendering_provider",
            field: "npi",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-sample-modifier",
    name: "Laterality modifier on cataract surgery",
    enabled: true,
    severity: "error",
    message: "Add RT/LT modifier",
    matchType: "ALL",
    groups: [
      {
        id: "g-mod",
        matchType: "ALL",
        conditions: [
          {
            id: "c-mod-1",
            record: "claim_line",
            lineQuantifier: "any",
            field: "cptCode",
            operator: "is",
            value: "66984",
          },
          {
            id: "c-mod-2",
            record: "claim_line",
            lineQuantifier: "any",
            field: "modifier",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-sample-auth",
    name: "Prior auth number present",
    enabled: true,
    severity: "error",
    message: "Prior authorization number is empty",
    matchType: "ALL",
    groups: [
      {
        id: "g-auth",
        matchType: "ALL",
        conditions: [
          {
            id: "c-auth-1",
            record: "authorization",
            field: "status",
            operator: "is",
            value: "required",
          },
          {
            id: "c-auth-2",
            record: "authorization",
            field: "authorizationNumber",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-rule-member-id",
    name: "Member ID missing",
    enabled: true,
    severity: "error",
    message: "Patient member ID is missing",
    matchType: "ALL",
    groups: [
      {
        id: "g-mem",
        matchType: "ALL",
        conditions: [
          {
            id: "c-mem-1",
            record: "coverage",
            field: "memberId",
            operator: "is_empty",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-rule-duplicate",
    name: "Duplicate claim",
    enabled: true,
    severity: "error",
    message: "Duplicate claim detected for this patient and date of service",
    matchType: "ALL",
    groups: [
      {
        id: "g-dup",
        matchType: "ALL",
        conditions: [
          {
            id: "c-dup-1",
            record: "claim",
            field: "_isDuplicateClaim",
            operator: "is",
            value: "true",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-rule-future-dos",
    name: "Date of service in the future",
    enabled: true,
    severity: "error",
    message: "Date of service cannot be in the future",
    matchType: "ALL",
    groups: [
      {
        id: "g-fut",
        matchType: "ALL",
        conditions: [
          {
            id: "c-fut-1",
            record: "claim",
            field: "_isFutureDos",
            operator: "is",
            value: "true",
          },
        ],
      },
    ],
  },
  {
    id: "scrub-rule-filing-deadline",
    name: "Filing deadline passed",
    enabled: true,
    severity: "error",
    message: "Timely filing deadline has passed",
    matchType: "ALL",
    groups: [
      {
        id: "g-file",
        matchType: "ALL",
        conditions: [
          {
            id: "c-file-1",
            record: "claim",
            field: "_daysPastFiling",
            operator: "greater_than",
            value: 0,
          },
        ],
      },
    ],
  },
  {
    id: "scrub-rule-npi-invalid",
    name: "NPI invalid",
    enabled: true,
    severity: "error",
    message: "Rendering provider NPI is invalid (must be 10 digits with valid Luhn checksum)",
    matchType: "ALL",
    groups: [
      {
        id: "g-npival",
        matchType: "ALL",
        conditions: [
          {
            id: "c-npival-1",
            record: "rendering_provider",
            field: "_npiValid",
            operator: "is_not",
            value: "true",
          },
        ],
      },
    ],
  },
];

/**
 * Convert a legacy check/target rule into a condition block if not already converted.
 */
export function convertLegacyRuleToBlock(rule: ScrubRule): ScrubRule {
  if (rule.groups && rule.groups.length > 0) return rule;

  const id = rule.id;
  const matchType = "ALL";
  let groups: ScrubConditionGroup[] = [];

  switch (rule.check) {
    case "icd_required":
      groups = [
        {
          id: `${id}-g1`,
          matchType: "ALL",
          conditions: [
            { id: `${id}-c1`, record: "claim", field: "diagnosisCodes", operator: "is_empty" },
          ],
        },
      ];
      break;
    case "billing_entity":
      groups = [
        {
          id: `${id}-g1`,
          matchType: "ANY",
          conditions: [
            { id: `${id}-c1`, record: "organization", field: "legalName", operator: "is_empty" },
            { id: `${id}-c2`, record: "organization", field: "ein", operator: "is_empty" },
            { id: `${id}-c3`, record: "organization", field: "groupNpi", operator: "is_empty" },
          ],
        },
      ];
      break;
    case "rendering_npi":
      groups = [
        {
          id: `${id}-g1`,
          matchType: "ALL",
          conditions: [
            { id: `${id}-c1`, record: "rendering_provider", field: "npi", operator: "is_empty" },
          ],
        },
      ];
      break;
    case "line_modifier":
      groups = [
        {
          id: `${id}-g1`,
          matchType: "ALL",
          conditions: [
            {
              id: `${id}-c1`,
              record: "claim_line",
              lineQuantifier: "any",
              field: "cptCode",
              operator: "is",
              value: rule.target || "66984",
            },
            {
              id: `${id}-c2`,
              record: "claim_line",
              lineQuantifier: "any",
              field: "modifier",
              operator: "is_empty",
            },
          ],
        },
      ];
      break;
    case "required_field":
      if (rule.target === "priorAuthNumber" || rule.target === "authNumber") {
        groups = [
          {
            id: `${id}-g1`,
            matchType: "ALL",
            conditions: [
              { id: `${id}-c1`, record: "authorization", field: "status", operator: "is", value: "required" },
              { id: `${id}-c2`, record: "authorization", field: "authorizationNumber", operator: "is_empty" },
            ],
          },
        ];
      } else {
        groups = [
          {
            id: `${id}-g1`,
            matchType: "ALL",
            conditions: [
              { id: `${id}-c1`, record: "claim", field: rule.target || "id", operator: "is_empty" },
            ],
          },
        ];
      }
      break;
    default:
      if (rule.target) {
        groups = [
          {
            id: `${id}-g1`,
            matchType: "ALL",
            conditions: [
              { id: `${id}-c1`, record: "claim", field: rule.target, operator: "is_empty" },
            ],
          },
        ];
      }
      break;
  }

  return {
    ...rule,
    matchType,
    groups,
  };
}

export function migrateScrubRulesToConditionBlocks(): { migrated: number; seeded: number } {
  const result = { migrated: 0, seeded: 0 };
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(SCRUB_RULES_MIGRATION_FLAG) === "1") {
      return result;
    }

    const existing = scrubRulesStore.get();
    let updatedRules: ScrubRule[] = [];

    if (existing.length === 0) {
      // No stored rules: seed all standard rules
      updatedRules = [...SEEDED_SCRUB_RULES];
      result.seeded = updatedRules.length;
    } else {
      // Migrate existing rules into blocks, preserving On and severity
      const existingMap = new Map<string, ScrubRule>();
      for (const r of existing) {
        let converted = convertLegacyRuleToBlock(r);
        // Special case: prior-auth rule becomes Error and On only if it still has seeded values (Warning, Off)
        if (
          converted.id === "scrub-sample-auth" &&
          converted.severity === "warning" &&
          !converted.enabled
        ) {
          converted = { ...converted, severity: "error", enabled: true };
        }
        existingMap.set(converted.id, converted);
        result.migrated++;
      }

      // Seed extra rules if missing
      for (const seed of SEEDED_SCRUB_RULES) {
        if (!existingMap.has(seed.id)) {
          existingMap.set(seed.id, seed);
          result.seeded++;
        }
      }

      updatedRules = Array.from(existingMap.values());
    }

    scrubRulesStore.save(updatedRules);

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SCRUB_RULES_MIGRATION_FLAG, "1");
    }

    logMigration(
      "R5-fix.4",
      `Migrated ${result.migrated} scrub rules to condition blocks, seeded ${result.seeded} extra rules, enabled prior-auth Error rule.`
    );
  } catch (err) {
    console.error("[migrateScrubRulesToConditionBlocks] Failed:", err);
  }

  return result;
}
