'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Comprobamos sesión local
    const sessionData = localStorage.getItem('user_session');
    const isLoggedCookie = document.cookie.includes('user_logged_in');

    if (!sessionData && !isLoggedCookie) {
      router.push('/login');
      return;
    }

    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setUserEmail(parsed?.user?.email || 'jroblestinajeros@gmail.com');
      } catch (e) {
        setUserEmail('jroblestinajeros@gmail.com');
      }
    } else {
      setUserEmail('jroblestinajeros@gmail.com');
    }

    setLoading(false);
  }, [router]);

  function handleSignOut() {
    localStorage.removeItem('user_session');
    document.cookie = 'user_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Encabezado Principal */}
      <header className="max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Finanzas Personales</h1>
          <p className="text-xs text-slate-400">
            Bienvenido, <span className="text-emerald-400 font-medium">{userEmail}</span>
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

        {/* Módulo de bienvenida */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <h2 className="text-lg font-semibold text-white">Plataforma Lista & Autenticada</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Acceso concedido correctamente. Puedes comenzar a estructurar tus módulos de ingresos, gastos y presupuestos.
          </p>
        </div>
      </section>
    </main>
  );
}
