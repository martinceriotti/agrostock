'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApplications } from '@/lib/hooks/use-applications'
import { Plus, Sprout } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ApplicationsPage() {
  const { data: applications = [], isLoading } = useApplications()

  return (
    <div>
      <PageHeader
        title="Aplicaciones en Campo"
        description="Registro de consumos de productos por lote o campo"
        action={
          <Link href="/applications/new" className={cn(buttonVariants(), 'bg-green-700 hover:bg-green-800 gap-2')}>
            <Plus className="h-4 w-4" />
            Nueva aplicación
          </Link>
        }
      />

      <DataTable
        data={applications}
        isLoading={isLoading}
        emptyMessage="No hay aplicaciones registradas"
        columns={[
          {
            key: 'field',
            header: 'Lote / Campo',
            cell: (row) => (
              <div className="flex items-center gap-2">
                <Sprout className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-medium">{row.field_name}</span>
              </div>
            ),
          },
          {
            key: 'date',
            header: 'Fecha',
            cell: (row) => (
              <span className="text-sm">
                {format(new Date(row.application_date), 'dd MMM yyyy', { locale: es })}
              </span>
            ),
          },
          {
            key: 'items',
            header: 'Productos',
            cell: (row) => {
              const items = row.field_application_items as unknown[]
              return (
                <div className="flex flex-wrap gap-1">
                  {(items as Array<{ products: { name: string } | null; quantity_used: number; warehouses: { name: string } | null }>)
                    .slice(0, 3)
                    .map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item.products?.name} — {item.quantity_used}
                      </Badge>
                    ))}
                  {items.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{items.length - 3} más</Badge>
                  )}
                </div>
              )
            },
          },
          {
            key: 'user',
            header: 'Registrado por',
            cell: (row) => {
              const profile = row.profiles as { full_name: string } | null
              return <span className="text-sm text-gray-500">{profile?.full_name ?? '—'}</span>
            },
          },
          {
            key: 'notes',
            header: 'Notas',
            cell: (row) => <span className="text-sm text-gray-500 truncate max-w-xs block">{row.notes ?? '—'}</span>,
          },
        ]}
      />
    </div>
  )
}
