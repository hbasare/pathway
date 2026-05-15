import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, KeyRound, Shield, User, Loader2, X, Check, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

interface OrgUser {
  id: number;
  username: string;
  displayName: string;
  role: "manager" | "member";
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  if (role === "manager") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
        <Shield className="w-3 h-3" /> {t("userManagement.manager")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
      <User className="w-3 h-3" /> {t("userManagement.member")}
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
  const [newRole, setNewRole] = useState<"manager" | "member">("member");
  const [addLoading, setAddLoading] = useState(false);

  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Redirect non-managers
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

  const handleChangeRole = async (id: number, role: "manager" | "member") => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json() as OrgUser;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: updated.role } : u));
      toast({ title: "Role updated" });
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

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("userManagement.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentUser?.orgName} · Manage who has access to this organization
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
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t("userManagement.addUser")}</h3>
              <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("auth.password")} * (min 8 chars)</label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" disabled={addLoading} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("userManagement.role")}</label>
                  <div className="relative">
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as "manager" | "member")}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm appearance-none pr-8"
                      disabled={addLoading}
                    >
                      <option value="member">{t("userManagement.member")}</option>
                      <option value="manager">{t("userManagement.manager")}</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
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
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6 space-y-3">
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
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">User</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs">{t("userManagement.role")}</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.displayName || u.username}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUser?.id && (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => handleChangeRole(u.id, u.role === "manager" ? "member" : "manager")}
                          title={u.role === "manager" ? "Demote to Member" : "Promote to Evaluation Manager"}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role === "manager" ? "Demote" : "Promote"}
                        </Button>
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
                    )}
                    {u.id === currentUser?.id && (
                      <span className="text-xs text-muted-foreground pr-2 text-right block">You</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && loaded && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground italic">
                    No users yet. Click "{t("userManagement.addUser")}" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
