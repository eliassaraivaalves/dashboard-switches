const ZABBIX_URL = "backend/api.php";
const ZABBIX_TOKEN = "YOUR_TOKEN_HERE";
const REFRESH_INTERVAL = 15000; // 15 segundos

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

    if (data.error) {
        console.error("Erro Zabbix:", data.error);
        return [];
    }

    return data.result;
}

async function updateDashboard() {

    try {

        // Busca todos os hosts
        const hosts = await fetchZabbix("host.get", {
            output: ["hostid", "name", "status"],
            selectInterfaces: ["ip"]
        });

        let total = hosts.length;
        let online = 0;
        let offline = 0;
        let tableHTML = "";

        for (let host of hosts) {

            const isUp = host.status === "0";
            const status = isUp ? "Up" : "Down";

            if (isUp) online++;
            else offline++;

            // Busca latência (icmppingsec)
            const latencyItems = await fetchZabbix("item.get", {
                output: ["lastvalue"],
                hostids: host.hostid,
                search: { key_: "icmppingsec" }
            });

            // Busca perda (icmppingloss)
            const lossItems = await fetchZabbix("item.get", {
                output: ["lastvalue"],
                hostids: host.hostid,
                search: { key_: "icmppingloss" }
            });

            let latency = 0;
            let loss = 0;

            if (latencyItems.length > 0)
                latency = parseFloat(latencyItems[0].lastvalue) || 0;

            if (lossItems.length > 0)
                loss = parseFloat(lossItems[0].lastvalue) || 0;

            let statusClass = isUp ? "status-up" : "status-down";

            let latClass = "lat-low";
            if (latency > 20 && latency <= 50) latClass = "lat-medium";
            if (latency > 50) latClass = "lat-high";

            let barWidth = Math.min(latency * 3, 100);

            tableHTML += `
            <tr>
                <td>${host.name}</td>
                <td><span class="${statusClass}">${status}</span></td>
                <td>${loss}%</td>
                <td>
                    <div class="latency-bar ${latClass}" style="width:${barWidth}%">
                        ${latency} ms
                    </div>
                </td>
            </tr>
            `;
        }

        document.getElementById("total").innerText = total;
        document.getElementById("online").innerText = online;
        document.getElementById("offline").innerText = offline;

        document.getElementById("switch-table").innerHTML = tableHTML;

    } catch (error) {
        console.error("Erro geral:", error);
    }
}

// Inicialização
window.onload = () => {
    updateDashboard();
    setInterval(updateDashboard, REFRESH_INTERVAL);
};
