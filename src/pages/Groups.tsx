import { FamilyGroups } from "@/components/FamilyGroups";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GroupsPage = () => {
  const { limits, plan } = useSubscription();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Grupos</h1>
      <p className="text-muted-foreground mb-8">
        Gerencie seus grupos, convide novos membros e compartilhe suas finanças.
      </p>
      
      {/* Free users can still access this page as invited members */}
      {!limits.groupsEnabled && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Criação de Grupos</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              No plano gratuito você só pode participar como membro convidado. 
              Faça upgrade para criar seus próprios grupos.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pricing')}
              className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
            >
              Fazer Upgrade
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <FamilyGroups />
    </div>
  );
};

export default GroupsPage;