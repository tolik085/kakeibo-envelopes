/**
 * Kakeibo Japanese Envelopes & Debt Calculator
 * Interactive Web Application
 */

const CURRENT_DATA_VERSION = 'v2_photo_debts';

const DEFAULT_DEBTS = [
    { id: 1, name: "xbox", balance: 305, rate: 0, payment: 100 },
    { id: 2, name: "tv bybit", balance: 1061, rate: 0, payment: 100 },
    { id: 3, name: "miska", balance: 217, rate: 0, payment: 15 },
    { id: 4, name: "telefon", balance: 383, rate: 0, payment: 40 },
    { id: 5, name: "saat", balance: 1217, rate: 0, payment: 85 },
    { id: 6, name: "xiaomi fryer", balance: 500, rate: 0, payment: 35 },
    { id: 7, name: "disk", balance: 940, rate: 0, payment: 100 },
    { id: 8, name: "protein", balance: 70, rate: 0, payment: 50 },
    { id: 9, name: "bir kart", balance: 290, rate: 0, payment: 200 },
    { id: 10, name: "mama kart", balance: 225, rate: 0, payment: 200 },
    { id: 11, name: "nomre", balance: 22, rate: 0, payment: 22 },
    { id: 12, name: "internet", balance: 25, rate: 0, payment: 25 },
    { id: 13, name: "mamed", balance: 1870, rate: 0, payment: 340 },
    { id: 14, name: "gpu", balance: 2875, rate: 0, payment: 200 },
    { id: 15, name: "ssd", balance: 380, rate: 0, payment: 35 },
    { id: 16, name: "ev", balance: 300, rate: 0, payment: 300 },
    { id: 17, name: "claud bybit", balance: 170, rate: 0, payment: 170 }
];

// Application State
let appState = {
    version: CURRENT_DATA_VERSION,
    currency: '₼',
    currencyCode: 'AZN',
    debts: JSON.parse(JSON.stringify(DEFAULT_DEBTS)),
    extraPay: 150,
    strategy: 'snowball',
    budget: {
        inc1: 1500,
        inc2: 1200,
        needs: 500,
        goal: 2017,
        p_wants: 40,
        p_dev: 20,
        p_unexp: 40
    }
};

// Chart instances
let debtChartInstance = null;
let doughnutChartInstance = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initCurrencySelector();
    renderDebtsList();
    syncBudgetInputs();
    updateLiveBudgetSummary();
    calculateBudget(false); // initial render without scroll
    lucide.createIcons();
});

/* ==========================================================================
   CURRENCY SYSTEM
   ========================================================================== */
function initCurrencySelector() {
    const select = document.getElementById('currency-select');
    if (select) {
        select.value = appState.currency;
        select.addEventListener('change', (e) => {
            const opt = e.target.selectedOptions[0];
            appState.currency = opt.value;
            appState.currencyCode = opt.dataset.code || '';
            updateCurrencySymbols();
            saveToLocalStorage();
            // Re-render calculations with new currency
            updateLiveBudgetSummary();
            calculateBudget(false);
            if (!document.getElementById('debt-result').classList.contains('hidden')) {
                calcDebts(false);
            }
        });
    }
    updateCurrencySymbols();
}

function updateCurrencySymbols() {
    document.querySelectorAll('.curr-symbol').forEach(el => {
        el.textContent = appState.currency;
    });
}

function formatMoney(amount) {
    return Math.round(amount).toLocaleString('uk-UA') + ' ' + appState.currency;
}

/* ==========================================================================
   SECTION 02: STRATEGY TEST (Avalanche vs Snowball)
   ========================================================================== */
