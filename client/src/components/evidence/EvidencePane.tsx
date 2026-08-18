import { Copy, ExternalLink, PanelRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { SourceChunk } from "@docu-mind/shared";

interface EvidencePaneProps {
  citation: SourceChunk | null;
  allCitations: SourceChunk[];
  onSelectCitation: (chunk: SourceChunk) => void;
}

export function EvidencePane({ citation, allCitations, onSelectCitation }: EvidencePaneProps) {
  const { toast } = useToast();

  return (
    <aside className="flex min-h-0 w-full flex-col border-l border-border bg-card lg:w-[390px] lg:shrink-0">
      <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-border px-4">
        <PanelRight size={15} className="text-primary" aria-hidden />
        <span className="text-[13px] font-semibold">Evidence reader</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!citation ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Ask a question to see the exact passages your answer is grounded in.
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{citation.documentName}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {citation.heading ?? "Untitled section"}
                  {citation.page ? ` · p. ${citation.page}` : ""}
                </div>
              </div>
              <a
                href={api.documents.fileUrl(citation.documentId)}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary"
              >
                <ExternalLink size={13} /> Open source
              </a>
            </div>

            {allCitations.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {allCitations.map((chunk, index) => (
                  <button
                    key={chunk.id}
                    type="button"
                    onClick={() => onSelectCitation(chunk)}
                    className={`flex h-7 min-w-7 items-center justify-center rounded-sm border px-2 font-mono text-[10px] ${
                      chunk.id === citation.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    [{index + 1}]
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-sm border-l-2 border-amber-500 bg-amber-500/5 px-3.5 py-3.5">
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Match score</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {(citation.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="font-serif text-[17px] leading-[1.55] text-foreground">
                {citation.contextBefore && (
                  <span className="text-muted-foreground">{citation.contextBefore} </span>
                )}
                <mark className="rounded-sm bg-amber-200/60 px-0.5 text-foreground dark:bg-amber-500/30">
                  {citation.content}
                </mark>
                {citation.contextAfter && (
                  <span className="text-muted-foreground"> {citation.contextAfter}</span>
                )}
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-[11px]"
                onClick={() => {
                  navigator.clipboard?.writeText(citation.content);
                  toast({ title: "Passage copied to clipboard" });
                }}
              >
                <Copy size={13} /> Copy passage
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
