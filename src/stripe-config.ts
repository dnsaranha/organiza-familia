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
    id: 'prod_Tgt7DcUIS7w1Y2',
    priceId: 'price_1SjVL3QWn2kjGtoMSfnWKglg',
    name: 'Assinatatura Gratuita',
    description: 'Plano gratuito com funcionalidades básicas para gestão financeira pessoal',
    mode: 'payment',
    price: 0.00,
    currency: 'BRL',
  },
  {
    id: 'prod_TgtCAPh2NCGcUH',
    priceId: 'price_1SjVPgQWn2kjGtoMmkm2fceQ',
    name: 'Assinatura Básica',
    description: 'Plano básico com recursos essenciais para gestão financeira familiar',
    mode: 'subscription',
    price: 9.90,
    currency: 'BRL',
  },
  {
    id: 'prod_TgtE4frZahIphs',
    priceId: 'price_1SjVSDQWn2kjGtoMBTWLT3K4',
    name: 'Assinatura Avançada',
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