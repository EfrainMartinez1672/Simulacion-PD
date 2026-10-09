# Evidencias de aceptación HTTP

El script `evidence.sh` ejecuta las verificaciones contra un servidor activo, valida el estado HTTP y comprueba el formato de los JSON. Los IDs, fechas y contenido de la lista cambian según la base SQLite. Las claves de los ejemplos son las locales de `.env.example`; reemplázalas por los valores reales de `.env` al ejecutar manualmente.

## Preparar y ejecutar

Desde `backend-pd`:

```bash
test -f .env || cp .env.example .env
# Comprueba que API_KEYS contiene dos claves distintas.
docker compose up --build -d
chmod +x evidence.sh
./evidence.sh
```

Para apuntar a otra instancia, usa `BASE_URL=http://localhost:3000 ./evidence.sh`. El script crea dos solicitudes fixture y las conserva en SQLite.

Variables usadas en los ejemplos manuales:

```bash
BASE=http://localhost:3000
KEY1=local-dev-key-one
KEY2=local-dev-key-two
```

## 1. Petición sin `x-api-key` — HTTP 401

```bash
curl -i "$BASE/solicitudes" -H 'x-user: supervisor1'
```

JSON esperado:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Missing or invalid API key",
  "error": "Unauthorized"
}
```

## 2. API key inválida — HTTP 401

```bash
curl -i "$BASE/solicitudes" \
  -H 'x-api-key: invalid-evidence-key' \
  -H 'x-user: supervisor1'
```

JSON esperado: `success` es `false`, `statusCode` es `401` y el mensaje indica que la clave es inválida.

## 3. Primera clave válida — HTTP 200

```bash
curl -i "$BASE/solicitudes" -H "x-api-key: $KEY1" -H 'x-user: supervisor1'
```

JSON esperado (puede tener solicitudes existentes en `data`):

```json
{ "success": true, "data": [] }
```

## 4. Segunda clave válida — HTTP 200

```bash
curl -i "$BASE/solicitudes" -H "x-api-key: $KEY2" -H 'x-user: supervisor1'
```

JSON esperado: HTTP 200 y el sobre `{"success":true,"data":[...]}`. La configuración de `API_KEYS` admite múltiples claves separadas por coma.

## 5. DTO incompleto — HTTP 400

```bash
curl -i -X POST "$BASE/solicitudes" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY1" \
  -H 'x-user: supervisor1' \
  -d '{"cliente":"evidence-incompleta"}'
```

JSON esperado (la lista concreta de mensajes depende de las propiedades ausentes):

```json
{
  "success": false,
  "statusCode": 400,
  "message": [
    "descripcion should not be null or undefined",
    "asesor should not be null or undefined"
  ],
  "error": "Bad Request"
}
```

`ValidationPipe` usa `whitelist`, `forbidNonWhitelisted` y `transform`; los DTOs validan presencia y tipo sin convertir valores no textuales a cadenas.

**Campo con tipo incorrecto — HTTP 400:**

```bash
curl -i -X POST "$BASE/solicitudes" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY1" \
  -H 'x-user: supervisor1' \
  -d '{"cliente":123,"descripcion":"tipo incorrecto","asesor":"advisor1"}'
```

Respuesta esperada: HTTP 400, `success:false`, `statusCode:400`; el validador señala que `cliente` debe ser texto.

## 6. Propiedad del asesor y máquina de estados

El script crea una solicitud para `advisor1` y otra para `advisor2`. Sustituye `ID_AJENO` por el ID que devolvió la creación del fixture de `advisor2`.

**Intento de consultar una solicitud ajena — HTTP 404:**

```bash
curl -i "$BASE/solicitudes/ID_AJENO" \
  -H "x-api-key: $KEY1" -H 'x-user: advisor1'
```

El error está normalizado y no revela la solicitud ajena: `success:false`, `statusCode:404`.

**Intento de cambiar el estado de una solicitud ajena — HTTP 403:**

```bash
curl -i -X PATCH "$BASE/solicitudes/ID_AJENO/estado" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY1" \
  -H 'x-user: advisor1' \
  -d '{"estado":"EN_GESTION"}'
```

JSON esperado:

```json
{
  "success": false,
  "statusCode": 403,
  "message": "No puedes cambiar el estado de una solicitud no asignada a ti",
  "error": "Forbidden"
}
```

**Transición inválida `PENDIENTE -> RESUELTA` — HTTP 400:**

```bash
curl -i -X PATCH "$BASE/solicitudes/ID_PROPIO/estado" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY1" \
  -H 'x-user: advisor1' \
  -d '{"estado":"RESUELTA"}'
```

JSON esperado:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Transición inválida: PENDIENTE -> RESUELTA",
  "error": "Bad Request"
}
```

El flujo permitido es `PENDIENTE -> EN_GESTION -> RESUELTA`; `RESUELTA` no tiene transiciones de salida.

**Transición válida de una solicitud propia — HTTP 200:**

```bash
curl -i -X PATCH "$BASE/solicitudes/ID_PROPIO/estado" \
  -H 'Content-Type: application/json' \
  -H "x-api-key: $KEY1" \
  -H 'x-user: advisor1' \
  -d '{"estado":"EN_GESTION"}'
```

JSON esperado: `success:true`, `data.estado:"EN_GESTION"`.

## 7. Formato del interceptor y Exception Filter

**Éxito** (interceptor global):

```json
{
  "success": true,
  "data": [{ "id": 1, "cliente": "cliente-001", "estado": "PENDIENTE" }]
}
```

**Error** (Exception Filter global, ejemplo 401):

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Missing or invalid API key",
  "error": "Unauthorized"
}
```

`evidence.sh` comprueba que cada éxito tenga `success:true` y `data`, y que los errores tengan `success:false`, el `statusCode` igual al HTTP real y un `message`. El estado HTTP no se pierde al normalizar el cuerpo.

## Interpretación

El script imprime `PASS` por cada estado esperado. Termina con código distinto de cero al fallar un status, un esquema de respuesta o si no aparecen las solicitudes propias del asesor en su lista.
