export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price: number;
  currency: string;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_ThD8Ebquxm2Hgl',
    priceId: 'price_1SjoifQWn2kjGtoMCD2TLuAd',
    name: 'Plano Gratuito',
    description: 'Plano gratuito com funcionalidades básicas para gestão financeira pessoal',
    mode: 'payment',
    price: 0.00,
    currency: 'BRL',
  },
  {
    id: 'prod_ThD8Ebquxm2Hgl',
    priceId: 'price_1Sk1CAQWn2kjGtoM0Wlz1Xql',
    name: 'Plano Básico',
    description: 'Plano básico com recursos essenciais para gestão financeira familiar',
    mode: 'subscription',
    price: 9.90,
    currency: 'BRL',
  },
  {
    id: 'prod_ThD8iH01c4AKCL',
    priceId: 'price_1Sk1MbQWn2kjGtoMSDAU65sj',
    name: 'Plano Avançado',
    description: 'Plano completo com todos os recursos avançados e suporte prioritário',
    mode: 'subscription',
    price: 15.90,
    currency: 'BRL',
  },
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};