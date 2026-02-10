import { PiggyBank, Settings, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BudgetScopeSwitcher } from "./BudgetScopeSwitcher";
import { useNavigate } from "react-router-dom";
import React from "react";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  // Safe navigation function that checks for router context
  const navigate = (() => {
    try {
      const routerNavigate = useNavigate();
      return routerNavigate;
    } catch (error) {
      // Fallback navigation using window.location if router context is not available
      return (path: string) => {
        if (path.startsWith("/")) {
          window.location.href = window.location.origin + path;
        } else {
          window.location.href = path;
        }
      };
    }
  })();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível sair da conta.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saiu da conta",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/auth");
    }
  };

  return (
    <header className="border-b border-border bg-gradient-card shadow-card"></header>
  );
};
