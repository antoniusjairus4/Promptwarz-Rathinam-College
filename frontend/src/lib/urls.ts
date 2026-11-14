/** Backend source URLs remain unchanged; executable schemes never become links. */
export function safeExternalUrl(value: string | null | undefined): string | undefined {
  try {
    const url = new URL(value || '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? value! : undefined;
  } catch { return undefined; }
}
