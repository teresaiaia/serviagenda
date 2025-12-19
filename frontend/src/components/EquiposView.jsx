import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const EquiposView = () => {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEquipos, setFilteredEquipos] = useState([]);

  useEffect(() => {
    fetchEquipos();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchTerm, equipos]);

  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('modelo', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
      setFilteredEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEquipos = () => {
    if (!searchTerm) {
      setFilteredEquipos(equipos);
      return;
    }

    const filtered = equipos.filter(equipo =>
      equipo.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipo.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipo.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredEquipos(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Cliente', 'Modelo', 'Número de Serie', 'Periodicidad', 'Fecha Primer Servicio', 'En Garantía'];
    const rows = filteredEquipos.map(e => [
      e.cliente,
      e.modelo,
      e.numero_serie,
      e.periodicidad,
      e.fecha_primer_servicio || '-',
      e.en_garantia ? 'Sí' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `equipos_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Cargando equipos...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold">Mantenimiento Preventivo</span>
          </div>

          {/* Menu */}
          <nav className="space-y-1">
            <Link
              to="/calendario"
              className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Calendario</span>
            </Link>
            <Link
              to="/clientes"
              className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Clientes</span>
            </Link>
            <Link
              to="/equipos"
              className="flex items-center space-x-3 px-3 py-2 bg-gray-800 rounded text-white"
            >
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-normal">Equipos</h1>
            <div className="flex space-x-3">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Descargar Excel</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Importar Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-8">
          <div className="bg-white rounded-lg">
            <table className="min-w-full">
              <thead>
                <tr className="border-b bg-white">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo ↑
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. Serie
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primer Servicio
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periodicidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Garantía
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredEquipos.map((equipo, index) => (
                  <tr key={equipo.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{equipo.modelo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{equipo.numero_serie}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{equipo.cliente}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {equipo.fecha_primer_servicio 
                          ? new Date(equipo.fecha_primer_servicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {equipo.periodicidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${
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

            {filteredEquipos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron equipos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquiposView;
