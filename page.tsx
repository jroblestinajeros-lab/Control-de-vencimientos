'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Documento {
  id?: number;
  tipo_movimiento: string;
  tipo_documento: string;
  numero_documento: string;
  codigo_proyecto: string;
  empresa: string;
  monto: number;
  moneda: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  estado: string;
}

export default function Home() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Formulario
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('Por Pagar (Proveedor)');
  const [tipoDocumento, setTipoDocumento] = useState<string>('Factura');
  const [numeroDocumento, setNumeroDocumento] = useState<string>('');
  const [codigoProyecto, setCodigoProyecto] = useState<string>('');
  const [empresa, setEmpresa] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [moneda, setMoneda] = useState<string>('PEN');
  const [fechaEmision, setFechaEmision] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const cargarDocumentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .order('fecha_vencimiento', { ascending: true });

    if (error) {
      console.error('Error al cargar datos:', error);
    } else {
      setDocumentos(data || []);
    }
    setLoading(false);
  };

  const guardarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroDocumento || !empresa || !monto || !fechaVencimiento) {
      alert('Por favor completa los campos obligatorios.');
      return;
    }

    const nuevoDoc: Documento = {
      tipo_movimiento: tipoMovimiento,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      codigo_proyecto: codigoProyecto,
      empresa,
      monto: parseFloat(monto),
      moneda,
      fecha_emision: fechaEmision,
      fecha_vencimiento: fechaVencimiento,
      estado: 'Pendiente',
    };

    const { error } = await supabase.from('documentos').insert([nuevoDoc]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      // Limpiar formulario
      setNumeroDocumento('');
      setCodigoProyecto('');
      setEmpresa('');
      setMonto('');
      setFechaEmision('');
      setFechaVencimiento('');
      cargarDocumentos();
    }
  };

  const exportarAExcel = () => {
    if (!documentos || documentos.length === 0) {
      alert('No hay datos registrados para exportar.');
      return;
    }

    const datosFormateados = documentos.map((doc) => ({
      'Tipo Movimiento': doc.tipo_movimiento,
      'Tipo Documento': doc.tipo_documento,
      'N° Documento': doc.numero_documento,
      'Código Proyecto': doc.codigo_proyecto,
      'Empresa / Cliente / Proveedor': doc.empresa,
      'Monto': doc.monto,
      'Moneda': doc.moneda,
      'Fecha Emisión': doc.fecha_emision,
      'Fecha Vencimiento': doc.fecha_vencimiento,
      'Estado': doc.estado,
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vencimientos');

    const fechaHoy = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Reporte_Vencimientos_VyA_${fechaHoy}.xlsx`);
  };

  // Cálculo de resumen
  const hoy = new Date().toISOString().split('T')[0];
  const vencidos = documentos.filter((d) => d.fecha_vencimiento < hoy).length;
  const proximos = documentos.filter((d) => {
    const difDias = (new Date(d.fecha_vencimiento).getTime() - new Date(hoy).getTime()) / (1000 * 3600 * 24);
    return difDias >= 0 && difDias <= 5;
  }).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Encabezado con Logo */}
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center flex flex-col items-center justify-center space-y-3">
          <img src="/logo.jpeg" alt="VyA Consulting Logo" className="h-16 object-contain" />
          <h1 className="text-2xl font-bold text-gray-800">Sistema de Control de Vencimientos y Alertas B2B</h1>
          <p className="text-sm text-gray-500">Gestión Integral de Facturas, Boletas y Tickets (Soles y Dólares)</p>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-red-600 uppercase">Documentos Vencidos</span>
            <p className="text-3xl font-extrabold text-red-700 mt-1">{vencidos}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-amber-600 uppercase">Próximos a Vencer (≤ 5 días)</span>
            <p className="text-3xl font-extrabold text-amber-700 mt-1">{proximos}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-emerald-600 uppercase">Total Registros Almacenados</span>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1">{documentos.length}</p>
          </div>
        </div>

        {/* Formulario de Registro */}
        <form onSubmit={guardarDocumento} className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Ingresar Nuevo Documento</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Movimiento</label>
              <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
                <option>Por Pagar (Proveedor)</option>
                <option>Por Cobrar (Cliente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
                <option>Factura</option>
                <option>Boleta</option>
                <option>Ticket</option>
                <option>RxH</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° Documento *</label>
              <input type="text" placeholder="Ej: F001-4589" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código Proyecto</label>
              <input type="text" placeholder="Ej: PRJ-2026" value={codigoProyecto} onChange={(e) => setCodigoProyecto(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Empresa / Cliente / Proveedor *</label>
              <input type="text" placeholder="Razón Social o Nombre" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" step="0.01" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white">
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Emisión</label>
              <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Vencimiento *</label>
              <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors">
            ➕ Guardar Documento
          </button>
        </form>

        {/* Tabla de Registros y Botón de Excel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
            <h2 className="text-lg font-semibold text-gray-800">Registros de Documentos</h2>
            <button
              onClick={exportarAExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2 text-sm"
            >
              📊 Exportar a Excel
            </button>
          </div>

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-4">Cargando datos desde la nube...</p>
          ) : documentos.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No hay documentos registrados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase font-semibold">
                    <th className="p-3">Movimiento</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Proyecto</th>
                    <th className="p-3">Monto</th>
                    <th className="p-3">Vencimiento</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documentos.map((doc) => {
                    const esVencido = doc.fecha_vencimiento < hoy;
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{doc.tipo_movimiento}</td>
                        <td className="p-3">{doc.tipo_documento}: {doc.numero_documento}</td>
                        <td className="p-3">{doc.empresa}</td>
                        <td className="p-3">{doc.codigo_proyecto || '-'}</td>
                        <td className="p-3 font-semibold">{doc.moneda === 'PEN' ? 'S/' : '$'} {doc.monto.toFixed(2)}</td>
                        <td className="p-3">{doc.fecha_vencimiento}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${esVencido ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {esVencido ? 'VENCIDO' : 'AL DÍA'}
                          </span>
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