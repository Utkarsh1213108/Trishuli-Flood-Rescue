import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

// Safe placeholders let the flood-analysis workspace load when incident storage
// is not configured. App.tsx checks isSupabaseConfigured before using this client.
export const supabase = createClient(
  supabaseUrl || 'https://configuration-required.supabase.co',
  supabasePublishableKey || 'configuration-required',
)
