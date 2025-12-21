import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, CreditCard, Loader2 } from 'lucide-react';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate a brief loading period to show the success state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-card shadow-card border text-center">
              <CardContent className="p-12">
                <Loader2 className="h-16 w-16 animate-spin mx-auto mb-6 text-primary" />
                <h1 className="text-2xl font-bold mb-4">
                  Processando seu pagamento...
                </h1>
                <p className="text-muted-foreground">
                  Aguarde enquanto confirmamos sua transação.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-card shadow-card border text-center">
            <CardHeader>
              <div className="mx-auto mb-4 rounded-full p-4 bg-success/10">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
              <CardTitle className="text-3xl font-bold text-success">
                {sessionId ? 'Pagamento Realizado com Sucesso!' : 'Plano Ativado com Sucesso!'} 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground">
                  {sessionId 
                    ? 'Obrigado por escolher o Organiza! Seu pagamento foi processado com sucesso.'
                    : 'Obrigado por escolher o Organiza! Seu plano foi ativado com sucesso.'
                  }
                </p>
                
                {sessionId && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      ID da Sessão: <code className="font-mono">{sessionId}</code>
                    </p>
                  </div>
                )}

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                  <h3 className="font-semibold text-primary mb-2">
                    O que acontece agora?
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      Sua conta foi atualizada com o novo plano
                    </li>
                    {sessionId && (
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                        Você receberá um email de confirmação em breve
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      Todos os recursos do seu plano já estão disponíveis
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate('/')}
                  className="bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir para Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/pricing')}
                  variant="outline"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Ver Planos
                </Button>
              </div>

              <div className="pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Precisa de ajuda? Entre em contato conosco através do{' '}
                  <a href="mailto:suporte@organiza.com" className="text-primary hover:underline">
                    suporte@organiza.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}