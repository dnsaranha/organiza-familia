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
          // Melhor tratamento de erro para preservar a mensagem original
          throw new Error(
            `Failed to process account deletion: ${error.details || error.message || "Unknown error"}`
          );
        }

        return { success: true, data };
      } catch (error) {
        console.error("Error processing account deletion:", error);
        // Relançar o erro com a mensagem mais informativa
        throw error;
      }
    },
    []
  );

  return { processAccountDeletion };
};
