-- Audit trail for the read-only MCP stock server at /api/mcp.
--
-- Why: the endpoint hands a client's live stock to an outside agent (Meta Muse),
-- and Vercel runtime logs are not retained on this project, so without this
-- table there is no record of who called, when, or what they asked for.
--
-- Also records rejected calls, so a run of 'unauthorized' rows is the signal
-- that the endpoint URL has leaked and the key needs rotating.

create table if not exists public.mcp_access_log (
  id            uuid primary key default gen_random_uuid(),
  at            timestamptz not null default now(),
  tool          text not null,            -- search_stock / get_piece / list_shops
                                          -- or _initialize / _unauthorized
  arguments     jsonb,                    -- what was asked for
  result_count  integer,                  -- rows returned, where meaningful
  ok            boolean not null default true,
  error         text,
  ip            text,
  user_agent    text
);

create index if not exists mcp_access_log_at_idx   on public.mcp_access_log (at desc);
create index if not exists mcp_access_log_tool_idx on public.mcp_access_log (tool, at desc);

-- RLS on with no policies: only the service_role key (used by the route handler)
-- can read or write. Staff and anon cannot see it; the owner reads it in the
-- Supabase dashboard until there is a page for it.
alter table public.mcp_access_log enable row level security;
