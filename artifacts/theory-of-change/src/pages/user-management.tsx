import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, KeyRound, Shield, User, Loader2, X, Check, ChevronDown,
  Eye, Search, Heart, Layers, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ROLE_OPTIONS, type UserRole } from "@/lib/permissions";

const ROLE_ICONS: Record<string, React.ElementType> = {
  manager: Shield,
  member: User,
  senior_manager: Eye,
  auditor: Search,
  donor: Heart,
};

interface OrgUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
}

interface Theory {
  id: number;
  title: string;
}

function RoleBadge({ role }: { role: string }) {
  const opt = ROLE_OPTIONS.find(o => o.value === role);
  if (!opt) return <span className="text-xs text-muted-foreground">{role}</span>;
  const Icon = ROLE_ICONS[role] ?? User;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${opt.colorClass}`}>
      <Icon className="w-3 h-3" />
      {opt.shortLabel}
    </span>
  );
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [addLoading, setAddLoading] = useState(false);

  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Theory assignment state
  const [theories, setTheories] = useState<Theory[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userAssignments, setUserAssignments] = useState<Record<number, number[]>>({});
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [togglingTheory, setTogglingTheory] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/theories", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: Theory[]) => setTheories(data));
  }, []);

  if (currentUser && currentUser.role !== "manager") {
    navigate("/");
    return null;
  }

  const loadUsers = async () => {
    const res = await fetch("/api/users", { credentials: "include" });
    if (res.ok) { setUsers(await res.json() as OrgUser[]); setLoaded(true); }
  };

  if (!loaded) { loadUsers(); }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          displayName: newDisplayName.trim() || newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      const created = await res.json() as OrgUser;
      setUsers(prev => [...prev, created]);
      setNewUsername(""); setNewDisplayName(""); setNewPassword(""); setNewRole("member");
      setShowAddForm(false);
      toast({ title: `User "${created.username}" added` });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to add user", variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRole = async (id: number, role: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json() as OrgUser;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: updated.role } : u));
      // Clear cached assignments if switching away from member
      if (role !== "member") {
        setUserAssignments(prev => { const next = { ...prev }; delete next[id]; return next; });
        if (expandedUserId === id) setExpandedUserId(null);
      }
      toast({ title: t("userManagement.roleUpdated") });
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!window.confirm(`Remove user "${username}"? They will lose access immediately.`)) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
      toast({ title: `User "${username}" removed` });
    } else {
      const err = await res.json() as { error: string };
      toast({ title: err.error, variant: "destructive" });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPassword) return;
    setResetLoading(true);
    try {
      const res = await fetch(`/api/users/${resetUserId}/password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      toast({ title: "Password reset successfully" });
      setResetUserId(null);
      setResetPassword("");
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleExpandMember = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (userAssignments[userId] === undefined) {
      setAssignmentLoading(true);
      const res = await fetch(`/api/users/${userId}/assignments`, { credentials: "include" });
      if (res.ok) {
        const ids = await res.json() as number[];
        setUserAssignments(prev => ({ ...prev, [userId]: ids }));
      }
      setAssignmentLoading(false);
    }
  };

  const handleToggleAssignment = async (userId: number, theoryId: number) => {
    const current = userAssignments[userId] ?? [];
    const isAssigned = current.includes(theoryId);
    setTogglingTheory(theoryId);
    try {
      if (isAssigned) {
        await fetch(`/api/theories/${theoryId}/assignments/${userId}`, {
          method: "DELETE", credentials: "include",
        });
        setUserAssignments(prev => ({ ...prev, [userId]: (prev[userId] ?? []).filter(id => id !== theoryId) }));
      } else {
        await fetch(`/api/theories/${theoryId}/assignments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        setUserAssignments(prev => ({ ...prev, [userId]: [...(prev[userId] ?? []), theoryId] }));
      }
    } finally {
      setTogglingTheory(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("userManagement.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentUser?.orgName} · {t("userManagement.subtitle")}
            </p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> {t("userManagement.addUser")}
            </Button>
          )}
        </div>

        {/* Add user form */}
        {showAddForm && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t("userManagement.addUser")}</h3>
              <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.fullName")}</label>
                  <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="Jane Smith" disabled={addLoading} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.username")} *</label>
                  <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="jsmith" autoFocus disabled={addLoading} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t("auth.password")} * (min 8 chars)</label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" disabled={addLoading} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t("userManagement.role")}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(opt => {
                    const Icon = ROLE_ICONS[opt.value] ?? User;
                    const selected = newRole === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewRole(opt.value as UserRole)}
                        disabled={addLoading}
                        className={`text-left rounded-lg border p-3 transition-all ${
                          selected
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${opt.colorClass}`}>
                            <Icon className="w-3 h-3" />
                            {opt.shortLabel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="gap-2" disabled={addLoading || !newUsername.trim() || !newPassword}>
                  {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t("userManagement.addUser")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)} disabled={addLoading}>
                  {t("common.cancel")}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Password reset form */}
        {resetUserId !== null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" /> {t("userManagement.resetPassword")}
              </h3>
              <button onClick={() => { setResetUserId(null); setResetPassword(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="flex gap-2">
              <Input
                type="password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                placeholder={t("userManagement.newPassword") + " (min 8 chars)"}
                autoFocus
                disabled={resetLoading}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={resetLoading || resetPassword.length < 8} className="gap-1.5">
                {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {t("userManagement.setPassword")}
              </Button>
            </form>
          </div>
        )}

        {/* User list */}
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">{t("userManagement.user")}</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">{t("userManagement.role")}</th>
                <th className="w-56 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <>
                  <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{u.displayName || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== currentUser?.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          {u.role === "member" && (
                            <Button
                              size="sm"
                              variant={expandedUserId === u.id ? "secondary" : "ghost"}
                              className="h-7 text-xs gap-1 text-muted-foreground"
                              onClick={() => handleExpandMember(u.id)}
                              title="Manage theory assignments"
                            >
                              <Layers className="w-3 h-3" />
                              Theories
                              <ChevronRight className={`w-3 h-3 transition-transform ${expandedUserId === u.id ? "rotate-90" : ""}`} />
                            </Button>
                          )}
                          <div className="relative">
                            <select
                              value={u.role}
                              onChange={e => handleChangeRole(u.id, e.target.value)}
                              className="h-7 rounded-md border border-input bg-background px-2 pr-7 text-xs appearance-none cursor-pointer hover:border-primary/60 transition-colors"
                            >
                              {ROLE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                            title={t("userManagement.resetPassword")}
                            onClick={() => { setResetUserId(u.id); setResetPassword(""); }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title={t("userManagement.deleteUser")}
                            onClick={() => handleDelete(u.id, u.username)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground pr-2 text-right block">{t("userManagement.you")}</span>
                      )}
                    </td>
                  </tr>

                  {/* Theory assignment panel (members only) */}
                  {u.role === "member" && expandedUserId === u.id && (
                    <tr key={`${u.id}-assignments`} className="bg-muted/30 border-b border-border/50">
                      <td colSpan={3} className="px-4 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">
                              Theory Assignments for {u.displayName || u.username}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              — {userAssignments[u.id]?.length ?? 0} of {theories.length} assigned
                            </span>
                          </div>
                          {assignmentLoading && userAssignments[u.id] === undefined ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                            </div>
                          ) : theories.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-2">
                              No theories exist yet. Create theories from the dashboard first.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {theories.map(theory => {
                                const isAssigned = (userAssignments[u.id] ?? []).includes(theory.id);
                                const isToggling = togglingTheory === theory.id;
                                return (
                                  <button
                                    key={theory.id}
                                    onClick={() => handleToggleAssignment(u.id, theory.id)}
                                    disabled={isToggling}
                                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                                      isAssigned
                                        ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                                    }`}
                                  >
                                    {isToggling ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                    ) : isAssigned ? (
                                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-sm border-2 border-border shrink-0" />
                                    )}
                                    <span className="truncate font-medium">{theory.title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && loaded && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground italic">
                    {t("userManagement.noUsers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Role reference */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("userManagement.roleReference")}</h3>
          <div className="space-y-2.5">
            {ROLE_OPTIONS.map(opt => {
              const Icon = ROLE_ICONS[opt.value] ?? User;
              return (
                <div key={opt.value} className="flex items-start gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 mt-0.5 shrink-0 ${opt.colorClass}`}>
                    <Icon className="w-3 h-3" />
                    {opt.shortLabel}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
