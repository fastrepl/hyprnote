begin;
select plan(6);

select tests.create_supabase_user('owner', 'owner@example.com');
select tests.create_supabase_user('other', 'other@example.com');

select tests.authenticate_as('owner');

select lives_ok(
  $$insert into profiles (id) values (auth.uid())$$,
  'Owner can insert own profile'
);

select results_eq(
  $$select count(*) from profiles where id = auth.uid()$$,
  array[1::bigint],
  'Owner can view own profile'
);

select tests.clear_authentication();
select tests.authenticate_as('other');

select results_eq(
  $$select count(*) from profiles$$,
  array[0::bigint],
  'Other user cannot view owner profile'
);

select throws_ok(
  $$insert into profiles (id) values (tests.get_supabase_uid('owner'))$$,
  '42501',
  null,
  'Cannot insert profile for another user'
);

select tests.clear_authentication();
select tests.authenticate_as_service_role();

select lives_ok(
  $$insert into profiles (id) values (tests.get_supabase_uid('other'))$$,
  'Service role bypasses owner RLS'
);

select results_eq(
  $$select count(*) from profiles$$,
  array[2::bigint],
  'Service role can view all profiles'
);

select * from finish();
rollback;
