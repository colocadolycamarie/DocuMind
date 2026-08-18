import { useMemo, useRef } from "react";
import {
  FileCode2,
  FileSpreadsheet,
  FileText,
  Files,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useDocuments, useUploadDocument } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Document, DocumentStatus } from "@docu-mind/shared";
import { SUPPORTED_FILE_EXTENSIONS } from "@docu-mind/shared";

function fileIcon(fileType: string, size = 17) {
  if (fileType === "csv") return <FileSpreadsheet size={size} strokeWidth={1.7} />;
  if (fileType === "md" || fileType === "txt") return <FileCode2 size={size} strokeWidth={1.7} />;
  return <FileText size={size} strokeWidth={1.7} />;
}

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

interface LibraryRailProps {
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function LibraryRail({
  selectedDocumentId,
  onSelectDocument,
  search,
  onSearchChange,
}: LibraryRailProps) {
  const { data: documents, isLoading } = useDocuments();
  const uploadDocument = useUploadDocument();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!documents) return [];
    const query = search.toLowerCase();
    return documents.filter((doc) =>
      `${doc.name} ${doc.collection} ${doc.tags.join(" ")}`.toLowerCase().includes(query),
    );
  }, [documents, search]);

  const handleFileSelected = (file: File) => {
    uploadDocument.mutate(
      { file },
      {
        onSuccess: (result) => {
          onSelectDocument(result.document.id);
          toast({ title: `${file.name} uploaded`, description: "Indexing has started." });
        },
        onError: (error) => {
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <aside className="flex min-h-0 w-full flex-col border-r border-border bg-sidebar lg:w-[280px] lg:shrink-0">
      <div className="flex h-[58px] items-center justify-between border-b border-sidebar-border px-4">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Files size={16} className="text-primary" aria-hidden />
          Library
          <span className="font-mono text-[10px] text-muted-foreground">{documents?.length ?? 0}</span>
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelected(file);
            event.currentTarget.value = "";
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Upload document"
          disabled={uploadDocument.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadDocument.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
        </Button>
      </div>

      <div className="border-b border-sidebar-border p-3">
        <label className="relative block">
          <span className="sr-only">Search library</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            placeholder="Search this library"
            className="h-9 pl-8 pr-8 text-xs"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyLibraryState hasDocuments={(documents?.length ?? 0) > 0} onUpload={() => fileInputRef.current?.click()} />
        ) : (
          filtered.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              isSelected={selectedDocumentId === doc.id}
              onSelect={() => onSelectDocument(doc.id)}
            />
          ))
        )}
      </div>

      <div className="border-t border-sidebar-border p-3">
        <Button
          type="button"
          variant="outline"
          className="flex min-h-11 w-full items-center justify-center gap-2 border-dashed text-xs font-medium text-muted-foreground hover:text-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadDocument.isPending}
        >
          <Plus size={15} /> Add a source
        </Button>
      </div>
    </aside>
  );
}

function DocumentRow({
  document,
  isSelected,
  onSelect,
}: {
  document: Document;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const status = statusMeta(document.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group mb-1 w-full rounded-sm border px-2.5 py-2.5 text-left transition-colors",
        isSelected
          ? "border-primary/40 bg-card shadow-sm"
          : "border-transparent hover:border-sidebar-border hover:bg-sidebar-accent/60",
      )}
    >
      <div className="flex gap-2.5">
        <span className={cn("mt-0.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}>
          {fileIcon(document.fileType)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium leading-4">{document.name}</span>
          <span className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden />
            <span className={status.color}>{status.label}</span>
            <span className="text-border">·</span>
            {formatBytes(document.fileSizeBytes)}
          </span>
        </span>
      </div>
    </button>
  );
}

function EmptyLibraryState({ hasDocuments, onUpload }: { hasDocuments: boolean; onUpload: () => void }) {
  return (
    <div className="px-3 py-8 text-center text-xs text-muted-foreground">
      <Search size={18} className="mx-auto mb-2 opacity-50" aria-hidden />
      {hasDocuments ? (
        "No sources match that search."
      ) : (
        <>
          <p className="mb-3">No documents yet.</p>
          <Button size="sm" variant="outline" onClick={onUpload}>
            <Upload size={14} className="mr-1.5" /> Upload your first source
          </Button>
        </>
      )}
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
