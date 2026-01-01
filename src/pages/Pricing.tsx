import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { Header } from '@/components/Header';
import { PlanFeaturesTable } from '@/components/PlanFeaturesTable';
import { useSubscription } from '@/hooks/useSubscription';

export default function Pricing() {
  const { plan } = useSubscription();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubscriptionPlans />
      <div className="container mx-auto px-4 py-8">
        <PlanFeaturesTable currentPlan={plan} />
      </div>
    </div>
  );
}