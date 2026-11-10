'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

interface Collaborator {
  dni: string;
  name: string;
  cargo: string;
  startDate: string;
  mypeRegime: 'micro' | 'small';
  initialRestDays: number;
  initialVacationDays: number;
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

interface FatigueRecord {
  id: string;
  dni: string;
  name: string;
  date: string;
  score: number;
  sleepHours: number;
  physicalFatigue: 'Leve' | 'Moderada' | 'Extrema';
  riskLevel: 'APTO (Bajo Riesgo)' | 'ATENCIÓN (Riesgo Moderado)' | 'NO APTO (Alto Riesgo - Descanso Inmediato)';
  declarationAccepted: boolean;
}

export default function TareoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tareo' | 'maestro' | 'fatigue'>('tareo');
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [tareos, setTareos] = useState<TareoRecord[]>([]);
  const [fatigueRecords, setFatigueRecords] = useState<FatigueRecord[]>([]);

  // Estados Maestro
  const [dniInput, setDniInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cargoInput, setCargoInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [mypeRegimeInput, setMypeRegimeInput] = useState<'micro' | 'small'>('small');
  const [initialRestInput, setInitialRestInput] = useState('0');
  const [initialVacInput, setInitialVacInput] = useState('0');
  const [isEditingCollab, setIsEditingCollab] = useState(false);

  // Inputs Tareo Diario y Edición
  const [selectedDni, setSelectedDni] = useState('');
  const [tareoDni, setTareoDni] = useState('');
  const [projectCode, setProjectCode] = useState('PRJ-01');
  const [tareoStatus, setTareoStatus] = useState<'campo' | 'oficina' | 'tardanza' | 'falto' | 'descanso_medico' | 'descanso' | 'vacaciones'>('campo');
  const [daysWorkedInput, setDaysWorkedInput] = useState('1');
  const [tareoDateInput, setTareoDateInput] = useState(new Date().toISOString().slice(0, 10));
  const [editingTareoId, setEditingTareoId] = useState<string | null>(null);

  // Estados Test de Fatiga (Contexto + Escala Epworth + Jurada)
  const [fatigueDni, setFatigueDni] = useState('');
  const [sleepHoursInput, setSleepHoursInput] = useState('7');
  const [physicalFatigueInput, setPhysicalFatigueInput] = useState<'Leve' | 'Moderada' | 'Extrema'>('Leve');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [q1, setQ1] = useState(0);
  const [q2, setQ2] = useState(0);
  const [q3, setQ3] = useState(0);
  const [q4, setQ4] = useState(0);
  const [q5, setQ5] = useState(0);
  const [q6, setQ6] = useState(0);
  const [q7, setQ7] = useState(0);
  const [q8, setQ8] = useState(0);

  // --- CARGA INICIAL CON RECUPERACIÓN Y PERSISTENCIA PERMANENTE ---
  useEffect(() => {
    document.title = "Tareos | V&A Consulting";
    
    try {
      let savedCollabs = localStorage.getItem('vya_collabs_permanent');
      let savedTareos = localStorage.getItem('vya_tareos_permanent');
      let savedFatigue = localStorage.getItem('vya_fatigue_permanent');

      // Rescate automático de versiones anteriores por si acaso
      if (!savedCollabs) {
        for (let i = 20; i >= 1; i--) {
          const old = localStorage.getItem(`vya_collabs_v${i}`);
          if (old) { savedCollabs = old; break; }
        }
      }
      if (!savedTareos) {
        for (let i = 20; i >= 1; i--) {
          const old = localStorage.getItem(`vya_tareos_v${i}`);
          if (old) { savedTareos = old; break; }
        }
      }
      if (!savedFatigue) {
        for (let i = 20; i >= 1; i--) {
          const old = localStorage.getItem(`vya_fatigue_v${i}`);
          if (old) { savedFatigue = old; break; }
        }
      }

      if (savedCollabs) {
        setCollaborators(JSON.parse(savedCollabs));
      } else {
        const defaultCollabs: Collaborator[] = [
          { dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', startDate: '2026-01-08', mypeRegime: 'small', initialRestDays: 0, initialVacationDays: 0 },
          { dni: '45420921', name: 'Jefferson Aliaga Araujo', cargo: 'Gerente de Finanzas', startDate: '2015-01-01', mypeRegime: 'small', initialRestDays: 0, initialVacationDays: 0 }
        ];
        setCollaborators(defaultCollabs);
        localStorage.setItem('vya_collabs_permanent', JSON.stringify(defaultCollabs));
      }

      if (savedTareos) {
        setTareos(JSON.parse(savedTareos));
      } else {
        const defaultTareos: TareoRecord[] = [
          { id: '1', dni: '45572820', name: 'Jorge Luis Robles Tinajeros', cargo: 'Administrativo', projectCode: 'PRJ-01', status: 'campo', daysWorked: 14, date: '2026-09-11' }
        ];
        setTareos(defaultTareos);
        localStorage.setItem('vya_tareos_permanent', JSON.stringify(defaultTareos));
      }

      if (savedFatigue) {
        setFatigueRecords(JSON.parse(savedFatigue));
      }
    } catch (e) {
      console.error("Error al cargar localStorage:", e);
    }

    setLoading(false);
  }, []);

  const calculateVacationStatus = (startDateStr: string, regime: 'micro' | 'small', initialVac: number, takenVacationDays: number) => {
    if (!startDateStr) return { earnedDays: 0, netDays: 0 };
    const start = new Date(startDateStr);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const annualDays = regime === 'micro' ? 15 : 30;
    const earnedDays = Math.max(0, (months + (now.getDate() - start.getDate()) / 30) * (annualDays / 12));
    return { earnedDays: Number(earnedDays.toFixed(1)), netDays: Number(Math.max(0, initialVac + earnedDays - takenVacationDays).toFixed(1)) };
  };

  const calculateRestBalance = (collabTareos: TareoRecord[], initialRest: number) => {
    let generatedRest = 0;
    let continuousFieldDays = 0;

    collabTareos.forEach(t => {
      if (t.status === 'oficina') {
        generatedRest += t.daysWorked * (2 / 5);
        continuousFieldDays = 0;
      } else if (t.status === 'campo') {
        continuousFieldDays += t.daysWorked;
        if (t.daysWorked >= 14) {
          generatedRest += t.daysWorked * 0.5; // Atípico 2x1
        } else {
          generatedRest += t.daysWorked * (2 / 5);
        }
      } else if (t.status === 'descanso') {
        continuousFieldDays = 0;
      }
    });

    const takenRest = collabTareos.filter(t => t.status === 'descanso').reduce((acc, t) => acc + t.daysWorked, 0);
    const totalFaltas = collabTareos.filter(t => t.status === 'falto').reduce((acc, t) => acc + t.daysWorked, 0);
    const netRest = Math.max(0, initialRest + generatedRest - takenRest - totalFaltas);

    return {
      generatedRest: Number(generatedRest.toFixed(1)),
      takenRest,
      totalFaltas,
      netRest: Number(netRest.toFixed(1)),
      continuousFieldDays
    };
  };

  // --- GUARDAR TEST DE FATIGA ---
  const handleSaveFatigueTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fatigueDni) { alert('Seleccione un colaborador.'); return; }
    if (!declarationAccepted) { alert('Debe aceptar la declaración jurada de veracidad.'); return; }

    const collab = collaborators.find(c => c.dni === fatigueDni);
    if (!collab) return;

    const answers = [q1, q2, q3, q4, q5, q6, q7, q8];
    const totalScore = answers.reduce((a, b) => a + b, 0);
    const sleepHours = parseFloat(sleepHoursInput) || 7;

    let riskLevel: FatigueRecord['riskLevel'] = 'APTO (Bajo Riesgo)';
    if ((totalScore >= 11 && totalScore <= 15) || sleepHours < 5) {
      riskLevel = 'ATENCIÓN (Riesgo Moderado)';
    }
    if (totalScore >= 16 || physicalFatigueInput === 'Extrema' || sleepHours < 4) {
      riskLevel = 'NO APTO (Alto Riesgo - Descanso Inmediato)';
    }

    const newRecord: FatigueRecord = {
      id: Date.now().toString(),
      dni: collab.dni,
      name: collab.name,
      date: new Date().toISOString().slice(0, 10),
      score: totalScore,
      sleepHours,
      physicalFatigue: physicalFatigueInput,
      riskLevel,
      declarationAccepted
    };

    const updated = [newRecord, ...fatigueRecords];
    setFatigueRecords(updated);
    localStorage.setItem('vya_fatigue_permanent', JSON.stringify(updated));

    alert(`Test Registrado.\nPuntaje Somnolencia: ${totalScore} pts\nSueño previo: ${sleepHours}h\nDictamen Ocupacional: ${riskLevel}`);
    setDeclarationAccepted(false);
  };

