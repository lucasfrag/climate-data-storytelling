import os
import json
from datetime import datetime

PASTA_CSV = "../dataset/"
ARQUIVO_SAIDA = "../dataset/estacoes.json"

def extrair_valor(linha):
    partes = linha.strip().split(";")
    return partes[1].strip() if len(partes) > 1 else ""

def padronizar_data(data_str):
    formatos = ["%Y-%m-%d", "%d/%m/%y", "%d/%m/%Y"]
    for fmt in formatos:
        try:
            data = datetime.strptime(data_str.strip('"'), fmt)
            return data.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return ""  # Retorna vazio se não for possível converter

def extrair_metadados(caminho_csv):
    with open(caminho_csv, "r", encoding="latin1") as f:
        linhas = [next(f) for _ in range(8)]

    data_original = extrair_valor(linhas[7])
    data_fundacao = padronizar_data(data_original)

    return {
        "arquivo": os.path.basename(caminho_csv),
        "regiao": extrair_valor(linhas[0]),
        "uf": extrair_valor(linhas[1]),
        "estacao": extrair_valor(linhas[2]),
        "codigo": extrair_valor(linhas[3]),
        "latitude": float(extrair_valor(linhas[4]).replace(",", ".")),
        "longitude": float(extrair_valor(linhas[5]).replace(",", ".")),
        "altitude": float(extrair_valor(linhas[6]).replace(",", ".")),
        "data_fundacao": data_fundacao
    }

def carregar_estacoes_existentes(arquivo_saida):
    if os.path.exists(arquivo_saida):
        with open(arquivo_saida, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def salvar_estacoes(estacoes, arquivo_saida):
    with open(arquivo_saida, "w", encoding="utf-8") as f:
        json.dump(estacoes, f, indent=2, ensure_ascii=False)

def processar_estacoes(pasta_csv, arquivo_saida):
    estacoes = carregar_estacoes_existentes(arquivo_saida)
    codigos_existentes = {e["codigo"] for e in estacoes}

    novos_registros = 0
    for root, _, files in os.walk(pasta_csv):
        for nome_arquivo in files:
            if nome_arquivo.lower().endswith(".csv"):
                caminho = os.path.join(root, nome_arquivo)
                try:
                    dados = extrair_metadados(caminho)
                    if dados["codigo"] not in codigos_existentes:
                        estacoes.append(dados)
                        codigos_existentes.add(dados["codigo"])
                        novos_registros += 1
                        print(f"➕ Adicionado: {dados['codigo']} - {dados['estacao']}")
                    else:
                        print(f"⏩ Ignorado (já existe): {dados['codigo']} - {dados['estacao']}")
                except Exception as e:
                    print(f"⚠️ Erro ao processar {nome_arquivo}: {e}")

    salvar_estacoes(estacoes, arquivo_saida)
    print(f"\n✅ Total de estações: {len(estacoes)} | Novas adicionadas: {novos_registros}")

if __name__ == "__main__":
    processar_estacoes(PASTA_CSV, ARQUIVO_SAIDA)
