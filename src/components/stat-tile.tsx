/**
 * One headline number. Use inside a <dl>, so the label and value stay
 * paired for screen readers.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
      {hint ? (
        <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>
      ) : null}
    </div>
  );
}
