// Funções de animação
function animarLinha() {
    const svg = d3.select("#grafico-linha"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(dados, d => d.ano)).range([0, width]);
    const y = d3.scaleLinear().domain([20, d3.max(dados, d => d.temp)]).nice().range([height, 0]);
    const line = d3.line().x(d => x(d.ano)).y(d => y(d.temp));

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    const path = g.append("path")
        .datum(dados)
        .attr("fill", "none")
        .attr("stroke", "tomato")
        .attr("stroke-width", 2)
        .attr("d", line);

    const totalLength = path.node().getTotalLength();
    path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
        .transition().duration(2000).attr("stroke-dashoffset", 0);

    g.selectAll("circle")
        .data(dados)
        .enter().append("circle")
        .attr("cx", d => x(d.ano))
        .attr("cy", d => y(d.temp))
        .attr("r", 5)
        .attr("fill", "tomato")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Temperatura: ${d.temp}°C`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

function animarArea() {
    const svg = d3.select("#grafico-area"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(dados, d => d.ano)).range([0, width]);
    const y = d3.scaleLinear().domain([1000, d3.max(dados, d => d.chuva)]).nice().range([height, 0]);
    const area = d3.area().x(d => x(d.ano)).y0(height).y1(d => y(d.chuva));

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    g.append("path")
        .datum(dados)
        .attr("fill", "steelblue")
        .attr("opacity", 0)
        .attr("d", area)
        .transition().duration(2000).attr("opacity", 1);

    g.selectAll("circle")
        .data(dados)
        .enter().append("circle")
        .attr("cx", d => x(d.ano))
        .attr("cy", d => y(d.chuva))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Precipitação: ${d.chuva} mm`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

function animarMapa() {
    const svg = d3.select("#mapa-climatico"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    svg.selectAll("circle")
        .data(regioes)
        .enter().append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 0)
        .attr("fill", "orange")
        .attr("opacity", 0.8)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.nome}</strong><br>Temperatura média: ${d.temp}°C`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition()
        .duration(1000)
        .delay((_, i) => i * 300)
        .attr("r", 20);

    svg.selectAll("text.label")
        .data(regioes)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 30)
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .text(d => d.nome);
}

function animarUmidade() {
    const svg = d3.select("#grafico-umidade"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const dadosUmidade = [
        { ano: 2000, umid: 76 },
        { ano: 2005, umid: 77 },
        { ano: 2010, umid: 78 },
        { ano: 2015, umid: 75 },
        { ano: 2020, umid: 79 },
        { ano: 2025, umid: 80 },
    ];

    const x = d3.scaleLinear().domain(d3.extent(dadosUmidade, d => d.ano)).range([0, width]);
    const y = d3.scaleLinear().domain([70, 85]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    const line = d3.line().x(d => x(d.ano)).y(d => y(d.umid));

    g.append("path")
        .datum(dadosUmidade)
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", line)
        .attr("stroke-dasharray", function () { return this.getTotalLength(); })
        .attr("stroke-dashoffset", function () { return this.getTotalLength(); })
        .transition().duration(2000)
        .attr("stroke-dashoffset", 0);

    g.selectAll("circle")
        .data(dadosUmidade)
        .enter().append("circle")
        .attr("cx", d => x(d.ano))
        .attr("cy", d => y(d.umid))
        .attr("r", 5)
        .attr("fill", "blue")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Umidade relativa: ${d.umid}%`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

function animarVento() {
    desenharGraficoBarra("#grafico-vento", dadosVento, "vento", "green", "Velocidade (m/s)");
}

function animarIntensos() {
    const svg = d3.select("#grafico-intensos"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(dadosIntensos.map(d => d.ano)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(dadosIntensos, d => Math.max(d.calor, d.frio))]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    // Barras de calor
    g.selectAll(".bar-calor")
        .data(dadosIntensos)
        .enter().append("rect")
        .attr("class", "bar-calor")
        .attr("x", d => x(d.ano))
        .attr("width", x.bandwidth() / 2)
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", "darkorange")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Dias de calor: ${d.calor}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.calor))
        .attr("height", d => height - y(d.calor));

    // Barras de frio
    g.selectAll(".bar-frio")
        .data(dadosIntensos)
        .enter().append("rect")
        .attr("class", "bar-frio")
        .attr("x", d => x(d.ano) + x.bandwidth() / 2)
        .attr("width", x.bandwidth() / 2)
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", "deepskyblue")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Dias de frio: ${d.frio}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.frio))
        .attr("height", d => height - y(d.frio));
}

function animarExtremos() {
    const svg = d3.select("#grafico-extremos"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(dadosExtremos.map(d => d.ano)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, 45]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    g.selectAll(".bar-max")
        .data(dadosExtremos)
        .enter().append("rect")
        .attr("class", "bar-max")
        .attr("x", d => x(d.ano))
        .attr("width", x.bandwidth() / 2)
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", "tomato")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Temp. Máx: ${d.max}°C`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.max)).attr("height", d => height - y(d.max));

    g.selectAll(".bar-min")
        .data(dadosExtremos)
        .enter().append("rect")
        .attr("class", "bar-min")
        .attr("x", d => x(d.ano) + x.bandwidth() / 2)
        .attr("width", x.bandwidth() / 2)
        .attr("y", y(0))
        .attr("height", 0)
        .attr("fill", "royalblue")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>Temp. Mín: ${d.min}°C`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.min)).attr("height", d => height - y(d.min));
}

function desenharGraficoBarra(id, dados, chave, cor, label) {
    const svg = d3.select(id),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(dados.map(d => d.ano)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(dados, d => d[chave]) + 2]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format("d")));
    g.append("g").call(d3.axisLeft(y));

    g.selectAll("rect")
        .data(dados)
        .enter().append("rect")
        .attr("x", d => x(d.ano))
        .attr("y", y(0))
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", cor)
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.ano}</strong><br>${label}: ${d[chave]}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000).attr("y", d => y(d[chave])).attr("height", d => height - y(d[chave]));
}

function desenharGraficoVentoDirecao() {
    const svg = d3.select("#grafico-vento-direcao"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(direcoes.map(d => d.dir)).range([0, width]).padding(0.1);
    const y = d3.scaleLinear().domain([0, d3.max(direcoes, d => d.freq)]).range([height, 0]);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    g.selectAll("rect")
        .data(direcoes)
        .enter().append("rect")
        .attr("x", d => x(d.dir))
        .attr("y", y(0))
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.dir}</strong><br>Frequência: ${d.freq}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition().duration(1000)
        .attr("y", d => y(d.freq))
        .attr("height", d => height - y(d.freq));
}