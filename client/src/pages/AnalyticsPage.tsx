import { AlertTriangle, BarChart3 } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";
import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading || !analytics) {
    return (
      <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  const maxDailyCount = Math.max(1, ...analytics.questionsPerDay.map((d) => d.count));

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="border-b border-border pb-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            Workspace signal
          </div>
          <h1 className="font-serif text-4xl tracking-tight">Analytics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Real usage across your workspace — where your knowledge base is carrying weight, and where
            it's thin.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Documents" value={analytics.totalDocuments} sub={`${analytics.readyDocuments} ready`} />
          <StatCard label="Conversations" value={analytics.totalConversations} />
          <StatCard
            label="Questions answered"
            value={analytics.totalQuestions}
            sub={`${analytics.lowConfidenceAnswers} low-confidence`}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-md border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Questions over time</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Last {analytics.questionsPerDay.length || 0} active days
                </div>
              </div>
              <BarChart3 size={17} className="text-primary" aria-hidden />
            </div>

            {analytics.questionsPerDay.length === 0 ? (
              <p className="mt-8 text-xs text-muted-foreground">
                No questions asked yet — this chart fills in as your workspace gets used.
              </p>
            ) : (
              <div className="mt-8 flex h-44 items-end gap-2 border-b border-l border-border px-3 pb-0 pt-5">
                {analytics.questionsPerDay.map((day) => (
                  <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div
                      style={{ height: `${Math.max(4, (day.count / maxDailyCount) * 100)}%` }}
                      className="w-full rounded-t-sm bg-primary/70 transition-opacity hover:opacity-80"
                      title={`${day.count} questions on ${day.date}`}
                    />
                    <span className="text-center font-mono text-[9px] text-muted-foreground">
                      {formatShortDate(day.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-card p-5">
            <div className="text-sm font-semibold">Most cited sources</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              Across {analytics.totalQuestions} grounded answers
            </div>
            {analytics.topCitedDocuments.length === 0 ? (
              <p className="mt-6 text-xs text-muted-foreground">No citations yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {analytics.topCitedDocuments.map((doc) => (
                  <div key={doc.documentId}>
                    <div className="flex justify-between text-xs">
                      <span className="truncate pr-2">{doc.documentName}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{doc.sharePercent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-secondary">
                      <div
                        style={{ width: `${doc.sharePercent}%` }}
                        className="h-1.5 rounded-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {analytics.lowConfidenceAnswers > 0 && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} aria-hidden /> Knowledge gaps
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {analytics.lowConfidenceAnswers} answer{analytics.lowConfidenceAnswers === 1 ? "" : "s"} had
              limited supporting evidence. Review them in History and consider uploading sources that
              cover those topics.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "narrow" });
}
