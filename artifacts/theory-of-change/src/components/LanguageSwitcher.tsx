import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  { code: "en", flag: "🇬🇧" },
  { code: "pt", flag: "🇵🇹" },
  { code: "es", flag: "🇪🇸" },
  { code: "it", flag: "🇮🇹" },
  { code: "fr", flag: "🇫🇷" },
  { code: "nl", flag: "🇳🇱" },
  { code: "sw", flag: "🇹🇿" },
  { code: "ha", flag: "🇳🇬" },
  { code: "af", flag: "🇿🇦" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("pathways_lang", code);
  };

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={t("language.label")}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-medium">{current.flag} {i18n.language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[150px]">
        {LANGUAGES.map(({ code, flag }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => change(code)}
            className={i18n.language === code ? "font-semibold text-primary" : ""}
          >
            <span className="mr-2">{flag}</span>
            {t(`language.${code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
