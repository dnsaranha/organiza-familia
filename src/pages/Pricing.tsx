import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { PlanComparisonTable } from '@/components/PlanComparisonTable';
import { Header } from '@/components/Header';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubscriptionPlans />
      <div className="container mx-auto px-4 py-8">
        <PlanComparisonTable />
      </div>
    </div>
  );
}