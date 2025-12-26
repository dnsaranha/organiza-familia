import { FamilyGroups } from "@/components/FamilyGroups";

const GroupsPage = () => {
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Grupos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Gerencie seus grupos, convide novos membros e compartilhe suas finanças.
        </p>
      </div>
      <FamilyGroups />
    </div>
  );
};

export default GroupsPage;
