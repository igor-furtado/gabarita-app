# Gabarita

**Organize seus estudos para passar.**

Fundação frontend do MVP para organizar concursos, editais, disciplinas, tópicos e datas relevantes. Os dados são falsos e vivem exclusivamente na memória: qualquer alteração desaparece ao recarregar a página.

## Requisitos

- Node.js 20 ou superior
- pnpm 10 ou superior

## Executar localmente

```bash
pnpm install
pnpm dev
```

Acesse o endereço exibido pelo Vite (normalmente `http://localhost:5173`).

## Verificações

```bash
pnpm typecheck      # TypeScript estrito
pnpm lint           # ESLint
pnpm test           # Vitest + Testing Library
pnpm build          # build de produção
pnpm exec playwright install chromium  # somente na primeira execução
pnpm test:e2e       # Playwright
pnpm format         # formata os arquivos
pnpm format:check   # confere a formatação
```

## Estrutura

- `src/app`: composição raiz da aplicação
- `src/components`: componentes de interface e layout
- `src/features`: páginas e fluxos por funcionalidade
- `src/stores`: estado e ações do Pinia
- `src/mocks`: massa de dados inicial
- `src/types`: contratos do domínio
- `src/router`: rotas do Vue Router
- `src/test` e `e2e`: suporte e testes automatizados

Não há backend, autenticação, API, upload real ou persistência local neste MVP.
