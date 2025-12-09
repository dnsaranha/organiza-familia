import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FinancialCardProps {
  title: string;
  amount?: number; // Make amount optional
  isCurrency?: boolean;
  isPercentage?: boolean;
  isLoading?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
  icon?: LucideIcon;
  className?: string;
}

export const FinancialCard = ({
  title,
  amount = 0, // Provide a default value for amount
  isCurrency = false,
  isPercentage = false,
  isLoading = false,
  isPositive = false,
  isNegative = false,
  icon: Icon,
  className,
}: FinancialCardProps) => {
  const formatValue = (value: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }
    if (isPercentage) {
      return `${value.toFixed(2)}%`;
    }
    return value.toString();
  };

  const valueColor = isPositive
    ? "text-success"
    : isNegative
    ? "text-destructive"
    : "text-foreground";

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-3/4 mt-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>
          {formatValue(amount)}
        </div>
      </CardContent>
    </Card>
  );
};
