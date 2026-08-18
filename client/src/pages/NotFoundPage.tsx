import { Link } from "wouter";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <FileQuestion size={40} className="text-muted-foreground" aria-hidden />
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
      </div>
      <Button asChild>
        <Link href="/">Back to workspace</Link>
      </Button>
    </div>
  );
}
