// ============================================
// ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP
// ============================================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ============================================
// ГЛОБАЛЬНЫЕ ДАННЫЕ
// ============================================
const urlParams = new URLSearchParams(window.location.search);
const user = tg.initDataUnsafe?.user;
const userId = urlParams.get('user_id') || user?.id || 'guest';

// Состояние приложения
let transactions = [];
let chart = null;
let currentPeriod = 'month';
let currentChartType = 'pie';
let currentTransactionType = 'expense';

// ============================================
// КОНСТАНТЫ
// ============================================
const TRANSACTION_TYPES = {
    INCOME: 'income',
    EXPENSE: 'expense'
};

const CATEGORIES = {
    expense: [
        { icon: '🍔', name: 'Еда' },
        { icon: '🏠', name: 'Жилье' },
        { icon: '🚗', name: 'Транспорт' },
        { icon: '👕', name: 'Одежда' },
        { icon: '🎮', name: 'Развлечения' },
        { icon: '💊', name: 'Здоровье' },
        { icon: '📚', name: 'Образование' },
        { icon: '💸', name: 'Другое' }
    ],
    income: [
        { icon: '💼', name: 'Зарплата' },
        { icon: '🎁', name: 'Подарки' },
        { icon: '📈', name: 'Инвестиции' },
        { icon: '💻', name: 'Фриланс' },
        { icon: '🏦', name: 'Кэшбэк' },
        { icon: '💰', name: 'Сбережения' },
        { icon: '🎲', name: 'Выигрыш' },
        { icon: '💸', name: 'Другое' }
    ]
};

const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Mini App инициализация...');
    
    initUI();
    loadUserData();
    loadTestData();
    
    // Гарантированный вызов обновления
    setTimeout(() => {
        window.updateBalance();
        window.updateExpensesList();
    }, 100);
});

function initUI() {
    // Приветствие
    const greetingEl = document.getElementById('greeting');
    if (greetingEl && user?.first_name) {
        greetingEl.textContent = `Привет, ${user.first_name}! 👋`;
    }
    
    // Инициализация категорий
    initCategoriesGrid();
    initCategorySelect();
    setDefaultDate();
}

function initCategoriesGrid() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    
    grid.innerHTML = CATEGORIES.expense.map(cat => 
        `<div class="category-item" onclick="window.selectCategory('${cat.icon} ${cat.name}')">
            <span class="category-icon">${cat.icon}</span>
            <span>${cat.name}</span>
        </div>`
    ).join('');
}

function initCategorySelect() {
    const select = document.getElementById('category');
    if (!select) return;
    
    updateCategorySelect();
}

function updateCategorySelect() {
    const select = document.getElementById('category');
    if (!select) return;
    
    const categories = CATEGORIES[currentTransactionType];
    select.innerHTML = categories.map(c => 
        `<option value="${c.icon} ${c.name}">${c.icon} ${c.name}</option>`
    ).join('');
}

function setDefaultDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// ============================================
// ПОЛЬЗОВАТЕЛЬСКИЕ ДАННЫЕ
// ============================================
function loadUserData() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user?.first_name || 'Гость';
    }
    
    const userAvatarEl = document.getElementById('userAvatar');
    if (userAvatarEl) {
        if (user?.photo_url) {
            userAvatarEl.innerHTML = `<img src="${user.photo_url}" alt="avatar">`;
        } else {
            const firstLetter = (user?.first_name?.[0] || '?').toUpperCase();
            userAvatarEl.innerHTML = `<div class="avatar-placeholder">${firstLetter}</div>`;
        }
    }
}

// ============================================
// ТЕСТОВЫЕ ДАННЫЕ
// ============================================
function loadTestData() {
    transactions = [
        // Расходы
        { type: 'expense', category: '🍔 Еда', amount: 500, date: '2026-03-14', description: 'Обед' },
        { type: 'expense', category: '🚗 Транспорт', amount: 300, date: '2026-03-14', description: 'Такси' },
        { type: 'expense', category: '🍔 Еда', amount: 1200, date: '2026-03-13', description: 'Продукты' },
        { type: 'expense', category: '🎮 Развлечения', amount: 1500, date: '2026-03-12', description: 'Кино' },
        { type: 'expense', category: '🏠 Жилье', amount: 5000, date: '2026-03-10', description: 'Коммуналка' },
        
        // Доходы
        { type: 'income', category: '💼 Зарплата', amount: 75000, date: '2026-03-05', description: 'Зарплата' },
        { type: 'income', category: '🎁 Подарки', amount: 3000, date: '2026-03-08', description: 'День рождения' },
        { type: 'income', category: '💻 Фриланс', amount: 5000, date: '2026-03-15', description: 'Проект' }
    ];
    
    console.log('📊 Тестовые данные загружены:', transactions.length, 'транзакций');
}

