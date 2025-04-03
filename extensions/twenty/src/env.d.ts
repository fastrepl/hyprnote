/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWENTY_API_KEY?: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
