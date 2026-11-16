'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ERROR_COLOR } from '@/shared/ui/payload/theme';
import { statusColors } from '@/shared/lib/status-colors';

type Props = {
  fieldName: string;
  updateURL: string;
  id: string | number;
  value?: string | null;
  options: { label: string; value: string }[];
};

export function StatusSelect({
  fieldName,
  updateURL,
  id,
  value,
  options,
}: Props) {
  const [current, setCurrent] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const color = error ? ERROR_COLOR : (statusColors[current] ?? 'currentColor');

  async function update(next: string) {
    setSaving(true);
    setError(false);

    try {
      const response = await fetch(
        updateURL.replace(':id', encodeURIComponent(String(id))),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: fieldName, value: next }),
        },
      );

      if (!response.ok) {
        throw new Error('Update failed');
      }

      setCurrent(next);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span
      title={error ? 'Не удалось сохранить. Обновите страницу.' : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        opacity: saving ? 0.6 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 9,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          pointerEvents: 'none',
        }}
      />
      <select
        aria-label={fieldName}
        disabled={saving}
        value={current}
        onChange={(event) => void update(event.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          margin: 0,
          height: 28,
          minWidth: 112,
          padding: '0 22px',
          border: 'none',
          borderRadius: 4,
          outline: 'none',
          font: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          color,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          cursor: saving ? 'default' : 'pointer',
        }}
      >
        {!options.some((option) => option.value === current) && (
          <option value={current}>{current || '—'}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        width="10"
        height="10"
        viewBox="0 0 10 10"
        style={{
          position: 'absolute',
          right: 8,
          pointerEvents: 'none',
          color,
        }}
      >
        <path
          d="M2 3.5 5 6.5 8 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
