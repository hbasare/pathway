import { useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import {
  useColorSettings,
  COMPONENT_TYPES,
  COLOR_DEFAULTS,
  ComponentType,
  ColorMap,
} from "@/contexts/color-settings";
import { useTranslation } from "react-i18next";

export function ColorSettingsTrigger() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <DialogWrapper
      open={open}
      onOpenChange={setOpen}
      title={t("colorSettings.title")}
      description={t("colorSettings.subtitle")}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          title={t("colorSettings.title")}
        >
          <Palette className="w-3.5 h-3.5" />
        </Button>
      }
    >
      <ColorSettingsPanel onClose={() => setOpen(false)} />
    </DialogWrapper>
  );
}

function ColorSettingsPanel({ onClose }: { onClose: () => void }) {
  const { colors, setColor, resetColors } = useColorSettings();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ColorMap>({ ...colors });

  const handleSave = () => {
    COMPONENT_TYPES.forEach(type => setColor(type, draft[type]));
    onClose();
  };

  const handleReset = () => {
    resetColors();
    onClose();
  };

  const hasChanges = COMPONENT_TYPES.some(type => draft[type] !== COLOR_DEFAULTS[type]);

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-2 gap-3">
        {COMPONENT_TYPES.map(type => (
          <label
            key={type}
            className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <input
                type="color"
                value={draft[type]}
                onChange={e => setDraft(prev => ({ ...prev, [type]: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent block"
              />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold capitalize leading-tight"
                style={{ color: draft[type] }}
              >
                {t(`colorSettings.${type}`, { defaultValue: type })}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase">
                {draft[type]}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* Preview strip */}
      <div className="flex rounded-lg overflow-hidden h-2 border border-border/50">
        {COMPONENT_TYPES.map(type => (
          <div key={type} className="flex-1" style={{ backgroundColor: draft[type] }} />
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!hasChanges}
          className="text-muted-foreground text-xs gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          {t("colorSettings.reset")}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
