@AGENTS.md

# Reglas del proyecto AgroStock

## Antes de cada commit

Siempre correr este comando y verificar que no haya errores antes de hacer `git commit`:

```powershell
npx tsc --noEmit
```

Si hay errores de TypeScript, corregirlos antes de continuar. No commitear código con errores de tipos.

## Cuando se agrega o modifica una funcionalidad

Actualizar **ambos** archivos de documentación:

1. `docs/manual-usuario.md` — fuente de verdad en Markdown
2. `app/(app)/manual/page.tsx` — versión visual en la app (misma estructura, formato JSX)

Incluir siempre:
- Quién puede usar la funcionalidad (rol)
- Los pasos del flujo numerados
- Una nota si hay restricciones importantes

## Stack y convenciones

- Next.js 16 App Router — leer guías en `node_modules/next/dist/docs/` ante cualquier duda
- Zod v4 — `invalid_type_error` no existe; usar `z.number()` con `valueAsNumber: true` en el input
- Recharts — los tipos de `formatter` en `Tooltip` aceptan `ValueType` (puede ser `undefined`), usar `Number(value ?? 0)`
- Server Actions — no lanzar excepciones; retornar `{ success: true } | { success: false, error: string }`
- shadcn/ui Select (@base-ui/react) — siempre pasar prop `items` en `Select.Root` para que `SelectValue` resuelva el label cuando el popup está cerrado
