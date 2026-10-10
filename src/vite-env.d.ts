/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLEAN_MODE?: 'mock' | 'proxy';
  readonly VITE_GLEAN_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
