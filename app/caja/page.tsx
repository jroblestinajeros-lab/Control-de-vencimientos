'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Clave de administración
const CLAVE_ADMIN = 'vya2026';

interface RegistroCaja {
  id?: number;
  numero_caja: string;
  responsable: string;
  codigo_proyecto: string;
  saldo_inicial: number;
  moneda: string;
  fecha_documento?: string;
  tipo_documento?: string;
  numero_documento?: string;
  tipo_gasto?: string;
  monto_gasto?: number;
  proveedor_detalle?: string;
  observaciones?: string;
  estado_caja?: string;
}

export default function CajaChicaHome() {
  const [registros, setRegistros] = useState<RegistroCaja[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [esAdmin, setEsAdmin] = useState<boolean>(false);

  // Filtro por Código de Proyecto Activo
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');

  // Formulario 1: Apertura de Caja por Proyecto
  const [numeroCaja, setNumeroCaja] = useState<string>('');
  const [responsable, setResponsable] = useState<string>('');
  const [saldoInicial, setSaldoInicial] = useState<string>('');
  const [moneda, setMoneda] = useState<string>('PEN');

  // Formulario 2: Registro de Comprobante / Gasto
  const [fechaDocumento, setFechaDocumento] = useState<string>('');
  const [tipoDocumento, setTipoDocumento] = useState<string>('Factura');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [tipoGasto, setTipoGasto] = useState<string>('Combustible');
  const [montoGasto, setMontoGasto] = useState<string>('');
  const [proveedorDetalle, setProveedorDetalle] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  useEffect(() => {
    cargarRegistros();
  }, []);

  // Al seleccionar/escribir el Código de Proyecto, autocompletar la cabecera asignada por el Admin
  useEffect(() => {
    if (!proyectoSeleccionado) {
      setNumeroCaja('');
      setResponsable('');
      setSaldoInicial('');
      return;
    }
    const cajaExistente = registros.find(
      (r) => (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim()
    );
    if (cajaExistente) {
      setNumeroCaja(cajaExistente.numero_caja || '');
      setResponsable(cajaExistente.responsable || '');
      setSaldoInicial(cajaExistente.saldo_inicial?.toString() || '0');
      setMoneda(cajaExistente.moneda || 'PEN');
    }
  }, [proyectoSeleccionado, registros]);

  const cargarRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cajas_chicas')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) console.error('Error al cargar caja chica:', error);
    else setRegistros(data || []);
    setLoading(false);
  };

  const solicitarAccesoAdmin = () => {
    if (esAdmin) {
      setEsAdmin(false);
      alert('Modo Administrador desactivado.');
      return;
    }
    const pass = prompt('Ingresa la contraseña de Administrador (vya2026) para asignar saldos iniciales por proyecto y realizar cierres:');
    if (pass === CLAVE_ADMIN) {
      setEsAdmin(true);
      alert('Modo Administrador ACTIVADO.');
    } else if (pass !== null) {
      alert('Contraseña incorrecta.');
    }
  };

  const limpiarFormularioGasto = () => {
    setIdEditando(null);
    setFechaDocumento('');
    setNumeroDocumento('');
    setMontoGasto('');
    setProveedorDetalle('');
    setObservaciones('');
  };

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cajaEstaCerrada) {
      alert('La caja chica de este proyecto se encuentra CERRADA / LIQUIDADA.');
      return;
    }

    if (!proyectoSeleccionado || !responsable || !montoGasto) {
      alert('Por favor especifica el Código de Proyecto, Responsable y Monto del Gasto.');
      return;
    }

    const payload: RegistroCaja = {
      codigo_proyecto: proyectoSeleccionado.toUpperCase().trim(),
      numero_caja: numeroCaja.toUpperCase().trim() || `CCH-${proyectoSeleccionado.toUpperCase().trim()}`,
      responsable,
      saldo_inicial: parseFloat(saldoInicial) || 0,
      moneda,
      fecha_documento: fechaDocumento,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      tipo_gasto: tipoGasto,
      monto_gasto: parseFloat(montoGasto) || 0,
      proveedor_detalle: proveedorDetalle,
      observaciones,
      estado_caja: 'Abierta',
    };

    if (idEditando) {
      const { error } = await supabase.from('cajas_chicas').update(payload).eq('id', idEditando);
      if (error) alert('Error al actualizar: ' + error.message);
      else { limpiarFormularioGasto(); cargarRegistros(); }
    } else {
      const { error } = await supabase.from('cajas_chicas').insert([payload]);
      if (error) alert('Error al guardar: ' + error.message);
      else { limpiarFormularioGasto(); cargarRegistros(); }
    }
  };

  const cambiarEstadoCaja = async (nuevoEstado: string) => {
    if (!esAdmin) {
      alert('Acceso denegado. Activa el MODO ADMINISTRADOR para cerrar o reabrir la caja del proyecto.');
      return;
    }

    if (!proyectoSeleccionado) {
      alert('Ingresa o selecciona un Código de Proyecto.');
      return;
    }

    const prjTarget = proyectoSeleccionado.toUpperCase().trim();

    if (!confirm(`¿Estás seguro de cambiar el estado de la caja del proyecto ${prjTarget} a "${nuevoEstado}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('cajas_chicas')
      .update({ estado_caja: nuevoEstado })
      .eq('codigo_proyecto', prjTarget);

    if (error) {
      alert('Error al actualizar el estado: ' + error.message);
    } else {
      cargarRegistros();
    }
  };

  const prepararEdicion = (r: RegistroCaja) => {
    if (r.estado_caja === 'Cerrada') {
      alert('No se puede editar un comprobante de una caja CERRADA.');
      return;
    }
    if (!r.id) return;
    setIdEditando(r.id);
    setProyectoSeleccionado(r.codigo_proyecto);
    setNumeroCaja(r.numero_caja || '');
    setResponsable(r.responsable);
    setSaldoInicial(r.saldo_inicial.toString());
    setMoneda(r.moneda);
    setFechaDocumento(r.fecha_documento || '');
    setTipoDocumento(r.tipo_documento || 'Factura');
    setNumeroDocumento(r.numero_documento || '');
    setTipoGasto(r.tipo_gasto || 'Combustible');
    setMontoGasto(r.monto_gasto?.toString() || '');
    setProveedorDetalle(r.proveedor_detalle || '');
    setObservaciones(r.observaciones || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarRegistro = async (r: RegistroCaja) => {
    if (r.estado_caja === 'Cerrada') {
      alert('No se puede eliminar un comprobante de una caja CERRADA.');
      return;
    }
    if (!confirm('¿Seguro de que deseas borrar este gasto?')) return;
    const { error } = await supabase.from('cajas_chicas').delete().eq('id', r.id!);
    if (error) alert('Error al eliminar: ' + error.message);
    else cargarRegistros();
  };

  const exportarAExcel = () => {
    if (!registrosFiltrados || registrosFiltrados.length === 0) {
      alert('No hay comprobantes cargados para este proyecto.');
      return;
    }

    const datosExcel = registrosFiltrados.map((r) => ({
      'Código Proyecto': r.codigo_proyecto,
      'N° Caja': r.numero_caja,
      'Responsable': r.responsable,
      'Moneda': r.moneda,
      'Saldo Inicial Asignado': r.saldo_inicial,
      'Fecha Doc.': r.fecha_documento,
      'Tipo Doc.': r.tipo_documento,
      'N° Comprobante': r.numero_documento,
      'Tipo Gasto': r.tipo_gasto,
      'Proveedor / Detalle': r.proveedor_detalle,
      'Monto Gasto': r.monto_gasto,
      'Observaciones': r.observaciones,
      'Estado Caja': r.estado_caja || 'Abierta'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Liquidacion_Proyecto');

    XLSX.writeFile(workbook, `Rendicion_Proyecto_${proyectoSeleccionado || 'General'}.xlsx`);
  };

  // Filtrar comprobantes por Código de Proyecto
  const registrosFiltrados = proyectoSeleccionado 
    ? registros.filter((r) => (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim())
    : [];

  const primerRegistro = registrosFiltrados[0];
  const saldoInicialAsignado = primerRegistro ? primerRegistro.saldo_inicial : (parseFloat(saldoInicial) || 0);
  const totalGastosRendidos = registrosFiltrados.reduce((acc, r) => acc + (r.monto_gasto || 0), 0);
  const saldoFinalCaja = saldoInicialAsignado - totalGastosRendidos;

  const estadoActualCaja = primerRegistro ? (primerRegistro.estado_caja || 'Abierta') : 'Abierta';
  const cajaEstaCerrada = estadoActualCaja === 'Cerrada';

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start space-y-2">
            <img src="/logo.jpeg" alt="VyA Consulting Logo" className="h-14 object-contain" />
            <h1 className="text-xl font-bold text-gray-800">💵 Sistema de Rendición de Caja Chica por Proyecto</h1>
            <p className="text-xs text-gray-500">Asignación de Fondos y Control de Comprobantes por Código de Proyecto</p>
          </div>

          <button
            onClick={solicitarAccesoAdmin}
            className={`py-2 px-4 rounded-lg text-xs font-bold shadow transition-all ${
              esAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {esAdmin ? '🔓 Modo Admin Activo' : '🔒 Acceso Administrador'}
          </button>
        </div>

        {/* Control Principal por Código de Proyecto */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-xs font-bold text-gray-700 uppercase">Código de Proyecto:</label>
            <input 
              type="text" 
              placeholder="Ej: PRJ-2026-LIMA" 
              value={proyectoSeleccionado} 
              onChange={(e) => setProyectoSeleccionado(e.target.value)}
              className="p-2 border rounded-lg text-sm font-extrabold text-blue-900 bg-blue-50/50 uppercase w-48"
            />
            {proyectoSeleccionado && (
              cajaEstaCerrada ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700">
                  🔒 CERRADA
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700">
                  🔓 ABIERTA
                </span>
              )
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {cajaEstaCerrada ? (
              <button
                type="button"
                onClick={() => cambiarEstadoCaja('Abierta')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow transition-colors"
              >
                🔓 Reabrir Caja Proyecto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => cambiarEstadoCaja('Cerrada')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow transition-colors"
              >
                🔒 Cerrar y Liquidar Proyecto
              </button>
            )}

            <button
              type="button"
              onClick={exportarAExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow transition-colors"
            >
              📊 Exportar Excel
            </button>
          </div>
        </div>

        {/* Resumen Financiero del Proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-blue-600 uppercase">
              Monto Asignado {proyectoSeleccionado ? `(${proyectoSeleccionado})` : ''}
            </span>
            <p className="text-3xl font-extrabold text-blue-800 mt-1">
              {moneda === 'PEN' ? 'S/' : '$'} {saldoInicialAsignado.toFixed(2)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-amber-600 uppercase">Total Gastos Consumidos</span>
            <p className="text-3xl font-extrabold text-amber-800 mt-1">
              {moneda === 'PEN' ? 'S/' : '$'} {totalGastosRendidos.toFixed(2)}
            </p>
          </div>
          <div className={`border p-4 rounded-lg shadow-sm ${saldoFinalCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`text-xs font-bold uppercase ${saldoFinalCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {saldoFinalCaja >= 0 ? 'Saldo Restante (Devolver a Empresa)' : 'Saldo en Contra (Reembolsar a Trabajador)'}
            </span>
            <p className={`text-3xl font-extrabold mt-1 ${saldoFinalCaja >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {moneda === 'PEN' ? 'S/' : '$'} {Math.abs(saldoFinalCaja).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Formulario de Entrada */}
        <form onSubmit={guardarGasto} className={`p-6 rounded-xl shadow-sm border space-y-4 ${cajaEstaCerrada ? 'bg-gray-100 opacity-60 pointer-events-none' : idEditando ? 'bg-amber-50/50 border-amber-300' : 'bg-white'}`}>
          
          <div className="border-b pb-3 space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Asignación de Proyecto y Saldo Inicial</h2>
              {!esAdmin && <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">🔒 El Saldo Inicial solo puede modificarlo el Administrador</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Responsable del Proyecto *</label>
                <input type="text" placeholder="Ej: Juan Pérez" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required disabled={cajaEstaCerrada} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° Interno / Identificador de Caja</label>
                <input type="text" placeholder="Ej: CCH-001" value={numeroCaja} onChange={(e) => setNumeroCaja(e.target.value)} className="w-full p-2 border rounded-lg text-sm uppercase" disabled={cajaEstaCerrada} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monto Asignado al Proyecto *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={saldoInicial} 
                  onChange={(e) => setSaldoInicial(e.target.value)} 
                  className={`w-full p-2 border rounded-lg text-sm font-bold ${esAdmin ? 'bg-amber-50 text-amber-900 border-amber-400' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                  required 
                  disabled={!esAdmin || cajaEstaCerrada} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Moneda del Fondo</label>
                <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-semibold" disabled={!esAdmin || cajaEstaCerrada}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Cargar Comprobante / Gasto del Proyecto</h2>
              {idEditando && (
                <button type="button" onClick={limpiarFormularioGasto} className="text-xs text-red-600 underline font-semibold">
                  ✖ Cancelar Edición
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Documento</label>
                <input type="date" value={fechaDocumento} onChange={(e) => setFechaDocumento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Documento</label>
                <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" disabled={cajaEstaCerrada}>
                  <option>Factura</option>
                  <option>Boleta</option>
                  <option>RxH</option>
                  <option>Ticket</option>
                  <option>Sin Documento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">N° Comprobante</label>
                <input type="text" placeholder="Ej: F001-1234" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Gasto</label>
                <select value={tipoGasto} onChange={(e) => setTipoGasto(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-semibold" disabled={cajaEstaCerrada}>
                  <option>Combustible</option>
                  <option>Peaje</option>
                  <option>Alimentación</option>
                  <option>Hospedaje</option>
                  <option>Mantenimiento</option>
                  <option>Movilidad</option>
                  <option>Personal Extra</option>
                  <option>Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monto del Gasto *</label>
                <input type="number" step="0.01" placeholder="0.00" value={montoGasto} onChange={(e) => setMontoGasto(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold text-red-600" required disabled={cajaEstaCerrada} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor / Detalle del Consumo</label>
                <input type="text" placeholder="Ej: Grifo Primax / Estación Peaje" value={proveedorDetalle} onChange={(e) => setProveedorDetalle(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
                <input type="text" placeholder="Comentarios" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
              </div>
            </div>
          </div>

          <button type="submit" disabled={cajaEstaCerrada} className={`font-semibold py-2 px-6 rounded-lg shadow text-white ${idEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {idEditando ? '💾 Actualizar Comprobante' : `➕ Agregar Gasto al Proyecto`}
          </button>
        </form>

        {/* Tabla de Comprobantes por Proyecto */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Comprobantes Rendidos {proyectoSeleccionado ? <>en Proyecto <span className="text-blue-600 font-extrabold">{proyectoSeleccionado}</span></> : ''}
          </h2>

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Cargando rendición...</p>
          ) : !proyectoSeleccionado ? (
            <p className="text-center text-sm text-gray-500 py-4">Ingresa o selecciona un Código de Proyecto en la barra superior para ver sus detalles.</p>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No hay comprobantes registrados aún para el proyecto {proyectoSeleccionado}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <th className="p-3">Código Proyecto</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Tipo Gasto</th>
                    <th className="p-3">Proveedor / Detalle</th>
                    <th className="p-3">Monto Gasto</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrosFiltrados.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{r.codigo_proyecto}</td>
                      <td className="p-3 font-medium">{r.responsable}<br/><span className="text-[10px] text-gray-400">{r.numero_caja || 'Sin N° Caja'}</span></td>
                      <td className="p-3">{r.fecha_documento || '-'}</td>
                      <td className="p-3"><span className="font-semibold">{r.tipo_documento}:</span> {r.numero_documento || 'S/N'}</td>
                      <td className="p-3 font-medium text-blue-700">{r.tipo_gasto}</td>
                      <td className="p-3">{r.proveedor_detalle || '-'}</td>
                      <td className="p-3 font-bold text-red-600">{r.moneda === 'PEN' ? 'S/' : '$'} {(r.monto_gasto || 0).toFixed(2)}</td>
                      <td className="p-3 text-center space-x-2">
                        {r.id && (
                          <>
                            <button onClick={() => prepararEdicion(r)} className="text-amber-600 font-semibold hover:underline">✏️ Editar</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => eliminarRegistro(r)} className="text-red-600 font-semibold hover:underline">🗑️ Borrar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
