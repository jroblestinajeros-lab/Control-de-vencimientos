'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = 'https://cxqwzbfbffarrlgbhtuv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tLRrpt_XooefWWZp-xXDaQ_eNyXO_zE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  ruc_proveedor?: string;
  proveedor_detalle?: string;
  observaciones?: string;
  estado_caja?: string;
}

export default function CajaChicaHome() {
  const [registros, setRegistros] = useState<RegistroCaja[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [esAdmin, setEsAdmin] = useState<boolean>(false);

  // Filtros de Usuario
  const [responsableFiltro, setResponsableFiltro] = useState<string>('');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');
  const [cajaSeleccionada, setCajaSeleccionada] = useState<string>('NUEVA');
  const [cajaManualInput, setCajaManualInput] = useState<string>('');

  // Formulario 1: Apertura (Admin)
  const [numeroCajaApertura, setNumeroCajaApertura] = useState<string>('');
  const [responsableApertura, setResponsableApertura] = useState<string>('');
  const [saldoInicialApertura, setSaldoInicialApertura] = useState<string>('');
  const [monedaApertura, setMonedaApertura] = useState<string>('PEN');

  // Formulario 2: Gasto (Responsable)
  const [fechaDocumento, setFechaDocumento] = useState<string>('');
  const [tipoDocumento, setTipoDocumento] = useState<string>('Factura');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [tipoGasto, setTipoGasto] = useState<string>('Combustible');
  const [montoGasto, setMontoGasto] = useState<string>('');
  const [rucProveedor, setRucProveedor] = useState<string>('');
  const [proveedorDetalle, setProveedorDetalle] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  useEffect(() => {
    cargarRegistros();
  }, []);

  // Cajas asociadas al proyecto
  const cajasDelProyecto = Array.from(
    new Set(
      registros
        .filter((r) => (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim())
        .map((r) => r.numero_caja)
        .filter(Boolean)
    )
  );

  // Precargar datos al seleccionar caja existente
  useEffect(() => {
    if (!proyectoSeleccionado || cajaSeleccionada === 'TODAS' || cajaSeleccionada === 'NUEVA') {
      return;
    }
    const prjTarget = proyectoSeleccionado.toUpperCase().trim();
    const cajaTarget = cajaSeleccionada.toUpperCase().trim();

    const aperturaExistente = registros.find(
      (r) =>
        (r.codigo_proyecto || '').toUpperCase().trim() === prjTarget &&
        (r.numero_caja || '').toUpperCase().trim() === cajaTarget
    );

    if (aperturaExistente) {
      setNumeroCajaApertura(aperturaExistente.numero_caja || '');
      setResponsableApertura(aperturaExistente.responsable || '');
      setSaldoInicialApertura(aperturaExistente.saldo_inicial?.toString() || '0');
      setMonedaApertura(aperturaExistente.moneda || 'PEN');
    }
  }, [cajaSeleccionada, proyectoSeleccionado, registros]);

  const cargarRegistros = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cajas_chicas')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) console.error('Error al cargar datos:', error);
    else setRegistros(data || []);
    setLoading(false);
  };

  const solicitarAccesoAdmin = () => {
    if (esAdmin) {
      setEsAdmin(false);
      alert('Modo Administrador desactivado.');
      return;
    }
    const pass = prompt('Ingresa la contraseña de Administrador (vya2026):');
    if (pass === CLAVE_ADMIN) {
      setEsAdmin(true);
      alert('Modo Administrador ACTIVADO.');
    } else if (pass !== null) {
      alert('Contraseña incorrecta.');
    }
  };

  const guardarAperturaProyecto = async () => {
    if (!esAdmin) {
      alert('Acceso restringido. Activa el Modo Administrador.');
      return;
    }
    if (!proyectoSeleccionado || !numeroCajaApertura || !responsableApertura || !saldoInicialApertura) {
      alert('Completa el Código de Proyecto, Código de Caja, Responsable y Fondo Asignado.');
      return;
    }

    const prjTarget = proyectoSeleccionado.toUpperCase().trim();
    const cajaTarget = numeroCajaApertura.toUpperCase().trim();

    const existe = registros.some(
      (r) =>
        (r.codigo_proyecto || '').toUpperCase().trim() === prjTarget &&
        (r.numero_caja || '').toUpperCase().trim() === cajaTarget
    );

    if (existe) {
      const { error } = await supabase
        .from('cajas_chicas')
        .update({
          responsable: responsableApertura,
          saldo_inicial: parseFloat(saldoInicialApertura) || 0,
          moneda: monedaApertura,
        })
        .eq('codigo_proyecto', prjTarget)
        .eq('numero_caja', cajaTarget);

      if (error) alert('Error al actualizar caja: ' + error.message);
      else {
        alert(`✅ Caja ${cajaTarget} del proyecto ${prjTarget} actualizada.`);
        setCajaSeleccionada(cajaTarget);
        cargarRegistros();
      }
    } else {
      const payload: RegistroCaja = {
        codigo_proyecto: prjTarget,
        numero_caja: cajaTarget,
        responsable: responsableApertura,
        saldo_inicial: parseFloat(saldoInicialApertura) || 0,
        moneda: monedaApertura,
        tipo_documento: 'Apertura',
        monto_gasto: 0,
        proveedor_detalle: `Apertura de Caja ${cajaTarget} (${prjTarget})`,
        estado_caja: 'Abierta',
      };

      const { error } = await supabase.from('cajas_chicas').insert([payload]);
      if (error) alert('Error al aperturar caja: ' + error.message);
      else {
        alert(`✅ Caja ${cajaTarget} aperturada para el proyecto ${prjTarget}.`);
        setCajaSeleccionada(cajaTarget);
        cargarRegistros();
      }
    }
  };

  const limpiarFormularioGasto = () => {
    setIdEditando(null);
    setFechaDocumento('');
    setNumeroDocumento('');
    setMontoGasto('');
    setRucProveedor('');
    setProveedorDetalle('');
    setObservaciones('');
  };

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cajaEstaCerrada) {
      alert('La caja seleccionada se encuentra CERRADA.');
      return;
    }

    const cajaFinal = (
      cajaSeleccionada === 'NUEVA' ? cajaManualInput : cajaSeleccionada
    ).toUpperCase().trim();

    if (!proyectoSeleccionado || !cajaFinal) {
      alert('Por favor especifica el Código de Proyecto y el Código de Caja.');
      return;
    }

    if (!montoGasto) {
      alert('Por favor ingresa el monto del gasto.');
      return;
    }

    const prjTarget = proyectoSeleccionado.toUpperCase().trim();

    const registroApertura = registros.find(
      (r) =>
        (r.codigo_proyecto || '').toUpperCase().trim() === prjTarget &&
        (r.numero_caja || '').toUpperCase().trim() === cajaFinal
    );

    const responsableActual = registroApertura ? registroApertura.responsable : (responsableFiltro || 'Sin Responsable');
    const saldoInicialActual = registroApertura ? registroApertura.saldo_inicial : 0;
    const monedaActual = registroApertura ? registroApertura.moneda : 'PEN';

    const payload: RegistroCaja = {
      codigo_proyecto: prjTarget,
      numero_caja: cajaFinal,
      responsable: responsableActual,
      saldo_inicial: saldoInicialActual,
      moneda: monedaActual,
      fecha_documento: fechaDocumento,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      tipo_gasto: tipoGasto,
      monto_gasto: parseFloat(montoGasto) || 0,
      ruc_proveedor: rucProveedor.trim(),
      proveedor_detalle: proveedorDetalle,
      observaciones,
      estado_caja: 'Abierta',
    };

    if (idEditando) {
      const { error } = await supabase.from('cajas_chicas').update(payload).eq('id', idEditando);
      if (error) alert('Error al actualizar comprobante: ' + error.message);
      else { limpiarFormularioGasto(); cargarRegistros(); }
    } else {
      const { error } = await supabase.from('cajas_chicas').insert([payload]);
      if (error) alert('Error al registrar gasto: ' + error.message);
      else { 
        limpiarFormularioGasto(); 
        setCajaSeleccionada(cajaFinal);
        cargarRegistros(); 
      }
    }
  };

  const cambiarEstadoCaja = async (nuevoEstado: string) => {
    if (!esAdmin) {
      alert('Acceso denegado. Activa el MODO ADMINISTRADOR.');
      return;
    }

    const cajaTarget = (cajaSeleccionada === 'NUEVA' ? cajaManualInput : cajaSeleccionada).toUpperCase().trim();

    if (!proyectoSeleccionado || !cajaTarget || cajaTarget === 'TODAS') {
      alert('Selecciona o escribe una Caja Chica específica para cambiar su estado.');
      return;
    }

    const prjTarget = proyectoSeleccionado.toUpperCase().trim();

    if (!confirm(`¿Estás seguro de cambiar el estado de la caja "${cajaTarget}" a "${nuevoEstado}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('cajas_chicas')
      .update({ estado_caja: nuevoEstado })
      .eq('codigo_proyecto', prjTarget)
      .eq('numero_caja', cajaTarget);

    if (error) {
      alert('Error al actualizar estado: ' + error.message);
    } else {
      alert(`✅ Caja ${cajaTarget} cambiada a estado: ${nuevoEstado}`);
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
    setCajaSeleccionada(r.numero_caja);
    setFechaDocumento(r.fecha_documento || '');
    setTipoDocumento(r.tipo_documento || 'Factura');
    setNumeroDocumento(r.numero_documento || '');
    setTipoGasto(r.tipo_gasto || 'Combustible');
    setMontoGasto(r.monto_gasto?.toString() || '');
    setRucProveedor(r.ruc_proveedor || '');
    setProveedorDetalle(r.proveedor_detalle || '');
    setObservaciones(r.observaciones || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarRegistro = async (r: RegistroCaja) => {
    if (r.estado_caja === 'Cerrada') {
      alert('No se puede eliminar un comprobante de una caja CERRADA.');
      return;
    }
    if (!confirm('¿Deseas borrar este gasto?')) return;
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
      'Código Proyecto': r.codigo_proyecto,
      'N° Caja': r.numero_caja,
      'Responsable': r.responsable,
      'Moneda': r.moneda,
      'Saldo Inicial Asignado': r.saldo_inicial,
      'Fecha Doc.': r.fecha_documento,
      'Tipo Doc.': r.tipo_documento,
      'N° Comprobante': r.numero_documento,
      'Tipo Gasto': r.tipo_gasto,
      'RUC Proveedor': r.ruc_proveedor || '-',
      'Razón Social / Empresa': r.proveedor_detalle,
      'Monto Gasto': r.monto_gasto,
      'Observaciones': r.observaciones,
      'Estado Caja': r.estado_caja || 'Abierta'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Liquidacion');
    XLSX.writeFile(workbook, `Rendicion_${proyectoSeleccionado}_${cajaSeleccionada}.xlsx`);
  };

  // Filtrado de la tabla
  const cajaActivaFiltro = cajaSeleccionada === 'NUEVA' ? cajaManualInput : cajaSeleccionada;

  const registrosFiltrados = registros.filter((r) => {
    const coincideProyecto = proyectoSeleccionado 
      ? (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim()
      : false;

    const coincideCaja = !cajaActivaFiltro || cajaActivaFiltro === 'TODAS'
      ? true
      : (r.numero_caja || '').toUpperCase().trim() === cajaActivaFiltro.toUpperCase().trim();

    if (esAdmin) return coincideProyecto && coincideCaja;

    const coincideResponsable = responsableFiltro 
      ? (r.responsable || '').toLowerCase().includes(responsableFiltro.toLowerCase().trim())
      : false;

    return coincideProyecto && coincideCaja && coincideResponsable;
  });

  // Cálculo Dinámico de Fondo Inicial
  const totalSaldoInicial = () => {
    if (!proyectoSeleccionado) return 0;
    const prjTarget = proyectoSeleccionado.toUpperCase().trim();

    if (cajaActivaFiltro && cajaActivaFiltro !== 'TODAS') {
      const registroCaja = registros.find(
        (r) =>
          (r.codigo_proyecto || '').toUpperCase().trim() === prjTarget &&
          (r.numero_caja || '').toUpperCase().trim() === cajaActivaFiltro.toUpperCase().trim()
      );
      return registroCaja ? registroCaja.saldo_inicial : 0;
    } else {
      const cajasProcesadas = new Set<string>();
      let sumaSaldos = 0;
      registros
        .filter((r) => (r.codigo_proyecto || '').toUpperCase().trim() === prjTarget)
        .forEach((r) => {
          const keyCaja = (r.numero_caja || '').toUpperCase().trim();
          if (keyCaja && !cajasProcesadas.has(keyCaja)) {
            cajasProcesadas.add(keyCaja);
            sumaSaldos += r.saldo_inicial || 0;
          }
        });
      return sumaSaldos;
    }
  };

  const saldoInicialCalculado = totalSaldoInicial();
  const totalGastosRendidos = registrosFiltrados.reduce((acc, r) => acc + (r.monto_gasto || 0), 0);
  const saldoFinalCaja = saldoInicialCalculado - totalGastosRendidos;

  const registroCajaActiva = registros.find(
    (r) =>
      (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim() &&
      (r.numero_caja || '').toUpperCase().trim() === cajaActivaFiltro.toUpperCase().trim()
  );
  const estadoActualCaja = registroCajaActiva ? (registroCajaActiva.estado_caja || 'Abierta') : 'Abierta';
  const cajaEstaCerrada = cajaActivaFiltro !== 'TODAS' && estadoActualCaja === 'Cerrada';

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start space-y-2">
            <img src="/logo.jpeg" alt="VyA Consulting Logo" className="h-14 object-contain" />
            <h1 className="text-xl font-bold text-gray-800">💵 Sistema de Rendición de Caja Chica por Proyecto</h1>
            <p className="text-xs text-gray-500">Gestión Multi-Caja para Proyectos VyA Consulting S.A.C.</p>
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

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
            {!esAdmin && (
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Tu Nombre / Responsable:</label>
                <input 
                  type="text" 
                  placeholder="Ej: Jorge Robles" 
                  value={responsableFiltro} 
                  onChange={(e) => setResponsableFiltro(e.target.value)}
                  className="p-2 border rounded-lg text-xs font-bold text-gray-800 w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Código de Proyecto:</label>
              <input 
                type="text" 
                placeholder="Ej: PR-SHA-001" 
                value={proyectoSeleccionado} 
                onChange={(e) => {
                  setProyectoSeleccionado(e.target.value);
                }}
                className="p-2 border rounded-lg text-xs font-extrabold text-blue-900 bg-blue-50/50 uppercase w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Seleccionar / Digitar Caja Chica:</label>
              <div className="flex gap-2">
                <select
                  value={cajaSeleccionada}
                  onChange={(e) => setCajaSeleccionada(e.target.value)}
                  className="p-2 border rounded-lg text-xs font-bold text-gray-800 bg-white uppercase w-full"
                  disabled={!proyectoSeleccionado}
                >
                  <option value="NUEVA">✏️ Digitar Nueva Caja...</option>
                  <option value="TODAS">📂 (Todas las Cajas / Consolidado)</option>
                  {cajasDelProyecto.map((caja) => (
                    <option key={caja} value={caja}>
                      📦 Caja: {caja}
                    </option>
                  ))}
                </select>

                {cajaSeleccionada === 'NUEVA' && (
                  <input
                    type="text"
                    placeholder="Ej: SHA-001"
                    value={cajaManualInput}
                    onChange={(e) => setCajaManualInput(e.target.value)}
                    className="p-2 border border-blue-400 rounded-lg text-xs font-extrabold text-blue-900 bg-blue-50 uppercase w-full"
                    disabled={!proyectoSeleccionado}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {proyectoSeleccionado && cajaActivaFiltro && cajaActivaFiltro !== 'TODAS' && (
              cajaEstaCerrada ? (
                <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700">🔒 CERRADA</span>
              ) : (
                <span className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700">🔓 ABIERTA</span>
              )
            )}

            {esAdmin && cajaActivaFiltro && cajaActivaFiltro !== 'TODAS' && (
              cajaEstaCerrada ? (
                <button 
                  type="button" 
                  onClick={() => cambiarEstadoCaja('Abierta')} 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-3 rounded-lg text-xs shadow cursor-pointer transition-colors"
                >
                  🔓 Reabrir
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => cambiarEstadoCaja('Cerrada')} 
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg text-xs shadow cursor-pointer transition-colors"
                >
                  🔒 Cerrar Caja
                </button>
              )
            )}

            <button type="button" onClick={exportarAExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-xs shadow cursor-pointer transition-colors">
              📊 Exportar Excel
            </button>
          </div>
        </div>

        {/* Resumen Financiero */}
        {!esAdmin && (!responsableFiltro || !proyectoSeleccionado) ? (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center text-xs font-semibold text-amber-800">
            🔒 Ingresa Tu Nombre de Responsable y Código de Proyecto arriba para consultar saldos y movimientos.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs font-bold text-blue-600 uppercase">
                Fondo Asignado {cajaActivaFiltro && cajaActivaFiltro !== 'TODAS' ? `(Caja ${cajaActivaFiltro})` : `(Consolidado ${proyectoSeleccionado})`}
              </span>
              <p className="text-3xl font-extrabold text-blue-800 mt-1">
                S/ {saldoInicialCalculado.toFixed(2)}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
              <span className="text-xs font-bold text-amber-600 uppercase">Total Gastos Consumidos</span>
              <p className="text-3xl font-extrabold text-amber-800 mt-1">
                S/ {totalGastosRendidos.toFixed(2)}
              </p>
            </div>
            <div className={`border p-4 rounded-lg shadow-sm ${saldoFinalCaja >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <span className={`text-xs font-bold uppercase ${saldoFinalCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {saldoFinalCaja >= 0 ? 'Saldo Restante (Devolver a Empresa)' : 'Saldo en Contra (Reembolsar a Trabajador)'}
              </span>
              <p className={`text-3xl font-extrabold mt-1 ${saldoFinalCaja >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                S/ {Math.abs(saldoFinalCaja).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Panel Admin: Apertura */}
        {esAdmin && (
          <div className="bg-amber-50/60 p-6 rounded-xl border border-amber-300 space-y-3">
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">🛠️ Panel Admin: Apertura y Asignación de Cajas a Proyectos</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">Código de Caja Chica *</label>
                <input 
                  type="text" 
                  placeholder="Ej: SHA-001, SHA-002" 
                  value={numeroCajaApertura} 
                  onChange={(e) => setNumeroCajaApertura(e.target.value)} 
                  className="w-full p-2 border rounded-lg text-sm uppercase font-bold text-blue-900 bg-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">Nombre del Responsable *</label>
                <input 
                  type="text" 
                  placeholder="Ej: Jorge Robles" 
                  value={responsableApertura} 
                  onChange={(e) => setResponsableApertura(e.target.value)} 
                  className="w-full p-2 border rounded-lg text-sm bg-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">Fondo Asignado (Monto Inicial) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={saldoInicialApertura} 
                  onChange={(e) => setSaldoInicialApertura(e.target.value)} 
                  className="w-full p-2 border border-amber-400 rounded-lg text-sm font-bold text-amber-950 bg-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-amber-900 mb-1">Moneda del Fondo</label>
                <select value={monedaApertura} onChange={(e) => setMonedaApertura(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white font-semibold">
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button type="button" onClick={guardarAperturaProyecto} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-5 rounded-lg text-xs shadow cursor-pointer transition-colors">
                💾 OK: Aperturar / Actualizar Caja Chica
              </button>
            </div>
          </div>
        )}

        {/* Formulario Rendición de Gastos */}
        <form onSubmit={guardarGasto} className={`p-6 rounded-xl shadow-sm border space-y-4 ${cajaEstaCerrada ? 'bg-gray-100 opacity-60 pointer-events-none' : idEditando ? 'bg-amber-50/50 border-amber-300' : 'bg-white'}`}>
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cargar Comprobante de Gasto {cajaActivaFiltro ? `(Caja: ${cajaActivaFiltro})` : ''}</h2>
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

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">RUC Proveedor (Opcional)</label>
              <input type="text" placeholder="Ej: 20502073401" value={rucProveedor} onChange={(e) => setRucProveedor(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Razón Social / Empresa *</label>
              <input type="text" placeholder="Ej: Primax S.A. / Hostal Los Pinos" value={proveedorDetalle} onChange={(e) => setProveedorDetalle(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
              <input type="text" placeholder="Comentarios" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={cajaEstaCerrada} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={cajaEstaCerrada || (!cajaActivaFiltro || cajaActivaFiltro === 'TODAS')} 
            className={`font-semibold py-2 px-6 rounded-lg shadow text-white cursor-pointer transition-colors ${
              (!cajaActivaFiltro || cajaActivaFiltro === 'TODAS') ? 'bg-gray-400 cursor-not-allowed' : idEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {(!cajaActivaFiltro || cajaActivaFiltro === 'TODAS') ? '⚠️ Especifica / Digita una Caja Chica arriba para rendir' : idEditando ? '💾 Actualizar Comprobante' : `➕ Agregar Gasto a Caja ${cajaActivaFiltro}`}
          </button>
        </form>

        {/* Tabla de Rendición */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">
            Comprobantes Rendidos {proyectoSeleccionado ? <>en Proyecto <span className="text-blue-600 font-extrabold">{proyectoSeleccionado}</span> {cajaActivaFiltro && cajaActivaFiltro !== 'TODAS' ? <>(Caja: <span className="text-emerald-700 font-extrabold">{cajaActivaFiltro}</span>)</> : '(Consolidado Cajas)'}</> : ''}
          </h2>

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Cargando datos...</p>
          ) : !esAdmin && (!responsableFiltro || !proyectoSeleccionado) ? (
            <p className="text-center text-sm text-gray-500 py-4">Ingresa tu Nombre de Responsable y Código de Proyecto arriba para visualizar la rendición.</p>
          ) : registrosFiltrados.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No hay comprobantes cargados para la selección actual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <th className="p-3">Código Proyecto</th>
                    <th className="p-3">N° Caja</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Tipo Gasto</th>
                    <th className="p-3">RUC / Empresa Proveedor</th>
                    <th className="p-3">Monto Gasto</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrosFiltrados.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{r.codigo_proyecto}</td>
                      <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-extrabold">{r.numero_caja}</span></td>
                      <td className="p-3 font-medium">{r.responsable}</td>
                      <td className="p-3">{r.fecha_documento || '-'}</td>
                      <td className="p-3"><span className="font-semibold">{r.tipo_documento}:</span> {r.numero_documento || 'S/N'}</td>
                      <td className="p-3 font-medium text-blue-700">{r.tipo_gasto}</td>
                      <td className="p-3">
                        {r.ruc_proveedor ? <span className="font-semibold text-gray-800">RUC: {r.ruc_proveedor}<br/></span> : null}
                        {r.proveedor_detalle || '-'}
                      </td>
                      <td className="p-3 font-bold text-red-600">S/ {(r.monto_gasto || 0).toFixed(2)}</td>
                      <td className="p-3 text-center space-x-2">
                        {r.id && (
                          <>
                            <button onClick={() => prepararEdicion(r)} className="text-amber-600 font-semibold hover:underline cursor-pointer">✏️ Editar</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => eliminarRegistro(r)} className="text-red-600 font-semibold hover:underline cursor-pointer">🗑️ Borrar</button>
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
