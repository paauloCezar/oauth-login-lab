# Avaliação: GitHub Actions com IA

Repositório: https://github.com/paauloCezar/oauth-login-lab

Dupla: Paulo Cezar (RA 2026108305) e Wesley dos Santos de Souza (RA 2025104728)

## Tarefa 1: CI a cada commit

- Execução verde: https://github.com/paauloCezar/oauth-login-lab/actions/runs/38190574842
- Execução vermelha (migração com erro de sintaxe proposital): https://github.com/paauloCezar/oauth-login-lab/actions/runs/38190605723
- Linha do log que mostra o erro, no step "Aplica as migrações D1 em um SQLite local":
  `Parse error near line 1: near ")": syntax error` (vírgula sobrando antes do `)` no `CREATE TABLE notas`)
- Execução verde depois da correção: https://github.com/paauloCezar/oauth-login-lab/actions/runs/38190630038

Por que a migração é testada em SQLite antes de chegar ao D1: o D1 usa o mesmo SQL do SQLite, então aplicar as migrações num banco descartável no CI encontra o erro de sintaxe antes do merge, sem tocar no banco de produção.

Observação: a primeira execução do esqueleto falhou sem nenhum segredo no código, porque o `git grep` encontrou o texto `GOCSPX-` dentro do próprio `ci.yml` (https://github.com/paauloCezar/oauth-login-lab/actions/runs/38190542840). Corrigi excluindo o `ci.yml` da busca com `':!.github/workflows/ci.yml'`.

## Tarefa 2: proteger a main com o CI

Regra `protege-main` (ruleset na main): exige pull request e o status check `verificar` aprovado.

- PR: https://github.com/paauloCezar/oauth-login-lab/pull/1
  - Bloqueado: a migração `0003_adiciona_coluna.sql` tinha uma vírgula sobrando, o `verificar` falhou (https://github.com/paauloCezar/oauth-login-lab/actions/runs/38191675489) e o merge ficou bloqueado.
  - Liberado: corrigi na mesma ramificação, o `verificar` passou (https://github.com/paauloCezar/oauth-login-lab/actions/runs/38191725291) e o merge foi liberado.
- Saída do `git push` direto na main recusado:

```
remote: error: GH013: Repository rule violations found for refs/heads/main.
remote: - Changes must be made through a pull request.
remote: - Required status check "verificar" is expected.
 ! [remote rejected] main -> main (push declined due to repository rule violations)
error: failed to push some refs to 'https://github.com/paauloCezar/oauth-login-lab.git'
```

Observação: com o repositório privado numa conta gratuita, o GitHub não aplica rulesets ("Upgrade to GitHub Pro or make this repository public"). Tornei o repositório público para a regra valer.

## Tarefa 3: revisão de PR por IA

- PR: https://github.com/paauloCezar/oauth-login-lab/pull/2
  - 1º comentário, com o SQL vulnerável (`` `SELECT * FROM notas WHERE aluno = '${nome}'` ``): a IA apontou injeção de SQL como HIGH e sugeriu `WHERE aluno = ?` com `.bind(nome)`. https://github.com/paauloCezar/oauth-login-lab/pull/2#issuecomment-6116158574
  - 2º comentário, depois de corrigir com `prepare("SELECT * FROM notas WHERE aluno = ?").bind(nome)` (evento `synchronize`): a IA confirmou que não há mais SQL concatenado. https://github.com/paauloCezar/oauth-login-lab/pull/2#issuecomment-6116169362
- Log do erro sem `pull-requests: write`: https://github.com/paauloCezar/oauth-login-lab/actions/runs/38192319167

```
GraphQL: Resource not accessible by integration (addComment)
##[error]Process completed with exit code 1.
```

  Explicação: ao declarar `permissions`, toda permissão não listada fica como `none`. Sem `pull-requests: write`, o `GITHUB_TOKEN` só lê o código, e o `gh pr comment` é recusado. A IA rodou normalmente; só o passo de comentar falhou. Depois restaurei a permissão (https://github.com/paauloCezar/oauth-login-lab/actions/runs/38192396554).

- Afirmação da IA irrelevante: no 2º comentário, a IA classificou como "Média" que `github.base_ref` "é interpolado diretamente no script de shell" e que "um nome de branch com metacaracteres pode alterar o comando". No nosso caso isso não é um risco real: `base_ref` é a ramificação de destino do PR (a `main`), que precisa já existir neste repositório, e só quem tem permissão de escrita aqui consegue criar ramificações. Quem abre um PR de fora controla o nome da ramificação de origem (`head_ref`), não o da de destino. Além disso, a IA não é consistente: o 3º comentário revisou o mesmo código e não repetiu esse alerta, e terminou oferecendo opções como "Fix all issues" e "criar `SECURITY-REVIEW.md` e fazer commit", que ela não tem como executar (é um comentário de PR, não uma conversa).

Problemas no esqueleto do PDF que precisei corrigir para a revisão funcionar:
1. `actions/ai-inference@v1` ainda é a versão antiga, que usa o GitHub Models e ignora o `COPILOT_GITHUB_TOKEN` (erro `Cannot use 'in' operator to search for 'choices' in OK`). Troquei para `@v3`, que usa o Copilot CLI.
2. O modelo padrão da action (`gpt-4.1`) não estava disponível na conta (`Model "gpt-4.1" from --model flag is not available`). Coloquei `model: ""` para o Copilot escolher um modelo disponível.

## Tarefa 4: migrações D1 depois do merge

A migração da coluna (`0003_adiciona_coluna.sql`) entrou pelo PR https://github.com/paauloCezar/oauth-login-lab/pull/1, que passou pelo CI (Tarefa 2) e pela revisão da IA (Tarefa 3) antes do merge. O nome é `0003` e não `0002` porque a `0002_cria_notas.sql` cria a tabela `notas`, que o site ainda não tinha.

- Execução do merge que aplicou a migração: https://github.com/paauloCezar/oauth-login-lab/actions/runs/38193236183

```
│ 0001_inicial.sql         │ ✅     │
│ 0002_cria_notas.sql      │ ✅     │
│ 0003_adiciona_coluna.sql │ ✅     │
```

  A primeira tentativa dessa execução falhou com `Headers.set: "*** ***" is an invalid header value`: o segredo `CLOUDFLARE_API_TOKEN` tinha sido salvo com uma quebra de linha. Gerei o token de novo, salvei só o valor e rodei a mesma execução outra vez.

- Saída do `npx wrangler d1 execute oauth-sessions-paulocezar --remote --command "PRAGMA table_info(notas)"`:

```
cid | name  | type    | notnull | pk
0   | id    | INTEGER | 0       | 1
1   | aluno | TEXT    | 1       | 0
2   | nota  | REAL    | 0       | 0
3   | turma | TEXT    | 0       | 0
```

- Prova de que o segundo merge (sem mudar `migrations/`) não disparou o workflow: o PR https://github.com/paauloCezar/oauth-login-lab/pull/4 só alterou o `README.md`. O merge (commit `c55be7a`) disparou apenas o `ci` (https://github.com/paauloCezar/oauth-login-lab/actions/runs/38193760559). A lista de execuções do `migrar` (https://github.com/paauloCezar/oauth-login-lab/actions/workflows/migrar.yml) tem uma única execução, a do merge do PR #1 (commit `14e294c`).

Cuidado tomado: o `wrangler.toml` não tem `pages_build_output_dir`. Com essa linha, o Cloudflare Pages passaria a usar o arquivo como fonte das configurações do projeto, no lugar do painel, e poderia quebrar o login em produção.

## Bônus: resumo das migrações por IA

O `migrar.yml` ganhou, depois do `wrangler d1 migrations apply`, um step que monta um prompt com o `git diff` da pasta `migrations/` desse push, chama `actions/ai-inference@v3` e escreve a resposta em `$GITHUB_STEP_SUMMARY`.

- PR: https://github.com/paauloCezar/oauth-login-lab/pull/6 (acrescenta o step e a migração `0004_indice_notas_aluno.sql`, um índice em `notas.aluno`, usado pelo `/api/notas`)
- Execução do merge com o resumo visível na página: https://github.com/paauloCezar/oauth-login-lab/actions/runs/38194551343

Na revisão do PR #6, a IA fez três alertas que não se aplicam: disse que faltava permissão de acesso a modelos (isso era da `v1`, que usava o GitHub Models; a `v3` usa o `COPILOT_GITHUB_TOKEN`), que o `head -c` falharia com `pipefail` (o GitHub só liga o `pipefail` quando o workflow declara `shell: bash`, e este não declara) e que `github.event.before` poderia vir só com zeros (só acontece no push que cria a `main`, que já existe).

## Perguntas

1. **Por que o `ci.yml` roda duas vezes num push em ramificação com PR aberto, e qual execução o status check considera?**
   O workflow escuta dois eventos: `push` (qualquer ramificação) e `pull_request` para a main, e um push numa ramificação com PR aberto dispara os dois. A execução de `pull_request` testa o resultado do merge da ramificação com a main, e é ela que representa o que vai entrar na main. As duas publicam um check chamado `verificar` no mesmo commit, e a regra só libera o merge se o `verificar` estiver aprovado.

2. **Por que um PR vindo de fork não consegue usar `secrets.COPILOT_PAT`, e qual ataque isso impede?**
   No evento `pull_request` vindo de um fork, o GitHub roda o código escrito por quem fez o fork, e por isso não entrega os segredos do repositório de destino (o `GITHUB_TOKEN` também vem só com leitura). Isso impede que qualquer pessoa abra um PR que altera o workflow ou um script para imprimir ou enviar os segredos para fora, roubando o token.

3. **Por que a Tarefa 3 declara `permissions` em vez de usar o padrão do `GITHUB_TOKEN`?**
   Pelo princípio do menor privilégio: o job só precisa ler o código (`contents: read`) e comentar no PR (`pull-requests: write`). Declarando isso, todo o resto fica sem permissão, então se o job for comprometido (uma action maliciosa, por exemplo), o token não consegue enviar código nem mexer em outras partes do repositório. O padrão do repositório pode ser mais amplo do que o necessário.

4. **A revisão da IA pode substituir o status check da Tarefa 2?**
   Não. O status check é determinístico: o mesmo código sempre dá o mesmo resultado, e uma falha bloqueia o merge com uma regra clara (o SQL tem ou não tem erro). A IA não é assim: no PR #2 ela revisou o mesmo código duas vezes e deu respostas diferentes, apontou um risco que não existe (o `base_ref`) e ofereceu ações que não pode executar. A revisão da IA serve como uma segunda opinião para a pessoa ler e avaliar, mas não como critério automático de merge.
