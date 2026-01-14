// Admin Calendar - Production v1.0
// Calendar with admin authentication and database storage
// Constants
const NORWEGIAN_MONTHS = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
const NORWEGIAN_WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const NORWEGIAN_DAY_NAMES = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const NORWEGIAN_MONTH_NAMES = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

// State
let currentDate = new Date();
let calendarData = {};
let isAdmin = false;
let currentUser = null;
let editingDate = null;
let weekOffset = 0;
let currentSelectedStatus = 'unknown';

// Get Supabase client from config (already initialized in supabase-config.js)
const db = window.supabaseClient;

// Safety check
if (!db) {
    console.error('❌ ERROR: Supabase client not initialized!');
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================

// Load all calendar data from database
async function loadCalendarDataFromDB() {
    try {
        const { data, error } = await db
            .from('calendar_data')
            .select('*');

        if (error) {
            console.error('❌ DATABASE ERROR:', error);
            console.error('Error details:', error.message);
            throw error;
        }


        // Convert array to object with date as key
        const dataObj = {};
        if (data) {
            data.forEach(item => {
                dataObj[item.date] = {
                    status: item.status,
                    message: item.message || ''
                };
            });
        }

        return dataObj;
    } catch (error) {
        console.error('❌ ERROR loading calendar data:', error);
        alert('FEIL ved lasting av kalenderdata!\n\n' + error.message);
        return {};
    }
}

// Save or update a day's data
async function saveDayToDB(dateString, status, message) {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        const { data, error } = await db
            .from('calendar_data')
            .upsert({
                date: dateString,
                status: status,
                message: message || '',
                updated_by: currentUser.id,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'date'
            })
            .select();

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error saving day:', error);
        alert('Kunne ikke lagre endringer. Vennligst prøv igjen.');
        return false;
    }
}

