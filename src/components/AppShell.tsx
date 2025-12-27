import * as React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  PanelLeft,
  Menu,
  PiggyBank,
  Settings,
  LogOut,
  AreaChart,
  TrendingUp,
  Link,
  CheckSquare,
  Target,
  CalendarDays,
  Calendar,
  PieChart, // Ícone adicionado
  Plus,
} from "lucide-react";

import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavBar } from "@/components/BottomNavBar";
import { BudgetScopeSwitcher } from "@/components/BudgetScopeSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/TransactionForm";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDesktopTransactionOpen, setIsDesktopTransactionOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user && location.pathname !== "/yfinance-test") {
      navigate("/auth");
    }
  }, [user, loading, navigate, location]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDesktopTransactionSaved = () => {
    setIsDesktopTransactionOpen(false);
    window.dispatchEvent(new CustomEvent("transaction-updated"));
  };

  const mobileView = (
    <div className="min-h-screen bg-background w-full">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <NavLink to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="rounded-full p-1.5 sm:p-2 bg-gradient-primary shadow-glow flex-shrink-0">
              <PiggyBank className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 hidden xs:block">
              <div className="font-bold text-sm sm:text-base text-primary truncate">Organiza</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Gestão Financeira Familiar
              </p>
            </div>
          </NavLink>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <BudgetScopeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NavLink to="/goals">Metas</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/budget">Orçamento</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/forecast">Previsões</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <NavLink to="/connect">Conectar</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/settings/notifications">
                        Notificações
                      </NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/pricing">Planos</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <NavLink to="/profile">Perfil</NavLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      Sair
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <NavLink to="/auth">Login</NavLink>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="pb-20 w-full min-h-[calc(100vh-8rem)]">{children}</main>
      <BottomNavBar />
    </div>
  );

  const desktopView = (
    <>
      <Sidebar collapsible="icon">
        <div className="flex h-full flex-col">
          <SidebarHeader className="flex p-4">
            <NavLink to="/" className="flex items-center gap-3 justify-center">
              <div className="rounded-full p-2 bg-gradient-primary shadow-glow flex items-center gap-3 justify-center">
                <PiggyBank className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0">
                <div className="font-bold text-lg text-primary">Organiza</div>
                <p className="text-xs text-muted-foreground">
                  Gestão Financeira Familiar
                </p>
              </div>
            </NavLink>
            <SidebarTrigger className="items-center content-center justify-center">
              <PanelLeft className="size-5" />
              <div className="w-[80px] h-[80px] bg-white"></div>
            </SidebarTrigger>
          </SidebarHeader>
          <SidebarContent className="flex-1 items-start">
            <div className="p-2 flex items-center justify-start">
              <BudgetScopeSwitcher />
            </div>
            <SidebarMenu className="justify-center items-start">
              <SidebarMenuItem>
                <NavLink to="/" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Home className="size-4" />
                      <span>Home</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/tasks/calendar" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Calendar className="size-4" />
                      <span>Calendário</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/groups" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Users className="size-4" />
                      <span>Grupos</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/reports" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <AreaChart className="size-4" />
                      <span>Relatórios</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/investments" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <TrendingUp className="size-4" />
                      <span>Investimentos</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/tasks" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <CheckSquare className="size-4" />
                      <span>Tarefas</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/goals" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <Target className="size-4" />
                      <span>Metas</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/budget" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <PieChart className="size-4" />
                      <span>Orçamento</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/forecast" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive}>
                      <CalendarDays className="size-4" />
                      <span>Previsões</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-2"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                      <span>{user.email?.[0].toUpperCase()}</span>
                    </div>
                    <span className="truncate overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Minha Conta
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/connect">Conectar</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/settings/notifications">Notificações</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/pricing">Planos</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/profile">Perfil</NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="w-full">
                <NavLink to="/auth">Login</NavLink>
              </Button>
            )}
          </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset className="w-full">
        <header className="border-b p-3 sm:p-4">
          <div className="flex items-center justify-end gap-2 sm:gap-4">
            <Button
              onClick={() => setIsDesktopTransactionOpen(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/pricing")}
              className="text-xs sm:text-sm text-muted-foreground hover:text-primary"
            >
              Planos
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="text-muted-foreground hover:text-primary h-8 w-8 sm:h-9 sm:w-9"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </header>
        <div className="w-full">{children}</div>
        <Dialog open={isDesktopTransactionOpen} onOpenChange={setIsDesktopTransactionOpen}>
          <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-transparent border-none shadow-none">
            <DialogTitle className="sr-only">Nova Transação</DialogTitle>
             <TransactionForm
              onSave={handleDesktopTransactionSaved}
              onCancel={() => setIsDesktopTransactionOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </>
  );

  return (
    <SidebarProvider defaultOpen>
      {isMobile ? mobileView : desktopView}
    </SidebarProvider>
  );
};

export default AppShell;
