'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ManualPage() {
  return (
    <div>
      {/* Print button — hidden when printing */}
      <div className="flex justify-end mb-6 print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {/* Document */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 px-10 py-10 print:border-0 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AgroStock</h1>
          <p className="text-lg text-gray-500 mt-1">Manual de Usuario</p>
        </div>

        <Section title="1. Acceso al sistema">
          <p>
            El sistema está disponible en la URL provista por el administrador. El ingreso se realiza con{' '}
            <strong>correo electrónico y contraseña</strong>. La primera vez que un usuario es invitado, recibirá un
            email con un link para establecer su contraseña.
          </p>
          <p className="mt-2">
            Si olvidó su contraseña, utilice el link <em>¿Olvidaste tu contraseña?</em> en la pantalla de login.
          </p>
        </Section>

        <Section title="2. Roles y permisos">
          <table className="w-full text-sm border-collapse mt-3">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left border border-gray-200 px-3 py-2 font-semibold">Acción</th>
                <th className="text-center border border-gray-200 px-3 py-2 font-semibold">Ingeniero</th>
                <th className="text-center border border-gray-200 px-3 py-2 font-semibold">Manager</th>
                <th className="text-center border border-gray-200 px-3 py-2 font-semibold">Admin</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Ver stock, movimientos, productos', true, true, true],
                ['Crear órdenes de aplicación', true, true, true],
                ['Ejecutar aplicaciones (descuenta stock)', false, true, true],
                ['Crear y recibir órdenes de compra', false, true, true],
                ['Administrar productos y depósitos', false, true, true],
                ['Configuración general', false, false, true],
                ['Administrar usuarios', false, false, true],
                ['Ver actividad de usuarios', false, false, true],
              ].map(([label, eng, mgr, adm]) => (
                <tr key={label as string} className="even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2">{label as string}</td>
                  {[eng, mgr, adm].map((val, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-2 text-center">
                      {val ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="3. Compra de productos">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Manager o Admin</p>
          <Steps steps={[
            'En el menú lateral, ir a Órdenes de Compra.',
            'Hacer clic en Nueva Orden.',
            'Completar proveedor, moneda, tipo de cambio, fechas y notas.',
            'Agregar los productos con + Agregar ítem: seleccionar producto, depósito de destino, cantidad y precio unitario.',
            'Hacer clic en Crear Orden.',
          ]} />
          <Note>La orden queda en estado Pendiente hasta que la mercadería llegue.</Note>
        </Section>

        <Section title="4. Recepción de mercadería">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Manager o Admin</p>
          <Steps steps={[
            'En Órdenes de Compra, hacer clic sobre la orden que llegó.',
            'En la página de detalle, hacer clic en Registrar Recepción.',
            'Para cada ítem, ingresar la cantidad efectivamente recibida.',
            'Hacer clic en Guardar Recepción.',
          ]} />
          <p className="mt-3 text-sm text-gray-700">
            El sistema registra automáticamente los movimientos de stock en el depósito indicado. Si todos los ítems
            se recibieron → la orden pasa a <strong>Recibida</strong>. Si se recibió una parte → <strong>Recepción parcial</strong>.
          </p>
        </Section>

        <Section title="5. Orden de aplicación en campo">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Ingeniero, Manager o Admin</p>
          <Steps steps={[
            'En el menú lateral, ir a Aplicaciones.',
            'Hacer clic en Nueva Orden de Aplicación.',
            'Completar: nombre del lote, cultivo, superficie (ha), fecha, notas y coordenadas (opcional, usar botón Detectar ubicación).',
            'Agregar los productos con + Agregar producto: producto, depósito de origen, cantidad y dosis por ha.',
            'Hacer clic en Crear Orden.',
          ]} />
          <Note>La orden se guarda en estado Borrador. El stock <strong>no se descuenta todavía</strong>.</Note>
        </Section>

        <Section title="6. Ejecución de una aplicación">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Manager o Admin</p>
          <p className="text-sm text-gray-700 mb-3">
            Una vez que la aplicación en campo fue efectivamente realizada, se debe ejecutar la orden para que el
            stock se descuente.
          </p>
          <Steps steps={[
            'En Aplicaciones, hacer clic sobre la orden en estado Borrador.',
            'Verificar los datos y los productos/cantidades.',
            'Hacer clic en el botón Ejecutar Aplicación.',
            'Confirmar en el diálogo de confirmación.',
          ]} />
          <Note>
            Una orden ejecutada no puede revertirse desde la interfaz. Si hay un error de cantidad, contactar al
            administrador para un ajuste manual de stock.
          </Note>
        </Section>

        <Section title="7. Transferencia entre depósitos">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Manager o Admin — menú: Transferencia</p>
          <p className="text-sm text-gray-700 mb-3">
            Permite mover mercadería entre depósitos sin que salga al campo. El stock total no cambia; solo cambia dónde figura.
          </p>
          <Steps steps={[
            'En el menú lateral, ir a Transferencia.',
            'Seleccionar el producto a transferir.',
            'Seleccionar el depósito origen — se muestra el stock disponible en cada depósito.',
            'Seleccionar el depósito destino — no puede ser el mismo que el origen.',
            'Ingresar la cantidad (el sistema valida que no supere el stock disponible).',
            'Agregar una nota opcional y hacer clic en Confirmar transferencia.',
          ]} />
          <Note>Los movimientos quedan en el historial con tipo Transferencia.</Note>
        </Section>

        <Section title="8. Stock y movimientos">
          <h4 className="font-semibold text-gray-800 mt-3 mb-1">Vista de Stock</h4>
          <p className="text-sm text-gray-700">
            Muestra el stock actual por producto y depósito. Los productos por debajo del mínimo se marcan con alerta visual.
          </p>
          <h4 className="font-semibold text-gray-800 mt-4 mb-1">Movimientos</h4>
          <p className="text-sm text-gray-700">
            Registro completo de entradas, salidas y transferencias. Muestra tipo, producto, depósito, cantidad, usuario y fecha.
          </p>
        </Section>

        <Section title="9. Administración de usuarios">
          <p className="text-xs text-gray-500 mb-3">Solo para Admin — menú: Usuarios</p>
          <h4 className="font-semibold text-gray-800 mb-1">Invitar un usuario nuevo</h4>
          <Steps steps={[
            'Hacer clic en Nuevo Usuario.',
            'Completar nombre, correo electrónico y rol.',
            'Hacer clic en Invitar.',
          ]} />
          <p className="text-sm text-gray-700 mt-2">
            El usuario recibirá un email con un link para establecer su contraseña. El link expira en 24 horas.
          </p>
          <h4 className="font-semibold text-gray-800 mt-4 mb-1">Cambiar nombre o rol</h4>
          <p className="text-sm text-gray-700">Hacer clic en el ícono de edición (lápiz) junto al usuario, modificar y guardar.</p>
          <h4 className="font-semibold text-gray-800 mt-4 mb-1">Eliminar usuario</h4>
          <p className="text-sm text-gray-700">
            Hacer clic en el ícono de papelera y confirmar. El usuario pierde el acceso de inmediato. Sus registros
            históricos se conservan.
          </p>
          <Note>No es posible eliminarse a uno mismo ni cambiar su propio rol.</Note>
        </Section>

        <Section title="10. Control de actividad">
          <p className="text-xs text-gray-500 mb-3">Solo para Admin — menú: Actividad</p>
          <p className="text-sm text-gray-700">
            Muestra un historial de todas las acciones realizadas por los usuarios: creación de órdenes, ejecuciones
            de aplicaciones, recepciones, cambios de roles, etc. Se puede filtrar por tipo de acción o buscar por
            nombre de usuario o entidad. La lista se actualiza automáticamente cada 30 segundos.
          </p>
        </Section>

        <Section title="12. Módulo Silos Bolsa (IoT)">
          <p className="text-sm text-gray-700 mb-4">
            Monitoreo en tiempo real de temperatura, humedad y CO₂ dentro de cada silo bolsa mediante sensores IoT
            instalados a lo largo de la bolsa.
          </p>

          <h4 className="font-semibold text-gray-800 mb-2">Crear un nuevo silo</h4>
          <p className="text-sm text-gray-500 mb-2">Quién lo hace: <strong>Admin</strong></p>
          <ol className="list-decimal list-inside text-sm text-gray-700 mb-3 space-y-1">
            <li>Ir a <strong>Silos Bolsa</strong> en el menú lateral.</li>
            <li>Hacer clic en <strong>Nuevo Silo</strong>.</li>
            <li>Completar: nombre (obligatorio), campo/lote, cultivo, capacidad, fecha de llenado, estado y notas.</li>
            <li>Hacer clic en <strong>Crear silo</strong>.</li>
            <li>Se mostrará la <strong>API key</strong> generada. Copiarla antes de cerrar — es necesaria para configurar el gateway.</li>
          </ol>
          <Note>
            La API key también puede consultarse después haciendo clic en <strong>&quot;Ver API key&quot;</strong> en la tarjeta del silo.
          </Note>

          <h4 className="font-semibold text-gray-800 mb-2 mt-4">Tarjetas de silo</h4>
          <p className="text-sm text-gray-700 mb-4">
            Cada tarjeta muestra el estado del silo, la última lectura de temperatura y humedad con timestamp,
            las alertas activas (borde rojo si hay alguna) y un botón para revelar la API key.
          </p>

          <h4 className="font-semibold text-gray-800 mb-2">Variables monitoreadas</h4>
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left border border-gray-200 px-3 py-2 font-semibold">Variable</th>
                <th className="text-left border border-gray-200 px-3 py-2 font-semibold">Unidad</th>
                <th className="text-left border border-gray-200 px-3 py-2 font-semibold">Umbral de alerta</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Temperatura', '°C', '> 35 °C'],
                ['Humedad relativa', '%', '> 14 %'],
                ['CO₂', 'ppm', '> 5000 ppm'],
                ['Batería del sensor', '%', '< 20 %'],
              ].map(([v, u, t]) => (
                <tr key={v} className="even:bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2">{v}</td>
                  <td className="border border-gray-200 px-3 py-2">{u}</td>
                  <td className="border border-gray-200 px-3 py-2 text-red-700 font-mono text-xs">{t}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="font-semibold text-gray-800 mb-2">Integración IoT — Contrato de la API</h4>
          <p className="text-sm text-gray-700 mb-2">
            El gateway IoT envía lecturas por HTTP POST:
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto mb-3 whitespace-pre-wrap">{`POST https://<dominio>/api/iot/silo-readings
Authorization: Bearer <api_key_del_silo>
Content-Type: application/json

{
  "sensor_id": "uuid-del-sensor",    // opcional
  "recorded_at": "2025-06-08T14:00:00Z",
  "temperature_c": 28.4,
  "humidity_pct": 13.2,
  "co2_ppm": 1200,
  "battery_pct": 85
}`}</pre>
          <p className="text-sm text-gray-700 mb-3">
            También acepta un <strong>array</strong> de lecturas en un solo request (envío en lote). Todos los campos
            son opcionales excepto la autenticación. Si <code className="text-xs bg-gray-100 px-1 rounded">recorded_at</code> no
            se envía, se usa la hora del servidor.
          </p>
          <Note>
            Cada silo tiene una <strong>API key única</strong>. El gateway debe configurarse con ella.
            Si se compromete, el administrador puede regenerarla desde la interfaz.
          </Note>
        </Section>

        <Section title="11. Alta de un nuevo tenant (administrador del sistema)">
          <p className="text-sm text-gray-700 mb-4">
            Esta sección está dirigida a quien administra la plataforma y necesita habilitar a una nueva empresa u
            organización para usar el sistema.
          </p>

          {/* Diagrama de flujo */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-4 mb-5 font-mono text-xs text-gray-600 leading-relaxed">
            <p>1. Crear usuario admin en el panel de Supabase</p>
            <p className="pl-6 text-gray-400">↓</p>
            <p>2. El usuario hace login → la app lo redirige a /onboarding</p>
            <p className="pl-6 text-gray-400">↓</p>
            <p>3. Completa datos de la organización → queda como Admin</p>
            <p className="pl-6 text-gray-400">↓</p>
            <p>4. El Admin invita al equipo desde Usuarios</p>
            <p className="pl-6 text-gray-400">↓</p>
            <p>5. Cada invitado recibe email → entra directo al dashboard</p>
          </div>

          <h4 className="font-semibold text-gray-800 mb-1">Paso 1 — Crear el usuario admin inicial</h4>
          <p className="text-sm text-gray-700 mb-3">
            La app no tiene registro público. El primer usuario de cada tenant debe crearse en el panel de Supabase:
            <strong> Authentication → Users → Add user</strong>. Ingresar email y contraseña del admin de la nueva empresa.
            El sistema crea el perfil automáticamente (sin organización asignada todavía).
          </p>

          <h4 className="font-semibold text-gray-800 mb-1">Paso 2 — Onboarding: configurar la organización</h4>
          <p className="text-sm text-gray-700 mb-2">
            La primera vez que el admin hace login, la app detecta que no tiene organización y lo redirige a
            la pantalla <strong>"Configurá tu organización"</strong>. Al confirmar, el sistema crea automáticamente:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1">
            <li>La organización en la base de datos</li>
            <li>El usuario queda como <strong>Admin</strong> de esa org</li>
            <li>Las categorías de productos de base (Herbicida, Fungicida, Insecticida, etc.)</li>
            <li>Un depósito inicial llamado "Depósito Principal"</li>
          </ul>

          <h4 className="font-semibold text-gray-800 mb-1">Paso 3 — Invitar al equipo</h4>
          <p className="text-sm text-gray-700 mb-3">
            El Admin invita usuarios desde el menú <strong>Usuarios</strong>. Cada invitado recibe un email con un link
            que lo asigna automáticamente a la misma organización y lo lleva directo al dashboard (sin pasar por el onboarding).
          </p>
          <Note>
            El link de invitación expira en <strong>24 horas</strong>. Si el usuario no lo usa a tiempo, el Admin debe
            re-enviarlo desde el panel de Supabase (Authentication → Users → Send magic link).
          </Note>

          <h4 className="font-semibold text-gray-800 mt-5 mb-1">Aislamiento entre tenants</h4>
          <p className="text-sm text-gray-700">
            Cada organización es completamente independiente. Los usuarios de una empresa no pueden ver ni acceder a los
            datos de otra. Esto está garantizado por las políticas de seguridad (RLS) de la base de datos: cada consulta
            filtra automáticamente por la organización del usuario autenticado.
          </p>
        </Section>

        <div className="border-t border-gray-200 mt-10 pt-4 text-xs text-gray-400 text-center">
          Para soporte técnico o reportar un problema, contactar al administrador del sistema.
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          nav, aside, header, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-1 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
      {steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 text-sm text-amber-800">
      <strong>Nota:</strong> {children}
    </div>
  )
}
