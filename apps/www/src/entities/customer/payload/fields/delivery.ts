import type { Field } from 'payload';
import { onlyCustomer } from '../access';

export const deliveryFields: Field[] = [
  {
    name: 'deliveryRegion',
    type: 'select',
    label: 'Регион доставки',
    options: [
      { label: 'Беларусь', value: 'belarus' },
      { label: 'Россия', value: 'russia' },
      { label: 'Страны СНГ', value: 'cis' },
      { label: 'Остальной мир', value: 'world' },
    ],
  },
  {
    name: 'cdekPointCode',
    type: 'text',
    label: 'Код пункта выдачи СДЭК',
  },
  {
    name: 'addresses',
    type: 'array',
    label: 'Адреса доставки',
    maxRows: 5,
    access: { update: onlyCustomer },
    fields: [
      {
        name: 'label',
        type: 'text',
        label: 'Название',
        admin: { description: 'Например: Дом, Работа' },
      },
      { name: 'recipientName', type: 'text', label: 'Получатель' },
      { name: 'recipientPhone', type: 'text', label: 'Телефон получателя' },
      { name: 'deliveryMethod', type: 'text', label: 'Способ доставки' },
      {
        name: 'address',
        type: 'textarea',
        label: 'Адрес / пункт выдачи',
        required: true,
      },
      {
        name: 'isDefault',
        type: 'checkbox',
        label: 'По умолчанию',
        defaultValue: false,
      },
    ],
  },
  {
    name: 'defaultPaymentMethod',
    type: 'text',
    label: 'Способ оплаты по умолчанию',
    access: { update: onlyCustomer },
  },
];
