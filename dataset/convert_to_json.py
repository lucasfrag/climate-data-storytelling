import os
import pandas as pd
import json

base_dir = "./"
output_dir = "./"
os.makedirs(output_dir, exist_ok=True)

def extrair_metadados(caminho_csv):
    with open(caminho_csv, 'r', encoding='latin1') as f:
        linhas = [next(f) for _ in range(8)]

    def extrair_valor(linha):
        partes = linha.strip().split(';')
        return partes[1].strip() if len(partes) > 1 else ""

    return {
        "estacao": extrair_valor(linhas[2]),
        "codigo": extrair_valor(linhas[3]),
        "latitude": float(extrair_valor(linhas[4]).replace(",", ".")),
        "longitude": float(extrair_valor(linhas[5]).replace(",", ".")),
        "altitude": float(extrair_valor(linhas[6]).replace(",", "."))
    }

for ano in os.listdir(base_dir):
    ano_dir = os.path.join(base_dir, ano)
    if not os.path.isdir(ano_dir):
        continue

    dados_ano = []

    for arquivo in os.listdir(ano_dir):
        if arquivo.lower().endswith(".csv"):
            caminho_csv = os.path.join(ano_dir, arquivo)
            try:
                metadados = extrair_metadados(caminho_csv)

                df = pd.read_csv(
                    caminho_csv,
                    sep=";",
                    skiprows=8,
                    encoding="latin1",
                    na_values="-9999"
                )

                # Remove a última coluna (vazia) se existir
                if df.columns[-1].startswith("Unnamed"):
                    df = df.iloc[:, :-1]

                # Corrige valores decimais (troca vírgula por ponto)
                for col in df.columns:
                    if df[col].dtype == object:
                        df[col] = df[col].str.replace(',', '.', regex=False)
                        try:
                            df[col] = pd.to_numeric(df[col])
                        except:
                            pass

                for _, row in df.iterrows():
                    dados_ano.append({
                        **metadados,
                        "dados": row.dropna().to_dict()
                    })

            except Exception as e:
                print(f"Erro ao processar {caminho_csv}: {e}")

    json_path = os.path.join(output_dir, f"{ano}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(dados_ano, f, ensure_ascii=False, indent=2)

    print(f"[{ano}] JSON gerado com {len(dados_ano)} registros -> {json_path}")
