import { Check, X } from "lucide-react";
import { getPasswordChecks } from "@/lib/password";

interface Props {
  password: string;
}

export function PasswordStrength({ password }: Props) {
  if (!password) return null;
  const checks = getPasswordChecks(password);
  const allPass = checks.every(c => c.pass);

  return (
    <div className="mt-2 space-y-1">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map(c => (
          <div
            key={c.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              c.pass ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {c.pass
              ? <Check className="w-3 h-3 shrink-0 text-green-500" />
              : <X className="w-3 h-3 shrink-0 text-muted-foreground/50" />
            }
            {c.label}
          </div>
        ))}
      </div>
      {allPass && (
        <p className="text-xs text-green-600 font-medium pt-0.5">Password meets all requirements</p>
      )}
    </div>
  );
}
