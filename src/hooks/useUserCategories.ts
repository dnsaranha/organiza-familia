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
  keywords: string[] | null;
}

export const useUserCategories = () => {
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const cacheKey = user ? `user_categories_${user.id}_${scope}` : null;

  // Initialize with cached categories if available to avoid empty states during network blips
  const [userCategories, setUserCategories] = useState<UserCategory[]>(() => {
    if (cacheKey) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async (retryCount = 0) => {
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

      const categories = (data as UserCategory[]) || [];
      setUserCategories(categories);
      
      // Cache successful response
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(categories));
        } catch {
          // ignore storage quota errors
        }
      }
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes("Failed to fetch") ||
        err?.name === "TypeError" ||
        err?.message?.includes("aborted") ||
        err?.message?.includes("NetworkError");

      if (isNetworkError) {
        // Mild warning for transient connection drops instead of fatal applet error
        console.warn("Network offline or busy while loading categories. Using cached data.");
        // Retry once after 2.5s if retryCount is 0
        if (retryCount < 2) {
          setTimeout(() => {
            fetchCategories(retryCount + 1);
          }, 2500);
        }
      } else {
        console.error("Error fetching user categories:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, scope, cacheKey]);

  useEffect(() => {
    fetchCategories();

    // Re-fetch when device regains connectivity
    const handleOnline = () => {
      fetchCategories();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
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
    
    return combined.sort((a, b) => a.localeCompare(b));
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
    
    return combined.sort((a, b) => a.localeCompare(b));
  }, [userCategories]);

  return {
    userCategories,
    loading,
    refetch: fetchCategories,
    getAllIncomeCategories,
    getAllExpenseCategories,
  };
};
