import { MessageSquare, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobilePane = "library" | "chat" | "sources";

const PANES: { id: MobilePane; label: string; icon: typeof PanelLeft }[] = [
  { id: "library", label: "Library", icon: PanelLeft },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "sources", label: "Sources", icon: PanelRight },
];

export function MobilePaneSwitcher({ pane, onChange }: { pane: MobilePane; onChange: (pane: MobilePane) => void }) {
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-border bg-card px-2 md:hidden">
      <div className="grid w-full grid-cols-3 gap-1 rounded-md bg-secondary/50 p-1">
        {PANES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex h-8 items-center justify-center gap-1.5 rounded-sm text-[11px] font-medium",
                pane === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              <Icon size={13} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
