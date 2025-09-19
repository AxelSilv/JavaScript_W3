const populationUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11ra.px";
const employmentUrl = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/statfin_tyokay_pxt_115b.px";

const nf = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 });
const nfPct = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function runQuery(url, bodyPath) {
  const bodyRes = await fetch(bodyPath, { cache: "no-store" });
  if (!bodyRes.ok) throw new Error(`Query file not found: ${bodyPath}`);
  const body = await bodyRes.json();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function colorRow(tr, pct) {
	let color = null;
	if (pct > 45) color = "#abffbd";
	else if (pct < 25) color = "#ff9e9e";
	if (!color) return;
  
	tr.style.backgroundColor = color;
	for (const cell of tr.children) {
	  cell.style.backgroundColor = color;
	}
  }
  

function parseStat2(px) {
  const root = px.dimension ? px : px.dataset;
  if (!root || !root.dimension?.Alue || !Array.isArray(px.value || root.value)) {
    throw new Error("PXWeb response format mismatch");
  }
  const dim = root.dimension.Alue;
  const labels = dim.category.label;
  const index = dim.category.index;
  const codes = Object.keys(index).sort((a, b) => index[a] - index[b]);
  const values = (px.value || root.value).map(Number);
  const byCode = Object.fromEntries(codes.map((c, i) => [c, values[i]]));
  return { labels, codes, byCode };
}

function showErrorRow(msg) {
  const tbody = document.getElementById("pop-tbody");
  tbody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 4;
  td.textContent = msg;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function setupTable(popPx, empPx) {
  const pop = parseStat2(popPx);
  const emp = empPx && (empPx.dimension || empPx.dataset) ? parseStat2(empPx) : null;

  const tbody = document.getElementById("pop-tbody");
  tbody.innerHTML = "";

  for (const code of pop.codes) {
    const tr = document.createElement("tr");

    const td1 = document.createElement("td");
    td1.textContent = pop.labels[code];

    const population = Number(pop.byCode[code] ?? 0);
    const td2 = document.createElement("td");
    td2.textContent = nf.format(population);
    td2.style.textAlign = "right";

    const e = emp?.byCode?.[code];
    const td3 = document.createElement("td");
    td3.textContent = Number.isFinite(e) ? nf.format(e) : "—";
    td3.style.textAlign = "right";

	const td4 = document.createElement("td");
	td4.style.textAlign = "right";
	
	let pct = null;
	if (population > 0 && Number.isFinite(e)) {
	  pct = (e / population) * 100;
	  td4.textContent = `${nfPct.format(pct)}%`;
	} else {
	  td4.textContent = "—";
	}
	
	tr.append(td1, td2, td3, td4);
	if (pct !== null) colorRow(tr, pct);  // väritys tässä
	tbody.appendChild(tr);
  }
}

async function initializeCode() {
  try {
    const [populationData, employmentData] = await Promise.all([
      runQuery(populationUrl, "./population_query.json"),
      runQuery(employmentUrl, "./employment_query.json"),
    ]);
    setupTable(populationData, employmentData);
  } catch (err) {
    console.error(err);
    try {
      const populationData = await runQuery(populationUrl, "./population_query.json");
      setupTable(populationData, {});
    } catch (e2) {
      console.error(e2);
      showErrorRow(`Data load failed: ${e2.message}`);
    }
  }
}

document.addEventListener("DOMContentLoaded", initializeCode);