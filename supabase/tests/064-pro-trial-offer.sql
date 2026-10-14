begin;
select plan(5);

select tests.create_supabase_user('offer_referrer', 'offer-referrer@example.com');
select tests.create_supabase_user('offer_work', 'jane@acme-offer.io');
select tests.create_supabase_user('offer_personal', 'jane.offer@gmail.com');
select tests.create_supabase_user('offer_referred', 'referred.offer@gmail.com');

update auth.users
set email_confirmed_at = now()
where id in (
  tests.get_supabase_uid('offer_work'),
  tests.get_supabase_uid('offer_personal'),
  tests.get_supabase_uid('offer_referred')
);

update public.profiles
set stripe_customer_id = 'cus_offer_referrer'
where id = tests.get_supabase_uid('offer_referrer');

insert into stripe.customers (id) values ('cus_offer_referrer');
insert into stripe.subscriptions (id, customer, status, created)
values (
  'sub_offer_referrer',
  'cus_offer_referrer',
  'active',
  extract(epoch from now())::integer
);

select ok(
  has_function_privilege('authenticated', 'public.get_pro_trial_offer()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_pro_trial_offer()', 'EXECUTE'),
  'Only authenticated users can read their trial offer'
);

select tests.authenticate_as('offer_referrer');
create temporary table offer_referral_code as
select code from public.get_or_create_referral_invites() where slot = 1;
grant select on offer_referral_code to authenticated;
select tests.clear_authentication();
reset role;

select tests.authenticate_as('offer_work');
select is(public.get_pro_trial_offer(), 'work_email', 'A custom-domain email gets the work email offer');
select tests.clear_authentication();
reset role;

select tests.authenticate_as('offer_personal');
select is(public.get_pro_trial_offer(), 'personal_email', 'A public email domain gets the personal email offer');
select tests.clear_authentication();
reset role;

select tests.authenticate_as('offer_referred');
select ok(public.claim_referral((select code from offer_referral_code)), 'The referred account claims an invite');
select is(public.get_pro_trial_offer(), 'referral', 'A referral wins over a personal email');
select tests.clear_authentication();
reset role;

select * from finish();
rollback;
