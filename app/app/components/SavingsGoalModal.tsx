'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SavingsGoalModal({ isOpen, onClose, onSuccess }: SavingsGoalModalProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ingresa un nombre para la meta.');
      return;
    }
    if (!targetAmount || Number(targetAmount) <= 0) {
      setError('El monto objetivo debe ser mayor a 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        user_id: user?.id || null,
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        current_amount: initialAmount ? parseFloat(initialAmount) : 0,
        target_date: targetDate || null,
        is_completed: false
      };

      const { error: insertError } = await supabase
        .from('savings_goals')
        .insert([payload]);

      if (insertError) throw insertError;

      // Limpiar formulario y refrescar
      setName('');
      setTargetAmount('');
      setInitialAmount('');
      setTargetDate('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la meta de ahorro.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="text-lg font-bold text-white">Nueva Meta de Ahorro</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Nombre de la Meta */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre de la Meta</label>
            <input
              type="text"
              placeholder="Ej. Fondo de Emergencia, Viaje, Máster..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Monto Objetivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto Objetivo (S/)</label>
            <input
              type="number"
              step="0.01"
              placeholder="10000.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Monto Inicial y Fecha Límite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ahorro Inicial (Opcional)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fecha Límite (Opcional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20"
            >
              {loading ? 'Creando...' : 'Crear Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
