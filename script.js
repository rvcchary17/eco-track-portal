// Central Database Helper
const getDB = () => JSON.parse(localStorage.getItem('ecoTrackDB')) || {};
const saveDB = (db) => localStorage.setItem('ecoTrackDB', JSON.stringify(db));

// 1. CITY OFFICER LOGIC (Saves to 'cities' object)
function saveCityData() {
    const db = getDB();
    const date = document.getElementById('city-date').value;
    const city = document.getElementById('city-select').value;
    const weight = parseFloat(document.getElementById('weight').value) || 0;

    if (!date || weight <= 0) {
        alert("Enter valid date and weight!");
        return;
    }

    if (!db[date]) db[date] = { cities: {}, industry: { weight: 0, res: 0, cap: 0, iron: 0, mag: 0, cop: 0, sil: 0 } };

    db[date].cities[city] = (db[date].cities[city] || 0) + weight;
    saveDB(db);
    alert(`Success: ${weight}kg added to ${city} for ${date}`);
    window.location.href = "index.html";
}

// 2. INDUSTRY LOGIC (Saves to 'industry' object)
function saveIndustryData() {
    const db = getDB();
    const date = document.getElementById('ind-date').value;
    if (!date) {
        alert("Select date first!");
        return;
    }

    if (!db[date]) db[date] = { cities: {}, industry: { weight: 0, res: 0, cap: 0, iron: 0, mag: 0, cop: 0, sil: 0 } };

    const ind = db[date].industry;
    ind.weight += parseFloat(document.getElementById('rec-weight').value) || 0;
    ind.res += parseInt(document.getElementById('res').value) || 0;
    ind.cap += parseInt(document.getElementById('cap').value) || 0;
    ind.iron += parseInt(document.getElementById('iron').value) || 0;
    ind.mag += parseInt(document.getElementById('mag').value) || 0;
    ind.cop += parseFloat(document.getElementById('cop').value) || 0;
    ind.sil += parseFloat(document.getElementById('sil').value) || 0;

    saveDB(db);
    alert("Industry Recovery Linked Successfully!");
    window.location.href = "index.html";
}

// 3. DASHBOARD LOGIC (Calculates Sheets)
function loadDashboard() {
    const db = getDB();
    const date = document.getElementById('view-date').value;
    const tableBody = document.getElementById('table-body');
    const calcDiv = document.getElementById('calc-summary');

    // Reset
    tableBody.innerHTML = "";
    calcDiv.innerHTML = "";

    if (!date || !db[date]) {
        calcDiv.innerHTML = "<p style='color:#e67e22'>No data recorded for this date.</p>";
        return;
    }

    const data = db[date];
    let totalGen = 0;

    // Build Daily Sheet
    for (const [city, weight] of Object.entries(data.cities)) {
        totalGen += weight;
        tableBody.innerHTML += `<tr><td>${city}</td><td><strong>${weight} kg</strong></td></tr>`;
    }

    // Build Calculation Summary
    const recW = data.industry.weight;
    const eff = totalGen > 0 ? ((recW / totalGen) * 100).toFixed(1) : 0;

    calcDiv.innerHTML = `
        <div class="result-card">
            <p>Total Generation: <strong>${totalGen} kg</strong></p>
            <p>Total Recycled: <strong>${recW} kg</strong></p>
            <h3 style="color:#27ae60">Efficiency: ${eff}%</h3>
        </div>
        <div class="comp-results">
            <p>Resistors: ${data.industry.res} units</p>
            <p>Capacitors: ${data.industry.cap} units</p>
            <p>Copper: ${data.industry.cop} kg</p>
        </div>
    `;
}

// 4. Analytics Load (optional)
// 4. Analytics Load
let myChart = null;
let coordChart = null; // IMPORTANT: Define this globally

function loadAnalytics() {
    const db = getDB();
    const selectedDate = document.getElementById('view-date').value;
    const tableBody = document.getElementById('table-body');
    const mapArea = document.getElementById('map-area');
    const calcSummary = document.getElementById('calc-summary');

    if (!selectedDate || !db[selectedDate]) {
        tableBody.innerHTML = "";
        mapArea.innerHTML = "<p>Select a valid date to view data.</p>";
        calcSummary.innerHTML = "<p style='color:#636e72'>No data recorded for this date.</p>";
        if(myChart) { myChart.destroy(); myChart = null; }
        if(coordChart) { coordChart.destroy(); coordChart = null; }
        return;
    }

    const data = db[selectedDate];
    const ind = data.industry;
    let totalCollected = 0;

    tableBody.innerHTML = "";
    mapArea.innerHTML = "";
    for (const city in data.cities) {
        const weight = data.cities[city];
        totalCollected += weight;
        tableBody.innerHTML += `<tr><td>${city}</td><td><b>${weight} kg</b></td></tr>`;
        let color = weight > 200 ? "#d63031" : (weight > 100 ? "#e67e22" : "#00b894");
        mapArea.innerHTML += `<div class="city-bubble" style="background:${color}">${city}<br>${weight}kg</div>`;
    }

    const efficiency = totalCollected > 0 ? ((ind.weight / totalCollected) * 100).toFixed(1) : 0;

    calcSummary.innerHTML = `
        <div class="stat-item">
            <h4>Total Collection</h4>
            <p>${totalCollected} kg</p>
        </div>
        <div class="stat-item">
            <h4>Recycle Efficiency</h4>
            <p class="efficiency-high">${efficiency}%</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; color: #2d3436;">
            <div><strong>Resistors:</strong> ${ind.res || 0}</div>
            <div><strong>Capacitors:</strong> ${ind.cap || 0}</div>
            <div><strong>Magnets:</strong> ${ind.mag || 0}</div>
            <div><strong>Iron:</strong> ${ind.iron || 0} kg</div>
            <div><strong>Copper:</strong> ${ind.cop || 0} kg</div>
            <div><strong>Silver:</strong> ${ind.sil || 0} kg</div>
        </div>
    `;

    renderGraphs(db, selectedDate);
}

