'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  // Estado de finanzas
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(5000);
  
  // Modales
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'income' | 'expense' | 'budget'>('expense');

  // Formulario
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');

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

    // Cargar datos locales de prueba o persistidos
    const savedTx = localStorage.getItem('fin_transactions');
    const savedBudget = localStorage.getItem('fin_budget');
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedBudget) setMonthlyBudget(Number(savedBudget));

    setLoading(false);
  }, [router]);

  // Cálculos dinámicos
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const budgetRemaining = monthlyBudget - totalExpense;

  const handleOpenModal = (type: 'income' | 'expense' | 'budget') => {
    setModalType(type);
    setDescription('');
    setAmount('');
    setCategory(type === 'income' ? 'Sueldo/Ingreso' : 'Servicios/Varios');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if (modalType === 'budget') {
      setMonthlyBudget(val);
      localStorage.setItem('fin_budget', val.toString());
    } else {
      const newTx: Transaction = {
        id: Date.now().toString(),
        description: description || (modalType === 'income' ? 'Ingreso' : 'Gasto'),
        amount: val,
        type: modalType,
        category,
        date: new Date().toLocaleDateString('es-PE'),
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
    }

    setShowModal(false);
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
      {/* Encabezado */}
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

      <section className="max-w-7xl mx-auto space-y-8">
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Balance General</h3>
            <p className={`text-3xl font-bold font-mono ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              S/ {balance.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Ingresos del Mes</h3>
            <p className="text-3xl font-bold text-blue-400 font-mono">S/ {totalIncome.toFixed(2)}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gastos del Mes</h3>
            <p className="text-3xl font-bold text-rose-400 font-mono">S/ {totalExpense.toFixed(2)}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Presupuesto Disponible</h3>
            <p className={`text-3xl font-bold font-mono ${budgetRemaining >= 0 ? 'text-purple-400' : 'text-amber-400'}`}>
              S/ {budgetRemaining.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Panel de Botones de Acción */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleOpenModal('income')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2"
            >
              <span>+ Registrar Ingreso</span>
            </button>

            <button
              onClick={() => handleOpenModal('expense')}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-rose-900/20 flex items-center justify-center space-x-2"
            >
              <span>- Registrar Gasto</span>
            </button>

            <button
              onClick={() => handleOpenModal('budget')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center space-x-2"
            >
              <span>⚙ Definir Presupuesto</span>
            </button>
          </div>
        </div>

        {/* Historial de Transacciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Historial de Transacciones</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No hay registros aún. Usa los botones superiores para comenzar.</p>
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
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 text-xs text-slate-400">{t.date}</td>
                      <td className="px-4 py-3 font-medium text-white">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{t.category}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'} S/ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal Formulario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white capitalize">
              {modalType === 'budget' ? 'Configurar Presupuesto Mensual' : `Registrar ${modalType === 'income' ? 'Ingreso' : 'Gasto'}`}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {modalType !== 'budget' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej. Sueldo, Alquiler, Supermercado"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {modalType !== 'budget' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej. Casa, Vehículo, Servicios"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
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
