# Little Ninjas Agency OS — Referencia para migración a Laravel + Inertia

## Qué es este proyecto

MVP de gestión interna para una agencia de producción de video publicitario. Permite que **PMs** creen briefs, los **editores** suban videos terminados, y los **PMs** revisen, generen copy con IA y aprueben el material. También tiene un panel de métricas de ads (ROAS) por cliente.

---

## Roles y accesos

| Rol | Acceso |
|-----|--------|
| `editor` | Solo ve sus tareas asignadas. Puede subir el link del video final. Necesita `temporary_access` para trabajar en un cliente. |
| `pm` (role: `reviewer` en código) | Crea briefs, asigna editores, revisa videos, genera copy con Gemini, aprueba o pide cambios. |
| `admin` | Todo lo anterior + gestión de usuarios, clientes, accesos y audit log. |

**Regla importante:** en el código el rol `pm` se llama internamente `reviewer`. La guard es:
```php
if ($userRole !== 'reviewer' && !($role === 'reviewer' && $userRole === 'admin'))
```
En Laravel usar políticas (`Policy`) o Gates para esto.

---

## Flujo principal de una pieza de contenido

```
BRIEF → EDITING → INTERNAL_REVIEW → PM_APPROVED → CLIENT_REVIEW → CLIENT_APPROVED
           ↑              ↑                |                 |
       REVISION ←─────────┘ (PM pide      |            CLIENT_REVISION
      (internas)            cambios)       |                 |
                                           └─────────────────┘
                                         (cliente pide cambios → vuelve a EDITING)
```

1. PM crea un **brief** (status: `BRIEF`)
2. PM asigna un editor → status pasa a `EDITING`
3. Editor sube el link del video final → status pasa a `INTERNAL_REVIEW`
   - Notificación al PM: WhatsApp + campanita en app
4. PM entra al **review room**, ve el video, genera copy con Gemini, edita las 3 variantes
5. PM aprueba internamente → `PM_APPROVED`
   - App envía automáticamente WhatsApp al cliente con link Drive + 3 variantes de copy
6. Si PM pide cambios → `REVISION`
   - Notificación al editor: solo campanita en app
7. Cliente responde por WhatsApp (aprueba o pide cambios)
   - Webhook de Meta detecta la respuesta → notificación al PM: WhatsApp + campanita en app
8. Si cliente aprueba → `CLIENT_APPROVED` (cierre del flujo)
9. Si cliente pide cambios → `CLIENT_REVISION` → vuelve a `EDITING`
   - Notificación al editor: solo campanita en app

---

## Base de datos

### Tabla `clients`
```sql
id              INT UNSIGNED PK
name            VARCHAR(120)
context_path    VARCHAR(255)   -- ruta al .md de contexto de marca (ej: contexts/1.md)
whatsapp_number VARCHAR(30) NULL
roas_goal       DECIMAL(5,2)   -- objetivo de ROAS para el panel de métricas
created_at, updated_at TIMESTAMP
```

### Tabla `users`
```sql
id          INT UNSIGNED PK
name        VARCHAR(120)
email       VARCHAR(180) UNIQUE
password    VARCHAR(255)
role        ENUM('editor','pm')
is_active   TINYINT(1)         -- campo que se usa en queries pero no estaba en schema original
created_at  TIMESTAMP
```

### Tabla `content_pieces` (entidad central)
```sql
id                  INT UNSIGNED PK
client_id           INT UNSIGNED FK → clients
assigned_editor_id  INT UNSIGNED FK → users (nullable)

-- Estado y prioridad
status      ENUM('BRIEF','EDITING','INTERNAL_REVIEW','REVISION','PM_APPROVED','CLIENT_REVIEW','CLIENT_REVISION','CLIENT_APPROVED')
priority    INT  -- 1=crítico, 2=alto, 3=medio (en código: 1,2,3)
deadline    DATETIME NULL

-- Campos del brief
concept         TEXT NULL
product         TEXT NULL
category        VARCHAR(80) NULL
objective       TEXT NULL
hook            TEXT NULL
development     TEXT NULL
cta             VARCHAR(255) NULL
brief_notes     TEXT NULL
client_status   VARCHAR(120) NULL
is_scheduled    TINYINT(1) DEFAULT 0

-- Assets (links a Drive, no archivos locales)
raw_material_link   VARCHAR(500) NULL
final_video_link    VARCHAR(500) NULL

-- Feedback y copy generado
internal_comments   TEXT NULL          -- comentarios del PM al pedir cambios
generated_copy      JSON NULL          -- {"directo":"...","storytelling":"...","educativo":"..."}

created_at, updated_at TIMESTAMP
```

