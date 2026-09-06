/// <reference types="vite/client" />

declare module '@content-index' {
  const value: unknown;
  export default value;
}

declare module '@content-chunks' {
  export const lessonChunks: Record<string, () => Promise<{ default: unknown }>>;
  export const exerciseChunks: Record<string, () => Promise<{ default: unknown }>>;
  export const sectionChunks: Record<string, () => Promise<{ default: unknown }>>;
}
