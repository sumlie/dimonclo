import type { Field } from 'payload';
import { onlyAdmin } from '../access';

export const authenticationFields: Field[] = [
  {
    name: 'accounts',
    type: 'array',
    label: 'Привязанные соцсети (устарело)',
    admin: {
      readOnly: true,
      hidden: true,
      description: 'Данные перенесены в коллекцию customer-identities.',
    },
    access: { create: () => false, read: onlyAdmin, update: () => false },
    fields: [
      {
        name: 'provider',
        type: 'select',
        required: true,
        options: ['google', 'telegram', 'vk', 'yandex'],
      },
      { name: 'providerId', type: 'text', required: true, index: true },
    ],
  },
  {
    name: 'emailVerifiedAt',
    type: 'date',
    label: 'Email подтверждён',
    admin: { readOnly: true, position: 'sidebar' },
    access: { update: onlyAdmin },
  },
  {
    name: 'socialOnly',
    type: 'checkbox',
    label: 'Только соцвход',
    defaultValue: false,
    admin: { readOnly: true, position: 'sidebar' },
    access: { update: onlyAdmin },
  },
  {
    name: 'registrationCompletedAt',
    type: 'date',
    label: 'Регистрация завершена',
    admin: { readOnly: true, position: 'sidebar' },
    access: { update: onlyAdmin },
  },
  {
    name: 'isBlocked',
    type: 'checkbox',
    label: 'Заблокирован',
    defaultValue: false,
    access: { update: onlyAdmin },
    admin: { position: 'sidebar' },
  },
  {
    name: 'consentAt',
    type: 'date',
    label: 'Согласие на обработку данных',
    admin: { readOnly: true, position: 'sidebar' },
    access: { update: () => false },
  },
];
