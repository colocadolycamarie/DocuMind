import { useState } from "react";
import { useLocation } from "wouter";
import { Trash2, Upload } from "lucide-react";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { formatBytes } from "@/components/library/LibraryRail";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Document, DocumentStatus } from "@docu-mind/shared";

function statusMeta(status: DocumentStatus) {
  switch (status) {
    case "ready":
      return { label: "Ready", color: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-600" };
    case "processing":
      return { label: "Processing", color: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" };
    case "queued":
      return { label: "Queued", color: "text-muted-foreground", dot: "bg-muted-foreground" };
    default:
      return { label: "Failed", color: "text-destructive", dot: "bg-destructive" };
  }
}

export function LibraryPage() {
  const { data: documents, isLoading } = useDocuments();
  const deleteDocument = useDeleteDocument();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteDocument.mutate(pendingDelete.id, {
      onSuccess: () => toast({ title: `${pendingDelete.name} removed` }),
      onError: (error) =>
        toast({
          title: "Couldn't delete document",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        }),
    });
    setPendingDelete(null);
  };

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
              Knowledge base
            </div>
            <h1 className="font-serif text-4xl tracking-tight">Document library</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Every source available to your workspace, with real ingestion state and usage.
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => navigate("/")}>
            <Upload size={14} /> Upload from workspace
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
            {documents?.filter((d) => d.status === "ready").length ?? 0} ready · {documents?.length ?? 0} total
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-md border border-border bg-card">
          <div className="hidden grid-cols-[minmax(260px,2fr)_1.2fr_100px_100px_120px_40px] gap-4 border-b border-border bg-secondary/45 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground md:grid">
            <span>Name</span>
            <span>Collection</span>
            <span>Status</span>
            <span>Size</span>
            <span>Last queried</span>
            <span />
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No documents yet. Upload one from the workspace view to get started.
            </div>
          ) : (
            documents.map((doc) => {
              const status = statusMeta(doc.status);
              return (
                <div
                  key={doc.id}
                  className="group grid grid-cols-1 gap-2 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-secondary/30 md:grid-cols-[minmax(260px,2fr)_1.2fr_100px_100px_120px_40px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium">{doc.name}</span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      {doc.fileType.toUpperCase()} · uploaded {formatDate(doc.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{doc.collection}</div>
                  <div className={`flex items-center gap-1.5 text-xs ${status.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
                    {status.label}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {formatBytes(doc.fileSizeBytes)}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {doc.lastQueriedAt ? formatDate(doc.lastQueriedAt) : "Not yet"}
                  </div>
                  <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      aria-label={`Delete ${doc.name}`}
                      onClick={() => setPendingDelete(doc)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the document, its stored file, and every indexed passage. Conversations that
              cited it will keep their existing answers but the source will no longer be searchable. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
