import { AlertTriangle, Copy, Sparkles } from "lucide-react";
import { CitationMarker } from "./CitationMarker";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { Message, SourceChunk } from "@docu-mind/shared";

interface MessageStreamProps {
  messages: Message[];
  onCitationClick: (chunk: SourceChunk) => void;
}

export function MessageStream({ messages, onCitationClick }: MessageStreamProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-7">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage
            key={message.id}
            message={message}
            onCitationClick={onCitationClick}
            onCopy={() => {
              navigator.clipboard?.writeText(message.content);
              toast({ title: "Answer copied to clipboard" });
            }}
          />
        ),
      )}
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <article className="flex justify-end">
      <div className="max-w-[86%] rounded-sm border border-border bg-secondary/60 px-4 py-3 text-[13px] leading-5 text-foreground">
        <div className="mb-2 flex items-center justify-end gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>You</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden />
          <span>{formatTime(message.createdAt)}</span>
        </div>
        {message.content}
      </div>
    </article>
  );
}

function AssistantMessage({
  message,
  onCitationClick,
  onCopy,
}: {
  message: Message;
  onCitationClick: (chunk: SourceChunk) => void;
  onCopy: () => void;
}) {
  return (
    <article
      className={`relative rounded-sm border-l-2 pl-4 sm:pl-5 ${
        message.lowConfidence ? "border-amber-500" : "border-primary/40"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-primary">
          <Sparkles size={12} aria-hidden /> DocuMind
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatTime(message.createdAt)} · grounded answer
        </span>
        {message.lowConfidence && (
          <span className="ml-auto flex items-center gap-1.5 rounded-sm border border-amber-500/35 bg-amber-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <AlertTriangle size={11} aria-hidden /> Limited supporting evidence
          </span>
        )}
      </div>

      <div className="font-serif text-[18px] leading-[1.6] tracking-tight text-foreground sm:text-[19px]">
        <p>
          {renderContentWithCitations(message.content, message.citations, onCitationClick)}
        </p>
      </div>

      {message.citations.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.citations.map((chunk, index) => (
            <button
              key={chunk.id}
              type="button"
              onClick={() => onCitationClick(chunk)}
              className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-primary/45 hover:bg-primary/5"
            >
              <span className="font-mono text-[10px] font-medium text-primary">[{index + 1}]</span>
              <span className="max-w-[190px] truncate text-[11px] text-muted-foreground">
                {chunk.documentName}
                {chunk.page ? ` · p. ${chunk.page}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-1 text-muted-foreground">
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Copy answer" onClick={onCopy}>
          <Copy size={14} />
        </Button>
      </div>
    </article>
  );
}

function renderContentWithCitations(
  content: string,
  citations: SourceChunk[],
  onCitationClick: (chunk: SourceChunk) => void,
) {
  // The model doesn't emit inline [n] markers itself; citations are shown
  // as a reference list below the answer, plus one trailing marker set so
  // readers can jump straight from the prose to the evidence pane.
  if (citations.length === 0) return content;
  return (
    <>
      {content}{" "}
      {citations.map((chunk, index) => (
        <CitationMarker key={chunk.id} number={index + 1} onClick={() => onCitationClick(chunk)} />
      ))}
    </>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
