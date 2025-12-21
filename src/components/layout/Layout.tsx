import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  CheckSquare,
  Target,
  CalendarDays,
  PieChart,
  ChevronsLeft,
  ChevronsRight,
  Bell,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { BottomNavBar } from '@/components/BottomNavBar';
import { BudgetScopeSwitcher } from '@/components/BudgetScopeSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/groups', icon: Users, label: 'Grupos' },
  { to: '/reports', icon: AreaChart, label: 'Relatórios' },
  { to: '/investments', icon: TrendingUp, label: 'Investimentos' },
  { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/budget', icon: PieChart, label: 'Orçamento' },
  { to: '/forecast', icon: CalendarDays, label: 'Previsões' },
];

const DesktopView = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          'fixed top-0 left-0 z-20 flex h-screen flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-5 -right-3 z-50 rounded-full border bg-background p-1 text-muted-foreground hover:bg-muted"
        >
          {isCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>

        <div className="flex h-20 items-center p-6">
          <PiggyBank
            className={cn(
              'h-10 w-10 text-primary transition-all',
              isCollapsed && 'h-8 w-8'
            )}
          />
          <div
            className={cn(
              'ml-3 overflow-hidden whitespace-nowrap transition-all duration-200',
              isCollapsed && 'w-0 opacity-0'
            )}
          >
            <h1 className="text-xl font-bold text-primary">Organiza</h1>
            <p className="text-xs text-muted-foreground">Gestão Financeira</p>
          </div>
        </div>

        <div className={cn('mb-4 px-6', isCollapsed && 'px-4')}>
          <BudgetScopeSwitcher isCollapsed={isCollapsed} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center rounded-lg px-4 py-2.5 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                  isCollapsed && 'justify-center px-0'
                )
              }
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isCollapsed && 'mr-0'
                )}
              />
              <span
                className={cn(
                  'font-medium',
                  isCollapsed && 'sr-only'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  'flex w-full cursor-pointer items-center space-x-3 rounded p-2 hover:bg-muted',
                  isCollapsed && 'justify-center'
                )}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-sm font-medium text-muted-foreground">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <div
                  className={cn(
                    'min-w-0 flex-1 overflow-hidden',
                    isCollapsed && 'hidden'
                  )}
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Minha Conta
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/connect')}>Conectar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
                Notificações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/pricing')}>Planos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>Perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main
        className={cn(
          'flex-1 overflow-y-auto p-8 transition-all duration-300 ease-in-out',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {children}
      </main>
    </div>
  );
};

const MobileView = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  return (
    <div className="w-full min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4 sm:h-16">
          <NavLink to="/" className="flex flex-shrink items-center gap-2 min-w-0 sm:gap-3">
            <div className="flex-shrink-0 rounded-full bg-gradient-primary p-1.5 shadow-glow sm:p-2">
              <PiggyBank className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
            </div>
            <div className="hidden min-w-0 xs:block">
              <div className="truncate font-bold text-primary text-sm sm:text-base">Organiza</div>
              <p className="truncate text-muted-foreground text-[10px] sm:text-xs">
                Gestão Financeira Familiar
              </p>
            </div>
          </NavLink>
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
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
      <main className="min-h-[calc(100vh-8rem)] w-full pb-20">{children}</main>
      <BottomNavBar />
    </div>
  )
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();

  return isMobile ? <MobileView>{children}</MobileView> : <DesktopView>{children}</DesktopView>;
};

export default Layout;