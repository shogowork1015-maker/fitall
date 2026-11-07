import { CustomerTabNav } from './CustomerTabNav'

export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="fitall-customer-main">{children}</div>
      <CustomerTabNav />
    </>
  )
}
