import type { Field } from 'payload';
import { onlyAdmin, onlyCustomer } from '../access';

export const profileFields: Field[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Имя',
    required: true,
    access: { update: onlyCustomer },
  },
  {
    name: 'phone',
    type: 'text',
    label: 'Телефон',
    access: { update: onlyCustomer },
  },
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    maxLength: 33,
    access: {
      update: onlyCustomer,
    },
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    required: true,
    access: {
      update: onlyAdmin,
    },
  },
];
