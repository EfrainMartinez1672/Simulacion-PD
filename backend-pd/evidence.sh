#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Load local settings only when API_KEYS was not already provided by the caller.
if [[ -z "${API_KEYS:-}" && -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

IFS=',' read -r API_KEY_ONE API_KEY_TWO _ <<< "${API_KEYS:-}"
API_KEY_ONE="$(printf '%s' "${API_KEY_ONE:-}" | xargs)"
API_KEY_TWO="$(printf '%s' "${API_KEY_TWO:-}" | xargs)"
if [[ -z "$API_KEY_ONE" || -z "$API_KEY_TWO" || "$API_KEY_ONE" == "$API_KEY_TWO" ]]; then
  echo 'ERROR: API_KEYS debe contener dos claves distintas separadas por coma.' >&2
  exit 2
fi

# Compose may return before Nest finishes initializing; wait for public Swagger.
if ! curl --silent --show-error --fail --retry 20 --retry-all-errors \
  --retry-delay 1 --max-time 2 "${BASE_URL}/api/docs-json" >/dev/null; then
  echo "ERROR: la API no respondió en ${BASE_URL}; inicia el backend antes del script." >&2
  exit 1
fi

PASS_COUNT=0
LAST_BODY=''
LAST_STATUS=''

request() {
  local method="$1" key="$2" user="$3" path="$4" body="${5:-}"
  local response
  local -a args=(--silent --show-error --request "$method" --write-out $'\n%{http_code}')
  [[ -n "$key" ]] && args+=(--header "x-api-key: $key")
  [[ -n "$user" ]] && args+=(--header "x-user: $user")
  if [[ -n "$body" ]]; then
    args+=(--header 'Content-Type: application/json' --data "$body")
  fi

  if ! response="$(curl "${args[@]}" "${BASE_URL}${path}")"; then
    echo "ERROR: no se pudo conectar con ${BASE_URL}" >&2
    exit 1
  fi
  LAST_STATUS="${response##*$'\n'}"
  LAST_BODY="${response%$'\n'*}"
}

expect_status() {
  local scenario="$1" expected="$2"
  if [[ "$LAST_STATUS" != "$expected" ]]; then
    printf 'FAIL [%s]: esperado HTTP %s, recibido HTTP %s\n%s\n' \
      "$scenario" "$expected" "$LAST_STATUS" "$LAST_BODY" >&2
    exit 1
  fi
  printf 'PASS [%s]: HTTP %s\n' "$scenario" "$LAST_STATUS"
  PASS_COUNT=$((PASS_COUNT + 1))
}

assert_success_envelope() {
  printf '%s' "$LAST_BODY" | node -e '
    let raw = "";
    process.stdin.on("data", chunk => raw += chunk);
    process.stdin.on("end", () => {
      const json = JSON.parse(raw);
      if (json.success !== true || !Object.prototype.hasOwnProperty.call(json, "data")) process.exit(1);
    });
  ' || { echo 'FAIL: se esperaba el sobre exitoso { success: true, data }.' >&2; exit 1; }
}

assert_error_envelope() {
  local expected="$1"
  printf '%s' "$LAST_BODY" | EXPECTED_STATUS="$expected" node -e '
    let raw = "";
    process.stdin.on("data", chunk => raw += chunk);
    process.stdin.on("end", () => {
      const json = JSON.parse(raw);
      if (json.success !== false || json.statusCode !== Number(process.env.EXPECTED_STATUS) || !json.message) process.exit(1);
    });
  ' || { echo 'FAIL: el Exception Filter no normalizó el error o alteró el status HTTP.' >&2; exit 1; }
}

json_value() {
  local path="$1"
  printf '%s' "$LAST_BODY" | JSON_PATH="$path" node -e '
    let raw = "";
    process.stdin.on("data", chunk => raw += chunk);
    process.stdin.on("end", () => {
      const value = process.env.JSON_PATH.split(".").reduce((item, key) => item?.[key], JSON.parse(raw));
      if (value === undefined || value === null) process.exit(1);
      process.stdout.write(String(value));
    });
  '
}

# 1: API key ausente debe generar HTTP 401 y el sobre de error estándar.
request GET '' supervisor1 /solicitudes
expect_status 'sin x-api-key' 401
assert_error_envelope 401

# 2: una clave no configurada también debe generar HTTP 401.
request GET 'invalid-evidence-key' supervisor1 /solicitudes
expect_status 'x-api-key inválida' 401
assert_error_envelope 401

# 3 y 4: ambas claves configuradas deben autenticar correctamente.
request GET "$API_KEY_ONE" supervisor1 /solicitudes
expect_status 'primera API key válida' 200
assert_success_envelope
request GET "$API_KEY_TWO" supervisor1 /solicitudes
expect_status 'segunda API key válida' 200
assert_success_envelope

# 5: campos obligatorios ausentes deben fallar en el ValidationPipe global.
request POST "$API_KEY_ONE" supervisor1 /solicitudes '{"cliente":"evidence-incompleta"}'
expect_status 'DTO con campos obligatorios ausentes' 400
assert_error_envelope 400

# Los valores con tipos no textuales tampoco deben convertirse implícitamente a string.
request POST "$API_KEY_ONE" supervisor1 /solicitudes \
  '{"cliente":123,"descripcion":"tipo incorrecto","asesor":"advisor1"}'
expect_status 'DTO con campo de tipo incorrecto' 400
assert_error_envelope 400

# Crear dos fixtures para comprobar el aislamiento entre asesores.
RUN_ID="$(date +%s)-$$"
request POST "$API_KEY_ONE" supervisor1 /solicitudes \
  "{\"cliente\":\"evidence-$RUN_ID\",\"descripcion\":\"Fixture asignado a advisor1\",\"asesor\":\"advisor1\"}"
expect_status 'crear solicitud propia para evidencia' 201
assert_success_envelope
OWN_ID="$(json_value data.id)"

request POST "$API_KEY_ONE" supervisor1 /solicitudes \
  "{\"cliente\":\"evidence-ajena-$RUN_ID\",\"descripcion\":\"Fixture asignado a advisor2\",\"asesor\":\"advisor2\"}"
expect_status 'crear solicitud ajena para evidencia' 201
assert_success_envelope
FOREIGN_ID="$(json_value data.id)"

# 6a: el asesor no ve una solicitud ajena al consultarla por ID.
request GET "$API_KEY_ONE" advisor1 "/solicitudes/$FOREIGN_ID"
expect_status 'advisor1 consulta solicitud ajena' 404
assert_error_envelope 404

# 6b: intentar cambiar una solicitud ajena devuelve 403.
request PATCH "$API_KEY_ONE" advisor1 "/solicitudes/$FOREIGN_ID/estado" '{"estado":"EN_GESTION"}'
expect_status 'advisor1 cambia solicitud ajena' 403
assert_error_envelope 403

# 6c: saltar PENDIENTE -> EN_GESTION y RESUELTA devuelve 400.
request PATCH "$API_KEY_ONE" advisor1 "/solicitudes/$OWN_ID/estado" '{"estado":"RESUELTA"}'
expect_status 'transición inválida PENDIENTE a RESUELTA' 400
assert_error_envelope 400

# 7: una transición válida de solicitud propia pasa y conserva formato estándar.
request PATCH "$API_KEY_ONE" advisor1 "/solicitudes/$OWN_ID/estado" '{"estado":"EN_GESTION"}'
expect_status 'transición válida de solicitud propia' 200
assert_success_envelope

request GET "$API_KEY_ONE" advisor1 /solicitudes
expect_status 'lista filtrada del asesor con sobre exitoso' 200
assert_success_envelope
printf '%s' "$LAST_BODY" | OWN_ID="$OWN_ID" node -e '
  let raw = "";
  process.stdin.on("data", chunk => raw += chunk);
  process.stdin.on("end", () => {
    const json = JSON.parse(raw);
    if (json.success !== true || !json.data.some(item => String(item.id) === process.env.OWN_ID)) process.exit(1);
  });
' || { echo 'FAIL: la respuesta del asesor no contiene su solicitud asignada.' >&2; exit 1; }

printf '\n%d comprobaciones aprobadas. Fixtures persistidos: propia=%s, ajena=%s.\n' \
  "$PASS_COUNT" "$OWN_ID" "$FOREIGN_ID"
