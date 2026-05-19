import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_TO_PLAN: Record<string, string> = {
  price_1SjoifQWn2kjGtoMCD2TLuAd: "Gratuito",
  price_1Sk1CAQWn2kjGtoM0Wlz1Xql: "Básico",
  price_1Sk1MbQWn2kjGtoMSDAU65sj: "Avançado",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller and check admin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return json({ error: "Forbidden" }, 403);
    }

    // List auth users (page size 200)
    const { data: authList, error: authErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authErr) throw authErr;

    const users = authList.users;
    const userIds = users.map((u) => u.id);

    // Profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p.full_name as string | null]),
    );

    // Stripe subscriptions -> plan
    const { data: customers } = await admin
      .from("stripe_customers")
      .select("user_id, customer_id")
      .in("user_id", userIds)
      .is("deleted_at", null);
    const customerToUser = new Map(
      (customers || []).map((c: any) => [c.customer_id, c.user_id]),
    );
    const customerIds = (customers || []).map((c: any) => c.customer_id);

    const planMap = new Map<string, string>();
    if (customerIds.length) {
      const { data: subs } = await admin
        .from("stripe_subscriptions")
        .select("customer_id, status, price_id")
        .in("customer_id", customerIds)
        .is("deleted_at", null);
      for (const s of subs || []) {
        if (!["active", "trialing"].includes((s as any).status)) continue;
        const uid = customerToUser.get((s as any).customer_id);
        if (!uid) continue;
        const label = PRICE_TO_PLAN[(s as any).price_id] || "Assinante";
        planMap.set(uid, label);
      }
    }

    // Last activity
    const { data: activity } = await admin.rpc("get_users_last_activity", {
      _user_ids: userIds,
    });
    const activityMap = new Map(
      (activity || []).map((a: any) => [a.user_id, a.last_activity_at]),
    );

    // Compose
    const result = users.map((u) => {
      const lastSignIn = u.last_sign_in_at
        ? new Date(u.last_sign_in_at).getTime()
        : 0;
      const lastActRaw = activityMap.get(u.id) as string | undefined;
      const lastAct = lastActRaw ? new Date(lastActRaw).getTime() : 0;
      const effective = Math.max(lastSignIn, lastAct);
      return {
        id: u.id,
        email: u.email || null,
        full_name: profileMap.get(u.id) || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        last_activity_at: effective > 0 ? new Date(effective).toISOString() : null,
        plan: planMap.get(u.id) || "Gratuito",
      };
    });

    result.sort((a, b) => {
      const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return tb - ta;
    });

    // Users registered today (by auth.users.created_at)
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const usersToday = users.filter(
      (u) => u.created_at && new Date(u.created_at) >= startToday,
    ).length;

    return json({ users: result, users_today: usersToday });
  } catch (e) {
    console.error("admin-list-users error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}