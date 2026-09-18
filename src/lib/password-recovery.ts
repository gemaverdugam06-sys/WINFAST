export function hasPasswordRecoveryCallback(url: string): boolean {
  try {
    const parsed = new URL(url, "http://localhost");
    const params = new URLSearchParams(parsed.search);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);

    return (
      params.get("type") === "recovery" ||
      hashParams.get("type") === "recovery" ||
      (Boolean(params.get("access_token")) && Boolean(params.get("refresh_token"))) ||
      (Boolean(hashParams.get("access_token")) && Boolean(hashParams.get("refresh_token"))) ||
      (parsed.pathname === "/auth/nueva-contrasena" && Boolean(params.get("code")))
    );
  } catch {
    return false;
  }
}
