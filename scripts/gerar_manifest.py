import json
from pathlib import Path
import re

BASE_DIR = Path("../dataset")
padrao = re.compile(r"INMET_([A-Z])_([A-Z]{2})_(A\d+)_([^_]+)_(\d{2}-\d{2}-\d{4})_A_(\d{2}-\d{2}-\d{4})", re.I)

dados = []
for csv_path in BASE_DIR.rglob("*.csv"):
    nome = csv_path.name
    match = padrao.match(nome)
    if match:
        _, estado, estacao, cidade, ini, fim = match.groups()
        dados.append({
            "arquivo": str(csv_path).replace("\\", "/"),
            "estado": estado,
            "cidade": cidade.title().replace("_", " "),
            "estacao": estacao,
            "periodo": f"{ini.replace('-', '/')} a {fim.replace('-', '/')}"
        })

with open("../manifest.json", "w", encoding="utf-8") as f:
    json.dump(dados, f, indent=2, ensure_ascii=False)

print(f"{len(dados)} arquivos processados e salvos.")