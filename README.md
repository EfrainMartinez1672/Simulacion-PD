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

Configura las variables de entorno. Puedes copiar el ejemplo si aún no tienes un archivo `.env`:

```bash
cp .env.example .env
```

Inicia la API en modo desarrollo:

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000`. Para compilar y ejecutar en modo producción local:

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

- `x-api-key`: una de las claves separadas por coma en `API_KEYS` del `.env` (por defecto, `clave-secreta-1`).
- `x-user`: identidad de prueba, por ejemplo `advisor1`, `advisor2`, `supervisor1` o `admin1`.

Los asesores solo ven y pueden cambiar el estado de las solicitudes asignadas a ellos. Los IDs heredados `asesor-01` y `asesor-02` corresponden a `advisor1` y `advisor2`. Los supervisores y administradores pueden consultar todas las solicitudes.

## Endpoints principales

| Método  | Ruta                       | Descripción                                               |
| ------- | -------------------------- | --------------------------------------------------------- |
| `GET`   | `/solicitudes`             | Listar solicitudes visibles para el usuario               |
| `GET`   | `/solicitudes/{id}`        | Consultar solicitud por ID                                |
| `POST`  | `/solicitudes`             | Crear solicitud; su estado inicial siempre es `PENDIENTE` |
| `PATCH` | `/solicitudes/{id}/estado` | Actualizar estado, respetando rol y asignación            |

Estados permitidos: `PENDIENTE`, `EN_GESTION` y `RESUELTA`. El cuerpo de creación acepta `cliente`, `descripcion` y `asesor`; no se debe enviar `estado` al crear.

## Pruebas y calidad

Ejecuta estos comandos desde `backend-pd`:

```bash
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run lint
```
