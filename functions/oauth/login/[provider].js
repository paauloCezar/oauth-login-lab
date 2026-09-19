import { randomToken, sha256Base64Url } from "../../_shared/crypto.js";
import { setTransactionCookie } from "../../_shared/cookies.js";
import {
  PROVIDERS,
  isSupportedProvider,
  credentialsFor,
  TRANSACTION_TTL_SECONDS,
} from "../../_shared/providers.js";

export async function onRequestGet(context) {
  const { params, env } = context;
  const provider = params.provider;

  if (!isSupportedProvider(provider)) {
    return new Response("não encontrado", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { clientId } = credentialsFor(provider, env);
  const baseUrl = env.PUBLIC_BASE_URL;
  const redirectUri = `${baseUrl}/oauth/callback/${provider}`;

  const transactionToken = randomToken();
  const state = randomToken();
  const codeVerifier = randomToken();
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const nonce = provider === "google" ? randomToken() : null;

  const transactionIdHash = await sha256Base64Url(transactionToken);
  const stateHash = await sha256Base64Url(state);
  const expiresAt = Math.floor(Date.now() / 1000) + TRANSACTION_TTL_SECONDS;

  await env.DB.prepare(
    `INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(transactionIdHash, provider, stateHash, nonce, codeVerifier, expiresAt).run();

  const authUrl = new URL(PROVIDERS[provider].authorizationEndpoint);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    authUrl.searchParams.set("scope", PROVIDERS.google.scope);
    authUrl.searchParams.set("nonce", nonce);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": setTransactionCookie(transactionToken),
      "Cache-Control": "no-store",
    },
  });
}
