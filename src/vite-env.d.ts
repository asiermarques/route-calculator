/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTING_PROVIDER?: string
  readonly VITE_ROUTING_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
