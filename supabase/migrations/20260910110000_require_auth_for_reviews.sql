-- Reviews and seller rating summaries are private to authenticated users.
REVOKE SELECT ON public.perfil_vendedor_stats FROM anon;