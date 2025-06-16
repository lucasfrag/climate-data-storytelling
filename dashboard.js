const selects = [document.getElementById("arquivoSelect1"), document.getElementById("arquivoSelect2")];
const charts = [[], []];

fetch("manifest.json")
  .then(res => res.json())
  .then(arquivos => {
    selects.forEach(sel => {
      sel.innerHTML = '<option value="">Selecione</option>';
      arquivos.forEach(({ arquivo, cidade, estado, estacao, periodo }) => {
        const opt = document.createElement("option");
        const url = "https://lucasfrag.github.io/climate-data-storytelling/" + arquivo.replaceAll("\\\\", "/").replace("../", "");;
        console.log(arquivo)
        //const url = "https://lucasfrag.github.io/climate-data-storytelling" + encodeURIComponent(arquivo.slice(2)).replaceAll("%5C", "/");

        opt.value = url;
        opt.textContent = `📍 ${cidade} (${estado}) – ${periodo} [${estacao}]`;
        opt.dataset.nomeArquivo = arquivo;
        sel.appendChild(opt.cloneNode(true));
      });
    });
  });

function formatarTitulo(nomeArquivo) {
  const regex = /INMET_([A-Z])_([A-Z]{2})_(A\d+)_([^_]+)_(\d{2}-\d{2}-\d{4})_A_(\d{2}-\d{2}-\d{4})/;
  const match = nomeArquivo.match(regex);

  if (!match) return nomeArquivo;

  const [, regiao, estado, estacao, cidade, dataInicio, dataFim] = match;

  const cidadeFormatada = cidade
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, l => l.toUpperCase()); // Capitaliza nome da cidade

  return `
    📍 ${cidadeFormatada} (${estado}) – Estação ${estacao}<br>
    🗓️ Período: ${dataInicio.replace(/-/g, "/")} a ${dataFim.replace(/-/g, "/")}
  `;
}

