export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const TRANSACTION_TTL_SECONDS = 600;

export const PROVIDERS = {
    google: {
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        scope: "openid email profile",
    },
    github: {
        authorizationEndpoint: "https://github.com/login/oauth/authorize",
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        userEndpoint: "https://api.github.com/user",
    },
};

export function isSupportedProvider(provider) {
    return provider === "google" || provider === "github";
}

export function credentialsFor(provider, env) {
    if (provider === "google") {
        return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
    }
    return { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
}
