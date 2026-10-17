export function figureSession(key: string, value?: string): string | null {
  try {
    if (value !== undefined) sessionStorage.setItem(`argmin:figure:${key}`, value);
    return sessionStorage.getItem(`argmin:figure:${key}`);
  } catch { return null; }
}
