begin;
select plan(5);

select tests.create_supabase_user('pro', 'pro@example.com');
select tests.create_supabase_user('free', 'free@example.com');

update public.profiles
set stripe_customer_id = 'cus_pro'
where id = tests.get_supabase_uid('pro');

insert into stripe.customers (id)
values ('cus_pro')
on conflict (id) do nothing;

insert into stripe.subscriptions (id, customer, status)
values ('sub_pro', 'cus_pro', 'active')
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
  'custom_access_token_hook sets is_pro=true when active subscription exists'
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

select tests.create_supabase_user('past_due', 'past_due@example.com');

update public.profiles
set stripe_customer_id = 'cus_past_due'
where id = tests.get_supabase_uid('past_due');

insert into stripe.customers (id)
values ('cus_past_due')
on conflict (id) do nothing;

insert into stripe.subscriptions (id, customer, status)
values ('sub_past_due', 'cus_past_due', 'past_due')
on conflict (id) do nothing;

select results_eq(
  $$
  select (
    public.custom_access_token_hook(
      jsonb_build_object(
        'user_id', tests.get_supabase_uid('past_due')::text,
        'claims', '{}'::jsonb
      )
    ) -> 'claims' ->> 'is_pro'
  )::boolean
  $$,
  array[false],
  'custom_access_token_hook sets is_pro=false when subscription is not active or trialing'
);

select * from finish();
rollback;