// ============================================
// ОБНОВЛЕНИЕ UI
// ============================================
function updateUI() {
    window.updateBalance();
    window.updateExpensesList();
}

// ============================================
// БАЛАНС
// ============================================
async function updateBalance() {
    console.log('⚖️ Обновление баланса...');
    
    try {
        const now = new Date();
        const monthTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const delta = income - expense;
        const savingsPercent = income > 0 ? ((delta / income) * 100).toFixed(1) : 0;
        
        // Обновляем элементы
        setElementText('monthlyIncome', `${formatMoney(income)} ₽`);
        setElementText('monthlyExpense', `${formatMoney(expense)} ₽`);
        
        const deltaEl = document.getElementById('monthlyDelta');
        if (deltaEl) {
            deltaEl.textContent = `${formatMoney(delta)} ₽`;
            deltaEl.className = `balance-delta ${delta >= 0 ? 'positive' : 'negative'}`;
        }
        
        setElementText('savingsAmount', `${formatMoney(delta)} ₽`);
        setElementText('savingsPercent', `(${savingsPercent}%)`);
        setElementText('currentPeriod', `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
        
        // Цвет для сбережений
        const savingsAmountEl = document.getElementById('savingsAmount');
        if (savingsAmountEl) {
            savingsAmountEl.className = delta >= 0 ? 'positive' : 'negative';
        }
        
        console.log('✅ Баланс обновлён:', { income, expense, delta });
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
    }
}

// ============================================
// СПИСОК ТРАНЗАКЦИЙ
// ============================================
function updateExpensesList() {
    const list = document.getElementById('expensesList');
    if (!list) return;
    
    if (transactions.length === 0) {
        list.innerHTML = '<div class="loading">Нет транзакций</div>';
        return;
    }
    
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    list.innerHTML = sorted.slice(0, 10).map(t => {
        const amountClass = t.type === 'income' ? 'income-amount' : 'expense-amount';
        const sign = t.type === 'income' ? '+' : '-';
        
        return `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">${t.category.split(' ')[0]}</div>
                    <div class="expense-details">
                        <span class="expense-category-name">${t.category}</span>
                        <span class="expense-date">${formatDate(t.date)}</span>
                        ${t.description ? `<span class="expense-description">${t.description}</span>` : ''}
                    </div>
                </div>
                <div class="${amountClass}">${sign}${formatMoney(t.amount)} ₽</div>
            </div>
        `;
    }).join('');
    
    console.log('📋 Список транзакций обновлён');
}

// ============================================
// УПРАВЛЕНИЕ ТИПАМИ ТРАНЗАКЦИЙ
// ============================================
function setTransactionType(type) {
    currentTransactionType = type;
    
    document.querySelectorAll('.type-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    updateCategorySelect();
}

function selectCategory(category) {
    const select = document.getElementById('category');
    if (select) select.value = category;
    
    if (currentTransactionType !== 'expense') {
        setTransactionType('expense');
    }
    
    showAddExpense();
}

// ============================================
// МОДАЛЬНОЕ ОКНО
// ============================================
function showAddExpense() {
    setTransactionType('expense');
    document.getElementById('expenseModal')?.classList.add('show');
}

function closeModal() {
    document.getElementById('expenseModal')?.classList.remove('show');
    document.getElementById('expenseForm')?.reset();
    setDefaultDate();
}

function saveTransaction() {
    const amount = parseFloat(document.getElementById('amount')?.value);
    const category = document.getElementById('category')?.value;
    const description = document.getElementById('description')?.value;
    const date = document.getElementById('date')?.value;
    
    if (!amount || amount <= 0 || !category) {
        tg.showAlert('Заполните все поля');
        return;
    }
    
    const transaction = {
        type: currentTransactionType,
        amount,
        category,
        description: description || '',
        date: date || new Date().toISOString().split('T')[0]
    };
    
    transactions.unshift(transaction);
    
    tg.sendData(JSON.stringify({
        action: 'add_transaction',
        transaction
    }));
    
    updateUI();
    closeModal();
    
    const typeText = currentTransactionType === 'income' ? 'Доход' : 'Расход';
    tg.showAlert(`✅ ${typeText} добавлен: ${formatMoney(amount)} ₽`);
}

// ============================================
// АНАЛИТИКА И ГРАФИКИ
// ============================================
function showAnalytics() {
    document.getElementById('analyticsModal')?.classList.add('show');
    loadAnalytics(currentPeriod);
}

function closeAnalytics() {
    document.getElementById('analyticsModal')?.classList.remove('show');
}

function loadAnalytics(period) {
    currentPeriod = period;
    
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(period)) {
            tab.classList.add('active');
        }
    });
    
    const analytics = generateTestAnalytics(period);
    updateStatsGrid(analytics);
    updateChart(analytics);
}

function generateTestAnalytics(period) {
    const multipliers = { week: 1, month: 4, year: 52 };
    const multiplier = multipliers[period] || 1;
    
    const cats = CATEGORIES.expense.map(c => `${c.icon} ${c.name}`);
    
    const byCategory = cats.map(cat => ({
        category: cat,
        total: Math.round((Math.random() * 5000 + 1000) * multiplier),
        count: Math.round((Math.random() * 10 + 2) * multiplier),
        percentage: 0
    }));
    
    const total = byCategory.reduce((sum, c) => sum + c.total, 0);
    byCategory.forEach(c => c.percentage = (c.total / total) * 100);
    
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    const byDay = [];
    
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        byDay.push({
            date: date.toISOString().split('T')[0],
            total: Math.round(Math.random() * 3000 + 500)
        });
    }
    
    return {
        period,
        total,
        average: total / (byCategory.reduce((sum, c) => sum + c.count, 0) || 1),
        max: Math.max(...byCategory.map(c => c.total)),
        min: Math.min(...byCategory.map(c => c.total)),
        byCategory,
        byDay,
        trend: Math.random() > 0.5 ? 'up' : 'down'
    };
}

function updateStatsGrid(analytics) {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Всего</div>
            <div class="stat-value">${formatMoney(analytics.total)} ₽</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Средний</div>
            <div class="stat-value">${formatMoney(Math.round(analytics.average))} ₽</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Макс</div>
            <div class="stat-value">${formatMoney(analytics.max)} ₽</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Мин</div>
            <div class="stat-value">${formatMoney(analytics.min)} ₽</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Записей</div>
            <div class="stat-value">${analytics.byCategory.reduce((s, c) => s + c.count, 0)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Тренд</div>
            <div class="stat-value">${analytics.trend === 'up' ? '📈' : '📉'}</div>
        </div>
    `;
}

function showCharts() {
    showAnalytics();
}

function switchChart(type) {
    currentChartType = type;
    
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(type)) {
            tab.classList.add('active');
        }
    });
    
    loadAnalytics(currentPeriod);
}

