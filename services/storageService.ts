import { DocumentFile } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export interface StorageAdapter {
    upload(file: File, path?: string): Promise<string>;
    delete(path: string): Promise<void>;
}

// ADAPTER 1: LocalStorage (Base64)
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
        console.log("Deleted local content ref");
    }
}

// ADAPTER 2: Supabase (Cloud)
class CloudStorageAdapter implements StorageAdapter {
    private bucket: string;

    constructor(bucket: string) {
        this.bucket = bucket;
    }

    async upload(file: File, path: string): Promise<string> {
        if (!isSupabaseConfigured) {
            console.warn("Supabase not configured, falling back to local storage");
            return new LocalStorageAdapter().upload(file);
        }

        const { data, error } = await supabase.storage
            .from(this.bucket)
            .upload(path, file, { upsert: true });

        if (error) {
            console.error("Supabase Upload Error:", error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(this.bucket)
            .getPublicUrl(data.path);

        return publicUrl;
    }

    async delete(path: string): Promise<void> {
        if (!isSupabaseConfigured) return;
        const { error } = await supabase.storage
            .from(this.bucket)
            .remove([path]);

        if (error) console.error("Supabase Delete Error:", error);
    }
}

// FACTORY
export const createStorageService = (): StorageAdapter => {
    const useCloud = import.meta.env.VITE_USE_CLOUD_STORAGE === 'true';
    const bucket = import.meta.env.VITE_SUPABASE_BUCKET || 'documents';

    if (useCloud && isSupabaseConfigured) {
        console.log("Using Cloud Storage (Supabase)");
        return new CloudStorageAdapter(bucket);
    }

    console.log("Using Local Storage (Base64)");
    return new LocalStorageAdapter();
};

export const storageService = createStorageService();
