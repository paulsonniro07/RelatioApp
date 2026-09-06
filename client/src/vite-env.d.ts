/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /**
   * Chart persistence target: 'api' (ASP.NET backend, default) or 'local'
   * (browser localStorage — zero-backend deployments like Vercel).
   */
  readonly VITE_DATA_SOURCE?: string;
}


interface ImportMeta {
  readonly env: ImportMetaEnv;
}
