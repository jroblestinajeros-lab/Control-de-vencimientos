'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const supabaseUrl = 'https://cxqwzbfbffarrlgbhtuv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tLRrpt_XooefWWZp-xXDaQ_eNyXO_zE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CLAVE_ADMIN = 'vya2026';

const COLORES_GRAFICOS = [
  '#2563EB', // Azul
  '#10B981', // Verde
  '#F59E0B', // Ámbar
  '#EF4444', // Rojo
  '#8B5CF6', // Púrpura
  '#EC4899', // Rosado
  '#14B8A6', // Turquesa
  '#6366F1', // Índigo
];

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
  url_comprobante?: string;
  estado_caja?: string;
}

export default function CajaChicaHome() {
  const [registros, setRegistros] = useState<RegistroCaja[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subiendoArchivo, setSubiendoArchivo] = useState<boolean>(false);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [esAdmin, setEsAdmin] = useState<boolean>(false);

  // Filtros
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
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [urlExistente, setUrlExistente] = useState<string>('');

  useEffect(() => {
    cargarRegistros();
  }, []);

  const cajasDelProyecto = Array.from(
    new Set(
      registros
        .filter((r) => (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim())
        .map((r) => r.numero_caja)
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (!proyectoSeleccionado || cajaSeleccionada === 'TODAS' || cajaSeleccionada === 'NUEVA') return;

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

  // FUNCIÓN DE SUBIDA CORREGIDA (Directo al bucket caja_chica_evidencias sin subcarpeta)
  const subirComprobanteStorage = async (file: File): Promise<string | null> => {
    try {
      setSubiendoArchivo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('caja_chica_evidencias')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert('Error al subir comprobante: ' + uploadError.message);
        return null;
      }

      const { data } = supabase.storage
        .from('caja_chica_evidencias')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err: any) {
      alert('Error en subida de archivo: ' + err.message);
      return null;
    } finally {
      setSubiendoArchivo(false);
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
    setArchivoEvidencia(null);
    setUrlExistente('');
  };

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cajaEstaCerrada) {
      alert('La caja seleccionada se encuentra CERRADA.');
      return;
    }

    const cajaFinal = (cajaSeleccionada === 'NUEVA' ? cajaManualInput : cajaSeleccionada).toUpperCase().trim();

    if (!proyectoSeleccionado || !cajaFinal) {
      alert('Por favor especifica el Código de Proyecto y el Código de Caja.');
      return;
    }

    if (!montoGasto) {
      alert('Por favor ingresa el monto del gasto.');
      return;
    }

    let urlFinal = urlExistente;
    if (archivoEvidencia) {
      const urlSubida = await subirComprobanteStorage(archivoEvidencia);
      if (urlSubida) urlFinal = urlSubida;
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
      url_comprobante: urlFinal,
      estado_caja: 'Abierta',
    };

    if (idEditando) {
      const { error } = await supabase.from('cajas_chicas').update(payload).eq('id', idEditando);
      if (error) alert('Error al actualizar comprobante: ' + error.message);
      else {
        limpiarFormularioGasto();
        cargarRegistros();
      }
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
    setUrlExistente(r.url_comprobante || '');
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

  const cajaActivaFiltro = cajaSeleccionada === 'NUEVA' ? cajaManualInput : cajaSeleccionada;

  const registrosFiltrados = registros.filter((r) => {
    const coincideProyecto = proyectoSeleccionado
      ? (r.codigo_proyecto || '').toUpperCase().trim() === proyectoSeleccionado.toUpperCase().trim()
      : false;

    const coincideCaja = !cajaActivaFiltro || cajaActivaFiltro === 'TODAS'
      ? true
      : (r.numero_caja || '').toUpperCase().trim() === cajaActivaFiltro.toUpperCase().trim();

    const esRegistroGasto = r.tipo_documento !== 'Apertura';

    if (esAdmin) return coincideProyecto && coincideCaja && esRegistroGasto;

    const coincideResponsable = responsableFiltro
      ? (r.responsable || '').toLowerCase().includes(responsableFiltro.toLowerCase().trim())
      : false;

    return coincideProyecto && coincideCaja && coincideResponsable && esRegistroGasto;
  });

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

  const datosResumenAgrupado = useMemo(() => {
    const mapa: Record<string, { tipo: string; monto: number; cantidad: number }> = {};

    registrosFiltrados.forEach((r) => {
      const tipo = r.tipo_gasto || 'Otros';
      const monto = r.monto_gasto || 0;

      if (!mapa[tipo]) {
        mapa[tipo] = { tipo, monto: 0, cantidad: 0 };
      }
      mapa[tipo].monto += monto;
      mapa[tipo].cantidad += 1;
    });

    return Object.values(mapa).map((item) => {
      const pctFondo = saldoInicialCalculado > 0 ? (item.monto / saldoInicialCalculado) * 100 : 0;
      const pctTotal = totalGastosRendidos > 0 ? (item.monto / totalGastosRendidos) * 100 : 0;
      return {
        ...item,
        pctFondo: parseFloat(pctFondo.toFixed(2)),
        pctTotal: parseFloat(pctTotal.toFixed(2)),
      };
    });
  }, [registrosFiltrados, saldoInicialCalculado, totalGastosRendidos]);

  const exportarAExcel = () => {
    if (!registrosFiltrados || registrosFiltrados.length === 0) {
      alert('No hay comprobantes para exportar.');
      return;
    }

    const fondoAsignado = saldoInicialCalculado;

    const resumenExcel = datosResumenAgrupado.map((item) => ({
      'Tipo de Gasto': item.tipo,
      'Cant. Comprobantes': item.cantidad,
      'Monto Total (S/)': item.monto.toFixed(2),
      '% Del Fondo Asignado': `${item.pctFondo.toFixed(2)}%`,
      '% Del Total Gastado': `${item.pctTotal.toFixed(2)}%`,
    }));

    resumenExcel.push({
      'Tipo de Gasto': 'TOTAL GENERAL CONSUMIDO',
      'Cant. Comprobantes': registrosFiltrados.length,
      'Monto Total (S/)': totalGastosRendidos.toFixed(2),
      '% Del Fondo Asignado': `${fondoAsignado > 0 ? ((totalGastosRendidos / fondoAsignado) * 100).toFixed(2) : '0.00'}%`,
      '% Del Total Gastado': '100.00%',
    });

    const detalleExcel = registrosFiltrados.map((r) => {
      const montoGasto = r.monto_gasto || 0;
      const pctFondo = fondoAsignado > 0 ? ((montoGasto / fondoAsignado) * 100).toFixed(2) + '%' : '0.00%';

      return {
        'Código Proyecto': r.codigo_proyecto,
        'N° Caja': r.numero_caja,
        'Responsable': r.responsable,
        'Moneda': r.moneda,
        'Fondo Asignado Caja': r.saldo_inicial,
        'Fecha Doc.': r.fecha_documento || '-',
        'Tipo Doc.': r.tipo_documento,
        'N° Comprobante': r.numero_documento || 'S/N',
        'Tipo Gasto': r.tipo_gasto,
        'RUC Proveedor': r.ruc_proveedor || '-',
        'Razón Social / Empresa': r.proveedor_detalle,
