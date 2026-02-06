import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/stars/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/stars/"!</div>
}
