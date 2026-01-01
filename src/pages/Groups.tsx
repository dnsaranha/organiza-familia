import { FamilyGroups } from "@/components/FamilyGroups";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";

const GroupsPage = () => {
  const { canAccessGroups, isLoading } = useSubscription();

  if (!isLoading && !canAccessGroups()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Grupos</h1>
        <UpgradePrompt 
          feature="Grupos Familiares" 
          requiredPlan="basic"
          description="Crie grupos para compartilhar finanças com familiares ou parceiros."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Grupos</h1>
      <p className="text-muted-foreground mb-8">
        Gerencie seus grupos, convide novos membros e compartilhe suas finanças.
      </p>
      <FamilyGroups />
    </div>
  );
};

export default GroupsPage;
