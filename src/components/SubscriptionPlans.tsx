import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star, Zap, Loader2, ArrowLeft } from "lucide-react";
import { stripeProducts } from "@/stripe-config";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const SubscriptionPlans = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

  const handleSubscribe = async (
    priceId: string,
    mode: "payment" | "subscription",
  ) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer uma assinatura.",
        variant: "destructive",
      });
      return;
    }

    setLoading(priceId);

    try {
      const response = await supabase.functions.invoke(
        "stripe-checkout",
        {
          body: {
            price_id: priceId,
            success_url: `${window.location.origin}/success`,
            cancel_url: `${window.location.origin}/pricing`,
            mode,
          },
        },
      );

      console.log("Stripe checkout response:", response);

      if (response.error) {
        const errorMessage = response.error?.message || 
          (typeof response.error === 'string' ? response.error : JSON.stringify(response.error));
        throw new Error(errorMessage || "Erro ao criar sessão de checkout");
      }

      const data = response.data;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast({
        title: "Erro no checkout",
        description:
          error.message || "Não foi possível iniciar o processo de pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Star className="h-6 w-6" />;
      case 1:
        return <Zap className="h-6 w-6" />;
      case 2:
        return <Crown className="h-6 w-6" />;
      default:
        return <Check className="h-6 w-6" />;
    }
  };

  const getFeatures = (index: number) => {
    switch (index) {
      case 0:
        return [
          "Gestão básica de transações",
          "Relatórios simples",
          "Suporte por email",
        ];
      case 1:
        return [
          "Todas as funcionalidades gratuitas",
          "Grupos ilimitados",
          "Relatórios avançados",
          "Notificações personalizadas",
          "Suporte prioritário",
        ];
      case 2:
        return [
          "Todas as funcionalidades básicas",
          "Análises financeiras avançadas",
          "Integração com bancos",
          "Consultoria financeira",
          "Suporte 24/7",
          "Recursos exclusivos",
        ];
      default:
        return [];
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(price);
  };
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="relative text-center mb-12">
        <Button
          variant="ghost"
          className="absolute top-0 left-0"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Escolha seu Plano
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Encontre o plano perfeito para suas necessidades de gestão financeira
          familiar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {stripeProducts.map((product, index) => (
          <Card
            key={product.priceId}
            className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
              index === 1
                ? "border-primary shadow-lg bg-gradient-card"
                : "bg-gradient-card shadow-card"
            }`}
          >
            {index === 1 && (
              <Badge className="absolute top-4 right-4 bg-gradient-primary text-primary-foreground">
                Mais Popular
              </Badge>
            )}

            <CardHeader className="text-center pb-4">
              <div
                className={`mx-auto mb-4 rounded-full p-3 ${
                  index === 0
                    ? "bg-muted"
                    : index === 1
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-gradient-expense text-expense-foreground"
                }`}
              >
                {getIcon(index)}
              </div>
              <CardTitle className="text-2xl font-bold">
                {product.name}
              </CardTitle>
              <div className="text-3xl font-bold text-primary">
                {formatPrice(product.price, product.currency)}
                {product.mode === "subscription" && (
                  <span className="text-sm font-normal text-muted-foreground">
                    /mês
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-center">
                {product.description}
              </p>

              <ul className="space-y-3">
                {getFeatures(index).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(product.priceId, product.mode)}
                disabled={loading === product.priceId}
                className={`w-full ${
                  index === 1
                    ? "bg-gradient-primary text-primary-foreground shadow-button hover:scale-105"
                    : index === 2
                      ? "bg-gradient-expense text-expense-foreground shadow-expense hover:scale-105"
                      : "bg-gradient-success text-success-foreground shadow-success hover:scale-105"
                } transition-smooth`}
              >
                {loading === product.priceId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {product.price === 0
                      ? "Começar Grátis"
                      : product.mode === "subscription"
                        ? "Assinar Agora"
                        : "Comprar Agora"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="bg-muted/50 rounded-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">Garantia de 30 dias</h3>
          <p className="text-muted-foreground">
            Experimente qualquer plano por 30 dias. Se não ficar satisfeito,
            devolvemos seu dinheiro sem perguntas.
          </p>
        </div>
      </div>
    </div>
  );
};
