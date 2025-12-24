import { NavLink } from "react-router-dom";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBottomNavConfig } from "@/hooks/useBottomNavConfig";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "@/components/TransactionForm";
import * as React from "react";

export const BottomNavBar = () => {
  const { activeNavItems } = useBottomNavConfig();
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] =
    React.useState(false);

  const handleTransactionSave = () => {
    setIsTransactionDialogOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setIsTransactionDialogOpen(true)}
        className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[60] rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-xl"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
        <div
          className="grid h-full max-w-lg mx-auto font-medium"
          style={{
            gridTemplateColumns: `repeat(${activeNavItems.length}, minmax(0, 1fr))`,
          }}
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
                    isActive ? "text-primary" : "text-muted-foreground",
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
      <Dialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm onSave={handleTransactionSave} />
        </DialogContent>
      </Dialog>
    </>
  );
};
