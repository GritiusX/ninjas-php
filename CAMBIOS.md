# Ninjas PHP — Registro de cambios

## 1. Brief — Campos obligatorios

**Qué se hizo:**
- El formulario "Nuevo brief" bloquea el botón Crear hasta que estén completos: Cliente, Concepto, Deadline, Editor asignado y al menos un link de material de referencia.
- Todos los campos obligatorios tienen un asterisco rojo `*` en la etiqueta.
- El backend (`BriefController.php`) también valida estos campos y rechaza el request si faltan, aunque alguien intente bypassear el frontend.

**Dónde se ve:** PM Dashboard → botón "Nuevo brief"

---

## 2. Material de referencia — Múltiples links

**Qué se hizo:**
- Se reemplazó el campo único `raw_material_link` por un array JSON (`raw_material_links`) en la base de datos (migración incluida).
- En el formulario del PM aparece una lista dinámica de inputs con botón "Agregar link" (hasta 10) y botón de eliminar por fila.
- En la vista del editor (`/editor/task/{id}`) se muestran todos los links como "Material 1", "Material 2", etc.
- Se mantiene compatibilidad con el campo viejo `raw_material_link` para piezas ya creadas.

**Dónde se ve:**
- PM Dashboard → Nuevo brief o Editar brief (ícono lápiz en cada card)
- Editor → tarea individual → sección "Material de referencia"

---

## 3. Brief descargable (PDF)

**Qué se hizo:**
- Se instaló la librería `barryvdh/laravel-dompdf`.
- Se creó el endpoint `GET /pm/brief/{id}/pdf` (para PM) y `GET /editor/task/{id}/pdf` (para el editor).
- El PDF incluye: cliente, concepto, prioridad, deadline, editor asignado, objetivo, hook, desarrollo, CTA, links de material y notas del PM.
- Botón en el PM Dashboard: ícono de descarga (↓) en cada card, junto al ícono de editar.
- Botón en la vista del editor: link "Descargar brief" en la barra superior junto a "← Mis tareas".

**Dónde se ve:**
- PM Dashboard → ícono ↓ en cada card
- Editor → `/editor/task/{id}` → link "Descargar brief" arriba a la derecha

---

## 4. Brief editable

**Estado:** Ya existía antes de esta sesión.

- Endpoint `PUT /pm/brief/{id}` funcional.
- Modal de edición accesible desde el ícono lápiz (✏️) en cada card del PM Dashboard.
- El modal precarga todos los campos del brief actual.

**Dónde se ve:** PM Dashboard → ícono ✏️ en cada card

---

## 5. Vista editor — Fecha DD/MM

**Estado:** Ya existía antes de esta sesión.

La función `formatDeadline` muestra:
- `Hoy` / `Mañana` → cuando vence en 0 o 1 día (urgencia visual en rojo)
- `Vencido hace Xd` → cuando ya pasó la fecha
- `DD/MM` (ej: `23/06`) → en cualquier otro caso

**Dónde se ve:** Dashboard del editor y vista de tarea individual

---

## 6. Vista editor — Filtro por cliente

**Estado:** Ya existía antes de esta sesión.

Dropdown "Todos los clientes" en el dashboard del editor que filtra las tareas en tiempo real, sin recargar la página.

**Dónde se ve:** `/editor` → dropdown arriba de la lista de tareas

---

## 7. Vista PM — Tabla de edición masiva

**Estado:** Ya existía antes de esta sesión.

Tabla accesible desde el botón "Vista tabla" en el PM Dashboard. Permite editar prioridad y deadline de todas las piezas inline (click en la fila → ícono editar → modificar → guardar con ✓ o cancelar con ✗). Tiene filtros por cliente y por estado.

**Dónde se ve:** `/pm/tabla`

---

## 8. Google Ads — Integración completa

### 8.1 Conexión OAuth

Se creó un flujo OAuth2 para conectar la cuenta de Google Ads (MCC) con la app.

**Cómo reconectar si el token expira:**
1. Entrar a `https://ninjas.on-forge.com/google-ads/connect` con usuario admin
2. Elegir la cuenta `contenidos@littleninjas.com.ar` (la que tiene acceso a la MCC)
3. Aprobar los permisos
4. El refresh token se guarda automáticamente en el `.env` del servidor

**Variables de entorno necesarias en producción:**
```
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...       ← se llena automáticamente al conectar
GOOGLE_ADS_LOGIN_CUSTOMER_ID=9373361509   ← ID de la MCC sin guiones
GOOGLE_ADS_REDIRECT_URI=https://ninjas.on-forge.com/google-ads/callback
```

### 8.2 Mapear cuentas a clientes

**Cómo hacerlo:**
1. Ir a Admin → Clientes
2. Click en el botón **"Vincular Google Ads"** (arriba a la derecha)
3. Aparece un Dialog que consulta la MCC y muestra todas las subcuentas activas
4. Para cada cuenta de Google Ads, seleccionar el cliente correspondiente en el dropdown
5. Click en "Guardar"

Esto guarda el `google_ads_customer_id` en cada cliente. El ID también se puede cargar manualmente editando el cliente (ícono lápiz → campo "Google Ads Customer ID", formato `511-066-6812`).

### 8.3 Dónde se ven los datos

En `/metrics/{cliente}` hay una sección **"Performance Ads"** que muestra:

| Métrica | Descripción |
|---|---|
| Gasto total | Inversión del mes en ARS |
| ROAS | Return on Ad Spend (valor conv / gasto) |
| CPA | Costo por adquisición |
| CPC | Costo por click |
| CTR | Click-through rate |
| Conversiones | Total de conversiones |
| Valor conversiones | Valor total atribuido |
| Tasa de conversión | % de clicks que convierten |

Cada métrica muestra el valor actual y la variación porcentual vs el mes anterior.

### 8.4 Cómo se sincronizan los datos

La sincronización trae datos de Metricool (contenido orgánico) **y** Google Ads (paid) en el mismo proceso.

**Opciones:**
- **Manual:** `/metrics/{cliente}` → botón "Sincronizar ahora"
- **Automático:** existe el comando `php artisan metricool:sync-monthly` que puede programarse como cron mensual

**Requisito:** El cliente debe tener cargado tanto el `metricool_blog_id` como el `google_ads_customer_id` para que el sync traiga datos completos. Si falta alguno, esa parte se omite sin error.

### 8.5 Agregar un cliente nuevo a Google Ads

1. Admin → Clientes → botón "Vincular Google Ads" → el nuevo cliente aparece en el dropdown
2. Mapearlo a su cuenta de Google Ads
3. Sincronizar desde `/metrics/{cliente}`

---

## Pendiente (a definir con el cliente)

- **Criterios de alerta:** qué situaciones disparan una notificación (deadline próximo, pieza sin asignar, etc.)
- **Resumen diario por mail:** qué información incluir y en qué formato
- **Meta Ads:** misma integración que Google Ads pero con la Marketing API de Meta. El modelo de datos ya tiene el campo `meta_ad_account_id` preparado.
- **Paid media en métricas:** definir qué info exacta quieren ver (está pendiente una reunión con el cliente)
