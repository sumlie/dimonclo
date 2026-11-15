'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { border } from './theme';

export function NumberInput({
  id,
  fieldName,
  value,
  updateURL,
  min,
  max,
}: {
  id: string | number;
  fieldName: string;
  value: number | null;
  updateURL: string;
  min?: number;
  max?: number;
}) {
  const [current, setCurrent] = useState(value == null ? '' : String(value));
  const [saved, setSaved] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  async function save() {
    if (current === saved || saving) {
      return;
    }

    const amount = Number(current);

    if (
      !current.trim() ||
      !Number.isFinite(amount) ||
      (min !== undefined && amount < min) ||
      (max !== undefined && amount > max)
    ) {
      setError(true);

      return;
    }

    setSaving(true);
    setError(false);

    try {
      const response = await fetch(
        updateURL.replace(':id', encodeURIComponent(String(id))),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: fieldName, value: amount }),
        },
      );

      if (!response.ok) {
        throw new Error('Update failed');
      }

      setSaved(current);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span>
      <input
        type="number"
        step="any"
        aria-label={fieldName}
        min={min}
        max={max}
        disabled={saving}
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void save();
          }
        }}
        style={{
          width: 100,
          border,
          padding: 6,
          background: 'var(--theme-input-bg)',
          color: 'inherit',
        }}
      />
      {error && <span role="alert"> Не удалось сохранить</span>}
    </span>
  );
}
