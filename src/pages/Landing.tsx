import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  PiggyBank,
  Target,
  Calendar,
  Users,
  TrendingUp,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Wallet,
  Bell,
} from "lucide-react";

// Import screenshot images
import screenshotDashboard from "@/assets/screenshot-dashboard.png";
import screenshotReports from "@/assets/screenshot-reports.png";
import screenshotCalendar from "@/assets/screenshot-calendar.png";
import screenshotGoals from "@/assets/screenshot-goals.png";

const Landing = () => {
  const features = [
    {
      icon: <Wallet className="h-8 w-8" />,
      title: "Controle de Gastos",
      description: "Acompanhe receitas e despesas com categorização automática e relatórios detalhados.",
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Metas Financeiras",
      description: "Defina objetivos de economia e acompanhe seu progresso rumo à independência financeira.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Gestão Familiar",
      description: "Compartilhe o orçamento com sua família e gerencie finanças em grupo.",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Agenda Financeira",
      description: "Programe pagamentos, lembretes e sincronize com o Google Calendar.",
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Investimentos",
      description: "Acompanhe sua carteira de investimentos com cotações em tempo real.",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Relatórios Inteligentes",
      description: "Visualize gráficos e análises para tomar decisões financeiras melhores.",
    },
  ];

  const benefits = [
    "Controle total das suas finanças pessoais e familiares",
    "Sincronização com Google Calendar para lembretes",
    "Funciona offline como app instalável (PWA)",
    "Dados seguros e criptografados",
    "Planos flexíveis para cada necessidade",
    "Suporte em português",
  ];

  const screenshots = [
    {
      image: screenshotDashboard,
      title: "Dashboard",
      description: "Visão geral das suas finanças",
    },
    {
      image: screenshotReports,
      title: "Relatórios",
      description: "Gráficos e análises detalhadas",
    },
    {
      image: screenshotCalendar,
      title: "Calendário",
      description: "Agenda de pagamentos e lembretes",
    },
    {
      image: screenshotGoals,
      title: "Metas",
      description: "Acompanhe seus objetivos",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-xl">
              <PiggyBank className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Organiza</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Termos
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="outline">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button className="hidden sm:inline-flex">
                Começar Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
              <Smartphone className="h-4 w-4" />
              App PWA - Instale no seu celular
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Organize suas finanças{" "}
              <span className="text-primary">de forma simples</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              O Organiza é o app completo para gestão financeira pessoal e familiar. 
              Controle gastos, defina metas, acompanhe investimentos e organize sua vida financeira.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  Criar Conta Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                  Ver Planos
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshots Carousel */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Conheça o App
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Veja como o Organiza pode transformar sua gestão financeira
            </p>
          </div>
          <div className="max-w-xs sm:max-w-sm md:max-w-md mx-auto">
            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {screenshots.map((screenshot, index) => (
                  <CarouselItem key={index}>
                    <div className="p-2">
                      <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-b from-card to-card/80">
                        <CardContent className="flex flex-col items-center p-4">
                          <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl mb-4 bg-muted">
                            <img
                              src={screenshot.image}
                              alt={screenshot.title}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-1">
                            {screenshot.title}
                          </h3>
                          <p className="text-sm text-muted-foreground text-center">
                            {screenshot.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-0 -translate-x-1/2" />
              <CarouselNext className="right-0 translate-x-1/2" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades poderosas para você ter controle total das suas finanças
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-card">
                <CardContent className="p-6">
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Por que escolher o Organiza?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Desenvolvido pensando nas necessidades reais das famílias brasileiras, 
                o Organiza oferece uma experiência completa e intuitiva.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-success/20 rounded-3xl p-8 lg:p-12">
                <div className="bg-card rounded-2xl shadow-2xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Total</p>
                      <p className="text-2xl font-bold text-foreground">R$ 15.420,00</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-success/5 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Receitas</p>
                      <p className="text-lg font-semibold text-success">+ R$ 8.500</p>
                    </div>
                    <div className="bg-expense/5 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Despesas</p>
                      <p className="text-lg font-semibold text-expense">- R$ 5.230</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    <span>3 contas vencem esta semana</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto mb-6">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Seus dados estão seguros
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas 
            de segurança para proteger suas informações financeiras.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-4 py-2 bg-background rounded-full text-sm text-muted-foreground">
              🔒 Criptografia SSL/TLS
            </div>
            <div className="px-4 py-2 bg-background rounded-full text-sm text-muted-foreground">
              🛡️ Autenticação Segura
            </div>
            <div className="px-4 py-2 bg-background rounded-full text-sm text-muted-foreground">
              📱 App PWA Seguro
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 lg:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Comece a organizar suas finanças hoje
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Cadastre-se gratuitamente e tenha acesso a todas as funcionalidades básicas. 
              Faça upgrade quando estiver pronto.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Criar Conta Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary rounded-xl">
                  <PiggyBank className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Organiza</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Gestão financeira familiar simplificada. Organize, planeje e conquiste 
                seus objetivos financeiros.
              </p>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Organiza. Todos os direitos reservados.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    Planos e Preços
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                    Criar Conta
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                    Entrar
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                    Termos de Serviço
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
