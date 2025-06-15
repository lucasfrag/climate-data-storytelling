// dashboard.js

const select = document.getElementById("arquivoSelect");
const botao = document.getElementById("btnCarregar");
let charts = [];

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

fetch("manifest.json")
  .then(res => res.json())
  .then(arquivos => {
    select.innerHTML = '<option value="">Selecione</option>';
    arquivos.forEach(arquivo => {
      const opt = document.createElement("option");
      opt.value = "https://lucasfrag.github.io/climate-data-storytelling" + encodeURIComponent(arquivo.slice(2));
      opt.textContent = arquivo;
      select.appendChild(opt);
    });
  });

botao.addEventListener("click", () => {
  const caminho = select.value;
  if (!caminho) return alert("Selecione um arquivo");

  fetch(caminho)
    .then(res => res.text())
    .then(csv => {
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

      charts.forEach(c => c.destroy());
      charts = [];

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
            backgroundColor: '#222',
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "N/A"}`
            }
          },
          legend: {
            position: 'top',
            labels: { boxWidth: 18, font: { size: 12 }, padding: 12 },
            onClick: (e, item, legend) => {
              const chart = legend.chart;
              const meta = chart.getDatasetMeta(item.datasetIndex);
              meta.hidden = !meta.hidden;
              chart.update();
            }
          }
        },
        layout: {
          padding: 20
        },
        scales: {
          x: {
            ticks: { font: { size: 12 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 12 } },
            grid: { color: "rgba(0,0,0,0.05)" }
          }
        },
        hover: { mode: 'nearest', intersect: false },
        animation: { duration: 600, easing: "easeOutQuart" }
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

      const ctxs = [
        { id: "graficoTemperatura", title: "Temperatura Mensal (°C)", type: "line",
          datasets: [
            { label: "Mínima", data: tempMin, ...estilos("blue") },
            { label: "Média", data: tempMedia, ...estilos("orange") },
            { label: "Máxima", data: tempMax, ...estilos("red") }
          ] },
        { id: "graficoUmidade", title: "Umidade Relativa Média (%)", type: "bar",
          datasets: [{ label: "Umidade Média", data: umiMedia, backgroundColor: "skyblue" }] },
        { id: "graficoPrecipitacao", title: "Precipitação Total por Mês (mm)", type: "bar",
          datasets: [{ label: "Precipitação", data: precTotal, backgroundColor: "#3498db" }] },
        { id: "graficoRadicao", title: "Radiação Solar Acumulada (kJ/m²)", type: "line",
          datasets: [{ label: "Radiação Global", data: radTotal, ...estilos("green") }] },
        { id: "graficoVento", title: "Vento Médio e Rajada Máxima (m/s)", type: "line",
          datasets: [
            { label: "Velocidade Média", data: ventoMedio, ...estilos("gray") },
            { label: "Rajada Máxima", data: rajMax, ...estilos("black") }
          ] }
      ];

      ctxs.forEach((cfg, i) => {
        const canvas = document.getElementById(cfg.id).getContext("2d");
        const chart = new Chart(canvas, {
          type: cfg.type,
          data: { labels, datasets: cfg.datasets },
          options: opcoes(cfg.title)
        });
        charts.push(chart);
      });
    });
});




// dashboard.js completo com visual mais suave e tooltips informativas
const unidadePorLabel = {
  "Temperatura Média": "°C",
  "Temperatura Mínima": "°C",
  "Temperatura Máxima": "°C",
  "Umidade Média": "%",
  "Precipitação": "mm",
  "Radiação Global": "kJ/m²",
  "Velocidade Média": "m/s",
  "Rajada Máxima": "m/s"
};

const explicacaoPorLabel = {
  "Temperatura Média": "Média mensal da temperatura do ar.",
  "Temperatura Mínima": "Temperatura mínima mensal registrada.",
  "Temperatura Máxima": "Temperatura máxima mensal registrada.",
  "Umidade Média": "Média mensal da umidade relativa do ar.",
  "Precipitação": "Precipitação total registrada no mês.",
  "Radiação Global": "Radiação solar acumulada no mês.",
  "Velocidade Média": "Velocidade média do vento no mês.",
  "Rajada Máxima": "Maior rajada de vento registrada no mês."
};

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function criarGrafico(id, labels, datasets, titulo, tipo = 'line') {
  const ctx = document.getElementById(id).getContext('2d');
  new Chart(ctx, {
    type: tipo,
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 18 }
        },
        tooltip: {
          backgroundColor: '#333',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 6,
          padding: 10,
          callbacks: {
            title: (items) => `📅 Mês: ${items[0].label}`,
            label: (ctx) => {
              const label = ctx.dataset.label;
              const valor = ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : 'N/A';
              const unidade = unidadePorLabel[label] || '';
              return `📌 ${label}: ${valor} ${unidade}`;
            },
            afterLabel: (ctx) => explicacaoPorLabel[ctx.dataset.label.replace(/ - .+$/, '')] || ''
          }
        },
        legend: {
          position: 'top',
          labels: { font: { size: 13 } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 12 } }
        },
        x: {
          ticks: { font: { size: 12 } }
        }
      }
    }
  });
}

async function processarArquivo(nomeArquivo) {
  const res = await fetch("dataset/" + nomeArquivo);
  const texto = await res.text();
  const linhas = texto.split("\n").filter(l => l.trim().length > 5);
  const cabecalho = linhas[0].split(";").map(c => c.toLowerCase().trim());

  const col = nome => cabecalho.findIndex(h => h.includes(nome));

  const idxData = col("data");
  const idxTemp = col("temperatura do ar");
  const idxTempMin = col("temperatura mínima");
  const idxTempMax = col("temperatura máxima");
  const idxUmid = col("umidade relativa do ar");
  const idxPrec = col("precipitacao");
  const idxRad = col("radiacao global");
  const idxVento = col("velocidade horaria");
  const idxRaj = col("rajada maxima");

  const dados = linhas.slice(1).map(l => l.split(";")).filter(cols => cols.length > 1);
  const agrupar = () => Array(12).fill([]).map(() => []);
  const medias = arr => arr.map(g => g.length ? g.reduce((a,b)=>a+b,0)/g.length : 0);
  const somas = arr => arr.map(g => g.reduce((a,b)=>a+b,0));
  const porMes = (idx, soma = false) => {
    const grupos = agrupar();
    dados.forEach(l => {
      const data = new Date(l[idxData]);
      const v = parseFloat(l[idx].replace(",", "."));
      if (!isNaN(v)) grupos[data.getMonth()].push(v);
    });
    return soma ? somas(grupos) : medias(grupos);
  };

  return {
    tempMin: porMes(idxTempMin),
    tempMed: porMes(idxTemp),
    tempMax: porMes(idxTempMax),
    umidade: porMes(idxUmid),
    precipitacao: porMes(idxPrec, true),
    radiacao: porMes(idxRad, true),
    vento: porMes(idxVento),
    rajada: porMes(idxRaj)
  };
}

// ========== Carregamento e comparação ==========
document.getElementById("btnCarregar").addEventListener("click", async () => {
  const select1 = document.getElementById("arquivoSelect1");
  const select2 = document.getElementById("arquivoSelect2");

  const nome1 = select1.value;
  const nome2 = select2.value;
  if (!nome1) return alert("Selecione o primeiro arquivo.");

  const dados1 = await processarArquivo(nome1);
  const dados2 = nome2 ? await processarArquivo(nome2) : null;

  const sufixo = nome => nome ? ` - ${nome.split("_")[4].split(".")[0]}` : "";

  criarGrafico("graficoTemperatura", meses, [
    { label: "Temperatura Mínima" + sufixo(nome1), data: dados1.tempMin, borderColor: "#6baed6", fill: true },
    { label: "Temperatura Média" + sufixo(nome1), data: dados1.tempMed, borderColor: "#fd8d3c", fill: true },
    { label: "Temperatura Máxima" + sufixo(nome1), data: dados1.tempMax, borderColor: "#e34a33", fill: true },
    ...(dados2 ? [
      { label: "Temperatura Mínima" + sufixo(nome2), data: dados2.tempMin, borderColor: "#9ecae1", fill: false },
      { label: "Temperatura Média" + sufixo(nome2), data: dados2.tempMed, borderColor: "#fdae6b", fill: false },
      { label: "Temperatura Máxima" + sufixo(nome2), data: dados2.tempMax, borderColor: "#fc9272", fill: false }
    ] : [])
  ], "Temperatura Mensal (°C)");

  criarGrafico("graficoUmidade", meses, [
    { label: "Umidade Média" + sufixo(nome1), data: dados1.umidade, borderColor: "#74c476", backgroundColor: "#c7e9c0", fill: true },
    ...(dados2 ? [{ label: "Umidade Média" + sufixo(nome2), data: dados2.umidade, borderColor: "#31a354", fill: false }] : [])
  ], "Umidade Relativa Média (%)");

  criarGrafico("graficoPrecipitacao", meses, [
    { label: "Precipitação" + sufixo(nome1), data: dados1.precipitacao, borderColor: "#6baed6", backgroundColor: "#9ecae1" },
    ...(dados2 ? [{ label: "Precipitação" + sufixo(nome2), data: dados2.precipitacao, borderColor: "#08519c", backgroundColor: "#bdd7e7" }] : [])
  ], "Precipitação Total por Mês (mm)", 'bar');

  criarGrafico("graficoRadicao", meses, [
    { label: "Radiação Global" + sufixo(nome1), data: dados1.radiacao, borderColor: "#fdd835", backgroundColor: "#fff9c4" },
    ...(dados2 ? [{ label: "Radiação Global" + sufixo(nome2), data: dados2.radiacao, borderColor: "#fbc02d", backgroundColor: "#fff176" }] : [])
  ], "Radiação Solar Acumulada (kJ/m²)", 'bar');

  criarGrafico("graficoVento", meses, [
    { label: "Velocidade Média" + sufixo(nome1), data: dados1.vento, borderColor: "#4fc3f7", fill: false },
    { label: "Rajada Máxima" + sufixo(nome1), data: dados1.rajada, borderColor: "#0288d1", fill: false },
    ...(dados2 ? [
      { label: "Velocidade Média" + sufixo(nome2), data: dados2.vento, borderColor: "#81d4fa", fill: false },
      { label: "Rajada Máxima" + sufixo(nome2), data: dados2.rajada, borderColor: "#01579b", fill: false }
    ] : [])
  ], "Vento Médio e Rajada Máxima (m/s)");
});
