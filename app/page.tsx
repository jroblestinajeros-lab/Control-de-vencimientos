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

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop
