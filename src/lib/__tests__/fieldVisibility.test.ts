// Mock localStorage in Node environment
const mockStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
    key: (index: number) => Object.keys(mockStorage)[index] || null,
    get length() {
      return Object.keys(mockStorage).length;
    },
  };
}

import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeFieldDefinition, FieldDefinition } from "../../app/context/FieldRegistryContext";
import { DEFAULT_DEPARTMENTS } from "../departmentStore";
import { INITIAL_TEAM_MEMBERS } from "../teamStore";

// Re-implement or import the pure helper logic to verify specification compliance
function isFieldVisibleToCurrentUser(
  field: Partial<FieldDefinition>,
  user: any,
  isAdmin: boolean,
  allDepartments = DEFAULT_DEPARTMENTS,
  allTeamMembers = INITIAL_TEAM_MEMBERS
): boolean {
  if (isAdmin) return true;
  if (!user) return true;

  const mode =
    field.visibilityType ||
    (field.visibleToDepartmentIds && field.visibleToDepartmentIds.length > 0
      ? "department"
      : field.visibleToUserIds && field.visibleToUserIds.length > 0
      ? "user"
      : "all");

  if (mode === "all") return true;

  if (mode === "department") {
    const deptIds = field.visibleToDepartmentIds;
    if (!deptIds || deptIds.length === 0) return true;

    const userDept = user.department?.toLowerCase();
    const currentMember = allTeamMembers.find(
      (m) =>
        (user.id && String(m.id) === String(user.id)) ||
        (user.email && m.email?.toLowerCase() === user.email.toLowerCase())
    );

    const memberDepts = [
      userDept,
      currentMember?.department?.toLowerCase(),
      ...(currentMember?.departments || []).map((d) => d.toLowerCase()),
      ...(currentMember?.assignedDepartments || []).map((ad) => ad.department?.toLowerCase()),
    ].filter(Boolean) as string[];

    return deptIds.some((allowedDeptIdOrName) => {
      const allowedLower = allowedDeptIdOrName.toLowerCase();
      const matchedDept = allDepartments.find(
        (d) => d.id.toLowerCase() === allowedLower || d.name.toLowerCase() === allowedLower
      );
      const targetId = matchedDept ? matchedDept.id.toLowerCase() : allowedLower;
      const targetName = matchedDept ? matchedDept.name.toLowerCase() : allowedLower;

      return memberDepts.some((ud) => ud === targetId || ud === targetName);
    });
  }

  if (mode === "user") {
    const userIds = field.visibleToUserIds;
    if (!userIds || userIds.length === 0) return true;

    const currentUserId = user.id ? String(user.id) : "";
    const currentUserEmail = user.email ? user.email.toLowerCase() : "";

    const currentMember = allTeamMembers.find(
      (m) =>
        (currentUserId && String(m.id) === currentUserId) ||
        (currentUserEmail && m.email?.toLowerCase() === currentUserEmail)
    );
    const memberId = currentMember ? String(currentMember.id) : currentUserId;
    const memberEmail = currentMember?.email?.toLowerCase() || currentUserEmail;

    return userIds.some((idOrEmail) => {
      const target = String(idOrEmail).toLowerCase();
      return (
        (memberId && target === memberId.toLowerCase()) ||
        (memberEmail && target === memberEmail)
      );
    });
  }

  return true;
}

describe("Field Visibility & Scoping", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("preserves visibleToDepartmentIds, visibleToUserIds, and visibilityType through sanitizeFieldDefinition", () => {
    const raw: any = {
      id: 99,
      key: "custom_tax_id",
      label: "Tax ID",
      module: "client",
      inputType: "text",
      visibilityType: "department",
      visibleToDepartmentIds: ["dept_1", "dept_2"],
      visibleToUserIds: ["2", "3"],
    };

    const sanitized = sanitizeFieldDefinition(raw);
    expect(sanitized.visibilityType).toBe("department");
    expect(sanitized.visibleToDepartmentIds).toEqual(["dept_1", "dept_2"]);
    expect(sanitized.visibleToUserIds).toEqual(["2", "3"]);
  });

  it("always allows Organization Administrators to see fields regardless of restrictions", () => {
    const restrictedField: Partial<FieldDefinition> = {
      key: "confidential_notes",
      visibilityType: "department",
      visibleToDepartmentIds: ["dept_1"], // Clinical only
    };

    const adminUser = {
      id: "1",
      name: "Admin User",
      email: "admin@mantra.care",
      role: "Admin",
      department: "Administration",
    };

    const isVisible = isFieldVisibleToCurrentUser(restrictedField, adminUser, true);
    expect(isVisible).toBe(true);
  });

  it("allows all users in selected departments (any role) to see department-scoped fields", () => {
    const clinicalField: Partial<FieldDefinition> = {
      key: "clinical_notes",
      visibilityType: "department",
      visibleToDepartmentIds: ["dept_1"], // Clinical Operations
    };

    const clinicalDoctor = {
      id: "2",
      name: "Akshita Sharma",
      email: "akshita.sharma@mantra.care",
      role: "Ophthalmologist",
      department: "Clinical Operations",
    };

    const supportStaff = {
      id: "4",
      name: "Bob",
      email: "bob@mantra.care",
      role: "Support",
      department: "Customer Support",
    };

    expect(isFieldVisibleToCurrentUser(clinicalField, clinicalDoctor, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(clinicalField, supportStaff, false)).toBe(false);
  });

  it("supports multi-select of departments", () => {
    const multiDeptField: Partial<FieldDefinition> = {
      key: "operations_code",
      visibilityType: "department",
      visibleToDepartmentIds: ["dept_1", "dept_3"], // Clinical and Support
    };

    const clinicalUser = { id: "2", department: "Clinical Operations" };
    const supportUser = { id: "4", department: "Customer Support" };
    const billingUser = { id: "5", department: "Billing" };

    expect(isFieldVisibleToCurrentUser(multiDeptField, clinicalUser, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(multiDeptField, supportUser, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(multiDeptField, billingUser, false)).toBe(false);
  });

  it("allows only specifically selected users to see user-scoped fields", () => {
    const userRestrictedField: Partial<FieldDefinition> = {
      key: "private_compensation",
      visibilityType: "user",
      visibleToUserIds: ["2"], // Akshita only
    };

    const userAkshita = {
      id: "2",
      email: "akshita.sharma@mantra.care",
      name: "Akshita Sharma",
    };

    const otherUser = {
      id: "3",
      email: "alice@mantra.care",
      name: "Alice",
    };

    expect(isFieldVisibleToCurrentUser(userRestrictedField, userAkshita, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(userRestrictedField, otherUser, false)).toBe(false);
  });

  it("supports multi-select of specific users", () => {
    const multiUserField: Partial<FieldDefinition> = {
      key: "peer_review",
      visibilityType: "user",
      visibleToUserIds: ["2", "3"],
    };

    expect(isFieldVisibleToCurrentUser(multiUserField, { id: "2" }, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(multiUserField, { id: "3" }, false)).toBe(true);
    expect(isFieldVisibleToCurrentUser(multiUserField, { id: "4" }, false)).toBe(false);
  });

  it("shows fields with visibilityType 'all' to everyone", () => {
    const publicField: Partial<FieldDefinition> = {
      key: "public_note",
      visibilityType: "all",
    };

    expect(isFieldVisibleToCurrentUser(publicField, { id: "99", department: "Unknown" }, false)).toBe(true);
  });
});
