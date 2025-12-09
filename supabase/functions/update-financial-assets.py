
import os
import yfinance as yf
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from typing import List, Dict, Any

# Configuração do logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Carrega variáveis de ambiente de um arquivo .env se existir
load_dotenv()

# --- Configuração do Cliente Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
# Use a SERVICE_ROLE_KEY para ter permissões de escrita e de chamar funções SECURITY DEFINER
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logging.error("As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
# --- Fim da Configuração ---


def get_unique_tickers() -> List[str]:
    """
    Busca no banco de dados a lista de tickers únicos a partir das transações de investimento
    e dos ativos já existentes.
    """
    try:
        logging.info("Buscando tickers únicos no banco de dados...")
        response = supabase.rpc('get_unique_tickers', {}).execute()
        if response.data:
            tickers = [item['ticker'] for item in response.data if item['ticker']]
            # Adiciona ".SA" aos tickers que não o possuem para o padrão do Yahoo Finance
            formatted_tickers = [t if '.SA' in t.upper() else f'{t}.SA' for t in tickers]
            logging.info(f"{len(formatted_tickers)} tickers encontrados: {formatted_tickers}")
            return formatted_tickers
        return []
    except Exception as e:
        logging.error(f"Erro ao buscar tickers: {e}")
        return []

def fetch_yfinance_data(tickers: List[str]) -> Dict[str, Any]:
    """
    Busca os dados de múltiplos tickers usando a biblioteca yfinance.
    """
    if not tickers:
        logging.warning("Nenhum ticker fornecido para busca.")
        return {}
    
    logging.info(f"Buscando dados no Yahoo Finance para {len(tickers)} tickers...")
    try:
        # A busca em lote é mais eficiente
        data = yf.Tickers(tickers)
        return data.tickers
    except Exception as e:
        logging.error(f"Erro ao buscar dados no yfinance: {e}")
        return {}

def format_data_for_upsert(yfinance_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Formata os dados brutos do yfinance para o formato esperado pela função
    'bulk_upsert_assets' do Supabase.
    """
    assets_to_upsert = []
    logging.info("Formatando dados para o banco de dados...")

    for ticker_symbol, ticker_data in yfinance_data.items():
        try:
            info = ticker_data.info
            
            # Pula tickers que não retornaram dados válidos
            if not info or info.get('trailingPegRatio') is None:
                logging.warning(f"Dados incompletos ou não encontrados para {ticker_symbol}. Pulando.")
                continue

            # Busca de histórico de preços e dividendos
            hist = ticker_data.history(period="1y")
            price_history = []
            if not hist.empty:
                hist_reset = hist.reset_index()
                price_history = [
                    {"date": row['Date'].isoformat(), "price": row['Close']}
                    for index, row in hist_reset.iterrows()
                ]

            dividends = ticker_data.dividends
            dividend_history = []
            if not dividends.empty:
                div_reset = dividends.reset_index()
                dividend_history = [
                    {"date": row['Date'].isoformat(), "amount": row['Dividends']}
                    for index, row in div_reset.iterrows()
                ]

            asset = {
                "ticker": ticker_symbol.replace(".SA", ""), # Remove o .SA antes de salvar
                "name": info.get('longName'),
                "sector": info.get('sector'),
                "current_price": info.get('currentPrice') or info.get('previousClose'),
                "dividends_12m": info.get('dividendYield', 0) * 100, # yfinance retorna como decimal
                "price_history": price_history,
                "dividend_history": dividend_history,
            }
            assets_to_upsert.append(asset)
        except Exception as e:
            logging.error(f"Erro ao processar dados para o ticker {ticker_symbol}: {e}")

    logging.info(f"{len(assets_to_upsert)} ativos formatados para upsert.")
    return assets_to_upsert

def upsert_assets_to_supabase(assets_data: List[Dict[str, Any]]):
    """
    Envia os dados formatados para a função 'bulk_upsert_assets' do Supabase.
    """
    if not assets_data:
        logging.warning("Nenhum dado de ativo para enviar ao Supabase.")
        return

    try:
        logging.info(f"Enviando {len(assets_data)} ativos para o Supabase...")
        supabase.rpc('bulk_upsert_assets', {'assets_data': assets_data}).execute()
        logging.info("Dados dos ativos atualizados com sucesso no Supabase!")
    except Exception as e:
        logging.error(f"Erro ao fazer upsert dos dados no Supabase: {e}")


if __name__ == "__main__":
    logging.info("--- Iniciando script de atualização de ativos financeiros ---")
    
    # 1. Obter a lista de tickers
    tickers_to_fetch = get_unique_tickers()
    
    if tickers_to_fetch:
        # 2. Buscar os dados no Yahoo Finance
        yfinance_data = fetch_yfinance_data(tickers_to_fetch)
        
        if yfinance_data:
            # 3. Formatar os dados
            formatted_data = format_data_for_upsert(yfinance_data)
            
            # 4. Enviar para o Supabase
            upsert_assets_to_supabase(formatted_data)
    
    logging.info("--- Script finalizado ---")
