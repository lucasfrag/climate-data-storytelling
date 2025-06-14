import json
from pathlib import Path

# Caminho para a pasta datasets
BASE_DIR = Path("../dataset")

# Lista todos os arquivos .csv recursivamente
csv_files = [str(p.relative_to(Path("."))) for p in BASE_DIR.rglob("*.csv")]

# Salva no manifest.json
with open("../manifest.json", "w", encoding="utf-8") as f:
    json.dump(csv_files, f, indent=2, ensure_ascii=False)

print(f"{len(csv_files)} arquivos CSV encontrados e salvos em manifest.json.")