> **Nota:** El schema original del repo tiene `priority` como ENUM ('LOW','MEDIUM','HIGH','CRITICAL'), pero el código del controller lo usa como INT (1,2,3). En el nuevo proyecto usar INT con constantes o un ENUM claro.

### Tabla `ad_metrics`
```sql
id              INT UNSIGNED PK
client_id       INT UNSIGNED FK → clients
date            DATE
investment      DECIMAL(12,2)
revenue         DECIMAL(12,2)
transactions    INT UNSIGNED
roas_real       DECIMAL(6,2)  -- columna generada: revenue / investment
UNIQUE KEY (client_id, date)
```

### Tablas de acceso y auditoría
```sql
-- Acceso temporal de un editor a un cliente
temporary_access (
  id, user_id FK, client_id FK,
  granted_by INT,
  expires_at DATETIME NULL,   -- NULL = permanente
  created_at TIMESTAMP
)

-- Log de todas las acciones
audit_log (
  id, user_id, action VARCHAR(80),   -- ej: 'content.approved'
  entity_type VARCHAR(60),           -- ej: 'content_piece'
  entity_id INT,
  payload JSON,                       -- contexto de la acción
  ip VARCHAR(45),
  created_at TIMESTAMP
)

-- Permisos granulares (pendiente de diseño, existía en el código)
user_permissions (
  user_id, permission VARCHAR(80),
  PRIMARY KEY(user_id, permission)
)
```

---

## Lógica de acceso (AccessController)

Un usuario puede acceder a un cliente si:
1. Es `admin`, O
2. Tiene un registro en `temporary_access` donde `user_id = $userId AND client_id = $clientId AND (expires_at IS NULL OR expires_at > NOW())`

En Laravel: crear un Gate `access-client` o un método en `User` model.

---

## Integración con Gemini (IA)

**Modelo:** `gemini-2.0-flash`  
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}`  
**Configuración:** `temperature: 0.85`, `topP: 0.95`, `maxOutputTokens: 1024`, `responseMimeType: application/json`

### System instruction (se arma dinámicamente)
```
Sos un experto en copywriting para publicidad digital en Argentina.
Tu tarea es escribir copy para ads de video en redes sociales (Meta/Instagram/TikTok).

=== CONTEXTO DE MARCA ===
{contenido del archivo contexts/X.md del cliente}
=== FIN DEL CONTEXTO ===

Reglas:
- Lenguaje coloquial argentino (vos, che)
- Máximo 3 frases por variante
- Cada variante autónoma (no necesita ver el video)
- Incluí el CTA en cada variante
- Respondé SIEMPRE con JSON con estas claves: directo, storytelling, educativo
```

### User prompt
```
Generá 3 variantes de copy para el siguiente ad:

Objetivo: {piece.objective}
Hook visual del video: {piece.hook}
CTA: {piece.cta}
Categoría: {piece.category}

Respondé SOLO con este JSON (sin markdown, sin explicaciones):
{
  "directo": "...",
  "storytelling": "...",
  "educativo": "..."
}
```

### Respuesta esperada
```json
{
  "directo": "copy directo aquí",
  "storytelling": "copy narrativo aquí",
  "educativo": "copy educativo/informativo aquí"
}
```

**Importante:** Gemini a veces envuelve el JSON en code fences (` ```json `). Hay que limpiarlos antes de hacer `json_decode`. Validar que existan las 3 claves antes de guardar.

### Contextos de marca (.md por cliente)

Cada cliente tiene un archivo markdown con:
- Identidad y tagline
- Audiencia objetivo
- Tono de voz
- Productos estrella
- Objeciones comunes y cómo responderlas
- Qué NO hacer
- CTAs que funcionan

Ejemplo (Café Gourmet BA):
```markdown
# Contexto de Marca — Café Gourmet BA

## Identidad de Marca
**Nombre:** Café Gourmet BA
**Tagline:** "El café de los que saben"
**Posicionamiento:** Premium accesible. No somos Starbucks, somos mejores y más honestos.

## Tono de Voz
- Cálido pero inteligente (no condescendiente)
- Coloquial argentino, nunca formal
- Con humor sutil cuando aplica

## No Hacer
- No prometer "el mejor café del mundo"
- No usar anglicismos innecesarios
- No apelar al miedo o urgencia artificial
```

