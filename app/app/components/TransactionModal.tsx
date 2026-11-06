'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Account, Category, SavingsGoal } from '@/types/database';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionModal({ isOpen, onClose, onSuccess }: TransactionModalProps) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [savingsGoalId, setSavingsGoalId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  async function loadFormData() {
    setError(null);
    const [accRes, catRes, goalRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true),
      supabase.from('categories').select('*'),
      supabase.from('savings_goals').select('*').eq('is_completed', false)
    ]);

    if (accRes.data) {
      setAccounts(accRes.data);
      if (accRes.data.length > 0) setAccountId(accRes.data[0].id);
    }
    if (catRes.data) setCategories(catRes.data);
    if (goalRes.data) setSavingsGoals(goalRes.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (!accountId) {
      setError('Debes seleccionar una cuenta de origen.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        user_id: user?.id || null,
        account_id: accountId,
        category_id: type !== 'TRANSFER' && categoryId ? categoryId : null,
        savings_goal_id: type === 'TRANSFER' && savingsGoalId ? savingsGoalId : null,
        amount: parseFloat(amount),
        type: type,
        description: description || null,
        transaction_date: date
      };

      const { error: insertError } = await supabase
        .from('transactions')
        .insert([payload]);

      if (insertError) throw insertError;

      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el movimiento.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Registrar Movimiento</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'INCOME' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'TRANSFER' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ahorro / Transf.
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto (S/)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cuenta de Origen</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              {accounts.length === 0 ? (
                <option value="">No hay cuentas activas en Supabase</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (S/ {Number(acc.current_balance).toFixed(2)})
                  </option>
                ))
              )}
            </select>
          </div>

          {type === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Meta de Ahorro Destino</label>
              <select
                value={savingsGoalId}
                onChange={(e) => setSavingsGoalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Seleccionar Meta de Ahorro --</option>
                {savingsGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name} (Meta: S/ {Number(goal.target_amount).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {type !== 'TRANSFER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Sin Categoría --</option>
                {categories
                  .filter((c) => c.type === type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción / Detalle</label>
            <input
              type="text"
              placeholder="Ej. Recarga Corredor Rojo, Pago quincena..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

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
              {loading ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
