# O que ainda falta (exige navegador/painéis, não dá pra fazer só no VSCode)

- `01-pages-configuracao.pdf` — captura/print do painel do Cloudflare Pages (nome do projeto, ramificação, build settings) depois de criar o projeto.
- `02-google-retorno.txt` — a URL `URL_BASE/oauth/callback/google` cadastrada no cliente OAuth do Google Cloud Console.
- `03-github-retorno.txt` — a Homepage URL e a Authorization callback URL cadastradas na OAuth App do GitHub.
- `04-d1-esquema.txt` — resultado da consulta `SELECT name, type FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name;` rodada no console D1 (depois de colar `schema.sql` lá).
- `05-inicio-login-google.pdf` / `06-inicio-login-github.pdf` — capturas saneadas da aba Network mostrando o redirecionamento inicial de cada provedor.
- `07-testes-falha.md` — já tem a estrutura pronta; falta rodar os 6 casos na implantação publicada e preencher "Resultado observado".
- `08-aceitacao.md` — já copiado; marcar os itens conforme forem validados.

Depois de criar o projeto no Cloudflare Pages, o banco D1, e registrar os apps OAuth no Google e no GitHub (Etapas 1 a 5 do roteiro), cadastre os segredos e variáveis no painel do Pages e peça uma nova implantação antes de gerar essas evidências.