En Laravel, estos archivos pueden vivir en `storage/app/brand-contexts/{client_id}.md` o en la DB directamente como campo `TEXT` en la tabla `clients`.

---

## Sistema de notificaciones

### Canales por rol

| Destinatario | Canal |
|---|---|
| PM | WhatsApp + campanita en app |
| Editor | Solo campanita en app |
| Cliente | Solo WhatsApp (es externo, no tiene login) |

### Tabla de eventos y notificaciones

| Evento | Quién lo dispara | PM | Editor | Cliente |
|--------|-----------------|-----|--------|---------|
| Editor sube video | Editor | WhatsApp + app | — | — |
| PM pide cambios internos | PM | — | App | — |
| PM aprueba internamente | PM | — | — | WhatsApp automático |
| Cliente aprueba | Webhook Meta | WhatsApp + app | — | — |
| Cliente pide cambios | Webhook Meta | WhatsApp + app | App | — |

---

## WhatsApp — Meta Cloud API

### Configuración necesaria
- Meta App con WhatsApp Business API habilitada
- `WHATSAPP_TOKEN` (token de acceso permanente)
- `WHATSAPP_PHONE_NUMBER_ID` (ID del número de la agencia)
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (token arbitrario para verificar el webhook)
- Número de WhatsApp por cliente guardado en `clients.whatsapp_number`
- Número de WhatsApp del PM guardado en `users.whatsapp_number` (agregar columna)

### Mensaje automático al cliente (al aprobar el PM)

Se envía con la API de Meta al número del cliente. Contenido:

```
Hola! 👋 Te compartimos el video finalizado para tu revisión.

🎬 *{nombre del cliente}* — {objetivo del brief}

📎 Ver video: {final_video_link}

✍️ Variantes de copy sugeridas:

1️⃣ *Directo*
{copy.directo}

2️⃣ *Storytelling*
{copy.storytelling}

3️⃣ *Educativo*
{copy.educativo}

Respondé con *APRUEBO* o contanos qué cambios necesitás.
```

> **Nota:** Para usar botones interactivos (✅ Aprobar / ✏️ Cambios) la Meta App debe estar verificada y usar Message Templates aprobados. Como alternativa más simple, el webhook procesa la respuesta de texto libre y el PM la lee en la app.

### Webhook de Meta (recepción de respuestas del cliente)

Laravel expone un endpoint público:

```
GET  /webhook/whatsapp  → verificación de Meta (challenge)
POST /webhook/whatsapp  → recepción de mensajes entrantes
```

El webhook recibe el mensaje del cliente, busca la `content_piece` activa en estado `CLIENT_REVIEW` asociada al número de WhatsApp del cliente, y:
- Notifica al PM (WhatsApp + campanita en app)
- Guarda el mensaje en `client_feedback` (campo nuevo en `content_pieces` o tabla separada)
- Actualiza el status según corresponda si se implementan respuestas estructuradas

### Notificaciones al PM por WhatsApp

Mensajes simples (no templates) al número del PM:

- **Editor subió video:** `"[{cliente}] {nombre del editor} subió el video para revisión. Ver en: {url}/pm/review/{id}"`
- **Cliente aprobó:** `"✅ [{cliente}] El cliente aprobó el contenido."`
- **Cliente pidió cambios:** `"✏️ [{cliente}] El cliente pidió cambios: {mensaje del cliente}"`

---

## Meta Marketing API — Sincronización de ROAS

Las métricas de ads se sincronizan automáticamente desde Facebook Ads Manager.

### Configuración necesaria
- `META_ADS_TOKEN` — token con permiso `ads_read`
- `meta_ad_account_id` — por cliente (agregar columna a tabla `clients`)

### Endpoint a consumir
```
GET https://graph.facebook.com/v19.0/act_{ad_account_id}/insights
  ?fields=spend,action_values,actions,date_start,date_stop
  &time_increment=1
  &date_preset=last_7d
  &access_token={META_ADS_TOKEN}
```

### Mapeo de campos Meta → `ad_metrics`

| Campo Meta | Campo local |
|---|---|
| `spend` | `investment` |
| `action_values` donde `action_type = purchase` | `revenue` |
| `actions` donde `action_type = purchase` | `transactions` |
| `date_start` | `date` |

