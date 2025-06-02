// Lista de arquivos CSV (adicione mais se necessário)
const arquivosCSV = [
    //'./dataset/2020/INMET_S_RS_A801_PORTO ALEGRE_01-01-2020_A_31-12-2020.csv',
    //'./dataset/2021/INMET_S_RS_A801_PORTO ALEGRE_01-01-2021_A_31-12-2021.csv',
    './dataset/2023.csv'
];

async function loadCsv() {
    // Pegue os dados de todos os arquivos CSV e retorne um array com todos eles
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