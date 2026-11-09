'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  nature?: 'fixed' | 'variable';
  category: string;
  date: string;
  month: string;
}

interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
}

type CurrencyCode = 'PEN' | 'USD' | 'EUR';

const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string }> = {
  PEN: { symbol: 'S/', label: 'Soles (S/)' },
  USD: { symbol: '$', label: 'Dólares ($)' },
  EUR: { symbol: '€', label: 'Euros (€)' },
};

const EXPENSE_CATEGORIES = [
  'Vivienda / Alquiler / Mantenimiento',
  'Alimentación / Supermercado',
  'Servicios (Luz, Agua, Internet, Celular)',
  'Transporte / Combustible / Pasajes',
  'Salud / Medicinas / Seguros',
  'Educación / Cursos',
  'Entretenimiento / Salidas / Suscripciones',
  'Compras / Ropa / Tecnología',
  'Ahorro / Inversión Directa',
  'Otros / Varios',
];

const INCOME_CATEGORIES = [
  'Sueldo / Salario Principal',
  'Consultorías / Servicios Profesionales',
  'Inversiones / Rendimientos',
  'Ventas / Negocio Personal',
  'Otros Ingresos Variables',
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  const [currency, setCurrency] = useState<CurrencyCode>('PEN');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsTargetPercent, setSavingsTargetPercent] = useState<number>(20);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'goal'>('income');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseNature, setExpenseNature] = useState<'fixed' | 'variable'>('variable');
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');

  const currSymbol = CURRENCIES[currency].symbol;

  useEffect(() => {
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

    const savedTx = localStorage.getItem('fin_transactions');
    const savedGoals = localStorage.getItem('fin_goals');
    const savedSavingsPercent = localStorage.getItem('fin_savings_percent');
    const savedCurrency = localStorage.getItem('fin_currency') as CurrencyCode;

    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedSavingsPercent) setSavingsTargetPercent(Number(savedSavingsPercent));
    if (savedCurrency && CURRENCIES[savedCurrency]) setCurrency(savedCurrency);

    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      setGoals([
        { id: '1', title: 'Fondo de Emergencia', targetAmount: 10000, currentAmount: 3500 },
        { id: '2', title: 'Renovación de Equipos', targetAmount: 5000, currentAmount: 1200 },
      ]);
    }

    setLoading(false);
  }, [router]);

  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    setCurrency(newCurr);
    localStorage.setItem('fin_currency', newCurr);
  };

  const handleSavingsPercentChange = (newPercent: number) => {
    setSavingsTargetPercent(newPercent);
    localStorage.setItem('fin_savings_percent', newPercent.toString());
  };

  const monthTransactions = transactions.filter((t) => {
    const tMonth = t.month || (t.date ? t.date.split('/').reverse().join('-').slice(0, 7) : '');
    return tMonth === selectedMonth || t.month === selectedMonth;
  });

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const fixedExpenses = monthTransactions
    .filter((t) => t.type === 'expense' && t.nature === 'fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  const variableExpenses = monthTransactions
    .filter((t) => t.type === 'expense' && t.nature === 'variable')
    .reduce((acc, t) => acc + t.amount, 0);

  const plannedSavings = (totalIncome * savingsTargetPercent) / 100;
  const availableExpenseBudget = Math.max(0, totalIncome - plannedSavings);
  const budgetRemaining = availableExpenseBudget - totalExpense;

  const budgetPercentage = availableExpenseBudget > 0 
    ? Math.min(Math.round((totalExpense / availableExpenseBudget) * 100), 100)
    : 0;

  const totalSavedAllGoals = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const fixedExpenseMonthlyAvg = fixedExpenses || (totalExpense * 0.5) || 1;
  const emergencyCoverageMonths = (totalSavedAllGoals / fixedExpenseMonthlyAvg).toFixed(1);

  const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => {
    const total = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === cat)
      .reduce((acc, t) => acc + t.amount, 0);
    return { category: cat, amount: total };
  }).filter((item) => item.amount > 0);

  const availableMonths = Array.from(
    new Set(transactions.map((t) => t.month || selectedMonth))
  ).sort().reverse().slice(0, 4);

  const monthlyHistory = availableMonths.map((m) => {
    const mTx = transactions.filter((t) => t.month === m);
    const inc = mTx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const exp = mTx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const sav = (inc * savingsTargetPercent) / 100;
    return { month: m, income: inc, expense: exp, savings: sav };
  });

  const handleOpenModal = (type: 'income' | 'expense' | 'goal') => {
    setModalType(type);
    setEditingTxId(null);
    setDescription('');
    setAmount('');
    setExpenseNature('variable');
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setBudgetError(null);
    setShowModal(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setModalType(tx.type);
    setEditingTxId(tx.id);
    setDescription(tx.description);
    setAmount(tx.amount.toString());
    setExpenseNature(tx.nature || 'variable');
    setCategory(tx.category);
    setBudgetError(null);
    setShowModal(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetError(null);

    if (modalType === 'goal') {
      const targetVal = parseFloat(goalTarget);
      const currentVal = parseFloat(goalCurrent) || 0;
      if (isNaN(targetVal) || targetVal <= 0) return;

      const newGoal: SavingsGoal = {
        id: Date.now().toString(),
        title: goalTitle || 'Nueva Meta',
        targetAmount: targetVal,
        currentAmount: currentVal,
      };

      const updatedGoals = [...goals, newGoal];
      setGoals(updatedGoals);
      localStorage.setItem('fin_goals', JSON.stringify(updatedGoals));
      setShowModal(false);
      return;
    }

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if (modalType === 'expense') {
      const currentTxAmount = editingTxId 
        ? transactions.find(t => t.id === editingTxId)?.amount || 0 
        : 0;
      const adjustedRemaining = budgetRemaining + currentTxAmount;

      if (availableExpenseBudget > 0 && val > adjustedRemaining) {
        setBudgetError(
          `¡Atención! Este gasto (${currSymbol} ${val.toFixed(2)}) supera el presupuesto disponible para gastos (${currSymbol} ${adjustedRemaining.toFixed(2)}). Preserva tu cuota de ahorro del ${savingsTargetPercent}%.`
        );
        return;
      }
    }

    if (editingTxId) {
      const updated = transactions.map((t) => {
        if (t.id === editingTxId) {
          return {
            ...t,
            description: description || t.description,
            amount: val,
            nature: modalType === 'expense' ? expenseNature : undefined,
            category,
          };
        }
        return t;
      });
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
    } else {
      const newTx: Transaction = {
        id: Date.now().toString(),
        description: description || (modalType === 'income' ? 'Ingreso Variable' : 'Gasto'),
        amount: val,
        type: modalType,
        nature: modalType === 'expense' ? expenseNature : undefined,
        category,
        date: new Date().toLocaleDateString('es-PE'),
        month: selectedMonth,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
    }

    setShowModal(false);
  };

  const exportToExcel = () => {
    const summaryData = [
      { Concepto: 'Moneda Seleccionada', Valor: `${currency} (${currSymbol})` },
      { Concepto: 'Mes Seleccionado', Valor: selectedMonth },
      { Concepto: `Ingresos Totales (${currSymbol})`, Valor: totalIncome },
      { Concepto: `Ahorro Reservado (${savingsTargetPercent}%) (${currSymbol})`, Valor: plannedSavings },
      { Concepto: `Presupuesto Límite para Gastos (${currSymbol})`, Valor: availableExpenseBudget },
      { Concepto: `Gastos Fijos (${currSymbol})`, Valor: fixedExpenses },
      { Concepto: `Gastos Variables (${currSymbol})`, Valor: variableExpenses },
      { Concepto: `Gastos Ejecutados Totales (${currSymbol})`, Valor: totalExpense },
      { Concepto: `Saldo Restante para Gastos (${currSymbol})`, Valor: budgetRemaining },
    ];

    const txData = monthTransactions.map((t) => ({
      Fecha: t.date,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Naturaleza: t.nature === 'fixed' ? 'Fijo (Obligatorio)' : t.nature === 'variable' ? 'Variable' : '-',
      Descripción: t.description,
      Categoría: t.category,
      [`Monto (${currSymbol})`]: t.amount,
    }));

    const goalsData = goals.map((g) => ({
      'Meta / Objetivo': g.title,
      [`Monto Actual (${currSymbol})`]: g.currentAmount,
      [`Monto Meta (${currSymbol})`]: g.targetAmount,
      '% Avance': `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsTx = XLSX.utils.json_to_sheet(txData);
    const wsGoals = XLSX.utils.json_to_sheet(goalsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Mensual');
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transacciones');
    XLSX.utils.book_append_sheet(wb, wsGoals, 'Metas de Ahorro');

    XLSX.writeFile(wb, `Reporte_Finanzas_${currency}_${selectedMonth}.xlsx`);
  };

  function handleSignOut() {
    localStorage.removeItem('user_session');
    document.cookie = 'user_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    window.location.href = '/login';
  }

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100 p-6 relative overflow-hidden">
      
      {/* Destellos de luz ambientales difusos de fondo estilo Aurora */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800/80 mb-8 gap-4 relative z-10">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 tracking-tight">
            Control de Finanzas Personales
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Usuario: <span className="text-cyan-400 font-semibold">{userEmail}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 text-amber-400 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500 shadow-xl"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code} className="bg-slate-900 text-white">
                {info.label}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500 font-mono shadow-xl"
          />

          <button
            onClick={exportToExcel}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/50 flex items-center space-x-1.5"
          >
            <span>📊 Exportar Excel</span>
          </button>

          <button
            onClick={handleSignOut}
            className="bg-slate-900/80 backdrop-blur-xl hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl transition-colors shadow-xl"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl hover:border-cyan-500/50 transition-all group">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-black text-cyan-400 font-mono tracking-tight">{currSymbol} {totalIncome.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Ingreso variable registrado</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl border-t-2 border-t-purple-500 hover:border-purple-500/50 transition-all space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Meta Ahorro</h3>
              <select
                value={savingsTargetPercent}
                onChange={(e) => handleSavingsPercentChange(Number(e.target.value))}
                className="bg-slate-950/80 border border-slate-700 text-purple-300 text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-purple-500"
              >
                {Array.from({ length: 18 }, (_, i) => (i + 2) * 5)
                  .concat(95)
                  .map((pct) => (
                    <option key={pct} value={pct} className="bg-slate-900 text-white">
                      {pct}%
                    </option>
                  ))}
              </select>
            </div>
            <p className="text-3xl font-black text-purple-400 font-mono tracking-tight">{currSymbol} {plannedSavings.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">Cuota reservada</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl border-t-2 border-t-emerald-500 hover:border-emerald-500/50 transition-all">
            <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Presupuesto Gastos</h3>
            <p className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{currSymbol} {availableExpenseBudget.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Límite permitido en el mes</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl hover:border-rose-500/50 transition-all">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos Ejecutados</h3>
            <p className="text-3xl font-black text-rose-400 font-mono tracking-tight">{currSymbol} {totalExpense.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Saldo: {currSymbol} {budgetRemaining.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between hover:border-amber-500/40 transition-all">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos Fijos (Obligatorios)</h4>
            <p className="text-2xl font-bold text-amber-400 font-mono">{currSymbol} {fixedExpenses.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Alquiler, mantenimiento, servicios básicos</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between hover:border-indigo-500/40 transition-all">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos Variables</h4>
            <p className="text-2xl font-bold text-indigo-400 font-mono">{currSymbol} {variableExpenses.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Salidas, entretenimientos y extras</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Salud Financiera (Fondo)</h4>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{emergencyCoverageMonths} meses</p>
            <p className="text-[11px] text-slate-500 mt-1">Cobertura de tus gastos fijos acumulados</p>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300">
              Distribución de Gastos por Categoría ({selectedMonth})
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              {budgetPercentage}% consumido del presupuesto
            </span>
          </div>

          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No hay gastos ejecutados en este mes.</p>
          ) : (
            <div className="space-y-3">
              {expensesByCategory.map((item) => {
                const categoryPct = Math.round((item.amount / (availableExpenseBudget || 1)) * 100);
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.category}</span>
                      <span className="font-mono text-slate-400">
                        {currSymbol} {item.amount.toFixed(2)} ({categoryPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.min(categoryPct, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Acciones Rápidas ({selectedMonth})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleOpenModal('income')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-4 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2"
            >
              <span>+ Registrar Ingreso Variable</span>
            </button>

            <button
              onClick={() => handleOpenModal('expense')}
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold py-3 px-4 rounded-2xl text-sm transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center space-x-2"
            >
              <span>- Registrar Gasto</span>
            </button>

            <button
              onClick={() => handleOpenModal('goal')}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-2xl text-sm transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center space-x-2"
            >
              <span>🎯 Crear Meta de Ahorro</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Metas & Proyección</h2>
              <button
                onClick={() => handleOpenModal('goal')}
                className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl transition-colors font-medium shadow-md"
              >
                + Nueva
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((g) => {
                const pct = Math.min(Math.round((g.currentAmount / (g.targetAmount || 1)) * 100), 100);
                const remainingToGoal = Math.max(0, g.targetAmount - g.currentAmount);
                const monthsToTarget = plannedSavings > 0 
                  ? Math.ceil(remainingToGoal / plannedSavings)
                  : 0;

                return (
                  <div key={g.id} className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-white text-xs">{g.title}</h3>
                      <span className="text-[10px] font-mono bg-slate-900 text-cyan-400 px-2 py-0.5 rounded-lg border border-slate-800">
                        {pct}%
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{currSymbol} {g.currentAmount.toFixed(2)}</span>
                      <span>{currSymbol} {g.targetAmount.toFixed(2)}</span>
                    </div>

                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-mono pt-1">
                      {monthsToTarget > 0 
                        ? `⏱ Tiempo est. para completar: ~${monthsToTarget} mes(es)`
                        : '🎉 Meta alcanzada o lista'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-semibold text-white">Comparativa y Tendencia Mes a Mes</h2>
            {monthlyHistory.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Registra ingresos y gastos para generar la tendencia histórica.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Mes</th>
                      <th className="px-4 py-3 text-right">Ingresos</th>
                      <th className="px-4 py-3 text-right">Gastos</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Ahorro Reservado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {monthlyHistory.map((h) => (
                      <tr key={h.month} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-xs text-white font-medium">{h.month}</td>
                        <td className="px-4 py-3 text-right text-cyan-400">{currSymbol} {h.income.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-rose-400">{currSymbol} {h.expense.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-purple-400">{currSymbol} {h.savings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Transacciones ({selectedMonth})</h2>
          {monthTransactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No hay registros para este mes. Registra tus ingresos o gastos arriba.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Fecha</th>
                    <th className="px-4 py-3">Tipo / Naturaleza</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {monthTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-xs text-slate-400">{t.date}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${
                          t.type === 'income' 
                            ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300' 
                            : t.nature === 'fixed'
                            ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {t.type === 'income' ? 'Ingreso' : t.nature === 'fixed' ? 'Gasto Fijo' : 'Gasto Variable'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{t.category}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${t.type === 'income' ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'} {currSymbol} {t.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => handleEditTransaction(t)}
                          title="Editar Registro"
                          className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2 py-1 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          title="Eliminar Registro"
                          className="text-xs bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 px-2 py-1 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white capitalize">
              {modalType === 'goal'
                ? 'Crear Meta de Ahorro'
                : editingTxId
                ? `Editar ${modalType === 'income' ? 'Ingreso' : 'Gasto'}`
                : `Registrar ${modalType === 'income' ? 'Ingreso Variable' : 'Gasto'}`}
            </h3>

            {budgetError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-medium">
                {budgetError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {modalType === 'goal' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre de la Meta</label>
                    <input
                      type="text"
                      placeholder="Ej. Fondo de Emergencia, Vacaciones"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto Objetivo ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="10000.00"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Ahorro Inicial ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción</label>
                    <input
                      type="text"
                      placeholder="Ej. Alquiler, Consultoría, Supermercado"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>

                  {modalType === 'expense' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Naturaleza del Gasto</label>
                      <select
                        value={expenseNature}
                        onChange={(e) => setExpenseNature(e.target.value as 'fixed' | 'variable')}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                      >
                        <option value="variable">Variable (Discrecional / Opcional)</option>
                        <option value="fixed">Fijo (Obligatorio / Inflexible)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm"
                    >
                      {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal5 = false as any}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg"
                >
                  {editingTxId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
