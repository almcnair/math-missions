-- Fix infinite RLS recursion between classes <-> enrollments (and profiles,
-- assignments, attempts, completions, which cross-reference them).
--
-- Bug: "student reads enrolled classes" (on classes) queries enrollments,
-- while "teacher reads class enrollments" (on enrollments) queries classes.
-- Evaluating either policy re-triggers the other's RLS check -> infinite
-- recursion -> Postgres error 42P17 on any profile/class/enrollment read.
-- This silently broke /bridge for every signed-in student (profile lookup
-- returned null, page treated them as logged out).
--
-- Fix: SECURITY DEFINER helper functions run as the table owner, which is
-- exempt from RLS by default, so they read the underlying table directly
-- instead of re-entering policy evaluation. Policies now call these helpers
-- instead of joining the other table inline.

create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled_in_class(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments where class_id = p_class_id and student_id = auth.uid()
  );
$$;

create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student_id and c.teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_class_teacher(uuid)      to authenticated;
grant execute on function public.is_enrolled_in_class(uuid)  to authenticated;
grant execute on function public.is_teacher_of_student(uuid) to authenticated;

-- profiles
drop policy if exists "teacher reads class profiles" on public.profiles;
create policy "teacher reads class profiles" on public.profiles for select
  using (public.is_teacher_of_student(profiles.id));

-- classes
drop policy if exists "student reads enrolled classes" on public.classes;
create policy "student reads enrolled classes" on public.classes for select
  using (public.is_enrolled_in_class(classes.id));

-- enrollments
drop policy if exists "teacher reads class enrollments" on public.enrollments;
create policy "teacher reads class enrollments" on public.enrollments for select
  using (public.is_class_teacher(enrollments.class_id));

drop policy if exists "teacher removes student" on public.enrollments;
create policy "teacher removes student" on public.enrollments for delete
  using (public.is_class_teacher(enrollments.class_id));

-- assignments
drop policy if exists "student reads class assignments" on public.assignments;
create policy "student reads class assignments" on public.assignments for select
  using (public.is_enrolled_in_class(assignments.class_id));

drop policy if exists "teacher manages assignments" on public.assignments;
create policy "teacher manages assignments" on public.assignments for all
  using (public.is_class_teacher(assignments.class_id));

-- attempts
drop policy if exists "teacher reads class attempts" on public.attempts;
create policy "teacher reads class attempts" on public.attempts for select
  using (public.is_class_teacher(attempts.class_id));

-- completions
drop policy if exists "teacher reads class completions" on public.completions;
create policy "teacher reads class completions" on public.completions for select
  using (public.is_class_teacher(completions.class_id));