### Job de sincronización en Laravel

```php
// Corre diariamente, por ejemplo con:
Schedule::job(new SyncMetaAdMetrics)->dailyAt('06:00');
```

El job itera sobre todos los clientes que tengan `meta_ad_account_id` y llama a la API de Meta para cada uno, haciendo `upsert` en `ad_metrics` por `(client_id, date)`.

### Columna nueva en `clients`
```sql
meta_ad_account_id VARCHAR(50) NULL  -- ej: 'act_123456789'
```

---

## Auditoría (AuditService)

Se loguea en `audit_log` en estos momentos:
- `content.approved` → cuando PM aprueba
- `content.changes_requested` → cuando PM pide cambios
- (implícito) otras acciones de CRUD

Payload JSON incluye: cliente, objetivo, nombre del reviewer/editor, comentario si aplica.

En Laravel: crear un `Observer` en el modelo `ContentPiece` o un servicio `AuditService` llamado explícitamente.

---

## Dashboard del Editor

Queries relevantes:
```sql
-- Tareas asignadas (sin las aprobadas)
SELECT cp.*, c.name AS client_name
FROM content_pieces cp
JOIN clients c ON c.id = cp.client_id
WHERE cp.assigned_editor_id = {editorId}
  AND cp.status != 'APPROVED'
ORDER BY cp.priority ASC, cp.deadline ASC

-- Stats de la semana
SELECT COUNT(*) FROM content_pieces
WHERE assigned_editor_id = {editorId}
  AND status = 'APPROVED'
  AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
```

Stats que se muestran:
- Pendientes (status IN 'BRIEF','EDITING','REVISION')
- En revisión (status = 'INTERNAL_REVIEW')
- Aprobados últimos 7 días

---

## Dashboard del PM

**Cola de revisión** — piezas listas para revisar:
```sql
SELECT cp.*, c.name AS client_name
FROM content_pieces cp
JOIN clients c ON c.id = cp.client_id
WHERE cp.status = 'INTERNAL_REVIEW'
ORDER BY cp.priority ASC, cp.deadline ASC
```

**Cola de briefs** — piezas en proceso:
```sql
SELECT cp.*, c.name AS client_name, u.name AS editor_name
FROM content_pieces cp
JOIN clients c ON c.id = cp.client_id
LEFT JOIN users u ON u.id = cp.assigned_editor_id
WHERE cp.status IN ('BRIEF','EDITING','REVISION')
ORDER BY cp.priority ASC, cp.deadline ASC
```

---

## Panel de Ads (ROAS)

Muestra métricas por cliente con semáforo visual vs. objetivo:

```sql
SELECT
  c.name,
  c.roas_goal,
  SUM(am.investment) AS total_investment,
  SUM(am.revenue)    AS total_revenue,
  SUM(am.transactions) AS total_transactions,
  ROUND(SUM(am.revenue) / NULLIF(SUM(am.investment), 0), 2) AS roas_periodo
FROM clients c
LEFT JOIN ad_metrics am ON am.client_id = c.id
  AND am.date BETWEEN {fecha_inicio} AND {fecha_fin}
GROUP BY c.id
```

**Lógica del semáforo:**
- Verde: `roas_real >= roas_goal`
- Amarillo: `roas_real >= roas_goal * 0.8`
- Rojo: `roas_real < roas_goal * 0.8`

---

## Formulario de Brief (campos completos)

Campos que el PM completa al crear un brief:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `client_id` | select | Cliente |
| `concept` | text | Concepto creativo general |
| `product` | text | Producto o servicio específico |
| `category` | text | Categoría (Promoción, Producto, Retención, etc.) |
| `objective` | textarea | Objetivo de la campaña |
| `hook` | textarea | Descripción del hook visual del video |
| `development` | textarea | Desarrollo del contenido |
| `cta` | text | Call to action |
| `brief_notes` | textarea | Notas adicionales para el editor |
| `client_status` | text | Estado comercial del cliente |
| `is_scheduled` | checkbox | Si es contenido programado |
| `priority` | select | 1=Crítico, 2=Alto, 3=Medio |
| `deadline` | datetime-local | Fecha límite |
| `editor_id` | select (opcional) | Asignar editor desde el brief |

---

## Datos demo para seeders

