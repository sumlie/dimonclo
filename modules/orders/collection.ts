import type { CollectionConfig } from 'payload'

import { toOptions } from '@/shared/lib/status'

import { orderEndpoints } from './endpoints'
import { orderStatus, paymentStatus } from './status'
import { lockFields } from './lockFiled'

export const Orders: CollectionConfig = {
  slug: 'orders',

  access: {
    create: () => false,
    read: ({ req: { user } }) => {
      if (user?.collection === 'admins') return true
      if (user?.collection === 'customers') return { customer: { equals: user.id } }
      return false
    },
    delete: () => false,
  },

  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation !== 'update' || !originalDoc) {
          return data
        }

        const statusChanged =
          data.status !== undefined &&
          data.status !== originalDoc.status

        const paymentStatusChanged =
          data.paymentStatus !== undefined &&
          data.paymentStatus !== originalDoc.paymentStatus

        if (!statusChanged && !paymentStatusChanged) {
          return data
        }

        return {
          ...data,
          notificationVersion:
            (originalDoc.notificationVersion ?? 1) + 1,
        }
      },
    ],
  },

  endpoints: orderEndpoints,

  admin: {
    group: false,
    useAsTitle: 'id',
    defaultColumns: [
      'id',
      'customerName',
      'username',
      'items',
      'totalByn',
      'total',
      'createdAt',
      'status',
      'paymentStatus',
    ],
    components: {
      views: {
        edit: {
          root: {
            Component: '/modules/orders/ui/orderView'
          }
        }
      }
    }
  },

  fields: lockFields(
    [
    {
      name: 'items',
      type: 'array',
      label: 'Товары в заказе',
      required: true,
      minRows: 1,
      labels: { singular: 'Товар', plural: 'Товары' },
      admin: {
        components: {
          Cell: '/modules/orders/ui/orderItemsCell',
        },
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          label: 'Товар',
          admin: {
            allowCreate: false,
            allowEdit: false,
          },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          label: 'Количество',
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          label: 'Цена за единицу',
        },
        {
          name: 'unitPriceByn',
          type: 'number',
          min: 0,
          label: 'Цена за единицу (BYN)',
        },
        {
          name: 'sizeId',
          type: 'text',
          label: 'ID размера',
        },
        {
          name: 'sizeLabel',
          type: 'text',
          label: 'Размер',
        },
      ],
    },
    {
      name: 'discountType',
      type: 'select',
      label: 'Тип скидки',
      defaultValue: 'none',
      options: [
        { label: 'Без скидки', value: 'none' },
        { label: 'Первый заказ', value: 'first_order' },
        { label: 'Промокод', value: 'promo_code' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'promoCode',
      type: 'text',
      label: 'Промокод',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'discountPercent',
      type: 'number',
      label: 'Скидка (%)',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'discountAmount',
      type: 'number',
      label: 'Сумма скидки (RUB)',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'discountAmountByn',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Сумма скидки (BYN)',
      admin: { readOnly: true },
    },
    {
      name: 'deliveryPrice',
      type: 'number',
      label: 'Стоимость доставки (RUB)',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'deliveryPriceByn',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Стоимость доставки (BYN)',
      admin: { readOnly: true },
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
      label: 'Сумма (RUB)',
    },
    {
      name: 'totalByn',
      type: 'number',
      min: 0,
      defaultValue: 0,
      label: 'Сумма (BYN)',
      admin: { readOnly: true },
    },
    {
      name: 'totalWeight',
      type: 'number',
      label: 'Общий вес (граммы)',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: 'Статус заказа',
      options: toOptions(orderStatus),
      admin: {
        components: {
          Cell: '/shared/ui/editableSelectCell',
        },
        custom: {
          updateURL: '/api/orders/:id/update-status',
        },
      },
    },
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
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Статус оплаты',
      options: toOptions(paymentStatus),
      admin: {
        components: {
          Cell: '/shared/ui/editableSelectCell',
        },
        custom: {
          updateURL: '/api/orders/:id/update-payment-status',
        },
      },
    },
    {
      name: 'adminNote',
      type: 'textarea',
      label: 'Заметка (видна только админам)',
      maxLength: 5000,
      admin: { hidden: true },
      access: {
        create: ({ req: { user } }) => user?.collection === 'admins',
        read: ({ req: { user } }) => user?.collection === 'admins',
        update: ({ req: { user } }) => user?.collection === 'admins',
      },
    },
    {
      name: 'comment',
      type: 'textarea',
      label: 'Комментарий покупателя',
    },
    {
      name: 'notificationVersion',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        hidden: true,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'seenNotificationVersion',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        hidden: true,
      },
      access: {
        update: () => false,
      },
    },
  ], ["status", "paymentStatus", "adminNote"]),
}