drop policy if exists "Anyone can create ad shares" on public.ad_shares;
drop policy if exists "Anyone can upload ad share videos" on storage.objects;

revoke insert, update, delete, truncate, references, trigger on table public.ad_shares from anon, authenticated;
grant select on table public.ad_shares to anon, authenticated;
