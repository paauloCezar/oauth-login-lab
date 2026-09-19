# oauth-login-lab

Laboratorio de login federado (Google OAuth/OIDC e GitHub OAuth) publicado com Cloudflare Pages + Pages Functions + D1.

Aplicacao em producao: https://oauth-login-lab.pages.dev

As evidencias da entrega estao em `public/entrega1` (acessiveis apos o login em `public/evidencias.html`).

## Seguranca: responsavel pela rotacao dos Client Secrets

Responsavel: Paulo Cezar (autor unico deste projeto, com acesso as contas Google Cloud, GitHub e Cloudflare usadas aqui).

Em caso de necessidade de rotacao (vazamento suspeito, saida de acesso, expiracao, ou por rotina de seguranca), o responsavel acima deve:

1. Gerar um novo Client Secret no provedor correspondente (Google Cloud Console para o cliente OAuth Web, ou GitHub Developer Settings para a OAuth App).
2. Atualizar o segredo criptografado correspondente (`GOOGLE_CLIENT_SECRET` ou `GITHUB_CLIENT_SECRET`) em Cloudflare Pages, no projeto `oauth-login-lab`, em Settings > Variables and Secrets.
3. Solicitar uma nova implantacao (deployment) do projeto para que o novo segredo entre em vigor.
4. Revogar/excluir o Client Secret antigo no provedor, encerrando sua validade.
