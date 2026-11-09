'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface WorkShift {
  id: string;
  documentId: string;
  workerName: string;
  position: string;
  projectCode: string;
  dailyStatus: 'campo' | 'oficina' | 'libre' | 'tardanza' | 'falta' | 'descanso_medico' | 'vacaciones_tomadas' | 'descanso_tomado';
  startDate: string;
  daysWorked: number;
  daysTaken: number;
}

interface WorkerProfile {
  documentId: string;
  workerName: string;
  position: string;
  hireDate: string;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tareo' | 'maestro'>('tareo');

  // Estado del Formulario de Tareo
  const [documentId, setDocumentId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [position, setPosition] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-VA-001');
  const [dailyStatus, setDailyStatus] = useState<'campo' | 'oficina' | 'libre' | 'tardanza' | 'falta' | 'descanso_medico' | 'vacaciones_tomadas' | 'descanso_tomado'>('campo');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [daysWorked, setDaysWorked] = useState<string>('14');
  const [daysTaken, setDaysTaken] = useState<string>('1');

  // Maestro de Personal y Registros
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);

  // Formulario para Nuevo / Editar Trabajador en el Maestro
  const [newDni, setNewDni] = useState('');
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newHireDate, setNewHireDate] = useState('2025-01-02');

  useEffect(() => {
    const savedShifts = localStorage.getItem('va_tareo_shifts');
    const savedWorkers = localStorage.getItem('va_workers_db');
    if (savedShifts) setShifts(JSON.parse(savedShifts));
    if (savedWorkers) {
      setWorkers(JSON.parse(savedWorkers));
    } else {
      const initialWorkers: WorkerProfile[] = [
        { documentId: '45420921', workerName: 'Jefferson Aliaga', position: 'Gerente', hireDate: '2022-03-01' },
        { documentId: '455742820', workerName: 'Jorge Robles', position: 'Logística / Operaciones', hireDate: '2024-01-15' }
      ];
      setWorkers(initialWorkers);
      localStorage.setItem('va_workers_db', JSON.stringify(initialWorkers));
    }
    setLoading(false);
  }, []);

  const handleDocumentIdChange = (val: string) => {
    setDocumentId(val);
    const found = workers.find((w) => w.documentId === val.trim());
    if (found) {
      setWorkerName(found.workerName);
      setPosition(found.position);
    } else {
      setWorkerName('');
      setPosition('');
    }
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDni.trim() || !newName.trim()) return;

    const existingIndex = workers.findIndex((w) => w.documentId === newDni.trim());
    let updatedWorkers = [...workers];
    if (existingIndex >= 0) {
      updatedWorkers[existingIndex] = { documentId: newDni.trim(), workerName: newName, position: newPosition, hireDate: newHireDate };
    } else {
      updatedWorkers.push({ documentId: newDni.trim(), workerName: newName, position: newPosition, hireDate: newHireDate });
    }

    setWorkers(updatedWorkers);
    localStorage.setItem('va_workers_db', JSON.stringify(updatedWorkers));
    
    setNewDni('');
    setNewName('');
    setNewPosition('');
    alert('¡Trabajador guardado exitosamente en el Maestro de Personal!');
  };

  const handleDeleteWorker = (dni: string) => {
    if (!confirm('¿Deseas eliminar a este trabajador del maestro?')) return;
    const updated = workers.filter(w => w.documentId !== dni);
    setWorkers(updated);
    localStorage.setItem('va_workers_db', JSON.stringify(updated));
  };

  function calculateRestDays(days: number, status: string) {
    if (['libre', 'falta', 'descanso_medico', 'vacaciones_tomadas', 'descanso_tomado'].includes(status)) return 0;
    if (status === 'oficina' || status === 'tardanza' || days < 14) {
      return Math.floor(days / 5) * 2 + (days % 5) * 0.4;
    }
    return days / 2; // Régimen atípico 2x1 (>= 14 días)
  }

  function calculateVacationDays(hireStr: string) {
    if (!hireStr) return 0;
    const hireD = new Date(hireStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - hireD.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const yearsOfService = diffDays / 365;
    return Math.floor(yearsOfService) * 15;
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
    const dTaken = parseInt(daysTaken) || 0;

    const trimmedDni = documentId.trim();
    const activeWorker = workers.find((w) => w.documentId === trimmedDni);

    if (!activeWorker) {
      alert('El DNI ingresado no se encuentra en el Maestro de Personal. Regístrelo primero en la pestaña "Maestro de Personal".');
      return;
    }

    const newRecord: WorkShift = {
      id: Date.now().toString(),
      documentId: trimmedDni,
      workerName: activeWorker.workerName,
      position: activeWorker.position,
      projectCode: projectCode || 'PRJ-GENERAL',
      dailyStatus,
      startDate,
      daysWorked: ['libre', 'falta', 'descanso_medico', 'vacaciones_tomadas', 'descanso_tomado'].includes(dailyStatus) ? 0 : dWorked,
      daysTaken: ['vacaciones_tomadas', 'descanso_tomado'].includes(dailyStatus) ? dTaken : 0,
    };

    const updated = [newRecord, ...shifts];
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));
    setDaysWorked('14');
    setDaysTaken('1');
  };

  const handleDeleteShift = (id: string) => {
    if (!confirm('¿Deseas eliminar este registro?')) return;
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));
  };

  const activeDni = documentId.trim();
  const currentWorkerProfile = workers.find((w) => w.documentId === activeDni);
  const filteredShifts = activeDni ? shifts.filter((s) => s.documentId === activeDni) : [];

  const totalRestGenerated = filteredShifts.reduce((acc, s) => acc + calculateRestDays(s.daysWorked, s.dailyStatus), 0);
  const totalRestTaken = filteredShifts.filter(s => s.dailyStatus === 'descanso_tomado').reduce((acc, s) => acc + s.daysTaken, 0);
  const netRestAvailable = Math.max(0, totalRestGenerated - totalRestTaken);

  const rawVacationGenerated = currentWorkerProfile ? calculateVacationDays(currentWorkerProfile.hireDate) : 0;
  const totalVacationTaken = filteredShifts.filter(s => s.dailyStatus === 'vacaciones_tomadas').reduce((acc, s) => acc + s.daysTaken, 0);
  const netVacationAvailable = Math.max(0, rawVacationGenerated - totalVacationTaken);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsWorkers = XLSX.utils.json_to_sheet(workers.map(w => ({
      'DNI / CE': w.documentId,
      'Colaborador': w.workerName,
      'Cargo': w.position,
      'Fecha Ingreso': w.hireDate,
      'Vacaciones Brutas (días)': calculateVacationDays(w.hireDate)
    })));
    XLSX.utils.book_append_sheet(wb, wsWorkers, 'Maestro_Personal');

    const dataToExport = shifts.map((s) => {
      const worker = workers.find(w => w.documentId === s.documentId);
      const hire = worker ? worker.hireDate : '2025-01-02';
      const restGen = calculateRestDays(s.daysWorked, s.dailyStatus);
      const vacsGen = calculateVacationDays(hire);
      const returnDate = calculateReturnDate(s.startDate, s.daysWorked, restGen);

      return {
        'DNI / CE': s.documentId,
        'Nombre del Colaborador': s.workerName,
        'Cargo / Especialidad': s.position,
        'Código Proyecto': s.projectCode,
        'Estado / Asistencia': s.dailyStatus.toUpperCase(),
        'Fecha Inicio': s.startDate,
        'Días Laborados': s.daysWorked,
        'Descansos Generados': restGen.toFixed(1),
        'Descansos Tomados (-)': s.dailyStatus === 'descanso_tomado' ? s.daysTaken : 0,
        'Vacaciones Tomadas (-)': s.dailyStatus === 'vacaciones_tomadas' ? s.daysTaken : 0,
        'Fecha Retorno': returnDate,
        'Fecha Ingreso': hire,
        'Vacaciones Generadas': vacsGen,
      };
    });
    const wsDetail = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle_Tareo');

    const summaryMap: Record<string, { dni: string; name: string; position: string; totalCampo: number; restGen: number; restTaken: number; vacGen: number; vacTaken: number; project: string }> = {};
    
    shifts.forEach((s) => {
      const worker = workers.find(w => w.documentId === s.documentId);
      const hire = worker ? worker.hireDate : '2025-01-02';

      if (!summaryMap[s.documentId]) {
        summaryMap[s.documentId] = {
          dni: s.documentId,
          name: s.workerName,
          position: s.position,
          totalCampo: 0,
          restGen: 0,
          restTaken: 0,
          vacGen: calculateVacationDays(hire),
          vacTaken: 0,
          project: s.projectCode,
        };
      }
      summaryMap[s.documentId].restGen += calculateRestDays(s.daysWorked, s.dailyStatus);
      if (s.dailyStatus === 'descanso_tomado') summaryMap[s.documentId].restTaken += s.daysTaken;
      if (s.dailyStatus === 'vacaciones_tomadas') summaryMap[s.documentId].vacTaken += s.daysTaken;
      if (s.dailyStatus === 'campo') summaryMap[s.documentId].totalCampo += s.daysWorked;
    });

    const summaryData = Object.values(summaryMap).map((item) => {
      const netRest = Math.max(0, item.restGen - item.restTaken);
      const netVacs = Math.max(0, item.vacGen - item.vacTaken);
      return {
        'DNI / CE': item.dni,
        'Colaborador': item.name,
        'Cargo': item.position,
        'Proyecto Asignado': item.project,
        'Total Días Campo': item.totalCampo,
        'Descansos Generados': Number(item.restGen.toFixed(1)),
        'Descansos Tomados (-)': item.restTaken,
        'SALDO NETO DESCANSO': Number(netRest.toFixed(1)),
        'Vacaciones Generadas (Ley)': item.vacGen,
        'Vacaciones Tomadas (-)': item.vacTaken,
        'SALDO NETO VACACIONES': netVacs,
      };
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Por_Colaborador');

    XLSX.writeFile(wb, `Reporte_Tareo_Consolidado_VA.xlsx`);
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Módulo Operativo de Tareo & Descansos</h1>
          <p className="text-xs text-slate-400">
            V&A Consulting S.A.C. — Control de Asistencia, Maestro de Personal & Vacaciones MYPE
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pestañas de Navegación del Módulo */}
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              onClick={() => setActiveTab('tareo')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'tareo' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Registro de Tareo
            </button>
            <button
              onClick={() => setActiveTab('maestro')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'maestro' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              👥 Maestro de Personal
            </button>
          </div>

          {shifts.length > 0 && (
            <button
              onClick={exportToExcel}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-lg"
            >
              📊 Exportar Excel
            </button>
          )}
        </div>
      </header>

      {activeTab === 'tareo' ? (
        <section className="max-w-7xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Registro de Asistencia, Vacaciones & Descuentos por Goce
            </h2>

            <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">DNI / CE (Autocompleta)</label>
                <input
                  type="text"
                  placeholder="Ej. 45420921"
                  value={documentId}
                  onChange={(e) => handleDocumentIdChange(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Se completa automáticamente"
                  value={workerName}
                  readOnly
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  placeholder="Se completa automáticamente"
                  value={position}
                  readOnly
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Código de Proyecto</label>
                <input
                  type="text"
                  placeholder="Ej. PRJ-2026-001"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estado de Asistencia</label>
                <select
                  value={dailyStatus}
                  onChange={(e) => setDailyStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="campo">🟢 Campo (Comisión / Planta / Mina)</option>
                  <option value="oficina">🔵 Oficina (Sede Administrativa)</option>
                  <option value="libre">⚪ Día Libre / Descanso</option>
                  <option value="tardanza">🟡 Tardanza</option>
                  <option value="falta">🔴 Falta</option>
                  <option value="descanso_medico">🟣 Descanso Médico</option>
                  <option value="vacaciones_tomadas">🏖️ Vacaciones Tomadas (Resta de Vacaciones)</option>
                  <option value="descanso_tomado">🌴 Descanso Tomado (Resta de Descansos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  {['vacaciones_tomadas', 'descanso_tomado'].includes(dailyStatus) ? 'Días Tomados (a descontar)' : 'Días Continuos Laborados'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={['vacaciones_tomadas', 'descanso_tomado'].includes(dailyStatus) ? daysTaken : daysWorked}
                  onChange={(e) => {
                    if (['vacaciones_tomadas', 'descanso_tomado'].includes(dailyStatus)) {
                      setDaysTaken(e.target.value);
                    } else {
                      setDaysWorked(e.target.value);
                    }
                  }}
                  disabled={['libre', 'falta', 'descanso_medico'].includes(dailyStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-colors shadow-md"
                >
                  + Registrar Asistencia
                </button>
              </div>
            </form>
          </div>

          {/* Panel de Resumen con Saldos Separados */}
          {activeDni && currentWorkerProfile && (
            <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Bolsa de Descansos (Campo / Oficina)</h3>
                <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
                  <span>Generados: {totalRestGenerated.toFixed(1)} días</span>
                  <span>Tomados: {totalRestTaken} días</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400 font-mono">{netRestAvailable.toFixed(1)} días</p>
                <p className="text-[10px] text-slate-500">Saldo neto disponible de descansos compensatorios</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Bolsa de Vacaciones (Ley MYPE)</h3>
                <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
                  <span>Generadas: {rawVacationGenerated} días</span>
                  <span>Tomadas: {totalVacationTaken} días</span>
                </div>
                <p className="text-3xl font-bold text-blue-400 font-mono">{netVacationAvailable} días</p>
                <p className="text-[10px] text-slate-500">Saldo neto disponible de vacaciones anuales</p>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Matriz de Tareo del Colaborador {activeDni ? `(DNI: ${activeDni})` : '— (Ingrese un DNI arriba para filtrar)'}
            </h2>
            {!activeDni ? (
              <p className="text-xs text-amber-400/80 text-center py-6 bg-slate-950 rounded-xl border border-slate-800">
                ⚠️ Ingrese un DNI / CE en la parte superior para visualizar únicamente sus registros.
              </p>
            ) : filteredShifts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No se encontraron registros para el DNI {activeDni}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">DNI / CE</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Cargo</th>
                      <th className="px-4 py-3">Proyecto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-center">Laborados / Tomados</th>
                      <th className="px-4 py-3 text-center">Descanso Generado</th>
                      <th className="px-4 py-3 text-right">Vacaciones Acum.</th>
                      <th className="px-4 py-3 text-center rounded-r-lg">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredShifts.map((s) => {
                      const worker = workers.find(w => w.documentId === s.documentId);
                      const hire = worker ? worker.hireDate : '2025-01-02';
                      const restGen = calculateRestDays(s.daysWorked, s.dailyStatus);
                      const vacGen = calculateVacationDays(hire);

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/50 font-mono">
                          <td className="px-4 py-3 text-amber-300 font-bold">{s.documentId}</td>
                          <td className="px-4 py-3 font-medium text-white font-sans">{s.workerName}</td>
                          <td className="px-4 py-3 font-sans text-slate-400">{s.position}</td>
                          <td className="px-4 py-3 font-sans font-bold text-blue-300">{s.projectCode}</td>
                          <td className="px-4 py-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                              s.dailyStatus === 'campo'
                                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                : s.dailyStatus === 'oficina'
                                ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                                : s.dailyStatus === 'vacaciones_tomadas'
                                ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                                : s.dailyStatus === 'descanso_tomado'
                                ? 'bg-teal-950/60 border-teal-800 text-teal-300'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}>
                              {s.dailyStatus.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-white">
                            {['vacaciones_tomadas', 'descanso_tomado'].includes(s.dailyStatus) ? `-${s.daysTaken} días (Tomado)` : `${s.daysWorked} días`}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-400">
                            {restGen > 0 ? `+${restGen.toFixed(1)} días` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-400">{vacGen} días</td>
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
      ) : (
        /* Vista de Maestro de Personal */
        <section className="max-w-7xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Directorio del Maestro de Personal</h2>
                <p className="text-xs text-slate-400">Agregue o edite los datos base y fechas de ingreso de los colaboradores para el cálculo MYPE.</p>
              </div>
            </div>

            <form onSubmit={handleSaveWorker} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">DNI / CE</label>
                <input
                  type="text"
                  placeholder="Ej. 45892011"
                  value={newDni}
                  onChange={(e) => setNewDni(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Mendoza"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej. Técnico Batimetrista"
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Fecha de Ingreso</label>
                <input
                  type="date"
                  value={newHireDate}
                  onChange={(e) => setNewHireDate(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-4 rounded-lg transition-colors shadow-md"
                >
                  💾 Guardar Trabajador
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">DNI / CE</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Fecha de Ingreso</th>
                    <th className="px-4 py-3 text-center">Vacaciones Acumuladas (MYPE)</th>
                    <th className="px-4 py-3 text-center rounded-r-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {workers.map((w) => {
                    const vacs = calculateVacationDays(w.hireDate);
                    return (
                      <tr key={w.documentId} className="hover:bg-slate-800/50 font-mono">
                        <td className="px-4 py-3 text-amber-300 font-bold">{w.documentId}</td>
                        <td className="px-4 py-3 font-medium text-white font-sans">{w.workerName}</td>
                        <td className="px-4 py-3 font-sans text-slate-400">{w.position}</td>
                        <td className="px-4 py-3 text-slate-300">{w.hireDate}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-400">{vacs} días</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteWorker(w.documentId)}
                            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 px-2 py-1 rounded text-[10px]"
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
