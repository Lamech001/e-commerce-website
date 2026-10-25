alter table public.orders
  add column if not exists access_token_hash text;

drop function public.place_guest_order(jsonb, jsonb, text, text);

create function public.place_guest_order(
  p_customer jsonb,
  p_items jsonb,
  p_access_token text,
  p_promotion_code text default null,
  p_delivery_zone text default 'CBD'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_promotion public.promotions%rowtype;
begin
  if coalesce(jsonb_typeof(p_customer), '') <> 'object'
    or coalesce(trim(p_customer->>'fullName'), '') = ''
    or coalesce(trim(p_customer->>'email'), '') = ''
    or coalesce(trim(p_customer->>'phone'), '') = ''
    or coalesce(trim(p_customer->>'address'), '') = ''
    or coalesce(trim(p_customer->>'city'), '') = '' then
    raise exception 'Valid customer contact and delivery details are required.';
  end if;
  if coalesce(length(p_access_token), 0) < 32 then
    raise exception 'A valid order access token is required.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Order items must be provided as an array.';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required.';
  end if;

  insert into public.customers (email, full_name, phone, address, city, postcode)
  values (
    lower(trim(p_customer->>'email')),
    trim(p_customer->>'fullName'),
    trim(p_customer->>'phone'),
    trim(p_customer->>'address'),
    trim(p_customer->>'city'),
    nullif(trim(p_customer->>'postcode'), '')
  )
  on conflict (email) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    address = excluded.address,
    city = excluded.city,
    postcode = excluded.postcode,
    updated_at = now()
  returning id into v_customer_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item->>'productId', '') !~ '^[0-9]+$'
      or coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Order item identifiers and quantities must be positive integers.';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 100 then
      raise exception 'Order item quantities must be between 1 and 100.';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'productId')::bigint and is_active
    for update;
    if not found then
      raise exception 'A product in this order is no longer available.';
    end if;
    if v_product.stock < v_quantity then
      raise exception 'Insufficient stock for product %.', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
    update public.products
    set stock = stock - v_quantity,
        units_sold = units_sold + v_quantity,
        updated_at = now()
    where id = v_product.id;
  end loop;

  if p_promotion_code is not null and trim(p_promotion_code) <> '' then
    select * into v_promotion
    from public.promotions
    where code = upper(trim(p_promotion_code))
      and is_active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
      and (usage_limit is null or usage_count < usage_limit)
    for update;
    if not found then
      raise exception 'The promotion code is invalid, expired, or fully redeemed.';
    end if;
    if v_subtotal < v_promotion.minimum_subtotal then
      raise exception 'The order does not meet the minimum subtotal for this promotion.';
    end if;
    if v_promotion.discount_type = 'percentage' then
      v_discount := round(v_subtotal * v_promotion.discount_value / 100, 2);
    elsif v_promotion.discount_type = 'fixed_amount' then
      v_discount := least(v_subtotal, v_promotion.discount_value);
    end if;
    update public.promotions
    set usage_count = usage_count + 1, updated_at = now()
    where id = v_promotion.id;
  end if;

  v_order_number := 'NEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.orders (
    order_number, customer_id, subtotal, discount_amount, total,
    promotion_id, promotion_code, delivery_zone, access_token_hash
  )
  values (
    v_order_number, v_customer_id, v_subtotal, v_discount,
    greatest(v_subtotal - v_discount, 0),
    v_promotion.id, nullif(upper(trim(p_promotion_code)), ''),
    coalesce(nullif(trim(p_delivery_zone), ''), 'CBD'),
    encode(extensions.digest(p_access_token, 'sha256'), 'hex')
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.products
    where id = (v_item->>'productId')::bigint;
    v_quantity := (v_item->>'quantity')::integer;
    insert into public.order_items (
      order_id, product_id, product_name, product_sku, quantity, unit_price
    )
    values (
      v_order_id, v_product.id, v_product.name, v_product.sku,
      v_quantity, v_product.price
    );
  end loop;

  if v_promotion.id is not null then
    insert into public.promotion_redemptions (
      promotion_id, order_id, customer_id, discount_amount
    )
    values (v_promotion.id, v_order_id, v_customer_id, v_discount);
  end if;

  return jsonb_build_object(
    'orderNumber', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', greatest(v_subtotal - v_discount, 0)
  );
end;
$$;

revoke all on function public.place_guest_order(jsonb, jsonb, text, text, text) from public;
grant execute on function public.place_guest_order(jsonb, jsonb, text, text, text) to anon, authenticated;

create or replace function public.get_customer_orders(
  p_email text,
  p_access_token text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.order_number,
        'customer', c.full_name,
        'email', c.email,
        'phone', c.phone,
        'date', to_char(o.created_at at time zone 'UTC', 'DD Mon YYYY'),
        'createdAt', o.created_at,
        'total', o.total,
        'items', coalesce(items.item_count, 0),
        'status', o.status,
        'payment', o.payment_status,
        'products', coalesce(items.product_names, '[]'::jsonb),
        'image', coalesce(items.first_image, ''),
        'statusColor', case o.status
          when 'Delivered' then '#16a34a'
          when 'Shipped' then '#2563eb'
          when 'Processing' then '#d97706'
          when 'Cancelled' then '#dc2626'
          else '#d97706'
        end,
        'lineItems', coalesce(items.line_items, '[]'::jsonb)
      )
      order by o.created_at desc
    ),
    '[]'::jsonb
  )
  from public.orders o
  join public.customers c on c.id = o.customer_id
  left join lateral (
    select
      sum(oi.quantity)::integer as item_count,
      jsonb_agg(oi.product_name) as product_names,
      (array_agg(p.image_url order by oi.id))[1] as first_image,
      jsonb_agg(jsonb_build_object(
        'productId', oi.product_id,
        'name', oi.product_name,
        'category', coalesce(p.product_type, 'Clothing'),
        'quantity', oi.quantity,
        'unitPrice', oi.unit_price
      ) order by oi.id) as line_items
    from public.order_items oi
    left join public.products p on p.id = oi.product_id
    where oi.order_id = o.id
  ) items on true
  where lower(c.email) = lower(trim(p_email))
    and length(coalesce(p_access_token, '')) >= 32
    and o.access_token_hash = encode(extensions.digest(p_access_token, 'sha256'), 'hex');
