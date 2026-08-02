-- FICTIONAL TEST DATA ONLY. Safe for local/test projects; never run against production.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
('00000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','avery@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}'),
('00000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','jordan@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}'),
('00000000-0000-4000-8000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}'),
('00000000-0000-4000-8000-000000000011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dispatcher@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}'),
('00000000-0000-4000-8000-000000000012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','technician@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}'),
('00000000-0000-4000-8000-000000000013','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unassigned-tech@example.test',crypt(gen_random_uuid()::text,gen_salt('bf')),now(),now(),now(),'{}','{}') on conflict do nothing;
insert into public.user_profiles(id,display_name) values
('00000000-0000-4000-8000-000000000001','Avery Sample — FICTIONAL'),('00000000-0000-4000-8000-000000000002','Jordan Example — FICTIONAL'),('00000000-0000-4000-8000-000000000010','Test Administrator — FICTIONAL'),('00000000-0000-4000-8000-000000000011','Test Dispatcher — FICTIONAL'),('00000000-0000-4000-8000-000000000012','Test Technician — FICTIONAL'),('00000000-0000-4000-8000-000000000013','Unassigned Test Technician — FICTIONAL');
insert into public.staff_roles(user_id,role,granted_by) values
('00000000-0000-4000-8000-000000000010','administrator','00000000-0000-4000-8000-000000000010'),('00000000-0000-4000-8000-000000000011','dispatcher','00000000-0000-4000-8000-000000000010'),('00000000-0000-4000-8000-000000000012','field_technician','00000000-0000-4000-8000-000000000010'),('00000000-0000-4000-8000-000000000013','field_technician','00000000-0000-4000-8000-000000000010');
-- Generated synchronization snapshot of src/lib/bin-cleaning-plans.ts version 2026-08-02-approved-pricing.
insert into public.service_plans values ('monthly','Monthly','2026-08-02-approved-pricing','active',true,true),('quarterly','Quarterly','2026-08-02-approved-pricing','active',true,false),('twice-yearly','Twice a Year','2026-08-02-approved-pricing','active',true,false),('one-time','One-Time Cleaning','2026-08-02-approved-pricing','active',true,false),('every-two-weeks','Every 2 Weeks','2026-08-02-approved-pricing','future',false,false);
insert into public.service_plan_versions(plan_id,catalog_version,charge_type,interval_months,base_price_cents,additional_bin_price_cents,bins_included,effective_at) values
('monthly','2026-08-02-approved-pricing','recurring',1,2000,500,1,'2026-08-02'),('quarterly','2026-08-02-approved-pricing','recurring',3,3500,500,1,'2026-08-02'),('twice-yearly','2026-08-02-approved-pricing','recurring',6,5000,1000,2,'2026-08-02'),('one-time','2026-08-02-approved-pricing','one_time',null,6000,1000,2,'2026-08-02'),('every-two-weeks','2026-08-02-approved-pricing','recurring',null,null,null,null,'2026-08-02');
insert into public.municipalities(id,name) values ('10000000-0000-4000-8000-000000000001','Test Township'),('10000000-0000-4000-8000-000000000002','Demo Village');
insert into public.customers(id,user_id,full_name,email,phone,account_status) values
('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Avery Sample — FICTIONAL','avery@example.test','555-010-1001','active'),
('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Jordan Example — FICTIONAL','jordan@example.test','555-010-1002','active'),
('20000000-0000-4000-8000-000000000003',null,'Morgan Fiction — FICTIONAL','morgan@example.test','555-010-1003','pending_review'),
('20000000-0000-4000-8000-000000000004',null,'Riley Placeholder — FICTIONAL','riley@example.test','555-010-1004','active');
insert into public.service_addresses(id,customer_id,municipality_id,line1,city,region,postal_code,normalized_address_hash,preferred_return_location,access_instructions,animal_warning) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10 Sample Street','Test Township','OH','00000','test-hash-1','Behind side gate','Use left gate','Dog may be in yard'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20 Fictional Lane','Demo Village','OH','00000','test-hash-2','Garage side','No gate',null),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','30 Mockingbird Court','Test Township','OH','00000','test-hash-3','Front walk','Call at gate','Animal status unverified'),
('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','40 Placeholder Road','Demo Village','OH','00000','test-hash-4','Side door','Ramp access',null);
insert into public.bins(service_address_id,identifier,description,dirty_this_visit) values
('30000000-0000-4000-8000-000000000001','SAMPLE-1','Gray city cart',true),
('30000000-0000-4000-8000-000000000002','DEMO-1','Gray trash cart',true),('30000000-0000-4000-8000-000000000002','DEMO-2','Blue recycling cart',true),('30000000-0000-4000-8000-000000000002','DEMO-3','Optional cart',false),('30000000-0000-4000-8000-000000000002','DEMO-4','Optional cart',true);
insert into public.customer_contact_preferences(customer_id) select id from public.customers;
insert into public.subscriptions(customer_id,service_plan_version_id,started_at) values
('20000000-0000-4000-8000-000000000001',(select id from service_plan_versions where plan_id='monthly'),'2026-08-01'),
('20000000-0000-4000-8000-000000000002',(select id from service_plan_versions where plan_id='quarterly'),'2026-08-01'),
('20000000-0000-4000-8000-000000000003',(select id from service_plan_versions where plan_id='twice-yearly'),'2026-08-01'),
('20000000-0000-4000-8000-000000000004',(select id from service_plan_versions where plan_id='one-time'),'2026-08-01');
insert into public.trash_pickup_schedules(id,service_address_id,weekday,source,verification_status,effective_from,holiday_shift_days,holiday_shift_status) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1,'staff_verified','verified','2026-08-01',0,'none'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',5,'customer_confirmed','customer_confirmed','2026-08-01',1,'test_holiday_shift'),
('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003',null,'unverified','unverified','2026-08-01',0,'none');
insert into public.cleaning_day_assignments(pickup_schedule_id,normal_weekday,pickup_date,adjusted_pickup_date,cleaning_date,review_status) values
('40000000-0000-4000-8000-000000000001',2,'2026-08-10','2026-08-10','2026-08-11','verified'),('40000000-0000-4000-8000-000000000002',6,'2026-08-14','2026-08-15','2026-08-16','pending');
insert into public.service_zones(id,municipality_id,name) values ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Fictional Zone A');
insert into public.routes(id,service_zone_id,route_date,status,dispatcher_id,technician_id) values ('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','2026-08-11','test_assigned','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012');
insert into public.route_stops(id,route_id,service_address_id,stop_order) values ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',1);
insert into public.service_visits(id,customer_id,route_stop_id,assigned_technician_id,scheduled_for,status,cleaning_confirmed,bins_returned) values
('80000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000012','2026-08-11 09:00Z','after_photo_complete',true,true),
('80000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',null,null,'2026-08-08 09:00Z','weather_delayed',false,false),
('80000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',null,null,'2026-08-06 09:00Z','customer_not_ready',false,false);
insert into public.visit_photographs(service_visit_id,kind,storage_path,uploaded_by) values ('80000000-0000-4000-8000-000000000001','before','test-only/visit-1-before-placeholder.jpg','00000000-0000-4000-8000-000000000012'),('80000000-0000-4000-8000-000000000001','after','test-only/visit-1-after-placeholder.jpg','00000000-0000-4000-8000-000000000012');
insert into public.service_exceptions(service_visit_id,exception_type,details,status,recorded_by) values ('80000000-0000-4000-8000-000000000003','inaccessible_bins','FICTIONAL: gate inaccessible','open','00000000-0000-4000-8000-000000000011'),('80000000-0000-4000-8000-000000000003','contamination_refusal','FICTIONAL: prohibited contamination documented','open','00000000-0000-4000-8000-000000000011');
insert into public.referral_codes(id,customer_id,code) values ('90000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','ADS-7K9M2Q4X');
insert into public.referral_relationships(id,referral_code_id,referrer_customer_id,referred_customer_id,referred_address_hash,status,hold_until,rejection_reason) values
('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','test-hash-2','qualified','2026-08-01',null),
('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','test-hash-3','pending_first_service',null,null);
insert into public.referral_credits(customer_id,referral_relationship_id,amount_cents,remaining_cents,status,earned_at,expires_at) values ('20000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',1000,1000,'issued','2026-08-01','2027-08-01');
insert into public.customer_notes(customer_id,body,created_by) values
('20000000-0000-4000-8000-000000000001','FICTIONAL VALID REFERRAL scenario.','00000000-0000-4000-8000-000000000010'),
('20000000-0000-4000-8000-000000000002','FICTIONAL INVALID REFERRAL scenario rejected during validation.','00000000-0000-4000-8000-000000000010'),
('20000000-0000-4000-8000-000000000003','FICTIONAL SELF-REFERRAL and DUPLICATE-ADDRESS attempts rejected before persistence.','00000000-0000-4000-8000-000000000010');
