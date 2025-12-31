import { useState, useCallback } from 'react';

export const useCurrencyInput = (initialValue: number = 0) => {
  // Store the value as an integer representing cents
  // e.g. 1234 -> R$ 12,34
  const [cents, setCents] = useState<number>(Math.round(initialValue * 100));

  const formatValue = (centsValue: number): string => {
    if (isNaN(centsValue)) return '0,00';
    const value = centsValue / 100;
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Remove all non-numeric characters
    const digits = inputValue.replace(/\D/g, '');

    // Parse to integer (handle empty string)
    const newCents = parseInt(digits, 10) || 0;

    setCents(newCents);
  }, []);

  const setValue = useCallback((value: number) => {
    setCents(Math.round(value * 100));
  }, []);

  return {
    displayValue: formatValue(cents),
    numericValue: cents / 100,
    handleChange,
    setValue,
  };
};
