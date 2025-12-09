import React, { useState, useEffect, useCallback } from 'react';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface TickerSearchProps {
  value: string;
  onValueChange: (search: string) => void;
  onSelect: (ticker: { symbol: string; name: string }) => void;
}

interface Ticker {
  symbol: string;
  name: string;
}

export function TickerSearch({ value, onValueChange, onSelect }: TickerSearchProps) {
  const [results, setResults] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedSearch = useDebounce(value, 300);

  const fetchTickers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('yfinance-search', {
        body: { query },
      });

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Error fetching tickers:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      fetchTickers(debouncedSearch);
    } else {
      setResults([]);
    }
  }, [debouncedSearch, fetchTickers]);

  const handleSelect = (ticker: Ticker) => {
    onSelect(ticker);
    setIsOpen(false); // Close the list after selection
  };
  
  const handleInputBlur = () => {
    // Delay closing to allow a click on a CommandItem to register
    setTimeout(() => {
        setIsOpen(false);
    }, 200);
  };

  return (
    <div className="relative">
      <Command className="overflow-visible">
        <CommandInput
          placeholder="Digite para buscar um ativo..."
          value={value}
          onValueChange={onValueChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
        />
      </Command>
      {isOpen && value.length > 0 && (
        <CommandList className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {loading && <CommandEmpty>Buscando...</CommandEmpty>}
          {!loading && results.length === 0 && debouncedSearch.length > 1 && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}
          {results.map((ticker) => (
            <CommandItem
              key={ticker.symbol}
              onSelect={() => handleSelect(ticker)}
              value={ticker.symbol}
              className="cursor-pointer hover:bg-accent"
            >
              <div className="flex justify-between w-full">
                <span className="font-bold">{ticker.symbol}</span>
                <span className="text-muted-foreground truncate ml-2">{ticker.name}</span>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      )}
    </div>
  );
}
