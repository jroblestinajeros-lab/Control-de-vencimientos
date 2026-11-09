import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializamos cliente backend seguro en el servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cxqwzbfbffarrlgbhtuv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const { action, email, password, fullName } = await request.json();

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, user: data.user });
    }

    if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Crear respuesta e intentar adjuntar cookies de sesión
      const response = NextResponse.json({ success: true, session: data.session });
      
      if (data.session) {
        response.cookies.set('sb-access-token', data.session.access_token, {
          path: '/',
          httpOnly: true,
          secure: true,
        });
      }

      return response;
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error de servidor' }, { status: 500 });
  }
}
