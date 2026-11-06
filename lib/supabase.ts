import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cxqwzbfbfarrlgbhtuv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4cXd6YmZiZmZhcnJsZ2JodHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzM4NjMsImV4cCI6MjEwMzAwOTg2M30.aoD9lfz_j6cv34DiQju8-FL7LnDUgfzojtMbY4FG8UE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
