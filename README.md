## Autenticación y Agentes IA (Beta)

Se añadió un flujo básico de registro y login, junto con endpoints placeholder para futuros agentes IA (cursos y Biblia).

### Frontend
- Archivo principal: `index.html`
- Formulario de registro: sección `#registro`
- Modal de login: marcado dinámico con id `loginModal`
- Script de manejo: `script.js` (envía peticiones al backend en `http://localhost:4000`)

### Backend
Ubicado en la carpeta `backend/`.

#### Endpoints creados
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registra usuario en memoria (name, email, password) |
| POST | /api/auth/login | Devuelve JWT si credenciales válidas |
| GET | /api/ai/courses | Devuelve mensaje placeholder (requiere Bearer token) |
| GET | /api/ai/bible | Devuelve mensaje placeholder (requiere Bearer token) |

#### Instalación Backend
```bash
cd backend
npm install
npm run start   # o: npm run dev (con nodemon)
```

#### Variables de entorno
Crear archivo `.env` dentro de `backend/`:
```
JWT_SECRET=unsecretoseguro
PORT=4000
```

### Flujo Básico
1. Usuario se registra en la sección "Registro".
2. Inicia sesión vía modal "Login".
3. Se almacena el token en `localStorage`.
4. El script realiza llamadas de ejemplo a `/api/ai/courses` y `/api/ai/bible` y muestra resultados en la consola.

### Próximos Pasos Recomendados
- Persistencia real (PostgreSQL / MongoDB).
- Validación avanzada (email ya usado, fuerza de contraseña).
- Recuperación de contraseña y verificación de email.
- Refuerzo de seguridad (rate limiting, helmet, HTTPS, expiración y rotación de tokens).
- Implementar agente IA real (RAG sobre corpus de cursos; modelo entrenado con texto bíblico). Integrar servicio externo (OpenAI / Azure OpenAI) o motor local.
- Añadir UI para conversar con los agentes (chat widget con historial).
- Añadir roles (admin, usuario) y panel para administrar cursos.
- Cache y logs estructurados.

### Integración Airtable (Registro de Usuarios)
Se agregó soporte opcional para guardar usuarios en Airtable.

#### Requisitos
1. Cuenta en Airtable.
2. Crear Base (por ejemplo: "RedHombres").
3. Obtener Base ID (desde URL de la base: `https://airtable.com/appXXXXXXXXXXXX` -> `appXXXXXXXXXXXX`).
4. Crear Tabla (por defecto se usa `Usuarios`).
5. Crear campos en la tabla:
	- `Nombre` (Single line text)
	- `Email` (Email o Single line text)
	- `PasswordHash` (Long text) – Solo para desarrollo temporal. Evitar en producción; usar DB dedicada.
	- `Creado` (Date/Time)
6. Obtener API Key o crear Token Personal (nuevo panel de tokens) y asignar permisos.

#### Variables .env
```
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Usuarios
JWT_SECRET=unsecretoseguro
PORT=4000
```

#### Endpoints adicionales relacionados Airtable
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/airtable/ping | Verifica conectividad a la base |
| GET | /api/airtable/users | Lista hasta 25 usuarios (Nombre, Email, Creado) |
| GET | /api/airtable/user?email= | Busca un usuario por email (dev) |

#### Flujo de Registro Actual
1. Verifica en memoria (sesión actual del servidor).
2. Consulta Airtable por email (fórmula con `LOWER`).
3. Si no existe, crea registro (incluye PasswordHash solo en fase dev).
4. Devuelve `airtableId` si fue creado.

#### Consideraciones de Seguridad
- No almacenar el hash de contraseña en Airtable para producción; usar DB dedicada.
- Podrías guardar solamente referencia (`UserId`) y datos no sensibles.
- Añadir control de errores y reintentos si Airtable falla.
- Implementar validaciones adicionales (regex email, longitud mínima, etc.).


### Plan de Migración de Persistencia (Recomendado)
1. Introducir SQLite/PostgreSQL para credenciales y tokens.
2. Eliminar almacenamiento de `PasswordHash` en Airtable y purgar campo.
3. Migrar usuarios existentes: solo Nombre y Email desde Airtable a DB.
4. Añadir verificación de email y recuperación de contraseña.
5. Implementar roles y auditoría.
6. Añadir caché y rate limiting.

### Notas
Este código es un MVP y no debe usarse en producción sin hardening (DB segura, no PasswordHash en Airtable, HTTPS, rate limiting, rotación de tokens, logs centralizados).

# redhombres

## Control de Secretos y Hook Pre-Push
Para evitar subir llaves o tokens sensibles al repositorio se han añadido:
1. Archivo `.gitignore` que excluye `.env` y llaves.
2. Hook `pre-push` en `.githooks/pre-push` configurado vía:
   git config core.hooksPath .githooks
3. Scanner reutilizable: `scripts/secret-scan.js` (ejecución manual o CI).

### Instalación Rápida del Hook
Si clonas el repo y no ves el hook activo:
```
git config core.hooksPath .githooks
```

### Uso Manual del Scanner
```
node scripts/secret-scan.js
```
Salida exitosa: `Secret scan passed.` Si encuentra patrones: código de salida 1 y lista de archivos/patrones.

### Patrones Detectados (por defecto)
- Airtable PAT (`AIRTABLE_API_KEY=pat...`)
- JWT secret largo (`JWT_SECRET=` >=32 chars)
- AWS keys (`AKIA...` y secret access key de 40 chars)
- Claves privadas PEM (`-----BEGIN RSA/OPENSSH/EC PRIVATE KEY-----`)
- Cadena de conexión Postgres (`DATABASE_URL=postgres://`)

### Ampliar o Ajustar Patrones
Editar hook `.githooks/pre-push` o script `scripts/secret-scan.js`.
Agregar nueva regex (ej Stripe): `/sk_live_[0-9A-Za-z]{24,}/`.

### Manejo de Falsos Positivos
1. Confirmar que NO es un secreto real.
2. Añadir a `SKIP_FILES` o `SKIP_PREFIXES`.
3. Evitar exclusiones masivas.

### Bypass Temporal (no recomendado)
```
git push --no-verify
```
Usar sólo en emergencias y luego limpiar historia si hubo secreto.

### Rotación de Secretos
Si un token se expone:
1. Revocar en el proveedor.
2. Generar uno nuevo.
3. Actualizar `.env` local (no commit).
4. Reescribir historia si ya estaba publicado y forzar push.

### Integración en CI (GitHub Actions ejemplo)
Archivo `.github/workflows/secret-scan.yml`:
```yaml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run secret scan
        run: node scripts/secret-scan.js
```

### Comandos Útiles
Buscar valor antiguo:
```
grep -R "patXXXXXXXX" . || echo "No encontrado"
```
Generar JWT_SECRET Linux/macOS:
```
openssl rand -hex 32
```
PowerShell:
```
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

---
Mantener este apartado actualizado al añadir nuevos proveedores o cambiar el proceso.
