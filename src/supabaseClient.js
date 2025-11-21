import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Found' : 'Missing');

let supabaseClient;

if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn('Supabase URL or Anon Key is missing. App will run in offline/mock mode.');
    // Mock client to prevent crash
    supabaseClient = {
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        }),
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                getPublicUrl: () => ({ data: { publicUrl: '' } }),
                remove: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            })
        }
    };
}

export const supabase = supabaseClient;