function checkTest() {
    let avalancheCount = 0;
    let snowballCount = 0;
    let answered = 0;

    for (let i = 1; i <= 3; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected) {
            answered++;
            if (selected.value === 'avalanche') avalancheCount++;
            else snowballCount++;
        }
    }

    const resBox = document.getElementById('test-result');
    resBox.classList.remove('hidden');

    if (answered < 3) {
        resBox.className = "p-5 rounded-xl border-l-4 bg-rose-50 border-rose-500 text-rose-900 text-sm";
        resBox.innerHTML = `
            <div class="flex items-center gap-2 font-bold mb-1">
                <span>⚠️</span> Будь ласка, дайте відповідь на всі 3 запитання для точного результату.
            </div>
        `;
        return;
    }

    if (avalancheCount > snowballCount) {
        resBox.className = "p-5 rounded-xl border-l-4 bg-sky-50 border-sky-500 text-sky-950 text-sm space-y-2";
        resBox.innerHTML = `
            <div class="flex items-center gap-2 font-bold text-base text-sky-900">
                <span>🏔️</span> Твій ідеальний вибір: Стратегія «Лавина» (Avalanche)
            </div>
            <p>
                <strong>Чому це для тебе:</strong> Ти орієнтуєшся на раціональність і математику. Спрямовуй усі вільні гроші на борг із <strong>найвищою відсотковою ставкою</strong>, сплачуючи мінімальні за іншими. Це заощадить тобі максимум на переплаті відсотків банку.
            </p>
            <div class="pt-2">
                <button type="button" onclick="setCalculatorStrategy('avalanche')" class="text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 px-3 py-1.5 rounded-lg transition">
                    Встановити «Лавину» в калькуляторі ↓
                </button>
            </div>
        `;
    } else {
        resBox.className = "p-5 rounded-xl border-l-4 bg-indigo-50 border-indigo-500 text-indigo-950 text-sm space-y-2";
        resBox.innerHTML = `
            <div class="flex items-center gap-2 font-bold text-base text-indigo-900">
                <span>⛄</span> Твій ідеальний вибір: Стратегія «Снігова куля» (Snowball)
            </div>
            <p>
                <strong>Чому це для тебе:</strong> Тобі потрібні швидкі перемоги та психологічна мотивація. Спрямовуй вільні гроші на борг із <strong>найменшим залишком</strong>. Закриваючи кредити один за одним, ти відчуватимеш щомісячний драйв і викреслюватимеш борги зі списку!
            </p>
            <div class="pt-2">
                <button type="button" onclick="setCalculatorStrategy('snowball')" class="text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-lg transition">
                    Встановити «Снігову кулю» в калькуляторі ↓
                </button>
            </div>
        `;
    }
    lucide.createIcons();
}

function setCalculatorStrategy(strategyName) {
    const sel = document.getElementById('strategy');
    if (sel) {
        sel.value = strategyName;
        appState.strategy = strategyName;
        saveToLocalStorage();
    }
    document.getElementById('debt-calc').scrollIntoView({ behavior: 'smooth' });
}

/* ==========================================================================
   SECTION 03: DEBT CALCULATOR ENGINE & SIMULATION
   ========================================================================== */
