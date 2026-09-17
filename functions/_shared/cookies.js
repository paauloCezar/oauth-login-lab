export function parseCookies(request) {
    const header = request.headers.get("Cookie") || "";
    const cookies = {};
    for (const part of header.split(";")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const separator = trimmed.indexOf("=");
        if (separator === -1) continue;
        cookies[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
    }
    return cookies;
}

export function setTransactionCookie(value) {
    return `__Host-oauth-tx=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearTransactionCookie() {
    return "__Host-oauth-tx=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function setSessionCookie(value) {
    return `__Host-session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
}

export function clearSessionCookie() {
    return "__Host-session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
