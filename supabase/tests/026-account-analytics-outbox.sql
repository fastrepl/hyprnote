begin;
select plan(16);

create temporary table account_analytics_test_users (
  kind text primary key,
  id uuid not null,
  created_at timestamptz not null
);

insert into account_analytics_test_users (kind, id, created_at)
values
  (
    'account',
    gen_random_uuid(),
    '2026-07-01 12:00:00+00'::timestamptz
  ),
  (
    'anonymous',
    gen_random_uuid(),
    '2026-07-01 13:00:00+00'::timestamptz
  );

insert into auth.users (
  id,
  email,
  raw_user_meta_data,
  raw_app_meta_data,
  is_anonymous,
  created_at,
  updated_at
)
select
  id,
  kind || '@example.com',
  '{}'::jsonb,
  jsonb_build_object('provider', 'email'),
  kind = 'anonymous',
  created_at,
  created_at
from account_analytics_test_users;

select ok(
  to_regclass('private.account_analytics_outbox') is not null,
  'Account analytics outbox is private'
);

select ok(
  not has_table_privilege(
    'anon',
    'private.account_analytics_outbox',
    'SELECT'
  )
    and not has_table_privilege(
      'authenticated',
      'private.account_analytics_outbox',
      'SELECT'
    ),
  'Client roles cannot read account analytics events'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.reconcile_account_analytics_events()',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'public.reconcile_account_analytics_events()',
      'EXECUTE'
    ),
  'Only service code can reconcile account analytics'
);

select results_eq(
  $$
  select count(*)
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
    and event_name = 'account_created'
  $$,
  array[1::bigint],
  'Permanent account creation is enqueued once'
);

select results_eq(
  $$
  select count(*)
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'anonymous'
  )
  $$,
  array[0::bigint],
  'Anonymous auth users are excluded'
);

select results_eq(
  $$
  select occurred_at
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
    and event_name = 'account_created'
  $$,
  array['2026-07-01 12:00:00+00'::timestamptz],
  'Creation event keeps the source timestamp'
);

select results_eq(
  $$
  select properties ->> 'auth_provider'
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
    and event_name = 'account_created'
  $$,
  array['email'::text],
  'Creation event records the auth provider'
);

update auth.users
set email_confirmed_at = '2026-07-01 12:05:00+00'::timestamptz
where id = (
  select id from account_analytics_test_users where kind = 'account'
);

select results_eq(
  $$
  select count(*)
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
    and event_name = 'account_confirmed'
  $$,
  array[1::bigint],
  'First confirmation is enqueued'
);

update auth.users
set email_confirmed_at = email_confirmed_at + interval '1 minute'
where id = (
  select id from account_analytics_test_users where kind = 'account'
);

select results_eq(
  $$
  select count(*)
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
    and event_name = 'account_confirmed'
  $$,
  array[1::bigint],
  'Later auth updates do not duplicate confirmation'
);

select public.reconcile_account_analytics_events();
select public.reconcile_account_analytics_events();

select results_eq(
  $$
  select count(*)
  from private.account_analytics_outbox
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
  $$,
  array[2::bigint],
  'Reconciliation is idempotent'
);

create temporary table account_analytics_test_lease (
  id uuid primary key
);

insert into account_analytics_test_lease (id)
values (gen_random_uuid());

select results_eq(
  $$
  select count(*)
  from public.claim_account_analytics_events(
    (select id from account_analytics_test_lease),
    500,
    300
  )
  where user_id = (
    select id from account_analytics_test_users where kind = 'account'
  )
  $$,
  array[2::bigint],
  'Pending account events can be leased'
);

select results_eq(
  $$
  select public.complete_account_analytics_events(
    (select id from account_analytics_test_lease),
    array(
      select id
      from private.account_analytics_outbox
      where user_id = (
        select id from account_analytics_test_users where kind = 'account'
      )
    )
  )
  $$,
  array[2],
  'Leased events can be completed'
);

insert into account_analytics_test_users (kind, id, created_at) values
  ('delivered_boundary', gen_random_uuid(), '2026-09-05 08:21:56.481221Z'),
  ('missing', gen_random_uuid(), '2026-09-05 08:22:00Z');
insert into auth.users (id, email, created_at, email_confirmed_at)
select id, kind || '@example.com', created_at,
  case when kind = 'delivered_boundary'
    then '2026-09-05 08:21:56.534471Z'::timestamptz
    else '2026-09-05 08:22:01Z'::timestamptz
  end
from account_analytics_test_users where kind in ('delivered_boundary', 'missing');

-- The privacy migration erased these queue records, including delivery markers.
delete from private.account_analytics_outbox
where user_id in (select id from account_analytics_test_users
  where kind in ('delivered_boundary', 'missing'));
select public.reconcile_account_analytics_events();
select public.reconcile_account_analytics_events();

select is((select count(*) from private.account_analytics_outbox
  where user_id = (select id from account_analytics_test_users where kind = 'delivered_boundary')),
  0::bigint, 'Reconciliation does not replay the last delivered events');
select is((select count(*) from private.account_analytics_outbox
  where user_id = (select id from account_analytics_test_users where kind = 'missing')),
  2::bigint, 'Repeated reconciliation backfills each missing event once');
select results_eq(
  $$select event_name, occurred_at from private.account_analytics_outbox
    where user_id = (select id from account_analytics_test_users where kind = 'missing')
    order by event_name$$,
  $$values ('account_confirmed'::text, '2026-09-05 08:22:01Z'::timestamptz),
    ('account_created'::text, '2026-09-05 08:22:00Z'::timestamptz)$$,
  'Backfill preserves exact source timestamps');
select ok((select bool_and(historical) from private.account_analytics_outbox
  where user_id = (select id from account_analytics_test_users where kind = 'missing')),
  'Backfilled events use historical ingestion');

select * from finish();
rollback;
