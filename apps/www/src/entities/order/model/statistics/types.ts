export type SearchParams = Record<string, string | string[] | undefined>;

export type Bucket = {
  label: string;
  orders: number;
  revenue: number;
};
