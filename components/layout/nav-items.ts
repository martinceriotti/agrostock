import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Sprout,
  ArrowLeftRight,
  Settings,
  Warehouse,
  Package,
  ActivitySquare,
  BookOpen,
  Truck,
  Database,
} from 'lucide-react'

export const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Stock',
    href: '/stock',
    icon: PackageSearch,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Órdenes de Compra',
    href: '/orders',
    icon: ShoppingCart,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Aplicaciones',
    href: '/applications',
    icon: Sprout,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Movimientos',
    href: '/movements',
    icon: ArrowLeftRight,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Transferencia',
    href: '/movements/transfer',
    icon: Truck,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Silos Bolsa',
    href: '/silos',
    icon: Database,
    roles: ['admin', 'manager', 'engineer'],
  },
  {
    label: 'Productos',
    href: '/products',
    icon: Package,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Depósitos',
    href: '/warehouses',
    icon: Warehouse,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Configuración',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
  {
    label: 'Actividad',
    href: '/admin/activity',
    icon: ActivitySquare,
    roles: ['admin'],
  },
  {
    label: 'Manual',
    href: '/manual',
    icon: BookOpen,
    roles: ['admin', 'manager', 'engineer'],
  },
]
