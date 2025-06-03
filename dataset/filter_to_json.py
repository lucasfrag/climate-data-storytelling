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

def resumir_ano(ano, pasta_base="./"):
    pasta_ano = os.path.join(pasta_base, str(ano))
    if not os.path.isdir(pasta_ano):
        return None

    temp = []
    umi = []
    prec = []
    rad = []
    vento = []

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

            t = parse_val(dados.get("TEMPERATURA DO AR - BULBO SECO, HORARIA (°C)"))
            u = parse_val(dados.get("UMIDADE RELATIVA DO AR, HORARIA (%)"))
            p = parse_val(dados.get("PRECIPITAÇÃO TOTAL, HORÁRIO (mm)"))
            r = parse_val(dados.get("RADIACAO GLOBAL (KJ/m²)"))
            v = parse_val(dados.get("VENTO, RAJADA MAXIMA (m/s)"))

            if t is not None: temp.append(t)
            if u is not None: umi.append(u)
            if p is not None: prec.append(p)
            if r is not None: rad.append(r)
            if v is not None: vento.append(v)

    if not temp or not umi:
        return None

    return {
        "tempMin": min(temp),
        "tempMax": max(temp),
        "tempMedia": sum(temp) / len(temp),
        "umiMedia": sum(umi) / len(umi),
        "precipitacaoTotal": sum(prec),
        "radiacaoMax": max(rad) if rad else None,
        "ventoRajadaMax": max(vento) if vento else None
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
