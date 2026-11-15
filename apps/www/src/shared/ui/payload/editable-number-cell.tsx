import type { DefaultServerCellComponentProps } from 'payload';
import { NumberInput } from './number-input';

export default function EditableNumberCell({
  field,
  rowData,
  cellData,
}: DefaultServerCellComponentProps) {
  if (field.type !== 'number') {
    return null;
  }

  const updateURL = field.admin?.custom?.updateURL;

  if (typeof updateURL !== 'string') {
    return <span>{String(cellData ?? '—')}</span>;
  }

  return (
    <NumberInput
      key={`${rowData.id}:${cellData}`}
      id={rowData.id}
      fieldName={field.name}
      value={cellData}
      updateURL={updateURL}
      min={field.min}
      max={field.max}
    />
  );
}
