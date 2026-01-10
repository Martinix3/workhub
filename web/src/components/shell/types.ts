// Shell component types

export interface NavigationItem {
  label: string
  href: string
  isActive?: boolean
}

export interface NavigationSection {
  label: string
  icon?: React.ReactNode
  href?: string
  items?: NavigationItem[]
  isActive?: boolean
}

export interface User {
  name: string
  email?: string
  role?: string
  roles?: string[]
  avatarUrl?: string
}
