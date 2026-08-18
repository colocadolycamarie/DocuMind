import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, History, Library, Menu, Moon, Settings2, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Workspace", icon: Library },
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings2 },
] as const;

export function AppHeader() {
  const [location] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: settings } = useSettings();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((value) => !value)}
        >
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold tracking-tight text-primary-foreground">
            dm
          </div>
          <div className="hidden min-[420px]:block">
            <div className="font-serif text-[19px] leading-none tracking-tight">DocuMind</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {settings?.workspaceName ?? "Workspace"}
            </div>
          </div>
        </Link>
      </div>

      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 py-[18px] text-[12px] font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={15} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </Button>
      </div>

      {mobileNavOpen && (
        <div className="absolute left-0 right-0 top-14 z-40 border-b border-border bg-popover p-2 shadow-md lg:hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm",
                  location === item.href
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon size={15} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
