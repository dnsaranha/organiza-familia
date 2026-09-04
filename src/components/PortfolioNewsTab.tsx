import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  PortfolioNewsItem, 
  getPortfolioNews 
} from "@/lib/b3/newsService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Newspaper, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  AlertCircle, 
  Coins, 
  TrendingUp, 
  Globe, 
  Star,
  CheckCircle2,
  Clock
} from "lucide-react";

interface PortfolioNewsTabProps {
  assets: Array<{
    ticker: string;
    name?: string;
    shares?: number;
    currentPrice?: number;
  }>;
}

type FilterType = "all" | "portfolio" | "fato-relevante" | "provento" | "resultado";

export const PortfolioNewsTab = ({ assets }: PortfolioNewsTabProps) => {
  const [news, setNews] = useState<PortfolioNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("portfolio");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Extract clean tickers from user portfolio
  const portfolioTickers = useMemo(() => {
    if (!Array.isArray(assets)) return [];
    return Array.from(
      new Set(
        assets
          .map((a) => a.ticker?.replace(".SA", "").toUpperCase().trim())
          .filter(Boolean)
      )
    );
  }, [assets]);

  const loadNews = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await getPortfolioNews(portfolioTickers, forceRefresh);
      setNews(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Erro ao carregar notícias da carteira:", err);
    } finally {
      setLoading(false);
    }
  }, [portfolioTickers]);

  useEffect(() => {
    loadNews(false);
  }, [loadNews]);

  // Adjust initial filter: if no portfolio assets, default to "all"
  useEffect(() => {
    if (portfolioTickers.length === 0 && selectedFilter === "portfolio") {
      setSelectedFilter("all");
    }
  }, [portfolioTickers, selectedFilter]);

  // Calculate stats for badges
  const portfolioNewsCount = useMemo(() => {
    return news.filter((item) => item.isPortfolioAsset).length;
  }, [news]);

  const fatosRelevantesCount = useMemo(() => {
    return news.filter((item) => item.category === "fato-relevante").length;
  }, [news]);

  const proventosCount = useMemo(() => {
    return news.filter((item) => item.category === "provento").length;
  }, [news]);

  // Filtered news list
  const filteredNews = useMemo(() => {
    let result = [...news];

    // Filter by specific ticker button if selected
    if (selectedTicker) {
      result = result.filter(
        (item) =>
          item.matchedTickers.includes(selectedTicker) ||
          item.title.toUpperCase().includes(selectedTicker) ||
          item.description.toUpperCase().includes(selectedTicker)
      );
    } else {
      // Filter by category / portfolio
      if (selectedFilter === "portfolio") {
        result = result.filter((item) => item.isPortfolioAsset);
      } else if (selectedFilter === "fato-relevante") {
        result = result.filter((item) => item.category === "fato-relevante");
      } else if (selectedFilter === "provento") {
        result = result.filter((item) => item.category === "provento");
      } else if (selectedFilter === "resultado") {
        result = result.filter((item) => item.category === "resultado");
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.matchedTickers.some((t) => t.toLowerCase().includes(q)) ||
          item.source.toLowerCase().includes(q)
      );
    }

    return result;
  }, [news, selectedFilter, selectedTicker, searchQuery]);

  const formatRelativeTime = (timestamp: number, dateStr: string) => {
    if (!timestamp || isNaN(timestamp)) return dateStr || "";
    const now = Date.now();
    const diffMinutes = Math.floor((now - timestamp) / 60000);

    if (diffMinutes < 1) return "Agora mesmo";
    if (diffMinutes < 60) return `Há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;

    try {
      return new Date(timestamp).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryBadge = (category: PortfolioNewsItem["category"]) => {
    switch (category) {
      case "fato-relevante":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-medium">
            <AlertCircle className="h-3 w-3" />
            Fato Relevante
          </Badge>
        );
      case "provento":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-medium">
            <Coins className="h-3 w-3" />
            Proventos & JCP
          </Badge>
        );
      case "resultado":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-medium">
            <TrendingUp className="h-3 w-3" />
            Resultados
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] font-medium">
            Mercado
          </Badge>
        );
    }
  };

  return (
    <div id="portfolio-news-container" className="space-y-6">
      {/* Header card with didactic, clean layout */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Newspaper className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold">
                    Notícias & Fatos Relevantes
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Atualizações, comunicados oficiais e dividendos dos ativos da sua carteira (sem custo adicional).
                  </CardDescription>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {lastUpdated && (
                <div className="flex items-center text-xs text-muted-foreground gap-1 hidden md:flex">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <Button
                id="btn-refresh-news"
                variant="outline"
                size="sm"
                onClick={() => loadNews(true)}
                disabled={loading}
                className="gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Search bar & quick filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input-news-search"
                placeholder="Buscar por notícia, empresa ou ticker (ex: PETR4, MXRF11, dividendo)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm h-10 bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {portfolioTickers.length > 0 && (
              <Button
                id="filter-portfolio"
                variant={selectedFilter === "portfolio" && !selectedTicker ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedFilter("portfolio");
                  setSelectedTicker(null);
                }}
                className="h-8 text-xs gap-1.5 rounded-full"
              >
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>Minha Carteira</span>
                {portfolioNewsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-semibold">
                    {portfolioNewsCount}
                  </span>
                )}
              </Button>
            )}

            <Button
              id="filter-fatos-relevantes"
              variant={selectedFilter === "fato-relevante" && !selectedTicker ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedFilter("fato-relevante");
                setSelectedTicker(null);
              }}
              className="h-8 text-xs gap-1.5 rounded-full"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Fatos Relevantes</span>
              {fatosRelevantesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-semibold">
                  {fatosRelevantesCount}
                </span>
              )}
            </Button>

            <Button
              id="filter-proventos"
              variant={selectedFilter === "provento" && !selectedTicker ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedFilter("provento");
                setSelectedTicker(null);
              }}
              className="h-8 text-xs gap-1.5 rounded-full"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>Proventos & JCP</span>
              {proventosCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-semibold">
                  {proventosCount}
                </span>
              )}
            </Button>

            <Button
              id="filter-all"
              variant={selectedFilter === "all" && !selectedTicker ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedFilter("all");
                setSelectedTicker(null);
              }}
              className="h-8 text-xs gap-1.5 rounded-full"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Todo o Mercado</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-semibold">
                {news.length}
              </span>
            </Button>
          </div>

          {/* Quick ticker filter buttons if user has portfolio assets */}
          {portfolioTickers.length > 0 && (
            <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-muted-foreground whitespace-nowrap text-[11px] font-medium mr-1">
                Filtrar por ativo:
              </span>
              {portfolioTickers.map((ticker) => {
                const countForTicker = news.filter(
                  (n) => n.matchedTickers.includes(ticker) || n.title.includes(ticker)
                ).length;
                const isSelected = selectedTicker === ticker;

                return (
                  <Button
                    key={ticker}
                    variant={isSelected ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTicker(null);
                      } else {
                        setSelectedTicker(ticker);
                      }
                    }}
                    className={`h-7 px-2.5 text-xs rounded-md transition-colors ${
                      isSelected ? "font-bold border border-primary/40 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span>{ticker}</span>
                    {countForTicker > 0 && (
                      <span className="ml-1 text-[10px] opacity-75">({countForTicker})</span>
                    )}
                  </Button>
                );
              })}
              {selectedTicker && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTicker(null)}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  Limpar ativo
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* News Feed List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 space-y-3 border-border/60">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24 ml-auto" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <Card className="p-8 text-center space-y-4 border-dashed">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Newspaper className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-semibold text-base">Nenhuma notícia encontrada</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchQuery
                  ? `Nenhum resultado corresponde à busca "${searchQuery}". Tente outros termos ou remova filtros.`
                  : selectedFilter === "portfolio"
                  ? "Ainda não encontramos notícias recentes específicas para os ativos cadastrados no momento. Veja as notícias gerais do mercado."
                  : "Não há notícias disponíveis para o filtro selecionado no momento."}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              {(searchQuery || selectedTicker || selectedFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTicker(null);
                    setSelectedFilter("all");
                  }}
                  className="text-xs"
                >
                  Ver todas as notícias do mercado
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredNews.map((item) => {
              const hasPortfolioTicker = item.matchedTickers.some((t) =>
                portfolioTickers.includes(t)
              );

              return (
                <Card
                  key={item.id}
                  className={`transition-all hover:border-primary/40 hover:shadow-sm ${
                    hasPortfolioTicker ? "border-l-4 border-l-primary bg-primary/[0.01]" : "border-border/60"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-2.5">
                    {/* Header row: Badges, tickers, relative date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Matched tickers tags */}
                        {item.matchedTickers.map((ticker) => {
                          const isUserAsset = portfolioTickers.includes(ticker);
                          return (
                            <Badge
                              key={ticker}
                              variant={isUserAsset ? "default" : "secondary"}
                              className={`text-[11px] px-2 py-0.5 font-bold ${
                                isUserAsset
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {ticker}
                              {isUserAsset && (
                                <span className="ml-1 text-[9px] font-normal opacity-90 hidden sm:inline">
                                  (Sua carteira)
                                </span>
                              )}
                            </Badge>
                          );
                        })}

                        {/* Category badge */}
                        {getCategoryBadge(item.category)}
                      </div>

                      {/* Source & Timestamp */}
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] ml-auto">
                        <span className="font-medium text-foreground/80">{item.source}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(item.timestamp, item.pubDate)}</span>
                      </div>
                    </div>

                    {/* News Title */}
                    <h3 className="text-sm sm:text-base font-semibold leading-snug text-foreground hover:text-primary transition-colors">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-start justify-between gap-2 group"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                      </a>
                    </h3>

                    {/* News excerpt / description */}
                    {item.description && item.description !== item.title && (
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Footer with direct link */}
                    <div className="pt-1 flex items-center justify-between">
                      {hasPortfolioTicker && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ativo presente na sua carteira
                        </span>
                      )}

                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium ml-auto"
                      >
                        <span>Ler matéria completa</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioNewsTab;
