create or replace function public.save_trial_with_ingredients(input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payload alias for $1;
  actor_id uuid;
  allowed_ingredient_keys text[] := array[
    'category',
    'name',
    'amount',
    'unit',
    'timing',
    'display_order'
  ];
  allowed_top_keys text[] := array[
    'id',
    'research_line_id',
    'parent_trial_id',
    'title',
    'brewed_at',
    'rating',
    'brewing_time_minutes',
    'boil_count',
    'strainer',
    'note',
    'next_idea',
    'ingredients'
  ];
  ingredient jsonb;
  ingredient_amount numeric(8, 2);
  ingredient_category text;
  ingredient_display_order integer;
  ingredient_index integer := 0;
  ingredient_name text;
  ingredient_timing text;
  ingredient_unit text;
  invalid_keys text[];
  line_archived_at timestamptz;
  target_boil_count smallint;
  target_brewed_at timestamptz;
  target_brewing_time_minutes numeric(6, 2);
  target_next_idea text;
  target_note text;
  target_parent_trial_id uuid;
  target_rating smallint;
  target_research_line_id uuid;
  target_strainer text;
  target_title text;
  target_trial_id uuid;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial auth required',
      hint = 'CHAI_TRIAL_AUTH_REQUIRED';
  end if;

  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'trial input validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  select array_agg(key order by key)
  into invalid_keys
  from jsonb_object_keys(payload) as keys(key)
  where not (key = any(allowed_top_keys));

  if invalid_keys is not null then
    raise exception using
      errcode = 'P0001',
      message = 'trial input has unknown keys',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  if payload ? 'id' and nullif(payload ->> 'id', '') is not null then
    target_trial_id := (payload ->> 'id')::uuid;
  end if;

  if nullif(payload ->> 'research_line_id', '') is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial research line is required',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;
  target_research_line_id := (payload ->> 'research_line_id')::uuid;

  if payload ? 'parent_trial_id'
    and nullif(payload ->> 'parent_trial_id', '') is not null then
    target_parent_trial_id := (payload ->> 'parent_trial_id')::uuid;
  end if;

  target_title := btrim(coalesce(payload ->> 'title', ''));
  if char_length(target_title) not between 1 and 80 then
    raise exception using
      errcode = 'P0001',
      message = 'trial title validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  if nullif(payload ->> 'brewed_at', '') is null then
    raise exception using
      errcode = 'P0001',
      message = 'trial brewed_at is required',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;
  target_brewed_at := (payload ->> 'brewed_at')::timestamptz;

  target_rating := (payload ->> 'rating')::smallint;
  if target_rating is null or target_rating not between 1 and 5 then
    raise exception using
      errcode = 'P0001',
      message = 'trial rating validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  if payload ? 'brewing_time_minutes'
    and payload ->> 'brewing_time_minutes' is not null then
    target_brewing_time_minutes := (payload ->> 'brewing_time_minutes')::numeric(6, 2);
    if target_brewing_time_minutes < 0 then
      raise exception using
        errcode = 'P0001',
        message = 'trial brewing time validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;
  end if;

  if payload ? 'boil_count' and payload ->> 'boil_count' is not null then
    target_boil_count := (payload ->> 'boil_count')::smallint;
    if target_boil_count not between 0 and 20 then
      raise exception using
        errcode = 'P0001',
        message = 'trial boil count validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;
  end if;

  target_strainer := nullif(btrim(coalesce(payload ->> 'strainer', '')), '');
  if target_strainer is not null and char_length(target_strainer) > 80 then
    raise exception using
      errcode = 'P0001',
      message = 'trial strainer validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  target_note := btrim(coalesce(payload ->> 'note', ''));
  if char_length(target_note) not between 1 and 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'trial note validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  target_next_idea := btrim(coalesce(payload ->> 'next_idea', ''));
  if char_length(target_next_idea) not between 1 and 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'trial next idea validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  if not (payload ? 'ingredients')
    or jsonb_typeof(payload -> 'ingredients') <> 'array'
    or jsonb_array_length(payload -> 'ingredients') < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'trial ingredients are required',
      hint = 'CHAI_TRIAL_VALIDATION';
  end if;

  for ingredient in
    select value
    from jsonb_array_elements(payload -> 'ingredients') as item(value)
  loop
    if jsonb_typeof(ingredient) <> 'object' then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    select array_agg(key order by key)
    into invalid_keys
    from jsonb_object_keys(ingredient) as keys(key)
    where not (key = any(allowed_ingredient_keys));

    if invalid_keys is not null then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient has unknown keys',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    ingredient_category := ingredient ->> 'category';
    if ingredient_category not in ('tea', 'water', 'milk', 'sweetener', 'spice', 'other') then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient category validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    ingredient_name := btrim(coalesce(ingredient ->> 'name', ''));
    if char_length(ingredient_name) not between 1 and 80 then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient name validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    if ingredient ? 'amount' and ingredient ->> 'amount' is not null then
      ingredient_amount := (ingredient ->> 'amount')::numeric(8, 2);
      if ingredient_amount < 0 then
        raise exception using
          errcode = 'P0001',
          message = 'trial ingredient amount validation failed',
          hint = 'CHAI_TRIAL_VALIDATION';
      end if;
    end if;

    ingredient_unit := nullif(btrim(coalesce(ingredient ->> 'unit', '')), '');
    if ingredient_unit is not null and char_length(ingredient_unit) > 16 then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient unit validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    ingredient_timing := nullif(btrim(coalesce(ingredient ->> 'timing', '')), '');
    if ingredient_timing is not null and char_length(ingredient_timing) > 80 then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient timing validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    ingredient_display_order := coalesce(
      nullif(ingredient ->> 'display_order', '')::integer,
      ingredient_index
    );
    if ingredient_display_order < 0 then
      raise exception using
        errcode = 'P0001',
        message = 'trial ingredient display order validation failed',
        hint = 'CHAI_TRIAL_VALIDATION';
    end if;

    ingredient_index := ingredient_index + 1;
  end loop;

  select archived_at
  into line_archived_at
  from public.research_lines
  where id = target_research_line_id
    and user_id = actor_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'trial research line not found',
      hint = 'CHAI_TRIAL_NOT_FOUND';
  end if;

  if line_archived_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'trial research line archived',
      hint = 'CHAI_TRIAL_CONFLICT';
  end if;

  if target_trial_id is not null then
    if not exists (
      select 1
      from public.trials
      where id = target_trial_id
        and user_id = actor_id
        and deleted_at is null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'trial not found',
        hint = 'CHAI_TRIAL_NOT_FOUND';
    end if;
  end if;

  if target_parent_trial_id is not null then
    if target_trial_id is not null and target_parent_trial_id = target_trial_id then
      raise exception using
        errcode = 'P0001',
        message = 'trial parent cycle',
        hint = 'CHAI_TRIAL_CONFLICT';
    end if;

    if not exists (
      select 1
      from public.trials
      where id = target_parent_trial_id
        and user_id = actor_id
        and deleted_at is null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'trial parent not found',
        hint = 'CHAI_TRIAL_NOT_FOUND';
    end if;

    if target_trial_id is not null and exists (
      with recursive ancestors as (
        select id, parent_trial_id
        from public.trials
        where id = target_parent_trial_id
          and user_id = actor_id
          and deleted_at is null
        union all
        select parent.id, parent.parent_trial_id
        from public.trials as parent
        join ancestors
          on parent.id = ancestors.parent_trial_id
        where parent.user_id = actor_id
          and parent.deleted_at is null
      )
      select 1
      from ancestors
      where id = target_trial_id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'trial parent cycle',
        hint = 'CHAI_TRIAL_CONFLICT';
    end if;
  end if;

  if target_trial_id is null then
    insert into public.trials (
      user_id,
      research_line_id,
      parent_trial_id,
      title,
      brewed_at,
      rating,
      brewing_time_minutes,
      boil_count,
      strainer,
      note,
      next_idea
    )
    values (
      actor_id,
      target_research_line_id,
      target_parent_trial_id,
      target_title,
      target_brewed_at,
      target_rating,
      target_brewing_time_minutes,
      target_boil_count,
      target_strainer,
      target_note,
      target_next_idea
    )
    returning id into target_trial_id;
  else
    update public.trials
    set research_line_id = target_research_line_id,
        parent_trial_id = target_parent_trial_id,
        title = target_title,
        brewed_at = target_brewed_at,
        rating = target_rating,
        brewing_time_minutes = target_brewing_time_minutes,
        boil_count = target_boil_count,
        strainer = target_strainer,
        note = target_note,
        next_idea = target_next_idea,
        updated_at = now()
    where id = target_trial_id
      and user_id = actor_id
      and deleted_at is null;
  end if;

  delete from public.trial_ingredients
  where trial_id = target_trial_id;

  ingredient_index := 0;
  for ingredient in
    select value
    from jsonb_array_elements(payload -> 'ingredients') as item(value)
  loop
    ingredient_category := ingredient ->> 'category';
    ingredient_name := btrim(coalesce(ingredient ->> 'name', ''));

    ingredient_amount := null;
    if ingredient ? 'amount' and ingredient ->> 'amount' is not null then
      ingredient_amount := (ingredient ->> 'amount')::numeric(8, 2);
    end if;

    ingredient_unit := nullif(btrim(coalesce(ingredient ->> 'unit', '')), '');
    ingredient_timing := nullif(btrim(coalesce(ingredient ->> 'timing', '')), '');
    ingredient_display_order := coalesce(
      nullif(ingredient ->> 'display_order', '')::integer,
      ingredient_index
    );

    insert into public.trial_ingredients (
      trial_id,
      category,
      name,
      amount,
      unit,
      timing,
      display_order
    )
    values (
      target_trial_id,
      ingredient_category,
      ingredient_name,
      ingredient_amount,
      ingredient_unit,
      ingredient_timing,
      ingredient_display_order
    );

    ingredient_index := ingredient_index + 1;
  end loop;

  return target_trial_id;
exception
  when invalid_text_representation
    or datetime_field_overflow
    or numeric_value_out_of_range
    or check_violation then
    raise exception using
      errcode = 'P0001',
      message = 'trial input validation failed',
      hint = 'CHAI_TRIAL_VALIDATION';
end;
$$;

revoke all on function public.save_trial_with_ingredients(jsonb) from public;
grant execute on function public.save_trial_with_ingredients(jsonb) to authenticated;
