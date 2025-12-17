from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELOS ====================

class ClienteBase(BaseModel):
    nombre: str

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class EquipoBase(BaseModel):
    modelo: str
    numero_serie: str
    cliente_id: str
    periodicidad: str  # mensual, bimensual, trimestral, cuatrimestral, semestral, anual
    fecha_primer_servicio: str  # ISO date string - fecha desde donde se programan servicios
    en_garantia: bool = False
    fecha_fin_garantia: Optional[str] = None  # ISO date string

class EquipoCreate(EquipoBase):
    pass

class Equipo(EquipoBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fecha_creacion: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ServicioBase(BaseModel):
    equipo_id: str
    fecha_programada: str  # ISO date string
    autorizado: bool = False

class Servicio(ServicioBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ServicioDetalle(BaseModel):
    id: str
    equipo_id: str
    fecha_programada: str
    autorizado: bool
    equipo_modelo: str
    equipo_numero_serie: str
    cliente_nombre: str
    cliente_id: str
    en_garantia: bool

# ==================== UTILIDADES ====================

def calcular_proximas_fechas(fecha_inicio: date, periodicidad: str, meses_adelante: int = 12) -> List[date]:
    """Calcula las próximas fechas de servicio según la periodicidad"""
    intervalos = {
        "mensual": 1,
        "bimensual": 2,
        "trimestral": 3,
        "cuatrimestral": 4,
        "semestral": 6,
        "anual": 12
    }
    
    intervalo = intervalos.get(periodicidad, 1)
    fechas = []
    fecha_actual = fecha_inicio
    fecha_limite = date.today() + relativedelta(months=meses_adelante)
    
    while fecha_actual <= fecha_limite:
        if fecha_actual >= date.today():
            fechas.append(fecha_actual)
        fecha_actual = fecha_actual + relativedelta(months=intervalo)
    
    return fechas

# ==================== ENDPOINTS CLIENTES ====================

@api_router.get("/")
async def root():
    return {"message": "Sistema de Mantenimiento Preventivo API"}

@api_router.get("/clientes", response_model=List[Cliente])
async def get_clientes():
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    return clientes

@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente: ClienteCreate):
    cliente_obj = Cliente(**cliente.model_dump())
    doc = cliente_obj.model_dump()
    await db.clientes.insert_one(doc)
    return cliente_obj

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, cliente: ClienteCreate):
    result = await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": cliente.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    updated = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    return updated

@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str):
    # Verificar si hay equipos asociados
    equipos = await db.equipos.find_one({"cliente_id": cliente_id})
    if equipos:
        raise HTTPException(status_code=400, detail="No se puede eliminar el cliente porque tiene equipos asociados")
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return {"message": "Cliente eliminado"}

# ==================== ENDPOINTS EQUIPOS ====================

@api_router.get("/equipos", response_model=List[Equipo])
async def get_equipos():
    equipos = await db.equipos.find({}, {"_id": 0}).to_list(1000)
    return equipos

