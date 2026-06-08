# AgroStock — Manual de Usuario

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Flujo: Compra de productos](#3-flujo-compra-de-productos)
4. [Flujo: Recepción de mercadería](#4-flujo-recepción-de-mercadería)
5. [Flujo: Orden de aplicación en campo](#5-flujo-orden-de-aplicación-en-campo)
6. [Flujo: Ejecución de una aplicación](#6-flujo-ejecución-de-una-aplicación)
7. [Flujo: Transferencia entre depósitos](#7-flujo-transferencia-entre-depósitos)
8. [Stock y movimientos](#8-stock-y-movimientos)
9. [Administración de usuarios](#9-administración-de-usuarios)
10. [Control de actividad](#10-control-de-actividad)

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
| Crear órdenes de aplicación | ✓ | ✓ | ✓ |
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
5. Hacer clic en **Crear Orden**.

La orden queda en estado **Pendiente** hasta que la mercadería llegue.

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

## 8. Stock y movimientos

### Vista de Stock

Muestra el **stock actual por producto y depósito**, calculado como la suma de todos los movimientos históricos.  
Los filtros disponibles son: depósito, categoría y búsqueda por nombre.  
Los productos con stock por debajo del mínimo configurado se marcan con una alerta visual.

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
3. Hacer clic en **Invitar**.

El usuario recibirá un email con un link para establecer su contraseña. El link expira en 24 horas.

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

*Para soporte técnico o reportar un problema, contactar al administrador del sistema.*
