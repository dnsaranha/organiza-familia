import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  PieChart,
  Bell,
  ChevronLeft,
  ChevronRight,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavBar } from "@/components/BottomNavBar";
import { BudgetScopeSwitcher } from "@/components/BudgetScopeSwitcher";
import { TransactionForm } from "@/components/TransactionForm";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Silently handle network errors
    }
  };

  const handleTransactionSave = () => {
    setIsTransactionDialogOpen(false);
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
        <div className="flex h-full flex-col border-r bg-sidebar">
          <SidebarHeader className="p-6 h-20 relative flex flex-row items-center">
            <SidebarTrigger className="absolute top-5 right-4 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
              <ChevronLeft className="size-5 block group-data-[collapsible=icon]:hidden" />
              <ChevronRight className="size-5 hidden group-data-[collapsible=icon]:block" />
            </SidebarTrigger>
            <NavLink to="/" className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div className="overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:hidden">
                <div className="font-bold text-xl text-primary">Organiza</div>
                <p className="text-xs text-muted-foreground">
                  Gestão Financeira
                </p>
              </div>
            </NavLink>
          </SidebarHeader>
          <div className="px-6 mb-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <BudgetScopeSwitcher />
          </div>
          <SidebarContent className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <NavLink to="/" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <Home className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Home</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/groups" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <Users className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Grupos</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/reports" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <AreaChart className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Relatórios</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/investments" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <TrendingUp className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Investimentos</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/tasks" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <CheckSquare className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Tarefas</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/goals" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <Target className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Metas</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/budget" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <PieChart className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Orçamento</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink to="/forecast" className="w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton 
                      isActive={isActive}
                      className={`px-4 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'hover:bg-accent'
                      } group-data-[collapsible=icon]:justify-center`}
                    >
                      <CalendarDays className="size-5 mr-3 group-data-[collapsible=icon]:mr-0" />
                      <span className="font-medium group-data-[collapsible=icon]:hidden">Previsões</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 px-2"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted flex-shrink-0">
                      <span className="text-sm font-medium">{user.email?.[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                      <p className="text-sm font-medium truncate">
                        {user.email}
                      </p>
                    </div>
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
        <header className="flex justify-between items-center border-b p-4 md:p-6 lg:p-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Olá, bem-vindo de volta! <span>👋</span>
            </h2>
            <p className="text-muted-foreground mt-1">Aqui está um resumo das suas finanças hoje.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="icon"
              className="rounded-full bg-primary hover:bg-primary/90 shadow-lg h-12 w-12"
              onClick={() => setIsTransactionDialogOpen(true)}
            >
              <Plus className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="w-full">{children}</div>
      </SidebarInset>
    </>
  );

  return (
    <SidebarProvider defaultOpen>
      {isMobile ? mobileView : desktopView}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm onSave={handleTransactionSave} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AppShell;