  const handleSaveTareo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareoDni) { alert('Seleccione un colaborador.'); return; }
    const collab = collaborators.find(c => c.dni === tareoDni);
    if (!collab) return;

    let updated: TareoRecord[];
    if (editingTareoId) {
      updated = tareos.map(t => t.id === editingTareoId ? {
        ...t, dni: collab.dni, name: collab.name, cargo: collab.cargo,
        projectCode, status: tareoStatus, daysWorked: parseFloat(daysWorkedInput) || 1, date: tareoDateInput
      } : t);
      setEditingTareoId(null);
      alert('Tareo actualizado con éxito.');
    } else {
      const newRecord: TareoRecord = {
        id: Date.now().toString(), dni: collab.dni, name: collab.name, cargo: collab.cargo,
        projectCode, status: tareoStatus, daysWorked: parseFloat(daysWorkedInput) || 1, date: tareoDateInput,
      };
      updated = [newRecord, ...tareos];
    }
    setTareos(updated);
    localStorage.setItem('vya_tareos_permanent', JSON.stringify(updated));
    setDaysWorkedInput('1');
  };

  const handleEditTareo = (t: TareoRecord) => {
    setEditingTareoId(t.id);
    setTareoDni(t.dni);
    setProjectCode(t.projectCode);
    setTareoStatus(t.status);
    setDaysWorkedInput(t.daysWorked.toString());
    setTareoDateInput(t.date);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleCancelEditTareo = () => {
    setEditingTareoId(null);
    setDaysWorkedInput('1');
  };

  const handleDeleteTareo = (id: string) => {
    if (!confirm('¿Eliminar este registro de tareo?')) return;
    const updated = tareos.filter(t => t.id !== id);
    setTareos(updated);
    localStorage.setItem('vya_tareos_permanent', JSON.stringify(updated));
    if (editingTareoId === id) handleCancelEditTareo();
  };

  const handleSaveCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dniInput || !nameInput || !startDateInput) return;
    const existingIndex = collaborators.findIndex(c => c.dni === dniInput);
    let updated: Collaborator[];
    const newCollab: Collaborator = {
      dni: dniInput, name: nameInput, cargo: cargoInput || 'Operaciones',
      startDate: startDateInput, mypeRegime: mypeRegimeInput,
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
    localStorage.setItem('vya_collabs_permanent', JSON.stringify(updated));
    setDniInput(''); setNameInput(''); setCargoInput(''); setStartDateInput(''); setInitialRestInput('0'); setInitialVacInput('0'); setIsEditingCollab(false);
  };

  const handleEditCollaborator = (collab: Collaborator) => {
    setDniInput(collab.dni); setNameInput(collab.name); setCargoInput(collab.cargo);
    setStartDateInput(collab.startDate); setMypeRegimeInput(collab.mypeRegime);
    setInitialRestInput(collab.initialRestDays.toString()); setInitialVacInput(collab.initialVacationDays.toString());
    setIsEditingCollab(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCollaborator = (dni: string) => {
    if (!confirm('¿Eliminar colaborador?')) return;
    const updated = collaborators.filter(c => c.dni !== dni);
    setCollaborators(updated);
    localStorage.setItem('vya_collabs_permanent', JSON.stringify(updated));
  };

  const handleExportExcel = () => {
    const targetCollabs = selectedDni ? collaborators.filter(c => c.dni === selectedDni) : collaborators;
    const summaryData = targetCollabs.map(c => {
      const cTareos = tareos.filter(t => t.dni === c.dni);
      const rest = calculateRestBalance(cTareos, c.initialRestDays || 0);
      const vac = calculateVacationStatus(c.startDate, c.mypeRegime, c.initialVacationDays || 0, cTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0));
      return {
        'DNI': c.dni, 'Colaborador': c.name, 'Cargo': c.cargo, 'Ingreso': c.startDate,
        'Días Acumulados Campo': rest.continuousFieldDays,
        'Alerta Fatiga (>28d)': rest.continuousFieldDays >= 28 ? '⚠️ REQUIERE TEST OBLIGATORIO' : 'Normal',
        'Descansos Netos (d)': rest.netRest, 'Bolsa Vacacional (d)': vac.netDays
      };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Control Operativo & Fatiga');
    XLSX.writeFile(wb, 'Reporte_Tareo_Fatiga_VA_Consulting.xlsx');
  };

  const displayedCollaborators = selectedDni ? collaborators.filter(c => c.dni === selectedDni) : collaborators;
  const displayedTareos = selectedDni ? tareos.filter(t => t.dni === selectedDni) : tareos;

  if (loading) return null;

  return (
    <main className="min-h-screen text-slate-100 p-6" style={{ backgroundColor: '#130826', backgroundImage: 'linear-gradient(135deg, #130826 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-purple-500/30 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-fuchsia-400 to-cyan-300">
            Tareos
          </h1>
          <p className="text-xs text-purple-200 mt-1">V&A Consulting S.A.C. — Control Operativo, Edición de Tareos & Protocolo SSOMA</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setActiveTab('tareo')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'tareo' ? 'bg-cyan-500 text-slate-950 shadow-lg' : 'bg-indigo-950 text-purple-300 border border-purple-500/30'}`}>
            📋 Tareo
          </button>
          <button onClick={() => setActiveTab('maestro')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'maestro' ? 'bg-teal-400 text-slate-950 shadow-lg' : 'bg-indigo-950 text-purple-300 border border-purple-500/30'}`}>
            👥 Maestro
          </button>
          <button onClick={() => setActiveTab('fatigue')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'fatigue' ? 'bg-rose-500 text-slate-950 shadow-lg' : 'bg-indigo-950 text-rose-300 border border-rose-500/30'}`}>
            🚨 Test de Fatiga (&gt;28d)
          </button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto space-y-6">
        {activeTab === 'maestro' ? (
          <div className="rounded-3xl p-6 shadow-2xl border space-y-6 bg-indigo-950/75 border-purple-500/30">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Directorio del Maestro de Personal</h2>
            <form onSubmit={handleSaveCollaborator} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 bg-indigo-950/60 p-4 rounded-2xl border border-purple-500/30 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">DNI *</label>
                <input type="text" value={dniInput} onChange={(e) => setDniInput(e.target.value)} disabled={isEditingCollab} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Nombre *</label>
                <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Cargo</label>
                <input type="text" value={cargoInput} onChange={(e) => setCargoInput(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">Ingreso *</label>
                <input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">MYPE</label>
                <select value={mypeRegimeInput} onChange={(e) => setMypeRegimeInput(e.target.value as any)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="small">Pequeña (30d)</option>
                  <option value="micro">Micro (15d)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-teal-300 uppercase mb-1">Ini. Descansos</label>
                <input type="number" step="0.5" value={initialRestInput} onChange={(e) => setInitialRestInput(e.target.value)} className="w-full bg-indigo-950 border border-teal-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-fuchsia-300 uppercase mb-1">Ini. Vacaciones</label>
                <input type="number" step="0.5" value={initialVacInput} onChange={(e) => setInitialVacInput(e.target.value)} className="w-full bg-indigo-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono mb-1" />
                <button type="submit" className="w-full font-bold text-xs py-2 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400">Guardar</button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-purple-200">
                <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                  <tr>
                    <th className="px-4 py-3">DNI</th>
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                  {collaborators.map((c) => (
                    <tr key={c.dni} className="hover:bg-indigo-900/30">
                      <td className="px-4 py-3 text-teal-300">{c.dni}</td>
                      <td className="px-4 py-3 text-white font-sans font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-purple-300">{c.cargo}</td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button onClick={() => handleEditCollaborator(c)} className="bg-indigo-900 border border-indigo-400 text-indigo-200 px-2.5 py-1 rounded-lg text-xs">✏️</button>
                        <button onClick={() => handleDeleteCollaborator(c.dni)} className="bg-rose-950 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-xs">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'fatigue' ? (
          <div className="space-y-6">
            <div className="rounded-3xl p-6 shadow-2xl border bg-indigo-950/90 border-rose-500/40 space-y-4">
              <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider">🚨 Test de Evaluación de Fatiga y Somnolencia (Regímenes Atípicos &gt;28 Días)</h2>
              <p className="text-xs text-purple-200">Evaluación obligatoria con validación de contexto físico, horas de sueño y escala Epworth.</p>
              
              <form onSubmit={handleSaveFatigueTest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-200 uppercase mb-1">Seleccionar Colaborador *</label>
                    <select value={fatigueDni} onChange={(e) => setFatigueDni(e.target.value)} required className="w-full bg-indigo-950 border border-rose-500/50 rounded-xl px-3 py-2 text-white text-xs">
                      <option value="">-- Seleccionar Trabajador --</option>
                      {collaborators.map(c => <option key={c.dni} value={c.dni}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-cyan-200 uppercase mb-1">Horas de Sueño Noche Anterior *</label>
                    <input type="number" step="0.5" value={sleepHoursInput} onChange={(e) => setSleepHoursInput(e.target.value)} required className="w-full bg-indigo-950 border border-rose-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-200 uppercase mb-1">Fatiga Física / Muscular *</label>
                    <select value={physicalFatigueInput} onChange={(e) => setPhysicalFatigueInput(e.target.value as any)} className="w-full bg-indigo-950 border border-rose-500/50 rounded-xl px-3 py-2 text-white text-xs">
                      <option value="Leve">Leve</option>
                      <option value="Moderada">Moderada</option>
                      <option value="Extrema">Extrema (Riesgo Crítico)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  {[
                    { label: '1. Sentado y leyendo', val: q1, setVal: setQ1 },
                    { label: '2. Viendo televisión', val: q2, setVal: setQ2 },
                    { label: '3. Sentado inactivo en lugar público', val: q3, setVal: setQ3 },
                    { label: '4. Como pasajero en auto 1 hora', val: q4, setVal: setQ4 },
                    { label: '5. Recostado a descansar por la tarde', val: q5, setVal: setQ5 },
                    { label: '6. Sentado hablando con alguien', val: q6, setVal: setQ6 },
                    { label: '7. Sentado después de almuerzo', val: q7, setVal: setQ7 },
                    { label: '8. En automóvil detenido en tráfico', val: q8, setVal: setQ8 },
                  ].map((item, idx) => (
                    <div key={idx} className="bg-indigo-900/40 p-3 rounded-xl border border-purple-500/30 flex justify-between items-center gap-3">
                      <span className="text-purple-200">{item.label}</span>
                      <select value={item.val} onChange={(e) => item.setVal(Number(e.target.value))} className="bg-indigo-950 border border-rose-400 text-white rounded-lg px-2 py-1 font-mono text-xs">
                        <option value={0}>0 - Nunca</option><option value={1}>1 - Baja</option><option value={2}>2 - Moderada</option><option value={3}>3 - Alta</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-900/50 p-4 rounded-xl border border-rose-500/30 flex items-center gap-3">
                  <input type="checkbox" checked={declarationAccepted} onChange={(e) => setDeclarationAccepted(e.target.checked)} id="decl" className="w-4 h-4 accent-rose-500" />
                  <label htmlFor="decl" className="text-xs text-purple-200 cursor-pointer">
                    Declaro bajo juramento que la información proporcionada sobre mi estado de alerta y descanso es verídica y conforme a los protocolos de seguridad industrial de V&A Consulting S.A.C.
                  </label>
                </div>

                <button type="submit" className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg uppercase">
                  📥 Registrar Dictamen de Aptitud Ocupacional
                </button>
              </form>
            </div>

            <div className="rounded-3xl p-6 shadow-2xl border bg-indigo-950/75 border-purple-500/30 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Evaluaciones de Fatiga</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3 text-center">Puntaje</th>
                      <th className="px-4 py-3 text-center">Sueño / Fatiga Física</th>
                      <th className="px-4 py-3 text-center">Dictamen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {fatigueRecords.map(f => (
                      <tr key={f.id} className="hover:bg-indigo-900/30">
                        <td className="px-4 py-3 text-purple-300">{f.date}</td>
                        <td className="px-4 py-3 text-white font-sans font-medium">{f.name}</td>
                        <td className="px-4 py-3 text-center text-cyan-300">{f.score} pts</td>
                        <td className="px-4 py-3 text-center text-purple-200">{f.sleepHours}h / {f.physicalFatigue}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-300">{f.riskLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* FILTRAR Y EXPORTAR */}
            <div className="bg-indigo-950/50 p-4 rounded-3xl border border-purple-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-1/2 flex items-center gap-3">
                <div className="w-full">
                  <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">🔍 Filtrar por Colaborador</label>
                  <select value={selectedDni} onChange={(e) => setSelectedDni(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                    <option value="">-- Ver Todos los Colaboradores --</option>
                    {collaborators.map(c => <option key={c.dni} value={c.dni}>{c.name} (DNI: {c.dni})</option>)}
                  </select>
                </div>
                {selectedDni && <button onClick={() => setSelectedDni('')} className="text-xs text-teal-300 underline font-bold mt-6 whitespace-nowrap">Mostrar Todos</button>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-300 uppercase mb-1">📊 Reportes Excel</label>
                <button onClick={handleExportExcel} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                  📥 Exportar a Excel con Alertas de Fatiga
                </button>
              </div>
            </div>

            {/* FORMULARIO DE REGISTRO / EDICIÓN DE TAREO */}
            <form onSubmit={handleSaveTareo} className={`grid grid-cols-1 md:grid-cols-6 gap-3 p-5 rounded-3xl border items-end shadow-xl transition-all ${editingTareoId ? 'bg-amber-950/40 border-amber-500/60' : 'bg-indigo-950/80 border-cyan-500/40'}`}>
              <div className="md:col-span-6 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {editingTareoId ? '✏️ Editando Registro de Tareo (Ajuste por Operación en Campo)' : '➕ Nuevo Registro de Tareo Diario / Programación'}
                </h3>
                {editingTareoId && (
                  <button type="button" onClick={handleCancelEditTareo} className="text-[11px] bg-rose-950 border border-rose-500 text-rose-300 px-3 py-1 rounded-lg">
                    Cancelar Edición
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-cyan-200 uppercase mb-1">1. Colaborador *</label>
                <select value={tareoDni} onChange={(e) => setTareoDni(e.target.value)} required className="w-full bg-indigo-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="">-- Seleccione --</option>
                  {collaborators.map(c => <option key={c.dni} value={c.dni}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">2. Estado / Incidencia</label>
                <select value={tareoStatus} onChange={(e) => setTareoStatus(e.target.value as any)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs">
                  <option value="campo">Campo (&gt;=14d atípico 2x1)</option>
                  <option value="oficina">Oficina (5x2)</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="falto">Falta Injustificada</option>
                  <option value="descanso_medico">Descanso Médico</option>
                  <option value="descanso">Descanso Compensatorio</option>
                  <option value="vacaciones">Vacaciones</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">3. Fecha</label>
                <input type="date" value={tareoDateInput} onChange={(e) => setTareoDateInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">4. Proyecto</label>
                <input type="text" value={projectCode} onChange={(e) => setProjectCode(e.target.value)} className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-purple-200 uppercase mb-1">5. Días</label>
                <input type="number" step="0.5" value={daysWorkedInput} onChange={(e) => setDaysWorkedInput(e.target.value)} required className="w-full bg-indigo-950 border border-purple-500/50 rounded-xl px-3 py-2 text-white text-xs font-mono" />
              </div>
              <div>
                <button type="submit" className={`w-full font-black text-xs py-2.5 rounded-xl shadow-lg ${editingTareoId ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' : 'bg-teal-400 hover:bg-teal-300 text-slate-950'}`}>
                  {editingTareoId ? '🔄 Actualizar' : '+ Registrar'}
                </button>
              </div>
            </form>

            {/* MATRIZ DE TAREO */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4 bg-indigo-950/75 border-purple-500/30">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Matriz de Asistencia & Monitoreo de Alertas de Fatiga</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-3 py-3">Colaborador</th>
                      <th className="px-3 py-3 text-center">Días Cont. en Campo</th>
                      <th className="px-3 py-3 text-center">Alerta Fatiga (&gt;28d)</th>
                      <th className="px-3 py-3 text-center text-teal-300">Descansos Netos</th>
                      <th className="px-3 py-3 text-right">Bolsa Vacacional (Neto)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {displayedCollaborators.map((c) => {
                      const collabTareos = tareos.filter(t => t.dni === c.dni);
                      const restBalance = calculateRestBalance(collabTareos, c.initialRestDays || 0);
                      const vac = calculateVacationStatus(c.startDate, c.mypeRegime, c.initialVacationDays || 0, collabTareos.filter(t => t.status === 'vacaciones').reduce((acc, t) => acc + t.daysWorked, 0));

                      return (
                        <tr key={c.dni} className="hover:bg-indigo-900/30">
                          <td className="px-3 py-3 text-white font-sans font-medium">
                            {c.name}
                            <div className="text-[10px] text-purple-300/60 font-mono">DNI: {c.dni}</div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-cyan-300">{restBalance.continuousFieldDays} días</td>
                          <td className="px-3 py-3 text-center">
                            {restBalance.continuousFieldDays >= 28 ? (
                              <span className="bg-rose-950 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse inline-block">
                                🚨 ALERTA OBLIGATORIA (&gt;=28d)
                              </span>
                            ) : (
                              <span className="bg-emerald-950 border border-emerald-500 text-emerald-300 px-2.5 py-1 rounded-lg text-[10px]">Normal</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-teal-200 font-bold">{restBalance.netRest} d</td>
                          <td className="px-3 py-3 text-right text-fuchsia-300 font-bold">{vac.netDays} d</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HISTORIAL CON BOTÓN DE EDICIÓN Y ELIMINACIÓN */}
            <div className="rounded-3xl p-6 shadow-2xl border space-y-4 bg-indigo-950/75 border-purple-500/30">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Historial de Registros de Tareo & Modificaciones Operativas</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-purple-200">
                  <thead className="bg-indigo-950/80 text-purple-300 uppercase text-xs border-b border-purple-500/30">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3">Proyecto</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Días</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20 font-mono text-xs">
                    {displayedTareos.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-4 text-purple-300/50">No hay registros de tareo.</td></tr>
                    ) : (
                      displayedTareos.map((t) => (
                        <tr key={t.id} className={`hover:bg-indigo-900/30 ${editingTareoId === t.id ? 'bg-amber-950/30 border-l-4 border-amber-400' : ''}`}>
                          <td className="px-4 py-3 text-purple-300">{t.date}</td>
                          <td className="px-4 py-3 text-white font-sans font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-cyan-300">{t.projectCode}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-900 border border-purple-500 text-purple-200">
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-teal-300">{t.daysWorked} días</td>
                          <td className="px-4 py-3 text-center space-x-2">
                            <button onClick={() => handleEditTareo(t)} title="Editar Registro" className="bg-indigo-900 hover:bg-indigo-800 border border-indigo-400 text-indigo-200 px-2.5 py-1 rounded-xl text-xs">✏️</button>
                            <button onClick={() => handleDeleteTareo(t.id)} title="Eliminar Registro" className="bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-xl text-xs">🗑️</button>
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