function renderDebtsList() {
    const container = document.getElementById('debts-list');
    container.innerHTML = '';

    appState.debts.forEach((debt, index) => {
        const item = document.createElement('div');
        item.className = 'debt-item-card bg-slate-50/80 p-4 sm:p-5 rounded-xl border border-slate-200 relative space-y-3';
        item.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 w-full">
                    <span class="w-6 h-6 rounded-md bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        #${index + 1}
                    </span>
                    <input type="text" value="${escapeHtml(debt.name)}" placeholder="Назва (напр. Кредитка, Автокредит)" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" onchange="updateDebt(${debt.id}, 'name', this.value)">
                </div>
                ${appState.debts.length > 1 ? `
                    <button type="button" onclick="removeDebtItem(${debt.id})" class="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Видалити кредит">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                ` : ''}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                    <label class="block text-[11px] font-semibold text-slate-500 mb-1">Залишок боргу (${appState.currency})</label>
                    <div class="relative">
                        <input type="number" min="1" step="10" value="${debt.balance}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" onchange="updateDebt(${debt.id}, 'balance', Number(this.value))">
                    </div>
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-500 mb-1">Ставка (% річних)</label>
                    <div class="relative">
                        <input type="number" min="0" max="200" step="0.5" value="${debt.rate}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" onchange="updateDebt(${debt.id}, 'rate', Number(this.value))">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                    </div>
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-500 mb-1">Мін. платіж (${appState.currency})</label>
                    <div class="relative">
                        <input type="number" min="1" step="10" value="${debt.payment}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" onchange="updateDebt(${debt.id}, 'payment', Number(this.value))">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    lucide.createIcons();
    updateDebtsSummaryStats();
}

function updateDebtsSummaryStats() {
    const totalCount = appState.debts.length;
    const totalBalance = appState.debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
    const totalPayment = appState.debts.reduce((sum, d) => sum + (Number(d.payment) || 0), 0);

    const countEl = document.getElementById('total-debts-count');
    const balEl = document.getElementById('total-debts-balance');
    const payEl = document.getElementById('total-debts-payment');

    if (countEl) countEl.textContent = totalCount;
    if (balEl) balEl.textContent = formatMoney(totalBalance);
    if (payEl) payEl.textContent = `${formatMoney(totalPayment)}/міс`;
}

function addDebtItem() {
    const newId = Date.now();
    appState.debts.push({
        id: newId,
        name: `Кредит #${appState.debts.length + 1}`,
        balance: 500,
        rate: 0,
        payment: 50
    });
    renderDebtsList();
    saveToLocalStorage();
}

function removeDebtItem(id) {
    if (appState.debts.length <= 1) return;
    appState.debts = appState.debts.filter(d => d.id !== id);
    renderDebtsList();
    saveToLocalStorage();
}

function updateDebt(id, field, value) {
    const debt = appState.debts.find(d => d.id === id);
    if (debt) {
        debt[field] = value;
        updateDebtsSummaryStats();
        saveToLocalStorage();
    }
}

// Math simulation runner for a single strategy
function runSimulation(debtsList, extraMonthly, strategyType) {
    let simDebts = debtsList.map(d => ({ ...d }));
    let totalMonths = 0;
    let totalInterest = 0;
    let history = [{ month: 0, totalBalance: simDebts.reduce((acc, d) => acc + d.balance, 0) }];
    let safety = 0;

    // Track original minimum payments so freed-up money snowballs into priority debt
    let rolledOverBudget = extraMonthly;

    while (simDebts.length > 0 && safety < 1200) {
        safety++;
        totalMonths++;

        // Sort priority
        if (strategyType === 'snowball') {
            simDebts.sort((a, b) => a.balance - b.balance);
        } else {
            // avalanche
            simDebts.sort((a, b) => b.rate - a.rate);
        }

        let currentAvailableSnowball = rolledOverBudget;

        // 1. Accrue monthly interest and pay minimums
        for (let i = 0; i < simDebts.length; i++) {
            let d = simDebts[i];
            let monthlyInterest = d.balance * (d.rate / 100 / 12);
            totalInterest += monthlyInterest;
            d.balance += monthlyInterest;

            let minPayAmt = Math.min(d.payment, d.balance);
            d.balance -= minPayAmt;

            // If min payment exceeded balance, the rest is freed into this month's snowball
            if (d.payment > minPayAmt) {
                currentAvailableSnowball += (d.payment - minPayAmt);
            }
        }

        // 2. Apply accelerated extra snowball payment to the top priority debt
        for (let i = 0; i < simDebts.length; i++) {
            if (currentAvailableSnowball <= 0) break;
            let d = simDebts[i];
            if (d.balance > 0) {
                let payAmt = Math.min(currentAvailableSnowball, d.balance);
                d.balance -= payAmt;
                currentAvailableSnowball -= payAmt;
            }
        }

        // Check which debts finished this month to permanently roll their min payment into snowball
        simDebts = simDebts.filter(d => {
            if (d.balance <= 0.01) {
                rolledOverBudget += d.payment;
                return false;
            }
            return true;
        });

        let currentRemaining = simDebts.reduce((acc, d) => acc + d.balance, 0);
        history.push({ month: totalMonths, totalBalance: Math.max(0, currentRemaining) });
    }

    return {
        isInfinite: safety >= 1200,
        totalMonths,
        totalInterest,
        history
    };
}

function formatDuration(totalMonths) {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    let parts = [];
    if (years > 0) {
        let yrWord = "років";
        if (years === 1) yrWord = "рік";
        else if (years >= 2 && years <= 4) yrWord = "роки";
        parts.push(`<strong>${years}</strong> ${yrWord}`);
    }
    if (months > 0 || years === 0) {
        let moWord = "місяців";
        if (months === 1) moWord = "місяць";
        else if (months >= 2 && months <= 4) moWord = "місяці";
        parts.push(`<strong>${months}</strong> ${moWord}`);
    }
    return parts.join(' ');
}

function calculateFreedomDate(totalMonths) {
    const date = new Date();
    date.setMonth(date.getMonth() + totalMonths);
    const monthsUa = [
        "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
        "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];
    return `${monthsUa[date.getMonth()]} ${date.getFullYear()}`;
}

function calcDebts(triggerConfetti = true) {
    const extraPay = parseFloat(document.getElementById('extra-pay').value) || 0;
    const strategy = document.getElementById('strategy').value;
    const resBox = document.getElementById('debt-result');
    const chartContainer = document.getElementById('debt-chart-container');

    appState.extraPay = extraPay;
    appState.strategy = strategy;
    saveToLocalStorage();

    // Filter valid debts
    const validDebts = appState.debts.filter(d => d.balance > 0 && d.payment > 0);

    if (validDebts.length === 0) {
        resBox.className = "p-5 rounded-xl border-l-4 bg-rose-50 border-rose-500 text-rose-900 text-sm";
        resBox.innerHTML = `<strong>⚠️ Додайте хоча б один активний кредит із залишком та платежем.</strong>`;
        resBox.classList.remove('hidden');
        chartContainer.classList.add('hidden');
        return;
    }

    // Run both simulations to allow comparison
    const snowballRes = runSimulation(validDebts, extraPay, 'snowball');
    const avalancheRes = runSimulation(validDebts, extraPay, 'avalanche');

    if (snowballRes.isInfinite && avalancheRes.isInfinite) {
        resBox.className = "p-5 rounded-xl border-l-4 bg-rose-50 border-rose-500 text-rose-900 text-sm space-y-2";
        resBox.innerHTML = `
            <div class="font-bold text-base">❌ Платежів недостатньо для покриття відсотків!</div>
            <p>Нараховані відсотки перевищують розмір щомісячних платежів. Борг збільшується з кожним місяцем. Будь ласка, суттєво збільшіть мінімальний платіж або суму «Додатково».</p>
        `;
        resBox.classList.remove('hidden');
        chartContainer.classList.add('hidden');
        return;
    }

    const activeRes = strategy === 'avalanche' ? avalancheRes : snowballRes;
    const activeName = strategy === 'avalanche' ? 'Лавина 🏔️' : 'Снігова куля ⛄';

    const interestSaved = Math.max(0, snowballRes.totalInterest - avalancheRes.totalInterest);
    const monthsSaved = Math.max(0, snowballRes.totalMonths - avalancheRes.totalMonths);

    let html = `
        <div class="p-6 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">✓</span>
                    <div>
                        <h4 class="font-extrabold text-slate-900 text-lg">План погашення готовий!</h4>
                        <p class="text-xs text-slate-500">За стратегією: <strong>${activeName}</strong></p>
                    </div>
                </div>
                <div class="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-200/70 text-emerald-900 self-start sm:self-center">
                    Свобода від боргів: <strong>${calculateFreedomDate(activeRes.totalMonths)}</strong>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div class="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span class="text-xs text-slate-500 block">Термін до повного закриття:</span>
                    <span class="text-lg font-extrabold text-slate-800">${formatDuration(activeRes.totalMonths)}</span>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span class="text-xs text-slate-500 block">Загальна переплата за %:</span>
                    <span class="text-lg font-extrabold ${activeRes.totalInterest === 0 ? 'text-emerald-700' : 'text-rose-700'}">
                        ${activeRes.totalInterest === 0 ? '0 ' + appState.currency + ' (0% переплат)' : formatMoney(activeRes.totalInterest)}
                    </span>
                </div>
                <div class="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span class="text-xs text-slate-500 block">Щомісячний прискорювач:</span>
                    <span class="text-lg font-extrabold text-sky-700">+${formatMoney(extraPay)}</span>
                </div>
            </div>
    `;

    // Strategy Comparison Card
    if (strategy === 'compare' || interestSaved > 5 || monthsSaved > 0) {
        html += `
            <div class="mt-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>⚖️</span> Порівняння Лавини та Снігової кулі:
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div class="p-2.5 rounded-lg ${strategy === 'avalanche' ? 'bg-sky-50 border border-sky-200' : 'bg-slate-50'}">
                        <strong class="text-sky-900">🏔️ Лавина:</strong> ${formatDuration(avalancheRes.totalMonths)} | Переплата: <strong>${formatMoney(avalancheRes.totalInterest)}</strong>
                    </div>
                    <div class="p-2.5 rounded-lg ${strategy === 'snowball' ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50'}">
                        <strong class="text-indigo-900">⛄ Снігова куля:</strong> ${formatDuration(snowballRes.totalMonths)} | Переплата: <strong>${formatMoney(snowballRes.totalInterest)}</strong>
                    </div>
                </div>
                ${interestSaved > 0 ? `
                    <p class="text-slate-500 pt-1">
                        💡 <strong>Висновок:</strong> Стратегія «Лавина» заощадить вам <strong>${formatMoney(interestSaved)}</strong> ${monthsSaved > 0 ? `і закриє борги на <strong>${monthsSaved} міс.</strong> раніше` : ''}. Проте «Снігова куля» дає швидші психологічні перемоги.
                    </p>
                ` : ''}
            </div>
        `;
    }

    html += `</div>`;

    resBox.innerHTML = html;
    resBox.classList.remove('hidden');
    chartContainer.classList.remove('hidden');

    renderDebtChart(snowballRes, avalancheRes, strategy);

    if (triggerConfetti && typeof confetti === 'function') {
        confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.6 }
        });
    }
}