$$;

revoke all on function public.get_customer_orders(text, text) from public;
grant execute on function public.get_customer_orders(text, text) to anon, authenticated;

create or replace function public.cancel_customer_order(
  p_email text,
  p_access_token text,
  p_order_number text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if length(coalesce(p_access_token, '')) < 32 then
    raise exception 'A valid order access token is required.';
  end if;

  select o.* into v_order
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.order_number = p_order_number
    and lower(c.email) = lower(trim(p_email))
    and o.access_token_hash = encode(extensions.digest(p_access_token, 'sha256'), 'hex')
  for update of o;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_order.status <> 'Pending' then
    raise exception 'Only pending orders can be cancelled.';
  end if;

  for v_item in
    select product_id, quantity from public.order_items
    where order_id = v_order.id and product_id is not null
  loop
    update public.products
    set stock = stock + v_item.quantity,
        units_sold = greatest(0, units_sold - v_item.quantity),
        updated_at = now()
    where id = v_item.product_id;
  end loop;

  if v_order.promotion_id is not null then
    update public.promotions
    set usage_count = greatest(0, usage_count - 1), updated_at = now()
    where id = v_order.promotion_id;
    delete from public.promotion_redemptions where order_id = v_order.id;
  end if;

  update public.orders
  set status = 'Cancelled', updated_at = now()
  where id = v_order.id;
end;
$$;

revoke all on function public.cancel_customer_order(text, text, text) from public;
grant execute on function public.cancel_customer_order(text, text, text) to anon, authenticated;
