import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, UserCircle2, KeyRound } from "lucide-react";

export default function SetupPage() {
  const { refetch } = useAuth();
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
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
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
        throw new Error(err.error ?? "Setup failed");
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pathways</h1>
          <p className="text-sm text-muted-foreground mt-1">Theory of Change Platform</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Welcome — let's get started</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your organization and create the first Evaluation Manager account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                Organization
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="orgName">Organization name</label>
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
                Evaluation Manager Account
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="displayName">Full name</label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="username">Username</label>
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
                Password
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="confirm">Confirm password</label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || !orgName.trim() || !username.trim() || !password || !confirm}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
              ) : (
                "Create Organization & Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