function renderGraphs(db, selectedDate) {
    // --- GRAPH 1: BAR CHART ---
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if (myChart) myChart.destroy();

    const cityLabels = Object.keys(db[selectedDate].cities);
    const cityWeights = Object.values(db[selectedDate].cities);
    const allDates = Object.keys(db).sort();
    const trendWeights = allDates.map(d => db[d].industry.weight || 0);

    myChart = new Chart(ctx, {
        data: {
            labels: cityLabels.length > 0 ? cityLabels : allDates,
            datasets: [
                {
                    type: 'bar',
                    label: 'City Production (Current Day)',
                    data: cityWeights,
                    backgroundColor: '#00b894'
                },
                {
                    type: 'line',
                    label: 'Monthly Recycling Trend (kg)',
                    data: trendWeights,
                    borderColor: '#0984e3',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- GRAPH 2: PRODUCTION VS RECYCLING (COORDINATE LINE) ---
    const canvasCoord = document.getElementById('coordGraph');
    if (!canvasCoord) return; 
    
    const ctxCoord = canvasCoord.getContext('2d');
    if (coordChart) coordChart.destroy();

    const currentData = db[selectedDate];
    
    // Create an array of objects to sort them by production weight
    const cityEntries = Object.entries(currentData.cities).map(([city, weight]) => ({
        city: city,
        production: weight,
        // Proportional recycling visualization based on industry weight
        recycling: (weight / (Object.values(currentData.cities).reduce((a, b) => a + b, 0) || 1)) * currentData.industry.weight
    }));

    // Sort: Low Production to High Production (The blue line will rise)
    cityEntries.sort((a, b) => a.production - b.production);

    coordChart = new Chart(ctxCoord, {
        type: 'line',
        data: {
            labels: cityEntries.map(e => e.city),
            datasets: [
                {
                    label: 'Production (Blue)',
                    data: cityEntries.map(e => e.production),
                    borderColor: '#0984e3',
                    backgroundColor: '#0984e3',
                    borderWidth: 3,
                    tension: 0.2,
                    pointRadius: 5
                },
                {
                    label: 'Recycling (Red)',
                    data: cityEntries.map(e => e.recycling),
                    borderColor: '#d63031',
                    backgroundColor: '#d63031',
                    borderWidth: 3,
                    tension: 0.2,
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Production vs Recycling (Low to High)' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Weight (kg)' } }
            }
        }
    });
}
// 5. Navigate to Education Center page
// --- NAVIGATION LOGIC ---
function goToEducation() {
    window.location.href = 'education.html';
}

// --- VIDEO PLAYBACK LOGIC ---
function playVideo(id) {
    const videoSection = document.getElementById("videos");
    if (videoSection) {
        videoSection.scrollIntoView({ behavior: "smooth" });
    }

    const iframe = document.getElementById(id);
    if (iframe) {
        // Appends autoplay and mute parameters to the current URL
        const currentSrc = iframe.src.split("?")[0];
        iframe.src = currentSrc + "?autoplay=1&mute=1";
    }
}
// 6. SUPPORT & FAQ LOGIC
document.addEventListener('DOMContentLoaded', () => {
    // Accordion Toggle
    const questions = document.querySelectorAll('.accordion-question');
    questions.forEach(q => {
        q.addEventListener('click', () => {
            q.classList.toggle('active');
        });
    });

    // Form Submission Handling
    const supportForm = document.getElementById('supportForm');
    if(supportForm) {
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const category = document.getElementById('formCategory').value;
            const title = document.getElementById('formTitle').value;

            // In a real app, you'd send this to a server. 
            // For now, we'll simulate a save.
            alert(`EcoTrack Support: Thank you for your ${category} regarding "${title}". Our team will review this shortly.`);

            supportForm.reset();
        });
    }
});