// Login with Supabase Auth
async function loginUser(email, password) {
    try {
        // Sign in with Supabase
        const { data: authData, error: authError } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) throw authError;

        // Check if user is admin
        const { data: userData, error: userError } = await db
            .from('users')
            .select('is_admin, username')
            .eq('email', email)
            .single();

        if (userError) throw userError;

        if (!userData.is_admin) {
            await db.auth.signOut();
            throw new Error('Ikke admin bruker');
        }

        currentUser = authData.user;
        isAdmin = true;

        return { success: true, user: userData };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout
async function logoutUser() {
    try {
        await db.auth.signOut();
        currentUser = null;
        isAdmin = false;
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

// Check if user is already logged in on page load
async function checkExistingSession() {
    try {
        const { data: { session } } = await db.auth.getSession();

        if (session) {
            // User has active session, verify admin status
            const { data: userData, error } = await db
                .from('users')
                .select('is_admin, username')
                .eq('id', session.user.id)
                .single();

            if (!error && userData && userData.is_admin) {
                currentUser = session.user;
                isAdmin = true;
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Session check error:', error);
        return false;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

// ============================================
// RENDER FUNCTIONS
// ============================================

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

    if (isAdmin && isCurrentMonth) {
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

    if (isAdmin && isCurrentMonth) {
        row.addEventListener('click', () => openEditModal(dateString));
    }

    return row;
}

function renderMonthGrid() {
    const daysGrid = document.getElementById('daysGrid');

    if (!daysGrid) {
        console.error('❌ ERROR: daysGrid element not found!');
        return;
    }

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
        const cellData = calendarData[dateString];

        if (cellData) {
        }

        const cell = renderDayCell(date, dateString, cellData, true);
        daysGrid.appendChild(cell);
    }

    // Next month padding
    const totalCells = daysGrid.children.length;
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

    const weekStart = getWeekStart(currentDate, weekOffset);
    const weekNum = getWeekNumber(weekStart);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    document.getElementById('weekNumber').textContent = `Uke ${weekNum}`;
    document.getElementById('weekRange').textContent = `${weekStart.getDate()}. - ${weekEnd.getDate()}. ${NORWEGIAN_MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateString = formatDateISO(date);
        const row = renderDayRow(date, dateString, calendarData[dateString], true);
        weekDaysList.appendChild(row);
    }
}

function updateHeader() {
    const monthName = NORWEGIAN_MONTHS[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    document.getElementById('monthName').textContent = monthName;
    document.getElementById('yearName').textContent = year;
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBadge = document.getElementById('adminBadge');

    if (isAdmin) {
        loginBtn.classList.add('hidden');
        adminBadge.classList.remove('hidden');
        adminBadge.classList.add('flex');
        logoutBtn.classList.remove('hidden');
    } else {
        loginBtn.classList.remove('hidden');
        adminBadge.classList.add('hidden');
        adminBadge.classList.remove('flex');
        logoutBtn.classList.add('hidden');
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const errorDiv = document.getElementById('loginError');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    usernameInput.value = '';
    passwordInput.value = '';
    errorDiv.classList.add('hidden');

    setTimeout(() => usernameInput.focus(), 100);
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function openEditModal(dateString) {
    if (!isAdmin) return;

    editingDate = dateString;
    const modal = document.getElementById('editModal');
    const data = calendarData[dateString];

    document.getElementById('editDateDisplay').textContent = dateString;

    // Set status
    const status = data?.status || 'unknown';
    currentSelectedStatus = status;
    updateStatusSelection(status);

    // Set message
    document.getElementById('messageInput').value = data?.message || '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingDate = null;
}

function updateStatusSelection(status) {
    const options = document.querySelectorAll('.status-option');
    options.forEach(option => {
        const optionStatus = option.getAttribute('data-status');
        const icon = option.querySelector('.status-icon');
        const label = option.querySelector('span');
        const check = option.querySelector('.status-check');

        if (optionStatus === status) {
            option.classList.remove('bg-white', 'border-gray-200', 'hover-bg-gray-50', 'hover-border-gray-300');

            if (status === 'available') {
                option.classList.add('bg-emerald-100', 'border-emerald-300');
                icon.classList.remove('bg-gray-100', 'text-gray-500');
                icon.classList.add('bg-emerald-200', 'text-emerald-700');
            } else if (status === 'unavailable') {
                option.classList.add('bg-red-100', 'border-red-300');
                icon.classList.remove('bg-gray-100', 'text-gray-500');
                icon.classList.add('bg-red-200', 'text-red-700');
            } else {
                option.classList.add('bg-gray-50', 'border-gray-300');
                icon.classList.remove('bg-gray-100', 'text-gray-500');
                icon.classList.add('bg-gray-200', 'text-gray-600');
            }

            label.classList.remove('text-gray-600');
            label.classList.add('text-gray-900');
            check.classList.remove('hidden');
        } else {
            option.classList.remove('bg-emerald-100', 'border-emerald-300', 'bg-red-100', 'border-red-300', 'bg-gray-50');
            option.classList.add('bg-white', 'border-gray-200', 'hover-bg-gray-50', 'hover-border-gray-300');

            icon.classList.remove('bg-emerald-200', 'text-emerald-700', 'bg-red-200', 'text-red-700', 'bg-gray-200', 'text-gray-600');
            icon.classList.add('bg-gray-100', 'text-gray-500');

            label.classList.remove('text-gray-900');
            label.classList.add('text-gray-600');
            check.classList.add('hidden');
        }
    });
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('loginError');

    // Show loading state
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    const originalText = loginButton.innerHTML;
    loginButton.innerHTML = '<span>Logger inn...</span>';
    loginButton.disabled = true;

    const result = await loginUser(email, password);

    if (result.success) {
        closeLoginModal();
        updateAuthUI();
        renderMonthGrid();
        renderWeekView();
    } else {
        errorDiv.classList.remove('hidden');
        loginButton.innerHTML = originalText;
        loginButton.disabled = false;
    }
}

async function handleLogout() {
    await logoutUser();
    updateAuthUI();
    renderMonthGrid();
    renderWeekView();
}

async function handleSaveEdit(e) {
    e.preventDefault();

    if (!editingDate) return;

    const message = document.getElementById('messageInput').value;

    // Show loading state
    const saveButton = document.querySelector('#editForm button[type="submit"]');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<span>Lagrer...</span>';
    saveButton.disabled = true;

    const success = await saveDayToDB(editingDate, currentSelectedStatus, message);

    if (success) {
        // Update local data
        calendarData[editingDate] = {
            status: currentSelectedStatus,
            message: message
        };

        // Re-render calendar
        renderMonthGrid();
        renderWeekView();
        closeEditModal();
    }

    saveButton.innerHTML = originalText;
    saveButton.disabled = false;
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {

    // Check if Supabase is available
    if (!window.supabaseClient) {
        console.error('❌ ERROR: supabaseClient not found!');
        alert('FEIL: Supabase ikke tilkoblet!\n\nÅpne Console (F12) for detaljer.');
        return;
    }

    // Check if user is already logged in
    await checkExistingSession();

    // Load calendar data from database
    calendarData = await loadCalendarDataFromDB();

    // Initial render
    updateHeader();

    updateAuthUI();

    renderMonthGrid();

    renderWeekView();


    // Event Listeners

    // Month navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentDate = getPreviousMonth(currentDate);
        updateHeader();
        renderMonthGrid();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentDate = getNextMonth(currentDate);
        updateHeader();
        renderMonthGrid();
    });

    // Week navigation
    document.getElementById('prevWeekBtn').addEventListener('click', () => {
        weekOffset--;
        renderWeekView();
    });

    document.getElementById('nextWeekBtn').addEventListener('click', () => {
        weekOffset++;
        renderWeekView();
    });

    // Auth
    document.getElementById('loginBtn').addEventListener('click', openLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Login modal
    document.getElementById('loginModal').addEventListener('click', (e) => {
        if (e.target.id === 'loginModal') closeLoginModal();
    });
    document.getElementById('closeLoginBtn').addEventListener('click', closeLoginModal);
    document.getElementById('cancelLoginBtn').addEventListener('click', closeLoginModal);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Edit modal
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') closeEditModal();
    });
    document.getElementById('closeEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('editForm').addEventListener('submit', handleSaveEdit);

    // Status selection
    document.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', () => {
            const status = option.getAttribute('data-status');
            currentSelectedStatus = status;
            updateStatusSelection(status);
        });
    });

    // Listen for auth state changes
    db.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            isAdmin = false;
            updateAuthUI();
            renderMonthGrid();
            renderWeekView();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const loginModal = document.getElementById('loginModal');
            const editModal = document.getElementById('editModal');

            if (!loginModal.classList.contains('hidden')) {
                closeLoginModal();
            }
            if (!editModal.classList.contains('hidden')) {
                closeEditModal();
            }
        }
    });
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}