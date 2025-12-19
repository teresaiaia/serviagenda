import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, addMonths as addMonthsDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const CalendarioView = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedServicio, setSelectedServicio] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEquipos();
  }, []);

  useEffect(() => {
    if (equipos.length > 0) {
      calcularServicios();
    }
  }, [equipos, currentDate]);

  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularServicios = () => {
    const serviciosCalculados = [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    equipos.forEach(equipo => {
      if (!equipo.fecha_primer_servicio) return;

      const fechaInicio = parseISO(equipo.fecha_primer_servicio);
      let fechaServicio = new Date(fechaInicio);
      
      const fechaLimite = addMonths(currentDate, 12);

      while (fechaServicio <= fechaLimite) {
        const autorizado = Math.random() > 0.3;
        
        serviciosCalculados.push({
          id: `${equipo.id}-${fechaServicio.toISOString()}`,
          equipo_id: equipo.id,
          cliente: equipo.cliente,
          modelo: equipo.modelo,
          numero_serie: equipo.numero_serie,
          fecha: fechaServicio,
          periodicidad: equipo.periodicidad,
          autorizado: autorizado
        });

        switch (equipo.periodicidad?.toLowerCase()) {
          case 'mensual':
            fechaServicio = addMonthsDate(fechaServicio, 1);
            break;
          case 'bimestral':
            fechaServicio = addMonthsDate(fechaServicio, 2);
            break;
          case 'trimestral':
            fechaServicio = addMonthsDate(fechaServicio, 3);
            break;
          case 'cuatrimestral':
            fechaServicio = addMonthsDate(fechaServicio, 4);
            break;
          case 'semestral':
            fechaServicio = addMonthsDate(fechaServicio, 6);
            break;
          case 'anual':
            fechaServicio = addMonthsDate(fechaServicio, 12);
            break;
          default:
            fechaServicio = addMonthsDate(fechaServicio, 1);
        }
      }
    });

    setServicios(serviciosCalculados);
  };

  const handleServicioClick = (servicio) => {
    setSelectedServicio(servicio);
    setShowModal(true);
  };

  const toggleAutorizacion = () => {
    if (!selectedServicio) return;

    const serviciosActualizados = servicios.map(s => 
      s.id === selectedServicio.id 
        ? { ...s, autorizado: !s.autorizado }
        : s
    );
    
    setServicios(serviciosActualizados);
    setSelectedServicio({ ...selectedServicio, autorizado: !selectedServicio.autorizado });
  };

  const getServiciosDelDia = (dia) => {
    return servicios.filter(servicio => 
      isSameDay(servicio.fecha, dia)
    );
  };

  const getProximosServicios = () => {
    const hoy = new Date();
    return servicios
      .filter(s => s.fecha >= hoy)
      .sort((a, b) => a.fecha - b.fecha)
      .slice(0, 10);
  };

  const contarClientesUnicos = () => {
    const clientesUnicos = new Set(equipos.map(e => e.cliente));
    return clientesUnicos.size;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const allDays = [...emptyDays, ...daysInMonth];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold">Mantenimiento Preventivo</span>
          </div>

          <nav className="space-y-1">
            <Link to="/calendario" className="flex items-center space-x-3 px-3 py-2 bg-gray-800 rounded text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendario</span>
            </Link>
            <Link to="/clientes" className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Clientes</span>
            </Link>
            <Link to="/equipos" className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span>Equipos</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar cliente, equipo o número de serie..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {contarClientesUnicos()} clientes · {equipos.length} equipos
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-8 overflow-auto">
            <div className="bg-white rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-2xl font-normal capitalize">
                  {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h2>
                <div className="flex space-x-2">
                  <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b bg-gray-50">
                {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(day => (
                  <div key={day} className="px-3 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {allDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[120px] border-b border-r bg-gray-50" />;
                  }

                  const serviciosDelDia = getServiciosDelDia(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] border-b border-r p-2 ${
                        !isSameMonth(day, currentDate) ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="text-sm text-gray-600 mb-2">
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {serviciosDelDia.slice(0, 3).map((servicio) => (
                          <button
                            key={servicio.id}
                            onClick={() => handleServicioClick(servicio)}
                            className={`w-full text-left text-xs p-2 rounded border cursor-pointer hover:opacity-80 transition ${
                              servicio.autorizado 
                                ? 'bg-green-50 border-green-200 text-green-900'
                                : 'bg-yellow-50 border-yellow-200 text-yellow-900'
                            }`}
                          >
                            <div className="font-medium">{servicio.periodicidad} - {servicio.modelo}</div>
                            <div className="text-[11px] mt-0.5 opacity-75">{servicio.cliente}</div>
                          </button>
                        ))}
                        {serviciosDelDia.length > 3 && (
                          <div className="text-xs text-gray-500 pl-2">
                            +{serviciosDelDia.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-80 bg-white border-l p-6 overflow-auto">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              PRÓXIMOS SERVICIOS
            </h3>
            <div className="space-y-4">
              {getProximosServicios().map((servicio) => (
                <div key={servicio.id} className="pb-4 border-b last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{servicio.modelo}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{servicio.cliente}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {format(servicio.fecha, 'dd/MM/yy')}
                      </div>
                    </div>
                    {servicio.autorizado && (
                      <div className="ml-2">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Servicio */}
      {showModal && selectedServicio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Detalles del Servicio</h3>
            
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-600">Cliente:</span>
                <p className="text-gray-900">{selectedServicio.cliente}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Equipo:</span>
                <p className="text-gray-900">{selectedServicio.modelo}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">No. Serie:</span>
                <p className="text-gray-900">{selectedServicio.numero_serie}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Fecha:</span>
                <p className="text-gray-900">{format(selectedServicio.fecha, "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Periodicidad:</span>
                <p className="text-gray-900">{selectedServicio.periodicidad}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <button
                onClick={toggleAutorizacion}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  selectedServicio.autorizado
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {selectedServicio.autorizado ? '❌ Marcar como No Autorizado' : '✓ Marcar como Autorizado'}
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioView;
