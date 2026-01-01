import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { Header } from '@/components/Header';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubscriptionPlans />
    </div>
  );
}