function renderDebtChart(snowballRes, avalancheRes, activeStrategy) {
    const ctx = document.getElementById('debtChart').getContext('2d');

    const maxMonths = Math.max(snowballRes.history.length, avalancheRes.history.length);
    const labels = Array.from({ length: maxMonths }, (_, i) => `Міс. ${i}`);

    const snowballData = labels.map((_, i) => snowballRes.history[i] ? Math.round(snowballRes.history[i].totalBalance) : 0);
    const avalancheData = labels.map((_, i) => avalancheRes.history[i] ? Math.round(avalancheRes.history[i].totalBalance) : 0);

    const datasets = [];

    if (activeStrategy === 'compare' || activeStrategy === 'avalanche') {
        datasets.push({
            label: `🏔️ Лавина (${appState.currency})`,
            data: avalancheData,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            tension: 0.2,
            borderWidth: 2.5,
            pointRadius: maxMonths > 36 ? 0 : 3
        });
    }

    if (activeStrategy === 'compare' || activeStrategy === 'snowball') {
        datasets.push({
            label: `⛄ Снігова куля (${appState.currency})`,
            data: snowballData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.2,
            borderWidth: 2.5,
            pointRadius: maxMonths > 36 ? 0 : 3
        });
    }

    if (debtChartInstance) {
        debtChartInstance.destroy();
    }

    debtChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: val => val.toLocaleString('uk-UA') + ' ' + appState.currency
                    }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString('uk-UA')} ${appState.currency}`
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   SECTION 04 & 05: BUDGET ENVELOPES & ALLOCATION
   ========================================================================== */
function syncBudgetInputs() {
    ['inc1', 'inc2', 'needs', 'goal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = appState.budget[id];
            el.addEventListener('input', () => {
                appState.budget[id] = Number(el.value) || 0;
                updateLiveBudgetSummary();
                saveToLocalStorage();
            });
        }
    });

    ['p_wants', 'p_dev', 'p_unexp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = appState.budget[id];
            document.getElementById(`${id}_val`).textContent = `${appState.budget[id]}%`;
        }
    });
}

function updateLiveBudgetSummary() {
    const totalIncome = (appState.budget.inc1 || 0) + (appState.budget.inc2 || 0);
    const remainder = Math.max(0, totalIncome - (appState.budget.needs || 0) - (appState.budget.goal || 0));

    document.getElementById('live-total-inc').textContent = formatMoney(totalIncome);
    document.getElementById('live-remainder').textContent = formatMoney(remainder);

    // Update estimates under sliders
    document.getElementById('wants-est').textContent = formatMoney(remainder * (appState.budget.p_wants / 100));
    document.getElementById('dev-est').textContent = formatMoney(remainder * (appState.budget.p_dev / 100));
    document.getElementById('unexp-est').textContent = formatMoney(remainder * (appState.budget.p_unexp / 100));
}

function syncPercentages(changedId) {
    const p_wants = Number(document.getElementById('p_wants').value) || 0;
    const p_dev = Number(document.getElementById('p_dev').value) || 0;
    const p_unexp = Number(document.getElementById('p_unexp').value) || 0;

    appState.budget.p_wants = p_wants;
    appState.budget.p_dev = p_dev;
    appState.budget.p_unexp = p_unexp;

    document.getElementById('p_wants_val').textContent = `${p_wants}%`;
    document.getElementById('p_dev_val').textContent = `${p_dev}%`;
    document.getElementById('p_unexp_val').textContent = `${p_unexp}%`;

    const total = p_wants + p_dev + p_unexp;
    const badge = document.getElementById('pct-badge');
    const pctTotal = document.getElementById('pct-total');
    pctTotal.textContent = total;

    if (total === 100) {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
        document.getElementById('calc-error').classList.add('hidden');
    } else {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse";
    }

    updateLiveBudgetSummary();
    saveToLocalStorage();
}

function applyPreset(wants, dev, unexp) {
    document.getElementById('p_wants').value = wants;
    document.getElementById('p_dev').value = dev;
    document.getElementById('p_unexp').value = unexp;
    syncPercentages('all');
    calculateBudget(false);
}

function calculateBudget(scroll = true) {
    const { inc1, inc2, needs, goal, p_wants, p_dev, p_unexp } = appState.budget;
    const totalPct = p_wants + p_dev + p_unexp;

    const errorBox = document.getElementById('calc-error');
    if (totalPct !== 100) {
        errorBox.classList.remove('hidden');
        document.getElementById('calc-error-total').textContent = totalPct;
        return;
    }
    errorBox.classList.add('hidden');

    const totalIncome = inc1 + inc2;
    const remainder = Math.max(0, totalIncome - needs - goal);

    const wantsAmt = remainder * (p_wants / 100);
    const devAmt = remainder * (p_dev / 100);
    const unexpAmt = remainder * (p_unexp / 100);

    // Update Envelope amounts
    setEnvelopeData(1, needs);
    setEnvelopeData(2, wantsAmt);
    setEnvelopeData(3, devAmt);
    setEnvelopeData(4, unexpAmt);

    // Goal amount
    document.getElementById('env-goal-amt').textContent = Math.round(goal).toLocaleString('uk-UA');

    // Update Doughnut Chart
    renderBudgetDoughnut(totalIncome, needs, goal, wantsAmt, devAmt, unexpAmt);

    if (scroll) {
        document.getElementById('envelopes-view').scrollIntoView({ behavior: 'smooth' });
        if (typeof confetti === 'function') {
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
        }
    }
}

function setEnvelopeData(envNum, monthlyAmt) {
    const amtEl = document.getElementById(`env${envNum}-amt`);
    const weekEl = document.getElementById(`env${envNum}-week`);
    const dayEl = document.getElementById(`env${envNum}-day`);

    if (amtEl) amtEl.innerHTML = `${Math.round(monthlyAmt).toLocaleString('uk-UA')} <span class="curr-symbol text-lg">${appState.currency}</span>`;
    if (weekEl) weekEl.textContent = Math.round(monthlyAmt / 4.33).toLocaleString('uk-UA');
    if (dayEl) dayEl.textContent = Math.round(monthlyAmt / 30).toLocaleString('uk-UA');
}

function toggleEnvelope(envNum) {
    // Micro interaction feedback
    const card = document.querySelectorAll('.envelope-card')[envNum - 1];
    if (card) {
        card.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => card.classList.remove('ring-2', 'ring-amber-500'), 400);
    }
}

function renderBudgetDoughnut(total, needs, goal, wants, dev, unexp) {
    const ctx = document.getElementById('budgetDoughnut').getContext('2d');

    const pctNeeds = total > 0 ? Math.round((needs / total) * 100) : 0;
    const pctGoal = total > 0 ? Math.round((goal / total) * 100) : 0;
    const pctWants = total > 0 ? Math.round((wants / total) * 100) : 0;
    const pctDev = total > 0 ? Math.round((dev / total) * 100) : 0;
    const pctUnexp = total > 0 ? Math.round((unexp / total) * 100) : 0;

    document.getElementById('chart-pct-needs').textContent = `${pctNeeds}%`;
    document.getElementById('chart-pct-goal').textContent = `${pctGoal}%`;
    document.getElementById('chart-pct-wants').textContent = `${pctWants}%`;
    document.getElementById('chart-pct-dev').textContent = `${pctDev}%`;
    document.getElementById('chart-pct-unexp').textContent = `${pctUnexp}%`;

    const data = {
        labels: ['Необхідне', 'Ціль/Борги', 'Бажання', 'Розвиток', 'Резерв'],
        datasets: [{
            data: [needs, goal, wants, dev, unexp],
            backgroundColor: ['#C58958', '#D6942C', '#D87A89', '#5B8C67', '#477C98'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 6
        }]
    };

    if (doughnutChartInstance) {
        doughnutChartInstance.destroy();
    }

    doughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${Math.round(ctx.raw).toLocaleString('uk-UA')} ${appState.currency}`
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   DATA PERSISTENCE & UTILITIES
   ========================================================================== */
function saveToLocalStorage() {
    try {
        localStorage.setItem('kakeibo_app_state', JSON.stringify(appState));
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('kakeibo_app_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.version === CURRENT_DATA_VERSION && Array.isArray(parsed.debts) && parsed.debts.length > 0) {
                appState = { ...appState, ...parsed };
                return;
            }
        }
    } catch (e) {
        console.warn('LocalStorage load failed:', e);
    }
    // Initialize with photo debts
    appState.version = CURRENT_DATA_VERSION;
    appState.debts = JSON.parse(JSON.stringify(DEFAULT_DEBTS));
    saveToLocalStorage();
}

function resetToDefaults() {
    if (confirm("Скинути всі дані та налаштування до початкових значень зі списку?")) {
        localStorage.removeItem('kakeibo_app_state');
        location.reload();
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}
