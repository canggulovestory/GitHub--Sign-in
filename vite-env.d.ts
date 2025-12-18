/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_USE_CLOUD_STORAGE: string
    readonly VITE_AWS_BUCKET: string
    readonly VITE_AWS_REGION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
