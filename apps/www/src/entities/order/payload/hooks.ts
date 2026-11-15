import type { CollectionConfig } from 'payload';

export const orderHooks: NonNullable<CollectionConfig['hooks']> = {
  beforeChange: [
    ({ data, originalDoc, operation }) => {
      if (operation !== 'update' || !originalDoc) {
        return data;
      }

      const statusChanged =
        data.status !== undefined && data.status !== originalDoc.status;

      const paymentStatusChanged =
        data.paymentStatus !== undefined &&
        data.paymentStatus !== originalDoc.paymentStatus;

      if (!statusChanged && !paymentStatusChanged) {
        return data;
      }

      return {
        ...data,
        notificationVersion: (originalDoc.notificationVersion ?? 1) + 1,
      };
    },
  ],
};
