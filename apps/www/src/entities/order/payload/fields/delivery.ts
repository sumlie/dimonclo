import type { Field } from 'payload';

export const deliveryFields: Field[] = [
  {
    name: 'deliveryRegion',
    type: 'select',
    label: 'Регион доставки',
    options: [
      { label: 'Беларусь', value: 'belarus' },
      { label: 'Москва и Московская область', value: 'moscow' },
      { label: 'Другие регионы России', value: 'russia' },
      { label: 'Страны СНГ', value: 'cis' },
      { label: 'Остальной мир', value: 'world' },
    ],
    admin: {
      readOnly: true,
    },
  },
  {
    name: 'deliveryMethod',
    type: 'text',
    label: 'Способ доставки',
  },
  {
    name: 'deliveryAddress',
    type: 'textarea',
    label: 'Адрес доставки / пункт выдачи',
  },
  {
    name: 'paymentMethod',
    type: 'text',
    label: 'Способ оплаты',
  },
];
