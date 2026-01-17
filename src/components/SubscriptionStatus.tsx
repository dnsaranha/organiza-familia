import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, CreditCard, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getProductByPriceId, stripeProducts } from '@/stripe-config';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export const SubscriptionStatus = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const openCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para gerenciar sua assinatura',
          variant: 'destructive',
        });
        return;
      }

      const response = await supabase.functions.invoke('stripe-customer-portal', {
        body: { return_url: window.location.href },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao abrir portal');
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('URL do portal não encontrada');
      }
    } catch (err: any) {
      console.error('Erro ao abrir portal:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível abrir o portal de gerenciamento',
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };
  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user?.id]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setSubscription(data as SubscriptionData);
    } catch (err: any) {
      console.error('Erro ao buscar assinatura:', err);
      setError('Não foi possível carregar informações da assinatura');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar informações da assinatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Ativa</Badge>;
      case 'trialing':
        return <Badge className="bg-primary text-primary-foreground">Período de Teste</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Pagamento em Atraso</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Cancelada</Badge>;
      case 'incomplete':
        return <Badge variant="outline">Incompleta</Badge>;
      case 'not_started':
        return <Badge variant="outline">Não Iniciada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-gradient-card shadow-card border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando informações da assinatura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-card shadow-card border">
        <CardContent className="p-6">
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={fetchSubscription} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <Card className="bg-gradient-card shadow-card border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-muted-foreground" />
            Status da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Você está usando o plano gratuito.
            </p>
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">{stripeProducts[0].name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{stripeProducts[0].description}</p>
              <p className="text-lg font-bold text-primary">{formatPrice(stripeProducts[0].price, stripeProducts[0].currency)}</p>
            </div>
            <Button 
              onClick={() => navigate('/pricing')}
              className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
            >
              Fazer Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Status da Assinatura
          </div>
          {getStatusBadge(subscription.subscription_status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {product && (
          <div>
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-muted-foreground text-sm">{product.description}</p>
            <p className="text-lg font-bold text-primary mt-2">
              {formatPrice(product.price, product.currency)}
              {product.mode === 'subscription' && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscription.current_period_start && subscription.current_period_end && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Período Atual</p>
                <p className="text-muted-foreground">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </div>
          )}

          {subscription.payment_method_brand && subscription.payment_method_last4 && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Método de Pagamento</p>
                <p className="text-muted-foreground">
                  {subscription.payment_method_brand.toUpperCase()} •••• {subscription.payment_method_last4}
                </p>
              </div>
            </div>
          )}
        </div>

        {subscription.cancel_at_period_end && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Cancelamento Agendado</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Sua assinatura será cancelada no final do período atual em{' '}
              {subscription.current_period_end && formatDate(subscription.current_period_end)}.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/pricing')}
          >
            Alterar Plano
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchSubscription}
          >
            Atualizar Status
          </Button>
          {(subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={openCustomerPortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gerenciar Assinatura
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};