function parseFloatPt(val) {
  if (!val || val.trim() === "" || val.trim() === "-9999") return null;
  const fix = val.trim().replace(",", ".");
  return fix.startsWith(".") ? parseFloat("0" + fix) : parseFloat(fix);
}
function obterNomeMes(numero) {
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][numero - 1];
}
function removerAcentos(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function padronizar(str) {
  return removerAcentos(str).toLowerCase().replace(/\s+/g, " ").trim();
}
function inicializarMeses() {
  const meses = {};
  for (let i = 1; i <= 12; i++) meses[i] = [];
  return meses;
}
function agruparPorMes(dataArray, valorArray) {
  const meses = inicializarMeses();
  dataArray.forEach((d, i) => {
    const date = new Date(d);
    const mes = date.getMonth() + 1;
    const val = valorArray[i];
    if (!isNaN(val)) meses[mes].push(val);
  });
  return meses;
}
const calcularMedia = m => Object.values(m).map(v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const calcularSoma = m => Object.values(m).map(v => v.length ? v.reduce((a, b) => a + b, 0) : 0);
const calcularMinimo = m => Object.values(m).map(v => v.length ? Math.min(...v) : null);
const calcularMaximo = m => Object.values(m).map(v => v.length ? Math.max(...v) : null);

function processarCSV(csv, nomeArquivo) {
  const linhas = csv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const cabecalhoOriginal = linhas[8].split(";");
  const cabecalho = cabecalhoOriginal.map(padronizar);

  const idx = campo => {
    const padrao = padronizar(campo);
    return cabecalho.findIndex(c => {
      const normalizado = padronizar(c);
      if (padrao.includes("precipitacao")) {
        return normalizado.includes("precip") && normalizado.includes("total") && normalizado.includes("mm");
      }
      return normalizado.includes(padrao) && !normalizado.includes("unnamed");
    });
  };

  const dataIdx = idx("data");
  const horaIdx = idx("hora");

  const indices = {
    temperatura: idx("temperatura do ar"),
    umidade: idx("umidade relativa do ar"),
    precipitacao: idx("precipitacao total"),
    radiacao: idx("radiacao global"),
    pressao: idx("pressao atmosferica"),
    vento: idx("velocidade horaria"),
    rajada: idx("rajada maxima")
  };

  if (indices.precipitacao === -1 && cabecalho.length > 2) indices.precipitacao = 2;

  const datas = [], temp = [], umi = [], rad = [], prec = [], press = [], vento = [], raj = [];

  for (let i = 9; i < linhas.length; i++) {
    const col = linhas[i].split(";");
    if (col.length < cabecalho.length) continue;

    const dataHora = `${col[dataIdx]} ${col[horaIdx].replace(" UTC", "")}`;
    const dt = new Date(dataHora);
    if (isNaN(dt)) continue;

    datas.push(dataHora);
    temp.push(parseFloatPt(col[indices.temperatura]));
    umi.push(parseFloatPt(col[indices.umidade]));
    rad.push(parseFloatPt(col[indices.radiacao]));
    prec.push(parseFloatPt(col[indices.precipitacao]));
    press.push(parseFloatPt(col[indices.pressao]));
    vento.push(parseFloatPt(col[indices.vento]));
    raj.push(parseFloatPt(col[indices.rajada]));
  }

  const labels = Array.from({ length: 12 }, (_, i) => obterNomeMes(i + 1));

  const tempMeses = agruparPorMes(datas, temp);
  const tempMin = calcularMinimo(tempMeses);
  const tempMax = calcularMaximo(tempMeses);
  const tempMedia = calcularMedia(tempMeses);

  const umiMedia = calcularMedia(agruparPorMes(datas, umi));
  const precTotal = calcularSoma(agruparPorMes(datas, prec));
  const radTotal = calcularSoma(agruparPorMes(datas, rad));
  const ventoMedio = calcularMedia(agruparPorMes(datas, vento));
  const rajMax = calcularMaximo(agruparPorMes(datas, raj));

  // Extrai metadados do nome do arquivo
  const regex = /INMET_([A-Z])_([A-Z]{2})_(A\d+)_([^_]+)_(\d{2}-\d{2}-\d{4})_A_(\d{2}-\d{2}-\d{4})/;
  const match = nomeArquivo.match(regex);
  const meta = match ? {
    regiao: match[1],
    estado: match[2],
    estacao: match[3],
    cidade: match[4].toLowerCase().replace(/(?:^|\s|-)\S/g, l => l.toUpperCase()),
    inicio: match[5].replace(/-/g, "/"),
    fim: match[6].replace(/-/g, "/")
  } : null;

  return {
    labels,
    tempMin,
    tempMax,
    tempMedia,
    umiMedia,
    precTotal,
    radTotal,
    ventoMedio,
    rajMax,
    meta // <-- agora contém cidade, estado, estacao, inicio, fim
  };
}
function criarGraficos(dataset, idx) {
  // Limpa gráficos antigos
  charts[idx].forEach(c => c.destroy());
  charts[idx] = [];

  const opcoes = titulo => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      title: {
        display: true,
        text: titulo,
        font: { size: 18 }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#ffffff',
        titleColor: '#000',
        bodyColor: '#333',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: ctx => {
            const unidade = {
              "Temperatura Mensal (°C)": "°C",
              "Umidade Relativa Média (%)": "%",
              "Precipitação Total por Mês (mm)": "mm",
              "Radiação Solar Acumulada (kJ/m²)": "kJ/m²",
              "Vento Médio e Rajada Máxima (m/s)": "m/s"
            }[ctx.chart.options.plugins.title.text] || "";
            return `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "N/A"} ${unidade}`;
          }
        }
      },
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 12 }
        }
      }
    },
    layout: { padding: 20 },
    scales: {
      x: { ticks: { font: { size: 12 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { font: { size: 12 } }, grid: { color: "rgba(0, 0, 0, 0.04)" } }
    },
    hover: { mode: 'nearest', intersect: false },
    animation: { duration: 1000, easing: "easeInOutCubic" }
  });

  const estilos = cor => ({
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointHoverBackgroundColor: "#fff",
    tension: 0.3,
    borderColor: cor,
    backgroundColor: cor,
    fill: false
  });

  // Temperatura
  charts[idx].push(new Chart(document.getElementById(`graficoTemperatura${idx + 1}`).getContext("2d"), {
    type: "line",
    data: {
      labels: dataset.labels,
      datasets: [
        { label: "Mínima", data: dataset.tempMin, ...estilos("blue") },
        { label: "Média", data: dataset.tempMedia, ...estilos("orange") },
        { label: "Máxima", data: dataset.tempMax, ...estilos("red") }
      ]
    },
    options: opcoes("🌡️ Temperatura Mensal (°C)")
  }));

  // Umidade
  charts[idx].push(new Chart(document.getElementById(`graficoUmidade${idx + 1}`).getContext("2d"), {
    type: "bar",
    data: {
      labels: dataset.labels,
      datasets: [{ label: "Umidade Média", data: dataset.umiMedia, backgroundColor: "skyblue" }]
    },
    options: opcoes("💧 Umidade Relativa Média (%)")
  }));

  // Precipitação
  charts[idx].push(new Chart(document.getElementById(`graficoPrecipitacao${idx + 1}`).getContext("2d"), {
    type: "bar",
    data: {
      labels: dataset.labels,
      datasets: [{ label: "Precipitação", data: dataset.precTotal, backgroundColor: "#3498db" }]
    },
    options: opcoes("🌧️ Precipitação Total por Mês (mm)")
  }));

  // Radiação
  charts[idx].push(new Chart(document.getElementById(`graficoRadicao${idx + 1}`).getContext("2d"), {
    type: "line",
    data: {
      labels: dataset.labels,
      datasets: [{ label: "Radiação Global", data: dataset.radTotal, ...estilos("green") }]
    },
    options: opcoes("☀️ Radiação Solar Acumulada (kJ/m²)")
  }));

  // Vento
  charts[idx].push(new Chart(document.getElementById(`graficoVento${idx + 1}`).getContext("2d"), {
    type: "line",
    data: {
      labels: dataset.labels,
      datasets: [
        { label: "Velocidade Média", data: dataset.ventoMedio, ...estilos("gray") },
        { label: "Rajada Máxima", data: dataset.rajMax, ...estilos("black") }
      ]
    },
    options: opcoes("💨 Vento Médio e Rajada Máxima (m/s)")
  }));
}


