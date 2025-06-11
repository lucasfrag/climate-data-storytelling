import os
import json
import pandas as pd
import unicodedata
import re
from pathlib import Path
import numpy as np

# Caminhos
PASTA_DATASET = Path("../dataset/")
ARQUIVO_SAIDA = Path("../data/resumo_visualizacoes.json")

# Normalização de nomes de colunas
def normalizar_coluna(col):
    col = unicodedata.normalize('NFKD', col).encode('ASCII', 'ignore').decode('ASCII')
    col = re.sub(r'[^a-zA-Z0-9_]', '_', col)
    col = re.sub(r'_+', '_', col)
    return col.lower().strip('_')

# Colunas-alvo e seus aliases
ALVO_COLUNAS = {
    'precipitacao_total_horario_mm': 'precipitacao',
    'pressao_atmosferica_ao_nivel_da_estacao_horaria_mb': 'pressao',
    'radiacao_global_kj_m2': 'radiacao',
    'temperatura_do_ar_bulbo_seco_horaria_c': 'temperatura',
    'temperatura_do_ponto_de_orvalho_c': 'ponto_orvalho',
    'umidade_relativa_do_ar_horaria': 'umidade',
    'vento_velocidade_horaria_m_s': 'vento'
}

# Conversor para JSON
def convert(obj):
    if isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    elif isinstance(obj, (pd.Timestamp,)):
        return obj.strftime('%Y-%m-%d')
    return obj

# Verifica se "porto alegre" aparece no nome
def nome_contem_porto_alegre(caminho):
    nome = unicodedata.normalize('NFKD', caminho.name).encode('ASCII', 'ignore').decode('ASCII').lower()
    return "porto alegre" in nome

# Verifica se a linha contém a palavra "estacao"
def contem_estacao(linha):
    linha_normalizada = unicodedata.normalize('NFKD', linha).encode('ASCII', 'ignore').decode('ASCII').upper()
    return "ESTACAO" in linha_normalizada

resumo = {}

# Itera pelos arquivos CSV
for caminho in PASTA_DATASET.rglob("*.CSV"):
    if not nome_contem_porto_alegre(caminho):
        continue

    try:
        with open(caminho, "r", encoding="latin1") as f:
            linhas = f.readlines()

        # Extrai nome da estação
        estacao = "desconhecida"
        for linha in linhas:
            if contem_estacao(linha):
                estacao = linha.split(";")[1].strip().replace(" ", "_").replace("-", "").upper()
                break

        # Lê os dados pulando cabeçalho
        df = pd.read_csv(caminho, sep=";", encoding="latin1", skiprows=8)
        df.columns = [normalizar_coluna(c) for c in df.columns]

        # Converte colunas numéricas
        for col in ALVO_COLUNAS:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(",", ".").str.strip()
                df[col] = pd.to_numeric(df[col], errors="coerce")
                df.loc[df[col] == -9999, col] = np.nan

        # Converte data
        col_data = next((c for c in df.columns if 'data' in c), df.columns[0])
        df[col_data] = df[col_data].astype(str).str.strip()
        df['data'] = pd.to_datetime(df[col_data], errors="coerce", dayfirst=True)
        df['ano'] = df['data'].dt.year

        # Agrega por ano e estação
        for ano, grupo in df.groupby('ano'):
            if pd.isna(ano):
                continue
            ano_str = str(int(ano))
            resumo.setdefault(ano_str, {}).setdefault(estacao, {})

            for col, alias in ALVO_COLUNAS.items():
                if col in grupo.columns:
                    serie = grupo[col].dropna()
                    if not serie.empty:
                        resumo[ano_str][estacao][alias] = {
                            'media': round(serie.mean(), 2),
                            'max': round(serie.max(), 2),
                            'min': round(serie.min(), 2),
                            'soma': round(serie.sum(), 2)
                        }

            # Adiciona extremos de temperatura por dia
            col_temp = 'temperatura_do_ar_bulbo_seco_horaria_c'
            if col_temp in grupo.columns and 'data' in grupo.columns:
                temp_grupo = grupo[['data', col_temp]].dropna()
                if not temp_grupo.empty:
                    idx_max = temp_grupo[col_temp].idxmax()
                    idx_min = temp_grupo[col_temp].idxmin()
                    resumo[ano_str][estacao]["extremos"] = {
                        "dia_temp_max": convert(temp_grupo.loc[idx_max, 'data']),
                        "temp_max": round(temp_grupo.loc[idx_max, col_temp], 2),
                        "dia_temp_min": convert(temp_grupo.loc[idx_min, 'data']),
                        "temp_min": round(temp_grupo.loc[idx_min, col_temp], 2)
                    }

    except Exception as e:
        print(f"❌ Erro em {caminho.name}: {e}")

# Salva o arquivo JSON final
ARQUIVO_SAIDA.parent.mkdir(parents=True, exist_ok=True)
with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
    json.dump(resumo, f, ensure_ascii=False, indent=2, default=convert)

print(f"✅ Resumo salvo em: {ARQUIVO_SAIDA.resolve()}")
