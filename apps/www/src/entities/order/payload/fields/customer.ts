import type { Field } from 'payload';

export const customerFields: Field[] = [
  {
    name: 'customer',
    type: 'relationship',
    relationTo: 'customers',
    index: true,
    admin: { readOnly: true },
  },
  {
    name: 'customerName',
    type: 'text',
    required: true,
    label: 'Имя покупателя',
  },
  {
    name: 'username',
    type: 'text',
    required: true,
    label: 'Аккаунт',
  },
  {
    name: 'email',
    type: 'email',
    required: true,
    label: 'Email',
  },
  {
    name: 'phone',
    type: 'text',
    label: 'Телефон',
  },
];
