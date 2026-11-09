'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Collaborator {
  dni: string;
  name: string;
  cargo: string;
  startDate: string; // Formato YYYY-MM-DD
  regime: 'micro' | 'small'; // micro = 15 días/año, small = 30 días/año
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tareo' | 'maestro'>('tareo');
  
  // Estados de la Data Maestra de Personal
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [dniInput, setDniInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [regimeInput, setRegimeInput] = useState<'micro' | 'small'>('small');

  useEffect(() => {
    document.title = "Módulo Operativo de Tareo & Vacaciones MYPE | V&A Consulting";
    
    const savedCollabs = localStorage.getItem('vya_collaborators');
    if (savedCollabs) {
      try {
        setCollaborators(JSON.parse(savedCollabs));
      } catch (e) {
        setCollaborators([]);
      }
    } else {
      const defaultCollabs: Collaborator[] = [
        { dni: '45420921', name: 'Jefferson Aliaga Araujo', cargo: 'Gerente de Finanzas', startDate: '2015-01-01', regime: 'small' },
        { dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', startDate: '2026-01-08', regime: 'small' },
        { dni: '47891234', name: 'Carlos Mendoza', cargo: 'Técnico Batimetrista', startDate: '2026-08-01', regime: 'micro' }
      ];
      setCollaborators(defaultCollabs);
      localStorage.setItem('vya_collaborators', JSON.stringify(defaultCollabs));
    }
    setLoading(false);
  }, []);

  // --- LÓGICA DE CÁLCULO DE VACACIONES Y VACACIONES TRUNCAS MYPE ---
  const calculateVacationStatus = (startDateStr: string, regime: 'micro' | 'small') => {
    if (!startDateStr) return { earnedDays: '0.0', statusMessage: 'Sin fecha de ingreso', totalMonthsFraction: '0.0' };
    
    const start = new Date(startDateStr);
    const now = new Date();
    
    const diffTime = now.getTime() - start.getTime();
    const diffDaysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const days = now.getDate() - start.getDate();
    
    const totalMonthsFraction = Math.max(0, months + (days >= 0 ? days / 30 : 0));
    
    // Régimen MYPE: Microempresa = 15 días/año (1.25 días/mes), Pequeña Empresa = 30 días/año (2.5 días/mes)
    const annualDays = regime === 'micro' ? 15 : 30;
    const monthlyAccrualRate = annualDays / 12;

    const earnedDays = totalMonthsFraction * monthlyAccrualRate;
    const completedFullYear = diffDaysTotal >= 365;
    const completedFullMonth = diffDaysTotal >= 30;

    let statusMessage = '';
    if (!completedFullMonth) {
      statusMessage = 'En periodo inicial (< 1 mes - Sin derecho trunca)';
    } else if (completedFullYear) {
      statusMessage = `Derecho cumplido (${annualDays} días físicos)`;
    } else {
      statusMessage = `Vacaciones truncas proporcionales (~${earnedDays.toFixed(1)} días)`;
    }

    return {
      totalMonthsFraction: totalMonthsFraction.toFixed(1),
      earnedDays: earnedDays.toFixed(1),
      statusMessage,
      completedFullYear
    };
  };

  const handleSaveCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniInput || !nameInput || !startDateInput) return;

    const existingIndex = collaborators.findIndex(c => c.dni === dniInput);
    let updated: Collaborator[];

    const newCollab: Collaborator = {
      dni: dniInput,
      name: nameInput,
      cargo: cargoInput || 'Operaciones',
      startDate: startDateInput,
      regime: regimeInput
    };

    if (existingIndex >= 0) {
      updated = [...collaborators];
      updated[existingIndex] = newCollab;
    } else {
      updated = [newCollab, ...collaborators];
    }

    setCollaborators(updated);
    localStorage.setItem('vya_collaborators', JSON.stringify(updated));

    setDniInput('');
    setNameInput('');
    setCargoInput('');
    setStartDateInput('');
  };

  const handleDeleteCollaborator = (dni: string) => {
    if (!confirm('¿Deseas eliminar este colaborador del maestro?')) return;
    const updated = collaborators.filter(c => c.dni !== dni);
    setCollaborators(updated);
    localStorage.setItem('vya_collaborators', JSON.stringify(updated));
  };

  const exportMasterToExcel = () => {
    const dataToExport = collaborators.map(c => {
      const vac = calculateVacationStatus(c.startDate, c.regime);
      return {
        'DNI / CE': c.dni,
        'Colaborador': c.name,
        'Cargo': c.cargo,
        'Fecha de Ingreso': c.startDate,
        'Régimen MYPE': c.regime === 'micro' ? 'Microempresa (15 días)' : 'Pequeña Empresa (30 días)',
        'Meses Laborados': vac.totalMonthsFraction,
        'Vacaciones Acumuladas / Truncas (Días)': vac.earnedDays,
        'Estado Vacacional': vac.statusMessage
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Maestro y Vacaciones MYPE');
    XLSX.writeFile(wb, `Maestro_Personal_Vacaciones_MYPE.xlsx`);
  };

  if (loading) return null;

  return (
    <main className="min-h-screen text-slate-100 p-6" style={{ backgroundColor: '#130826', backgroundImage: 'linear-gradient(135deg, #130826 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-purple-500/30 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-fuchsia-400 to-cyan-300">
            Módulo Operativo de Tareo & Vacaciones MYPE
          </h1>
          <p className="text-xs text-purple-200 mt-1">V&A Consulting S.A.C. — Control de Asistencia, Maestro de Personal & Vacaciones</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('tareo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'tareo' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'bg-indigo-950 text-purple-300 border border-purple-500/30'}`}
          >
            📋 Registro de Tareo & Resumen
          </button>
          <button
            onClick={() => setActiveTab('maestro')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'maestro' ? 'bg-teal-400 text-slate-950 shadow-lg' : 'bg-indigo-950 text-purple-300 border border-purple-500/30'}`}
          >
            👥 Maestro de Personal
          </button>
          <button
            onClick={exportMasterToExcel}
            className="bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-lg"
          >
            📊 Exportar Excel
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-6">
        {activeTab === 'maestro' ? (
          <div className="rounded-3xl p-6 shadow-2xl border space-y-6" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Directorio del Maestro de Personal & Vacaciones MYPE</h2>
              <p className="text-xs text-purple-300/70">Registra o edita las fechas de ingreso y el régimen MYPE de los colaboradores para el cálculo automático.</p>
            </div>

            <form onSubmit={handleSaveCollaborator} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-indigo-950/60 p-4 rounded-2xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">DNI / CE</label>
                <input
                  type="text"
                  placeholder="Ej. 45892011"
                  value={dniInput}
                  onChange={(e) => setDniInput(e.target.value)}
                  required
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Mendoza"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Cargo / Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej. Técnico Batimetrista"
                  value={cargoInput}
                  onChange={(e) => setCargoInput(e.target.value)}
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Fecha de Ingreso</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  required
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Régimen MYPE</label>
                <select
                  value={regimeInput}
                  onChange={(e) => setRegimeInput(e.target.value as 'micro' | 'small')}
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs mb-1"
                >
                  <option value="small">Pequeña Empresa (30d)</option>
                  <option value="micro">Microempresa (15d)</option>
                </select>
                <button
                  type="submit"
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 rounded-xl transition-all shadow-md"
                >
                  💾 Guardar Trabajador
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">DNI</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Fecha Ingreso</th>
                    <th className="px-4 py-3">Régimen MYPE</th>
                    <th className="px-4 py-3 text-right">Vacaciones / Truncas (MYPE)</th>
                    <th className="px-4 py-3 text-center rounded-r-xl">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => {
                    const vac = calculateVacationStatus(c.startDate, c.regime);
                    return (
                      <tr key={c.dni} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-teal-300">{c.dni}</td>
                        <td className="px-4 py-3 text-white font-sans font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-purple-300 font-sans">{c.cargo}</td>
                        <td className="px-4 py-3 text-purple-200">{c.startDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${c.regime === 'micro' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-cyan-950 border-cyan-400 text-cyan-300'}`}>
                            {c.regime === 'micro' ? 'Microempresa (15d)' : 'Pequeña Empresa (30d)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-fuchsia-300 font-bold">{vac.earnedDays} días</div>
                          <div className="text-[10px] text-purple-300/70 font-sans">{vac.statusMessage}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteCollaborator(c.dni)}
                            className="bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-xs"
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
          </div>
        ) : (
          <div className="rounded-3xl p-6 shadow-2xl border space-y-4" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Módulo de Asistencia, Tareo & Resumen Vacacional MYPE</h2>
              <p className="text-xs text-purple-300/70">Control diario de asistencia integrado con el saldo vacacional y régimen de cada colaborador.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Colaborador</th>
                    <th className="px-4 py-3">Cargo / Régimen</th>
                    <th className="px-4 py-3 text-center">Estado Asistencia Hoy</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Resumen Vacacional MYPE (Acumulado / Trunco)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => {
                    const vac = calculateVacationStatus(c.startDate, c.regime);
                    return (
                      <tr key={c.dni} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-white font-sans font-medium">
                          {c.name}
                          <div className="text-[10px] text-purple-300/60 font-mono">DNI: {c.dni} | Ingreso: {c.startDate}</div>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <div className="text-purple-200 font-medium">{c.cargo}</div>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] border ${c.regime === 'micro' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-cyan-950 border-cyan-400 text-cyan-300'}`}>
                            {c.regime === 'micro' ? 'Microempresa (15d/año)' : 'Pequeña Empresa (30d/año)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select className="bg-indigo-950 border border-purple-500/50 text-teal-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none">
                            <option value="asistio">🟢 Asistió / Laborando</option>
                            <option value="tardanza">🟡 Tardanza</option>
                            <option value="falto">🔴 Falta Injustificada</option>
                            <option value="descanso_medico">🏥 Descanso Médico</option>
                            <option value="descanso">🏖️ Descanso Programado</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-fuchsia-300 font-black text-sm">{vac.earnedDays} días acumulados</div>
                          <div className="text-[10px] text-purple-200 font-sans">{vac.statusMessage}</div>
                          <div className="text-[10px] text-cyan-300 font-mono mt-0.5">Tiempo laborado: {vac.totalMonthsFraction} meses</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
