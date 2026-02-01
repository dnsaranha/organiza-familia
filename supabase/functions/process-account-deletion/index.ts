
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { deletion_request_id, email, user_id } = await req.json();

    if (!deletion_request_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetUserId = user_id;
    if (!targetUserId) {
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (userError || !user) {
        await supabase
          .from("account_deletion_requests")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", deletion_request_id);
        return new Response(
          JSON.stringify({ message: "Deletion request processed (user not found)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = user.id;
    }

    // 1. Chamar a nova função RPC para deletar todos os dados do usuário de forma transacional
    const { error: rpcError } = await supabase.rpc("delete_user_data", {
      user_id_to_delete: targetUserId,
    });

    if (rpcError) {
      console.error("Error calling delete_user_data RPC:", rpcError);
      throw new Error(`Failed to delete user data: ${rpcError.message}`);
    }

    // 2. Após a exclusão bem-sucedida dos dados, deletar o usuário da autenticação
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authError) {
      // Se a exclusão do usuário da autenticação falhar, isso é um problema sério
      console.error("CRITICAL: Failed to delete user from auth:", authError);
      // Dependendo da política, pode ser necessário tentar reverter ou registrar para intervenção manual
      throw new Error(`CRITICAL: User data deleted but failed to delete auth user: ${authError.message}`);
    }

    // 3. Atualizar o status da solicitação de exclusão para 'processed'
    const { error: updateError } = await supabase
      .from("account_deletion_requests")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        user_id: null, // Desvincular o user_id
      })
      .eq("id", deletion_request_id);

    if (updateError) {
      console.error("Error updating deletion request status:", updateError);
      // Mesmo que isso falhe, a exclusão principal foi bem-sucedida, então não lançamos um erro crítico.
    }

    return new Response(
      JSON.stringify({
        message: "Account successfully deleted",
        user_id: targetUserId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Unexpected error in process-account-deletion:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
