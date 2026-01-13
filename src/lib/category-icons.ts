// Default category icons and colors mapping
export const DEFAULT_CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  // Income categories
  'Salário': { icon: 'Wallet', color: 'hsl(142, 76%, 36%)' },
  'Freelance': { icon: 'Briefcase', color: 'hsl(200, 80%, 50%)' },
  'Investimentos': { icon: 'TrendingUp', color: 'hsl(262, 83%, 58%)' },
  'Presente': { icon: 'Gift', color: 'hsl(340, 80%, 60%)' },
  'Bônus': { icon: 'Award', color: 'hsl(45, 93%, 47%)' },
  'Aluguel Recebido': { icon: 'Home', color: 'hsl(180, 60%, 45%)' },
  
  // Expense categories - Custos Fixos
  'Casa': { icon: 'Home', color: 'hsl(220, 70%, 50%)' },
  'Contas': { icon: 'FileText', color: 'hsl(200, 60%, 40%)' },
  'Aluguel': { icon: 'Building2', color: 'hsl(220, 60%, 45%)' },
  'Água': { icon: 'Droplets', color: 'hsl(200, 80%, 55%)' },
  'Luz': { icon: 'Zap', color: 'hsl(45, 93%, 47%)' },
  'Internet': { icon: 'Wifi', color: 'hsl(260, 70%, 55%)' },
  'Telefone': { icon: 'Phone', color: 'hsl(170, 60%, 45%)' },
  
  // Expense categories - Conforto
  'Alimentação': { icon: 'Utensils', color: 'hsl(25, 90%, 50%)' },
  'Transporte': { icon: 'Car', color: 'hsl(200, 70%, 50%)' },
  'Saúde': { icon: 'HeartPulse', color: 'hsl(350, 70%, 50%)' },
  'Mercado': { icon: 'ShoppingCart', color: 'hsl(120, 50%, 45%)' },
  
  // Expense categories - Prazeres
  'Lazer': { icon: 'Smile', color: 'hsl(45, 80%, 55%)' },
  'Compras': { icon: 'ShoppingBag', color: 'hsl(300, 60%, 50%)' },
  'Entretenimento': { icon: 'Gamepad2', color: 'hsl(270, 70%, 55%)' },
  'Restaurante': { icon: 'UtensilsCrossed', color: 'hsl(15, 80%, 50%)' },
  
  // Expense categories - Conhecimento
  'Educação': { icon: 'GraduationCap', color: 'hsl(210, 80%, 50%)' },
  'Livros': { icon: 'BookOpen', color: 'hsl(30, 60%, 50%)' },
  'Cursos': { icon: 'Monitor', color: 'hsl(190, 70%, 45%)' },
  
  // Expense categories - Metas
  'Viagem': { icon: 'Plane', color: 'hsl(195, 80%, 50%)' },
  'Reservas': { icon: 'PiggyBank', color: 'hsl(340, 70%, 55%)' },
  'Objetivos': { icon: 'Target', color: 'hsl(145, 60%, 45%)' },
  
  // Expense categories - Liberdade Financeira
  'Poupança': { icon: 'Landmark', color: 'hsl(220, 60%, 50%)' },
  'Reserva': { icon: 'Shield', color: 'hsl(180, 50%, 45%)' },
  
  // Other
  'Outros': { icon: 'MoreHorizontal', color: 'hsl(0, 0%, 50%)' },
  'Sem Categoria': { icon: 'HelpCircle', color: 'hsl(0, 0%, 60%)' },
  
  // Despesas Pessoais (common banking category)
  'Despesas Pessoais': { icon: 'User', color: 'hsl(220, 70%, 50%)' },
};

// List of available icons for user selection
export const AVAILABLE_ICONS = [
  'Wallet', 'Briefcase', 'TrendingUp', 'Gift', 'Award', 'Home', 
  'Building2', 'FileText', 'Droplets', 'Zap', 'Wifi', 'Phone',
  'Utensils', 'UtensilsCrossed', 'Car', 'HeartPulse', 'ShoppingCart',
  'Smile', 'ShoppingBag', 'Gamepad2', 'GraduationCap', 'BookOpen',
  'Monitor', 'Plane', 'PiggyBank', 'Target', 'Landmark', 'Shield',
  'MoreHorizontal', 'HelpCircle', 'User', 'CreditCard', 'DollarSign',
  'Banknote', 'Coins', 'Receipt', 'Coffee', 'Beer', 'Pizza',
  'Music', 'Film', 'Tv', 'Dumbbell', 'Stethoscope', 'Pill',
  'Baby', 'Dog', 'Cat', 'Leaf', 'Fuel', 'Bus', 'Train',
  'Bike', 'Shirt', 'Watch', 'Gem', 'Glasses', 'Brush',
  'Scissors', 'Wrench', 'Hammer', 'Key', 'Lock', 'Calendar',
];

// List of available colors for user selection
export const AVAILABLE_COLORS = [
  'hsl(0, 70%, 50%)',      // Red
  'hsl(15, 80%, 50%)',     // Orange-red
  'hsl(25, 90%, 50%)',     // Orange
  'hsl(45, 93%, 47%)',     // Yellow-orange
  'hsl(60, 70%, 45%)',     // Yellow
  'hsl(120, 50%, 45%)',    // Green
  'hsl(142, 76%, 36%)',    // Emerald
  'hsl(170, 60%, 45%)',    // Teal
  'hsl(180, 60%, 45%)',    // Cyan
  'hsl(195, 80%, 50%)',    // Sky blue
  'hsl(200, 80%, 50%)',    // Light blue
  'hsl(210, 80%, 50%)',    // Blue
  'hsl(220, 70%, 50%)',    // Indigo
  'hsl(260, 70%, 55%)',    // Purple
  'hsl(270, 70%, 55%)',    // Violet
  'hsl(300, 60%, 50%)',    // Magenta
  'hsl(330, 70%, 55%)',    // Pink
  'hsl(340, 80%, 60%)',    // Rose
  'hsl(0, 0%, 50%)',       // Gray
];

export function getCategoryIcon(
  categoryName: string, 
  userCategories: { name: string; icon: string; color: string }[] = []
): string {
  // First check user custom categories
  const userCat = userCategories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (userCat) return userCat.icon;

  // Then check default icons
  const defaultCat = DEFAULT_CATEGORY_ICONS[categoryName];
  if (defaultCat) return defaultCat.icon;

  // Fallback
  return 'CircleDot';
}

export function getCategoryColor(
  categoryName: string, 
  userCategories: { name: string; icon: string; color: string }[] = []
): string {
  // First check user custom categories
  const userCat = userCategories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (userCat) return userCat.color;

  // Then check default colors
  const defaultCat = DEFAULT_CATEGORY_ICONS[categoryName];
  if (defaultCat) return defaultCat.color;

  // Fallback
  return 'hsl(var(--primary))';
}
