DROP FUNCTION IF EXISTS get_user_groups();

CREATE OR REPLACE FUNCTION get_user_groups()
RETURNS SETOF family_groups
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT g.*
  FROM family_groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid();
$$;
