# Salve este conteúdo como processar_dados.py e execute com: python processar_dados.py

import os
import json
import pandas as pd
import unicodedata
import re
from pathlib import Path
import numpy as np

# === CONFIGURAÇÕES ===
PASTA_DATASET = Path("../dataset/")
ARQUIVO_SAIDA = Path("../data/resumo_visualizacoes.json")

# === FUNÇÕES AUXILIARES ===
def normalizar_coluna(col):
    col = unicodedata.normalize('NFKD', col).encode('ASCII', 'ignore').decode('ASCII')
    col = re.sub(r'[^a-zA-Z0-9_]', '_', col)
    col = re.sub(r'_+', '_', col)
    return col.lower().strip('_')

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

def nome_contem_porto_alegre(caminho):
    nome = unicodedata.normalize('NFKD', caminho.name).encode('ASCII', 'ignore').decode('ASCII').lower()
    return "porto alegre" in nome

def contem_estacao(linha):
    linha_normalizada = unicodedata.normalize('NFKD', linha).encode('ASCII', 'ignore').decode('ASCII').upper()
    return "ESTACAO" in linha_normalizada

def dias_consecutivos_chuva(series, threshold=1.0):
    chuva = series.fillna(0) >= threshold
    grupos = (chuva != chuva.shift()).cumsum()
    return chuva.groupby(grupos).sum().max()

# === VARIÁVEIS-CHAVE ===
ALVO_COLUNAS = {
    'precipitacao_total_horario_mm': 'precipitacao',
    'pressao_atmosferica_ao_nivel_da_estacao_horaria_mb': 'pressao',
    'radiacao_global_kj_m2': 'radiacao',
    'temperatura_do_ar_bulbo_seco_horaria_c': 'temperatura',
    'temperatura_do_ponto_de_orvalho_c': 'ponto_orvalho',
    'umidade_relativa_do_ar_horaria': 'umidade',
    'vento_velocidade_horaria_m_s': 'vento'
}

# === PROCESSAMENTO ===
resumo = {}

for caminho in PASTA_DATASET.rglob("*.CSV"):
    if not nome_contem_porto_alegre(caminho):
        continue

    try:
        with open(caminho, "r", encoding="latin1") as f:
            linhas = f.readlines()

        estacao = "desconhecida"
        for linha in linhas:
            if contem_estacao(linha):
                estacao = linha.split(";")[1].strip().replace(" ", "_").replace("-", "").upper()
                break

        df = pd.read_csv(caminho, sep=";", encoding="latin1", skiprows=8)
        df.columns = [normalizar_coluna(c) for c in df.columns]

        for col in ALVO_COLUNAS:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(",", ".").str.strip()
                df[col] = pd.to_numeric(df[col], errors="coerce")
                df.loc[df[col] == -9999, col] = np.nan

        col_data = next((c for c in df.columns if 'data' in c), df.columns[0])
        df[col_data] = df[col_data].astype(str).str.strip()
        df['data'] = pd.to_datetime(df[col_data], errors="coerce", dayfirst=True)
        df['ano'] = df['data'].dt.year
        df['mes'] = df['data'].dt.month
        df['dia'] = df['data'].dt.date

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
                            'soma': round(serie.sum(), 2),
                            'desvio_padrao': round(serie.std(), 2)
                        }

                        if alias == 'temperatura':
                            idx_max = grupo[col].idxmax()
                            idx_min = grupo[col].idxmin()
                            if pd.notna(idx_max) and pd.notna(idx_min):
                                resumo[ano_str][estacao]['extremos'] = {
                                    'dia_temp_max': grupo.loc[idx_max, 'data'],
                                    'dia_temp_min': grupo.loc[idx_min, 'data']
                                }

                            grupo_dia = grupo.groupby('dia')[col].agg(['max', 'min'])
                            grupo_dia['amplitude'] = grupo_dia['max'] - grupo_dia['min']
                            resumo[ano_str][estacao]['amplitude_termica'] = round(grupo_dia['amplitude'].mean(), 2)

                            dias_quentes = grupo[grupo[col] > 35.0]['dia'].nunique()
                            resumo[ano_str][estacao]['dias_quentes'] = int(dias_quentes)

                    if alias == 'umidade':
                        dias_secos = grupo[grupo[col] < 30.0]['dia'].nunique()
                        resumo[ano_str][estacao]['dias_secos'] = int(dias_secos)

            if 'precipitacao_total_horario_mm' in grupo.columns:
                prec_mes = grupo.groupby('mes')['precipitacao_total_horario_mm'].sum(min_count=1)
                resumo[ano_str][estacao]['precipitacao_mensal'] = {
                    f"{int(mes):02d}": round(valor, 2) for mes, valor in prec_mes.items()
                }

                dias_chuvosos = grupo.groupby('dia')['precipitacao_total_horario_mm'].sum()
                max_consec = dias_consecutivos_chuva(dias_chuvosos)
                resumo[ano_str][estacao]['chuva_consecutiva'] = int(max_consec)

                chuvas_intensas = grupo[grupo['precipitacao_total_horario_mm'] > 50.0]['dia'].nunique()
                resumo[ano_str][estacao]['chuvas_intensas'] = int(chuvas_intensas)

    except Exception as e:
        print(f"❌ Erro em {caminho.name}: {e}")

# === SALVAR ARQUIVO ===
ARQUIVO_SAIDA.parent.mkdir(parents=True, exist_ok=True)
with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f:
    json.dump(resumo, f, ensure_ascii=False, indent=2, default=convert)

print(f"✅ Resumo salvo em: {ARQUIVO_SAIDA.resolve()}")
