'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface WorkShift {
  id: string;
  workerName: string;
  documentId: string; // DNI / CE
  position: string;   // Cargo / Especialidad
  workType: 'campo' | 'oficina';
  startDate: string;
  daysWorked: number;
  yearsOfService: number;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');

  // Formulario de Tareo
  const [workerName, setWorkerName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [position, setPosition] = useState('');
  const [workType, setWorkType] = useState<'campo' | 'oficina'>('campo');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [daysWorked, setDaysWorked] = useState<string>('14');
  const [yearsOfService, setYearsOfService] = useState<string>('1');

  const [shifts, setShifts] = useState<WorkShift[]>([]);

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
    }

    const savedShifts = localStorage.getItem('va_tareo_shifts');
    if (savedShifts) setShifts(JSON.parse(savedShifts));

    setLoading(false);
  }, [router]);

  // Cálculo estricto de descansos según reglas de V&A Consulting
  function calculateRestDays(days: number, type: 'campo' | 'oficina') {
    if (type === 'oficina') {
      return Math.floor(days / 5) * 2 + (days % 5) * 0.4;
    }

    // Campo:
    // Si cumple o supera los 14 días -> Régimen Atípico 2x1 (DL / 2)
    if (days >= 14) {
      return days / 2;
    }

    // Si es de 1 a 13 días -> Bloques de 5d = 2d descanso + 0.4 por día remanente
    const fullBlocks = Math.floor(days / 5);
    const remainderDays = days % 5;
    return fullBlocks * 2 + remainderDays * 0.4;
  }

  function calculateVacationDays(years: number) {
    return Math.floor(years) * 15;
  }

  function calculateReturnDate(start: string, workedDays: number, restDays: number) {
    const startDt = new Date(start);
    const totalDaysCycle = workedDays + Math.round(restDays);
    startDt.setDate(startDt.getDate() + totalDaysCycle);
    return startDt.toLocaleDateString('es-PE');
  }

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    const dWorked = parseInt(daysWorked) || 0;
    const yService = parseFloat(yearsOfService) || 0;
    if (dWorked <= 0) return;

    const newRecord: WorkShift = {
      id: Date.now().toString(),
      workerName: workerName || 'Colaborador',
      documentId: documentId || 'S/D',
      position: position || 'Técnico / Operativo',
      workType,
      startDate,
      daysWorked: dWorked,
      yearsOfService: yService,
    };

    const updated = [newRecord, ...shifts];
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));

    setWorkerName('');
    setDocumentId('');
    setPosition('');
    setDaysWorked('14');
  };

  const handleDeleteShift = (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de tareo?')) return;
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));
  };

  const exportToExcel = () => {
    const dataToExport = shifts.map((s) => {
      const rest = calculateRestDays(s.daysWorked, s.workType);
      const vacations = calculateVacationDays(s.yearsOfService);
      const returnDate = calculateReturnDate(s.startDate, s.daysWorked, rest);

      return {
        'DNI / CE': s.documentId,
        'Nombre del Colaborador': s.workerName,
        'Cargo / Especialidad': s.position,
        'Modalidad / Ubicación': s.workType === 'campo' ? 'Campo' : 'Oficina',
        'Fecha Inicio': s.startDate,
        'Días Laborados': s.daysWorked,
        'Días Descanso Generados': rest.toFixed(1),
        'Régimen Aplicado':
          s.workType === 'oficina'
            ? 'Oficina 5x2'
            : s.daysWorked >= 14
            ? 'Atípico 2x1 (≥14 días)'
            : 'Campo Corto (5x2)',
        'Fecha Retorno Estimada': returnDate,
        'Años de Servicio': s.yearsOfService,
        'Días Vacaciones Acumuladas': vacations,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Tareo_Descansos');
    XLSX.writeFile(wb, `Matriz_Tareo_VA_Consulting.xlsx`);
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Módulo Operativo de Tareo & Descansos</h1>
          <p className="text-xs text-slate-400">
            V&A Consulting S.A.C. — Control de Planilla, Jornadas & Vacaciones
          </p>
        </div>

        {shifts.length > 0 && (
          <button
            onClick={exportToExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            📊 Exportar Matriz a Excel
          </button>
        )}
      </header>

      <section className="max-w-7xl mx-auto space-y-6">
        {/* Formulario de Registro / Calculadora */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Registrar / Calcular Jornada de Trabajo
          </h2>

          <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">DNI / CE</label>
              <input
                type="text"
                placeholder="Ej. 45892011"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej. Jorge Robles"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cargo / Especialidad</label>
              <input
                type="text"
                placeholder="Ej. Especialista en Batimetría"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Modalidad</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as 'campo' | 'oficina')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="campo">Campo (Comisión / Planta / Mina)</option>
                <option value="oficina">Oficina (Sede Administrativa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Días Continuos</label>
              <input
                type="number"
                min="1"
                value={daysWorked}
                onChange={(e) => setDaysWorked(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Años de Servicio</label>
              <input
                type="number"
                min="0"
                step="1"
                value={yearsOfService}
                onChange={(e) => setYearsOfService(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-colors shadow-md"
              >
                + Guardar Registro de Tareo
              </button>
            </div>
          </form>
        </div>

        {/* Matriz y Tabla de Tareos Acumulados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Matriz de Tareo & Saldos de Descanso</h2>
          {shifts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No hay jornadas registradas. Completa el formulario superior para calcular y guardar los tareos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">DNI / CE</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Modalidad</th>
                    <th className="px-4 py-3 text-center">Laborados</th>
                    <th className="px-4 py-3 text-center">Descanso Generado</th>
                    <th className="px-4 py-3">Régimen Aplicado</th>
                    <th className="px-4 py-3 text-center">Retorno Estimado</th>
                    <th className="px-4 py-3 text-right">Vacaciones</th>
                    <th className="px-4 py-3 text-center rounded-r-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {shifts.map((s) => {
                    const rest = calculateRestDays(s.daysWorked, s.workType);
                    const vacations = calculateVacationDays(s.yearsOfService);
                    const returnDate = calculateReturnDate(s.startDate, s.daysWorked, rest);

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/50 font-mono">
                        <td className="px-4 py-3 text-amber-300 font-bold">{s.documentId}</td>
                        <td className="px-4 py-3 font-medium text-white font-sans">{s.workerName}</td>
                        <td className="px-4 py-3 font-sans text-slate-400">{s.position}</td>
                        <td className="px-4 py-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${
                            s.workType === 'campo'
                              ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                              : 'bg-blue-950/60 border-blue-800 text-blue-300'
                          }`}>
                            {s.workType === 'campo' ? 'Campo' : 'Oficina'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">{s.daysWorked} días</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">{rest.toFixed(1)} días</td>
                        <td className="px-4 py-3 font-sans text-xs text-slate-400">
                          {s.workType === 'oficina'
                            ? 'Oficina (5x2)'
                            : s.daysWorked >= 14
                            ? 'Atípico 2x1 (14d = 7d descanso)'
                            : 'Campo Corto (5x2)'}
                        </td>
                        <td className="px-4 py-3 text-center text-purple-300">{returnDate}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-400">
                          {vacations} días ({s.yearsOfService} año{s.yearsOfService !== 1 ? 's' : ''})
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteShift(s.id)}
                            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 px-2 py-1 rounded text-[10px]"
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
    </main>
  );
}
