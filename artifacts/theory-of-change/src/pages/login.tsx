import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotUsernameSubmitted, setForgotUsernameSubmitted] = useState(false);
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
      setForgotPasswordSubmitted(true);
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
      setForgotUsernameSubmitted(true);
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

            <div className="flex items-center justify-between text-xs mt-2">
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail("");
                  setForgotUsernameSubmitted(false);
                  setIsForgotUsernameOpen(true);
                }}
                className="text-muted-foreground hover:text-primary hover:underline transition-colors"
                disabled={loading}
              >
                Forgot Username?
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail("");
                  setForgotPasswordSubmitted(false);
                  setIsForgotPasswordOpen(true);
                }}
                className="text-muted-foreground hover:text-primary hover:underline transition-colors"
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
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

      {/* Forgot Password Dialog */}
      <Dialog 
        open={isForgotPasswordOpen} 
        onOpenChange={(open) => {
          setIsForgotPasswordOpen(open);
          if (!open) {
            setForgotPasswordSubmitted(false);
            setRecoveryEmail("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {forgotPasswordSubmitted ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-lg text-foreground">Reset Link Sent</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  If a matching account exists, a password reset link has been sent to your email address.
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotPasswordSubmitted(false);
                }}
                className="w-full mt-2"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Forgot Password</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="recovery-email-pw">
                    Email Address
                  </label>
                  <Input
                    id="recovery-email-pw"
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={recoveryLoading}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsForgotPasswordOpen(false)}
                    disabled={recoveryLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={recoveryLoading || !recoveryEmail.trim()}>
                    {recoveryLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : "Send Reset Link"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Forgot Username Dialog */}
      <Dialog 
        open={isForgotUsernameOpen} 
        onOpenChange={(open) => {
          setIsForgotUsernameOpen(open);
          if (!open) {
            setForgotUsernameSubmitted(false);
            setRecoveryEmail("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {forgotUsernameSubmitted ? (
            <div className="flex flex-col items-center text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-lg text-foreground">Recovery Sent</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  If a matching account exists, your usernames have been sent to your email address.
                </p>
              </div>
              <Button
                onClick={() => {
                  setIsForgotUsernameOpen(false);
                  setForgotUsernameSubmitted(false);
                }}
                className="w-full mt-2"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Forgot Username</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleForgotUsername} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you the usernames associated with your account.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="recovery-email-un">
                    Email Address
                  </label>
                  <Input
                    id="recovery-email-un"
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={recoveryLoading}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsForgotUsernameOpen(false)}
                    disabled={recoveryLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={recoveryLoading || !recoveryEmail.trim()}>
                    {recoveryLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : "Recover Usernames"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
