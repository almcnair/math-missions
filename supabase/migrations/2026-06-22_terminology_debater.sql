-- Terminology decision (Austin, 2026-06-22): always call them "Debaters",
-- never "Cadets". The handle_new_user trigger used 'Cadet' as a fallback
-- display_name when Google didn't provide a name. Re-create it with 'Debater'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      'Debater'
    ),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
