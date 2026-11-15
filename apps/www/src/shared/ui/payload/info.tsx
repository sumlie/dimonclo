export function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <span style={{ opacity: 0.65 }}>{label}: </span>
      <span>{value || '—'}</span>
    </div>
  );
}