function updateChart(analytics) {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();
    
    let config;
    
    switch (currentChartType) {
        case 'pie':
            config = {
                type: 'pie',
                data: {
                    labels: analytics.byCategory.map(c => c.category),
                    datasets: [{
                        data: analytics.byCategory.map(c => c.total),
                        backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F7DC6F', '#BB8FCE']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            };
            break;
            
        case 'bar':
            config = {
                type: 'bar',
                data: {
                    labels: analytics.byCategory.map(c => c.category),
                    datasets: [{
                        label: 'Сумма (₽)',
                        data: analytics.byCategory.map(c => c.total),
                        backgroundColor: '#4ECDC4'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: (value) => value + '₽' }
                        }
                    }
                }
            };
            break;
            
        case 'line':
            config = {
                type: 'line',
                data: {
                    labels: analytics.byDay.map(d => {
                        const date = new Date(d.date);
                        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                    }),
                    datasets: [{
                        label: 'Расходы',
                        data: analytics.byDay.map(d => d.total),
                        borderColor: '#FF6B6B',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { callback: (value) => value + '₽' }
                        }
                    }
                }
            };
            break;
    }
    
    if (config) {
        chart = new Chart(ctx, config);
    }
}

// ============================================
// МЕНЮ
// ============================================
function toggleMenu() {
    document.getElementById('menuModal')?.classList.toggle('show');
}

function closeMenu() {
    document.getElementById('menuModal')?.classList.remove('show');
}

function goToProfile() {
    closeMenu();
    tg.showAlert(`👤 Профиль\n\nИмя: ${user?.first_name || 'Гость'}\nID: ${userId}`);
}

function goToSettings() {
    closeMenu();
    tg.showAlert('⚙️ Настройки\n\nФункция в разработке');
}

function exportData() {
    closeMenu();
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    tg.showAlert(`📤 Экспорт данных\n\nВсего записей: ${transactions.length}\nОбщая сумма: ${formatMoney(total)} ₽`);
}

function logout() {
    closeMenu();
    tg.showAlert('🚪 Выход из аккаунта');
}

// ============================================
// УТИЛИТЫ
// ============================================
function formatMoney(amount) {
    return amount.toLocaleString('ru-RU');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ============================================
// ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
// ============================================
window.updateBalance = updateBalance;
window.updateExpensesList = updateExpensesList;
window.updateUI = updateUI;
window.selectCategory = selectCategory;
window.setTransactionType = setTransactionType;
window.showAddExpense = showAddExpense;
window.closeModal = closeModal;
window.saveTransaction = saveTransaction;
window.showAnalytics = showAnalytics;
window.closeAnalytics = closeAnalytics;
window.showCharts = showCharts;
window.switchChart = switchChart;
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.goToProfile = goToProfile;
window.goToSettings = goToSettings;
window.exportData = exportData;
window.logout = logout;

console.log('✅ Mini App готов, функции загружены:', Object.keys(window).filter(k => k.includes('update') || k.includes('show')));