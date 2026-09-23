import { CustomerTabNav } from './CustomerTabNav'

export default function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fitall-page fitall-scroll bg-white">
      <div className="mx-auto min-h-full w-full max-w-[430px] border-x border-[#DDE8E8] bg-white md:min-h-screen">
        {children}
      </div>
      <CustomerTabNav />
    </div>
  )
}
