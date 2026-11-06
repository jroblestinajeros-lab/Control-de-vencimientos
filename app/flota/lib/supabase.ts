import { createClient } from '@supabase/supabase-js';

// URL de tu proyecto de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cxqwzbfbfarrlgbhtuv.supabase.co';

// Clave pública (Publishable Key) - Segura para usar en el navegador
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tLRrpt_XooefWWZp-xXDaQ_eNyXO_zE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
