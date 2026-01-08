interface CursorData {
  ts: number; // Unix timestamp in ms
  id: string; // Transaction UUID
}

export function encodeCursor(timestamp: Date, txId: string): string {
  const data: CursorData = { ts: timestamp.getTime(), id: txId };
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): { timestamp: Date; txId: string } {
  try {
    const data: CursorData = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (typeof data.ts !== 'number' || typeof data.id !== 'string') {
      throw new Error('Invalid cursor format');
    }
    return { timestamp: new Date(data.ts), txId: data.id };
  } catch {
    throw new Error('Invalid cursor');
  }
}
