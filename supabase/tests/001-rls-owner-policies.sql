begin;
select plan(7);

select tests.create_supabase_user('owner', 'owner@example.com');
select tests.create_supabase_user('other', 'other@example.com');

select tests.authenticate_as_service_role();
insert into profiles (id) values (tests.get_supabase_uid('owner'));
insert into profiles (id) values (tests.get_supabase_uid('other'));
select tests.clear_authentication();

select tests.authenticate_as('owner');

select lives_ok(
  $$insert into billings (user_id, stripe_customer_id)
    values (auth.uid(), 'cus_owner')$$,
  'Owner can insert own billing row'
);

select results_eq(
  $$select count(*) from billings where user_id = auth.uid()$$,
  array[1::bigint],
  'Owner can view own billing row'
);

select tests.clear_authentication();
select tests.authenticate_as('other');

select results_eq(
  $$select count(*) from billings$$,
  array[0::bigint],
  'Other user cannot view owner billing'
);

select throws_ok(
  $$insert into billings (user_id, stripe_customer_id)
    values (tests.get_supabase_uid('owner'), 'cus_other')$$,
  '42501',
  null,
  'Cannot insert billing for another user'
);

select tests.clear_authentication();
select tests.authenticate_as_service_role();

select lives_ok(
  $$insert into billings (user_id, stripe_customer_id)
    values (tests.get_supabase_uid('other'), 'cus_service')$$,
  'Service role bypasses owner RLS'
);

select results_eq(
  $$select count(*) from billings$$,
  array[2::bigint],
  'Service role can view all billings'
);

select tests.rls_enabled('public');

select * from finish();
rollback;
