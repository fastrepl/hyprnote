import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/collections/$slug')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/collections/$slug"!</div>
}
