'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function verifyAuth() {
      try {
        // 1. Intentar obtener la sesión activa desde el cliente de Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setLoading(false);
          return;
        }

        // 2. Si no hay sesión local, verificar si existe la cookie que creó /api/auth
        const hasAuthCookie = document.cookie.includes('sb-access-token');
        
        if (hasAuthCookie) {
          // Reintentar sincronizar la sesión en el cliente
          const { data: refreshedSession } = await supabase.auth.getSession();
          if (refreshedSession?.session?.user) {
            setUser(refreshedSession.session.user);
            setLoading(false);
            return;
          }
        }

        // 3. Si definitivamente no hay sesión ni cookie, redirigir al login
        router.push('/login');
      } catch (err) {
        console.error('Error verificando sesión:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();

    // Escuchar cambios de estado en la autenticación (ej. cierre de sesión)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.push('/login');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Limpiar cookies creadas por el servidor
    document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400">Cargando panel de finanzas...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Encabezado Principal */}
      <header className="max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Finanzas Personales</h1>
          <p className="text-xs text-slate-400">
            Bienvenido, <span className="text-emerald-400 font-medium">{user.user_metadata?.full_name || user.email}</span>
          </p>
        </div>
        
        <button
          onClick={handleSignOut}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg transition-colors"
        >
          Cerrar Sesión
        </button>
      </header>

      {/* Contenido Principal / Dashboard */}
      <section className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Balance General</h3>
            <p className="text-3xl font-bold text-emerald-400 font-mono">S/ 0.00</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-bold text-blue-400 font-mono">S/ 0.00</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos del Mes</h3>
            <p className="text-3xl font-bold text-rose-400 font-mono">S/ 0.00</p>
          </div>
        </div>

        {/* Sección central para módulos futuros */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <h2 className="text-lg font-semibold text-white">Plataforma Lista & Autenticada</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            La sesión está conectada correctamente con Supabase. Puedes comenzar a registrar transacciones, metas de ahorro y presupuestos.
          </p>
        </div>
      </section>
    </main>
  );
}
