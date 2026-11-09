import { loadCustomerAppData } from '@/lib/customer-app'
import { CustomerHome } from './CustomerHome'
import { Screen } from '@/ui/Screen'
import { Section, Row } from '@/ui/List'

export default async function CustomerAppHomePage() {
  const data = await loadCustomerAppData()
  if (!data) {
    return (
      <Screen title="ホーム">
        <Section group footer="LINEの登録リンクから開くと、残りのチケットと予約を確認できます。">
          <Row title="マイページを開いてください" />
        </Section>
      </Screen>
    )
  }
  return <CustomerHome data={data} />
}
