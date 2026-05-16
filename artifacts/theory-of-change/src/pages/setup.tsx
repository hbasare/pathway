import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, UserCircle2, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordStrength } from "@/components/PasswordStrength";
import { getPasswordError, isPasswordValid } from "@/lib/password";

export default function SetupPage() {
  const { refetch } = useAuth();
  const { t } = useTranslation();
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !username.trim() || !password) return;
    if (password !== confirm) { setError("Passwords do not match"); return; }
    const pwError = getPasswordError(password);
    if (pwError) { setError(pwError); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: orgName.trim(), username: username.trim(), password, displayName: displayName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? t("setup.failed"));
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setup.failed"));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && orgName.trim() && username.trim() && isPasswordValid(password) && password === confirm;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("app.tagline")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{t("setup.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("setup.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                {t("auth.orgSection")}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="orgName">{t("auth.orgName")}</label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Development Foundation"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Manager account */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <UserCircle2 className="w-3.5 h-3.5" />
                {t("setup.managerAccount")}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="displayName">{t("auth.fullName")}</label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="username">{t("auth.username")}</label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <KeyRound className="w-3.5 h-3.5" />
                {t("auth.passwordSection")}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="password">{t("auth.password")}</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete="new-password"
                  disabled={loading}
                />
                <PasswordStrength password={password} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="confirm">{t("auth.confirmPassword")}</label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  disabled={loading}
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("setup.setting")}</>
              ) : (
                t("setup.submit")
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
