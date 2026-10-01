import { loadCustomerAppData } from '@/lib/customer-app'
import { CustomerHome } from './CustomerHome'

export default async function CustomerAppHomePage() {
  const data = await loadCustomerAppData()
  if (!data) return <main className="px-4 py-10">
    <h1 className="text-xl font-black">マイページを開いてください</h1>
    <p className="mt-3 text-sm leading-relaxed text-[#555555]">LINEの登録リンクから開くと、残りチケットと予約を確認できます。</p>
  </main>
  return <CustomerHome data={data} />
}
