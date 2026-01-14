// Constants
const NORWEGIAN_MONTHS = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
const NORWEGIAN_WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const NORWEGIAN_DAY_NAMES = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const NORWEGIAN_MONTH_NAMES = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

const STORAGE_KEY_DATA = 'calendar_app_data';
const STORAGE_KEY_AUTH = 'calendar_app_is_admin';

// State
let currentDate = new Date();
let calendarData = {};
let isAdmin = false;
let editingDate = null;
let weekOffset = 0;
let currentSelectedStatus = 'unknown';

// Utility Functions
function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return (day + 6) % 7; // Convert Sunday=0 to Monday=0
}

function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getPreviousMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function getNextMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekStart(date, offset = 0) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff + offset * 7);
    return d;
}

// Storage Functions
function loadCalendarData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_DATA);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load calendar data', e);
        return {};
    }
}

function saveCalendarData(data) {
    try {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save calendar data', e);
    }
}

function loadAuthState() {
    try {
        return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    } catch (e) {
        return false;
    }
}

function saveAuthState(admin) {
    try {
        localStorage.setItem(STORAGE_KEY_AUTH, String(admin));
    } catch (e) {
        console.error('Failed to save auth state', e);
    }
}

// Icon SVG helpers
function getCheckIcon() {
    return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
}

function getXIcon() {
    return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
}

function getHelpIcon() {
    return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
}

function getChevronRightIcon() {
    return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
}

// Render Functions
function renderDayCell(date, dateString, data, isCurrentMonth) {
    const status = data?.status || 'unknown';
    const message = data?.message || '';
    const isCurrentDay = isToday(date);

    const statusConfig = {
        available: 'bg-emerald-100 hover-bg-emerald-200 border border-emerald-300 text-emerald-950',
        unavailable: 'bg-red-100 hover-bg-red-200 border border-red-300 text-red-950',
        unknown: 'bg-white hover-bg-gray-50 border border-gray-200 text-gray-900'
    };

    const dotColor = {
        available: 'bg-emerald-600 ring-2 ring-emerald-200',
        unavailable: 'bg-red-600 ring-2 ring-red-200',
        unknown: 'hidden'
    };

    const cell = document.createElement('div');
    cell.className = `relative p-2 sm-p-3 day-cell transition-all duration-200 flex flex-col group touch-manipulation ${isCurrentMonth ? 'current-month opacity-100' : 'other-month opacity-40 bg-gray-50'} ${isAdmin ? 'cursor-pointer active-scale-95 admin-mode' : 'cursor-default'} ${statusConfig[status]}`;

    if (isAdmin && isCurrentMonth) {
        cell.classList.add('hover-shadow-lg');
    }

    cell.innerHTML = `
        <div class="flex justify-between items-start mb-1">
            <span class="text-sm sm-text-base font-semibold w-7 h-7 sm-w-8 sm-h-8 flex items-center justify-center rounded-full transition-all ${isCurrentDay ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'text-gray-800'}">
                ${date.getDate()}
            </span>
            ${status !== 'unknown' ? `<div class="w-2-5 h-2-5 sm-w-3 sm-h-3 rounded-full ${dotColor[status]} mt-0-5 sm-mt-1 mr-0-5"></div>` : ''}
        </div>
        <div class="mt-1 flex-grow overflow-hidden">
            ${message ? `<p class="text-xs sm-text-sm font-medium leading-tight sm-leading-snug line-clamp-3 sm-line-clamp-4 break-words">${message}</p>` : isAdmin && isCurrentMonth ? '<div class="hidden sm-block opacity-0 group-hover-opacity-100 transition-opacity duration-200 text-xs text-gray-500 italic mt-2">Klikk for å redigere</div>' : ''}
        </div>
    `;

    if (isAdmin) {
        cell.addEventListener('click', () => openEditModal(dateString));
    }

    return cell;
}

