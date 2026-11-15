import type { DefaultServerCellComponentProps } from 'payload';
import { StatusSelect } from './status-select';

export default function EditableSelectCell({
  field,
  rowData,
  cellData,
}: DefaultServerCellComponentProps) {
  if (field.type !== 'select' || !('name' in field)) {
    return null;
  }

  const updateURL = field.admin?.custom?.updateURL;

  if (typeof updateURL !== 'string') {
    return <span>{String(cellData ?? '—')}</span>;
  }

  const options = field.options.map((option) =>
    typeof option === 'string'
      ? { label: option, value: option }
      : {
          label: typeof option.label === 'string' ? option.label : option.value,
          value: option.value,
        },
  );

  return (
    <StatusSelect
      key={`${rowData.id}:${cellData}`}
      fieldName={field.name}
      id={rowData.id}
      value={cellData}
      updateURL={updateURL}
      options={options}
    />
  );
}
