import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="flex items-start justify-between mb-8">
      <div>
        <h2 className="flex items-center text-2xl font-bold text-foreground">
          Olá, bem-vindo de volta! <span className="ml-2 text-2xl">👋</span>
        </h2>
        <p className="mt-1 text-muted-foreground">
          Aqui está um resumo das suas finanças hoje.
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
