const arquivosCSV = [
    //'./dataset/2021/INMET_S_RS_A801_PORTO ALEGRE_01-01-2021_A_31-12-2021.csv',
    //'./dataset/2025.csv'
];

const arquivosJSON = [
    //'./dataset/2025.json'
];

function addMarkers(lat, lon) {
    L.marker([lat, lon]).addTo(map)
    .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    .openPopup();  
}

async function loadJson() {
    const promises = arquivosJSON.map(arquivo => {
        return fetch(arquivo)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar o arquivo: ${arquivo}`);
                }
                return response.json();
            });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat();
    } catch (error) {
        console.error('Erro ao carregar os arquivos JSON:', error);
        throw error;
    }
}

async function loadCsv() {
    const promises = arquivosCSV.map(arquivo => {
        return fetch(arquivo)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao carregar o arquivo: ${arquivo}`);
                }
                return response.text();
            })
            .then(text => {
                const rows = text.split('\n').slice(1); // Ignora o cabeçalho
                return rows.map(row => row.split(','));
            });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat();
    } catch (error) {
        console.error('Erro ao carregar os arquivos CSV:', error);
        throw error;
    }
}