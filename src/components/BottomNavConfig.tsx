import { useBottomNavConfig, allNavItems } from "@/hooks/useBottomNavConfig";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavConfig() {
  const {
    selectedIds,
    toggleItem,
    resetToDefault,
    maxItems,
    canAddMore,
  } = useBottomNavConfig();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Itens do Menu</h4>
          <p className="text-sm text-muted-foreground">
            Selecione até {maxItems} itens ({selectedIds.length}/{maxItems})
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetToDefault}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetar
        </Button>
      </div>

      <div className="grid gap-2">
        {allNavItems.map((item, index) => {
          const isSelected = selectedIds.includes(item.id);
          const isDisabled = !isSelected && !canAddMore;
          const Icon = item.icon;
          const orderIndex = selectedIds.indexOf(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-border",
                isDisabled && "opacity-50"
              )}
            >
              <Checkbox
                id={`nav-${item.id}`}
                checked={isSelected}
                onCheckedChange={() => toggleItem(item.id)}
                disabled={isDisabled || (isSelected && selectedIds.length <= 1)}
              />
              <Icon className="h-5 w-5 text-muted-foreground" />
              <Label
                htmlFor={`nav-${item.id}`}
                className="flex-1 cursor-pointer"
              >
                {item.label}
              </Label>
              {isSelected && (
                <Badge variant="secondary" className="text-xs">
                  {orderIndex + 1}º
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        A ordem dos itens no menu segue a ordem de seleção. Desmarque e marque novamente para reordenar.
      </p>
    </div>
  );
}
