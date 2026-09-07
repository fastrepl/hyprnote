begin;
select plan(24);

truncate private.signup_analytics_outbox;
insert into auth.users (id, email, created_at, is_anonymous) values
  (gen_random_uuid(), 'before-cutover@example.com', '2026-09-05 06:59:59Z', false),
  (gen_random_uuid(), 'at-cutover@example.com', '2026-09-05 07:00:00Z', false),
  (gen_random_uuid(), null, '2026-09-05 07:34:56Z', false),
  (gen_random_uuid(), 'anonymous@example.com', '2026-09-05 07:20:00Z', true),
  (gen_random_uuid(), 'internal@ANARLOG.SO', '2026-09-05 07:20:00Z', false),
  (gen_random_uuid(), 'internal@hyprnote.com', '2026-09-05 07:20:00Z', false),
  (gen_random_uuid(), 'internal@fastrepl.com', '2026-09-05 07:20:00Z', false);

select is(
  (select count(*) from private.signup_analytics_outbox where occurred_at = '2026-09-05 07:00:00Z'),
  2::bigint,
  'Signups include the cutover boundary and exclude anonymous and internal accounts'
);
select is(
  (select count(*) from private.signup_analytics_outbox where occurred_at < '2026-09-05 07:00:00Z'),
  0::bigint,
  'Signup events cannot overlap the historical signup action before cutover'
);
select columns_are('private', 'signup_analytics_outbox', array[
  'id', 'occurred_at', 'lease_id', 'lease_expires_at'
], 'The outbox stores no account identity, metadata, or exact signup timestamp');
select ok(
  not has_table_privilege('anon', 'private.signup_analytics_outbox', 'SELECT')
  and not has_table_privilege('authenticated', 'private.signup_analytics_outbox', 'SELECT'),
  'Clients cannot read signup records'
);
select ok(
  not has_function_privilege('anon', 'public.claim_signup_analytics_events(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.claim_signup_analytics_events(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.complete_signup_analytics_events(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.complete_signup_analytics_events(uuid)', 'EXECUTE'),
  'Clients cannot claim or acknowledge analytics'
);

truncate private.signup_analytics_outbox;
select ok(has_function_privilege('supabase_auth_admin', 'private.record_anonymous_signup()', 'EXECUTE'),
  'The auth service can execute the registration trigger');
insert into auth.users (id, email, created_at) values
  ('eeeeeeee-aaaa-4444-8888-111111111111', 'new-signup@example.com', '2026-09-08 12:34:56.789Z');
select is((select count(*) from private.signup_analytics_outbox), 1::bigint,
  'A new registration queues one event');
select is((select occurred_at from private.signup_analytics_outbox),
  '2026-09-08 12:00:00Z'::timestamptz, 'Signup timestamps are rounded to the hour');
select isnt((select id from private.signup_analytics_outbox),
  'eeeeeeee-aaaa-4444-8888-111111111111'::uuid, 'Event identity differs from account identity');

update auth.users set email_confirmed_at = now()
where id = 'eeeeeeee-aaaa-4444-8888-111111111111';
select is((select count(*) from private.signup_analytics_outbox), 1::bigint,
  'Confirmation and subsequent account updates do not count as new signups');
insert into private.account_deletion_jobs (
  owner_user_id, stripe_deleted_at, prefix_swept_at, e2ee_purged_at
) values ('eeeeeeee-aaaa-4444-8888-111111111111', now(), now(), now());
delete from auth.users where id = 'eeeeeeee-aaaa-4444-8888-111111111111';
select is((select count(*) from private.signup_analytics_outbox), 1::bigint,
  'Account deletion does not erase anonymous historical counts');

savepoint before_rolled_back_signup;
insert into auth.users (id, email, created_at) values
  (gen_random_uuid(), 'rolled-back@example.com', '2026-09-08 12:45:00Z');
rollback to savepoint before_rolled_back_signup;
select is((select count(*) from private.signup_analytics_outbox), 1::bigint,
  'Rolled-back registrations do not produce analytics');

create temporary table claimed_signups (id uuid, occurred_at timestamptz);
grant all on claimed_signups to service_role;
set local role service_role;
insert into claimed_signups select * from public.claim_signup_analytics_events(
  'aaaaaaaa-aaaa-4444-8888-111111111111');
select is((select count(*) from claimed_signups), 1::bigint,
  'The service role claims the queued signup');
select is((select count(*) from public.claim_signup_analytics_events(
  'bbbbbbbb-bbbb-4444-8888-111111111111')), 0::bigint,
  'A concurrent worker cannot claim an active lease');
select is(public.complete_signup_analytics_events('bbbbbbbb-bbbb-4444-8888-111111111111'),
  0, 'An unrelated worker cannot acknowledge delivery');
reset role;

update private.signup_analytics_outbox set lease_expires_at = now() - interval '1 minute';
select results_eq(
  $$select * from public.claim_signup_analytics_events('bbbbbbbb-bbbb-4444-8888-111111111111')$$,
  $$select * from claimed_signups$$,
  'Expired delivery retries retain the exact event ID and timestamp'
);
select is(public.complete_signup_analytics_events('aaaaaaaa-aaaa-4444-8888-111111111111'),
  0, 'The old lease cannot delete a reclaimed event');
select is(public.complete_signup_analytics_events('bbbbbbbb-bbbb-4444-8888-111111111111'),
  1, 'The current lease acknowledges delivery');
select is((select count(*) from private.signup_analytics_outbox), 0::bigint,
  'Successfully delivered records are removed');
select throws_ok($$select * from public.claim_signup_analytics_events(null)$$,
  '22023', 'invalid signup analytics lease', 'Null leases are rejected');
select throws_ok($$select public.complete_signup_analytics_events(null)$$,
  '22023', 'invalid signup analytics lease', 'Null acknowledgements are rejected');
select is((select count(*) from private.account_analytics_outbox), 0::bigint,
  'The retired identity analytics outbox stays empty');

insert into private.signup_analytics_outbox (occurred_at)
select '2026-09-08 12:00:00Z'::timestamptz from generate_series(1, 501);
select is((select count(*) from public.claim_signup_analytics_events(
  'aaaaaaaa-aaaa-4444-8888-111111111111')), 500::bigint,
  'Backfill delivery is bounded to 500 events per request');
select is((select count(*) from public.claim_signup_analytics_events(
  'bbbbbbbb-bbbb-4444-8888-111111111111')), 1::bigint,
  'The remaining backfill can be claimed independently');

select * from finish();
rollback;
