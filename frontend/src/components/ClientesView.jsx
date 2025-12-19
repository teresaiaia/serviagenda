import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { addYears, parseISO, format } from 'date-fns';

const ClientesView = () => {
  const [clientes, setClientes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [showAddEquipo, setShowAddEquipo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    modelo: '',
    numero_serie: '',
    periodicidad: 'Mensual',
    fecha_instalacion: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('cliente', { ascending: true });

      if (error) throw error;

      // Extraer clientes únicos
      const clientesUnicos = [...new Set(data.map(e => e.cliente))].map(nombre => ({
        nombre,
        equipos: data.filter(e => e.cliente === nombre).length
      }));

      setClientes(clientesUnicos);
      setEquipos(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEquiposDelCliente = (nombreCliente) => {
    return equipos.filter(e => e.cliente === nombreCliente);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Calcular fecha de garantía (1 año desde instalación)
    const fechaInstalacion = parseISO(formData.fecha_instalacion);
    const fechaGarantia = addYears(fechaInstalacion, 1);
    const enGarantia = new Date() < fechaGarantia;

    const nuevoEquipo = {
      cliente: selectedCliente,
      modelo: formData.modelo,
      numero_serie: formData.numero_serie,
      periodicidad: formData.periodicidad,
      fecha_primer_servicio: formData.fecha_instalacion,
      en_garantia: enGarantia,
    };

    try {
      const { data, error } = await supabase
        .from('equipos')
        .insert([nuevoEquipo])
        .select();

      if (error) throw error;

      // Actualizar estado local
      setEquipos([...equipos, data[0]]);
      
      // Actualizar contador del cliente
      const clienteActualizado = clientes.find(c => c.nombre === selectedCliente);
      if (clienteActualizado) {
        clienteActualizado.equipos += 1;
        setClientes([...clientes]);
      }

      // Resetear formulario
      setFormData({
        modelo: '',
        numero_serie: '',
        periodicidad: 'Mensual',
        fecha_instalacion: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowAddEquipo(false);

      alert('Equipo agregado exitosamente');
    } catch (error) {
      console.error('Error adding equipo:', error);
      alert('Error al agregar equipo: ' + error.message);
    }
  };

  const filteredClientes = clientes.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Cargando clientes...</div>
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
            <Link to="/calendario" className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendario</span>
            </Link>
            <Link to="/clientes" className="flex items-center space-x-3 px-3 py-2 bg-gray-800 rounded text-white">
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-normal">Clientes</h1>
            <div className="text-sm text-gray-500">
              {clientes.length} clientes · {equipos.length} equipos
            </div>
          </div>
          <div className="relative max-w-xl">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Lista de Clientes */}
            <div className="w-1/3 bg-white border-r overflow-auto">
              <div className="divide-y">
                {filteredClientes.map((cliente) => (
                  <button
                    key={cliente.nombre}
                    onClick={() => {
                      setSelectedCliente(cliente.nombre);
                      setShowAddEquipo(false);
                    }}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 ${
                      selectedCliente === cliente.nombre ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">{cliente.nombre}</div>
                    <div className="text-sm text-gray-500 mt-1">{cliente.equipos} equipos</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle del Cliente */}
            <div className="flex-1 p-8 overflow-auto">
              {!selectedCliente ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Selecciona un cliente para ver sus equipos
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">{selectedCliente}</h2>
                    <button
                      onClick={() => setShowAddEquipo(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Agregar Equipo</span>
                    </button>
                  </div>

                  {/* Formulario Agregar Equipo */}
                  {showAddEquipo && (
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Nuevo Equipo</h3>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Modelo *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.modelo}
                            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                            placeholder="Ej: STELLAR M22"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de Serie *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.numero_serie}
                            onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                            placeholder="Ej: SN002507"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Periodicidad de Mantenimiento *
                          </label>
                          <select
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.periodicidad}
                            onChange={(e) => setFormData({ ...formData, periodicidad: e.target.value })}
                          >
                            <option value="Mensual">Mensual</option>
                            <option value="Bimestral">Bimestral</option>
                            <option value="Trimestral">Trimestral</option>
                            <option value="Cuatrimestral">Cuatrimestral</option>
                            <option value="Semestral">Semestral</option>
                            <option value="Anual">Anual</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Instalación *
                          </label>
                          <input
                            type="date"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.fecha_instalacion}
                            onChange={(e) => setFormData({ ...formData, fecha_instalacion: e.target.value })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            La garantía se calculará automáticamente (1 año desde la instalación)
                          </p>
                        </div>

                        <div className="flex space-x-3 pt-2">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Guardar Equipo
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddEquipo(false)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Lista de Equipos del Cliente */}
                  <div className="bg-white rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Serie</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodicidad</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instalación</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garantía</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {getEquiposDelCliente(selectedCliente).map((equipo) => (
                          <tr key={equipo.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{equipo.modelo}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{equipo.numero_serie}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {equipo.periodicidad}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {equipo.fecha_primer_servicio
                                ? format(parseISO(equipo.fecha_primer_servicio), 'dd/MM/yyyy')
                                : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                equipo.en_garantia
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {equipo.en_garantia ? 'Sí' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientesView;
