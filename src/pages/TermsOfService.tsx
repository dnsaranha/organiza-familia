import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Termos de Serviço
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground mb-4">
                Ao acessar ou usar nosso aplicativo de gestão financeira, você concorda
                em estar vinculado a estes Termos de Serviço. Se você não concordar com
                qualquer parte destes termos, não poderá acessar o serviço.
              </p>
              <p className="text-muted-foreground">
                Estes termos se aplicam a todos os visitantes, usuários e outras pessoas
                que acessam ou usam o serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground mb-4">
                Nosso aplicativo oferece ferramentas para gestão de finanças pessoais,
                incluindo:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Registro e categorização de transações financeiras</li>
                <li>Criação e acompanhamento de orçamentos</li>
                <li>Definição e monitoramento de metas financeiras</li>
                <li>Visualização de relatórios e gráficos</li>
                <li>Integração com instituições financeiras via Open Finance</li>
                <li>Acompanhamento de investimentos</li>
                <li>Gestão financeira em grupo (família)</li>
                <li>Agendamento de tarefas financeiras</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Contas de Usuário</h2>
              <h3 className="text-lg font-medium mb-2">3.1 Registro</h3>
              <p className="text-muted-foreground mb-4">
                Para usar determinados recursos do aplicativo, você deve criar uma conta.
                Você é responsável por manter a confidencialidade de sua senha e por
                todas as atividades que ocorrem em sua conta.
              </p>

              <h3 className="text-lg font-medium mb-2">3.2 Informações Precisas</h3>
              <p className="text-muted-foreground mb-4">
                Você concorda em fornecer informações verdadeiras, precisas, atuais e
                completas sobre si mesmo durante o registro e manter essas informações
                atualizadas.
              </p>

              <h3 className="text-lg font-medium mb-2">3.3 Segurança da Conta</h3>
              <p className="text-muted-foreground">
                Você deve notificar-nos imediatamente sobre qualquer uso não autorizado
                de sua conta ou qualquer outra violação de segurança.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Planos e Pagamentos</h2>
              <h3 className="text-lg font-medium mb-2">4.1 Planos Disponíveis</h3>
              <p className="text-muted-foreground mb-4">
                Oferecemos diferentes planos de assinatura (Gratuito, Individual e Família),
                cada um com recursos e limites específicos descritos em nossa página de
                preços.
              </p>

              <h3 className="text-lg font-medium mb-2">4.2 Cobrança</h3>
              <p className="text-muted-foreground mb-4">
                Para planos pagos, você será cobrado antecipadamente no início de cada
                período de cobrança (mensal ou anual). Os pagamentos são processados
                através de nosso provedor de pagamentos (Stripe).
              </p>

              <h3 className="text-lg font-medium mb-2">4.3 Cancelamento</h3>
              <p className="text-muted-foreground mb-4">
                Você pode cancelar sua assinatura a qualquer momento. O cancelamento
                entrará em vigor ao final do período de cobrança atual. Não há reembolso
                por períodos parciais.
              </p>

              <h3 className="text-lg font-medium mb-2">4.4 Alteração de Preços</h3>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar os preços dos planos. Qualquer
                alteração será comunicada com antecedência mínima de 30 dias.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Uso Aceitável</h2>
              <p className="text-muted-foreground mb-4">Você concorda em não:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Usar o serviço para qualquer finalidade ilegal</li>
                <li>Tentar acessar áreas não autorizadas do sistema</li>
                <li>Interferir ou interromper o serviço ou servidores</li>
                <li>Compartilhar sua conta com terceiros</li>
                <li>Fazer engenharia reversa ou descompilar o aplicativo</li>
                <li>Usar bots ou scripts automatizados</li>
                <li>Inserir dados falsos ou fraudulentos</li>
                <li>Violar direitos de propriedade intelectual</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Propriedade Intelectual</h2>
              <p className="text-muted-foreground mb-4">
                O aplicativo e seu conteúdo original, recursos e funcionalidades são de
                propriedade exclusiva nossa e estão protegidos por leis de direitos
                autorais, marcas registradas e outras leis de propriedade intelectual.
              </p>
              <p className="text-muted-foreground">
                Você mantém a propriedade de todos os dados que inserir no aplicativo.
                Ao usar o serviço, você nos concede uma licença limitada para processar
                esses dados conforme necessário para fornecer o serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Integrações com Terceiros</h2>
              <h3 className="text-lg font-medium mb-2">7.1 Open Finance</h3>
              <p className="text-muted-foreground mb-4">
                Ao conectar suas contas bancárias através do Open Finance, você autoriza
                o acesso às informações conforme as permissões solicitadas. Essa
                autorização pode ser revogada a qualquer momento.
              </p>

              <h3 className="text-lg font-medium mb-2">7.2 Serviços de Terceiros</h3>
              <p className="text-muted-foreground">
                Nosso aplicativo pode conter links para serviços de terceiros. Não somos
                responsáveis pelo conteúdo, políticas de privacidade ou práticas desses
                serviços.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Isenção de Responsabilidade</h2>
              <h3 className="text-lg font-medium mb-2">8.1 Não Somos Consultores Financeiros</h3>
              <p className="text-muted-foreground mb-4">
                O aplicativo é uma ferramenta de organização financeira e não constitui
                aconselhamento financeiro, tributário, jurídico ou de investimentos.
                Consulte profissionais qualificados para orientação específica.
              </p>

              <h3 className="text-lg font-medium mb-2">8.2 Precisão dos Dados</h3>
              <p className="text-muted-foreground mb-4">
                Embora nos esforcemos para fornecer informações precisas, não garantimos
                a exatidão, completude ou atualidade dos dados exibidos, especialmente
                dados provenientes de integrações com terceiros.
              </p>

              <h3 className="text-lg font-medium mb-2">8.3 Disponibilidade do Serviço</h3>
              <p className="text-muted-foreground">
                O serviço é fornecido "como está" e "conforme disponível". Não garantimos
                que o serviço será ininterrupto, seguro ou livre de erros.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground">
                Em nenhuma circunstância seremos responsáveis por danos indiretos,
                incidentais, especiais, consequenciais ou punitivos, incluindo perda de
                lucros, dados, uso ou outros danos intangíveis resultantes do uso ou
                incapacidade de usar o serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Modificações do Serviço</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar ou descontinuar, temporária ou
                permanentemente, o serviço (ou qualquer parte dele) com ou sem aviso
                prévio. Não seremos responsáveis perante você ou terceiros por qualquer
                modificação, suspensão ou descontinuação do serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Encerramento</h2>
              <p className="text-muted-foreground mb-4">
                Podemos encerrar ou suspender sua conta imediatamente, sem aviso prévio
                ou responsabilidade, por qualquer motivo, incluindo, sem limitação, se
                você violar os Termos.
              </p>
              <p className="text-muted-foreground">
                Após o encerramento, seu direito de usar o serviço cessará imediatamente.
                Se desejar encerrar sua conta, você pode simplesmente descontinuar o uso
                do serviço ou solicitar a exclusão através do aplicativo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Lei Aplicável</h2>
              <p className="text-muted-foreground">
                Estes Termos serão regidos e interpretados de acordo com as leis do Brasil,
                sem consideração a conflitos de disposições legais. O foro da comarca de
                São Paulo, SP, será competente para dirimir quaisquer controvérsias.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Alterações nos Termos</h2>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar ou substituir estes Termos a qualquer
                momento. Se uma revisão for material, tentaremos fornecer um aviso com
                pelo menos 30 dias de antecedência antes que os novos termos entrem em
                vigor. O que constitui uma alteração material será determinado a nosso
                exclusivo critério.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">14. Contato</h2>
              <p className="text-muted-foreground">
                Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco
                através do chat de suporte no aplicativo ou pelo e-mail de contato
                disponível em nosso site.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
