import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, { url: string; expires: number }>();
const STORAGE_TTL_SECONDS = 60 * 60 * 24 * 7;
const PUBLIC_BUCKETS = new Set(["productos"]);

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeStoragePath = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isExternalUrl(trimmed)) return trimmed;
  return trimmed.replace(/^\/+/, "");
};

async function resolveStorageUrl(bucket: string, path: string): Promise<string | null> {
  const normalized = normalizeStoragePath(path);
  if (!normalized) return null;
  if (isExternalUrl(normalized)) return normalized;

  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(normalized);
    return data?.publicUrl || null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(normalized, STORAGE_TTL_SECONDS);

    if (!error && data?.signedUrl) {
      cache.set(`${bucket}:${normalized}`, {
        url: data.signedUrl,
        expires: Date.now() + 60 * 60 * 1000,
      });
      return data.signedUrl;
    }
  } catch {
    // fall through to public-url fallback
  }

  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(normalized);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

/**
 * Returns URLs for a set of storage paths in a given bucket.
 * Accepts both Supabase storage paths and already-public URLs.
 */
export function useSignedUrls(bucket: string, paths: string[] | null | undefined) {
  const [urls, setUrls] = useState<string[]>([]);
  const pathKey = paths?.join(",") ?? "";

  useEffect(() => {
    const safePaths = (paths ?? [])
      .map(normalizeStoragePath)
      .filter((p): p is string => Boolean(p));

    if (safePaths.length === 0) {
      setUrls([]);
      return;
    }

    const now = Date.now();
    const need: string[] = [];
    const resolved: (string | null)[] = safePaths.map((p) => {
      if (isExternalUrl(p)) return p;
      if (PUBLIC_BUCKETS.has(bucket)) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(p);
        const publicUrl = data?.publicUrl ?? null;
        if (publicUrl) {
          cache.set(`${bucket}:${p}`, {
            url: publicUrl,
            expires: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
        return publicUrl;
      }
      const c = cache.get(`${bucket}:${p}`);
      if (c && c.expires > now) return c.url;
      need.push(p);
      return null;
    });

    if (need.length === 0) {
      setUrls(resolved.filter((u): u is string => !!u));
      return;
    }

    try {
      if (!supabase?.storage?.from) {
        setUrls([]);
        return;
      }

      supabase.storage
        .from(bucket)
        .createSignedUrls(need, STORAGE_TTL_SECONDS)
        .then(({ data, error }) => {
          if (data && Array.isArray(data)) {
            data.forEach((d) => {
              if (d.signedUrl && d.path) {
                cache.set(`${bucket}:${d.path}`, {
                  url: d.signedUrl,
                  expires: now + 60 * 60 * 1000,
                });
              }
            });
          }

          const final = safePaths.map((p) => {
            if (isExternalUrl(p)) return p;
            return cache.get(`${bucket}:${p}`)?.url ?? null;
          });

          if (final.some((u) => !u) && !error) {
            void Promise.all(
              safePaths.map(async (p) => {
                if (isExternalUrl(p)) return p;
                const publicUrl = await resolveStorageUrl(bucket, p);
                if (publicUrl) {
                  cache.set(`${bucket}:${p}`, {
                    url: publicUrl,
                    expires: now + 60 * 60 * 1000,
                  });
                }
              }),
            ).finally(() => {
              const fallback = safePaths.map((p) => {
                if (isExternalUrl(p)) return p;
                return cache.get(`${bucket}:${p}`)?.url ?? "";
              });
              setUrls(fallback.filter(Boolean));
            });
            return;
          }

          setUrls(final.filter((u): u is string => !!u));
        })
        .catch(async () => {
          const fallback = await Promise.all(
            safePaths.map(async (p) => (isExternalUrl(p) ? p : resolveStorageUrl(bucket, p))),
          );
          setUrls(fallback.filter((u): u is string => !!u));
        });
    } catch {
      setUrls([]);
    }
  }, [bucket, pathKey, paths]);

  return urls;
}

export function useSignedUrl(bucket: string, path: string | null | undefined) {
  const urls = useSignedUrls(bucket, path ? [path] : []);
  return urls[0] ?? null;
}
