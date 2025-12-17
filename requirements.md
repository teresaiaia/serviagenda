# Sistema de Mantenimiento Preventivo - Equipos Médicos

## Problema Original
Sistema de programación de servicios técnicos de mantenimiento preventivo para clientes con equipos médicos. Una persona de la empresa autoriza los servicios mensualmente. Periodicidad configurable: mensual, bimensual, trimestral, cuatrimestral, semestral o anual. Cargar modelos de equipos con números de serie, nombre del cliente, estado de garantía y fecha de vencimiento. Calendario simple mostrando nombre del equipo y cliente. Sin autenticación.

## Requisitos del Usuario
- Visual limpia y compacta para ver varios equipos
- Vista calendario mensual + lista de próximos servicios
- Interfaz en español
- Campo para marcar servicios como "autorizado"

## Arquitectura Implementada

### Backend (FastAPI + MongoDB)
- **Modelos:**
  - Cliente: id, nombre
  - Equipo: id, modelo, numero_serie, cliente_id, periodicidad, en_garantia, fecha_fin_garantia
  - Servicio: id, equipo_id, fecha_programada, autorizado

- **Endpoints API:**
  - CRUD Clientes: GET/POST/PUT/DELETE /api/clientes
  - CRUD Equipos: GET/POST/PUT/DELETE /api/equipos
  - GET /api/servicios/proximos - Lista de próximos 20 servicios
  - GET /api/calendario/{año}/{mes} - Servicios de un mes
  - PUT /api/servicios/{id}/autorizar - Autorizar/desautorizar servicio

### Frontend (React + Tailwind + Shadcn)
- Dashboard con calendario expandido
- Lista lateral de próximos servicios
- Gestión de clientes (CRUD)
- Gestión de equipos con periodicidad y garantía
- Autorización de servicios desde calendario y lista

## Funcionalidades Completadas
- ✅ CRUD de clientes
- ✅ CRUD de equipos médicos
- ✅ Generación automática de servicios según periodicidad
- ✅ Calendario mensual con visualización de servicios
- ✅ Lista de próximos servicios
- ✅ Autorización de servicios
- ✅ Indicador de garantía en equipos
- ✅ Navegación responsive (desktop + móvil)
- ✅ Interfaz completamente en español

## Próximas Tareas Sugeridas
1. Filtros en calendario por cliente o equipo
2. Exportar agenda a PDF o Excel
3. Historial de servicios realizados
4. Recordatorios por email
5. Búsqueda de equipos/clientes
