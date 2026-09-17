import { parseCookies, clearSessionCookie } from "../_shared/cookies.js";
import { sha256Base64Url } from "../_shared/crypto.js";

export async function onRequestPost(context) {
    const { request, env } = context;
    const origin = request.headers.get("Origin");

    if (origin !== env.PUBLIC_BASE_URL) {
        return new Response("origem inválida", {
            status: 403,
            headers: { "Cache-Control": "no-store" },
        });
    }

    const cookies = parseCookies(request);
    const sessionToken = cookies["__Host-session"];

    if (sessionToken) {
        const sessionIdHash = await sha256Base64Url(sessionToken);
        await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(sessionIdHash).run();
    }

    const headers = new Headers();
    headers.set("Location", env.PUBLIC_BASE_URL);
    headers.set("Cache-Control", "no-store");
    headers.set("Set-Cookie", clearSessionCookie());

    return new Response(null, { status: 302, headers });
}
