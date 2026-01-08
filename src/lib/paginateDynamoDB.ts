import type { PageInfo } from '@/src/lib/schemas/pagination-schema.js';

export type PaginationParams = {
  limit: number;
  token?: string;
  reverseSearch?: boolean;
};

export async function paginate<T, Q extends object>(
  queryFn: (input: Q & { limit: number; exclusiveStartKey?: Record<string, unknown> }) => Promise<{
    items: T[];
    lastEvaluatedKey?: Record<string, unknown>;
  }>,
  queryArgs: Q,
  options: PaginationParams,
  toCursor: (item: T) => any
): Promise<{ items: T[]; pageInfo: PageInfo }> {
  const { limit, token, reverseSearch } = options;

  const exclusiveStartKey = token
    ? JSON.parse(Buffer.from(decodeURIComponent(token), 'base64').toString('utf-8'))
    : undefined;

  const items: T[] = [];
  let lastEvaluatedKey = exclusiveStartKey;
  let hasNextPage = false;

  do {
    const { items: fetchedItems, lastEvaluatedKey: lek } = await queryFn({
      ...queryArgs,
      limit: limit - items.length + 1,
      exclusiveStartKey: lastEvaluatedKey,
      reverseSearch,
    });

    if (reverseSearch) {
      items.unshift(...fetchedItems.reverse());
    } else {
      items.push(...fetchedItems);
    }

    lastEvaluatedKey = lek;
  } while (items.length <= limit && lastEvaluatedKey);

  if (items.length > limit) {
    hasNextPage = true;
    if (reverseSearch) {
      items.splice(0, items.length - limit);
    } else {
      items.splice(limit);
    }
  }

  return {
    items,
    pageInfo: buildPageInfo<T>(items, options, toCursor, hasNextPage),
  };
}

export const buildPageInfo = <T>(
  items: T[],
  params: PaginationParams,
  toCursor: (item: T) => any, // converts an item into a cursor payload
  hasNextPage: boolean
): PageInfo => {
  let startCursor: string | undefined;
  let endCursor: string | undefined;

  if (items.length) {
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    startCursor = encodeURIComponent(
      Buffer.from(JSON.stringify(toCursor(firstItem!))).toString('base64')
    );
    endCursor = encodeURIComponent(
      Buffer.from(JSON.stringify(toCursor(lastItem!))).toString('base64')
    );
  }

  return {
    startCursor,
    endCursor,
    hasNextPage: params.reverseSearch ? !!params.token : hasNextPage,
    hasPreviousPage: params.reverseSearch ? hasNextPage : !!params.token,
  };
};
