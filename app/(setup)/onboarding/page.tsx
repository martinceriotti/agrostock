'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { organizationSchema, type OrganizationFormData } from '@/lib/validations'
import { useCreateOrganization } from '@/lib/hooks/use-organization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Leaf, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const createOrg = useCreateOrganization()

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '', cuit: '', contact_email: '', phone: '', address: '' },
  })

  async function onSubmit(data: OrganizationFormData) {
    await createOrg.mutateAsync(data)
    router.push('/dashboard')
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700">
          <Leaf className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-xl">Configurá tu organización</CardTitle>
        <CardDescription>
          Es la primera vez que ingresás. Creá tu organización para empezar a gestionar el stock.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre de la organización / empresa *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Ej: Ceriotti Hnos, La Esperanza S.A."
              autoFocus
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" {...form.register('cuit')} placeholder="20-12345678-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...form.register('phone')} placeholder="+54 9 ..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact_email">Email de contacto</Label>
            <Input id="contact_email" type="email" {...form.register('contact_email')} placeholder="admin@empresa.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...form.register('address')} placeholder="Localidad, Provincia" />
          </div>

          <Button
            type="submit"
            disabled={createOrg.isPending}
            className="w-full bg-green-700 hover:bg-green-800 mt-2"
          >
            {createOrg.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
            ) : 'Crear organización y comenzar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
