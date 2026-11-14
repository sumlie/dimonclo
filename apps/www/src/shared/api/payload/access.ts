import type { Access, CollectionConfig } from 'payload';

// Generic collection-scoped authentication, independent of any domain entity.
export function authenticatedCollectionAccess(
  authCollection: string,
): CollectionConfig['access'] {
  const authenticated: Access = ({ req }) => req.user?.collection === authCollection;

  return {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  };
}
