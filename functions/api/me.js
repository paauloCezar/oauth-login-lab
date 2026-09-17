import { parseCookies } from "../_shared/cookies.js";
import { sha256Base64Url } from "../_shared/crypto.js";

export async function onRequestGet(context) {
    const { request, env } = context;
    const cookies = parseCookies(request);
    const sessionToken = cookies["__Host-session"];

    if (!sessionToken) {
        return new Response("não autenticado", {
            status: 401,
            headers: { "Cache-Control": "no-store" },
        });
    }

    const sessionIdHash = await sha256Base64Url(sessionToken);
    const now = Math.floor(Date.now() / 1000);

    const session = await env.DB.prepare(
        "SELECT email, display_name, expires_at FROM sessions WHERE id_hash = ?"
    ).bind(sessionIdHash).first();

    if (!session || session.expires_at <= now) {
        return new Response("não autenticado", {
            status: 401,
            headers: { "Cache-Control": "no-store" },
        });
    }

    return Response.json(
        { email: session.email, displayName: session.display_name },
        { headers: { "Cache-Control": "no-store" } }
    );
}
