'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Transaction, SavingsGoal, Account } from '@/types/database';
import TransactionModal from './components/TransactionModal';
import SavingsGoalModal from './components/SavingsGoalModal';

export default function DashboardFinanzas() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  // Modales
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Totales
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    checkSessionAndFetchData();
  }, []);

  async function checkSessionAndFetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUser(user);
    await fetchDashboardData();
  }

  async function fetchDashboardData() {
    // 1. Obtener Cuentas del usuario
    const { data: accData } = await supabase.from('accounts').select('*');
    if (accData) {
      setAccounts(accData);
      const balanceSum = accData.reduce((acc, curr) => acc + Number(curr.current_balance), 0);
      setTotalBalance(balanceSum);
    }

    // 2. Obtener Metas de Ahorro del usuario
    const { data: goalsData } = await supabase.from('savings_goals').select('*');
    if (goalsData) {
      setSavingsGoals(goalsData);
      const savingsSum = goalsData.reduce((acc, curr) => acc + Number(curr.current_amount), 0);
      setTotalSavings(savingsSum);
    }

    // 3. Obtener Transacciones Recientes del usuario
    const { data: transData } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(10);
      
    if (transData) {
      setTransactions(transData);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let inc = 0;
      let exp = 0;

      transData.forEach((t) => {
        const tDate = new Date(t.transaction_date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
          if (t.type === 'INCOME') inc += Number(t.amount);
          if (t.type === 'EXPENSE') exp += Number(t.amount);
        }
      });

      setMonthlyIncome(inc);
      setMonthlyExpense(exp);
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm font-medium">
        Cargando finanzas...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Gestión Financiera & Ahorro</h1>
            <p className="text-slate-400 text-sm mt-1">
              Control de presupuestos, flujo de caja y metas personales.
              {currentUser?.email && <span className="text-emerald-400 ml-2">({currentUser.email})</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsTransactionModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 text-sm"
            >
              <span>+ Registrar Movimiento</span>
            </button>
            <button
              onClick={handleSignOut}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balance Total</span>
            <div className="text-2xl font-bold text-white mt-2">S/ {totalBalance.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Suma de todas tus cuentas</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Ingresos del Mes</span>
            <div className="text-2xl font-bold text-emerald-400 mt-2">+ S/ {monthlyIncome.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Mes actual</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Gastos del Mes</span>
            <div className="text-2xl font-bold text-rose-400 mt-2">- S/ {monthlyExpense.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Mes actual</p>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Ahorro Acumulado</span>
            <div className="text-2xl font-bold text-blue-400 mt-2">S/ {totalSavings.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">En metas activas</p>
          </div>
        </div>

        {/* METAS DE AHORRO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Metas de Ahorro Disciplinado</h2>
            <button 
              onClick={() => setIsGoalModalOpen(true)}
              className="text-xs text-emerald-400 hover:underline cursor-pointer font-medium"
            >
              + Nueva Meta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {savingsGoals.length === 0 ? (
              <div className="col-span-3 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500">
                No tienes metas de ahorro configuradas. ¡Haz clic en "+ Nueva Meta" para comenzar!
              </div>
            ) : (
              savingsGoals.map((goal) => {
                const percent = Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100);
                return (
                  <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-200">{goal.name}</h3>
                      <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                        {percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
                      <span>S/ {Number(goal.current_amount).toFixed(2)}</span>
                      <span>Meta: S/ {Number(goal.target_amount).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ÚLTIMOS MOVIMIENTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Últimos Movimientos</h2>
            <span className="text-xs text-slate-500">Mostrando las 10 últimas transacciones</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Descripción</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No hay transacciones registradas aún.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{t.transaction_date}</td>
                      <td className="px-6 py-4 font-medium text-white">{t.description || 'Sin descripción'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          t.type === 'INCOME' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          t.type === 'EXPENSE' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                          'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {t.type === 'INCOME' ? 'Ingreso' : t.type === 'EXPENSE' ? 'Gasto' : 'Ahorro/Transf.'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-bold ${
                        t.type === 'INCOME' ? 'text-emerald-400' : t.type === 'EXPENSE' ? 'text-rose-400' : 'text-blue-400'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '-'} S/ {Number(t.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALES */}
        <TransactionModal 
          isOpen={isTransactionModalOpen} 
          onClose={() => setIsTransactionModalOpen(false)} 
          onSuccess={fetchDashboardData} 
        />

        <SavingsGoalModal 
          isOpen={isGoalModalOpen} 
          onClose={() => setIsGoalModalOpen(false)} 
          onSuccess={fetchDashboardData} 
        />

      </div>
    </div>
  );
}
