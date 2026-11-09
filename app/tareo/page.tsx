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
  dailyStatus: 'campo' | 'oficina' | 'libre' | 'tardanza' | 'falta' | 'descanso_medico';
  startDate: string;
  daysWorked: number;
  hireDate: string;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [documentId, setDocumentId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [position, setPosition] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-VA-001');
  const [dailyStatus, setDailyStatus] = useState<'campo' | 'oficina' | 'libre' | 'tardanza' | 'falta' | 'descanso_medico'>('campo');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [daysWorked, setDaysWorked] = useState<string>('14');
  const [hireDate, setHireDate] = useState('2025-01-02');

  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [registryDatabase, setRegistryDatabase] = useState<Record<string, { workerName: string; position: string; hireDate: string }>>({});

  useEffect(() => {
    const savedShifts = localStorage.getItem('va_tareo_shifts');
    const savedRegistry = localStorage.getItem('va_registry_db');
    if (savedShifts) setShifts(JSON.parse(savedShifts));
    if (savedRegistry) setRegistryDatabase(JSON.parse(savedRegistry));
    setLoading(false);
  }, []);

  // Autocompletar al escribir el DNI / CE
  const handleDocumentIdChange = (val: string) => {
    setDocumentId(val);
    if (registryDatabase[val]) {
      setWorkerName(registryDatabase[val].workerName);
      setPosition(registryDatabase[val].position);
      setHireDate(registryDatabase[val].hireDate || '2025-01-02');
    }
  };

  function calculateRestDays(days: number, status: string) {
    if (status === 'libre' || status === 'falta' || status === 'descanso_medico') return 0;
    
    // Oficina o Campo Corto (< 14 días) -> Regla 5x2
    if (status === 'oficina' || status === 'tardanza' || days < 14) {
      return Math.floor(days / 5) * 2 + (days % 5) * 0.4;
    }

    // Régimen Atípico en Campo (>= 14 días en proporción 2x1)
    return days / 2;
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
    if (dWorked <= 0 && ['campo', 'oficina', 'tardanza'].includes(dailyStatus)) return;

    const trimmedDni = documentId.trim();
    const updatedRegistry = {
      ...registryDatabase,
      [trimmedDni]: { workerName, position, hireDate }
    };
    setRegistryDatabase(updatedRegistry);
    localStorage.setItem('va_registry_db', JSON.stringify(updatedRegistry));

    const newRecord: WorkShift = {
      id: Date.now().toString(),
      documentId: trimmedDni,
      workerName: workerName || 'Colaborador',
      position: position || 'Técnico',
      projectCode: projectCode || 'PRJ-GENERAL',
      dailyStatus,
      startDate,
      daysWorked: ['libre', 'falta', 'descanso_medico'].includes(dailyStatus) ? 0 : dWorked,
      hireDate,
    };

    const updated = [newRecord, ...shifts];
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));

    setDaysWorked('14');
  };

  const handleDeleteShift = (id: string) => {
    if (!confirm('¿Deseas eliminar este registro?')) return;
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    localStorage.setItem('va_tareo_shifts', JSON.stringify(updated));
  };

  // Filtrar la matriz exclusivamente para el DNI que se está ingresando
  const activeDni = documentId.trim();
  const filteredShifts = activeDni 
    ? shifts.filter((s) => s.documentId === activeDni) 
    : [];

  // Calcular totales acumulados diferenciados para el colaborador en pantalla
  const totalRestGenerated = filteredShifts.reduce((acc, s) => acc + calculateRestDays(s.daysWorked, s.dailyStatus), 0);
  const totalVacationGenerated = filteredShifts.length > 0 ? calculateVacationDays(filteredShifts[0].hireDate) : calculateVacationDays(hireDate);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Detalle de Tareo
    const dataToExport = shifts.map((s) => {
      const rest = calculateRestDays(s.daysWorked, s.dailyStatus);
      const vacations = calculateVacationDays(s.hireDate);
      const returnDate = calculateReturnDate(s.startDate, s.daysWorked, rest);

      return {
        'DNI / CE': s.documentId,
        'Nombre del Colaborador': s.workerName,
        'Cargo / Especialidad': s.position,
        'Código Proyecto': s.projectCode,
        'Estado / Asistencia': s.dailyStatus.toUpperCase(),
        'Fecha Inicio': s.startDate,
        'Días Laborados': s.daysWorked,
        'Días Descanso Generados': rest.toFixed(1),
        'Fecha Retorno': returnDate,
        'Fecha Ingreso': s.hireDate,
        'Vacaciones Acumuladas (días)': vacations,
      };
    });
    const wsDetail = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle_Tareo');

    // Hoja 2: Cuadro Resumen por Colaborador con ítems diferenciados
    const summaryMap: Record<string, { dni: string; name: string; position: string; totalCampo: number; totalDescanso: number; vacs: number; project: string }> = {};
    
    shifts.forEach((s) => {
      if (!summaryMap[s.documentId]) {
        summaryMap[s.documentId] = {
          dni: s.documentId,
          name: s.workerName,
          position: s.position,
          totalCampo: 0,
          totalDescanso: 0,
          vacs: calculateVacationDays(s.hireDate),
          project: s.projectCode,
        };
      }
      summaryMap[s.documentId].totalDescanso += calculateRestDays(s.daysWorked, s.dailyStatus);
      if (s.dailyStatus === 'campo') {
        summaryMap[s.documentId].totalCampo += s.daysWorked;
      }
    });

    const summaryData = Object.values(summaryMap).map((item) => ({
      'DNI / CE': item.dni,
      'Colaborador': item.name,
      'Cargo': item.position,
      'Proyecto Asignado': item.project,
      'Total Días Campo': item.totalCampo,
      'Total Descansos Generados (Campo/Oficina)': Number(item.totalDescanso.toFixed(1)),
      'Días Vacaciones (MYPE)': item.vacs,
      'TOTAL ACUMULADO (Descansos + Vacaciones)': Number((item.totalDescanso + item.vacs).toFixed(1)),
    }));

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
            V&A Consulting S.A.C. — Control de Planilla, Proyectos, Asistencia & Vacaciones MYPE
          </p>
        </div>

        {shifts.length > 0 && (
          <button
            onClick={exportToExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            📊 Exportar Excel con Cuadro Resumen
          </button>
        )}
      </header>

      <section className="max-w-7xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Registro de Asistencia & Búsqueda por DNI
          </h2>

          <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">DNI / CE (Filtra la matriz)</label>
              <input
                type="text"
                placeholder="Ej. 455742820"
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
                placeholder="Ej. Administración"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Días Continuos Laborados</label>
              <input
                type="number"
                min="0"
                value={daysWorked}
                onChange={(e) => setDaysWorked(e.target.value)}
                disabled={['libre', 'falta', 'descanso_medico'].includes(dailyStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Fecha de Ingreso (Vacaciones MYPE)</label>
              <input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-colors shadow-md"
              >
                + Registrar Asistencia & Calcular
              </button>
            </div>
          </form>
        </div>

        {/* Panel de Resumen Diferenciado para el Colaborador en Consulta */}
        {activeDni && (
          <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase">Descansos Generados (Campo/Oficina)</h3>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{totalRestGenerated.toFixed(1)} días</p>
              <p className="text-[10px] text-slate-500 mt-1">Acumulado por jornadas laborales</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h3 className="text-xs font-semibold text-slate-400 uppercase">Vacaciones Acumuladas (MYPE)</h3>
              <p className="text-2xl font-bold text-blue-400 font-mono mt-1">{totalVacationGenerated} días</p>
              <p className="text-[10px] text-slate-500 mt-1">Calculado por tiempo de servicio</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h3 className="text-xs font-semibold text-amber-300 uppercase">Total Adeudado / Disponible</h3>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{(totalRestGenerated + totalVacationGenerated).toFixed(1)} días</p>
              <p className="text-[10px] text-slate-500 mt-1">Suma total diferenciada de ambos conceptos</p>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Matriz de Tareo del Colaborador {activeDni ? `(DNI: ${activeDni})` : '— (Ingrese un DNI arriba para filtrar)'}
          </h2>
          {!activeDni ? (
            <p className="text-xs text-amber-400/80 text-center py-6 bg-slate-950 rounded-xl border border-slate-800">
              ⚠️ Ingrese o digite un número de DNI / CE en la parte superior para visualizar únicamente sus registros correspondientes.
            </p>
          ) : filteredShifts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">
              No se encontraron registros de tareo para el DNI {activeDni}.
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
                    <th className="px-4 py-3 text-center">Laborados</th>
                    <th className="px-4 py-3 text-center">Descanso (Campo)</th>
                    <th className="px-4 py-3 text-center">Retorno Est.</th>
                    <th className="px-4 py-3 text-right">Vacaciones (MYPE)</th>
                    <th className="px-4 py-3 text-center rounded-r-lg">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredShifts.map((s) => {
                    const rest = calculateRestDays(s.daysWorked, s.dailyStatus);
                    const vacations = calculateVacationDays(s.hireDate);
                    const returnDate = calculateReturnDate(s.startDate, s.daysWorked, rest);

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
                              : s.dailyStatus === 'tardanza'
                              ? 'bg-yellow-950/60 border-yellow-800 text-yellow-300'
                              : s.dailyStatus === 'falta'
                              ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                              : s.dailyStatus === 'descanso_medico'
                              ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}>
                            {s.dailyStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-white">{s.daysWorked} días</td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">{rest.toFixed(1)} días</td>
                        <td className="px-4 py-3 text-center text-purple-300">{returnDate}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-400">{vacations} días</td>
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
