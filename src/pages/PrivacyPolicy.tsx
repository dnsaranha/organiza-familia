import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
              Política de Privacidade
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              Última atualização: {new Date().toLocaleDateString("pt-BR")}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introdução</h2>
              <p className="text-muted-foreground mb-4">
                Bem-vindo ao nosso aplicativo de gestão financeira. Esta Política de
                Privacidade descreve como coletamos, usamos, armazenamos e protegemos
                suas informações pessoais quando você utiliza nossos serviços.
              </p>
              <p className="text-muted-foreground">
                Ao utilizar nosso aplicativo, você concorda com a coleta e uso de
                informações de acordo com esta política.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Informações que Coletamos</h2>
              <h3 className="text-lg font-medium mb-2">2.1 Informações fornecidas por você:</h3>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Nome e sobrenome</li>
                <li>Endereço de e-mail</li>
                <li>Informações de perfil</li>
                <li>Dados financeiros inseridos manualmente (transações, orçamentos, metas)</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">2.2 Informações coletadas automaticamente:</h3>
              <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-1">
                <li>Dados de uso do aplicativo</li>
                <li>Informações do dispositivo (tipo, sistema operacional)</li>
                <li>Endereço IP</li>
                <li>Cookies e tecnologias similares</li>
              </ul>

              <h3 className="text-lg font-medium mb-2">2.3 Informações de terceiros:</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Dados bancários via Open Finance (quando autorizado)</li>
                <li>Informações de investimentos via integrações autorizadas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
              <p className="text-muted-foreground mb-4">Utilizamos suas informações para:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Fornecer e manter nossos serviços</li>
                <li>Personalizar sua experiência no aplicativo</li>
                <li>Processar transações e pagamentos de assinatura</li>
                <li>Enviar notificações sobre suas finanças (quando autorizado)</li>
                <li>Melhorar nossos serviços e desenvolver novos recursos</li>
                <li>Proteger contra fraudes e atividades não autorizadas</li>
                <li>Cumprir obrigações legais</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
              <p className="text-muted-foreground mb-4">
                Não vendemos suas informações pessoais. Podemos compartilhar dados com:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>
                  <strong>Provedores de serviço:</strong> empresas que nos auxiliam na operação
                  do aplicativo (processamento de pagamentos, hospedagem, analytics)
                </li>
                <li>
                  <strong>Parceiros de Open Finance:</strong> instituições financeiras
                  autorizadas por você
                </li>
                <li>
                  <strong>Autoridades legais:</strong> quando exigido por lei ou para
                  proteger nossos direitos
                </li>
                <li>
                  <strong>Membros do grupo familiar:</strong> dados compartilhados dentro
                  de grupos criados por você
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Segurança dos Dados</h2>
              <p className="text-muted-foreground mb-4">
                Implementamos medidas de segurança técnicas e organizacionais para proteger
                suas informações, incluindo:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                <li>Criptografia de dados em repouso</li>
                <li>Autenticação segura</li>
                <li>Controles de acesso rigorosos</li>
                <li>Monitoramento contínuo de segurança</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Seus Direitos (LGPD)</h2>
              <p className="text-muted-foreground mb-4">
                De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Confirmar a existência de tratamento de dados</li>
                <li>Acessar seus dados</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                <li>Solicitar a portabilidade dos dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Obter informações sobre compartilhamento de dados</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Retenção de Dados</h2>
              <p className="text-muted-foreground">
                Mantemos suas informações pelo tempo necessário para fornecer nossos
                serviços e cumprir obrigações legais. Após a exclusão da conta, seus
                dados serão removidos em até 30 dias, exceto quando houver obrigação
                legal de retenção.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Cookies e Tecnologias Similares</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência,
                analisar o uso do aplicativo e personalizar conteúdo. Você pode gerenciar
                suas preferências de cookies nas configurações do seu navegador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Menores de Idade</h2>
              <p className="text-muted-foreground">
                Nosso aplicativo não é destinado a menores de 18 anos. Não coletamos
                intencionalmente informações de menores. Se tomarmos conhecimento de
                que coletamos dados de um menor, tomaremos medidas para excluí-los.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Alterações nesta Política</h2>
              <p className="text-muted-foreground">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos
                você sobre mudanças significativas através do aplicativo ou por e-mail.
                Recomendamos revisar esta página regularmente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Contato</h2>
              <p className="text-muted-foreground">
                Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como
                tratamos seus dados, entre em contato conosco através do chat de suporte
                no aplicativo ou pelo e-mail de contato disponível em nosso site.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
