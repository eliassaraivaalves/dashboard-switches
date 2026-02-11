const ZABBIX_URL = "backend/api.php";
const ZABBIX_TOKEN = "YOUR_TOKEN_HERE";
const REFRESH_INTERVAL = 10000;

let chart;

function latencyClass(latency) {
    if (!latency || latency === "-") return "latency-high";
    latency = parseFloat(latency);
    if (latency < 20) return "latency-low";
    if (latency < 50) return "latency-medium";
    return "latency-high";
}

function initChart() {
    const ctx = document.getElementById("latencyChart").getContext("2d");
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Latência Média (ms)",
                data: [],
                borderWidth: 2,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: "#fff" }
                }
            },
            scales: {
                x: { ticks: { color: "#fff" }},
                y: { ticks: { color: "#fff" }}
            }
        }
    });
}

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
    return data.result;
}

async function updateDashboard() {

    document.getElementById("loader").style.display = "block";

    try {
        const hosts = await fetchZabbix("host.get", {
            output: ["hostid", "name", "status"]
        });

        let total = hosts.length;
        let online = 0;
        let offline = 0;
        let tableHTML = "";
        let totalLatency = 0;
        let countLatency = 0;

        for (let host of hosts) {

            const status = host.status === "0" ? "Up" : "Down";

            if (status === "Up") online++;
            else offline++;

            let latency = "-";

            const items = await fetchZabbix("item.get", {
                output: ["lastvalue"],
                hostids: host.hostid,
                search: { key_: "icmppingsec" }
            });

            if (items.length > 0) {
                latency = items[0].lastvalue;
                totalLatency += parseFloat(latency);
                countLatency++;
            }

            tableHTML += `
                <tr>
                    <td>${host.name}</td>
                    <td>${status}</td>
                    <td>${status === "Down" ? "100%" : "0%"}</td>
                    <td class="${latencyClass(latency)}">${latency}</td>
                </tr>
            `;
        }

        document.getElementById("total").innerText = `Switches Total: ${total}`;
        document.getElementById("online").innerText = `Switches Online: ${online}`;
        document.getElementById("offline").innerText = `Switches Offline: ${offline}`;

        document.getElementById("switch-table").innerHTML = tableHTML;

        let avg = countLatency > 0 ? (totalLatency / countLatency).toFixed(2) : 0;

        chart.data.labels.push(new Date().toLocaleTimeString());
        chart.data.datasets[0].data.push(avg);

        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }

        chart.update();

    } catch (error) {
        console.error("Erro:", error);
    }

    document.getElementById("loader").style.display = "none";
}

window.onload = () => {
    initChart();
    updateDashboard();
    setInterval(updateDashboard, REFRESH_INTERVAL);
};
