/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Allow importing .vue files in TypeScript
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
