export const formatGermanDate = (value: string | number | Date): string =>
  new Date(value).toLocaleDateString('de-DE');
