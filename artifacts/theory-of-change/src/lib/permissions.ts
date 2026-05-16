import { useAuth } from "@/contexts/auth-context";

export type UserRole = "manager" | "member" | "senior_manager" | "auditor" | "donor";

export interface Permissions {
  canEdit: boolean;
  canViewDetail: boolean;
  canManageUsers: boolean;
  isReadOnly: boolean;
  /** Returns true if the current user can edit the given theory (by ID). */
  canEditTheory: (theoryId: number) => boolean;
}

export function getPermissions(role: string, assignedTheoryIds: number[] = []): Permissions {
  const canEditTheory = (theoryId: number) => {
    if (role === "manager") return true;
    if (role === "member") return assignedTheoryIds.includes(theoryId);
    return false;
  };
  switch (role) {
    case "manager":
      return { canEdit: true, canViewDetail: true, canManageUsers: true, isReadOnly: false, canEditTheory };
    case "member":
      return { canEdit: true, canViewDetail: true, canManageUsers: false, isReadOnly: false, canEditTheory };
    case "senior_manager":
    case "auditor":
      return { canEdit: false, canViewDetail: true, canManageUsers: false, isReadOnly: true, canEditTheory };
    case "donor":
      return { canEdit: false, canViewDetail: false, canManageUsers: false, isReadOnly: true, canEditTheory };
    default:
      return { canEdit: false, canViewDetail: false, canManageUsers: false, isReadOnly: true, canEditTheory };
  }
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  return getPermissions(user?.role ?? "", user?.assignedTheoryIds ?? []);
}

export const ROLE_OPTIONS = [
  {
    value: "manager" as UserRole,
    label: "Evaluation Manager",
    shortLabel: "Eval. Manager",
    description: "Full access — can create, edit, delete all content and manage users",
    colorClass: "text-amber-700 bg-amber-100",
  },
  {
    value: "member" as UserRole,
    label: "Team Member",
    shortLabel: "Team Member",
    description: "Full edit access to assigned theories; view-only for others. Cannot manage users",
    colorClass: "text-blue-700 bg-blue-100",
  },
  {
    value: "senior_manager" as UserRole,
    label: "Senior Manager",
    shortLabel: "Sr. Manager",
    description: "Read-only view of all content, measurement plans and reports",
    colorClass: "text-indigo-700 bg-indigo-100",
  },
  {
    value: "auditor" as UserRole,
    label: "Auditor",
    shortLabel: "Auditor",
    description: "Read-only view of all content and calculations",
    colorClass: "text-purple-700 bg-purple-100",
  },
  {
    value: "donor" as UserRole,
    label: "Donor",
    shortLabel: "Donor",
    description: "Access to dashboard and summary/export reports only",
    colorClass: "text-emerald-700 bg-emerald-100",
  },
] as const;