function renderDayRow(date, dateString, data, isCurrentMonth) {
    const status = data?.status || 'unknown';
    const message = data?.message || '';
    const isCurrentDay = isToday(date);
    const dayName = NORWEGIAN_DAY_NAMES[date.getDay()];
    const dayNumber = date.getDate();
    const monthName = NORWEGIAN_MONTH_NAMES[date.getMonth()];

    const statusConfig = {
        available: {
            bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100-50 border-emerald-200',
            badge: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm',
            text: 'Tilgjengelig',
            icon: getCheckIcon(),
            iconColor: 'text-emerald-500'
        },
        unavailable: {
            bg: 'bg-gradient-to-br from-red-50 to-red-100-50 border-red-200',
            badge: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
            text: 'Ikke tilgjengelig',
            icon: getXIcon(),
            iconColor: 'text-red-500'
        },
        unknown: {
            bg: 'bg-white border-gray-200',
            badge: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 shadow-sm',
            text: 'Ukjent',
            icon: getHelpIcon(),
            iconColor: 'text-gray-400'
        }
    };

    const config = statusConfig[status];

    const row = document.createElement('div');
    row.className = `relative p-4 border rounded-2xl transition-all duration-300 touch-manipulation group ${isCurrentMonth ? 'opacity-100' : 'opacity-50'} ${isAdmin ? 'cursor-pointer active-scale-95' : 'cursor-default'} ${config.bg} ${isAdmin ? 'hover-shadow-lg hover--translate-y-0-5' : ''} ${isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-2 shadow-md' : 'shadow-sm'}`;

    row.innerHTML = `
        ${isCurrentDay ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500-50"></div>' : ''}
        <div class="flex items-start justify-between gap-3">
            <div class="flex-shrink-0">
                <div class="flex items-baseline gap-2-5">
                    <span class="text-3xl font-bold transition-all duration-300 ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}">
                        ${dayNumber}
                    </span>
                    <div class="flex flex-col">
                        <span class="text-sm font-semibold text-gray-900">${dayName}</span>
                        <span class="text-xs text-gray-500 capitalize">${monthName}</span>
                    </div>
                </div>
            </div>
            <div class="flex-grow min-w-0">
                <div class="flex items-center gap-2 mb-2">
                    <span class="inline-flex items-center gap-1-5 px-3 py-1-5 rounded-full text-xs font-semibold transition-all duration-300 ${config.badge} ${isAdmin ? 'group-hover-scale-105' : ''}">
                        ${config.icon}
                        ${config.text}
                    </span>
                </div>
                ${message ? `<p class="text-sm text-gray-700 leading-relaxed break-words">${message}</p>` : isAdmin ? '<p class="text-xs text-gray-400 italic flex items-center gap-1-5 transition-opacity duration-300 opacity-60 group-hover-opacity-100"><span class="w-1 h-1 rounded-full bg-gray-400"></span>Trykk for å legge til melding</p>' : ''}
            </div>
            ${isAdmin ? `<div class="flex-shrink-0 text-gray-400 transition-all duration-300 group-hover-text-gray-600 group-hover-translate-x-0-5">${getChevronRightIcon()}</div>` : ''}
        </div>
    `;

    if (isAdmin) {
        row.addEventListener('click', () => openEditModal(dateString));
    }

    return row;
}

function renderMonthGrid() {
    const daysGrid = document.getElementById('daysGrid');
    daysGrid.innerHTML = '';

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonth(currentDate);

    // Previous month padding
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
        const dateString = formatDateISO(date);
        const cell = renderDayCell(date, dateString, calendarData[dateString], false);
        daysGrid.appendChild(cell);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = formatDateISO(date);
        const cell = renderDayCell(date, dateString, calendarData[dateString], true);
        daysGrid.appendChild(cell);
    }

    // Next month padding
    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = 42 - totalCells;
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    for (let day = 1; day <= remainingCells; day++) {
        const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
        const dateString = formatDateISO(date);
        const cell = renderDayCell(date, dateString, calendarData[dateString], false);
        daysGrid.appendChild(cell);
    }
}

