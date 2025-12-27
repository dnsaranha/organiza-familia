import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useBottomNavConfig } from "@/hooks/useBottomNavConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/TransactionForm";
import { Plus } from "lucide-react";

export const BottomNavBar = () => {
  const { activeNavItems } = useBottomNavConfig();
  const gridCols = activeNavItems.length;
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const handleTransactionSaved = () => {
    setIsTransactionModalOpen(false);
    window.dispatchEvent(new CustomEvent("transaction-updated"));
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
        <button
          onClick={() => setIsTransactionModalOpen(true)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors z-50"
          aria-label="Nova Transação"
        >
          <Plus className="h-8 w-8" />
        </button>

        <div
          className="grid h-full max-w-lg mx-auto font-medium"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {activeNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "inline-flex flex-col items-center justify-center px-2 hover:bg-muted transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Nova Transação</DialogTitle>
           <TransactionForm
            onSave={handleTransactionSaved}
            onCancel={() => setIsTransactionModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
