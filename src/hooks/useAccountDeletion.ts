import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProcessDeletionParams {
  deletion_request_id: string;
  email: string;
  user_id?: string;
}

export const useAccountDeletion = () => {
  const processAccountDeletion = useCallback(
    async (params: ProcessDeletionParams) => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "process-account-deletion",
          {
            body: params,
          }
        );

        if (error) {
          throw new Error(error.message || "Failed to process account deletion");
        }

        return { success: true, data };
      } catch (error) {
        console.error("Error processing account deletion:", error);
        throw error;
      }
    },
    []
  );

  return { processAccountDeletion };
};
