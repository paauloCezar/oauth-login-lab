# Testes de falha

Preencha "Resultado observado" depois de executar cada caso na implantação publicada.

## Caso 1: retorno sem cookie temporário

- Preparação: iniciar o login em uma janela comum e parar na página do provedor; copiar a URL de autorização para uma janela privativa sem o cookie `__Host-oauth-tx`.
- Pedido enviado: concluir o login na janela privativa.
- Resultado esperado: a rota de retorno recusa a resposta e não cria uma sessão.
- Resultado observado:

## Caso 2: state alterado

- Preparação: iniciar outro login e parar na página do provedor antes de fornecer as credenciais.
- Pedido enviado: alterar um único caractere do parâmetro `state` na barra de endereço e prosseguir.
- Resultado esperado: a rota de retorno recusa a resposta antes de trocar o código.
- Resultado observado:

## Caso 3: reutilização da transação

- Preparação: concluir um login com sucesso e localizar a requisição de retorno no painel Network.
- Pedido enviado: reabrir (Copy URL) a mesma URL de retorno.
- Resultado esperado: a transação já foi removida e a repetição falha.
- Resultado observado:

## Caso 4: sessão expirada

- Preparação: criar uma sessão de teste e, no console D1, executar `UPDATE sessions SET expires_at = 0;`.
- Pedido enviado: recarregar a página / consultar `/api/me`.
- Resultado esperado: `/api/me` responde 401.
- Resultado observado:

## Caso 5: origem inválida na saída

- Preparação: manter uma sessão válida aberta em URL_BASE e abrir outra origem (ex.: https://example.com).
- Pedido enviado: `fetch("URL_BASE/oauth/logout", { method: "POST", credentials: "include" })` no console dessa outra origem.
- Resultado esperado: a rota recusa a operação; a sessão original em URL_BASE permanece válida.
- Resultado observado:

## Caso 6: reutilização do cookie revogado

- Preparação: copiar temporariamente o valor do cookie `__Host-session`; executar o logout.
- Pedido enviado: restaurar o valor copiado do cookie e consultar `/api/me`.
- Resultado esperado: a linha da sessão foi removida do D1; a resposta é 401.
- Resultado observado:

**Apague qualquer cookie, código, token, segredo, `state`, `nonce` ou `code_challenge` copiado durante os testes antes de entregar este arquivo.**
