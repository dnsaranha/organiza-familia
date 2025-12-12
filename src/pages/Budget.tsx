
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PieChart as RechartPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Label } from "@/components/ui/label";

const initialBudgetCategories = [
  { name: "Liberdade Financeira", value: 25, color: "#8884d8" },
  { name: "Custos Fixos", value: 30, color: "#82ca9d" },
  { name: "Conforto", value: 15, color: "#ffc658" },
  { name: "Metas", value: 15, color: "#ff8042" },
  { name: "Prazeres", value: 10, color: "#00C49F" },
  { name: "Conhecimento", value: 5, color: "#FFBB28" },
];

const BudgetPage = () => {
  const [categories, setCategories] = useState(initialBudgetCategories);

  const handleSliderChange = (index: number, newValue: number[]) => {
    const updatedCategories = [...categories];
    updatedCategories[index].value = newValue[0];
    setCategories(updatedCategories);
  };

  const total = categories.reduce((acc, cat) => acc + cat.value, 0);

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metas</h1>
        <p className="text-muted-foreground text-sm">
          Aqui você pode visualizar todas suas metas
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna da Esquerda - Gráfico */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visualização de uso</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <RechartPieChart>
                    <Pie
                        data={categories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                    >
                        {categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                </RechartPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coluna da Direita - Controles */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Controle de Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categories.map((category, index) => (
              <div key={category.name}>
                <div className="flex justify-between mb-2">
                    <Label>{category.name}</Label>
                    <span className="text-sm text-muted-foreground">{category.value}%</span>
                </div>
                <Slider
                  value={[category.value]}
                  onValueChange={(newValue) => handleSliderChange(index, newValue)}
                  max={100}
                  step={1}
                />
              </div>
            ))}
            <div className="flex justify-end gap-4 mt-6">
                 <Button variant="outline">Resetar Valores</Button>
                 <Button>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BudgetPage;
