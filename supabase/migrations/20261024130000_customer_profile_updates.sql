create or replace function public.update_customer_profile(
  p_email text,
  p_access_token text,
  p_customer jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_email text;
begin
  if coalesce(length(p_access_token), 0) < 32 then
    raise exception 'A valid order access token is required.';
  end if;

  if coalesce(jsonb_typeof(p_customer), '') <> 'object'
    or coalesce(trim(p_customer->>'fullName'), '') = ''
    or coalesce(trim(p_customer->>'email'), '') = ''
    or coalesce(trim(p_customer->>'phone'), '') = ''
    or coalesce(trim(p_customer->>'address'), '') = ''
    or coalesce(trim(p_customer->>'city'), '') = '' then
    raise exception 'Name, email, phone, address, and city are required.';
  end if;

  v_email := lower(trim(p_customer->>'email'));

  update public.customers c
  set email = v_email,
      full_name = trim(p_customer->>'fullName'),
      phone = trim(p_customer->>'phone'),
      address = trim(p_customer->>'address'),
      city = trim(p_customer->>'city'),
      postcode = nullif(trim(p_customer->>'postcode'), ''),
      updated_at = now()
  where lower(c.email) = lower(trim(p_email))
    and exists (
      select 1
      from public.orders o
      where o.customer_id = c.id
        and o.access_token_hash = encode(
          extensions.digest(p_access_token, 'sha256'),
          'hex'
        )
    )
  returning c.id into v_customer_id;

  if not found then
    raise exception 'Customer profile not found or order access could not be verified.';
  end if;
end;
$$;

revoke all on function public.update_customer_profile(text, text, jsonb) from public;
grant execute on function public.update_customer_profile(text, text, jsonb) to anon, authenticated;
