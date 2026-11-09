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
    document.title = "Finanzas Personales | Control Presupuestario";

    const sessionData = localStorage.getItem('user_session');
    const isLoggedCookie = document.cookie.includes('user_logged_in');

    if (!sessionData && !isLoggedCookie) {
      router.push('/login');
      return;
    }

    let currentEmail = 'jroblestinajeros@gmail.com';
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        currentEmail = parsed?.user?.email || 'jroblestinajeros@gmail.com';
      } catch (e) {
        currentEmail = 'jroblestinajeros@gmail.com';
      }
    }
    setUserEmail(currentEmail);

    const txKey = `fin_transactions_${currentEmail}`;
    const goalsKey = `fin_goals_${currentEmail}`;
    const percentKey = `fin_savings_percent_${currentEmail}`;
    const currencyKey = `fin_currency_${currentEmail}`;

    const savedTx = localStorage.getItem(txKey);
    const savedGoals = localStorage.getItem(goalsKey);
    const savedSavingsPercent = localStorage.getItem(percentKey);
    const savedCurrency = localStorage.getItem(currencyKey) as CurrencyCode;

    if (savedSavingsPercent !== null && !isNaN(Number(savedSavingsPercent))) {
      setSavingsTargetPercent(Number(savedSavingsPercent));
    } else {
      setSavingsTargetPercent(20);
      localStorage.setItem(percentKey, '20');
    }

    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setCurrency(savedCurrency);
    }

    // SI NO ES EL USUARIO PRINCIPAL, FORZAMOS QUE ARRANQUE VACÍO (IGNORANDO CUALQUIER CACHÉ ANTERIOR)
    if (currentEmail === 'jroblestinajeros@gmail.com') {
      if (savedTx) {
        try {
          setTransactions(JSON.parse(savedTx));
        } catch (e) {
          setTransactions([]);
        }
      } else {
        const defaultTransactions: Transaction[] = [
          {
            id: '1731100001',
            description: 'Sueldo Principal',
            amount: 2500,
            type: 'income',
            category: 'Sueldo / Salario Principal',
            date: '09/11/2026',
            month: '2026-11',
          },
          {
            id: '1731100002',
            description: 'menu',
            amount: 350,
            type: 'expense',
            nature: 'fixed',
            category: 'Alimentación / Supermercado',
            date: '09/11/2026',
            month: '2026-11',
          },
          {
            id: '1731100003',
            description: 'pasaje',
            amount: 150,
            type: 'expense',
            nature: 'fixed',
            category: 'Transporte / Combustible / Pasajes',
            date: '09/11/2026',
            month: '2026-11',
          },
          {
            id: '1731100004',
            description: 'celular y disney',
            amount: 130,
            type: 'expense',
            nature: 'fixed',
            category: 'Servicios (Luz, Agua, Internet, Celular)',
            date: '09/11/2026',
            month: '2026-11',
          },
          {
            id: '1731100005',
            description: 'deuda banco',
            amount: 300,
            type: 'expense',
            nature: 'fixed',
            category: 'Otros / Varios',
            date: '09/11/2026',
            month: '2026-11',
          },
          {
            id: '1731100006',
            description: 'deuda',
            amount: 1000,
            type: 'expense',
            nature: 'fixed',
            category: 'Otros / Varios',
            date: '09/11/2026',
            month: '2026-11',
          },
        ];
        setTransactions(defaultTransactions);
        localStorage.setItem(txKey, JSON.stringify(defaultTransactions));
      }
    } else {
      // Usuario nuevo o secundario: SIEMPRE limpio en 0
      setTransactions([]);
      localStorage.setItem(txKey, JSON.stringify([]));
    }

    if (currentEmail === 'jroblestinajeros@gmail.com') {
      if (savedGoals) {
        try {
          const parsedGoals = JSON.parse(savedGoals);
          if (Array.isArray(parsedGoals)) {
            setGoals(parsedGoals);
          }
        } catch (err) {
          setGoals([]);
        }
      } else {
        const defaultGoals: SavingsGoal[] = [
          { id: '1', title: 'Fondo de Emergencia Operativa', targetAmount: 10000, currentAmount: 3500 },
          { id: '2', title: 'Renovación de Equipos / ROV', targetAmount: 5000, currentAmount: 1200 },
        ];
        setGoals(defaultGoals);
        localStorage.setItem(goalsKey, JSON.stringify(defaultGoals));
      }
    } else {
      setGoals([]);
      localStorage.setItem(goalsKey, JSON.stringify([]));
    }

    setLoading(false);
  }, [router]);

  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    setCurrency(newCurr);
    localStorage.setItem(`fin_currency_${userEmail}`, newCurr);
  };

  const handleSavingsPercentChange = (newPercent: number) => {
    setSavingsTargetPercent(newPercent);
    localStorage.setItem(`fin_savings_percent_${userEmail}`, newPercent.toString());
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

  let runningCumulative = 0;
  const rawExpenses = EXPENSE_CATEGORIES.map((cat) => {
    const total = monthTransactions
      .filter((t) => t.type === 'expense' && t.category === cat)
      .reduce((acc, t) => acc + t.amount, 0);
    return { category: cat, amount: total };
  }).filter((item) => item.amount > 0);

  const expensesWithCumulative = rawExpenses.map((item) => {
    runningCumulative += item.amount;
    const categoryPct = availableExpenseBudget > 0 ? Math.round((item.amount / availableExpenseBudget) * 100) : 0;
    const shareOfTotal = totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0;
    return {
      ...item,
      categoryPct,
      shareOfTotal,
      cumulative: runningCumulative,
    };
  });

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
    localStorage.setItem(`fin_transactions_${userEmail}`, JSON.stringify(updated));
  };

  const handleDeleteGoal = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta meta de ahorro?')) return;
    const updatedGoals = goals.filter((g) => g.id !== id);
    setGoals(updatedGoals);
    localStorage.setItem(`fin_goals_${userEmail}`, JSON.stringify(updatedGoals));
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
      localStorage.setItem(`fin_goals_${userEmail}`, JSON.stringify(updatedGoals));
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

    let updated: Transaction[];
    if (editingTxId) {
      updated = transactions.map((t) => {
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
      updated = [newTx, ...transactions];
    }

    setTransactions(updated);
    localStorage.setItem(`fin_transactions_${userEmail}`, JSON.stringify(updated));
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

    const categoryReport = expensesWithCumulative.map((item) => ({
      'Categoría de Gasto': item.category,
      [`Monto (${currSymbol})`]: item.amount,
      '% Presupuesto': `${item.categoryPct}%`,
      '% Gasto Total': `${item.shareOfTotal}%`,
      [`Acumulado (${currSymbol})`]: item.cumulative,
    }));

    const txData = monthTransactions.map((t) => {
      const txPct = availableExpenseBudget > 0 && t.type === 'expense' 
        ? `${Math.round((t.amount / availableExpenseBudget) * 100)}%` 
        : '-';
      return {
        Fecha: t.date,
        Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
        Naturaleza: t.nature === 'fixed' ? 'Fijo (Obligatorio)' : t.nature === 'variable' ? 'Variable' : '-',
        Descripción: t.description,
        Categoría: t.category,
        [`Monto (${currSymbol})`]: t.amount,
        '% Presupuesto Mensual': txPct,
      };
    });

    const goalsData = goals.map((g) => ({
      'Meta / Objetivo': g.title,
      [`Monto Actual (${currSymbol})`]: g.currentAmount,
      [`Monto Meta (${currSymbol})`]: g.targetAmount,
      '% Avance': `${Math.round((g.currentAmount / g.targetAmount) * 100)}%`,
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsCat = XLSX.utils.json_to_sheet(categoryReport);
    const wsTx = XLSX.utils.json_to_sheet(txData);
    const wsGoals = XLSX.utils.json_to_sheet(goalsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');
    XLSX.utils.book_append_sheet(wb, wsCat, 'Gastos por Categoría');
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transacciones con %');
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
    <main 
      className="min-h-screen text-slate-100 p-6"
      style={{ 
        backgroundColor: '#130826', 
        backgroundImage: 'linear-gradient(135deg, #130826 0%, #1e1b4b 50%, #0f172a 100%)' 
      }}
    >
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-purple-500/30 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-fuchsia-400 to-cyan-300 tracking-tight">
            Gestión de Finanzas Personales
          </h1>
          <p className="text-xs text-purple-200 mt-1">
            Usuario: <span className="text-teal-300 font-semibold">{userEmail}</span>
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="bg-indigo-950/90 border border-purple-500/50 text-amber-300 font-bold text-xs px-3 py-2 rounded-xl focus:outline-none shadow-xl"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code} style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>
                {info.label}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-indigo-950/90 border border-purple-500/50 text-white text-xs px-3 py-2 rounded-xl focus:outline-none font-mono shadow-xl"
          />

          <button
            onClick={exportToExcel}
            className="bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-teal-950/60"
          >
            <span>📊 Exportar Excel</span>
          </button>

          <button
            onClick={handleSignOut}
            className="bg-indigo-950/90 hover:bg-indigo-900 border border-purple-500/50 text-purple-200 text-xs px-3 py-2 rounded-xl transition-colors shadow-xl"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div 
            className="p-6 rounded-3xl shadow-2xl border transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-black text-cyan-300 font-mono tracking-tight">{currSymbol} {totalIncome.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Ingreso variable registrado</p>
          </div>

          <div 
            className="p-6 rounded-3xl shadow-2xl border border-t-4 border-t-fuchsia-400 transition-all space-y-2"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider">Meta Ahorro</h3>
              <select
                value={savingsTargetPercent}
                onChange={(e) => handleSavingsPercentChange(Number(e.target.value))}
                className="bg-indigo-950 border border-purple-500 text-fuchsia-300 text-xs font-bold rounded-lg px-2 py-0.5 focus:outline-none"
              >
                {Array.from({ length: 18 }, (_, i) => (i + 2) * 5)
                  .concat(95)
                  .map((pct) => (
                    <option key={pct} value={pct} style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>
                      {pct}%
                    </option>
                  ))}
              </select>
            </div>
            <p className="text-3xl font-black text-fuchsia-300 font-mono tracking-tight">{currSymbol} {plannedSavings.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70">Cuota reservada</p>
          </div>

          <div 
            className="p-6 rounded-3xl shadow-2xl border border-t-4 border-t-teal-400 transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h3 className="text-xs font-semibold text-teal-300 uppercase tracking-wider mb-2">Presupuesto Gastos</h3>
            <p className="text-3xl font-black text-teal-300 font-mono tracking-tight">{currSymbol} {availableExpenseBudget.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Límite permitido en el mes</p>
          </div>

          <div 
            className="p-6 rounded-3xl shadow-2xl border transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h3 className="text-xs font-semibold text-rose-300 uppercase tracking-wider mb-2">Gastos Ejecutados</h3>
            <p className="text-3xl font-black text-rose-400 font-mono tracking-tight">{currSymbol} {totalExpense.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Saldo: {currSymbol} {budgetRemaining.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="p-6 rounded-3xl shadow-2xl border flex flex-col justify-between transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Gastos Fijos (Obligatorios)</h4>
            <p className="text-2xl font-bold text-amber-400 font-mono">{currSymbol} {fixedExpenses.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Alquiler, mantenimiento, servicios básicos</p>
          </div>

          <div 
            className="p-6 rounded-3xl shadow-2xl border flex flex-col justify-between transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h4 className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider mb-2">Gastos Variables</h4>
            <p className="text-2xl font-bold text-fuchsia-200 font-mono">{currSymbol} {variableExpenses.toFixed(2)}</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Salidas, entretenimientos y extras</p>
          </div>

          <div 
            className="p-6 rounded-3xl shadow-2xl border flex flex-col justify-between transition-all"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Salud Financiera (Fondo)</h4>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{emergencyCoverageMonths} meses</p>
            <p className="text-[11px] text-purple-300/70 mt-1">Cobertura de tus gastos fijos acumulados</p>
          </div>
        </div>

        {/* MATRIZ SUPERIOR CON ACUMULADO */}
        <div 
          className="rounded-3xl p-6 shadow-2xl border space-y-4"
          style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex justify-between items-center text-sm pb-2 border-b border-purple-500/30">
            <span className="font-bold text-white uppercase tracking-wider">
              Matriz de Gastos por Categoría y Acumulado ({selectedMonth})
            </span>
            <span className="font-mono text-teal-300 font-bold">
              {budgetPercentage}% consumido del presupuesto
            </span>
          </div>

          {expensesWithCumulative.length === 0 ? (
            <p className="text-xs text-purple-300/60 py-2">No hay gastos ejecutados en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Categoría</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">% Presupuesto</th>
                    <th className="px-4 py-3 text-right">% Gasto Total</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {expensesWithCumulative.map((item) => (
                    <tr key={item.category} className="hover:bg-indigo-900/30">
                      <td className="px-4 py-3 text-white font-medium">{item.category}</td>
                      <td className="px-4 py-3 text-right text-rose-400 font-bold">{currSymbol} {item.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-fuchsia-300">{item.categoryPct}%</td>
                      <td className="px-4 py-3 text-right text-teal-300">{item.shareOfTotal}%</td>
                      <td className="px-4 py-3 text-right text-cyan-300 font-bold">{currSymbol} {item.cumulative.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-indigo-950/60 border-t border-purple-500/40 font-mono text-xs">
                  <tr>
                    <td className="px-4 py-3 font-bold text-white uppercase">Total Ejecutado:</td>
                    <td className="px-4 py-3 text-right font-black text-rose-400 text-sm">{currSymbol} {totalExpense.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-fuchsia-300">{budgetPercentage}%</td>
                    <td className="px-4 py-3 text-right font-bold text-teal-300">100%</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-300 text-sm">{currSymbol} {totalExpense.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div 
          className="rounded-3xl p-6 shadow-2xl border"
          style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
        >
          <h2 className="text-sm font-semibold text-purple-200 uppercase tracking-wider mb-4">Acciones Rápidas ({selectedMonth})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleOpenModal('income')}
              className="bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-2xl text-sm transition-all shadow-xl shadow-teal-950/80 flex items-center justify-center space-x-2"
            >
              <span>+ Registrar Ingreso Variable</span>
            </button>

            <button
              onClick={() => handleOpenModal('expense')}
              className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold py-3 px-4 rounded-2xl text-sm transition-all shadow-xl shadow-rose-950/80 flex items-center justify-center space-x-2"
            >
              <span>- Registrar Gasto</span>
            </button>

            <button
              onClick={() => handleOpenModal('goal')}
              className="bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-2xl text-sm transition-all shadow-xl shadow-cyan-950/80 flex items-center justify-center space-x-2"
            >
              <span>🎯 Crear Meta de Ahorro</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div 
            className="lg:col-span-1 rounded-3xl p-6 shadow-2xl border space-y-4"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Metas & Proyección</h2>
              <button
                onClick={() => handleOpenModal('goal')}
                className="text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-colors shadow-md"
              >
                + Nueva
              </button>
            </div>

            <div className="space-y-4">
              {goals.length === 0 ? (
                <p className="text-xs text-purple-300/60 py-4 text-center">No hay metas creadas. Haz clic en "+ Nueva" para agregar una.</p>
              ) : (
                goals.map((g) => {
                  const pct = Math.min(Math.round((g.currentAmount / (g.targetAmount || 1)) * 100), 100);
                  const remainingToGoal = Math.max(0, g.targetAmount - g.currentAmount);
                  const monthsToTarget = plannedSavings > 0 
                    ? Math.ceil(remainingToGoal / plannedSavings)
                    : 0;

                  return (
                    <div key={g.id} className="bg-indigo-950/60 border border-purple-500/30 p-4 rounded-2xl space-y-2 relative group">
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        title="Eliminar Meta"
                        className="absolute top-3 right-3 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        🗑️
                      </button>

                      <div className="flex justify-between items-center pr-8">
                        <h3 className="font-semibold text-white text-xs">{g.title}</h3>
                        <span className="text-[10px] font-mono bg-indigo-900 text-cyan-300 px-2 py-0.5 rounded-lg border border-purple-500/30">
                          {pct}%
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-purple-200 font-mono">
                        <span>{currSymbol} {g.currentAmount.toFixed(2)}</span>
                        <span>{currSymbol} {g.targetAmount.toFixed(2)}</span>
                      </div>

                      <div className="w-full bg-indigo-950 h-2 rounded-full overflow-hidden border border-purple-500/30">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 h-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <p className="text-[10px] text-purple-300/70 font-mono pt-1">
                        {monthsToTarget > 0 
                          ? `⏱ Tiempo est. para completar: ~${monthsToTarget} mes(es)`
                          : '🎉 Meta alcanzada o lista'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div 
            className="lg:col-span-2 rounded-3xl p-6 shadow-2xl border space-y-4"
            style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
          >
            <h2 className="text-lg font-semibold text-white">Comparativa y Tendencia Mes a Mes</h2>
            {monthlyHistory.length === 0 ? (
              <p className="text-sm text-purple-300/60 py-6 text-center">Registra ingresos y gastos para generar la tendencia histórica.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/60 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Mes</th>
                      <th className="px-4 py-3 text-right">Ingresos</th>
                      <th className="px-4 py-3 text-right">Gastos</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Ahorro Reservado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono">
                    {monthlyHistory.map((h) => (
                      <tr key={h.month} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-xs text-white font-medium">{h.month}</td>
                        <td className="px-4 py-3 text-right text-cyan-300">{currSymbol} {h.income.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-rose-400">{currSymbol} {h.expense.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-fuchsia-400">{currSymbol} {h.savings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* TABLA DE TRANSACCIONES CON EL % DEL PRESUPUESTO INCLUIDO */}
        <div 
          className="rounded-3xl p-6 shadow-2xl border space-y-4"
          style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)', backdropFilter: 'blur(16px)' }}
        >
          <h2 className="text-lg font-semibold text-white">Transacciones e Impacto en Presupuesto ({selectedMonth})</h2>
          {monthTransactions.length === 0 ? (
            <p className="text-sm text-purple-300/60 py-6 text-center">No hay registros para este mes. Registra tus ingresos o gastos arriba.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/60 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Fecha</th>
                    <th className="px-4 py-3">Tipo / Naturaleza</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">% Presupuesto</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {monthTransactions.map((t) => {
                    const txPct = availableExpenseBudget > 0 && t.type === 'expense' 
                      ? Math.round((t.amount / availableExpenseBudget) * 100) 
                      : 0;

                    return (
                      <tr key={t.id} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-purple-300">{t.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${
                            t.type === 'income' 
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-300' 
                              : t.nature === 'fixed'
                              ? 'bg-amber-950 border-amber-400 text-amber-300'
                              : 'bg-indigo-900 border-indigo-400 text-indigo-200'
                          }`}>
                            {t.type === 'income' ? 'Ingreso' : t.nature === 'fixed' ? 'Gasto Fijo' : 'Gasto Variable'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-white font-sans">{t.description}</td>
                        <td className="px-4 py-3 text-purple-300 font-sans">{t.category}</td>
                        <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-cyan-300' : 'text-rose-400'}`}>
                          {t.type === 'income' ? '+' : '-'} {currSymbol} {t.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-fuchsia-300 font-bold">
                          {t.type === 'expense' ? `${txPct}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button
                            onClick={() => handleEditTransaction(t)}
                            title="Editar Registro"
                            className="text-xs bg-indigo-900 hover:bg-indigo-800 border border-indigo-400 text-indigo-200 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Eliminar Registro"
                            className="text-xs bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4 z-50">
          <div 
            className="border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: '#1e1b4b', borderColor: 'rgba(217, 70, 239, 0.4)' }}
          >
            <h3 className="text-lg font-bold text-white capitalize">
              {modalType === 'goal'
                ? 'Crear Meta de Ahorro'
                : editingTxId
                ? `Editar ${modalType === 'income' ? 'Ingreso' : 'Gasto'}`
                : `Registrar ${modalType === 'income' ? 'Ingreso Variable' : 'Gasto'}`}
            </h3>

            {budgetError && (
              <div className="p-3 bg-rose-950 border border-rose-600 text-rose-300 rounded-xl text-xs font-medium">
                {budgetError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {modalType === 'goal' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Nombre de la Meta</label>
                    <input
                      type="text"
                      placeholder="Ej. Viaje, Fondo de Emergencia"
                      value={goalTitle}
                      onChange={(e) => setGoalTitle(e.target.value)}
                      required
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Monto Objetivo ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="10000.00"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      required
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Ahorro Inicial ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Descripción</label>
                    <input
                      type="text"
                      placeholder="Ej. Alquiler, Consultoría, Supermercado"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
                    />
                  </div>

                  {modalType === 'expense' && (
                    <div>
                      <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Naturaleza del Gasto</label>
                      <select
                        value={expenseNature}
                        onChange={(e) => setExpenseNature(e.target.value as 'fixed' | 'variable')}
                        className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
                      >
                        <option value="variable">Variable (Discrecional / Opcional)</option>
                        <option value="fixed">Fijo (Obligatorio / Inflexible)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Monto ({currSymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-purple-200 uppercase mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-300 text-sm"
                    >
                      {(modalType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                        <option key={cat} value={cat} style={{ backgroundColor: '#1e1b4b', color: '#fff' }}>
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
                  className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-colors shadow-lg"
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
