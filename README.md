# Gabarita

Gerenciador pessoal de estudos inspirado no guia **Boas-vindas e Plano de Estudo**, de Rodrigo Marengo (setembro de 2026). Interface em português, responsiva, com dados reais persistidos no PostgreSQL.

## Executar

Requisitos: Node.js 24+, pnpm 10 e Docker com Compose.

```sh
cp .env.example .env
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Interface: http://127.0.0.1:5173. Documentação interativa da API: http://127.0.0.1:3001/api/docs.

Também é possível executar tudo em containers:

```sh
docker compose --profile full up -d --build
```

Nesse modo a interface fica em http://127.0.0.1:3001. Para outra porta, use `APP_PORT=3002 docker compose --profile full up -d --build`. O volume `gabarita_data` preserva os dados entre reinicializações. `docker compose down` não apaga o volume.

## Primeiro uso

1. Configure nome, concurso, início do plano, data da prova (opcional) e disponibilidade real.
2. Em **Matérias e tópicos**, ajuste os pesos do edital e cadastre os tópicos. Clique no nome da matéria para editar e vincular o material principal. Os 16 nomes da coleção já vêm cadastrados; tópicos não são inventados porque o guia não contém os volumes.
3. Registre a primeira leitura. Ao concluir os tópicos da matéria, o ciclo ativo fica disponível.
4. No ciclo ativo, escreva cinco linhas de memória, confira o material e registre os resultados das questões. As revisões de 1, 7 e 30 dias são criadas automaticamente.
5. Registre a causa dos erros e a regra aprendida. Use a fila de revisões e os lembretes de véspera para recuperar o conteúdo.

## Funcionalidades

- Dashboard com próximo passo, atividade semanal, meta, questões e aproveitamento reais.
- Perfil e roteiro de 13 semanas, com as três fases do guia e rotina semanal explicada.
- Priorização de 6, 10 ou 16 matérias conforme disponibilidade; pesos editáveis, alternância de matérias, revisões atrasadas primeiro e descanso no domingo.
- Matérias e tópicos editáveis, links de materiais, primeira leitura e domínio separados.
- Sessões de leitura, ciclo ativo e questões/simulados; cronômetro, recuperação escrita e histórico.
- Revisões D+1, D+7 e D+30; validação de 20 questões em D+30; domínio apenas acima de 80%.
- Caderno de erros pesquisável, causa, regra, referência e marcação de superação.
- Destaques Memorize, Atenção, Jurisprudência e Observação; lembretes deixam de ser prioritários após três confirmações consecutivas.
- Histórico, progresso por matéria e exportação JSON dos dados.
- Validação na API e controle de versão para impedir sobrescrita silenciosa por outra janela.

## Stack

Vue 3 / Composition API, TypeScript estrito, Vite, Vue Router, TanStack Vue Query, Tailwind CSS 4, componente Button no padrão shadcn-vue com Primitive do Reka UI, TanStack Table, Lucide Vue e VueUse. Fastify, PostgreSQL 17, Drizzle ORM, Docker Compose, OpenAPI e cliente Vue Query gerado por Orval. Vitest, Testing Library para Vue, Playwright, ESLint e Prettier.

## Verificações

```sh
pnpm api:generate
pnpm build
pnpm lint
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
```

Os testes de integração precisam do banco local. Criam um schema temporário exclusivo e o removem ao terminar. Os testes E2E usam o servidor local e limpam apenas seus próprios registros.

O contrato OpenAPI é gerado a partir dos schemas da API; `src/api/generated.ts` é produzido pelo Orval e não deve ser editado manualmente.

## Estrutura

- `src/App.vue`: interface e fluxos de estudo.
- `src/components/ui`: componentes de interface acessíveis.
- `server/domain.ts`: modelos, regras da metodologia e recomendação de próximo estudo.
- `server/app.ts`: API e concorrência otimista.
- `server/schema.ts`: tabelas relacionais, chaves estrangeiras, restrições e índices com Drizzle.
- `server/repository.ts`: consultas e gravações relacionais em transações.
- `server/migrate.ts` e `migrations/`: migração versionada com preservação dos dados legados.
- `docs/banco-relacional.md`: diagrama, decisões e instruções de migração.
- `docs/consultas.sql`: consultas para usar diretamente no DBeaver.
- `docs/metodologia.md`: decisões de interpretação do guia.
- `openapi.json`: contrato reproduzível da API.

## Escopo desta entrega

Aplicação **pessoal e local**, com um espaço de estudo por instalação e sem autenticação. As portas ficam vinculadas ao loopback. Não é uma implantação pública multiusuário.

O PDF fornecido é um guia metodológico: não inclui os 16 volumes, questões completas ou julgados. Por isso, materiais são vinculados por URL, questões/simulados são feitos no material de origem e seus resultados são registrados aqui. Não há banco de questões inventado, importação automática de edital, atualização jurídica automática nem notificações externas. A fila de revisões é calculada ao abrir o app.

O banco é inteiramente relacional e não armazena documentos JSON/JSONB. O JSON da API é montado por consultas às tabelas. A migração preserva os dados da versão anterior e remove a coluna `workspaces.data`. Execute `pnpm db:migrate` antes de iniciar; o Docker faz isso automaticamente. Veja [a arquitetura do banco](docs/banco-relacional.md). A interface continua pessoal, com um plano por espaço e sem autenticação. Históricos extensos ainda são retornados pelo endpoint de compatibilidade; paginação e autenticação são evoluções independentes.

### Vários concursos

Acesse **Meus concursos** para cadastrar provas e relacionar seus editais ao acervo compartilhado. O Meu dia prioriza a prova mais próxima, considera pesos por edital e explica o aproveitamento entre concursos. Consulte [o guia de concursos](docs/concursos.md) para as regras e [a estrutura relacional](docs/banco-relacional.md) para a migração.
