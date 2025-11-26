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
  $$insert into transcriptions (user_id, file_name, file_size)
    values (auth.uid(), 'test.wav', 1024)$$,
  'Owner can insert own transcription'
);

select results_eq(
  $$select count(*) from transcriptions where user_id = auth.uid()$$,
  array[1::bigint],
  'Owner can view own transcription'
);

select tests.clear_authentication();
select tests.authenticate_as('other');

select results_eq(
  $$select count(*) from transcriptions$$,
  array[0::bigint],
  'Other user cannot view owner transcription'
);

select throws_ok(
  $$insert into transcriptions (user_id, file_name, file_size)
    values (tests.get_supabase_uid('owner'), 'hack.wav', 1024)$$,
  '42501',
  null,
  'Cannot insert transcription for another user'
);

select tests.clear_authentication();
select tests.authenticate_as_service_role();

select lives_ok(
  $$insert into transcriptions (user_id, file_name, file_size)
    values (tests.get_supabase_uid('other'), 'service.wav', 2048)$$,
  'Service role bypasses owner RLS'
);

select results_eq(
  $$select count(*) from transcriptions$$,
  array[2::bigint],
  'Service role can view all transcriptions'
);

select tests.rls_enabled('public');

select * from finish();
rollback;
