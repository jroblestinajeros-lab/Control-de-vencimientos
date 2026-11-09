'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSignUp ? 'signup' : 'signin',
          email,
          password,
          fullName,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error en la autenticación');
      }

      if (isSignUp) {
        setMessage('Cuenta creada con éxito. Ya puedes iniciar sesión.');
        setIsSignUp(false);
      } else {
        // EXTRACCIÓN Y BLINDAJE DEL CORREO REAL DEVUELTO POR LA API O EL FORMULARIO
        const authenticatedEmail = data.session?.user?.email || data.user?.email || email;
        const sessionPayload = {
          user: { email: authenticatedEmail },
          ...data.session
        };

        // Guardamos la sesión localmente asegurando el correo exacto
        localStorage.setItem('user_session', JSON.stringify(sessionPayload));
        document.cookie = `user_logged_in=true; path=/; max-age=86400`;
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Error durante la autenticación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        backgroundColor: '#130826', 
        backgroundImage: 'linear-gradient(135deg, #130826 0%, #1e1b4b 50%, #0f172a 100%)' 
      }}
    >
      <div 
        className="border rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6"
        style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-fuchsia-400 to-cyan-300 tracking-tight">
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h1>
          <p className="text-xs text-purple-200">
            Control de Finanzas Personales & Ahorro Disciplinado
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-teal-950/80 border border-teal-800 text-teal-300 rounded-xl text-sm text-center font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej. Jorge Robles"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-teal-950/60 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-purple-500/30">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-xs text-teal-300 hover:underline font-semibold"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}
