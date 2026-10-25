# Supabase setup

The storefront uses the public publishable key; database writes are restricted
by row-level security and the `place_guest_order` database function. Never put a
database password or service-role key in a `VITE_` environment variable.

1. Copy `.env.example` to `.env.local` and set the project URL and publishable
   key.
2. Apply database changes with `npx supabase db push`.
3. In **Supabase Dashboard → Authentication → Sign In / Providers**, enable
   the Email provider so added users can sign in. Keep **Allow new users to
   sign up** disabled; only manually added Auth accounts should be able to
   access Admin.
4. Create the first administrator in **Supabase Dashboard → Authentication →
   Users → Add user**.
5. Promote only that account in the Supabase SQL Editor, replacing the email:

   ```sql
   update public.profiles p
   set role = 'admin'
   from auth.users u
   where p.id = u.id
     and lower(u.email) = lower('admin@example.com');
   ```

6. Sign in to the Admin dashboard using that user's email and password.

Profiles created through Supabase Auth default to the `customer` role. An
account without an explicit `admin` role cannot access dashboard data.

Guest checkout reuses the customer record for an existing normalized email
instead of inserting a duplicate. Customer contact and delivery details are
also saved in the browser for checkout prefill and account access. Profile
changes update the database using the device's order-access token; apply the
latest migration before enabling profile editing in a deployed app.

Promotions created in the Admin dashboard are stored in `public.promotions`.
Active, in-date offers that have not reached their usage limit are shown in
the storefront announcement and as selectable codes during checkout. Customers
can enter a code manually as well; the order RPC rechecks its validity,
minimum subtotal, and usage limit before saving the order. Leave the expiry
date blank for a promotion with no expiry.

The Admin Products section loads all rows from `public.products`, including
hidden products. Admins can create and edit customer-facing product details,
hide products from the storefront, and restore hidden products. Hiding is a
soft delete so existing order history remains intact. The storefront only
loads active products.
