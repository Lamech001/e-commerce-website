create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'admin')
  on conflict (id) do update set role = 'admin';
  return new;
end;
$$;

update public.profiles
set role = 'admin'
where id in (select id from auth.users);
