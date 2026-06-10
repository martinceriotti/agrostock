# AgroStock — Manual de Usuario

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Flujo: Compra de productos](#3-flujo-compra-de-productos)
4. [Flujo: Recepción de mercadería](#4-flujo-recepción-de-mercadería)
5. [Flujo: Orden de aplicación en campo](#5-flujo-orden-de-aplicación-en-campo)
6. [Flujo: Ejecución de una aplicación](#6-flujo-ejecución-de-una-aplicación)
7. [Flujo: Transferencia entre depósitos](#7-flujo-transferencia-entre-depósitos)
8. [Stock, movimientos y detalle de producto](#8-stock-movimientos-y-detalle-de-producto)
9. [Administración de usuarios](#9-administración-de-usuarios)
10. [Control de actividad](#10-control-de-actividad)
11. [Alta de un nuevo tenant (administrador del sistema)](#11-alta-de-un-nuevo-tenant-administrador-del-sistema)
12. [Módulo Silos Bolsa (IoT)](#12-módulo-silos-bolsa-iot)

---

## 1. Acceso al sistema

El sistema está disponible en la URL provista por el administrador.  
El ingreso se realiza con **correo electrónico y contraseña**. La primera vez que un usuario es invitado, recibirá un email con un link para establecer su contraseña.

Si olvidó su contraseña, utilice el link "¿Olvidaste tu contraseña?" en la pantalla de login.

---

## 2. Roles y permisos

| Acción | Ingeniero | Manager | Admin |
|--------|:---------:|:-------:|:-----:|
| Ver stock, movimientos, productos | ✓ | ✓ | ✓ |
| Ver detalle de precios de un producto | ✓ | ✓ | ✓ |
| Crear órdenes de aplicación | ✓ | ✓ | ✓ |
| Enviar aplicación propia para aprobación | ✓ | ✓ | ✓ |
| Ejecutar aplicaciones (descuenta stock) | — | ✓ | ✓ |
| Transferir stock entre depósitos | — | ✓ | ✓ |
| Crear y recibir órdenes de compra | — | ✓ | ✓ |
| Administrar productos y depósitos | — | ✓ | ✓ |
| Configuración general | — | — | ✓ |
| Administrar usuarios | — | — | ✓ |
| Ver actividad de usuarios | — | — | ✓ |

---

## 3. Flujo: Compra de productos

**Quién lo hace:** Manager o Admin

1. En el menú lateral, ir a **Órdenes de Compra**.
2. Hacer clic en **Nueva Orden**.
3. Completar:
   - **Proveedor** — seleccionar de la lista. Si no existe, crearlo primero en Configuración.
   - **Moneda** — ARS o USD.
   - **Tipo de cambio** — se completa automáticamente o puede editarse.
   - **Fecha de pedido** y **fecha estimada de llegada** (opcional).
   - **Notas** — instrucciones especiales, condiciones, etc.
4. Agregar los productos haciendo clic en **+ Agregar ítem**:
   - Seleccionar el producto del catálogo.
   - Seleccionar el **depósito de destino** (dónde se almacenará al llegar).
   - Ingresar la **cantidad pedida** y el **precio unitario**.
   - Completar **Lote** (opcional, ej.: `L240510`) y **Fecha de vencimiento** (opcional) para trazabilidad.
5. Hacer clic en **Crear Orden**.

La orden queda en estado **Pendiente** hasta que la mercadería llegue.

> **Nota:** Si se cargó lote o fecha de vencimiento, se muestran en el detalle de la orden. Los ítems con vencimiento próximo (< 30 días) o ya vencidos se marcan con un ícono de alerta.

> **Restricción:** El rol Ingeniero no puede crear órdenes de compra. Esta acción es exclusiva de Manager y Admin.

---

## 4. Flujo: Recepción de mercadería

**Quién lo hace:** Manager o Admin

1. En **Órdenes de Compra**, hacer clic sobre la orden que llegó.
2. En la página de detalle, hacer clic en **Registrar Recepción**.
3. Para cada ítem, ingresar la **cantidad efectivamente recibida** (puede ser menor a la pedida).
4. Hacer clic en **Guardar Recepción**.

El sistema registra automáticamente los movimientos de stock (entradas) en el depósito indicado.  
- Si todos los ítems se recibieron completos → la orden pasa a **Recibida**.  
- Si se recibió una parte → la orden pasa a **Recepción parcial**.

---

## 5. Flujo: Orden de aplicación en campo

**Quién lo hace:** Ingeniero, Manager o Admin

1. En el menú lateral, ir a **Aplicaciones**.
2. Hacer clic en **Nueva Orden de Aplicación**.
3. Completar el encabezado:
   - **Nombre del lote / campo** — denominación interna del establecimiento.
   - **Cultivo** — ej.: Soja, Maíz, Trigo.
   - **Superficie (ha)** — hectáreas a tratar.
   - **Fecha de aplicación**.
   - **Notas** (opcional) — observaciones técnicas.
   - **Coordenadas** (opcional) — usar el botón **Detectar ubicación** para capturar lat/long del GPS del dispositivo.
4. Agregar los productos con **+ Agregar producto**:
   - Seleccionar el **producto** del catálogo.
   - Seleccionar el **depósito de origen**.
   - Ingresar la **cantidad a usar** y la **dosis (L o kg por ha)**.
5. Hacer clic en **Crear Orden**.

La orden se guarda en estado **Borrador**. El stock **no se descuenta todavía**.

### Flujo del Ingeniero: enviar para aprobación

El Ingeniero puede crear órdenes de aplicación, pero no ejecutarlas. Para notificar que la aplicación está lista:

1. Abrir la orden en estado **Borrador**.
2. Hacer clic en **Enviar para aprobación**.
3. La orden pasa a estado **Pendiente aprobación** (visible como "Enviada" para Manager/Admin).

Un Manager o Admin luego verifica y ejecuta la orden (ver sección 6).

---

## 6. Flujo: Ejecución de una aplicación

**Quién lo hace:** Manager o Admin

Una vez que la aplicación en campo fue efectivamente realizada, se debe ejecutar la orden para que el stock se descuente.

1. En **Aplicaciones**, hacer clic sobre la orden en estado **Borrador**.
2. Verificar los datos y los productos/cantidades.
3. Hacer clic en el botón **Ejecutar Aplicación**.
4. Confirmar en el diálogo de confirmación.

El sistema registra los movimientos de stock (consumos negativos) y la orden pasa a estado **Ejecutada**.  
Los cambios se reflejan de inmediato en la vista de Stock y en el Dashboard.

> **Nota:** Una orden ejecutada no puede revertirse desde la interfaz. Si hay un error de cantidad, contactar al administrador para un ajuste manual de stock.

---

## 7. Flujo: Transferencia entre depósitos

**Quién lo hace:** Manager o Admin

Permite mover mercadería de un depósito a otro sin salida al campo. El stock total no cambia; solo cambia el depósito donde figura.

1. En el menú lateral, ir a **Transferencia**.
2. Seleccionar el **producto** a transferir.
3. Seleccionar el **depósito origen** — se muestra el stock disponible de ese producto en cada depósito.
4. Seleccionar el **depósito destino** — no puede ser el mismo que el origen.
5. Ingresar la **cantidad** a transferir. El sistema valida que no supere el stock disponible en origen.
6. Agregar una nota opcional (ej.: "Redistribución fin de temporada").
7. Hacer clic en **Confirmar transferencia**.

Los movimientos quedan registrados en el historial con tipo **Transferencia** y pueden verse en la sección Movimientos.

---

## 8. Stock, movimientos y detalle de producto

### Vista de Stock

Muestra el **stock actual por producto y depósito**, calculado como la suma de todos los movimientos históricos.  
Los filtros disponibles son: depósito, categoría y búsqueda por nombre.  
Los productos con stock por debajo del mínimo configurado se marcan con una alerta visual.

Hacer clic en cualquier tarjeta o fila de la vista de stock navega al **detalle del producto**.

### Detalle de producto — Análisis de precios

**Quién lo usa:** Todos los roles

Al hacer clic en un producto en la vista de stock, se abre una página con:

1. **Estadísticas de precio en USD** — último precio, promedio, mínimo y máximo histórico.
2. **Gráfico de evolución** — línea de precio USD en el tiempo, diferenciada por proveedor.
3. **Historial de compras** — tabla con fecha, N° de OC, proveedor, cantidad, precio original, precio en USD y lote.
4. **Proveedores asociados** — lista de proveedores con fecha de primera y última compra.

> **Nota:** Los precios en ARS se convierten a USD usando el tipo de cambio registrado en cada orden de compra. Si una orden no tiene tipo de cambio cargado, ese ítem aparece como "—" en la columna USD.

### Movimientos

Registro completo de todas las entradas y salidas. Cada fila muestra:
- Tipo (compra, consumo, ajuste, inicial)
- Producto y depósito
- Cantidad (positiva = entrada, negativa = salida)
- Usuario que generó el movimiento
- Fecha y hora

---

## 9. Administración de usuarios

**Solo para Admin**

Disponible en el menú **Usuarios** (sección administración).

### Invitar un usuario nuevo

1. Hacer clic en **Nuevo Usuario**.
2. Completar nombre, correo electrónico y rol.
3. Hacer clic en **Enviar invitación**.

El usuario recibirá un email con un botón "Crear mi cuenta". Al hacer clic, se le pedirá que establezca su contraseña antes de ingresar. El link expira en 1 hora.

### Gestionar contraseña de un usuario

Hacer clic en el ícono de llave (🔑) junto al usuario. Se abren dos opciones:

- **Enviar email de restablecimiento** — el usuario recibe un correo con un link para elegir su nueva contraseña.
- **Setear contraseña temporal** — el admin escribe una contraseña directamente y se la comunica al usuario por otro medio (WhatsApp, teléfono). El usuario podrá cambiarla luego.

### Cambiar nombre o rol

1. En la lista de usuarios, hacer clic en el ícono de edición (lápiz).
2. Modificar el nombre completo y/o el rol.
3. Guardar.

### Eliminar usuario

1. Hacer clic en el ícono de eliminación (papelera) junto al usuario.
2. Confirmar la acción.

El usuario pierde el acceso de inmediato. Sus registros históricos (órdenes, movimientos) se conservan.

> **Importante:** No es posible eliminarse a uno mismo ni cambiar su propio rol.

---

## 10. Control de actividad

**Solo para Admin**

Disponible en el menú **Actividad**.

Muestra un historial de todas las acciones realizadas por los usuarios: creación de órdenes, ejecución de aplicaciones, recepciones, cambios de roles, etc.

Se puede filtrar por:
- **Tipo de acción** — ej.: solo ver ejecuciones de aplicaciones.
- **Búsqueda libre** — por nombre de usuario o nombre de entidad.

La lista se actualiza automáticamente cada 30 segundos.

---

## 11. Alta de un nuevo tenant (administrador del sistema)

Esta sección está dirigida a quien administra la plataforma AgroStock y necesita habilitar a una **nueva empresa u organización** para usar el sistema.

### Resumen del flujo

```
1. Crear el usuario admin inicial en el panel de Supabase
       ↓
2. El usuario hace login → la app detecta que no tiene org → redirige a /onboarding
       ↓
3. Completa los datos de la organización → org creada, usuario queda como Admin
       ↓
4. El Admin invita al resto del equipo desde Usuarios → cada invitado recibe un email
       ↓
5. El invitado hace clic en el link → entra directo al dashboard con su org asignada
```

---

### Paso 1 — Crear el usuario admin inicial

La app no tiene registro público. El primer usuario de cada tenant debe crearse manualmente en el panel de Supabase:

1. Ingresar al panel de Supabase del proyecto.
2. Ir a **Authentication → Users**.
3. Hacer clic en **Add user** (o "Invite user").
4. Ingresar el email y contraseña del administrador de la nueva empresa.
5. Guardar.

El sistema crea automáticamente un perfil para ese usuario (sin organización asignada todavía).

---

### Paso 2 — Onboarding: configurar la organización

La primera vez que el usuario admin hace login, la app detecta que no tiene organización y lo redirige a la pantalla de **Configurá tu organización**.

El usuario debe completar:
- **Nombre de la empresa** (obligatorio)
- CUIT, teléfono, email de contacto, dirección (opcionales)

Al confirmar, el sistema de forma automática:
- Crea la organización en la base de datos
- Asigna al usuario como **Admin** de esa org
- Crea las categorías de productos de base (Herbicida, Fungicida, Insecticida, etc.)
- Crea un depósito inicial llamado "Depósito Principal"

El usuario queda dentro de la app, listo para operar.

---

### Paso 3 — Invitar al equipo

El Admin puede invitar al resto de los usuarios desde **Usuarios** (menú lateral). Ver sección [9. Administración de usuarios](#9-administración-de-usuarios).

Los usuarios invitados reciben un email con un link que:
- Los lleva a una pantalla para establecer su propia contraseña
- Los asigna automáticamente a la misma organización que el Admin
- Los lleva directo al dashboard (sin pasar por el onboarding)

> **Importante:** El link de invitación expira en **1 hora**. Si el usuario no lo usa a tiempo, el Admin puede usar la opción **Setear contraseña temporal** (ícono 🔑 en la lista de usuarios) para darle acceso de inmediato sin necesidad de reenviar el email.

---

### Aislamiento entre tenants

Cada organización es completamente independiente. Los usuarios de una empresa **no pueden ver ni acceder** a los datos de otra. Esto está garantizado por las políticas de seguridad (RLS) de la base de datos: cada consulta filtra automáticamente por `organization_id` del usuario autenticado.

---

## 12. Módulo Silos Bolsa (IoT)

Este módulo permite monitorear en tiempo real las condiciones internas de cada silo bolsa mediante sensores IoT instalados a lo largo de la bolsa.

### Crear un nuevo silo

**Quién lo hace:** Admin

1. Ir a **Silos Bolsa** en el menú lateral.
2. Hacer clic en **Nuevo Silo**.
3. Completar los datos:
   - **Nombre** (obligatorio): ej. "Bolsa 1 - Lote Norte"
   - **Campo / lote**: nombre del campo donde está instalado
   - **Cultivo**: ej. Soja, Maíz
   - **Capacidad (ton)**: capacidad de la bolsa en toneladas
   - **Fecha de llenado**: cuándo se llenó la bolsa
   - **Estado**: Activo / Vacío / Cerrado
   - **Notas**: observaciones opcionales
4. Hacer clic en **Crear silo**.
5. Se mostrará la **API key** generada automáticamente. Copiarla antes de cerrar — es necesaria para configurar el gateway IoT.

> **Nota:** La API key también puede consultarse después haciendo clic en "Ver API key" en la tarjeta del silo.

### Tarjetas de silo

Cada silo muestra:
- Estado (Activo / Vacío / Cerrado)
- Última lectura de temperatura y humedad con timestamp
- Alertas activas (si las hay, el borde de la tarjeta se vuelve rojo)
- API key (ocultada por defecto, click en "Ver API key" para revelarla)

### Variables monitoreadas

| Variable | Unidad | Umbral de alerta por defecto |
|----------|--------|------------------------------|
| Temperatura | °C | > 35 °C |
| Humedad relativa | % | > 14 % |
| CO₂ | ppm | > 5000 ppm |
| Batería del sensor | % | < 20 % |

Los umbrales son configurables por silo desde la interfaz de administración.

### Integración IoT — Contrato de la API

El gateway o dispositivo IoT en campo envía datos mediante HTTP POST a:

```
POST https://<dominio>/api/iot/silo-readings
Authorization: Bearer <api_key_del_silo>
Content-Type: application/json
```

**Cuerpo (lectura única):**
```json
{
  "sensor_id": "uuid-del-sensor",
  "recorded_at": "2025-06-08T14:00:00Z",
  "temperature_c": 28.4,
  "humidity_pct": 13.2,
  "co2_ppm": 1200,
  "battery_pct": 85
}
```

**Cuerpo (lote de lecturas):**
```json
[
  { "sensor_id": "...", "recorded_at": "...", "temperature_c": 28.4, "humidity_pct": 13.2 },
  { "sensor_id": "...", "recorded_at": "...", "temperature_c": 31.1, "humidity_pct": 14.8 }
]
```

Todos los campos excepto `sensor_id` son opcionales. Si `recorded_at` no se envía, se usa la hora de recepción del servidor.

**Respuesta exitosa (200):**
```json
{ "inserted": 2, "alerts": ["high_humidity: 14.8%"] }
```

### API key por silo

Cada silo tiene una API key única generada automáticamente al crearlo. El gateway debe configurarse con esa clave. Si se compromete, el administrador puede regenerarla desde la interfaz.

### Estructura de datos

- **Silos:** tabla maestra (nombre, campo, cultivo, capacidad, fechas, coordenadas GPS, estado).
- **Sensores:** puntos de medición por silo (label, posición en metros desde el inicio de la bolsa).
- **Lecturas:** serie temporal de mediciones por sensor.
- **Alertas:** historial de alertas disparadas (activas y resueltas).

---

*Para soporte técnico o reportar un problema, contactar al administrador del sistema.*
