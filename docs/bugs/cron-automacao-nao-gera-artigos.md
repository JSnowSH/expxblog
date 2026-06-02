# Bug: Cron de automação não gera artigos automaticamente

**Data**: 2026-06-02
**Severidade**: ALTO
**Status**: RESOLVIDO

## Descrição do problema

O usuário configurou a automação em `/admin/artigos`, ativou-a e executou manualmente com sucesso. Durante o dia o sistema não gerou artigos automaticamente no intervalo configurado (1 hora).

## Causa-raiz

### Bug 1 — Principal
**Arquivo**: `lib/automation.ts`
**Tipo**: Lógica — estado não atualizado

`runAutomationCycle` verifica `next_run_at` no início para decidir se executa, mas nunca atualizava `next_run_at` nem `last_run_at` no banco após a execução. Após qualquer execução (manual ou automática), o pg_cron continuava encontrando o mesmo `next_run_at` original e registrava `skipped` indefinidamente.

### Bug 2 — Agravante
**Arquivo**: `app/api/admin/automation/route.ts`
**Tipo**: Lógica — next_run_at resetado em toda operação de save

Ao salvar configurações com `enabled = true`, o `next_run_at` era recalculado como `now() + interval_hours` (e após a primeira correção, como `now()`), sem distinguir se estava sendo feita a transição `false → true` ou apenas uma atualização de configuração com automação já ativa. Isso resetava o agendamento a cada save.

## Solução aplicada

**lib/automation.ts**: Adicionada função `updateNextRun(configId, intervalHours)` que atualiza `last_run_at = now()` e `next_run_at = now + intervalHours`. Chamada em todos os quatro caminhos de execução completa: `pipeline_done` (sucesso), pipeline sem eventos, falha de pipeline, e erro inesperado no `catch`. Os caminhos `skipped` não chamam `updateNextRun` — execuções ignoradas não avançam o agendamento.

**app/api/admin/automation/route.ts**: `next_run_at` agora é resetado para `now()` apenas na transição `false → true` (nova ativação). Quando `enabled` já era `true` antes do save, o `next_run_at` é preservado para não interromper o ciclo em andamento.

**Arquivos modificados**:
- `lib/automation.ts` — adicionada `updateNextRun`, chamada nos quatro caminhos de execução real
- `app/api/admin/automation/route.ts` — lógica de `nextRun` condicionada à transição de estado

## Como reproduzir (antes da correção)

1. Ir em `/admin/artigos > Automação`, ativar e salvar
2. Clicar "Executar agora" — artigo gerado com sucesso
3. Aguardar o intervalo configurado
4. Verificar logs: todas as execuções do cron aparecem como `skipped` com mensagem "Ainda não está na hora de executar"

## Como verificar (após a correção)

- [ ] Executar manualmente e confirmar que `next_run_at` foi atualizado (GET `/api/admin/automation`)
- [ ] Aguardar o intervalo e confirmar log com `triggered_by: 'schedule'` e `status: 'success'`
- [ ] Salvar configurações com `enabled = true` já ativo — confirmar que `next_run_at` não foi resetado
- [ ] `npm run build` passa sem erros TypeScript

## Lições aprendidas

Ao usar um padrão de "cron externo + guard de tempo no banco", é obrigatório que **toda execução real** (sucesso ou erro) avance o `next_run_at`. Execuções que apenas verificam e ignoram (`skipped`) não devem mover o agendamento. Sem isso, o sistema fica preso num loop de `skipped` após a primeira execução bem-sucedida.
