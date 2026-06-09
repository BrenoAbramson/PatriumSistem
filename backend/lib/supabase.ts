import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// O client "Admin" ignora RLS. Use APENAS no backend/servidor e NUNCA exponha ao frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
