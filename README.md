# API REST de solicitudes comerciales

API REST desarrollada con NestJS para crear, consultar y actualizar solicitudes comerciales. Usa SQLite para persistencia y Swagger para explorar y probar los endpoints.

## Requisitos

- Node.js 22 o superior y npm, para ejecutar localmente.
- Docker con Docker Compose, para ejecutar en contenedores.

## Instalación y ejecución local

Desde la raíz del repositorio:

```bash
cd backend-pd
npm install
```

Configura las variables de entorno; conserva tu `.env` existente y copia el ejemplo solo si todavía no existe:

```bash
test -f .env || cp .env.example .env
mkdir -p data
```

Edita `.env`. `API_KEYS` debe contener al menos dos claves distintas separadas por coma. Usa las claves `local-dev-*` solo localmente; para producción reemplázalas por secretos privados y aleatorios. `DB_PATH` indica el archivo SQLite. `DB_SYNCHRONIZE` puede ser `true` en desarrollo; por defecto el esquema se sincroniza en entornos no productivos y permanece desactivado por defecto en producción.

Inicia la API en modo desarrollo:

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000`. El proyecto actualmente crea/actualiza el esquema de SQLite mediante TypeORM `synchronize` en desarrollo, no mediante migraciones versionadas. Antes de un despliegue productivo, crea migraciones y ejecuta la migración inicial/actualizaciones; producción deja `DB_SYNCHRONIZE` desactivado por defecto.

Para compilar y ejecutar la build localmente:

```bash
npm run build
npm run start:prod
```

## Ejecución con Docker

Desde la raíz del repositorio:

```bash
cd backend-pd
docker compose up --build -d
```

Ver logs o detener el servicio:

```bash
docker compose logs -f backend
docker compose down
```

La base SQLite se conserva en el volumen Docker `sqlite_data` al detener el servicio. Para borrar también los datos de la base:

```bash
docker compose down -v
```

## Swagger

Con el backend iniciado, abre [http://localhost:3000/api/docs](http://localhost:3000/api/docs). Swagger permite probar los endpoints. En **Authorize** o en los headers de cada petición, proporciona:

- `x-api-key`: cualquiera de las claves separadas por coma en `API_KEYS` del `.env`.
- `x-user`: identidad de prueba, por ejemplo `advisor1`, `advisor2`, `supervisor1` o `admin1`.

Los asesores solo ven y pueden cambiar el estado de las solicitudes asignadas a ellos. Los IDs heredados `asesor-01` y `asesor-02` corresponden a `advisor1` y `advisor2`. Los supervisores y administradores pueden consultar todas las solicitudes.

## Endpoints principales

| Método  | Ruta                                 | Descripción                                                                 |
| ------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `GET`   | `/solicitudes`                       | Listado filtrado y paginado de solicitudes visibles para el usuario         |
| `GET`   | `/solicitudes/{id}`                  | Consultar solicitud por ID                                                   |
| `POST`  | `/solicitudes`                       | Crear solicitud; asigna `asesor` solo para asesores y registra historial     |
| `PATCH` | `/solicitudes/{id}/estado`           | Actualizar estado, respetando rol y asignación                             |
| `PATCH` | `/solicitudes/{id}/asignacion`       | Asignar o reasignar la solicitud a un asesor válido                         |
| `GET`   | `/solicitudes/{id}/historial`        | Historial de eventos de la solicitud                                        |

### Query params de `GET /solicitudes`

- `estado`: `PENDIENTE`, `EN_GESTION` o `RESUELTA`
- `asesor`: filtro por asesor asignado
- `cliente`: búsqueda parcial, insensible a mayúsculas/minúsculas
- `desde` y `hasta`: rango ISO-8601 sobre `creadaEn`
- `page`: número de página, por defecto `1`
- `limit`: elementos por página, por defecto `10` y máximo `100`

### Respuesta de `GET /solicitudes`

```json
{
  "items": [
    {
      "id": 1,
      "cliente": "cliente-001",
      "descripcion": "Necesita revisión",
      "asesor": "asesor02",
      "estado": "PENDIENTE",
      "creadaEn": "2025-01-01T00:00:00.000Z",
      "actualizadaEn": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

Estados permitidos: `PENDIENTE`, `EN_GESTION` y `RESUELTA`; el flujo válido es `PENDIENTE → EN_GESTION → RESUELTA`, y `RESUELTA` es terminal. El cuerpo de creación acepta `cliente` y `descripcion`; no se debe enviar `estado` ni `asesor` al crear. Un asesor recibe su propia solicitud al crearse; admin/supervisor crean solicitudes con `asesor = null` hasta que se asignan explícitamente.

## Historial de auditoría

La entidad `CommercialRequestHistory` (persistida como `request_history`) guarda eventos inmutables con estas propiedades:

- `id`
- `solicitudId`
- `tipoEvento`: `CREACION`, `ESTADO` o `ASIGNACION`
- `valorAnterior`: puede ser `null`
- `valorNuevo`
- `usuarioActor`
- `fechaEvento`

Cada cambio de estado, creación y reasignación se persiste en la misma transacción TypeORM que la modificación de la solicitud; si falla cualquiera de las dos operaciones, se revierte el cambio completo.

## Esquema y datos de prueba

El esquema se crea automáticamente con `synchronize: true` en desarrollo. Si haces cambios de columna o esquema localmente, borra el archivo SQLite de desarrollo que uses (`data/requests.sqlite` o tu `DB_PATH`) antes de reiniciar la app para evitar conflictos de esquema antiguos.

Usuarios de prueba disponibles:

- `admin1` → `admin`
- `supervisor1` → `supervisor`
- `asesor01` / `asesor02` → `asesor`
- `advisor1` / `advisor2` → `asesor` con aliases heredados (`asesor-01`, `asesor-02`)

## Curl de ejemplo

### Asignar una solicitud

```bash
curl -X PATCH http://localhost:3000/solicitudes/1/asignacion \
  -H 'x-api-key: local-dev-key-one' \
  -H 'x-user: supervisor1' \
  -H 'Content-Type: application/json' \
  -d '{"asesorId":"asesor02"}'
```

### Filtrar, paginar y buscar

```bash
curl 'http://localhost:3000/solicitudes?estado=PENDIENTE&cliente=cliente&desde=2025-01-01T00:00:00.000Z&hasta=2025-02-01T00:00:00.000Z&page=1&limit=10' \
  -H 'x-api-key: local-dev-key-one' \
  -H 'x-user: asesor02'
```

### Consultar historial

```bash
curl http://localhost:3000/solicitudes/1/historial \
  -H 'x-api-key: local-dev-key-one' \
  -H 'x-user: supervisor1'
```

## Decisiones técnicas

- Política `403 vs 404`: si la solicitud existe pero no está asignada al asesor que la consulta o modifica, la API responde `403`; si la solicitud no existe, responde `404`.
- Reasignación: la validación de `asesorId` usa `400 Bad Request` para usuarios inexistentes o no asesores; el mismo patrón se aplica de forma consistente.
- Filtros y paginación: la visibilidad del rol y los filtros se componen en la misma query TypeORM (`andWhere`) para que un asesor nunca vea datos ajenos, incluso si envía un parámetro `asesor` ajeno.
- Transacciones: la creación, actualización de estado y reasignación se ejecutan dentro de una transacción `DataSource.transaction` junto con el registro del historial.

## Evidencias HTTP

Con el backend en marcha y desde `backend-pd`:

```bash
chmod +x evidence.sh
./evidence.sh
```

El script usa `curl`, lee las dos claves de `.env` y valida códigos HTTP y sobres JSON. Crea solicitudes fixture que permanecen en SQLite. Los comandos y respuestas esperadas de cada escenario están en [backend-pd/evidence.md](backend-pd/evidence.md).

## Pruebas y calidad

Ejecuta estos comandos desde `backend-pd`:

```bash
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run lint
```