document.getElementById("btnCarregar").addEventListener("click", async () => {
  const select1 = document.getElementById("arquivoSelect1");
  const select2 = document.getElementById("arquivoSelect2");
  const nome1 = select1.selectedOptions[0]?.dataset?.nomeArquivo || "";
  const nome2 = select2.selectedOptions[0]?.dataset?.nomeArquivo || "";

  if (nome1) atualizarTituloEstacao(1, nome1);
  if (nome2) atualizarTituloEstacao(2, nome2);

  if (select1.value) {
    const csv1 = await fetch(select1.value).then(r => r.text());
    const dados1 = processarCSV(csv1, nome1);
    criarGraficos(dados1, 0);
  } else {
    charts[0].forEach(c => c.destroy());
    charts[0] = [];
  }

  if (select2.value) {
    const csv2 = await fetch(select2.value).then(r => r.text());
    const dados2 = processarCSV(csv2, nome2);
    criarGraficos(dados2, 1);
  } else {
    charts[1].forEach(c => c.destroy());
    charts[1] = [];
  }
});

function atualizarTituloEstacao(id, nomeArquivo) {
  const regex = /INMET_([A-Z])_([A-Z]{2})_(A\d+)_([^_]+)_(\d{2}-\d{2}-\d{4})_A_(\d{2}-\d{2}-\d{4})/;
  const match = nomeArquivo.match(regex);

  if (!match) {
    document.getElementById(`tituloEstacao${id}`).textContent = nomeArquivo;
    document.getElementById(`subtituloEstacao${id}`).textContent = "";
    return;
  }

  const [, , estado, estacao, cidadeRaw, dataInicio, dataFim] = match;
  const cidade = cidadeRaw
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, l => l.toUpperCase())
    .replace(/_/g, " ");

  document.getElementById(`tituloEstacao${id}`).textContent = `📍 ${cidade} (${estado}) - Estação ${estacao}`;
  document.getElementById(`subtituloEstacao${id}`).textContent = `Dados coletados de ${dataInicio.replace(/-/g, "/")} a ${dataFim.replace(/-/g, "/")}`;
}