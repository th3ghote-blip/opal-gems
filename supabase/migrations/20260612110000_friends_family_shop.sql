-- Friends & Family shop for owner off-site / informal sales.
insert into public.shops (name, hotel_name, address, active)
values ('Friends & Family', '', '', true)
on conflict do nothing;
