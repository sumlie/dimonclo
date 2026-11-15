import type { Field } from 'payload'

export function lockFields(fields: Field[], editable: string[]): Field[] {
  return fields.map((field) => {
    if (
      !('name' in field) ||
      field.type === 'ui' ||
      editable.includes(field.name)
    ) {
      return field
    }

    const access = 'access' in field ? field.access : undefined

    return {
      ...field,
      access: { ...access, update: () => false },
    } as Field
  })
}