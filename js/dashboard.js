const ZABBIX_URL = "backend/api.php";
const ZABBIX_TOKEN = "YOUR_TOKEN_HERE"; // substituído pelo PHP
const REFRESH_INTERVAL = 10000;

let latencyChart;
let latencyData = [];

function latencyClass(latency) {
    if(latency === "-" || latency === null) return "latency-high";
    latency = parseFloat(latency);
    if(latency < 20) return "latency-low";
    if(latency < 50) return "latency-medium";
    return "latency-high";
}

// Inicializa gráfico
function initChart() {
    const ctx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Latência média (ms)',
                data: [],
                borderColor: '#00bfff',
                backgroundColor: 'rgba(0,191,255,0.2)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#fff' } },
                y: { ticks: { color: '#fff' } }
            }
        }
    });
}

// Chama proxy PHP
async function fetchZabbix(method, params = {}) {
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
    return data.result;
}

// Atualiza dashboard
async function updateDashboard() {
    const loader = document.getElementById("loader");
    loader.style.display = "block";

    try {
        const hosts = await fetchZabbix("host.get", {
            output: ["hostid", "name"],
            selectInterfaces: ["ip"]
        });

        let total = hosts.length, online = 0, offline = 0, totalLatency = 0, countLatency = 0;
        let tableHTML = "";

        for(let host of hosts){
            const items = await fetchZabbix("item.get", {
                output: ["lastvalue", "key_"],
                hostids: host.hostid,
                search: { key_: "icmpping" }
            });

            let latency = "-";
            if(items.length>0) latency = items[0].lastvalue;

            const statusItems = await fetchZabbix("host.get", {
                output: ["status"],
                hostids: host.hostid
            });
            const hostStatus = statusItems[0].status === "0" ? "Up" : "Down";

            if(hostStatus==="Up") online++; else offline++;

            const perdas = hostStatus==="Down" ? "100%" : "0%";

            tableHTML += `<tr>
                <td>${host.name}</td>
                <td>${hostStatus}</td>
                <td>${perdas}</td>
                <td class="${latencyClass(latency)}">${latency}</td>
            </tr>`;

            if(latency!=="-") { totalLatency += parseFloat(latency); countLatency++; }
        }

        document.getElementById("total").innerText = `Switches Total: ${total}`;
        const onlineCard = document.getElementById("online");
        onlineCard.innerText = `Switches Online: ${online}`;
        onlineCard.style.background = offline>0?"#ffc107":"#28a745";
        const offlineCard = document.getElementById("offline");
        offlineCard.innerText = `Switches Offline: ${offline}`;
        offlineCard.style.background = offline>0?"#dc3545":"#28a745";

        document.getElementById("switch-table").innerHTML = tableHTML;

        // Atualiza gráfico
        const avgLatency = countLatency>0 ? (totalLatency/countLatency).toFixed(1) : 0;
        const timeLabel = new Date().toLocaleTimeString();
        latencyData.push({time: timeLabel, value: avgLatency});
        if(latencyData.length>20) latencyData.shift();

        latencyChart.data.labels = latencyData.map(d=>d.time);
        latencyChart.data.datasets[0].data = latencyData.map(d=>d.value);
        latencyChart.update();

    } catch(err){
        console.error("Erro ao atualizar dashboard:", err);
    } finally{
        loader.style.display = "none";
    }
}

window.onload = ()=>{
    initChart();
    updateDashboard();
    setInterval(updateDashboard, REFRESH_INTERVAL);
};
