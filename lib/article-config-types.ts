export type ArticleVoiceTone =
  | 'profissional'
  | 'informal'
  | 'tecnico'
  | 'jornalistico'
  | 'descontraido'

export type ArticleLanguage = 'pt-BR' | 'en' | 'es'

export interface ArticleGenerationConfig {
  minWords: number
  voiceTone: ArticleVoiceTone
  language: ArticleLanguage
  creativity: number
  includeExamples: boolean
  includeLists: boolean
  includeQuotes: boolean
  includeTables: boolean
  extraInstructions: string
}

export const ARTICLE_CONFIG_DEFAULTS: ArticleGenerationConfig = {
  minWords: 800,
  voiceTone: 'profissional',
  language: 'pt-BR',
  creativity: 0.7,
  includeExamples: false,
  includeLists: true,
  includeQuotes: false,
  includeTables: false,
  extraInstructions: '',
}
