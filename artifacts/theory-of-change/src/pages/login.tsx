import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PathwaysLogo } from "@/components/PathwaysLogo";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Recovery States
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isForgotUsernameOpen, setIsForgotUsernameOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send reset link");
      }
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setIsForgotPasswordOpen(false);
      setRecoveryEmail("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send username recovery email");
      }
      const data = await res.json();
      toast({ title: "Success", description: data.message });
      setIsForgotUsernameOpen(false);
      setRecoveryEmail("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Language switcher */}
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PathwaysLogo size={52} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("app.tagline")}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5">{t("login.title")}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="username">
                {t("auth.username")}
              </label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t("login.usernamePlaceholder")}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                {t("auth.password")}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading || !username.trim() || !password}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t("login.signingIn")}</>
              ) : (
                <><LogIn className="w-4 h-4" /> {t("login.signIn")}</>
              )}
            </Button>
          </form>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-center text-muted-foreground">
            {t("login.noAccess")}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t("login.newOrg")}</span>
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              {t("login.createAccount")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
