import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MessageSquare, Pin, PinOff, Search } from "lucide-react";
import { useConversations, useTogglePinConversation } from "@/hooks/use-conversations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoryPage() {
  const { data: conversations, isLoading } = useConversations();
  const togglePin = useTogglePinConversation();
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const filtered = useMemo(() => {
    if (!conversations) return [];
    const query = search.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(query));
  }, [conversations, search]);

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="border-b border-border pb-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            Conversation archive
          </div>
          <h1 className="font-serif text-4xl tracking-tight">History</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A traceable record of every question your workspace has asked.
          </p>
        </div>

        <div className="mt-5">
          <label className="relative block">
            <span className="sr-only">Search conversations</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              placeholder="Search conversations"
              className="h-9 pl-9 text-xs"
            />
          </label>
        </div>

        <div className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {conversations && conversations.length > 0
                ? "No conversations match that search."
                : "No conversations yet. Ask a question from the workspace view to get started."}
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="group flex items-start gap-3 px-4 py-4 hover:bg-secondary/30">
                <MessageSquare size={16} className="mt-1 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="text-left text-sm font-medium hover:text-primary"
                  >
                    {item.title}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
                    <span>{item.messageCount} messages</span>
                    <span>{formatRelativeTime(item.updatedAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-70 group-hover:opacity-100"
                  aria-label={item.pinned ? "Unpin conversation" : "Pin conversation"}
                  onClick={() => togglePin.mutate({ id: item.id, pinned: !item.pinned })}
                >
                  {item.pinned ? <Pin size={14} className="text-primary" /> : <PinOff size={14} />}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
