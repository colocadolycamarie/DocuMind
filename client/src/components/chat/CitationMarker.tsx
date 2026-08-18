interface CitationMarkerProps {
  number: number;
  onClick: () => void;
}

export function CitationMarker({ number, onClick }: CitationMarkerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open citation ${number}`}
      className="mx-0.5 inline-flex h-[19px] min-w-[19px] translate-y-[-1px] items-center justify-center rounded-sm bg-primary/10 px-1 font-mono text-[10px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      [{number}]
    </button>
  );
}
