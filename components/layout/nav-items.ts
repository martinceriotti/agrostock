import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Sprout,
  ArrowLeftRight,
  Settings,
  Warehouse,
  Package,
  Users,
  ActivitySquare,
  BookOpen,
  Truck,
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
    label: 'Usuarios',
    href: '/admin/users',
    icon: Users,
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
