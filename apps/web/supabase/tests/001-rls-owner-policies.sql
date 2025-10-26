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
  $$insert into humans (user_id, name, email, org_id) values (auth.uid(), 'Owner Human', 'owner@acme.com', gen_random_uuid())$$,
  'Owner can insert own humans row'
);

select results_eq(
  $$select count(*) from humans where user_id = auth.uid()$$,
  array[1::bigint],
  'Owner can view own humans row'
);

select tests.clear_authentication();
select tests.authenticate_as('other');

select results_eq(
  $$select count(*) from humans$$,
  array[0::bigint],
  'Other user cannot view owner humans'
);

select throws_ok(
  $$insert into humans (user_id, name, email, org_id) values (tests.get_supabase_uid('owner'), 'Other Human', 'other@acme.com', gen_random_uuid())$$,
  '42501',
  null,
  'Cannot insert for another user'
);

select tests.clear_authentication();
select tests.authenticate_as_service_role();

select lives_ok(
  $$insert into humans (user_id, name, email, org_id) values (tests.get_supabase_uid('owner'), 'Service Human', 'svc@acme.com', gen_random_uuid())$$,
  'Service role bypasses owner RLS'
);

select results_eq(
  $$select count(*) from humans$$,
  array[2::bigint],
  'Service role can view all humans'
);

select tests.rls_enabled('public');

select * from finish();
rollback;
