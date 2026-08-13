import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound, Eye, EyeOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PathwaysLogo } from "@/components/PathwaysLogo";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extract token from URL ?token=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      toast({
        title: "Invalid Link",
        description: "No password reset token was provided in the URL.",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [setLocation, toast]);

  // Password strength validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword !== "";

  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to reset password");
      }

      toast({
        title: "Success",
        description: "Your password has been reset successfully. Please log in with your new password.",
      });
      setLocation("/login");
    } catch (err) {
      toast({
        title: "Reset Failed",
        description: err instanceof Error ? err.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PathwaysLogo size={52} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pathways</h1>
          <p className="text-sm text-muted-foreground mt-1">Reset Your Password</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-5 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" /> Setup New Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="new-password">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  autoComplete="new-password"
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
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength checklist */}
            <div className="p-3 bg-muted/30 rounded-xl space-y-2 text-xs text-muted-foreground border border-border/50">
              <p className="font-semibold text-foreground mb-1">Password Requirements:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasUppercase ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>One uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasLowercase ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>One lowercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasNumber ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>One number (0-9)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasSpecial ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>One special character</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isMatch ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading || !isFormValid}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
