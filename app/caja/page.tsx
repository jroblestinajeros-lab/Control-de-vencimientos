'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RegistroCaja {
  id?: number;
  numero_caja: string;
  responsable: string;
  codigo_proyecto: string;
  saldo_inicial: number;
  moneda: string;
  fecha_documento: string;
  tipo_documento: string;
  numero_documento: string;
  tipo_gasto: string;
  monto_gasto: number;
  proveedor_detalle: string;
  observaciones: string;
  estado_caja?: string;
}

export default function CajaChicaHome() {
  const [registros, setRegistros] = useState<RegistroCaja[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [idEditando, setIdEditando] = useState<number | null>(null);

  const [cajaBuscada, setCajaBuscada] = useState<string>('');

  // Formulario
  const [numeroCaja, setNumeroCaja] = useState<string>('CCH-001');
  const [responsable, setResponsable] = useState<string>('');
  const [codigoProyecto, setCodigoProyecto] = useState<string>('');
  const [saldoInicial, setSaldoInicial] = useState<string>('1000');
  const [moneda, setMoneda] = useState<string>('PEN');
  
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

  const limpiarFormularioGasto = () => {
    setIdEditando(null);
    setNumeroDocumento('');
    setMontoGasto('');
    setProveedorDetalle('');
    setObservaciones('');
  };

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cajaEstaCerrada) {
      alert('Esta caja chica se encuentra CERRADA / LIQUIDADA. No se pueden agregar nuevos gastos.');
      return;
    }

    if (!numeroCaja || !responsable || !montoGasto) {
      alert('Por favor completa el N° de caja, responsable y monto del gasto.');
      return;
    }

    const payload: RegistroCaja = {
      numero_caja: numeroCaja.toUpperCase().trim(),
      responsable,
      codigo_proyecto: codigoProyecto,
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
    if (!cajaBuscada && !numeroCaja) {
      alert('Ingresa o filtra un N° de Caja Chica para cerrar o reabrir.');
      return;
    }

    const cajaTarget = (cajaBuscada || numeroCaja).toUpperCase().trim();

    if (!confirm(`¿Estás seguro de cambiar el estado de la caja ${cajaTarget} a "${nuevoEstado}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('cajas_chicas')
      .update({ estado_caja: nuevoEstado })
      .eq('numero_caja', cajaTarget);

    if (error) {
      alert('Error al actualizar el estado de la caja: ' + error.message);
    } else {
      cargarRegistros();
    }
  };

  const prepararEdicion = (r: RegistroCaja) => {
    if (r.estado_caja === 'Cerrada') {
      alert('No se puede editar un comprobante de una caja CERRADA. Reabre la caja primero si necesitas modificarlo.');
      return;
    }
    if (!r.id) return;
    setIdEditando(r.id);
    setNumeroCaja(r.numero_caja);
    setResponsable(r.responsable);
    setCodigoProyecto(r.codigo_proyecto || '');
    setSaldoInicial(r.saldo_inicial.toString());
    setMoneda(r.moneda);
    setFechaDocumento(r.fecha_documento || '');
    setTipoDocumento(r.tipo_documento);
    setNumeroDocumento(r.numero_documento || '');
    setTipoGasto(r.tipo_gasto);
    setMontoGasto(r.monto_gasto.toString());
    setProveedorDetalle(r.proveedor_detalle || '');
    setObservaciones(r.observaciones || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarRegistro = async (r: RegistroCaja) => {
    if (r.estado_caja === 'Cerrada') {
      alert('No se puede eliminar un comprobante de una caja CERRADA.');
      return;
    }
    if (!confirm('¿Seguro de que deseas borrar este gasto de la rendición?')) return;
    const { error } = await supabase.from('cajas_chicas').delete().eq('id', r.id!);
    if (error) alert('Error al eliminar: ' + error.message);
    else cargarRegistros();
  };

  const exportarAExcel = () => {
    if (!registrosFiltrados || registrosFiltrados.length === 0) {
      alert('No hay comprobantes para exportar.');
      return;
    }

    const datosExcel = registrosFiltrados.map((r) => ({
      'N° Caja': r.numero_caja,
      'Responsable': r.responsable,
      'Proyecto': r.codigo_proyecto,
      'Moneda': r.moneda,
      'Saldo Inicial': r.saldo_inicial,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Liquidación_Caja');

    XLSX.writeFile(workbook, `Rendicion_Caja_${cajaBuscada || numeroCaja}.xlsx`);
  };

  const registrosFiltrados = cajaBuscada 
    ? registros.filter(r => r.numero_caja.toUpperCase() === cajaBuscada.toUpperCase().trim())
    : registros;

  const totalInicialCaja = registrosFiltrados.length > 0 ? registrosFiltrados[0].saldo_inicial : (parseFloat(saldoInicial) || 0);
  const totalGastosRendidos = registrosFiltrados.reduce((acc, r) => acc + (r.monto_gasto || 0), 0);
  const saldoFinalCaja = totalInicialCaja - totalGastosRendidos;
  
  const estadoActualCaja = registrosFiltrados.length > 0 ? (registrosFiltrados[0].estado_caja || 'Abierta') : 'Abierta';
  const cajaEstaCerrada = estadoActualCaja === 'Cerrada';

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center flex flex-col items-center justify-center space-y-3">
          <img src="/logo.jpeg" alt="VyA Consulting Logo" className="h-16 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">💵 Sistema de Rendición de Caja Chica</h1>
          <p className="text-sm text-gray-500">Gestión de Entregas a Rendir, Liquidación de Gastos y Reembolsos por Proyecto</p>
        </div>

        {/* Barra de Estado y Cierre de Caja */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase">Estado de la Caja Chica:</span>
            {cajaEstaCerrada ? (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 flex items-center gap-1">
                🔒 CERRADA / LIQUIDADA
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                🔓 ABIERTA (REGISTRANDO GASTOS)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {cajaEstaCerrada ? (
              <button
                type="button"
                onClick={() => cambiarEstadoCaja('Abierta')}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs shadow transition-colors"
              >
                🔓 Reabrir Caja Chica
              </button>
            ) : (
              <button
                type="button"
                onClick={() => cambiarEstadoCaja('Cerrada')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs shadow transition-colors"
              >
                🔒 Cerrar y Liquidar Caja
              </button>
            )}

            <button
              type="button"
              onClick={exportarAExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs shadow transition-colors flex items-center gap-1"
            >
              📊 Exportar Liquidación
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-blue-600 uppercase">Monto Asignado (Saldo Inicial)</span>
            <p className="text-3xl font-extrabold text-blue-800 mt-1">
              {moneda === 'PEN' ? 'S/' : '$'} {totalInicialCaja.toFixed(2)}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-amber-600 uppercase">Total Gastos Rendidos</span>
            <p className="text-3xl font-extrabold text-amber-800 mt-1">
              {moneda === 'PEN' ? 'S/' : '$'} {totalGastosRendidos.toFixed(2)}
            </p>
          </div>
          <div className={`border p-4 rounded-lg shadow-sm ${saldoFinalCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`text-xs font-bold uppercase ${saldoFinalCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {saldoFinalCaja >= 0 ? 'Saldo Final (Devolución a Empresa)' : 'Saldo en Contra (Reembolso a Responsable)'}
            </span>
            <p className={`text-3xl font-extrabold mt-1 ${saldoFinalCaja >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {moneda === 'PEN' ? 'S/' : '$'} {Math.abs(saldoFinalCaja).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={guardarGasto} className={`p-6 rounded-xl shadow-sm border space-y-4 ${cajaEstaCerrada ? 'bg-gray-100 opacity-60 pointer-events-none' : idEditando ? 'bg-amber-50/50 border-amber-300' : 'bg-white'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              {idEditando ? '✏️ Editando Gasto' : '➕ Registrar Nuevo Gasto en Caja Chica'}
            </h2>
            {idEditando && (
              <button type="button" onClick={limpiarFormularioGasto} className="text-xs text-red-600 underline font-semibold">
                ✖ Cancelar Edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° de Caja Chica *</label>
              <input type="text" placeholder="Ej: CCH-001" value={numeroCaja} onChange={(e) => setNumeroCaja(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold uppercase" required disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Responsable de Caja *</label>
              <input type="text" placeholder="Nombre completo" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código Proyecto</label>
              <input type="text" placeholder="Ej: PRJ-2026" value={codigoProyecto} onChange={(e) => setCodigoProyecto(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Saldo Inicial Recibido *</label>
              <input type="number" step="0.01" placeholder="0.00" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold" required disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-semibold" disabled={cajaEstaCerrada}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Documento</label>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">N° Documento / Comprobante</label>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor / Detalle del Comprobante</label>
              <input type="text" placeholder="Razón Social o Estación de Servicio" value={proveedorDetalle} onChange={(e) => setProveedorDetalle(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <input type="text" placeholder="Comentarios sobre el consumo" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
          </div>

          <button type="submit" disabled={cajaEstaCerrada} className={`font-semibold py-2 px-6 rounded-lg shadow text-white ${idEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {idEditando ? '💾 Actualizar Comprobante' : '➕ Agregar Gasto a Rendición'}
          </button>
        </form>

        {/* Tabla */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
            <h2 className="text-lg font-semibold text-gray-800">Detalle de Comprobantes Rendidos</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Filtrar N° Caja:</label>
              <input 
                type="text" 
                placeholder="Ej: CCH-001" 
                value={cajaBuscada} 
                onChange={(e) => setCajaBuscada(e.target.value)}
                className="p-1.5 border rounded-lg text-xs uppercase font-bold"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Cargando gastos de caja chica...</p>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No hay comprobantes cargados en esta caja chica.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <th className="p-3">N° Caja</th>
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
                      <td className="p-3 font-bold text-gray-900">{r.numero_caja}</td>
                      <td className="p-3 font-medium">{r.responsable}<br/><span className="text-[10px] text-gray-400">{r.codigo_proyecto || 'Sin proyecto'}</span></td>
                      <td className="p-3">{r.fecha_documento || '-'}</td>
                      <td className="p-3"><span className="font-semibold">{r.tipo_documento}:</span> {r.numero_documento || 'S/N'}</td>
                      <td className="p-3 font-medium text-blue-700">{r.tipo_gasto}</td>
                      <td className="p-3">{r.proveedor_detalle || '-'}</td>
                      <td className="p-3 font-bold text-red-600">{r.moneda === 'PEN' ? 'S/' : '$'} {r.monto_gasto.toFixed(2)}</td>
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
