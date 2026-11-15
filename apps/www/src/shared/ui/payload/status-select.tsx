'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { border } from './theme';

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
    <span>
      <select
        aria-label={fieldName}
        disabled={saving}
        value={current}
        onChange={(event) => void update(event.target.value)}
        style={{
          border,
          padding: 6,
          background: 'var(--theme-input-bg)',
          color: 'inherit',
          font: 'inherit',
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
      {error && <span role="alert"> Не удалось сохранить</span>}
    </span>
  );
}
