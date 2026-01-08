import { useState, useEffect } from 'react';
import { useBudgetScope } from '@/contexts/BudgetScopeContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FamilyGroup {
  id: string;
  name: string;
}

export const BudgetScopeSwitcher = () => {
  const { user } = useAuth();
  const { scope, setScope } = useBudgetScope();
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const { state: sidebarState } = useSidebar();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any).rpc('get_user_groups');
      if (error) {
        console.error("Erro ao buscar grupos para o seletor:", error);
      } else {
        setGroups((data as FamilyGroup[]) || []);
      }
    };
    fetchGroups();
  }, [user?.id]);

  const selectedGroup = scope === 'personal'
    ? { name: 'Pessoal' }
    : groups.find(g => g.id === scope);

  if (sidebarState === 'collapsed') {
    return (
      <Select value={scope} onValueChange={setScope}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="w-8 h-8 p-0 justify-center">
                <SelectValue>
                  {selectedGroup?.name.charAt(0).toUpperCase()}
                </SelectValue>
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              {selectedGroup?.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <SelectContent>
          <SelectItem value="personal">Pessoal</SelectItem>
          {groups.map(group => (
            <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={scope} onValueChange={setScope}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecionar Orçamento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="personal">Pessoal</SelectItem>
        {groups.map(group => (
          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
