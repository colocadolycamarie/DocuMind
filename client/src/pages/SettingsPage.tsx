import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [workspaceName, setWorkspaceName] = useState("");
  const [showLowConfidenceWarnings, setShowLowConfidenceWarnings] = useState(true);
  const [defaultScope, setDefaultScope] = useState<"all-documents" | "single-document">("all-documents");

  useEffect(() => {
    if (!settings) return;
    setWorkspaceName(settings.workspaceName);
    setShowLowConfidenceWarnings(settings.showLowConfidenceWarnings);
    setDefaultScope(settings.defaultScope);
    if (settings.theme === "light" || settings.theme === "dark") setTheme(settings.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      { workspaceName, showLowConfidenceWarnings, defaultScope, theme },
      {
        onSuccess: () => toast({ title: "Settings saved" }),
        onError: (error) =>
          toast({
            title: "Couldn't save settings",
            description: error instanceof Error ? error.message : undefined,
            variant: "destructive",
          }),
      },
    );
  };

  if (isLoading || !settings) {
    return (
      <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-border pb-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            Workspace controls
          </div>
          <h1 className="font-serif text-4xl tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Make the research desk fit the way your team handles source material.
          </p>
        </div>

        <div className="mt-7 space-y-8">
          <fieldset>
            <legend className="text-sm font-semibold">General</legend>
            <p className="mt-1 text-xs text-muted-foreground">Identity and defaults for this workspace.</p>
            <label className="mt-4 block text-xs font-medium" htmlFor="workspace-name">
              Workspace name
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="mt-1.5"
              />
            </label>
          </fieldset>

          <fieldset className="border-t border-border pt-7">
            <legend className="text-sm font-semibold">Answer behavior</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              DocuMind always prefers a qualified answer over an unsupported claim.
            </p>
            <label className="mt-4 flex items-center justify-between rounded-md border border-border bg-card p-3">
              <span>
                <span className="block text-xs font-medium">Show low-confidence warnings</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Keep the amber evidence notice visible in answer threads.
                </span>
              </span>
              <Switch checked={showLowConfidenceWarnings} onCheckedChange={setShowLowConfidenceWarnings} />
            </label>

            <label className="mt-4 block text-xs font-medium">
              Default source scope
              <Select value={defaultScope} onValueChange={(value) => setDefaultScope(value as typeof defaultScope)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-documents">All documents</SelectItem>
                  <SelectItem value="single-document">Current document</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </fieldset>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {updateSettings.isSuccess && (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Saved
              </span>
            )}
          </span>
          <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
            <CheckCircle2 size={14} /> Save changes
          </Button>
        </div>
      </div>
    </section>
  );
}
