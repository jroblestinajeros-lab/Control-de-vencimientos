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

interface TareoRecord {
  id: string;
  dni: string;
  name: string;
  cargo: string;
  projectCode: string;
  status: 'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso';
  daysWorked: number;
  date: string;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tareo' | 'maestro'>('tareo');
  
  // Maestro de Personal y Registros de Tareo
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [tareos, setTareos] = useState<TareoRecord[]>([]);

  // Inputs Maestro
  const [dniInput, setDniInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [regimeInput, setRegimeInput] = useState<'micro' | 'small'>('small');

  // Inputs Tareo Diario
  const [selectedDni, setSelectedDni] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-01');
  const [tareoStatus, setTareoStatus] = useState<'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso'>('campo');
  const [daysWorkedInput, setDaysWorkedInput] = useState('1');

  useEffect(() => {
    document.title = "Módulo Operativo de Tareo & Vacaciones MYPE | V&A Consulting";
    
    const savedCollabs = localStorage.getItem('vya_collaborators');
    const savedTareos = localStorage.getItem('vya_tareos');

    if (savedCollabs) {
      try { setCollaborators(JSON.parse(savedCollabs)); } catch (e) { setCollaborators([]); }
    } else {
      const defaultCollabs: Collaborator[] = [
        { dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', startDate: '2026-01-08', regime: 'small' },
        { dni: '45420921', name: 'Jefferson Aliaga Araujo', cargo: 'Gerente de Finanzas', startDate: '2015-01-01', regime: 'small' },
        { dni: '47891234', name: 'Carlos Mendoza', cargo: 'Técnico Batimetrista', startDate: '2026-08-01', regime: 'micro' }
      ];
      setCollaborators(defaultCollabs);
      localStorage.setItem('vya_collaborators', JSON.stringify(defaultCollabs));
    }

    if (savedTareos) {
      try { setTareos(JSON.parse(savedTareos)); } catch (e) { setTareos([]); }
    } else {
      const defaultTareos: TareoRecord[] = [
        { id: '1', dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', projectCode: 'PRJ-01', status: 'campo', daysWorked: 7, date: '2026-09-11' }
      ];
      setTareos(defaultTareos);
      localStorage.setItem('vya_tareos', JSON.stringify(defaultTareos));
    }

    setLoading(false);
  }, []);

  // --- LÓGICA DE CÁLCULO DE VACACIONES MYPE RIGUROSA ---
  const calculateVacationStatus = (startDateStr: string, regime: 'micro' | 'small') => {
    if (!startDateStr) return { earnedDays: 0, statusMessage: 'Sin fecha de ingreso', totalMonths: 0 };
    
    const start = new Date(startDateStr);
    const now = new Date();
    
    const diffTime = now.getTime() - start.getTime();
    const diffDaysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const days = now.getDate() - start.getDate();
    
    const totalMonthsFraction = Math.max(0, months + (days >= 0 ? days / 30 : 0));
    
    // Asignación correcta según régimen MYPE: Microempresa = 15 días/año | Pequeña Empresa = 30 días/año
    const annualDays = regime === 'micro' ? 15 : 30;
    const monthlyAccrualRate = annualDays / 12;

    const earnedDays = totalMonthsFraction * monthlyAccrualRate;
    const completedFullMonth = diffDaysTotal >= 30;

    let statusMessage = !completedFullMonth 
      ? 'En periodo inicial (< 1 mes)' 
      : `Vacaciones proporcionales MYPE (${annualDays} días/año)`;

    return {
      totalMonths: Number(totalMonthsFraction.toFixed(1)),
      earnedDays: Number(earnedDays.toFixed(1)),
      statusMessage,
      annualDays
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

  const handleAddTareo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDni) return;

    const collab = collaborators.find(c => c.dni === selectedDni);
    if (!collab) return;

    const valDays = parseFloat(daysWorkedInput) || 1;
    const newRecord: TareoRecord = {
      id: Date.now().toString(),
      dni: collab.dni,
      name: collab.name,
      cargo: collab.cargo,
      projectCode,
      status: tareoStatus,
      daysWorked: valDays,
      date: new Date().toISOString().slice(0, 10),
    };

    const updated = [newRecord, ...tareos];
    setTareos(updated);
    localStorage.setItem('vya_tareos', JSON.stringify(updated));
  };

  const handleDeleteTareo = (id: string) => {
    const updated = tareos.filter(t => t.id !== id);
    setTareos(updated);
    localStorage.setItem('vya_tareos', JSON.stringify(updated));
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
            📋 Registro de Tareo
          </button>
          <button
            onClick={() => setActiveTab('maestro')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'maestro' ? 'bg-teal-400 text-slate-950 shadow-lg' : 'bg-indigo-950 text-purple-300 border border-purple-500/30'}`}
          >
            👥 Maestro de Personal
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-6">
        {activeTab === 'maestro' ? (
          <div className="rounded-3xl p-6 shadow-2xl border space-y-6" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Directorio del Maestro de Personal</h2>
            
            <form onSubmit={handleSaveCollaborator} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-indigo-950/60 p-4 rounded-2xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">DNI / CE</label>
                <input type="text" placeholder="Ej. 45572820" value={dniInput} onChange={(e) => setDniInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Nombre Completo</label>
                <input type="text" placeholder="Ej. Jorge Robles" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Cargo</label>
                <input type="text" placeholder="Ej. Logística" value={cargoInput} onChange={(e) => setCargoInput(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Fecha de Ingreso</label>
                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Régimen MYPE</label>
                <select value={regimeInput} onChange={(e) => setRegimeInput(e.target.value as 'micro' | 'small')} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs mb-1">
                  <option value="small">Pequeña Empresa (30d)</option>
                  <option value="micro">Microempresa (15d)</option>
                </select>
                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 rounded-xl">💾 Guardar</button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3">DNI</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Fecha Ingreso</th>
                    <th className="px-4 py-3">Régimen</th>
                    <th className="px-4 py-3 text-right">Vacaciones MYPE Acumuladas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => {
                    const vac = calculateVacationStatus(c.startDate, c.regime);
                    return (
                      <tr key={c.dni} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-teal-300">{c.dni}</td>
                        <td className="px-4 py-3 text-white font-sans font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-purple-300">{c.cargo}</td>
                        <td className="px-4 py-3">{c.startDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${c.regime === 'micro' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-cyan-950 border-cyan-400 text-cyan-300'}`}>
                            {c.regime === 'micro' ? 'Microempresa (15d)' : 'Pequeña Empresa (30d)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-fuchsia-300">{vac.earnedDays} días ({vac.statusMessage})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PANEL DE REGISTRO RÁPIDO */}
            <form onSubmit={handleAddTareo} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-indigo-950/70 p-4 rounded-3xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Seleccionar Colaborador</label>
                <select value={selectedDni} onChange={(e) => setSelectedDni(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="">-- Seleccione Colaborador --</option>
                  {collaborators.map(c => (
                    <option key={c.dni} value={c.dni}>{c.name} (DNI: {c.dni})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Estado de Asistencia</label>
                <select value={tareoStatus} onChange={(e) => setTareoStatus(e.target.value as any)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="campo">Campo (Comisión / Planta / Mina)</option>
                  <option value="oficina">Oficina</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="falto">Falta Injustificada</option>
                  <option value="descanso_medico">Descanso Médico</option>
                  <option value="descanso">Descanso Compensatorio</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Proyecto / Código</label>
                <input type="text" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Días / Unidades</label>
                <input type="number" step="0.5" value={daysWorkedInput} onChange={(e) => setDaysWorkedInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 rounded-xl shadow-md">+ Registrar Estado</button>
              </div>
            </form>

            {/* MATRIZ DE TAREO DETALLADA CON RÉGIMEN Y VACACIONES MYPE CORRECTAS */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Módulo de Asistencia, Tareo & Resumen Vacacional MYPE</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Cargo / Régimen MYPE</th>
                      <th className="px-4 py-3 text-center">Asistencias & Incidencias</th>
                      <th className="px-4 py-3 text-right">Resumen Vacacional MYPE (Acumulado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {collaborators.map((c) => {
                      const collabTareos = tareos.filter(t => t.dni === c.dni);
                      const totalCampoOficina = collabTareos.filter(t => t.status === 'campo' || t.status === 'oficina').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalTardanzas = collabTareos.filter(t => t.status === 'tardanza').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalFaltas = collabTareos.filter(t => t.status === 'falto').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalDescansoMedico = collabTareos.filter(t => t.status === 'descanso_medico').reduce((acc, t) => acc + t.daysWorked, 0);

                      const vac = calculateVacationStatus(c.startDate, c.regime);

                      return (
                        <tr key={c.dni} className="hover:bg-indigo-900/30">
                          <td className="px-4 py-3 text-white font-sans font-medium">
                            {c.name}
                            <div className="text-[10px] text-purple-300/60 font-mono">DNI: {c.dni} | Ingreso: {c.startDate}</div>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <div className="text-purple-200 font-medium">{c.cargo}</div>
                            {/* ETIQUETA DINÁMICA SEGÚN EL RÉGIMEN REAL */}
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] border ${c.regime === 'micro' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-cyan-950 border-cyan-400 text-cyan-300'}`}>
                              {c.regime === 'micro' ? 'Microempresa (15d/año)' : 'Pequeña Empresa (30d/año)'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            <div className="text-teal-300 font-bold">{totalCampoOficina} días lab.</div>
                            <div className="text-[10px] text-purple-300">
                              {totalFaltas > 0 && <span className="text-rose-400 font-bold mr-2">🔴 {totalFaltas} faltas</span>}
                              {totalDescansoMedico > 0 && <span className="text-cyan-300 font-bold mr-2">🏥 {totalDescansoMedico} días DM</span>}
                              {totalTardanzas > 0 && <span className="text-amber-300 font-bold">🟡 {totalTardanzas} tard.</span>}
                              {totalFaltas === 0 && totalDescansoMedico === 0 && totalTardanzas === 0 && <span className="text-purple-300/60">Sin incidencias</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-fuchsia-300 font-black text-sm">{vac.earnedDays} días acumulados</div>
                            <div className="text-[10px] text-purple-200 font-sans">{vac.statusMessage}</div>
                            <div className="text-[10px] text-cyan-300 font-mono mt-0.5">Tiempo laborado: {vac.totalMonths} meses</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
