const ZABBIX_URL = "backend/api.php";
const ZABBIX_TOKEN = "YOUR_TOKEN_HERE";
const REFRESH_INTERVAL = 30000;  // Atualização do dashboard a cada 30s
const ROWS_PER_PAGE = 12;         // Quantidade de linhas por página
const PAGE_ROTATION_TIME = 20000; // Tempo de rotação da página

let allRows = [];
let currentPage = 0;

// Função genérica para chamadas à API do Zabbix
async function fetchZabbix(method, params) {
    const response = await fetch(ZABBIX_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            params: params,
            auth: ZABBIX_TOKEN,
            id: 1
        })
    });

    const data = await response.json();
    return data.result || [];
}

// Função para renderizar uma página da tabela
function renderPage() {
    const start = currentPage * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;

    document.getElementById("switch-table").innerHTML =
        allRows.slice(start, end).join("");

    currentPage++;

    if (start + ROWS_PER_PAGE >= allRows.length) {
        currentPage = 0;
    }
}

// Formata a latência para ms
function formatLatency(value) {
    if (!value || value <= 0) return 0;
    return Math.round(value * 1000);
}

// Função principal para atualizar o dashboard
async function updateDashboard() {

    const hosts = await fetchZabbix("host.get", {
        output: ["hostid", "name", "status"]
    });

    let total = hosts.length;
    let online = 0;
    let offline = 0;

    allRows = [];

    for (let host of hosts) {

        const isUp = host.status === "0";

        if (isUp) online++;
        else offline++;

        // Buscar latência (icmppingsec)
        const latencyItems = await fetchZabbix("item.get", {
            output: ["lastvalue"],
            hostids: host.hostid,
            filter: { key_: "icmppingsec" }
        });

        let latency = 0;
        if (latencyItems.length > 0 && latencyItems[0].lastvalue !== null)
            latency = parseFloat(latencyItems[0].lastvalue);

        latency = formatLatency(latency);

        // Buscar perda de pacotes (icmppingloss)
        const lossItems = await fetchZabbix("item.get", {
            output: ["lastvalue"],
            hostids: host.hostid,
            filter: { key_: "icmppingloss" }
        });

        let loss = 0;
        if (lossItems.length > 0 && lossItems[0].lastvalue !== null)
            loss = parseFloat(lossItems[0].lastvalue);

        // Classes para estilo visual
        let latClass = "lat-low";
        if (latency > 50 && latency <= 150) latClass = "lat-medium";
        if (latency > 150) latClass = "lat-high";

        let statusClass = isUp ? "status-up" : "status-down";

        // Adiciona a linha à tabela
        allRows.push(`
        <tr>
            <td>${host.name}</td>
            <td><span class="${statusClass}">
                ${isUp ? "Online" : "Offline"}
            </span></td>
            <td>${loss}%</td> <!-- coluna de perdas usando valor real do Zabbix -->
            <td>
                <div class="latency-box ${latClass}">
                    ${latency} ms
                </div>
            </td>
        </tr>
        `);
    }

    // Atualiza os contadores do dashboard
    document.getElementById("total").innerText = total;
    document.getElementById("online").innerText = online;
    document.getElementById("offline").innerText = offline;

    currentPage = 0;
    renderPage();
}

// Inicialização ao carregar a página
window.onload = () => {
    updateDashboard();
    setInterval(updateDashboard, REFRESH_INTERVAL);
    setInterval(renderPage, PAGE_ROTATION_TIME);
};
