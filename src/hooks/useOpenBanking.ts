import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

// Tipos simplificados para a resposta da Pluggy, ajuste conforme necessário
export interface PluggyAccount {
  id: string;
  itemId: string; // ID da conexão Pluggy
  balance: number;
  currency: string;
  name: string;
  type: string;
  number: string;
  subtype: string;
  marketingName: string;
  brand?: string;
}

export interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  accountId?: string;
}

export interface PluggyInvestment {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  subtype: string;
  institution: {
    name: string;
  };
}


export const useOpenBanking = () => {
  const [accounts, setAccounts] = useState<PluggyAccount[]>([]);
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([]);
  const [investments, setInvestments] = useState<PluggyInvestment[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [userItemIds, setUserItemIds] = useState<string[]>([]);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadAccounts = useCallback(
    async (currentItemId: string) => {
      if (!currentItemId) return [];
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "pluggy-accounts",
          {
            body: { itemId: currentItemId },
          },
        );
        if (error) throw error;
        const mapped = (data?.accounts ?? []).map((acc: any) => ({
          id: acc.id,
          itemId: currentItemId, // Incluir o itemId para rastreamento
          balance: typeof acc.balance === "number" ? acc.balance : (acc.balance?.current ?? acc.balance?.available ?? 0),
          currency: acc.currencyCode ?? acc.currency ?? "BRL",
          name: acc.name ?? acc.marketingName ?? acc.institution?.name ?? "Conta",
          type: acc.type ?? acc.accountType ?? "BANK",
          number: acc.number ?? acc.accountNumber ?? "",
          subtype: acc.subtype ?? acc.accountSubType ?? "",
          marketingName: acc.marketingName ?? acc.institution?.name ?? acc.name ?? "",
          brand: acc.brand ?? acc.institution?.name,
        }));
        setAccounts(mapped);
        setConnected(true);
        return mapped;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Contas",
          description: "Não foi possível carregar suas contas da Pluggy.",
          variant: "destructive",
        });
        setConnected(false);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const loadInvestments = useCallback(
    async (currentItemId: string) => {
      if (!currentItemId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "pluggy-investments",
          {
            body: { itemId: currentItemId },
          },
        );
        if (error) throw error;
        setInvestments(data.investments);
      } catch (error) {
        toast({
          title: "Erro ao Carregar Investimentos",
          description: "Não foi possível carregar seus investimentos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const loadAllAccounts = useCallback(
    async (itemIds: string[]) => {
      if (!itemIds || itemIds.length === 0) {
        setAccounts([]);
        return [];
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          itemIds.map((id) =>
            supabase.functions.invoke("pluggy-accounts", {
              body: { itemId: id },
            }).then(response => ({ itemId: id, response }))
          ),
        );
        const merged = results.flatMap((r) => 
          (r.response.data?.accounts ?? []).map((acc: any) => ({
            id: acc.id,
            itemId: r.itemId, // Incluir o itemId para rastreamento
            balance: typeof acc.balance === "number" ? acc.balance : (acc.balance?.current ?? acc.balance?.available ?? 0),
            currency: acc.currencyCode ?? acc.currency ?? "BRL",
            name: acc.name ?? acc.marketingName ?? acc.institution?.name ?? "Conta",
            type: acc.type ?? acc.accountType ?? "BANK",
            number: acc.number ?? acc.accountNumber ?? "",
            subtype: acc.subtype ?? acc.accountSubType ?? "",
            marketingName: acc.marketingName ?? acc.institution?.name ?? acc.name ?? "",
            brand: acc.brand ?? acc.institution?.name,
          }))
        );
        setAccounts(merged);
        setConnected(true);
        return merged;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Contas",
          description: "Falha ao carregar contas conectadas.",
          variant: "destructive",
        });
        setConnected(false);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const loadAllInvestments = useCallback(
    async (itemIds: string[]) => {
      if (!itemIds || itemIds.length === 0) {
        setInvestments([]);
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.all(
          itemIds.map((id) =>
            supabase.functions.invoke("pluggy-investments", {
              body: { itemId: id },
            }),
          ),
        );
        const merged = results.flatMap((r) => r.data?.investments ?? []);
        setInvestments(merged);
      } catch (error) {
        toast({
          title: "Erro ao Carregar Investimentos",
          description: "Falha ao carregar investimentos conectados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const loadAllTransactions = useCallback(
    async (accountsToLoad: PluggyAccount[]) => {
      if (!accountsToLoad || accountsToLoad.length === 0) {
        setTransactions([]);
        return;
      }
      setLoading(true);
      try {
        const transactionPromises = accountsToLoad.map(async (account) => {
          const { data, error } = await supabase.functions.invoke(
            "pluggy-transactions",
            {
              body: { accountId: account.id },
            },
          );
          if (error) {
            console.warn(
              `Failed to load transactions for account ${account.id}`,
              error,
            );
            return [];
          }
          return (data.transactions as PluggyTransaction[]).map((t) => ({
            ...t,
            accountId: account.id,
          }));
        });

        const transactionsByAccount = await Promise.all(transactionPromises);
        const allTransactions = transactionsByAccount.flat();
        setTransactions(allTransactions);
      } catch (error) {
        toast({
          title: "Erro ao Carregar Transações",
          description: "Falha ao carregar todas as transações.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Carregar itens (connections) do banco quando o usuário autenticar
  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // 1) Novo fluxo: múltiplos connections em pluggy_items
        const { data: itemsRows, error: itemsError } = await supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", user.id);

        if (itemsError) throw itemsError;

        const ids = (itemsRows ?? []).map((r) => r.item_id);
        if (ids.length > 0) {
          setUserItemIds(ids);
          setItemId(ids[0] ?? null);
          setConnected(true);
          const [loadedAccounts] = await Promise.all([
            loadAllAccounts(ids),
            loadAllInvestments(ids),
          ]);
          if (loadedAccounts.length > 0) {
            await loadAllTransactions(loadedAccounts);
          }
          return;
        }

        // 2) Legado: único pluggy_item_id no profile
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("pluggy_item_id")
          .eq("id", user.id)
          .single();

        if (profileErr) throw profileErr;

        if (profile && profile.pluggy_item_id) {
          const currentItemId = profile.pluggy_item_id;
          setItemId(currentItemId);
          setConnected(true);
          const [loadedAccounts] = await Promise.all([
            loadAccounts(currentItemId),
            loadInvestments(currentItemId),
          ]);
          if (loadedAccounts.length > 0) {
            await loadAllTransactions(loadedAccounts);
          }
        } else {
          setConnected(false);
        }
      } catch (error) {
        // Silently fail on initial load to prevent flickering
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initiateConnection = useCallback(
    async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "pluggy-connect-token",
        );
        if (error) throw error;
        setConnectToken(data.accessToken);
      } catch (error) {
        toast({
          title: "Erro na Conexão",
          description: "Não foi possível obter o token de conexão da Pluggy.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const handleSuccess = useCallback(
    async (data: {
      item: { id: string; institution?: { name?: string } };
    }) => {
      if (!user) {
        toast({
          title: "Usuário não autenticado",
          description: "Você precisa estar logado para conectar uma conta.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const newItemId = data.item.id;

        // 1) Persistir em pluggy_items (multi-conexões)
        const { error: insertErr } = await supabase.from("pluggy_items").insert({
          user_id: user.id,
          item_id: newItemId,
          institution_name: data.item?.institution?.name ?? null,
        });
        if (insertErr) throw insertErr;

        // 2) Atualizar campo legado para compatibilidade
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ pluggy_item_id: newItemId })
          .eq("id", user.id);
        if (profileErr) throw profileErr;

        // 3) Recarregar itens e dados consolidados
        const { data: itemsRows } = await supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", user.id);
        const ids = (itemsRows ?? []).map((r) => r.item_id);
        setUserItemIds(ids);
        setItemId(newItemId);
        setConnected(true);

        const [loadedAccounts] = await Promise.all([
          loadAllAccounts(ids.length ? ids : [newItemId]),
          loadAllInvestments(ids.length ? ids : [newItemId]),
        ]);
        if (loadedAccounts.length > 0) {
          await loadAllTransactions(loadedAccounts);
        }

        toast({
          title: "Conexão Bem-sucedida!",
          description: "Sua conta foi conectada e sincronizada.",
        });
      } catch (error) {
        toast({
          title: "Erro ao Processar Conexão",
          description:
            "Conexão criada, mas houve erro ao salvar/carregar os dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setConnectToken(null); // Fechar o widget
      }
    },
    [
      toast,
      user,
      supabase,
      loadAllAccounts,
      loadAllInvestments,
      loadAllTransactions,
    ],
  );

  const disconnect = useCallback(
    async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Buscar todas as conexões do usuário
        const { data: itemsRows } = await supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", user.id);
        const ids = (itemsRows ?? []).map((r) => r.item_id);

        // Deletar todos os items na Pluggy em paralelo
        await Promise.all(
          ids.map((id) =>
            supabase.functions.invoke("pluggy-delete-item", {
              body: { itemId: id },
            }),
          ),
        );

        // Remover registros do banco
        await supabase.from("pluggy_items").delete().eq("user_id", user.id);
        await supabase
          .from("profiles")
          .update({ pluggy_item_id: null })
          .eq("id", user.id);

        // Limpar o estado local
        setUserItemIds([]);
        setItemId(null);
        setConnected(false);
        setAccounts([]);
        setTransactions([]);
        setInvestments([]);
        toast({
          title: "Desconectado",
          description: "Todas as conexões com a Pluggy foram removidas.",
        });
      } catch (error) {
        toast({
          title: "Erro ao Desconectar",
          description: "Não foi possível remover sua(s) conexão(ões).",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, toast],
  );

  // Função para recarregar todos os dados  
  const refreshAllData = useCallback(async () => {
    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Você precisa estar logado para atualizar os dados.",
        variant: "destructive",
      });
      return;
    }

    // Usar os IDs mais atuais da base de dados
    const { data: itemsRows } = await supabase
      .from("pluggy_items")
      .select("item_id")
      .eq("user_id", user.id);
    
    const currentIds = (itemsRows ?? []).map((r) => r.item_id);
    
    if (currentIds.length === 0) {
      toast({
        title: "Nenhuma conta conectada",
        description: "Conecte uma conta para atualizar os dados.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const [loadedAccounts] = await Promise.all([
        loadAllAccounts(currentIds),
        loadAllInvestments(currentIds),
      ]);
      
      if (loadedAccounts.length > 0) {
        await loadAllTransactions(loadedAccounts);
      }
      
      // Atualizar também os IDs locais
      setUserItemIds(currentIds);
      
      toast({
        title: "Dados Bancários Atualizados",
        description: "Todos os dados do Open Banking foram atualizados.",
      });
    } catch (error) {
      toast({
        title: "Erro na Atualização",
        description: "Não foi possível atualizar os dados bancários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, loadAllAccounts, loadAllInvestments, loadAllTransactions, toast]);

  return {
    accounts,
    transactions,
    investments,
    loading,
    connected,
    itemId,
    connectToken,
    initiateConnection,
    handleSuccess,
    loadAccounts,
    loadInvestments,
    disconnect,
    setConnectToken,
    refreshAllData,
  };
};