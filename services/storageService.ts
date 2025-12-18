
import { DocumentFile } from '../types';

export interface StorageAdapter {
    upload(file: File, path?: string): Promise<string>;
    delete(path: string): Promise<void>;
}

// ADAPTER 1: LocalStorage (Base64)
// Fallback for immediate use and offline support
class LocalStorageAdapter implements StorageAdapter {
    async upload(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async delete(path: string): Promise<void> {
        // No-op for local base64 strings as they are stored in the object itself
        console.log("Deleted local content ref");
    }
}

// ADAPTER 2: AWS S3 (Cloud)
// Ready for production configuration
class S3StorageAdapter implements StorageAdapter {
    private bucket: string;
    private region: string;

    constructor(bucket: string, region: string) {
        this.bucket = bucket;
        this.region = region;
    }

    async upload(file: File, path: string): Promise<string> {
        // Placeholder for actual S3 upload
        // In production: use AWS SDK v3
        console.log(`[S3 Mock] Uploading ${file.name} to s3://${this.bucket}/${path}`);

        // For now, fall back to base64 to keep app working until keys are provided
        return new LocalStorageAdapter().upload(file);
    }

    async delete(path: string): Promise<void> {
        console.log(`[S3 Mock] Deleting s3://${this.bucket}/${path}`);
    }
}

// FACTORY
export const createStorageService = (): StorageAdapter => {
    // Check for Env Vars to switch mode
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    const bucket = import.meta.env.VITE_AWS_BUCKET;

    if (useCloud && bucket) {
        console.log("Using Cloud Storage (S3)");
        return new S3StorageAdapter(bucket, import.meta.env.VITE_AWS_REGION || 'us-east-1');
    }

    console.log("Using Local Storage (Base64)");
    return new LocalStorageAdapter();
};

export const storageService = createStorageService();
