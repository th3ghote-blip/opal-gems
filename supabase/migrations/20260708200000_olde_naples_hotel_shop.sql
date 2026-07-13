-- New location: Olde Naples Hotel.
insert into public.shops (name, hotel_name, address, sales_tax_pct, active)
values ('Olde Naples Hotel', 'Olde Naples Hotel', '', 0, true)
on conflict do nothing;
