alter table public.ad_shares
  add column if not exists platform text default 'instagram-feed',
  add column if not exists brand_logo_url text;

