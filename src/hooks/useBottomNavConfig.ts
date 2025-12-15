import { useState, useEffect } from "react";
import { Home, Users, AreaChart, TrendingUp, CheckSquare, Target, PiggyBank, Settings, Calendar, FileText } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export const allNavItems: NavItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "investments", label: "Invest.", icon: TrendingUp, path: "/investments" },
  { id: "groups", label: "Grupos", icon: Users, path: "/groups" },
  { id: "tasks", label: "Tarefas", icon: CheckSquare, path: "/tasks" },
  { id: "reports", label: "Relatórios", icon: AreaChart, path: "/reports" },
  { id: "goals", label: "Metas", icon: Target, path: "/goals" },
  { id: "budget", label: "Orçamento", icon: PiggyBank, path: "/budget" },
  { id: "forecast", label: "Previsão", icon: Calendar, path: "/forecast" },
  { id: "profile", label: "Perfil", icon: Settings, path: "/profile" },
];

const DEFAULT_NAV_IDS = ["home", "investments", "groups", "tasks", "reports"];
const STORAGE_KEY = "organiza-bottom-nav-config";
const MAX_ITEMS = 5;

const NAV_CONFIG_EVENT = "nav-config-changed";

export function useBottomNavConfig() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length <= MAX_ITEMS) {
          return parsed;
        }
      } catch {
        // Keep default
      }
    }
    return DEFAULT_NAV_IDS;
  });

  useEffect(() => {
    const handleConfigChange = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length <= MAX_ITEMS) {
            setSelectedIds(parsed);
          }
        } catch {
          // Keep current
        }
      }
    };

    window.addEventListener(NAV_CONFIG_EVENT, handleConfigChange);
    return () => window.removeEventListener(NAV_CONFIG_EVENT, handleConfigChange);
  }, []);

  const saveConfig = (ids: string[]) => {
    const limitedIds = ids.slice(0, MAX_ITEMS);
    setSelectedIds(limitedIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedIds));
    window.dispatchEvent(new CustomEvent(NAV_CONFIG_EVENT));
  };

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        saveConfig(selectedIds.filter((i) => i !== id));
      }
    } else if (selectedIds.length < MAX_ITEMS) {
      saveConfig([...selectedIds, id]);
    }
  };

  const reorderItems = (newOrder: string[]) => {
    saveConfig(newOrder);
  };

  const resetToDefault = () => {
    saveConfig(DEFAULT_NAV_IDS);
  };

  const orderedNavItems = selectedIds
    .map((id) => allNavItems.find((item) => item.id === id))
    .filter((item): item is NavItem => item !== undefined);

  return {
    selectedIds,
    activeNavItems: orderedNavItems,
    allNavItems,
    toggleItem,
    reorderItems,
    resetToDefault,
    maxItems: MAX_ITEMS,
    canAddMore: selectedIds.length < MAX_ITEMS,
  };
}
