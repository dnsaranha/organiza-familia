import { useEffect, useState } from "react";
import { useB3Data } from "@/hooks/useB3Data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Página de teste para validar a integração com a B3 e Yahoo Finance
const YFinanceTest = () => {
  const { getEnhancedAssetsData, getPortfolioEvolutionData } = useB3Data();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      // Força a busca de dados manuais
      const assets = await getEnhancedAssetsData(true);
      const evolution = await getPortfolioEvolutionData("12m", true);

      setTestResult({ assets, evolution });
    } catch (error) {
      console.error("Erro no teste YFinance:", error);
      setTestResult({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Executa o teste automaticamente ao carregar a página
    handleTest();
  }, []);

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Integração - Yahoo Finance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Esta página testa o fluxo de busca de dados de ativos (manuais e
            via Pluggy) e o enriquecimento com dados do Yahoo Finance.
          </p>
          <Button onClick={handleTest} disabled={loading}>
            {loading ? "Testando..." : "Executar Teste"}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <h3 className="font-bold">Resultado:</h3>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YFinanceTest;
