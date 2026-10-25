alter table public.promotion_redemptions
  drop constraint if exists promotion_redemptions_promotion_id_fkey;

alter table public.promotion_redemptions
  alter column promotion_id drop not null;

alter table public.promotion_redemptions
  add constraint promotion_redemptions_promotion_id_fkey
  foreign key (promotion_id)
  references public.promotions (id)
  on delete set null;
