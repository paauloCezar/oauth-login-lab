import { randomToken, sha256Base64Url } from "../../_shared/crypto.js";
import { parseCookies, setSessionCookie, clearTransactionCookie } from "../../_shared/cookies.js";
import {
  PROVIDERS,
  isSupportedProvider,
  credentialsFor,
  SESSION_TTL_SECONDS,
} from "../../_shared/providers.js";
import { verifyGoogleIdToken } from "../../_shared/oidc.js";

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const provider = params.provider;

  if (!isSupportedProvider(provider)) {
    return new Response("não encontrado", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error || !code || !state) {
    return new Response("pedido de retorno inválido", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const cookies = parseCookies(request);
  const transactionToken = cookies["__Host-oauth-tx"];
  if (!transactionToken) {
    return new Response("transação ausente", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const transactionIdHash = await sha256Base64Url(transactionToken);
  const now = Math.floor(Date.now() / 1000);

  const transaction = await env.DB.prepare(
    `SELECT provider, state_hash, nonce, code_verifier, expires_at
     FROM oauth_transactions WHERE id_hash = ?`
  ).bind(transactionIdHash).first();

  if (!transaction || transaction.provider !== provider || transaction.expires_at <= now) {
    return new Response("transação inválida ou expirada", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const stateHash = await sha256Base64Url(state);
  if (stateHash !== transaction.state_hash) {
    return new Response("state inválido", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  await env.DB.prepare("DELETE FROM oauth_transactions WHERE id_hash = ?").bind(transactionIdHash).run();

  const { clientId, clientSecret } = credentialsFor(provider, env);
  const baseUrl = env.PUBLIC_BASE_URL;
  const redirectUri = `${baseUrl}/oauth/callback/${provider}`;

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: transaction.code_verifier,
  });

  const tokenResponse = await fetch(PROVIDERS[provider].tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenBody.toString(),
  });

  if (!tokenResponse.ok) {
    return new Response("falha na troca de tokens", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const tokenPayload = await tokenResponse.json();

  let identity;

  if (provider === "google") {
    if (!tokenPayload.id_token) {
      return new Response("id_token ausente", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const claims = await verifyGoogleIdToken(tokenPayload.id_token, {
      clientId,
      nonce: transaction.nonce,
    });
    identity = {
      issuer: "https://accounts.google.com",
      subject: claims.sub,
      email: claims.email ?? null,
      displayName: claims.name ?? null,
    };
  } else {
    if (!tokenPayload.access_token || !/^bearer$/i.test(tokenPayload.token_type ?? "")) {
      return new Response("access_token ausente", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const userResponse = await fetch(PROVIDERS.github.userEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "oauth-pages-lab",
      },
    });

    if (userResponse.status !== 200) {
      return new Response("falha ao consultar o perfil do GitHub", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const profile = await userResponse.json();
    if (typeof profile.id !== "number") {
      return new Response("perfil do GitHub inválido", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const revokeResponse = await fetch(
      `https://api.github.com/applications/${clientId}/grant`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "Content-Type": "application/json",
          "User-Agent": "oauth-pages-lab",
        },
        body: JSON.stringify({ access_token: tokenPayload.access_token }),
      }
    );

    if (revokeResponse.status !== 204) {
      return new Response("falha ao revogar a autorização do GitHub", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    identity = {
      issuer: "https://github.com",
      subject: String(profile.id),
      email: profile.email ?? null,
      displayName: profile.name ?? profile.login ?? null,
    };
  }

  const sessionToken = randomToken();
  const sessionIdHash = await sha256Base64Url(sessionToken);
  const sessionExpiresAt = now + SESSION_TTL_SECONDS;

  await env.DB.prepare(
    `INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    sessionIdHash,
    identity.issuer,
    identity.subject,
    identity.email,
    identity.displayName,
    sessionExpiresAt,
    now
  ).run();

  const headers = new Headers();
  headers.set("Location", baseUrl);
  headers.set("Cache-Control", "no-store");
  headers.append("Set-Cookie", clearTransactionCookie());
  headers.append("Set-Cookie", setSessionCookie(sessionToken));

  return new Response(null, { status: 302, headers });
}
