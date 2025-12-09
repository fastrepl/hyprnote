begin;
select plan(6);

select tests.create_supabase_user('pro', 'pro@example.com');
select tests.create_supabase_user('free', 'free@example.com');

update public.profiles
set stripe_customer_id = 'cus_pro'
where id = tests.get_supabase_uid('pro');

insert into stripe.customers (id)
values ('cus_pro')
on conflict (id) do nothing;

insert into stripe.active_entitlements (id, customer, lookup_key)
values ('ent_pro', 'cus_pro', 'pro')
on conflict (id) do nothing;

select results_eq(
  $$select has_table_privilege('supabase_auth_admin', 'public.profiles', 'SELECT')$$,
  array[true],
  'supabase_auth_admin has SELECT privilege on public.profiles'
);

select results_eq(
  $$select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Allow auth admin to read profiles' and 'supabase_auth_admin' = any(roles)$$,
  array[1::bigint],
  'RLS policy for supabase_auth_admin on profiles is present'
);

select results_eq(
  $$select has_table_privilege('supabase_auth_admin', 'stripe.active_entitlements', 'SELECT')$$,
  array[true],
  'supabase_auth_admin has SELECT privilege on stripe.active_entitlements'
);

select results_eq(
  $$
  select (
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', tests.get_supabase_uid('pro')::text,
        'claims', '{}'::jsonb
      )
    ) -> 'claims' ->> 'is_pro'
  )::boolean
  $$,
  array[true],
  'custom_access_token_hook sets is_pro=true when pro entitlement exists'
);

select results_eq(
  $$
  select (
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', tests.get_supabase_uid('free')::text,
        'claims', '{}'::jsonb
      )
    ) -> 'claims' ->> 'is_pro'
  )::boolean
  $$,
  array[false],
  'custom_access_token_hook sets is_pro=false when no customer id'
);

select tests.create_supabase_user('other_entitlement', 'other@example.com');

update public.profiles
set stripe_customer_id = 'cus_other'
where id = tests.get_supabase_uid('other_entitlement');

insert into stripe.customers (id)
values ('cus_other')
on conflict (id) do nothing;

insert into stripe.active_entitlements (id, customer, lookup_key)
values ('ent_other', 'cus_other', 'some_other_feature')
on conflict (id) do nothing;

select results_eq(
  $$
  select (
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', tests.get_supabase_uid('other_entitlement')::text,
        'claims', '{}'::jsonb
      )
    ) -> 'claims' ->> 'is_pro'
  )::boolean
  $$,
  array[false],
  'custom_access_token_hook sets is_pro=false when entitlement exists but lookup_key is not pro'
);

select * from finish();
rollback;
