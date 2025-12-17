import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Monitor, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Shield,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PERIODICIDADES = [
  { value: "mensual", label: "Mensual" },
  { value: "bimensual", label: "Bimensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "cuatrimestral", label: "Cuatrimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function App() {
  const [activeTab, setActiveTab] = useState("calendario");
  const [clientes, setClientes] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [proximosServicios, setProximosServicios] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [serviciosDelDia, setServiciosDelDia] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [clientesRes, equiposRes, proximosRes] = await Promise.all([
        axios.get(`${API}/clientes`),
        axios.get(`${API}/equipos`),
        axios.get(`${API}/servicios/proximos`)
      ]);
      setClientes(clientesRes.data);
      setEquipos(equiposRes.data);
      setProximosServicios(proximosRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchServiciosMes = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/calendario/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`);
      setServicios(res.data);
    } catch (error) {
      console.error("Error fetching servicios:", error);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchServiciosMes();
  }, [fetchServiciosMes]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getServiciosForDay = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return servicios.filter(s => s.fecha_programada === dateStr);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const serviciosDay = getServiciosForDay(day);
    if (serviciosDay.length > 0) {
      setSelectedDate(dateStr);
      setServiciosDelDia(serviciosDay);
      setShowServicioModal(true);
    }
  };

  const handleAutorizar = async (servicioId, autorizado) => {
    try {
      await axios.put(`${API}/servicios/${servicioId}/autorizar?autorizado=${autorizado}`);
      toast.success(autorizado ? "Servicio autorizado" : "Autorización removida");
      fetchServiciosMes();
      fetchData();
      setServiciosDelDia(prev => prev.map(s => s.id === servicioId ? {...s, autorizado} : s));
    } catch (error) {
      toast.error("Error al actualizar el servicio");
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen bg-slate-50" data-testid="app-container">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-heading font-bold text-lg text-slate-900">Mantenimiento Preventivo</h1>
          </div>
          <div className="text-sm text-slate-500">
            {clientes.length} clientes · {equipos.length} equipos
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="sidebar w-48 hidden md:flex flex-col p-3 gap-1">
          <button
            data-testid="nav-calendario"
            onClick={() => setActiveTab("calendario")}
            className={`sidebar-link ${activeTab === "calendario" ? "active" : ""}`}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendario
          </button>
          <button
            data-testid="nav-clientes"
            onClick={() => setActiveTab("clientes")}
            className={`sidebar-link ${activeTab === "clientes" ? "active" : ""}`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>
          <button
            data-testid="nav-equipos"
            onClick={() => setActiveTab("equipos")}
            className={`sidebar-link ${activeTab === "equipos" ? "active" : ""}`}
          >
            <Monitor className="w-4 h-4" />
            Equipos
          </button>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50">
          <button
            onClick={() => setActiveTab("calendario")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs ${activeTab === "calendario" ? "text-slate-900" : "text-slate-500"}`}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendario
          </button>
          <button
            onClick={() => setActiveTab("clientes")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs ${activeTab === "clientes" ? "text-slate-900" : "text-slate-500"}`}
          >
            <Users className="w-5 h-5" />
            Clientes
          </button>
          <button
            onClick={() => setActiveTab("equipos")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs ${activeTab === "equipos" ? "text-slate-900" : "text-slate-500"}`}
          >
            <Monitor className="w-5 h-5" />
            Equipos
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {activeTab === "calendario" && (
            <CalendarioView 
              currentDate={currentDate}
              servicios={servicios}
              proximosServicios={proximosServicios}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              getDaysInMonth={getDaysInMonth}
              getServiciosForDay={getServiciosForDay}
              onDayClick={handleDayClick}
              onAutorizar={handleAutorizar}
              formatDate={formatDate}
            />
          )}
          {activeTab === "clientes" && (
            <ClientesView 
              clientes={clientes}
              equipos={equipos}
              onAdd={() => { setEditingCliente(null); setShowClienteModal(true); }}
              onEdit={(cliente) => { setEditingCliente(cliente); setShowClienteModal(true); }}
              onDelete={async (id) => {
                try {
                  await axios.delete(`${API}/clientes/${id}`);
                  toast.success("Cliente eliminado");
                  fetchData();
                } catch (error) {
                  toast.error(error.response?.data?.detail || "Error al eliminar");
                }
              }}
            />
          )}
          {activeTab === "equipos" && (
            <EquiposView 
              equipos={equipos}
              clientes={clientes}
              onAdd={() => { setEditingEquipo(null); setShowEquipoModal(true); }}
              onEdit={(equipo) => { setEditingEquipo(equipo); setShowEquipoModal(true); }}
              onDelete={async (id) => {
                try {
                  await axios.delete(`${API}/equipos/${id}`);
                  toast.success("Equipo eliminado");
                  fetchData();
                  fetchServiciosMes();
                } catch (error) {
                  toast.error("Error al eliminar el equipo");
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Modales */}
      <ClienteModal 
        open={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        cliente={editingCliente}
        onSave={async (data) => {
          try {
            if (editingCliente) {
              await axios.put(`${API}/clientes/${editingCliente.id}`, data);
              toast.success("Cliente actualizado");
            } else {
              await axios.post(`${API}/clientes`, data);
              toast.success("Cliente creado");
            }
            fetchData();
            setShowClienteModal(false);
          } catch (error) {
            toast.error("Error al guardar el cliente");
          }
        }}
      />

      <EquipoModal 
        open={showEquipoModal}
        onClose={() => setShowEquipoModal(false)}
        equipo={editingEquipo}
        clientes={clientes}
        onSave={async (data) => {
          try {
            if (editingEquipo) {
              await axios.put(`${API}/equipos/${editingEquipo.id}`, data);
              toast.success("Equipo actualizado");
            } else {
              await axios.post(`${API}/equipos`, data);
              toast.success("Equipo creado");
            }
            fetchData();
            fetchServiciosMes();
            setShowEquipoModal(false);
          } catch (error) {
            toast.error("Error al guardar el equipo");
          }
        }}
      />

      <ServicioModal 
        open={showServicioModal}
        onClose={() => setShowServicioModal(false)}
        fecha={selectedDate}
        servicios={serviciosDelDia}
        onAutorizar={handleAutorizar}
      />
    </div>
  );
}

// ==================== CALENDARIO VIEW ====================
function CalendarioView({ currentDate, servicios, proximosServicios, onPrevMonth, onNextMonth, getDaysInMonth, getServiciosForDay, onDayClick, onAutorizar, formatDate }) {
  const days = getDaysInMonth();
  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full" data-testid="calendario-view">
      {/* Calendario */}
      <div className="lg:col-span-3 calendar-container p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-xl text-slate-900">
            {MESES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={onPrevMonth} data-testid="prev-month-btn">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onNextMonth} data-testid="next-month-btn">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-2">
          {DIAS_SEMANA.map(dia => (
            <div key={dia} className="text-center text-xs font-semibold text-slate-500 uppercase py-2">
              {dia}
            </div>
          ))}
        </div>

        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const serviciosDay = getServiciosForDay(day);
            const hasServicios = serviciosDay.length > 0;
            const allAuthorized = serviciosDay.every(s => s.autorizado);
            const someAuthorized = serviciosDay.some(s => s.autorizado);
            
            return (
              <div
                key={index}
                onClick={() => onDayClick(day)}
                className={`
                  min-h-[70px] p-1 border border-slate-100 rounded-md
                  ${day ? 'cursor-pointer hover:bg-slate-50' : ''}
                  ${isToday(day) ? 'bg-slate-100 border-slate-300' : ''}
                  ${hasServicios ? 'ring-1 ring-inset' : ''}
                  ${hasServicios && allAuthorized ? 'ring-emerald-300 bg-emerald-50/30' : ''}
                  ${hasServicios && !allAuthorized && someAuthorized ? 'ring-amber-300 bg-amber-50/30' : ''}
                  ${hasServicios && !someAuthorized ? 'ring-amber-300 bg-amber-50/30' : ''}
                `}
                data-testid={day ? `calendar-day-${day}` : undefined}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-slate-900' : 'text-slate-600'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden max-h-[45px]">
                      {serviciosDay.slice(0, 3).map(servicio => (
                        <div 
                          key={servicio.id}
                          className={`service-badge ${servicio.autorizado ? 'authorized' : 'pending'}`}
                          title={`${servicio.equipo_modelo} - ${servicio.cliente_nombre}`}
                        >
                          {servicio.equipo_modelo}
                        </div>
                      ))}
                      {serviciosDay.length > 3 && (
                        <div className="text-[9px] text-slate-500 font-medium">
                          +{serviciosDay.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Próximos servicios */}
      <div className="upcoming-list p-4" data-testid="proximos-servicios">
        <h3 className="font-heading font-semibold text-sm text-slate-900 mb-3 uppercase tracking-wide">
          Próximos Servicios
        </h3>
        <ScrollArea className="h-[calc(100vh-220px)]">
          {proximosServicios.length === 0 ? (
            <div className="empty-state py-8">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin servicios programados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximosServicios.map((servicio, idx) => (
                <div 
                  key={servicio.id} 
                  className="upcoming-item rounded-lg animate-fade-in bg-white"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  data-testid={`upcoming-service-${servicio.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {servicio.equipo_modelo}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {servicio.cliente_nombre}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(servicio.fecha_programada)}
                      </p>
                    </div>
                    <button
                      onClick={() => onAutorizar(servicio.id, !servicio.autorizado)}
                      className={`
                        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                        transition-colors duration-150
                        ${servicio.autorizado 
                          ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                      `}
                      title={servicio.autorizado ? "Autorizado" : "Pendiente"}
                      data-testid={`authorize-btn-${servicio.id}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {servicio.en_garantia && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-blue-600">
                      <Shield className="w-3 h-3" />
                      En garantía
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// ==================== CLIENTES VIEW ====================
function ClientesView({ clientes, equipos, onAdd, onEdit, onDelete }) {
  const getEquiposCount = (clienteId) => {
    return equipos.filter(e => e.cliente_id === clienteId).length;
  };

  return (
    <div data-testid="clientes-view">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-xl text-slate-900">Clientes</h2>
        <Button onClick={onAdd} className="btn-primary" data-testid="add-cliente-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {clientes.length === 0 ? (
        <div className="empty-state bg-white rounded-xl border border-slate-200 py-12">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-slate-500">No hay clientes registrados</p>
          <Button onClick={onAdd} variant="outline" className="mt-4">
            Agregar primer cliente
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Equipos</th>
                <th className="w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => (
                <tr key={cliente.id} data-testid={`cliente-row-${cliente.id}`}>
                  <td className="font-medium">{cliente.nombre}</td>
                  <td>
                    <span className="badge badge-info">{getEquiposCount(cliente.id)} equipos</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEdit(cliente)}
                        data-testid={`edit-cliente-${cliente.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onDelete(cliente.id)}
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        data-testid={`delete-cliente-${cliente.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== EQUIPOS VIEW ====================
function EquiposView({ equipos, clientes, onAdd, onEdit, onDelete }) {
  const getClienteNombre = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : "Desconocido";
  };

  const getPeriodicidadLabel = (value) => {
    const p = PERIODICIDADES.find(p => p.value === value);
    return p ? p.label : value;
  };

  return (
    <div data-testid="equipos-view">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-xl text-slate-900">Equipos</h2>
        <Button onClick={onAdd} className="btn-primary" data-testid="add-equipo-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Equipo
        </Button>
      </div>

      {clientes.length === 0 ? (
        <div className="empty-state bg-white rounded-xl border border-slate-200 py-12">
          <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-slate-500">Primero debes crear un cliente</p>
        </div>
      ) : equipos.length === 0 ? (
        <div className="empty-state bg-white rounded-xl border border-slate-200 py-12">
          <Monitor className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-slate-500">No hay equipos registrados</p>
          <Button onClick={onAdd} variant="outline" className="mt-4">
            Agregar primer equipo
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>No. Serie</th>
                  <th>Cliente</th>
                  <th>Primer Servicio</th>
                  <th>Periodicidad</th>
                  <th>Garantía</th>
                  <th className="w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map(equipo => (
                  <tr key={equipo.id} data-testid={`equipo-row-${equipo.id}`}>
                    <td className="font-medium">{equipo.modelo}</td>
                    <td className="font-mono text-xs">{equipo.numero_serie}</td>
                    <td>{getClienteNombre(equipo.cliente_id)}</td>
                    <td className="text-sm">
                      {equipo.fecha_primer_servicio ? new Date(equipo.fecha_primer_servicio + 'T00:00:00').toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td>
                      <span className="badge badge-info">{getPeriodicidadLabel(equipo.periodicidad)}</span>
                    </td>
                    <td>
                      {equipo.en_garantia ? (
                        <div>
                          <span className="badge badge-success">
                            <Shield className="w-3 h-3 mr-1" />
                            Sí
                          </span>
                          {equipo.fecha_fin_garantia && (
                            <p className="text-xs text-slate-500 mt-1">
                              Hasta: {new Date(equipo.fecha_fin_garantia).toLocaleDateString('es-ES')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-warning">No</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEdit(equipo)}
                          data-testid={`edit-equipo-${equipo.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onDelete(equipo.id)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          data-testid={`delete-equipo-${equipo.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MODALES ====================
function ClienteModal({ open, onClose, cliente, onSave }) {
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre);
    } else {
      setNombre("");
    }
  }, [cliente, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave({ nombre: nombre.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {cliente ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {cliente ? "Modifica los datos del cliente" : "Ingresa el nombre del cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="nombre" className="form-label">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className="form-input"
                data-testid="cliente-nombre-input"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-primary" data-testid="save-cliente-btn">
              {cliente ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquipoModal({ open, onClose, equipo, clientes, onSave }) {
  const [formData, setFormData] = useState({
    modelo: "",
    numero_serie: "",
    cliente_id: "",
    periodicidad: "mensual",
    fecha_primer_servicio: "",
    en_garantia: false,
    fecha_fin_garantia: ""
  });

  useEffect(() => {
    if (equipo) {
      setFormData({
        modelo: equipo.modelo,
        numero_serie: equipo.numero_serie,
        cliente_id: equipo.cliente_id,
        periodicidad: equipo.periodicidad,
        fecha_primer_servicio: equipo.fecha_primer_servicio || "",
        en_garantia: equipo.en_garantia,
        fecha_fin_garantia: equipo.fecha_fin_garantia || ""
      });
    } else {
      // Por defecto, fecha de hoy
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        modelo: "",
        numero_serie: "",
        cliente_id: clientes.length > 0 ? clientes[0].id : "",
        periodicidad: "mensual",
        fecha_primer_servicio: today,
        en_garantia: false,
        fecha_fin_garantia: ""
      });
    }
  }, [equipo, clientes, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.modelo.trim() || !formData.numero_serie.trim() || !formData.cliente_id || !formData.fecha_primer_servicio) return;
    onSave({
      ...formData,
      fecha_fin_garantia: formData.en_garantia ? formData.fecha_fin_garantia : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {equipo ? "Editar Equipo" : "Nuevo Equipo"}
          </DialogTitle>
          <DialogDescription>
            {equipo ? "Modifica los datos del equipo" : "Ingresa los datos del equipo médico"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modelo" className="form-label">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  placeholder="Ej: Monitor Signos Vitales"
                  className="form-input"
                  data-testid="equipo-modelo-input"
                />
              </div>
              <div>
                <Label htmlFor="numero_serie" className="form-label">No. Serie</Label>
                <Input
                  id="numero_serie"
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({...formData, numero_serie: e.target.value})}
                  placeholder="Ej: SN-2024-001"
                  className="form-input"
                  data-testid="equipo-serie-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cliente" className="form-label">Cliente</Label>
              <Select 
                value={formData.cliente_id} 
                onValueChange={(value) => setFormData({...formData, cliente_id: value})}
              >
                <SelectTrigger data-testid="equipo-cliente-select">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fecha_primer_servicio" className="form-label">Fecha Primer Servicio</Label>
              <Input
                id="fecha_primer_servicio"
                type="date"
                value={formData.fecha_primer_servicio}
                onChange={(e) => setFormData({...formData, fecha_primer_servicio: e.target.value})}
                className="form-input"
                data-testid="equipo-fecha-primer-servicio-input"
              />
              <p className="text-xs text-slate-500 mt-1">Desde esta fecha se programarán los servicios</p>
            </div>

            <div>
              <Label htmlFor="periodicidad" className="form-label">Periodicidad de Mantenimiento</Label>
              <Select 
                value={formData.periodicidad} 
                onValueChange={(value) => setFormData({...formData, periodicidad: value})}
              >
                <SelectTrigger data-testid="equipo-periodicidad-select">
                  <SelectValue placeholder="Seleccionar periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICIDADES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label htmlFor="garantia" className="text-sm font-medium text-slate-700">En Garantía</Label>
                <p className="text-xs text-slate-500">El equipo está cubierto por garantía</p>
              </div>
              <Switch
                id="garantia"
                checked={formData.en_garantia}
                onCheckedChange={(checked) => setFormData({...formData, en_garantia: checked})}
                data-testid="equipo-garantia-switch"
              />
            </div>

            {formData.en_garantia && (
              <div className="animate-fade-in">
                <Label htmlFor="fecha_garantia" className="form-label">Fecha Fin de Garantía</Label>
                <Input
                  id="fecha_garantia"
                  type="date"
                  value={formData.fecha_fin_garantia}
                  onChange={(e) => setFormData({...formData, fecha_fin_garantia: e.target.value})}
                  className="form-input"
                  data-testid="equipo-fecha-garantia-input"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-primary" data-testid="save-equipo-btn">
              {equipo ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ServicioModal({ open, onClose, fecha, servicios, onAutorizar }) {
  const formatFechaLarga = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading capitalize">
            {formatFechaLarga(fecha)}
          </DialogTitle>
          <DialogDescription>
            {servicios.length} servicio(s) programado(s) para este día
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-3">
            {servicios.map(servicio => (
              <div 
                key={servicio.id}
                className={`
                  p-3 rounded-lg border transition-colors duration-150
                  ${servicio.autorizado 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-amber-50 border-amber-200'}
                `}
                data-testid={`servicio-modal-item-${servicio.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{servicio.equipo_modelo}</p>
                    <p className="text-sm text-slate-600">{servicio.cliente_nombre}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">S/N: {servicio.equipo_numero_serie}</p>
                    {servicio.en_garantia && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                        <Shield className="w-3 h-3" />
                        En garantía
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onAutorizar(servicio.id, !servicio.autorizado)}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5
                      transition-colors duration-150
                      ${servicio.autorizado 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-amber-500 text-white hover:bg-amber-600'}
                    `}
                    data-testid={`modal-authorize-btn-${servicio.id}`}
                  >
                    {servicio.autorizado ? (
                      <>
                        <Check className="w-4 h-4" />
                        Autorizado
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Pendiente
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default App;