@api_router.post("/equipos", response_model=Equipo)
async def create_equipo(equipo: EquipoCreate):
    # Verificar que el cliente existe
    cliente = await db.clientes.find_one({"id": equipo.cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    equipo_obj = Equipo(**equipo.model_dump())
    doc = equipo_obj.model_dump()
    await db.equipos.insert_one(doc)
    
    # Generar servicios programados
    await generar_servicios_equipo(equipo_obj)
    
    return equipo_obj

@api_router.put("/equipos/{equipo_id}", response_model=Equipo)
async def update_equipo(equipo_id: str, equipo: EquipoCreate):
    # Verificar que el cliente existe
    cliente = await db.clientes.find_one({"id": equipo.cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    result = await db.equipos.update_one(
        {"id": equipo_id},
        {"$set": equipo.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    # Eliminar servicios no autorizados y regenerar
    await db.servicios.delete_many({"equipo_id": equipo_id, "autorizado": False})
    updated = await db.equipos.find_one({"id": equipo_id}, {"_id": 0})
    await generar_servicios_equipo(Equipo(**updated))
    
    return updated

@api_router.delete("/equipos/{equipo_id}")
async def delete_equipo(equipo_id: str):
    # Eliminar servicios asociados
    await db.servicios.delete_many({"equipo_id": equipo_id})
    result = await db.equipos.delete_one({"id": equipo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return {"message": "Equipo eliminado"}

async def generar_servicios_equipo(equipo: Equipo):
    """Genera los servicios programados para un equipo"""
    fecha_inicio = date.fromisoformat(equipo.fecha_primer_servicio)
    fechas = calcular_proximas_fechas(fecha_inicio, equipo.periodicidad)
    
    for fecha in fechas:
        # Verificar si ya existe un servicio para esta fecha
        existente = await db.servicios.find_one({
            "equipo_id": equipo.id,
            "fecha_programada": fecha.isoformat()
        })
        if not existente:
            servicio = Servicio(
                equipo_id=equipo.id,
                fecha_programada=fecha.isoformat(),
                autorizado=False
            )
            await db.servicios.insert_one(servicio.model_dump())

# ==================== ENDPOINTS SERVICIOS ====================

@api_router.get("/servicios", response_model=List[ServicioDetalle])
async def get_servicios():
    servicios = await db.servicios.find({}, {"_id": 0}).to_list(10000)
    resultado = []
    
    for servicio in servicios:
        equipo = await db.equipos.find_one({"id": servicio["equipo_id"]}, {"_id": 0})
        if equipo:
            cliente = await db.clientes.find_one({"id": equipo["cliente_id"]}, {"_id": 0})
            resultado.append(ServicioDetalle(
                id=servicio["id"],
                equipo_id=servicio["equipo_id"],
                fecha_programada=servicio["fecha_programada"],
                autorizado=servicio["autorizado"],
                equipo_modelo=equipo["modelo"],
                equipo_numero_serie=equipo["numero_serie"],
                cliente_nombre=cliente["nombre"] if cliente else "Desconocido",
                cliente_id=equipo["cliente_id"],
                en_garantia=equipo.get("en_garantia", False)
            ))
    
    return resultado

@api_router.get("/servicios/proximos", response_model=List[ServicioDetalle])
async def get_proximos_servicios():
    """Obtiene los próximos 20 servicios ordenados por fecha"""
    hoy = date.today().isoformat()
    servicios = await db.servicios.find(
        {"fecha_programada": {"$gte": hoy}},
        {"_id": 0}
    ).sort("fecha_programada", 1).to_list(20)
    
    resultado = []
    for servicio in servicios:
        equipo = await db.equipos.find_one({"id": servicio["equipo_id"]}, {"_id": 0})
        if equipo:
            cliente = await db.clientes.find_one({"id": equipo["cliente_id"]}, {"_id": 0})
            resultado.append(ServicioDetalle(
                id=servicio["id"],
                equipo_id=servicio["equipo_id"],
                fecha_programada=servicio["fecha_programada"],
                autorizado=servicio["autorizado"],
                equipo_modelo=equipo["modelo"],
                equipo_numero_serie=equipo["numero_serie"],
                cliente_nombre=cliente["nombre"] if cliente else "Desconocido",
                cliente_id=equipo["cliente_id"],
                en_garantia=equipo.get("en_garantia", False)
            ))
    
    return resultado

@api_router.put("/servicios/{servicio_id}/autorizar")
async def autorizar_servicio(servicio_id: str, autorizado: bool = True):
    result = await db.servicios.update_one(
        {"id": servicio_id},
        {"$set": {"autorizado": autorizado}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"message": "Servicio actualizado", "autorizado": autorizado}

@api_router.get("/calendario/{anio}/{mes}", response_model=List[ServicioDetalle])
async def get_calendario_mes(anio: int, mes: int):
    """Obtiene los servicios de un mes específico"""
    fecha_inicio = date(anio, mes, 1).isoformat()
    if mes == 12:
        fecha_fin = date(anio + 1, 1, 1).isoformat()
    else:
        fecha_fin = date(anio, mes + 1, 1).isoformat()
    
    servicios = await db.servicios.find(
        {"fecha_programada": {"$gte": fecha_inicio, "$lt": fecha_fin}},
        {"_id": 0}
    ).to_list(1000)
    
    resultado = []
    for servicio in servicios:
        equipo = await db.equipos.find_one({"id": servicio["equipo_id"]}, {"_id": 0})
        if equipo:
            cliente = await db.clientes.find_one({"id": equipo["cliente_id"]}, {"_id": 0})
            resultado.append(ServicioDetalle(
                id=servicio["id"],
                equipo_id=servicio["equipo_id"],
                fecha_programada=servicio["fecha_programada"],
                autorizado=servicio["autorizado"],
                equipo_modelo=equipo["modelo"],
                equipo_numero_serie=equipo["numero_serie"],
                cliente_nombre=cliente["nombre"] if cliente else "Desconocido",
                cliente_id=equipo["cliente_id"],
                en_garantia=equipo.get("en_garantia", False)
            ))
    
    return resultado

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
