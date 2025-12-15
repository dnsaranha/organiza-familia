import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useBottomNavConfig } from "@/hooks/useBottomNavConfig";

export const BottomNavBar = () => {
  const { activeNavItems } = useBottomNavConfig();
  const gridCols = activeNavItems.length;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
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
  );
};
