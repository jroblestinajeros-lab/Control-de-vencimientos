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
  status: 'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso' | 'vacaciones';
  daysWorked: number;
  date: string;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tareo' | 'maestro'>('tareo');
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [tareos, setTareos] = useState<TareoRecord[]>([]);

  // Estados Maestro
  const [dniInput, setDniInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [regimeInput, setRegimeInput] = useState<'micro' | 'small'>('small');
  const [isEditing, setIsEditing] = useState(false);

  // Inputs Tareo Diario
  const [selectedDni, setSelectedDni] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-01');
  const [tareoStatus, setTareoStatus] = useState<'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso' | 'vacaciones'>('campo');
  const [daysWorkedInput, setDaysWorkedInput] = useState('1');

  useEffect(() => {
    document.title = "Módulo Operativo de Tareo & Vacaciones MYPE | V&A Consulting";
    
    // Llaves fijas y permanentes para evitar reseteos de caché
    const savedCollabs = localStorage.getItem('vya_collaborators_permanent');
    const savedTareos = localStorage.getItem('vya_tareos_permanent');

    if (savedCollabs) {
      try { setCollaborators(JSON.parse(savedCollabs)); } catch (e) { setCollaborators([]); }
    } else {
      const defaultCollabs: Collaborator[] = [
        { dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', startDate: '2026-01-08', regime: 'small' },
        { dni: '45420921', name: 'Jefferson Aliaga Araujo', cargo: 'Gerente de Finanzas', startDate: '2015-01-01', regime: 'small' },
        { dni: '47891234', name: 'Carlos Mendoza', cargo: 'Técnico Batimetrista', startDate: '2026-08-01', regime: 'micro' }
      ];
      setCollaborators(defaultCollabs);
      localStorage.setItem('vya_collaborators_permanent', JSON.stringify(defaultCollabs));
    }

    if (savedTareos) {
      try { setTareos(JSON.parse(savedTareos)); } catch (e) { setTareos([]); }
    } else {
      const defaultTareos: TareoRecord[] = [
        { id: '1', dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', projectCode: 'PRJ-01', status: 'campo', daysWorked: 14, date: '2026-09-11' }
      ];
      setTareos(defaultTareos);
      localStorage.setItem('vya_tareos_permanent', JSON.stringify(defaultTareos));
    }

    setLoading(false);
  }, []);

  // --- CÁLCULO DE VACACIONES MYPE ---
  const calculateVacationStatus = (startDateStr: string, regime: 'micro' | 'small', takenVacationDays: number) => {
    if (!startDateStr) return { earnedDays: 0, netDays: 0, statusMessage: 'Sin fecha de ingreso', totalMonths: 0 };
    
    const start = new Date(startDateStr);
    const now = new Date();
    
    const diffTime = now.getTime() - start.getTime();
    const diffDaysTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const days = now.getDate() - start.getDate();
    
    const totalMonthsFraction = Math.max(0, months + (days >= 0 ? days / 30 : 0));
    const annualDays = regime === 'micro' ? 15 : 30;
    const monthlyAccrualRate = annualDays / 12;

    const earnedDays = totalMonthsFraction * monthlyAccrualRate;
    const netDays = Math.max(0, earnedDays - takenVacationDays);
    const completedFullMonth = diffDaysTotal >= 30;

    let statusMessage = !completedFullMonth 
      ? 'En periodo inicial (< 1 mes)' 
      : `Proporcional MYPE (${annualDays} días/año)`;

    return {
      totalMonths: Number(totalMonthsFraction.toFixed(1)),
      earnedDays: Number(earnedDays.toFixed(1)),
      netDays: Number(netDays.toFixed(1)),
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
    localStorage.setItem('vya_collaborators_permanent', JSON.stringify(updated));

    setDniInput('');
    setNameInput('');
    setCargoInput('');
    setStartDateInput('');
    setRegimeInput('small');
    setIsEditing(false);
  };

  const handleEditCollaborator = (collab: Collaborator) => {
    setDniInput(collab.dni);
    setNameInput(collab.name);
    setCargoInput(collab.cargo);
    setStartDateInput(collab.startDate);
    setRegimeInput(collab.regime);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCollaborator = (dni: string) => {
    if (!confirm('¿Deseas eliminar este colaborador del maestro?')) return;
    const updated = collaborators.filter(c => c.dni !== dni);
    setCollaborators(updated);
    localStorage.setItem('vya_collaborators_permanent', JSON.stringify(updated));
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
    localStorage.setItem('vya_tareos_permanent', JSON.stringify(updated));
  };

  const handleDeleteTareo = (id: string) => {
    const updated = tareos.filter(t => t.id !== id);
    setTareos(updated);
    localStorage.setItem('vya_tareos_permanent', JSON.stringify(updated));
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
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {isEditing ? '✏️ Editando Colaborador' : 'Directorio del Maestro de Personal'}
              </h2>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDniInput('');
                    setNameInput('');
                    setCargoInput('');
                    setStartDateInput('');
                  }}
                  className="text-xs text-rose-300 bg-rose-950 border border-rose-500 px-3 py-1 rounded-xl"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
            
            <form onSubmit={handleSaveCollaborator} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-indigo-950/60 p-4 rounded-2xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">DNI / CE</label>
                <input 
                  type="text" 
                  placeholder="Ej. 45572820" 
                  value={dniInput} 
                  onChange={(e) => setDniInput(e.target.value)} 
                  disabled={isEditing} 
                  required 
                  className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono disabled:opacity-50" 
                />
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
                <button type="submit" className={`w-full font-bold text-xs py-2 rounded-xl shadow-md ${isEditing ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-teal-500 text-slate-950 hover:bg-teal-400'}`}>
                  {isEditing ? '🔄 Actualizar' : '💾 Guardar'}
                </button>
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
                    <th className="px-4 py-3 text-right">Vacaciones Netas</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => {
                    const collabTareos = tareos.filter(t => t.dni === c.dni);
                    const takenVac = collabTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0);
                    const vac = calculateVacationStatus(c.startDate, c.regime, takenVac);
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
                        <td className="px-4 py-3 text-right font-bold text-fuchsia-300">{vac.netDays} días netos</td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button onClick={() => handleEditCollaborator(c)} title="Editar" className="bg-indigo-900 hover:bg-indigo-800 border border-indigo-400 text-indigo-200 px-2.5 py-1 rounded-lg text-xs">✏️</button>
                          <button onClick={() => handleDeleteCollaborator(c.dni)} title="Eliminar" className="bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-xs">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* PANEL DE REGISTRO RÁPIDO DE TAREO */}
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
                  <option value="descanso">Descanso Compensatorio (Tomado)</option>
                  <option value="vacaciones">Vacaciones (Tomadas)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Proyecto / Código</label>
                <input type="text" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Días</label>
                <input type="number" step="0.5" value={daysWorkedInput} onChange={(e) => setDaysWorkedInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs py-2 rounded-xl shadow-md">+ Registrar Estado</button>
              </div>
            </form>

            {/* MATRIZ DE TAREO & RESUMEN */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Módulo de Asistencia, Tareo & Control de Bolsas (Vacaciones y Descansos)</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Cargo / Régimen</th>
                      <th className="px-4 py-3 text-center">Labores & Descansos Neto</th>
                      <th className="px-4 py-3 text-center text-amber-300">Faltas / Tardanzas / DM</th>
                      <th className="px-4 py-3 text-right">Bolsa Vacacional MYPE (Neto)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {collaborators.map((c) => {
                      const collabTareos = tareos.filter(t => t.dni === c.dni);
                      const totalCampoOficina = collabTareos.filter(t => t.status === 'campo' || t.status === 'oficina').reduce((acc, t) => acc + t.daysWorked, 0);
                      
                      const generatedRest = Number((totalCampoOficina * 0.333).toFixed(1));
                      const takenRest = collabTareos.filter(t => t.status === 'descanso').reduce((acc, t) => acc + t.daysWorked, 0);
                      const netRest = Math.max(0, generatedRest - takenRest);

                      const totalTardanzas = collabTareos.filter(t => t.status === 'tardanza').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalFaltas = collabTareos.filter(t => t.status === 'falto').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalDescansoMedico = collabTareos.filter(t => t.status === 'descanso_medico').reduce((acc, t) => acc + t.daysWorked, 0);
                      
                      const takenVac = collabTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0);
                      const vac = calculateVacationStatus(c.startDate, c.regime, takenVac);

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
                          <td className="px-4 py-3 text-center font-sans">
                            <div className="text-teal-300 font-bold">{totalCampoOficina} días lab.</div>
                            <div className="text-[10px] text-cyan-200 mt-0.5">
                              Descansos: <span className="font-bold">{netRest} días netos</span> ({generatedRest} gen. - {takenRest} tom.)
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-sans">
                            <div className="text-[10px] text-purple-300 space-x-1">
                              {totalFaltas > 0 && <span className="text-rose-400 font-bold">🔴 {totalFaltas} faltas</span>}
                              {totalDescansoMedico > 0 && <span className="text-cyan-300 font-bold">🏥 {totalDescansoMedico} días DM</span>}
                              {totalTardanzas > 0 && <span className="text-amber-300 font-bold">🟡 {totalTardanzas} tard.</span>}
                              {totalFaltas === 0 && totalDescansoMedico === 0 && totalTardanzas === 0 && <span className="text-purple-300/60">Sin incidencias</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-fuchsia-300 font-black text-sm">{vac.netDays} días netos</div>
                            <div className="text-[10px] text-purple-200 font-sans">({vac.earnedDays} acumulados - {takenVac} tomados)</div>
                            <div className="text-[10px] text-cyan-300 font-mono mt-0.5">{vac.statusMessage}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HISTORIAL */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Registros de Tareo & Vacaciones</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Proyecto</th>
                      <th className="px-4 py-3">Estado Registrado</th>
                      <th className="px-4 py-3 text-right">Días</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {tareos.map((t) => (
                      <tr key={t.id} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-purple-300">{t.date}</td>
                        <td className="px-4 py-3 text-white font-sans font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-cyan-300">{t.projectCode}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            t.status === 'vacaciones' ? 'bg-fuchsia-950 border border-fuchsia-500 text-fuchsia-300' :
                            t.status === 'descanso' ? 'bg-teal-950 border border-teal-500 text-teal-300' :
                            t.status === 'falto' ? 'bg-rose-950 border border-rose-500 text-rose-300' :
                            'bg-indigo-900 border border-purple-500 text-purple-200'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-teal-300">{t.daysWorked} días</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleDeleteTareo(t.id)} className="bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-xs">🗑️</button>
                        </td>
                      </tr>
                    ))}
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
