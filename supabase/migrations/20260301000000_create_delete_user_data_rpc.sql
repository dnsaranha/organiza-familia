
CREATE OR REPLACE FUNCTION delete_user_data(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
-- IMPORTANTE: Executar com os privilégios do criador para poder apagar todos os dados
SECURITY DEFINER
AS $$
BEGIN
  -- A ordem de exclusão é crítica para evitar violações de chaves estrangeiras.

  -- 1. Excluir dados de tabelas que fazem referência direta ao usuário.
  DELETE FROM "public"."investment_transactions" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."scheduled_tasks" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."transactions" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."savings_goals" WHERE "user_id" = user_id_to_delete;
  -- A tabela 'budget_items' não existe, removida da exclusão.
  DELETE FROM "public"."budgets" WHERE "user_id" = user_id_to_delete;
  -- A tabela 'connected_accounts' foi renomeada para 'financial_assets'.
  DELETE FROM "public"."financial_assets" WHERE "user_id" = user_id_to_delete;
  -- A coluna 'user_id' não existe em 'subscription_permissions', usando 'id' do perfil.
  DELETE FROM "public"."subscription_permissions" WHERE "id" = user_id_to_delete;
  DELETE FROM "public"."user_preferences" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."user_categories" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."stripe_customers" WHERE "user_id" = user_id_to_delete;

  -- 2. Lidar com a lógica de grupos, que é mais complexa.
  --    As tabelas 'family_group_members' e 'family_groups' foram renomeadas para 'group_members' e 'groups'.
  DELETE FROM "public"."group_members" WHERE "group_id" IN (SELECT "id" FROM "public"."groups" WHERE "owner_id" = user_id_to_delete);
  DELETE FROM "public"."group_members" WHERE "user_id" = user_id_to_delete;
  DELETE FROM "public"."groups" WHERE "owner_id" = user_id_to_delete;

  -- 3. Desvincular as solicitações de exclusão para permitir a remoção do perfil.
  UPDATE "public"."account_deletion_requests" SET "user_id" = NULL WHERE "user_id" = user_id_to_delete;

  -- 4. Finalmente, após todas as referências terem sido removidas, excluir o perfil do usuário.
  DELETE FROM "public"."profiles" WHERE "id" = user_id_to_delete;

END;
$$;
