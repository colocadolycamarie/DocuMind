import { useEffect, useRef, useState } from "react";
import { ChevronDown, Files, Loader2, Send } from "lucide-react";
import { MessageStream } from "./MessageStream";
import { useAskQuestion, useConversationMessages } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { Document, SourceChunk } from "@docu-mind/shared";

interface ConversationPaneProps {
  conversationId: string | null;
  onConversationCreated: (conversationId: string) => void;
  selectedDocument: Document | null;
  scope: "all-documents" | "single-document";
  onScopeChange: (scope: "all-documents" | "single-document") => void;
  onCitationClick: (chunk: SourceChunk) => void;
}

export function ConversationPane({
  conversationId,
  onConversationCreated,
  selectedDocument,
  scope,
  onScopeChange,
  onCitationClick,
}: ConversationPaneProps) {
  const { data: messages = [] } = useConversationMessages(conversationId);
  const askQuestion = useAskQuestion();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const question = draft.trim();
    if (!question || askQuestion.isPending) return;

    askQuestion.mutate(
      {
        conversationId: conversationId ?? undefined,
        question,
        documentId: scope === "single-document" ? selectedDocument?.id ?? null : null,
        scope,
      },
      {
        onSuccess: (result) => {
          setDraft("");
          onConversationCreated(result.conversation.id);
          if (result.assistantMessage.citations[0]) {
            onCitationClick(result.assistantMessage.citations[0]);
          }
        },
        onError: (error) => {
          toast({
            title: "Couldn't get an answer",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex min-h-[58px] shrink-0 items-center justify-between border-b border-border px-4 sm:px-7">
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold">
            {messages[0]?.content.slice(0, 60) ?? "Ask your documents"}
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {scope === "single-document" && selectedDocument ? selectedDocument.name : "All documents"}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[720px]">
          {messages.length === 0 ? (
            <EmptyConversationState />
          ) : (
            <MessageStream messages={messages} onCitationClick={onCitationClick} />
          )}
          {askQuestion.isPending && (
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <Loader2 size={14} className="animate-spin" /> Reading your sources…
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card/80 px-4 py-4 sm:px-7">
        <div className="mx-auto max-w-[720px]">
          <div className="relative rounded-sm border border-border bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask a question of your sources…"
              rows={2}
              maxLength={4000}
              className="w-full resize-none rounded-sm bg-transparent px-3.5 pb-12 pt-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setScopeMenuOpen((value) => !value)}
                  className="flex h-8 items-center gap-1.5 rounded-sm px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  {scope === "single-document" && selectedDocument ? selectedDocument.name : "All documents"}
                  <ChevronDown size={12} />
                </button>
                {scopeMenuOpen && (
                  <div className="absolute bottom-9 left-0 z-20 w-56 rounded-sm border border-border bg-popover p-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => {
                        onScopeChange("all-documents");
                        setScopeMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-secondary"
                    >
                      <Files size={14} /> All documents
                    </button>
                    {selectedDocument && (
                      <button
                        type="button"
                        onClick={() => {
                          onScopeChange("single-document");
                          setScopeMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-secondary"
                      >
                        <Files size={14} /> {selectedDocument.name}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!draft.trim() || askQuestion.isPending}
                onClick={submit}
                className="h-8 gap-1.5 text-xs"
              >
                <Send size={14} /> Ask
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            <span>Shift + Enter for a new line</span>
            <span>{draft.length}/4,000</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyConversationState() {
  return (
    <div className="rounded-sm border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">Ask a question of your documents</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Answers are grounded in your uploaded sources, with citations you can verify.
      </p>
    </div>
  );
}
