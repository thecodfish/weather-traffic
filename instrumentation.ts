export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Route outbound fetch (OSRM, Open-Meteo, Nominatim) through HTTP(S)_PROXY /
  // NO_PROXY when set. EnvHttpProxyAgent reads those env vars per-request and
  // is a no-op direct-connect agent when they're unset, so this is safe in any
  // environment, proxied or not.
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
