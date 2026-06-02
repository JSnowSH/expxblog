import { callOpenRouter, getAIApiKey } from '@/lib/ai'
import type { CrawlerHandlerOptions, CrawlerHandlerResult } from '../types'

interface GithubRepo {
  full_name: string
  name: string
  description: string | null
  html_url: string
  stargazers_count: number
  topics: string[]
}

async function searchRepos(query: string): Promise<GithubRepo[]> {
  const encoded = encodeURIComponent(query)
  const resp = await fetch(
    `https://api.github.com/search/repositories?q=${encoded}&sort=stars&order=desc&per_page=20`,
    { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
  )
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`)
  const data = await resp.json() as { items: GithubRepo[] }
  return data.items ?? []
}

async function fetchReadme(fullName: string): Promise<string> {
  const resp = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
    headers: { Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!resp.ok) return ''
  return await resp.text()
}

async function pickRepo(repos: GithubRepo[], prompt: string, apiKey: string): Promise<GithubRepo> {
  if (repos.length === 1) return repos[0]
  const list = repos.map((r, i) => `${i + 1}. ${r.full_name} — ${r.description ?? 'sem descrição'} (${r.stargazers_count} stars)`).join('\n')
  const resp = await callOpenRouter(
    {
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: `Você é um curador de conteúdo para um blog. ${prompt}\n\nEscolha o repositório mais adequado para gerar um artigo de blog interessante e ainda não explorado. Responda APENAS com o número da opção escolhida (ex: 3).` },
        { role: 'user', content: `Repositórios disponíveis:\n${list}` },
      ],
      temperature: 0.3,
      max_tokens: 10,
    },
    apiKey
  )
  const raw = resp.choices[0]?.message?.content?.trim() ?? '1'
  const idx = parseInt(raw, 10) - 1
  return repos[Math.max(0, Math.min(idx, repos.length - 1))]
}

export async function runGithubHandler(opts: CrawlerHandlerOptions): Promise<CrawlerHandlerResult> {
  const apiKey = await getAIApiKey()
  if (!apiKey) throw new Error('AI API key não configurada')

  const repos = await searchRepos(opts.url)
  const fresh = repos.filter((r) => !opts.alreadyProcessedKeys.includes(r.full_name))
  if (fresh.length === 0) throw new Error('Nenhum repositório novo encontrado')

  const chosen = await pickRepo(fresh, opts.prompt, apiKey)
  const readme = await fetchReadme(chosen.full_name)

  const content = `# ${chosen.full_name}\n\n${chosen.description ?? ''}\n\nURL: ${chosen.html_url}\n\nStars: ${chosen.stargazers_count}\n\nTópicos: ${chosen.topics.join(', ')}\n\n---\n\n${readme}`

  return {
    chosen: {
      key: chosen.full_name,
      title: chosen.name,
      content,
      url: chosen.html_url,
    },
  }
}
