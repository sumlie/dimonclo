'use client';

import { useState } from 'react';
import {
  BG,
  CARD_BG,
  ERROR_COLOR,
  MUTED_OPACITY,
  border,
} from '@/shared/ui/payload/theme';

type Props = {
  id: string | number;
  initialValue: string;
};

export function OrderAdminNote({ id, initialValue }: Props) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  const dirty = value !== saved;

  async function save() {
    setState('saving');

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setSaved(value);
      setState('idle');
    } catch {
      setState('error');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);

          if (state === 'error') {
            setState('idle');
          }
        }}
        maxLength={5000}
        placeholder="Пометки по заказу: звонил, ждём оплату, нюансы упаковки..."
        style={{
          width: '100%',
          minHeight: '120px',
          boxSizing: 'border-box',
          padding: '10px 12px',
          border,
          background: BG,
          color: 'inherit',
          font: 'inherit',
          fontSize: '14px',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === 'saving'}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: CARD_BG,
            color: 'inherit',
            font: 'inherit',
            fontSize: '14px',
            cursor: dirty && state !== 'saving' ? 'pointer' : 'default',
            opacity: dirty && state !== 'saving' ? 1 : 0.4,
          }}
        >
          {state === 'saving' ? 'Сохраняем...' : 'Сохранить'}
        </button>

        <span
          style={{
            fontSize: '13px',
            opacity: state === 'error' ? 1 : MUTED_OPACITY,
            color: state === 'error' ? ERROR_COLOR : undefined,
          }}
        >
          {state === 'error'
            ? 'Не удалось сохранить, попробуй ещё раз'
            : dirty
              ? 'Есть несохранённые изменения'
              : saved
                ? 'Сохранено'
                : ''}
        </span>
      </div>
    </div>
  );
}
