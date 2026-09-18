# Testes de falha

Preencha "Resultado observado" depois de executar cada caso na implantação publicada.

## Caso 1: retorno sem cookie temporário

- Preparação: iniciar o login em uma janela comum e parar na página do provedor; copiar a URL de autorização para uma janela privativa sem o cookie `__Host-oauth-tx`.
- Pedido enviado: concluir o login na janela privativa.
- Resultado esperado: a rota de retorno recusa a resposta e não cria uma sessão.
- Resultado observado: A rota de retorno respondeu com o erro "transação ausente" (HTTP 400), pois a janela privativa não possuía o cookie `__Host-oauth-tx`. Nenhuma sessão foi criada.

## Caso 2: state alterado

- Preparação: iniciar outro login e parar na página do provedor antes de fornecer as credenciais.
- Pedido enviado: alterar um único caractere do parâmetro `state` na barra de endereço e prosseguir.
- Resultado esperado: a rota de retorno recusa a resposta antes de trocar o código.
- Resultado observado: A rota de retorno respondeu com o erro "state inválido" (HTTP 400), antes de qualquer troca do código de autorização por token. Nenhuma sessão foi criada.

## Caso 3: reutilização da transação

- Preparação: concluir um login com sucesso e localizar a requisição de retorno no painel Network.
- Pedido enviado: reabrir (Copy URL) a mesma URL de retorno.
- Resultado esperado: a transação já foi removida e a repetição falha.
- Resultado observado: Ao reabrir a mesma URL de retorno, a rota respondeu com o erro "transação ausente" (HTTP 400). Isso ocorre porque, no login bem-sucedido anterior, o cookie `__Host-oauth-tx` já havia sido removido pelo próprio servidor como parte da resposta de sucesso; na repetição, portanto, não existe mais cookie de transação para validar. O resultado prático é o mesmo esperado pelo roteiro — a repetição falha e nenhuma nova sessão é criada — ainda que o texto do erro seja diferente do exemplo indicado.

## Caso 4: sessão expirada

- Preparação: criar uma sessão de teste e, no console D1, executar `UPDATE sessions SET expires_at = 0;`.
- Pedido enviado: recarregar a página / consultar `/api/me`.
- Resultado esperado: `/api/me` responde 401.
- Resultado observado: Após forçar a expiração da sessão diretamente no D1, a consulta a `/api/me` retornou HTTP 401, confirmando que uma sessão expirada não é aceita pelo servidor.

## Caso 5: origem inválida na saída

- Preparação: manter uma sessão válida aberta em URL_BASE e abrir outra origem (ex.: https://example.com).
- Pedido enviado: `fetch("URL_BASE/oauth/logout", { method: "POST", credentials: "include" })` no console dessa outra origem.
- Resultado esperado: a rota recusa a operação; a sessão original em URL_BASE permanece válida.
- Resultado observado: A chamada feita a partir da outra origem foi bloqueada pelo próprio navegador antes de qualquer resposta do servidor (erro "Failed to fetch", por política de CORS). A sessão original em URL_BASE permaneceu válida e ativa.

## Caso 6: reutilização do cookie revogado

- Preparação: copiar temporariamente o valor do cookie `__Host-session`; executar o logout.
- Pedido enviado: restaurar o valor copiado do cookie e consultar `/api/me`.
- Resultado esperado: a linha da sessão foi removida do D1; a resposta é 401.
- Resultado observado: Após copiar o valor do cookie, executar o logout e restaurá-lo manualmente no navegador, a consulta a `/api/me` retornou HTTP 401. Isso confirma que a linha correspondente à sessão havia sido removida da tabela `sessions` no D1 no momento do logout, tornando o cookie restaurado inválido mesmo estando presente no navegador.

**Apague qualquer cookie, código, token, segredo, `state`, `nonce` ou `code_challenge` copiado durante os testes antes de entregar este arquivo.**
