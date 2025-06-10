import os
import json

def parse_val(v):
    """Converte string para float e filtra valores inválidos."""
    try:
        v = str(v).replace(',', '.')
        val = float(v)
        return None if val == -9999 else val
    except:
        return None

def resumir_ano(ano, pasta_base="./dataset/"):
    pasta_ano = os.path.join(pasta_base, str(ano))
    if not os.path.isdir(pasta_ano):
        return None

    temp = []
    umi = []
    prec = []
    rad = []
    vento = []

    meta_temp = []
    meta_vento = []
    meta_rad = []

    for arquivo in os.listdir(pasta_ano):
        if not arquivo.endswith(".json"):
            continue
        caminho = os.path.join(pasta_ano, arquivo)
        with open(caminho, "r", encoding="utf-8") as f:
            try:
                estacoes = json.load(f)
            except json.JSONDecodeError:
                continue

        for estacao in estacoes:
            dados = estacao.get("dados")
            if not dados:
                continue

            nome_estacao = estacao.get("estacao", "Desconhecida")

            t = parse_val(dados.get("TEMPERATURA DO AR - BULBO SECO, HORARIA (°C)"))
            u = parse_val(dados.get("UMIDADE RELATIVA DO AR, HORARIA (%)"))
            p = parse_val(dados.get("PRECIPITAÇÃO TOTAL, HORÁRIO (mm)"))
            r = parse_val(dados.get("RADIACAO GLOBAL (KJ/m²)"))
            v = parse_val(dados.get("VENTO, RAJADA MAXIMA (m/s)"))

            if t is not None:
                temp.append(t)
                meta_temp.append((t, nome_estacao))
            if u is not None:
                umi.append(u)
            if p is not None:
                prec.append(p)
            if r is not None:
                rad.append(r)
                meta_rad.append((r, nome_estacao))
            if v is not None:
                vento.append(v)
                meta_vento.append((v, nome_estacao))

    if not temp or not umi:
        return None

    # Valores extremos com cidade
    temp_max, cidade_temp_max = max(meta_temp, default=(None, None))
    temp_min, cidade_temp_min = min(meta_temp, default=(None, None))
    rad_max, cidade_rad_max = max(meta_rad, default=(None, None))
    vento_max, cidade_vento_max = max(meta_vento, default=(None, None))

    return {
        "tempMin": temp_min,
        "cidadeTempMin": cidade_temp_min,
        "tempMax": temp_max,
        "cidadeTempMax": cidade_temp_max,
        "tempMedia": sum(temp) / len(temp),
        "umiMedia": sum(umi) / len(umi),
        "precipitacaoTotal": sum(prec),
        "radiacaoMax": rad_max,
        "cidadeRadiacaoMax": cidade_rad_max,
        "ventoRajadaMax": vento_max,
        "cidadeVentoRajadaMax": cidade_vento_max
    }

# Agregação de todos os anos
resumo_anual = {}
for ano in range(2000, 2026):
    dados = resumir_ano(ano)
    if dados:
        resumo_anual[ano] = dados

# Salvando o JSON resumido
with open("./resumo_anual.json", "w", encoding="utf-8") as f:
    json.dump(resumo_anual, f, indent=2, ensure_ascii=False)
