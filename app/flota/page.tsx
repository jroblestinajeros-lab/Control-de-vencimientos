'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Unidad {
  id?: number;
  placa: string;
  marca_modelo: string;
  km_actual: number;
  km_ultimo_mantenimiento: number;
  fecha_mantenimiento?: string;
  pauta_km: number;
  taller_asignado: string;
  costo_mantenimiento: number;
  vencimiento_soat: string;
  vencimiento_seguro: string;
  vencimiento_revision_tecnica: string;
  lunas_polarizadas: boolean;
  numero_factura_asociada: string;
  observaciones: string;
}

export default function FlotaHome() {
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fechaHoy, setFechaHoy] = useState<string>('');
  const [idEditando, setIdEditando] = useState<number | null>(null);

  // Formulario
  const [placa, setPlaca] = useState('');
  const [marcaModelo, setMarcaModelo] = useState('');
  const [kmActual, setKmActual] = useState('');
  const [kmUltimoMantenimiento, setKmUltimoMantenimiento] = useState('');
  const [fechaMantenimiento, setFechaMantenimiento] = useState('');
  const [pautaKm, setPautaKm] = useState('5000');
  const [tallerAsignado, setTallerAsignado] = useState('');
  const [costoMantenimiento, setCostoMantenimiento] = useState('');
  const [vencimientoSoat, setVencimientoSoat] = useState('');
  const [vencimientoSeguro, setVencimientoSeguro] = useState('');
  const [vencimientoRevisionTecnica, setVencimientoRevisionTecnica] = useState('');
  const [lunasPolarizadas, setLunasPolarizadas] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    setFechaHoy(new Date().toISOString().split('T')[0]);
    cargarUnidades();
  }, []);

  const cargarUnidades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('placa', { ascending: true });

    if (error) console.error('Error al cargar unidades:', error);
    else setUnidades(data || []);
    setLoading(false);
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setPlaca('');
    setMarcaModelo('');
    setKmActual('');
    setKmUltimoMantenimiento('');
    setFechaMantenimiento('');
    setPautaKm('5000');
    setTallerAsignado('');
    setCostoMantenimiento('');
    setVencimientoSoat('');
    setVencimientoSeguro('');
    setVencimientoRevisionTecnica('');
    setLunasPolarizadas(false);
    setNumeroFactura('');
    setObservaciones('');
  };

  // Evalúa si alguna fecha ingresada (Mantenimiento, SOAT, Seguro, RTV) es anterior a Marzo de 2026
  const esRegistroHistoricoAntiguo = () => {
    const limiteHistorico = new Date('2026-03-01').getTime();
    const fechasAEvaluar = [fechaMantenimiento, vencimientoSoat, vencimientoSeguro, vencimientoRevisionTecnica].filter(Boolean);
    if (fechasAEvaluar.length === 0) return false;
    return fechasAEvaluar.some((f) => new Date(f).getTime() < limiteHistorico);
  };

  const guardarUnidad = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!placa) {
      alert('Por favor ingresa la placa.');
      return;
    }

    const payload: Unidad = {
      placa: placa.toUpperCase().trim(),
      marca_modelo: marcaModelo,
      km_actual: kmActual !== '' ? parseInt(kmActual) : 0,
      km_ultimo_mantenimiento: kmUltimoMantenimiento !== '' ? parseInt(kmUltimoMantenimiento) : 0,
      fecha_mantenimiento: fechaMantenimiento,
      pauta_km: parseInt(pautaKm) || 5000,
      taller_asignado: tallerAsignado,
      costo_mantenimiento: parseFloat(costoMantenimiento) || 0,
      vencimiento_soat: vencimientoSoat,
      vencimiento_seguro: vencimientoSeguro,
      vencimiento_revision_tecnica: vencimientoRevisionTecnica,
      lunas_polarizadas: lunasPolarizadas,
      numero_factura_asociada: numeroFactura,
      observaciones,
    };

    if (idEditando) {
      const { error } = await supabase.from('unidades').update(payload).eq('id', idEditando);
      if (error) alert('Error al actualizar: ' + error.message);
      else { limpiarFormulario(); cargarUnidades(); }
    } else {
      const { error } = await supabase.from('unidades').insert([payload]);
      if (error) alert('Error al guardar: ' + error.message);
      else { limpiarFormulario(); cargarUnidades(); }
    }
  };

  const prepararEdicion = (u: Unidad) => {
    if (!u.id) return;
    setIdEditando(u.id);
    setPlaca(u.placa);
    setMarcaModelo(u.marca_modelo || '');
    setKmActual(u.km_actual ? u.km_actual.toString() : '');
    setKmUltimoMantenimiento(u.km_ultimo_mantenimiento ? u.km_ultimo_mantenimiento.toString() : '');
    setFechaMantenimiento(u.fecha_mantenimiento || '');
    setPautaKm(u.pauta_km ? u.pauta_km.toString() : '5000');
    setTallerAsignado(u.taller_asignado || '');
    setCostoMantenimiento(u.costo_mantenimiento?.toString() || '');
    setVencimientoSoat(u.vencimiento_soat || '');
    setVencimientoSeguro(u.vencimiento_seguro || '');
    setVencimientoRevisionTecnica(u.vencimiento_revision_tecnica || '');
    setLunasPolarizadas(u.lunas_polarizadas || false);
    setNumeroFactura(u.numero_factura_asociada || '');
    setObservaciones(u.observaciones || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarUnidad = async (id: number) => {
    if (!confirm('¿Deseas eliminar esta unidad?')) return;
    const { error } = await supabase.from('unidades').delete().eq('id', id);
    if (error) alert('Error al eliminar: ' + error.message);
    else cargarUnidades();
  };

  // Lógica del semáforo legal con reconocimiento de fechas históricas
  const evaluarFechaLegal = (fecha: string) => {
    if (!fecha || !fechaHoy) return { texto: 'Sin registro', color: 'bg-gray-100 text-gray-600' };

    const fechaTimestamp = new Date(fecha).getTime();
    const limiteHistorico = new Date('2026-03-01').getTime();

    if (fechaTimestamp < limiteHistorico) {
      return { texto: 'HISTÓRICO', color: 'bg-slate-200 text-slate-700' };
    }

    const difDias = (fechaTimestamp - new Date(fechaHoy).getTime()) / (1000 * 3600 * 24);
    if (difDias < 0) return { texto: 'VENCIDO', color: 'bg-red-100 text-red-700' };
    if (difDias <= 15) return { texto: 'POR VENCER', color: 'bg-amber-100 text-amber-700' };
    return { texto: 'AL DÍA', color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center flex flex-col items-center justify-center space-y-3">
          <img src="/logo.jpeg" alt="VyA Consulting Logo" className="h-16 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">🚛 Sistema de Mantenimiento de Flota & Control Legal</h1>
          <p className="text-sm text-gray-500">Gestión Integral de Kilometraje, Pautas Mecánicas y Vencimientos Legales (SOAT, Seguro, RTV)</p>
        </div>

        {/* Formulario */}
        <form onSubmit={guardarUnidad} className={`p-6 rounded-xl shadow-sm border space-y-4 ${idEditando ? 'bg-amber-50/50 border-amber-300' : 'bg-white'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-800">{idEditando ? '✏️ Editando Unidad' : '➕ Registrar Nueva Unidad'}</h2>
            {idEditando && <button type="button" onClick={limpiarFormulario} className="text-xs text-red-600 underline font-semibold">✖ Cancelar Edición</button>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
              <input type="text" placeholder="Ej: ABC-123" value={placa} onChange={(e) => setPlaca(e.target.value)} className="w-full p-2 border rounded-lg text-sm uppercase font-bold" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Marca / Modelo</label>
              <input type="text" placeholder="Ej: Toyota Hilux" value={marcaModelo} onChange={(e) => setMarcaModelo(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Km Actual {esRegistroHistoricoAntiguo() ? '(Opcional - Histórico)' : ''}
              </label>
              <input 
                type="number" 
                placeholder="Ej: 45000" 
                value={kmActual} 
                onChange={(e) => setKmActual(e.target.value)} 
                className="w-full p-2 border rounded-lg text-sm font-semibold" 
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Km Último Mantenimiento</label>
              <input type="number" placeholder="Ej: 40000" value={kmUltimoMantenimiento} onChange={(e) => setKmUltimoMantenimiento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha del Mantenimiento</label>
              <input type="date" value={fechaMantenimiento} onChange={(e) => setFechaMantenimiento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Régimen / Pauta (Km)</label>
              <select value={pautaKm} onChange={(e) => setPautaKm(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-semibold">
                <option value="5000">Cada 5,000 Km</option>
                <option value="10000">Cada 10,000 Km</option>
                <option value="15000">Cada 15,000 Km</option>
                <option value="20000">Cada 20,000 Km</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Taller Asignado</label>
              <input type="text" placeholder="Nombre del Taller" value={tallerAsignado} onChange={(e) => setTallerAsignado(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Costo Mantenimiento (S/)</label>
              <input type="number" step="0.01" placeholder="0.00" value={costoMantenimiento} onChange={(e) => setCostoMantenimiento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° Factura Asociada</label>
              <input type="text" placeholder="Ej: F001-987" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vencimiento SOAT</label>
              <input type="date" value={vencimientoSoat} onChange={(e) => setVencimientoSoat(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vencimiento Póliza Seguro</label>
              <input type="date" value={vencimientoSeguro} onChange={(e) => setVencimientoSeguro(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vencimiento Inspección Técnica</label>
              <input type="date" value={vencimientoRevisionTecnica} onChange={(e) => setVencimientoRevisionTecnica(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div className="flex items-center space-x-2 pt-5">
              <input type="checkbox" id="lunas" checked={lunasPolarizadas} onChange={(e) => setLunasPolarizadas(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
              <label htmlFor="lunas" className="text-xs font-medium text-gray-700">¿Lunas Polarizadas autorizadas?</label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones Técnicas</label>
            <input type="text" placeholder="Comentarios adicionales" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
          </div>

          <button type="submit" className={`font-semibold py-2 px-6 rounded-lg shadow text-white ${idEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {idEditando ? '💾 Actualizar Unidad' : '➕ Registrar Unidad'}
          </button>
        </form>

        {/* Tabla de Unidades */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Estado de la Flota</h2>

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Cargando flota...</p>
          ) : unidades.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No hay unidades registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <th className="p-3">Placa / Modelo</th>
                    <th className="p-3">Km Actual</th>
                    <th className="p-3">Pauta Mecánica</th>
                    <th className="p-3">Próximo Mantenimiento</th>
                    <th className="p-3">Semáforo Mecánico</th>
                    <th className="p-3">SOAT</th>
                    <th className="p-3">Seguro</th>
                    <th className="p-3">Rev. Técnica</th>
                    <th className="p-3">Lunas</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unidades.map((u) => {
                    const proxKm = u.km_ultimo_mantenimiento + u.pauta_km;
                    const faltanKm = proxKm - u.km_actual;
                    
                    let estadoMecanico = { texto: `Ok (Faltan ${faltanKm.toLocaleString()} km)`, color: 'bg-emerald-100 text-emerald-700' };
                    
                    if (u.km_actual === 0 && u.km_ultimo_mantenimiento === 0) {
                      estadoMecanico = { texto: 'Sin registro de Km (Histórico)', color: 'bg-gray-100 text-gray-600' };
                    } else if (u.km_actual === 0) {
                      estadoMecanico = { texto: 'Histórico (Sin Km Actual)', color: 'bg-blue-100 text-blue-700' };
                    } else if (faltanKm < 0) {
                      estadoMecanico = { texto: `VENCIDO (${Math.abs(faltanKm).toLocaleString()} km pasados)`, color: 'bg-red-100 text-red-700' };
                    } else if (faltanKm <= 1000) {
                      estadoMecanico = { texto: `ALERTA (Faltan ${faltanKm.toLocaleString()} km)`, color: 'bg-amber-100 text-amber-700' };
                    }

                    const soat = evaluarFechaLegal(u.vencimiento_soat);
                    const seguro = evaluarFechaLegal(u.vencimiento_seguro);
                    const rtv = evaluarFechaLegal(u.vencimiento_revision_tecnica);

                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{u.placa}<br/><span className="font-normal text-gray-500 text-[10px]">{u.marca_modelo}</span></td>
                        <td className="p-3 font-semibold">{u.km_actual > 0 ? `${u.km_actual.toLocaleString()} km` : 'Sin registro'}</td>
                        <td className="p-3">{u.pauta_km ? `${u.pauta_km.toLocaleString()} km` : '5,000 km'}</td>
                        <td className="p-3 font-medium">
                          {proxKm > 0 ? `${proxKm.toLocaleString()} km` : 'Sin registro'}
                          {u.fecha_mantenimiento && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              Último: {u.fecha_mantenimiento}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${estadoMecanico.color}`}>
                            {estadoMecanico.texto}
                          </span>
                        </td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${soat.color}`}>{soat.texto}</span></td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${seguro.color}`}>{seguro.texto}</span></td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rtv.color}`}>{rtv.texto}</span></td>
                        <td className="p-3 font-bold">{u.lunas_polarizadas ? '✔️ Sí' : '❌ No'}</td>
                        <td className="p-3 text-center space-x-2">
                          {u.id && (
                            <>
                              <button onClick={() => prepararEdicion(u)} className="text-amber-600 font-semibold hover:underline">✏️ Editar</button>
                              <span className="text-gray-300">|</span>
                              <button onClick={() => eliminarUnidad(u.id!)} className="text-red-600 font-semibold hover:underline">🗑️ Borrar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
