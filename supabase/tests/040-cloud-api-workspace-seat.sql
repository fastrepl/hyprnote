begin;
select plan(7);

select tests.create_supabase_user('seat_cloud_owner', 'seat-cloud-owner@example.com');
select tests.create_supabase_user('seat_cloud_member', 'seat-cloud-member@example.com');

create temporary table cloud_seat_test_state (
  name text primary key,
  workspace_id uuid,
  invitation_id uuid,
  invite_token text
);

grant all on cloud_seat_test_state to authenticated, service_role;

reset role;

update auth.users
set email_confirmed_at = now()
where id in (
  tests.get_supabase_uid('seat_cloud_owner'),
  tests.get_supabase_uid('seat_cloud_member')
);

select tests.authenticate_as('seat_cloud_owner');

select lives_ok(
  $$
    insert into cloud_seat_test_state (name, workspace_id)
    select 'hq', workspace_id from public.create_workspace('Cloud seat HQ')
  $$,
  'The owner creates a workspace'
);

select tests.clear_authentication();
reset role;

select tests.enable_workspace_plan(
  (select workspace_id from cloud_seat_test_state where name = 'hq')
);

select tests.authenticate_as('seat_cloud_owner');

select lives_ok(
  $$
    insert into cloud_seat_test_state (name, invitation_id, invite_token)
    select 'member_invite', invitation_id, invite_token
    from public.create_workspace_invitation(
      (select workspace_id from cloud_seat_test_state where name = 'hq'),
      'seat-cloud-member@example.com'
    )
  $$,
  'The paid workspace invites a member'
);

select tests.clear_authentication();
select tests.authenticate_as('seat_cloud_member');

select lives_ok(
  $$
    select *
    from public.accept_workspace_invitation(
      (select invitation_id from cloud_seat_test_state where name = 'member_invite'),
      (select invite_token from cloud_seat_test_state where name = 'member_invite')
    )
  $$,
  'A free account joins the paid workspace'
);

select tests.clear_authentication();
select tests.authenticate_as_service_role();

select results_eq(
  format(
    $$
      select status
      from public.verify_cloud_api_user(%L::uuid)
    $$,
    tests.get_supabase_uid('seat_cloud_member')
  ),
  array['cloud_api_not_enabled'::text],
  'A member covered by a workspace seat has Pro for the Cloud API before opting in'
);

select results_eq(
  format(
    $$
      select enabled
      from public.set_cloud_api_enabled(%L::uuid, true)
    $$,
    tests.get_supabase_uid('seat_cloud_member')
  ),
  array[true],
  'A member covered by a workspace seat can enable Cloud API & Connectors'
);

select results_eq(
  format(
    $$
      select status
      from public.verify_cloud_api_user(%L::uuid)
    $$,
    tests.get_supabase_uid('seat_cloud_member')
  ),
  array['ok'::text],
  'An opted-in member covered by a workspace seat verifies for OAuth access'
);

select tests.clear_authentication();
reset role;

delete from stripe.active_entitlements
where lookup_key = 'hyprnote_pro'
  and customer = (
    select stripe_customer_id
    from public.workspaces
    where id = (select workspace_id from cloud_seat_test_state where name = 'hq')
  );

select tests.authenticate_as_service_role();

select results_eq(
  format(
    $$
      select status
      from public.verify_cloud_api_user(%L::uuid)
    $$,
    tests.get_supabase_uid('seat_cloud_member')
  ),
  array['subscription_required'::text],
  'Losing the workspace Pro entitlement revokes Cloud API access'
);

select * from finish();
rollback;