### Clientes
```
Café Gourmet BA    → roas_goal: 4.00
FitStore Argentina → roas_goal: 3.50
TechHogar          → roas_goal: 3.00
```

### Usuarios
```
pm@littleninjas.com.ar   → rol: pm,     password: ninja123
ana@littleninjas.com.ar  → rol: editor, password: ninja123
```

### 3 piezas de ejemplo
1. Café Gourmet BA — Editor Ana — status: EDITING — prioridad crítica — deadline: mañana
2. FitStore Argentina — Sin editor — status: BRIEF — prioridad alta
3. Café Gourmet BA — Editor Ana — status: INTERNAL_REVIEW — prioridad alta

### Métricas (últimos 7 días, 3 clientes, datos diarios)
Ver schema original en `database/schema.sql` para los valores exactos.

---

## Variables de entorno necesarias

```env
# Base de datos
DB_HOST=127.0.0.1
DB_DATABASE=ninjas_agency
DB_USERNAME=root
DB_PASSWORD=

# IA
GEMINI_API_KEY=                   # Google AI Studio → generativelanguage.googleapis.com

# Meta WhatsApp Business API
WHATSAPP_TOKEN=                   # Token permanente de la Meta App
WHATSAPP_PHONE_NUMBER_ID=         # ID del número de la agencia
WHATSAPP_WEBHOOK_VERIFY_TOKEN=    # Token arbitrario para verificar el webhook de Meta

# Meta Marketing API (sincronización de ROAS)
META_ADS_TOKEN=                   # Token con permiso ads_read
```

---

## Páginas / rutas del sistema

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/login` | — | Login |
| POST | `/login/submit` | — | Procesar login |
| GET | `/editor` | editor | Dashboard del editor |
| POST | `/editor/submit-video` | editor | Subir link de video |
| GET | `/pm` | pm/admin | Dashboard del PM |
| POST | `/pm/brief/store` | pm/admin | Crear brief |
| POST | `/pm/assign/{id}` | pm/admin | Asignar editor a pieza |
| GET | `/pm/review/{id}` | pm/admin | Review room |
| POST | `/pm/review/{id}/generate-copy` | pm/admin | Generar copy con Gemini |
| POST | `/pm/review/{id}/approve` | pm/admin | Aprobar pieza |
| POST | `/pm/review/{id}/request-changes` | pm/admin | Pedir cambios |
| GET | `/ads` | pm/admin | Panel de métricas ROAS |
| GET | `/pm/review/{id}/approve` | pm/admin | Aprobar internamente + envía WhatsApp al cliente |
| GET | `/webhook/whatsapp` | público | Verificación del webhook de Meta |
| POST | `/webhook/whatsapp` | público | Recepción de respuestas del cliente |
| GET | `/notifications` | pm/admin/editor | Listado de notificaciones (campanita) |
| POST | `/notifications/{id}/read` | pm/admin/editor | Marcar notificación como leída |
| GET | `/admin/users` | admin | CRUD usuarios |
| GET | `/admin/clients` | admin | CRUD clientes |
| GET | `/admin/matrix` | admin | Vista matriz usuarios × clientes |
| GET | `/admin/access` | admin | Gestión de accesos temporales |
| GET | `/admin/audit` | admin | Log de auditoría |

---

## Tabla `notifications` (campanita en app)

```sql
id          INT UNSIGNED PK
user_id     INT UNSIGNED FK → users
type        VARCHAR(80)        -- ej: 'video.submitted', 'changes.requested', 'client.approved'
title       VARCHAR(255)
body        TEXT NULL
link        VARCHAR(500) NULL  -- ruta interna a la que lleva al hacer click
read_at     TIMESTAMP NULL     -- NULL = no leída
created_at  TIMESTAMP
```

En Laravel: servicio `NotificationService` o usar Laravel Notifications con el canal `database`. La campanita en el header consulta `notifications where user_id = auth()->id() and read_at is null` para mostrar el badge con cantidad.

---

## Design system (referencia visual)

- Tema oscuro
- Fuente: sistema (sans-serif)
- Colores principales: fondo oscuro, acentos en azul/verde
- Cards con borde sutil
- Semáforo ROAS: verde (#22c55e), amarillo (#eab308), rojo (#ef4444)
- Formularios inline en el dashboard (sin páginas separadas para crear brief)
- El review room tiene el video embebido + panel lateral con el copy generado + botones de aprobar/pedir cambios
