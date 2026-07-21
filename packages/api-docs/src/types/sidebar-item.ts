// A VitePress-compatible sidebar item (structural, to avoid a vitepress dep).
export interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
}
