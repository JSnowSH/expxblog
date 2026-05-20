import { getSettings } from '@/lib/settings'
import { ApparenceClient } from './ApparenceClient'

export default async function ApparencePage() {
  const settings = await getSettings()
  return <ApparenceClient initial={settings} />
}
