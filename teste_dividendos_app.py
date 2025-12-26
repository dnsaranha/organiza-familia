import streamlit as st
import yfinance as yf
import json
import pandas as pd
from datetime import datetime, timedelta

def get_asset_data_python(ticker_symbol, start_date, end_date):
    """
    Replica a lógica do AssetData usando Yahoo Finance em vez de IA.

    Args:
        ticker_symbol (str): Ex: 'PETR4.SA' ou 'AAPL'
        start_date (str): Formato 'YYYY-MM-DD'
        end_date (str): Formato 'YYYY-MM-DD'
    """
    try:
        # 1. Inicializa o Ticker
        ticker = yf.Ticker(ticker_symbol)

        # 2. Busca Informações Básicas (Nome, Moeda)
        # Tenta pegar info, se falhar usa defaults
        try:
            info = ticker.info
            asset_name = info.get('longName', info.get('shortName', ticker_symbol))
            currency = info.get('currency', 'BRL')
        except:
            asset_name = ticker_symbol
            currency = "N/A"

        # 3. Busca Histórico de Preços (OHLC)
        # O yfinance espera o end_date exclusive, então o dado vai até o dia anterior se não ajustarmos,
        # mas para fins gerais funciona bem.
        history = ticker.history(start=start_date, end=end_date)

        if history.empty:
            return {
                "error": f"Não foram encontrados dados para {ticker_symbol} neste período."
            }

        # Formata o histórico de preços para a lista de objetos esperada
        price_history = []
        for date_idx, row in history.iterrows():
            price_history.append({
                "date": date_idx.strftime('%Y-%m-%d'),
                "price": round(float(row['Close']), 2)
            })

        # 4. Busca e Filtra Dividendos
        dividends_series = ticker.dividends

        # Converte strings de data para objetos datetime para comparação
        # Precisamos garantir que temos timezone ou remover, dependendo do indice do pandas
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')

        # Ajuste de timezone se necessário. O indice do yfinance geralmente tem timezone.
        if not dividends_series.empty:
            if dividends_series.index.tz is not None:
                start_dt = start_dt.replace(tzinfo=dividends_series.index.tz)
                end_dt = end_dt.replace(tzinfo=dividends_series.index.tz)
            else:
                # Se o index nao tem tz, deixamos naive
                pass

        # Filtra no intervalo
        mask = (dividends_series.index >= start_dt) & (dividends_series.index <= end_dt)
        filtered_dividends = dividends_series.loc[mask]

        dividend_history = []
        total_dividends = 0.0

        for date_idx, value in filtered_dividends.items():
            val = float(value)
            dividend_history.append({
                "date": date_idx.strftime('%Y-%m-%d'),
                "dividend": val
            })
            total_dividends += val

        # 5. Cálculos Finais
        current_price = price_history[-1]['price'] if price_history else 0.0

        # Cria um resumo automático (substituindo a IA)
        summary = (
            f"Análise de {asset_name} ({currency}). "
            f"No período de {start_date} a {end_date}, o ativo fechou a {current_price:.2f} "
            f"e pagou um total de {total_dividends:.2f} em dividendos."
        )

        # 6. Monta o Objeto Final (AssetData)
        asset_data = {
            "assetName": asset_name,
            "ticker": ticker_symbol.upper(),
            "currency": currency,
            "priceHistory": price_history,
            "dividendHistory": dividend_history,
            "summary": summary,
            "currentPrice": current_price,
            "totalDividends": round(total_dividends, 2)
        }

        return json.dumps(asset_data, indent=2, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"summary": f"Erro ao processar dados: {str(e)}"}, ensure_ascii=False)

# --- Streamlit App ---
st.set_page_config(page_title="Teste de Dividendos", layout="wide")

st.title("Teste de Visualização de Dividendos")
st.markdown("Insira o ticker do ativo para visualizar o preço atual e o histórico de dividendos.")

col1, col2, col3 = st.columns(3)

with col1:
    ticker_input = st.text_input("Ticker do Ativo", value="PETR4.SA")

with col2:
    start_date_input = st.date_input("Data Inicial", value=datetime.now() - timedelta(days=365))

with col3:
    end_date_input = st.date_input("Data Final", value=datetime.now())

if st.button("Buscar Dados"):
    with st.spinner(f"Buscando dados para {ticker_input}..."):
        # Converter datas para string formato YYYY-MM-DD
        s_date = start_date_input.strftime('%Y-%m-%d')
        e_date = end_date_input.strftime('%Y-%m-%d')

        result_json = get_asset_data_python(ticker_input, s_date, e_date)
        data = json.loads(result_json)

        if "error" in data:
            st.error(data["error"])
        elif "summary" in data and "assetName" not in data:
             # Caso de erro capturado no except
             st.error(data["summary"])
        else:
            st.success("Dados carregados com sucesso!")

            # Exibir Resumo
            st.subheader(f"{data['assetName']} ({data['ticker']})")
            st.metric("Preço Atual", f"{data['currency']} {data['currentPrice']:.2f}")
            st.metric("Total Dividendos no Período", f"{data['currency']} {data['totalDividends']:.2f}")
            st.info(data['summary'])

            # Exibir Gráficos e Tabelas
            col_hist, col_div = st.columns(2)

            with col_hist:
                st.subheader("Histórico de Preços")
                if data['priceHistory']:
                    df_price = pd.DataFrame(data['priceHistory'])
                    st.line_chart(df_price.set_index("date")['price'])
                    with st.expander("Ver dados brutos de preço"):
                        st.dataframe(df_price)
                else:
                    st.write("Sem histórico de preços.")

            with col_div:
                st.subheader("Histórico de Dividendos")
                if data['dividendHistory']:
                    df_div = pd.DataFrame(data['dividendHistory'])
                    # Gráfico de barras para dividendos
                    st.bar_chart(df_div.set_index("date")['dividend'])
                    with st.expander("Ver dados brutos de dividendos"):
                        st.dataframe(df_div)
                else:
                    st.write("Sem dividendos no período.")

            # JSON Raw
            with st.expander("Ver JSON de Retorno Completo"):
                st.json(data)
