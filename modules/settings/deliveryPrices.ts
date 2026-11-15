import type { GlobalConfig } from 'payload'

export const DeliveryPrices: GlobalConfig = {
  slug: 'delivery-and-pickup',

  label: 'Delivery and pickup',

  admin: {
    group: 'Tweaks',
  },

  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.collection === 'admins',
  },

  fields: [
    {
      name: 'pickupEnabled',
      type: 'checkbox',
      label: 'Самовывоз доступен',
      defaultValue: true,
    },
    {
      name: 'pickupAddress',
      type: 'text',
      label: 'Адрес самовывоза',
      required: true,
      defaultValue: 'Минск, проспект Машерова, 60',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'senderCountryCode',
          type: 'text',
          label: 'Код страны отправителя',
          defaultValue: 'BY',
          required: true,
        },
        {
          name: 'senderCity',
          type: 'text',
          label: 'Город отправителя',
          defaultValue: 'Минск',
          required: true,
        },
        {
          name: 'senderAddress',
          type: 'text',
          label: 'Адрес отправителя',
          defaultValue: 'ул. Козлова, 4',
          required: true,
          admin: {
            description: 'Пункт выдачи СДЭК. Без города и страны. Заполнять строго как на официальном сайте.',
          },
        },
      ],
    },
    {
      name: 'packagingWeightG',
      type: 'number',
      label: 'Вес упаковки (г)',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Добавляется к общему весу заказа при расчёте доставки',
      },
    },
    {
      name: 'cis',
      type: 'number',
      label: 'Доставка в страны СНГ (RUB)',
      required: true,
      min: 0,
      defaultValue: 790,
    },
    {
      name: 'world',
      type: 'number',
      label: 'Доставка по всему миру (RUB)',
      required: true,
      min: 0,
      defaultValue: 3190,
    },
  ],
}