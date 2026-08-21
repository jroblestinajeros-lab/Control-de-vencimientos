'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Documento {
  id: number
  tipo_movimiento: string
  tipo_documento: string
  numero_factura: string
  codigo_proyecto: string
  empresa_nombre: string
  fecha_ingreso: string
  dias_credito: number
  fecha_vencimiento: string
  moneda: string
  monto: number
  email_notificacion: string
  estado: string
}

export default function Home() {
  const [form, setForm] = useState({
    tipo_movimiento: 'Por Pagar',
    tipo_documento: 'Factura',
    numero_factura: '',
    codigo_proyecto: '',
    empresa_nombre: '',
    fecha_ingreso: '',
    dias_credito: 30,
    moneda: 'PEN',
    monto: '',
    email_notificacion: ''
  })

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  const calcularVencimiento = (fecha: string, dias: number) => {
    if (!fecha) return ''
    const date = new Date(fecha)
    date.setDate(date.getDate() + Number(dias))
    return date.toISOString().split('T')[0]
  }

  const fechaVencimiento = calcularVencimiento(form.fecha_ingreso, form.dias_credito)

  const obtenerDiasRestantes = (fechaVencimientoStr: string) => {
    if (!fechaVencimientoStr) return 0
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const vencimiento = new Date(fechaVencimientoStr)
    vencimiento.setHours(0, 0, 0, 0)
    const diferenciaMs = vencimiento.getTime() - hoy.getTime()
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24))
  }

  const cargarDocumentos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('facturas')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('Error al cargar:', error)
    } else {
      setDocumentos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    cargarDocumentos()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { error } = await supabase.from('facturas').insert([
      {
        ...form,
        fecha_vencimiento: fechaVencimiento,
        monto: Number(form.monto),
        estado: 'Pendiente'
      }
    ])

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      alert('¡Registro guardado con éxito!')
      setForm({
        tipo_movimiento: 'Por Pagar',
        tipo_documento: 'Factura',
        numero_factura: '',
        codigo_proyecto: '',
        empresa_nombre: '',
        fecha_ingreso: '',
        dias_credito: 30,
        moneda: 'PEN',
        monto: '',
        email_notificacion: ''
      })
      cargarDocumentos()
    }
  }

  const cambiarEstado = async (id: number, estadoActual: string, movimiento: string) => {
    let nuevoEstado = 'Pendiente'
    
    if (movimiento === 'Por Cobrar') {
      nuevoEstado = estadoActual === 'Cobrada' ? 'Pendiente' : 'Cobrada'
    } else {
      nuevoEstado = estadoActual === 'Pagada' ? 'Pendiente' : 'Pagada'
    }

    const { error } = await supabase
      .from('facturas')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      alert('Error al actualizar estado: ' + error.message)
    } else {
      cargarDocumentos()
    }
  }

  const enviarAlerta = (d: Documento, dias: number) => {
    const estadoAlerta = dias < 0 ? 'VENCIDO' : dias <= 5 ? 'PRÓXIMO A VENCER' : 'AL DÍA'
    alert(
      `🔔 ALERTA DE NOTIFICACIÓN\n\n` +
      `Para: ${d.email_notificacion}\n` +
      `Documento: ${d.tipo_documento} Nº ${d.numero_factura}\n` +
      `Entidad: ${d.empresa_nombre}\n` +
      `Monto: ${d.moneda === 'USD' ? '$' : 'S/'} ${d.monto}\n` +
      `Fecha Vencimiento: ${d.fecha_vencimiento}\n` +
      `Estado de Alerta: ${estadoAlerta} (${dias} días)`
    )
  }

  const documentosFiltrados = documentos.filter(d => {
    if (filtroTipo === 'Todos') return true
    return d.tipo_movimiento === filtroTipo
  })

  const vencidosCount = documentos.filter(d => d.estado === 'Pendiente' && obtenerDiasRestantes(d.fecha_vencimiento) < 0).length
  const proximosCount = documentos.filter(d => d.estado === 'Pendiente' && obtenerDiasRestantes(d.fecha_vencimiento) >= 0 && obtenerDiasRestantes(d.fecha_vencimiento) <= 5).length

  return (
    <div style={{ maxWidth: '1150px', margin: '30px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      
      {/* ENCABEZADO CON LOGO MÁS GRANDE */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img 
          src="/logo.jpeg" 
          alt="Logo Empresa" 
          style={{ height: '150px', width: 'auto', maxHeight: '180px', maxWidth: '400px', objectFit: 'contain', marginBottom: '16px' }} 
        />
        <h1 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Sistema de Control de Vencimientos y Alertas B2B</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Gestión integral de Facturas, Boletas y Tickets (Soles y Dólares)</p>
      </div>

      {/* TARJETAS RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '10px' }}>
          <h4 style={{ margin: 0, color: '#991b1b', fontSize: '13px' }}>🚨 Documentos Vencidos</h4>
          <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{vencidosCount}</p>
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '10px' }}>
          <h4 style={{ margin: 0, color: '#92400e', fontSize: '13px' }}>⚠️ Próximos a Vencer (≤ 5 días)</h4>
          <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{proximosCount}</p>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '10px' }}>
          <h4 style={{ margin: 0, color: '#166534', fontSize: '13px' }}>📊 Total Registros Almacenados</h4>
          <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{documentos.length}</p>
        </div>
      </div>

      {/* FORMULARIO */}
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '35px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#334155' }}>Ingresar Nuevo Documento</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo de Movimiento:</label>
            <select
              value={form.tipo_movimiento}
              onChange={(e) => setForm({ ...form, tipo_movimiento: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff' }}
            >
              <option value="Por Pagar">Por Pagar (Proveedor)</option>
              <option value="Por Cobrar">Por Cobrar (Cliente)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo de Documento:</label>
            <select
              value={form.tipo_documento}
              onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff' }}
            >
              <option value="Factura">Factura</option>
              <option value="Boleta">Boleta</option>
              <option value="Ticket">Ticket</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nº Documento:</label>
            <input
              type="text"
              required
              placeholder="Ej: F001-4589"
              value={form.numero_factura}
              onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Código Proyecto:</label>
            <input
              type="text"
              placeholder="Ej: PRJ-2026"
              value={form.codigo_proyecto}
              onChange={(e) => setForm({ ...form, codigo_proyecto: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Empresa / Cliente / Proveedor:</label>
            <input
              type="text"
              required
              placeholder="Nombre comercial"
              value={form.empresa_nombre}
              onChange={(e) => setForm({ ...form, empresa_nombre: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha Emisión:</label>
            <input
              type="date"
              required
              value={form.fecha_ingreso}
              onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Días Crédito:</label>
            <input
              type="number"
              value={form.dias_credito}
              onChange={(e) => setForm({ ...form, dias_credito: Number(e.target.value) })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>Fecha Vencimiento:</label>
            <input
              type="date"
              disabled
              value={fechaVencimiento}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', marginTop: '4px', fontWeight: 'bold' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Moneda:</label>
            <select
              value={form.moneda}
              onChange={(e) => setForm({ ...form, moneda: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px', background: '#fff' }}
            >
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares ($)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Monto:</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Email Notificación:</label>
            <input
              type="email"
              required
              placeholder="ejemplo@correo.com"
              value={form.email_notificacion}
              onChange={(e) => setForm({ ...form, email_notificacion: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '4px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
            >
              Guardar Documento
            </button>
          </div>
        </form>
      </div>

      {/* TABLA Y FILTROS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', margin: 0, color: '#0f172a' }}>Panel de Control de Documentos</h2>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 'bold', marginRight: '8px' }}>Filtrar vista:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
            >
              <option value="Todos">Todos los movimientos</option>
              <option value="Por Pagar">Solo Por Pagar</option>
              <option value="Por Cobrar">Solo Por Cobrar</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <p>Cargando registros...</p>
        ) : documentosFiltrados.length === 0 ? (
          <p style={{ color: '#64748b' }}>No se encontraron registros para esta selección.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Movimiento</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Tipo / Nº Doc</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Entidad</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>F. Vencimiento</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Alerta Días</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Monto</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Estado</th>
                  <th style={{ padding: '10px', fontSize: '12px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((d) => {
                  const diasRestantes = obtenerDiasRestantes(d.fecha_vencimiento)
                  const estaCompletado = d.estado === 'Pagada' || d.estado === 'Cobrada'

                  let colorAlertaBg = '#f0fdf4'
                  let colorAlertaTexto = '#15803d'
                  let textoAlerta = `${diasRestantes} días`

                  if (!estaCompletado) {
                    if (diasRestantes < 0) {
                      colorAlertaBg = '#fef2f2'
                      colorAlertaTexto = '#dc2626'
                      textoAlerta = `Vencido (${Math.abs(diasRestantes)}d)`
                    } else if (diasRestantes <= 5) {
                      colorAlertaBg = '#fffbeb'
                      colorAlertaTexto = '#b45309'
                      textoAlerta = `Vence en ${diasRestantes}d`
                    }
                  } else {
                    textoAlerta = 'Resuelto'
                  }

                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px',
                          backgroundColor: d.tipo_movimiento === 'Por Cobrar' ? '#e0e7ff' : '#ffe4e6',
                          color: d.tipo_movimiento === 'Por Cobrar' ? '#3730a3' : '#9f1239'
                        }}>
                          {d.tipo_movimiento || 'Por Pagar'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>
                        <strong>{d.tipo_documento || 'Factura'}:</strong> {d.numero_factura}
                        {d.codigo_proyecto && <div style={{ fontSize: '11px', color: '#64748b' }}>Proj: {d.codigo_proyecto}</div>}
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px' }}>{d.empresa_nombre}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', fontSize: '12px' }}>{d.fecha_vencimiento}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px',
                          backgroundColor: colorAlertaBg, color: colorAlertaTexto
                        }}>
                          {textoAlerta}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontSize: '12px', fontWeight: 'bold' }}>
                        {d.moneda === 'USD' ? '$' : 'S/'} {d.monto}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => cambiarEstado(d.id, d.estado || 'Pendiente', d.tipo_movimiento)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            backgroundColor: estaCompletado ? '#dcfce7' : '#fef3c7',
                            color: estaCompletado ? '#15803d' : '#b45309'
                          }}
                        >
                          {d.estado || 'Pendiente'}
                        </button>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => enviarAlerta(d, diasRestantes)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#0f172a'
                          }}
                        >
                          🔔 Notificar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}