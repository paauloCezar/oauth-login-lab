import { fromBase64Url } from "./crypto.js";

function decodeSegment(segment) {
    const bytes = fromBase64Url(segment);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
}

export async function verifyGoogleIdToken(idToken, { clientId, nonce }) {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
        throw new Error("id_token mal formado");
    }
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeSegment(headerPart);
    const payload = decodeSegment(payloadPart);

    if (header.alg !== "RS256") {
        throw new Error("algoritmo de assinatura inesperado");
    }

    const discoveryResponse = await fetch("https://accounts.google.com/.well-known/openid-configuration");
    if (!discoveryResponse.ok) {
        throw new Error("falha ao obter o documento de descoberta do Google");
    }
    const discovery = await discoveryResponse.json();

    const jwksResponse = await fetch(discovery.jwks_uri);
    if (!jwksResponse.ok) {
        throw new Error("falha ao obter o JWKS do Google");
    }
    const jwks = await jwksResponse.json();

    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk) {
        throw new Error("chave pública não encontrada para o kid informado");
    }

    const publicKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
    );

    const signingInput = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const signature = fromBase64Url(signaturePart);
    const isValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signingInput);
    if (!isValid) {
        throw new Error("assinatura do id_token inválida");
    }

    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== discovery.issuer) {
        throw new Error("emissor inesperado");
    }
    if (payload.aud !== clientId) {
        throw new Error("audiência inesperada");
    }
    if (typeof payload.exp !== "number" || payload.exp <= now) {
        throw new Error("id_token expirado");
    }
    if (typeof payload.iat !== "number" || payload.iat > now + 60) {
        throw new Error("id_token emitido no futuro");
    }
    if (payload.nonce !== nonce) {
        throw new Error("nonce inesperado");
    }

    return payload;
}
