import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

const EquiposView = () => {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEquipos, setFilteredEquipos] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'modelo', direction: 'asc' });
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchEquipos();
  }, []);

  useEffect(() => {
    filterAndSortEquipos();
  }, [searchTerm, equipos, sortConfig]);

  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .order('modelo', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEquipos = () => {
    let filtered = equipos;

    if (searchTerm) {
      filtered = equipos.filter(equipo =>
        equipo.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        equipo.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Orden especial para periodicidad
      if (sortConfig.key === 'periodicidad') {
        const periodicidadOrder = {
          'Mensual': 1,
          'Bimestral': 2,
          'Trimestral': 3,
          'Cuatrimestral': 4,
          'Semestral': 5,
          'Anual': 6
        };
        aValue = periodicidadOrder[aValue] || 999;
        bValue = periodicidadOrder[bValue] || 999;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredEquipos(sorted);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (equipo) => {
    setEditingEquipo({ ...equipo });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('equipos')
        .update({
          cliente: editingEquipo.cliente,
          modelo: editingEquipo.modelo,
          numero_serie: editingEquipo.numero_serie,
          periodicidad: editingEquipo.periodicidad,
          fecha_primer_servicio: editingEquipo.fecha_primer_servicio,
          en_garantia: editingEquipo.en_garantia
        })
        .eq('id', editingEquipo.id);

      if (error) throw error;

      setEquipos(equipos.map(e => e.id === editingEquipo.id ? editingEquipo : e));
      setShowEditModal(false);
      setEditingEquipo(null);
    } catch (error) {
      console.error('Error updating equipo:', error);
      alert('Error al actualizar equipo: ' + error.message);
    }
  };

  const handleDelete = async (equipoId) => {
    try {
      const { error } = await supabase
        .from('equipos')
        .delete()
        .eq('id', equipoId);

      if (error) throw error;

      setEquipos(equipos.filter(e => e.id !== equipoId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting equipo:', error);
      alert('Error al eliminar equipo: ' + error.message);
    }
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

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
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
            <Link to="/clientes" className="flex items-center space-x-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Clientes</span>
            </Link>
            <Link to="/equipos" className="flex items-center space-x-3 px-3 py-2 bg-gray-800 rounded text-white">
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
            </div>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, modelo o número de serie..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th onClick={() => handleSort('modelo')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>Modelo</span>
                      {getSortIcon('modelo')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('numero_serie')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>No. Serie</span>
                      {getSortIcon('numero_serie')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('cliente')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>Cliente</span>
                      {getSortIcon('cliente')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('fecha_primer_servicio')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>Primer Servicio</span>
                      {getSortIcon('fecha_primer_servicio')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('periodicidad')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>Periodicidad</span>
                      {getSortIcon('periodicidad')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('en_garantia')} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                    <div className="flex items-center space-x-1">
                      <span>Garantía</span>
                      {getSortIcon('en_garantia')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEquipos.map((equipo) => (
                  <tr key={equipo.id} className="hover:bg-gray-50">
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
                          ? format(parseISO(equipo.fecha_primer_servicio), 'dd/MM/yy')
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(equipo)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(equipo)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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

          <div className="mt-4 text-sm text-gray-600">
            Mostrando {filteredEquipos.length} de {equipos.length} equipos
          </div>
        </div>
      </div>

      {/* Modal Editar Equipo */}
      {showEditModal && editingEquipo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Editar Equipo</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingEquipo.cliente}
                  onChange={(e) => setEditingEquipo({ ...editingEquipo, cliente: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingEquipo.modelo}
                    onChange={(e) => setEditingEquipo({ ...editingEquipo, modelo: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingEquipo.numero_serie}
                    onChange={(e) => setEditingEquipo({ ...editingEquipo, numero_serie: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Periodicidad</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingEquipo.periodicidad}
                    onChange={(e) => setEditingEquipo({ ...editingEquipo, periodicidad: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Primer Servicio</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingEquipo.fecha_primer_servicio || ''}
                    onChange={(e) => setEditingEquipo({ ...editingEquipo, fecha_primer_servicio: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={editingEquipo.en_garantia}
                    onChange={(e) => setEditingEquipo({ ...editingEquipo, en_garantia: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">En Garantía</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEquipo(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro que deseas eliminar el equipo <strong>{showDeleteConfirm.modelo}</strong> (S/N: {showDeleteConfirm.numero_serie})?
            </p>
            <p className="text-sm text-red-600 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquiposView;
