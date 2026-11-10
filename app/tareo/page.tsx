'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Collaborator {
  dni: string;
  name: string;
  cargo: string;
  startDate: string; // Formato YYYY-MM-DD
  mypeRegime: 'micro' | 'small'; // micro = 15d, small = 30d
  initialRestDays: number; // Saldo inicial o corte de descansos
  initialVacationDays: number; // Saldo inicial o corte de vacaciones
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
  const [mypeRegimeInput, setMypeRegimeInput] = useState<'micro' | 'small'>('small');
  const [initialRestInput, setInitialRestInput] = useState('0');
  const [initialVacInput, setInitialVacInput] = useState('0');
  const [isEditing, setIsEditing] = useState(false);

  // Inputs Tareo Diario y Filtro
  const [selectedDni, setSelectedDni] = useState('');
  const [tareoDni, setTareoDni] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-01');
  const [tareoStatus, setTareoStatus] = useState<'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso' | 'vacaciones'>('campo');
  const [daysWorkedInput, setDaysWorkedInput] = useState('1');
  const [tareoDateInput, setTareoDateInput] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    document.title = "Módulo Operativo de Tareo & Vacaciones POL-RH-004 | V&A Consulting";
    
    const savedCollabs = localStorage.getItem('vya_collabs_v11');
    const savedTareos = localStorage.getItem('vya_tareos_v11');

    if (savedCollabs) {
      try { setCollaborators(JSON.parse(savedCollabs)); } catch (e) { setCollaborators([]); }
    } else {
      const defaultCollabs: Collaborator[] = [
        { dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', startDate: '2026-01-08', mypeRegime: 'small', initialRestDays: 0, initialVacationDays: 0 },
        { dni: '45420921', name: 'Jefferson Aliaga Araujo', cargo: 'Gerente de Finanzas', startDate: '2015-01-01', mypeRegime: 'small', initialRestDays: 0, initialVacationDays: 0 },
        { dni: '47891234', name: 'Carlos Mendoza', cargo: 'Técnico Batimetrista', startDate: '2026-08-01', mypeRegime: 'micro', initialRestDays: 0, initialVacationDays: 0 }
      ];
      setCollaborators(defaultCollabs);
      localStorage.setItem('vya_collabs_v11', JSON.stringify(defaultCollabs));
    }

    if (savedTareos) {
      try { setTareos(JSON.parse(savedTareos)); } catch (e) { setTareos([]); }
    } else {
      const defaultTareos: TareoRecord[] = [
        { id: '1', dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', projectCode: 'PRJ-01', status: 'campo', daysWorked: 14, date: '2026-09-11' }
      ];
      setTareos(defaultTareos);
      localStorage.setItem('vya_tareos_v11', JSON.stringify(defaultTareos));
    }

    setLoading(false);
  }, []);

  // --- CÁLCULO DE VACACIONES MYPE ---
  const calculateVacationStatus = (startDateStr: string, regime: 'micro' | 'small', initialVac: number, takenVacationDays: number) => {
    if (!startDateStr) return { earnedDays: 0, netDays: 0, totalMonths: 0 };
    
    const start = new Date(startDateStr);
    const now = new Date();
    
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const days = now.getDate() - start.getDate();
    
    const totalMonthsFraction = Math.max(0, months + (days >= 0 ? days / 30 : 0));
    const annualDays = regime === 'micro' ? 15 : 30;
    const monthlyAccrualRate = annualDays / 12;

    const earnedDays = totalMonthsFraction * monthlyAccrualRate;
    const netDays = Math.max(0, initialVac + earnedDays - takenVacationDays);

    return {
      totalMonths: Number(totalMonthsFraction.toFixed(1)),
      earnedDays: Number(earnedDays.toFixed(1)),
      netDays: Number(netDays.toFixed(1))
    };
  };

  // --- CÁLCULO DE DESCANSOS (POL-RH-004) ---
  const calculateRestBalance = (collabTareos: TareoRecord[], initialRest: number) => {
    let generatedRest = 0;

    collabTareos.forEach(t => {
      if (t.status === 'oficina') {
        generatedRest += t.daysWorked * (2 / 5);
      } else if (t.status === 'campo') {
        if (t.daysWorked >= 14) {
          generatedRest += t.daysWorked * 0.5; // Atípico 2x1
        } else {
          generatedRest += t.daysWorked * (2 / 5); // Corto / Oficina 5x2
        }
      }
    });

    const takenRest = collabTareos.filter(t => t.status === 'descanso').reduce((acc, t) => acc + t.daysWorked, 0);
    const totalFaltas = collabTareos.filter(t => t.status === 'falto').reduce((acc, t) => acc + t.daysWorked, 0);
    const netRest = Math.max(0, initialRest + generatedRest - takenRest - totalFaltas);

    return {
      generatedRest: Number(generatedRest.toFixed(1)),
      takenRest,
      totalFaltas,
      netRest: Number(netRest.toFixed(1))
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
      mypeRegime: mypeRegimeInput,
      initialRestDays: parseFloat(initialRestInput) || 0,
      initialVacationDays: parseFloat(initialVacInput) || 0
    };

    if (existingIndex >= 0) {
      updated = [...collaborators];
      updated[existingIndex] = newCollab;
    } else {
      updated = [newCollab, ...collaborators];
    }

    setCollaborators(updated);
    localStorage.setItem('vya_collabs_v11', JSON.stringify(updated));

    setDniInput('');
    setNameInput('');
    setCargoInput('');
    setStartDateInput('');
    setMypeRegimeInput('small');
    setInitialRestInput('0');
    setInitialVacInput('0');
    setIsEditing(false);
  };

  const handleEditCollaborator = (collab: Collaborator) => {
    setDniInput(collab.dni);
    setNameInput(collab.name);
    setCargoInput(collab.cargo);
    setStartDateInput(collab.startDate);
    setMypeRegimeInput(collab.mypeRegime);
    setInitialRestInput(collab.initialRestDays.toString());
    setInitialVacInput(collab.initialVacationDays.toString());
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCollaborator = (dni: string) => {
    if (!confirm('¿Deseas eliminar este colaborador del maestro?')) return;
    const updated = collaborators.filter(c => c.dni !== dni);
    setCollaborators(updated);
    localStorage.setItem('vya_collabs_v11', JSON.stringify(updated));
  };

  const handleAddTareo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareoDni) {
      alert('Por favor seleccione un colaborador.');
      return;
    }

    const collab = collaborators.find(c => c.dni === tareoDni);
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
      date: tareoDateInput,
    };

    const updated = [newRecord, ...tareos];
    setTareos(updated);
    localStorage.setItem('vya_tareos_v11', JSON.stringify(updated));
  };

  const handleDeleteTareo = (id: string) => {
    const updated = tareos.filter(t => t.id !== id);
    setTareos(updated);
    localStorage.setItem('vya_tareos_v11', JSON.stringify(updated));
  };

  // --- FUNCIÓN DE EXPORTACIÓN A EXCEL ---
  const handleExportExcel = () => {
    const targetCollabs = selectedDni 
      ? collaborators.filter(c => c.dni === selectedDni)
      : collaborators;

    const targetTareos = selectedDni
      ? tareos.filter(t => t.dni === selectedDni)
      : tareos;

    // 1. Hoja de Resumen de Saldos (Matriz)
    const summaryData = targetCollabs.map(c => {
      const cTareos = tareos.filter(t => t.dni === c.dni);
      const totalLab = cTareos.filter(t => t.status === 'campo' || t.status === 'oficina').reduce((acc, t) => acc + t.daysWorked, 0);
      const rest = calculateRestBalance(cTareos, c.initialRestDays || 0);
      const vac = calculateVacationStatus(c.startDate, c.mypeRegime, c.initialVacationDays || 0, cTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0));
      const tardanzas = cTareos.filter(t => t.status === 'tardanza').reduce((acc, t) => acc + t.daysWorked, 0);
      const medicos = cTareos.filter(t => t.status === 'descanso_medico').reduce((acc, t) => acc + t.daysWorked, 0);

      return {
        'DNI': c.dni,
        'Colaborador': c.name,
        'Cargo': c.cargo,
        'Fecha de Ingreso': c.startDate,
        'Régimen MYPE': c.mypeRegime === 'micro' ? 'Microempresa (15d)' : 'Pequeña Empresa (30d)',
        'Días Laborados Total': totalLab,
        'Descansos Netos (Días)': rest.netRest,
        'Faltas Injustificadas (Días)': rest.totalFaltas,
        'Tardanzas (Días)': tardanzas,
        'Descanso Médico (Días)': medicos,
        'Bolsa Vacacional Netos (Días)': vac.netDays
      };
    });

    // 2. Hoja de Historial de Registros Detallados
    const historyData = targetTareos.map(t => ({
      'Fecha': t.date,
      'DNI': t.dni,
      'Colaborador': t.name,
      'Cargo': t.cargo,
      'Código de Proyecto': t.projectCode,
      'Estado / Incidencia': t.status.toUpperCase().replace('_', ' '),
      'Días Registrados': t.daysWorked
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsHistory = XLSX.utils.json_to_sheet(historyData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen y Saldos');
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Historial Detallado');

    const fileName = selectedDni 
      ? `Reporte_Tareo_Colaborador_${selectedDni}.xlsx` 
      : `Reporte_Consolidado_Tareo_VA_Consulting.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const displayedCollaborators = selectedDni 
    ? collaborators.filter(c => c.dni === selectedDni) 
    : collaborators;

  const displayedTareos = selectedDni 
    ? tareos.filter(t => t.dni === selectedDni) 
    : tareos;

  if (loading) return null;

  return (
    <main className="min-h-screen text-slate-100 p-6" style={{ backgroundColor: '#130826', backgroundImage: 'linear-gradient(135deg, #130826 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-purple-500/30 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-fuchsia-400 to-cyan-300">
            Módulo Operativo de Tareo POL-RH-004 & Vacaciones MYPE
          </h1>
          <p className="text-xs text-purple-200 mt-1">V&A Consulting S.A.C. — Control de Asistencia, Descansos & Exportación Excel</p>
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
                {isEditing ? '✏️ Editando Colaborador' : 'Directorio del Maestro (Saldos de Corte Inicial)'}
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
                    setInitialRestInput('0');
                    setInitialVacInput('0');
                  }}
                  className="text-xs text-rose-300 bg-rose-950 border border-rose-500 px-3 py-1 rounded-xl"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
            
            <form onSubmit={handleSaveCollaborator} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 bg-indigo-950/60 p-4 rounded-2xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">DNI / CE *</label>
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
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Nombre Completo *</label>
                <input type="text" placeholder="Ej. Jorge Robles" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Cargo</label>
                <input type="text" placeholder="Ej. Logística" value={cargoInput} onChange={(e) => setCargoInput(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Fecha Ingreso *</label>
                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Régimen MYPE</label>
                <select value={mypeRegimeInput} onChange={(e) => setMypeRegimeInput(e.target.value as any)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="small">Pequeña (30d)</option>
                  <option value="micro">Micro (15d)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-teal-300 uppercase mb-1">Saldo Ini. Descansos</label>
                <input type="number" step="0.5" value={initialRestInput} onChange={(e) => setInitialRestInput(e.target.value)} className="w-full bg-indigo-950 border border-teal-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-fuchsia-300 uppercase mb-1">Saldo Ini. Vacaciones</label>
                <input type="number" step="0.5" value={initialVacInput} onChange={(e) => setInitialVacInput(e.target.value)} className="w-full bg-indigo-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono mb-1" />
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
                    <th className="px-4 py-3">Cargo / Ingreso</th>
                    <th className="px-4 py-3">Régimen MYPE</th>
                    <th className="px-4 py-3 text-center text-teal-300">Descansos Corte (Ini)</th>
                    <th className="px-4 py-3 text-center text-fuchsia-300">Vacaciones Corte (Ini)</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => (
                    <tr key={c.dni} className="hover:bg-indigo-900/30">
                      <td className="px-4 py-3 text-teal-300">{c.dni}</td>
                      <td className="px-4 py-3 text-white font-sans font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-purple-300">
                        {c.cargo}
                        <div className="text-[10px] text-purple-300/60 font-mono">Ingreso: {c.startDate}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${c.mypeRegime === 'micro' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-cyan-950 border-cyan-400 text-cyan-300'}`}>
                          {c.mypeRegime === 'micro' ? 'Micro (15d)' : 'Pequeña (30d)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-teal-200">{c.initialRestDays ?? 0} d</td>
                      <td className="px-4 py-3 text-center font-bold text-fuchsia-300">{c.initialVacationDays ?? 0} d</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={() => handleEditCollaborator(c)} title="Editar" className="bg-indigo-900 hover:bg-indigo-800 border border-indigo-400 text-indigo-200 px-2.5 py-1 rounded-lg text-xs">✏️</button>
                        <button onClick={() => handleDeleteCollaborator(c.dni)} title="Eliminar" className="bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-xs">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* FILTRAR Y EXPORTAR */}
            <div className="bg-indigo-950/50 p-4 rounded-3xl border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-1/2 flex items-center gap-3">
                <div className="w-full">
                  <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">🔍 Filtrar Resumen y Matriz por Colaborador</label>
                  <select value={selectedDni} onChange={(e) => setSelectedDni(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                    <option value="">-- Ver Todos los Colaboradores --</option>
                    {collaborators.map(c => (
                      <option key={c.dni} value={c.dni}>{c.name} (DNI: {c.dni})</option>
                    ))}
                  </select>
                </div>
                {selectedDni && (
                  <button onClick={() => setSelectedDni('')} className="text-xs text-teal-300 underline font-bold mt-6 whitespace-nowrap">
                    Mostrar Todos
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">📊 Reportes Excel</label>
                <button 
                  onClick={handleExportExcel}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all"
                >
                  📥 Exportar a Excel {selectedDni ? '(Filtrado)' : '(Consolidado)'}
                </button>
              </div>
            </div>

            {/* FORMULARIO DE REGISTRO */}
            <form onSubmit={handleAddTareo} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-indigo-950/80 p-5 rounded-3xl border border-cyan-500/40 items-end shadow-xl">
              <div>
                <label className="block text-[11px] font-semibold text-cyan-200 uppercase mb-1">1. Seleccionar Colaborador *</label>
                <select value={tareoDni} onChange={(e) => setTareoDni(e.target.value)} required className="w-full bg-indigo-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="">-- Seleccione Colaborador --</option>
                  {collaborators.map(c => (
                    <option key={c.dni} value={c.dni}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">2. Estado / Incidencia</label>
                <select value={tareoStatus} onChange={(e) => setTareoStatus(e.target.value as any)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="campo">Campo (&gt;= 14d aplica 2x1, &lt; 14d aplica 5x2)</option>
                  <option value="oficina">Oficina (Aplica regla 5x2)</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="falto">Falta Injustificada (Descuenta Descansos)</option>
                  <option value="descanso_medico">Descanso Médico</option>
                  <option value="descanso">Descanso Compensatorio (Tomado)</option>
                  <option value="vacaciones">Vacaciones (Tomadas)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">3. Fecha del Registro</label>
                <input type="date" value={tareoDateInput} onChange={(e) => setTareoDateInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">4. Proyecto / Código</label>
                <input type="text" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">5. Días (Bloque)</label>
                <input type="number" step="0.5" value={daysWorkedInput} onChange={(e) => setDaysWorkedInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <button type="submit" className="w-full bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-lg">+ Registrar</button>
              </div>
            </form>

            {/* MATRIZ DE TAREO */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4" style={{ backgroundColor: 'rgba(30, 27, 75, 0.75)', borderColor: 'rgba(217, 70, 239, 0.3)' }}>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Módulo de Asistencia & Control de Descansos (POL-RH-004)</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-3 py-3">Colaborador</th>
                      <th className="px-3 py-3">Cargo / Régimen</th>
                      <th className="px-3 py-3 text-center">Días Lab.</th>
                      <th className="px-3 py-3 text-center text-teal-300">Descansos Netos</th>
                      <th className="px-3 py-3 text-center text-rose-300">Faltas (Descuento)</th>
                      <th className="px-3 py-3 text-center text-amber-300">Tardanzas</th>
                      <th className="px-3 py-3 text-center text-cyan-300">Desc. Médico</th>
                      <th className="px-3 py-3 text-right">Bolsa Vacacional MYPE (Neto)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {displayedCollaborators.map((c) => {
                      const collabTareos = tareos.filter(t => t.dni === c.dni);
                      const totalCampoOficina = collabTareos.filter(t => t.status === 'campo' || t.status === 'oficina').reduce((acc, t) => acc + t.daysWorked, 0);
                      
                      const restBalance = calculateRestBalance(collabTareos, c.initialRestDays || 0);
                      const totalTardanzas = collabTareos.filter(t => t.status === 'tardanza').reduce((acc, t) => acc + t.daysWorked, 0);
                      const totalDescansoMedico = collabTareos.filter(t => t.status === 'descanso_medico').reduce((acc, t) => acc + t.daysWorked, 0);
                      
                      const takenVac = collabTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0);
                      const vac = calculateVacationStatus(c.startDate, c.mypeRegime, c.initialVacationDays || 0, takenVac);

                      return (
                        <tr key={c.dni} className="hover:bg-indigo-900/30">
                          <td className="px-3 py-3 text-white font-sans font-medium">
                            {c.name}
                            <div className="text-[10px] text-purple-300/60 font-mono">DNI: {c.dni} | Ingreso: {c.startDate}</div>
                          </td>
                          <td className="px-3 py-3 font-sans">
                            <div className="text-purple-200 font-medium">{c.cargo}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] border bg-cyan-950 border-cyan-400 text-cyan-300">
                              {c.mypeRegime === 'micro' ? 'Micro (15d)' : 'Pequeña (30d)'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-teal-300 font-bold">{totalCampoOficina} d</td>
                          <td className="px-3 py-3 text-center text-teal-200 font-bold">
                            {restBalance.netRest} d
                            <div className="text-[9px] text-purple-300/60">({c.initialRestDays || 0}i + {restBalance.generatedRest}g - {restBalance.takenRest}t - {restBalance.totalFaltas}f)</div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-rose-400">
                            {restBalance.totalFaltas > 0 ? `${restBalance.totalFaltas} d` : <span className="text-purple-300/30">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-amber-300">
                            {totalTardanzas > 0 ? `${totalTardanzas} d` : <span className="text-purple-300/30">0</span>}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-cyan-300">
                            {totalDescansoMedico > 0 ? `${totalDescansoMedico} d` : <span className="text-purple-300/30">0</span>}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="text-fuchsia-300 font-black text-sm">{vac.netDays} días netos</div>
                            <div className="text-[10px] text-purple-200 font-sans">({c.initialVacationDays || 0}ini + {vac.earnedDays}ac - {takenVac}tom)</div>
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
                    {displayedTareos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-purple-300/50">No hay registros de tareo.</td>
                      </tr>
                    ) : (
                      displayedTareos.map((t) => (
                        <tr key={t.id} className="hover:bg-indigo-900/30">
                          <td className="px-4 py-3 text-purple-300">{t.date}</td>
                          <td className="px-4 py-3 text-white font-sans font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-cyan-300">{t.projectCode}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              t.status === 'vacaciones' ? 'bg-fuchsia-950 border border-fuchsia-500 text-fuchsia-300' :
                              t.status === 'descanso' ? 'bg-teal-950 border border-teal-500 text-teal-300' :
                              t.status === 'falto' ? 'bg-rose-950 border border-rose-500 text-rose-300' :
                              t.status === 'descanso_medico' ? 'bg-cyan-950 border border-cyan-500 text-cyan-300' :
                              t.status === 'tardanza' ? 'bg-amber-950 border border-amber-500 text-amber-300' :
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
                      ))
                    )}
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
