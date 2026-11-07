-- Synthetic integration fixture; never apply to an existing database.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table users(id uuid primary key default gen_random_uuid(), name text, email text unique, role text, line_user_id text);
create table trainer_profiles(id uuid primary key default gen_random_uuid(), user_id uuid references users, bio text);
create table trainee_profiles(id uuid primary key default gen_random_uuid(), user_id uuid unique references users);
create table trainer_trainee(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
 trainee_id uuid references trainee_profiles, status text, invite_token text, unique(trainer_id,trainee_id));
create table plans(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
 name text, price integer, sessions integer, created_at timestamptz default now());
create table bookings(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
 trainee_id uuid references trainee_profiles, scheduled_at timestamptz not null, status text, price integer, created_at timestamptz default now());
create table sales_records(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
 booking_id uuid unique references bookings, amount integer, payment_method text, paid_at timestamptz default now());
create table trainer_availability(id uuid primary key default gen_random_uuid(), trainer_id uuid references trainer_profiles,
 slot_date date, day_of_week integer, start_time time, end_time time);