function renderWeekView() {
    const weekDaysList = document.getElementById('weekDaysList');
    weekDaysList.innerHTML = '';

    // Use today's date for week view instead of currentDate
    const today = new Date();
    const weekStart = getWeekStart(today, weekOffset);

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateString = formatDateISO(date);
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();

        const dayContainer = document.createElement('div');
        dayContainer.style.animationDelay = `${i * 50}ms`;
        dayContainer.style.animationFillMode = 'backwards';
        dayContainer.className = 'animate-fade-in';

        const row = renderDayRow(date, dateString, calendarData[dateString], isCurrentMonth);
        dayContainer.appendChild(row);
        weekDaysList.appendChild(dayContainer);
    }

    // Update week info
    const firstDay = new Date(weekStart);
    const lastDay = new Date(weekStart);
    lastDay.setDate(lastDay.getDate() + 6);

    document.getElementById('weekNumber').textContent = `Uke ${getWeekNumber(firstDay)}`;
    document.getElementById('weekRange').textContent = `${firstDay.getDate()}. - ${lastDay.getDate()}. ${NORWEGIAN_MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;

    // Update the main header to show the month of the first day of the week
    document.getElementById('monthName').textContent = NORWEGIAN_MONTHS[firstDay.getMonth()];
    document.getElementById('yearName').textContent = firstDay.getFullYear();
}

function updateHeader() {
    document.getElementById('monthName').textContent = NORWEGIAN_MONTHS[currentDate.getMonth()];
    document.getElementById('yearName').textContent = currentDate.getFullYear();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const adminBadge = document.getElementById('adminBadge');

    if (isAdmin) {
        loginBtn.classList.add('hidden');
        adminBadge.classList.remove('hidden');
        adminBadge.classList.add('flex');
    } else {
        loginBtn.classList.remove('hidden');
        adminBadge.classList.add('hidden');
        adminBadge.classList.remove('flex');
    }
}

function render() {
    updateHeader();
    updateAuthUI();
    renderMonthGrid();
    renderWeekView();
}

// Modal Functions
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('usernameInput').focus();
    document.getElementById('loginError').classList.add('hidden');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').classList.add('hidden');
}

function openEditModal(dateString) {
    if (!isAdmin) return;

    editingDate = dateString;
    const modal = document.getElementById('editModal');
    const data = calendarData[dateString];

    document.getElementById('editDateDisplay').textContent = dateString;
    document.getElementById('messageInput').value = data?.message || '';

    // Set status
    currentSelectedStatus = data?.status || 'unknown';
    updateStatusSelection();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingDate = null;
    currentSelectedStatus = 'unknown';
}

function updateStatusSelection() {
    const options = document.querySelectorAll('.status-option');
    options.forEach(option => {
        const status = option.getAttribute('data-status');
        if (status === currentSelectedStatus) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Event Handlers
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;

    if (username === 'admin' && password === 'admin123') {
        isAdmin = true;
        saveAuthState(true);
        closeLoginModal();
        render();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function handleLogout() {
    isAdmin = false;
    saveAuthState(false);
    render();
}

function handleSaveDay(e) {
    e.preventDefault();
    if (!editingDate) return;

    const message = document.getElementById('messageInput').value;

    calendarData[editingDate] = {
        date: editingDate,
        status: currentSelectedStatus,
        message: message
    };

    saveCalendarData(calendarData);
    closeEditModal();
    render();
}

function handlePrevMonth() {
    currentDate = getPreviousMonth(currentDate);
    weekOffset = 0;
    render();
}

function handleNextMonth() {
    currentDate = getNextMonth(currentDate);
    weekOffset = 0;
    render();
}

function handlePrevWeek() {
    weekOffset--;
    renderWeekView();
}

function handleNextWeek() {
    weekOffset++;
    renderWeekView();
}

// Initialize
function init() {
    // Load data
    calendarData = loadCalendarData();
    isAdmin = loadAuthState();

    // Event listeners - Navigation
    document.getElementById('prevMonthBtn').addEventListener('click', handlePrevMonth);
    document.getElementById('nextMonthBtn').addEventListener('click', handleNextMonth);
    document.getElementById('prevWeekBtn').addEventListener('click', handlePrevWeek);
    document.getElementById('nextWeekBtn').addEventListener('click', handleNextWeek);

    // Event listeners - Auth
    document.getElementById('loginBtn').addEventListener('click', openLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('closeLoginBtn').addEventListener('click', closeLoginModal);
    document.getElementById('cancelLoginBtn').addEventListener('click', closeLoginModal);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Event listeners - Edit Modal
    document.getElementById('closeEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('editForm').addEventListener('submit', handleSaveDay);

    // Status option buttons
    const statusOptions = document.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            currentSelectedStatus = option.getAttribute('data-status');
            updateStatusSelection();
        });
    });

    // Close modals on backdrop click
    document.getElementById('loginModal').addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') {
            closeLoginModal();
        }
    });

    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') {
            closeEditModal();
        }
    });

    // Initial render
    render();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}