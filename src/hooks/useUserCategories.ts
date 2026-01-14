import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { incomeCategories, expenseCategories } from "@/lib/budget-categories";

interface UserCategory {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  is_default: boolean;
}

export const useUserCategories = () => {
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { scope } = useBudgetScope();

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setUserCategories([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from("user_categories").select("*");

      if (scope === "personal") {
        query = query.is("group_id", null).eq("user_id", user.id);
      } else {
        query = query.or(`group_id.eq.${scope},and(group_id.is.null,user_id.eq.${user.id})`);
      }

      const { data, error } = await query.order("name");
      if (error) throw error;
      setUserCategories((data as UserCategory[]) || []);
    } catch (err) {
      console.error("Error fetching user categories:", err);
    } finally {
      setLoading(false);
    }
  }, [user, scope]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Combine default categories with user categories
  const getAllIncomeCategories = useCallback(() => {
    const userIncomeCategories = userCategories
      .filter((c) => c.type === "income")
      .map((c) => c.name);
    
    const combined = [...incomeCategories];
    userIncomeCategories.forEach((name) => {
      if (!combined.includes(name)) {
        combined.push(name);
      }
    });
    
    return combined;
  }, [userCategories]);

  const getAllExpenseCategories = useCallback(() => {
    const userExpenseCategories = userCategories
      .filter((c) => c.type === "expense")
      .map((c) => c.name);
    
    const combined = [...expenseCategories];
    userExpenseCategories.forEach((name) => {
      if (!combined.includes(name)) {
        combined.push(name);
      }
    });
    
    return combined;
  }, [userCategories]);

  return {
    userCategories,
    loading,
    refetch: fetchCategories,
    getAllIncomeCategories,
    getAllExpenseCategories,
  };
};
