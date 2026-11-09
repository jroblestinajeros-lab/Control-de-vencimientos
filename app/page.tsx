'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  month: string; // Formato YYYY-MM
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

  // Selector de Moneda y Mes Activo
  const [currency, setCurrency] = useState<CurrencyCode>('PEN');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savingsTargetPercent, setSavingsTargetPercent] = useState<number>(20);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'goal'>('income');

  // Formulario
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Formulario de Metas
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

  // Filtrado de transacciones por mes seleccionado
  const monthTransactions = transactions.filter(
    (t) => (t.month || t.date.slice(0, 7)) === selectedMonth
  );

  // Cálculos Variables por Mes
  const totalIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const plannedSavings = (totalIncome * savingsTargetPercent) / 100;
  const availableExpenseBudget = Math.max(0, totalIncome - plannedSavings);
  const budgetRemaining = availableExpenseBudget - totalExpense;

  const budgetPercentage = availableExpenseBudget > 0 
    ? Math.min(Math.round((totalExpense / availableExpenseBudget) * 100), 100)
    : 0;

  // Gastos agrupados por categoría para la barra visual
  const expensesByCategory = EXPENSE_CATEGORIES.map((cat) => {
    const total = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === cat)
      .reduce((acc, t) => acc + t.amount, 0);
    return { category: cat, amount: total };
  }).filter((item) => item.amount > 0);

  const handleOpenModal = (type: 'income' | 'expense' | 'goal') => {
    setModalType(type);
    setDescription('');
    setAmount('');
    setGoalTitle('');
    setGoalTarget('');
    setGoalCurrent('');
    setCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setBudgetError(null);
    setShowModal(true);
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
      if (availableExpenseBudget > 0 && val > budgetRemaining) {
        setBudgetError(
          `¡Atención! Este gasto (${currSymbol} ${val.toFixed(2)}) supera el presupuesto disponible para gastos (${currSymbol} ${budgetRemaining.toFixed(2)}). Preserva tu cuota de ahorro del ${savingsTargetPercent}%.`
        );
        return;
      }

      const newTx: Transaction = {
        id: Date.now().toString(),
        description: description || 'Gasto Variable',
        amount: val,
        type: 'expense',
        category,
        date: new Date().toLocaleDateString('es-PE'),
        month: selectedMonth,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
    } else {
      const newTx: Transaction = {
        id: Date.now().toString(),
        description: description || 'Ingreso Variable',
        amount: val,
        type: 'income',
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

  // Exportar reporte a Excel adaptando la moneda seleccionada
  const exportToExcel = () => {
    const summaryData = [
      { Concepto: 'Moneda Seleccionada', Valor: `${currency} (${currSymbol})` },
      { Concepto: 'Mes Seleccionado', Valor: selectedMonth },
      { Concepto: `Ingresos Totales (${currSymbol})`, Valor: totalIncome },
      { Concepto: `Ahorro Reservado (${savingsTargetPercent}%) (${currSymbol})`, Valor: plannedSavings },
      { Concepto: `Presupuesto Límite para Gastos (${currSymbol})`, Valor: availableExpenseBudget },
      { Concepto: `Gastos Ejecutados (${currSymbol})`, Valor: totalExpense },
      { Concepto: `Saldo Restante para Gastos (${currSymbol})`, Valor: budgetRemaining },
    ];

    const txData = monthTransactions.map((t) => ({
      Fecha: t.date,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
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
      {/* Encabezado Principal, Selector de Moneda y Mes */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Finanzas Personales</h1>
          <p className="text-xs text-slate-400">
            Usuario: <span className="text-emerald-400 font-medium">{userEmail}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Moneda */}
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {info.label}
              </option>
            ))}
          </select>

          {/* Selector de Mes */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
          />

          {/* Botón Exportar a Excel */}
          <button
            onClick={exportToExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40"
          >
            <span>📊 Exportar Excel</span>
          </button>

          <button
            onClick={handleSignOut}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-8">
        {/* Tarjetas de Resumen Principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-bold text-blue-400 font-mono">{currSymbol} {totalIncome.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">Ingreso variable registrado</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-purple-500 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Meta Ahorro</h3>
              <select
                value={savingsTargetPercent}
                onChange={(e) => handleSavingsPercentChange(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-purple-300 text-xs font-bold rounded px-2 py-0.5 focus:outline-none focus:border-purple-500"
              >
                {Array.from({ length: 18 }, (_, i) => (i + 2) * 5)
                  .concat(95)
                  .map((pct) => (
                    <option key={pct} value={pct}>
                      {pct}%
                    </option>
                  ))}
              </select>
            </div>
            <p className="text-3xl font-bold text-purple-400 font-mono">{currSymbol} {plannedSavings.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">Cuota intangible reservada</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Presupuesto Gastos</h3>
            <p className="text-3xl font-bold text-emerald-400 font-mono">{currSymbol} {availableExpenseBudget.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">Límite permitido en el mes</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos Ejecutados</h3>
            <p className="text-3xl font-bold text-rose-400 font-mono">{currSymbol} {totalExpense.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">Saldo disponible: {currSymbol} {budgetRemaining.toFixed(2)}</p>
          </div>
        </div>

        {/* Control de Gastos por Categorías (Barra Segmentada) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-300">
              Distribución de Gastos por Categoría ({selectedMonth})
            </span>
            <span className="font-mono text-slate-400">
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
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.min(categoryPct, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Acciones Rápidas ({selectedMonth})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleOpenModal('income')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2"
            >
              <span>+ Registrar Ingreso Variable</span>
            </button>

            <button
              onClick={() => handleOpenModal('expense')}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-rose-900/20 flex items-center justify-center space-x-2"
            >
              <span>- Registrar Gasto</span>
            </button>

            <button
              onClick={() => handleOpenModal('goal')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-2"
            >
              <span>🎯 Crear Meta de Ahorro</span>
            </button>
          </div>
        </div>

        {/* Metas & Historial */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Metas de Ahorro</h2>
              <button
                onClick={() => handleOpenModal('goal')}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors font-medium"
              >
                + Nueva
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((g) => {
                const pct = Math.min(Math.round((g.currentAmount / (g.targetAmount || 1)) * 100), 100);
                return (
                  <div key={g.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-white text-xs">{g.title}</h3>
                      <span className="text-[10px] font-mono bg-slate-900 text-blue-400 px-2 py-0.5 rounded border border-slate-800">
                        {pct}%
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{currSymbol} {g.currentAmount.toFixed(2)}</span>
                      <span>{currSymbol} {g.targetAmount.toFixed(2)}</span>
                    </div>

                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white">Transacciones ({selectedMonth})</h2>
            {monthTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No hay registros para este mes. Registra tus ingresos o gastos arriba.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Fecha</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right rounded-r-lg">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {monthTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-xs text-slate-400">{t.date}</td>
                        <td className="px-4 py-3 font-medium text-white">{t.description}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          <span className="bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                            {t.category}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'} {currSymbol} {t.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modales */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white capitalize">
              {modalType === 'goal'
                ? 'Crear Meta de Ahorro'
                : `Registrar ${modalType === 'income' ? 'Ingreso Variable' : 'Gasto'}`}
            </h3>

            {budgetError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-lg text-xs font-medium">
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción</label>
                    <input
                      type="text"
                      placeholder="Ej. Honorarios Noviembre, Consultoría, Supermercado"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
                    >
                      {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat}>
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
