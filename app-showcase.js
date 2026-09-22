
const SUPABASE_URL = 'https://ikdmjytplaecswchjzlh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZG1qeXRwbGFlY3N3Y2hqemxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMDI0OTYsImV4cCI6MjEwMDg3ODQ5Nn0.CBZl2ExOzKpeaq77opqjOJHgSIupUdUueWLmk-4fjqM';

let supabaseClient = null;
let currentUser = null;
let currentPlan = null;
let currentPayment = { plan: null, amount: null };
let isSignupMode = false;

// 실제 회사/현장 데이터 상태 (Supabase sites/companies/company_members 테이블과 연동)
let STATE = {
  companyId: null,
  companyName: null,
  role: null,
  sites: [],       // [{id, company_id, data:{...}, updated_at}]
  activeSiteId: null,
};

// 안김장부에서 검증된 14개 기본 공정 템플릿 (신규 현장 생성 시 자동으로 깔림)
const DEFAULT_PROCESSES = [
  { id: 1, name: '철거 공사' }, { id: 2, name: '샷시·설비 공사' }, { id: 3, name: '타일 공사' },
  { id: 4, name: '화장실 공사' }, { id: 5, name: '목수 공사' }, { id: 6, name: '문 공사' },
  { id: 7, name: '페인트 공사' }, { id: 8, name: '필름 공사' }, { id: 9, name: '도배 공사' },
  { id: 10, name: '바닥(마루) 공사' }, { id: 11, name: '전기 공사' }, { id: 12, name: '가구 공사' },
  { id: 13, name: '기타 공사' }, { id: 14, name: '공과 잡비' }
];
const procDetailOpen = {}; // 공정별 세부입력 펼침 상태 (siteId+procId 키)

document.addEventListener('DOMContentLoaded', async () => {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.log('Supabase 초기화 실패');
    }
    await checkAuth();
});

async function checkAuth() {
    if (!supabaseClient) { showPage('landing'); return; }
    try {
        const { data } = await supabaseClient.auth.getSession();
        const session = data && data.session;
        if (session && session.user) {
            currentUser = { email: session.user.email, id: session.user.id };
            const ok = await loadWorkspace();
            if (ok) {
                showPage('dashboard');
                updateNavbar();
                return;
            }
        }
    } catch (e) { console.log('세션 확인 실패', e); }
    showPage('landing');
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName).classList.add('active');
}

function updateNavbar() {
    if (currentUser) {
        document.getElementById('user-info').textContent = '👤 ' + (currentUser.email || '사용자');
        document.getElementById('auth-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
    } else {
        document.getElementById('user-info').textContent = '';
        document.getElementById('auth-btn').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
    }
}

function goToAuth() {
    isSignupMode = true; // 처음 오는 사람은 대부분 회원가입이 목적이라 기본값을 회원가입으로
    updateAuthForm();
    showPage('auth');
}

function goToLanding() {
    showPage('landing');
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const companyNameInput = document.getElementById('auth-company');
    const companyName = companyNameInput ? companyNameInput.value.trim() : '';

    if (!supabaseClient) { showStatus('연결 오류입니다. 새로고침 후 다시 시도해주세요.', 'error', 'auth-status'); return; }

    if (isSignupMode) {
        if (!companyName) { showStatus('회사명을 입력해주세요', 'error', 'auth-status'); return; }
        showStatus('가입 처리 중...', 'info', 'auth-status');
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) { showStatus('가입 실패: ' + error.message, 'error', 'auth-status'); return; }
        if (!data.session) {
            // 이메일 확인이 필요한 설정으로 바뀐 경우를 대비한 안내 (현재는 즉시가입으로 설정됨)
            showStatus('가입 확인 이메일을 보냈어요. 이메일 확인 후 로그인해주세요.', 'info', 'auth-status');
            try { await supabaseClient.rpc('signup_company', { p_company_name: companyName, p_email: email, p_display_name: null }); } catch (err) {}
            return;
        }
        const { data: companyId, error: rpcErr } = await supabaseClient.rpc('signup_company', { p_company_name: companyName, p_email: email, p_display_name: null });
        if (rpcErr) { showStatus('회사 생성 실패: ' + rpcErr.message, 'error', 'auth-status'); return; }
        currentUser = { email, id: data.user.id };
        STATE.companyId = companyId;
        showStatus('회원가입 성공!', 'success', 'auth-status');
        await loadWorkspace();
        setTimeout(() => { showPage('dashboard'); updateNavbar(); }, 500);
    } else {
        showStatus('로그인 중...', 'info', 'auth-status');
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { showStatus('로그인 실패: 이메일 또는 비밀번호를 확인해주세요', 'error', 'auth-status'); return; }
        currentUser = { email, id: data.user.id };
        const ok = await loadWorkspace();
        if (!ok) { showStatus('회사 정보를 찾을 수 없습니다. 회원가입을 먼저 진행해주세요.', 'error', 'auth-status'); return; }
        showStatus('로그인 성공!', 'success', 'auth-status');
        setTimeout(() => { showPage('dashboard'); updateNavbar(); }, 500);
    }
}

function toggleAuthMode() {
    isSignupMode = !isSignupMode;
    updateAuthForm();
}

function updateAuthForm() {
    document.getElementById('auth-title').textContent = isSignupMode ? '회원가입' : '로그인';
    document.getElementById('auth-submit-btn').textContent = isSignupMode ? '회원가입' : '로그인';
    document.getElementById('auth-toggle-text').textContent = isSignupMode
        ? '이미 계정이 있으신가요? 로그인'
        : '계정이 없으신가요? 회원가입';
    const group = document.getElementById('auth-company-group');
    if (group) group.style.display = isSignupMode ? 'block' : 'none';
}

async function logout() {
    try { await supabaseClient.auth.signOut(); } catch (e) {}
    currentUser = null;
    STATE = { companyId: null, companyName: null, role: null, sites: [], activeSiteId: null };
    showPage('landing');
    updateNavbar();
}

function goToPayment(plan, amount) {
    if (!currentUser) {
        alert('로그인이 필요합니다');
        goToAuth();
        return;
    }
    currentPayment = { plan, amount };
    currentPlan = plan;
    showPage('payment');
    updatePaymentForm();
}

function updatePaymentForm() {
    const plans = {
        professional: { name: '프로페셔널 플랜', price: '₩29,000/월' },
        enterprise: { name: '엔터프라이즈 플랜', price: '₩99,000/월' }
    };
    const plan = plans[currentPayment.plan];
    if (plan) {
        document.getElementById('payment-plan-name').textContent = plan.name;
        document.getElementById('payment-plan-price').textContent = plan.price;
    }
}

async function handlePayment(e) {
    e.preventDefault();
    alert('✅ 결제 완료!\n\n계획: ' + currentPayment.plan.toUpperCase() + '\n금액: ' + currentPayment.amount + '원\n\n✨ 구독이 활성화되었습니다.\n(실제 결제 연동은 다음 단계에서 진행합니다)');
    currentPlan = currentPayment.plan;
    showPage('dashboard');
    updateDashboard();
}

function updateDashboard() {
    const userEmail = currentUser?.email || '사용자';
    document.getElementById('dashboard-user').textContent = userEmail;
    document.getElementById('settings-email').textContent = userEmail;
    document.getElementById('dashboard-plan').textContent = currentPlan || 'Free';
    document.getElementById('sub-plan').textContent = currentPlan || 'Free';
}

function switchDashboardTab(tab) {
    document.querySelectorAll('[id$="-tab"]').forEach(t => t.style.display = 'none');
    document.getElementById(tab + '-tab').style.display = 'block';

    document.querySelectorAll('.workspace-nav button').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    if (tab === 'ai') renderAiSessions();
}

function showStatus(message, type, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = 'status-message ' + type;
    el.textContent = message;
}

/* ========================================================================
   실데이터 연동: 회사/현장 로드 및 렌더링
   ======================================================================== */

async function loadWorkspace() {
    if (!currentUser || !supabaseClient) return false;
    try {
        const { data: member } = await supabaseClient
            .from('company_members')
            .select('company_id, role, display_name')
            .eq('email', currentUser.email)
            .maybeSingle();
        if (!member) return false;
        STATE.companyId = member.company_id;
        STATE.role = member.role;

        const { data: company } = await supabaseClient
            .from('companies')
            .select('*')
            .eq('id', STATE.companyId)
            .maybeSingle();
        STATE.companyName = company ? company.name : '워크스페이스';
        currentPlan = company ? company.plan : 'free';

        const { data: sites } = await supabaseClient
            .from('sites')
            .select('*')
            .eq('company_id', STATE.companyId)
            .order('updated_at', { ascending: false });
        STATE.sites = sites || [];

        if (!STATE.activeSiteId || !STATE.sites.find(s => s.id === STATE.activeSiteId)) {
            STATE.activeSiteId = STATE.sites.length ? STATE.sites[0].id : null;
        }

        updateDashboard();
        renderWorkspace();
        return true;
    } catch (e) {
        console.log('워크스페이스 로드 실패', e);
        return false;
    }
}

function fmtManwon(won) {
    won = Number(won) || 0;
    const sign = won < 0 ? '-' : '';
    won = Math.abs(won);
    if (won >= 100000000) {
        const eok = won / 100000000;
        return sign + (Math.round(eok * 100) / 100).toString().replace(/\.0$/, '') + '억';
    }
    const man = Math.round(won / 10000);
    return sign + man.toLocaleString('ko-KR') + '만';
}

function siteName(site) { return (site && site.data && site.data.name) || site.id; }

function siteExpenseSum(site) {
    const list = (site.data && site.data.expenses) || [];
    return list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

function siteMargin(site) {
    const contract = (site.data && site.data.contract) || 0;
    return contract - siteExpenseSum(site);
}

function getActiveSite() {
    return STATE.sites.find(s => s.id === STATE.activeSiteId) || null;
}

async function saveSite(site) {
    const { error } = await supabaseClient
        .from('sites')
        .update({ data: site.data, updated_at: new Date().toISOString() })
        .eq('id', site.id);
    if (error) console.log('저장 실패', error);
    return !error;
}

function ensureProcesses(site) {
    if (!site.data) site.data = {};
    if (!site.data.processes || !site.data.processes.length) {
        site.data.processes = DEFAULT_PROCESSES.map(p => ({ id: p.id, name: p.name, budget: 0 }));
    }
    if (!site.data.processItems) site.data.processItems = {};
    return site;
}

function procItemsOf(site, procId) {
    return (site.data.processItems && site.data.processItems[procId]) || [];
}

function syncProcessBudget(site, procId) {
    const items = procItemsOf(site, procId);
    const sum = items.reduce((s, it) => s + (Number(it.amt) || 0), 0);
    const proc = site.data.processes.find(p => p.id === procId);
    if (proc) proc.budget = sum;
}

function procExpenseSum(site, procId) {
    return ((site.data.expenses) || []).filter(e => e.proc === procId).reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

function fmtWon(v) {
    return (Number(v) || 0).toLocaleString('ko-KR');
}

function renderProcessTable() {
    const wrap = document.getElementById('process-table-body');
    const label = document.getElementById('process-total-label');
    if (!wrap) return;
    const site = getActiveSite();
    if (!site) {
        wrap.innerHTML = '<tr><td colspan="6" class="workspace-empty" style="padding:16px">현장을 먼저 만들어주세요.</td></tr>';
        if (label) label.textContent = '견적 0 · 지출 0';
        return;
    }
    ensureProcesses(site);
    let totalBudget = 0, totalSpent = 0;
    const rows = site.data.processes.map(p => {
        syncProcessBudget(site, p.id);
        const spent = procExpenseSum(site, p.id);
        const diff = p.budget - spent;
        const rate = p.budget ? Math.round((p.budget - spent) / p.budget * 100) : 0;
        totalBudget += p.budget; totalSpent += spent;
        const open = !!procDetailOpen[site.id + '_' + p.id];
        const items = procItemsOf(site, p.id);
        let detailHtml = '';
        if (open) {
            detailHtml = '<tr><td colspan="6" style="background:#F8FAFC;padding:12px;border-bottom:1px solid #E2E8F0">'
                + '<div style="font-size:11px;color:#94A3B8;margin-bottom:8px">' + escapeHtml(p.name) + ' 견적 세부항목 — 품명·규격·수량·단가를 넣으면 견적이 자동 계산돼요</div>'
                + '<div style="display:grid;grid-template-columns:1.3fr 1fr 70px 70px 100px 70px auto;gap:6px;margin-bottom:8px">'
                + '<input data-pi-name placeholder="품명" style="min-width:0;border:1px solid #CBD5E1;border-radius:6px;padding:6px;font-size:11px">'
                + '<input data-pi-spec placeholder="규격(선택)" style="min-width:0;border:1px solid #CBD5E1;border-radius:6px;padding:6px;font-size:11px">'
                + '<input data-pi-qty type="number" placeholder="수량" value="1" style="min-width:0;border:1px solid #CBD5E1;border-radius:6px;padding:6px;font-size:11px">'
                + '<input data-pi-unit placeholder="단위" style="min-width:0;border:1px solid #CBD5E1;border-radius:6px;padding:6px;font-size:11px">'
                + '<input data-pi-price type="number" placeholder="단가" style="min-width:0;border:1px solid #CBD5E1;border-radius:6px;padding:6px;font-size:11px">'
                + '<span></span>'
                + '<button type="button" onclick="addProcessItem(\'' + site.id + '\',' + p.id + ',this)" style="border:0;border-radius:6px;background:#0F172A;color:#fff;font-size:11px;font-weight:800;padding:6px 8px">추가</button>'
                + '</div>'
                + (items.length ? ('<table style="width:100%;font-size:11px;border-collapse:collapse">'
                    + '<thead><tr style="color:#94A3B8;text-align:left"><th style="padding:4px">품명</th><th style="padding:4px">규격</th><th style="padding:4px;text-align:right">수량</th><th style="padding:4px">단위</th><th style="padding:4px;text-align:right">단가</th><th style="padding:4px;text-align:right">금액</th><th></th></tr></thead>'
                    + '<tbody>' + items.map((it, i) => '<tr style="border-top:1px solid #E2E8F0"><td style="padding:4px">' + escapeHtml(it.name) + '</td><td style="padding:4px">' + escapeHtml(it.spec || '') + '</td><td style="padding:4px;text-align:right">' + it.qty + '</td><td style="padding:4px">' + escapeHtml(it.unit || '') + '</td><td style="padding:4px;text-align:right">' + fmtWon(it.unitPrice) + '</td><td style="padding:4px;text-align:right;font-weight:700">' + fmtWon(it.amt) + '</td><td><button onclick="deleteProcessItem(\'' + site.id + '\',' + p.id + ',' + i + ')" style="border:0;background:transparent;color:#EF4444;cursor:pointer;font-size:11px">✕</button></td></tr>').join('') + '</tbody>'
                    + '</table>') : '<div style="color:#94A3B8;font-size:11px">아직 등록된 항목이 없어요.</div>')
                + '</td></tr>';
        }
        return '<tr style="border-bottom:1px solid #F1F5F9">'
            + '<td style="padding:8px 6px"><button type="button" onclick="toggleProcessDetail(\'' + site.id + '\',' + p.id + ')" style="border:0;background:transparent;cursor:pointer;font-weight:700;font-size:12px;color:#0F172A">' + escapeHtml(p.name) + ' ' + (open ? '▴' : '▾') + '</button></td>'
            + '<td style="padding:8px 6px;text-align:right">' + fmtWon(p.budget) + '</td>'
            + '<td style="padding:8px 6px;text-align:right">' + fmtWon(spent) + '</td>'
            + '<td style="padding:8px 6px;text-align:right;color:' + (diff < 0 ? '#EF4444' : '#64748B') + '">' + fmtWon(diff) + '</td>'
            + '<td style="padding:8px 6px;text-align:right">' + (p.budget ? rate + '%' : '-') + '</td>'
            + '<td style="padding:8px 6px"></td>'
            + '</tr>' + detailHtml;
    }).join('');
    wrap.innerHTML = rows + '<tr style="font-weight:800;border-top:2px solid #E2E8F0"><td style="padding:8px 6px">합계</td><td style="padding:8px 6px;text-align:right">' + fmtWon(totalBudget) + '</td><td style="padding:8px 6px;text-align:right">' + fmtWon(totalSpent) + '</td><td style="padding:8px 6px;text-align:right">' + fmtWon(totalBudget - totalSpent) + '</td><td colspan="2"></td></tr>';
    if (label) label.textContent = '견적 ' + fmtManwon(totalBudget) + ' · 지출 ' + fmtManwon(totalSpent);
}

function toggleProcessDetail(siteId, procId) {
    const key = siteId + '_' + procId;
    procDetailOpen[key] = !procDetailOpen[key];
    renderProcessTable();
}

async function addProcessItem(siteId, procId, btn) {
    const site = STATE.sites.find(s => s.id === siteId);
    if (!site) return;
    const row = btn.closest('div');
    const name = row.querySelector('[data-pi-name]').value.trim();
    const spec = row.querySelector('[data-pi-spec]').value.trim();
    const qty = Number(row.querySelector('[data-pi-qty]').value) || 1;
    const unit = row.querySelector('[data-pi-unit]').value.trim();
    const unitPrice = Number(row.querySelector('[data-pi-price]').value) || 0;
    if (!name) return;
    const amt = qty * unitPrice;
    ensureProcesses(site);
    if (!site.data.processItems[procId]) site.data.processItems[procId] = [];
    site.data.processItems[procId].push({ name, spec, qty, unit, unitPrice, amt });
    syncProcessBudget(site, procId);
    await saveSite(site);
    renderProcessTable();
    renderKpis();
    renderProjectGrid();
}

async function deleteProcessItem(siteId, procId, idx) {
    const site = STATE.sites.find(s => s.id === siteId);
    if (!site || !site.data.processItems || !site.data.processItems[procId]) return;
    site.data.processItems[procId].splice(idx, 1);
    syncProcessBudget(site, procId);
    await saveSite(site);
    renderProcessTable();
    renderKpis();
}

function populateProcessSelects() {
    const site = getActiveSite();
    if (site) ensureProcesses(site);
    const procs = site ? site.data.processes : DEFAULT_PROCESSES;
    const optionsHtml = '<option value="">공정 선택(선택)</option>' + procs.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join('');
    ['sched-ed-proc', 'workspace-expense-proc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = optionsHtml;
    });
}

/* ------------------------ 공정 일정표 — 달력 기반 (직접입력·수정·복사·드래그이동) ------------------------ */

let CAL_MONTH = new Date();
let CAL_DRAG_IDX = null;
let SCHED_EDIT_STATE = { siteId: null, idx: null };

function calMonthLabel() { return CAL_MONTH.getFullYear() + '년 ' + (CAL_MONTH.getMonth() + 1) + '월'; }

function calMove(delta) {
    CAL_MONTH.setMonth(CAL_MONTH.getMonth() + delta);
    renderScheduleCalendar();
}

function pad2(n) { return String(n).padStart(2, '0'); }

function renderScheduleCalendar() {
    const grid = document.getElementById('schedule-calendar-grid');
    const label = document.getElementById('cal-month-label');
    const countLabel = document.getElementById('schedule-count-label');
    if (label) label.textContent = calMonthLabel();
    if (!grid) return;
    const site = getActiveSite();
    if (!site) {
        grid.innerHTML = '<div class="workspace-empty" style="grid-column:1/-1;padding:20px">현장을 먼저 만들어주세요.</div>';
        if (countLabel) countLabel.textContent = '0건';
        return;
    }
    ensureProcesses(site);
    const schedule = site.data.schedule || [];
    if (countLabel) countLabel.textContent = schedule.length + '건';
    const year = CAL_MONTH.getFullYear(), month = CAL_MONTH.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDate = {};
    schedule.forEach((item, idx) => { const k = item.date || ''; (byDate[k] = byDate[k] || []).push(idx); });
    const todayStr = new Date().toISOString().slice(0, 10);

    let html = ['일', '월', '화', '수', '목', '금', '토'].map(d => '<div class="cal-headcell">' + d + '</div>').join('');
    for (let i = 0; i < startWeekday; i++) html += '<div class="cal-cell cal-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = year + '-' + pad2(month + 1) + '-' + pad2(d);
        const idxList = byDate[dateStr] || [];
        const chips = idxList.map(idx => calItemChip(site, idx)).join('');
        html += '<div class="cal-cell' + (dateStr === todayStr ? ' cal-today' : '') + '" data-date="' + dateStr + '" ondragover="event.preventDefault();this.classList.add(\'cal-dragover\')" ondragleave="this.classList.remove(\'cal-dragover\')" ondrop="calDropOnDate(event,\'' + dateStr + '\')">'
            + '<div class="cal-daynum">' + d + '</div>'
            + '<div class="cal-items">' + chips + '</div>'
            + '<button type="button" class="cal-add-btn" onclick="openScheduleEditor(\'' + site.id + '\',null,\'' + dateStr + '\')" title="이 날짜에 일정 추가">+</button>'
            + '</div>';
    }
    grid.innerHTML = html;
}

function calItemChip(site, idx) {
    const item = site.data.schedule[idx];
    const proc = site.data.processes.find(p => p.id === item.proc);
    const label = escapeHtml(item.title) + (proc ? ' · ' + escapeHtml(proc.name) : '');
    return '<div class="cal-chip' + (item.done ? ' cal-chip-done' : '') + '" draggable="true" ondragstart="calDragStart(event,' + idx + ')" onclick="openScheduleEditor(\'' + site.id + '\',' + idx + ')" title="' + label + '">' + label + '</div>';
}

function calDragStart(e, idx) {
    CAL_DRAG_IDX = idx;
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch (err) {}
}

async function calDropOnDate(e, dateStr) {
    e.preventDefault();
    e.currentTarget.classList.remove('cal-dragover');
    const site = getActiveSite();
    if (!site) return;
    let idx = CAL_DRAG_IDX;
    if (idx === null || idx === undefined) { try { idx = Number(e.dataTransfer.getData('text/plain')); } catch (err) {} }
    if (idx === null || idx === undefined || !site.data.schedule[idx]) return;
    site.data.schedule[idx].date = dateStr;
    CAL_DRAG_IDX = null;
    await saveSite(site);
    renderWorkspace();
}

function openScheduleEditor(siteId, idx, prefillDate) {
    const site = STATE.sites.find(s => s.id === siteId);
    if (!site) return;
    ensureProcesses(site);
    const editing = idx !== null && idx !== undefined;
    const item = editing ? site.data.schedule[idx] : { title: '', proc: '', vendor: '', date: prefillDate || new Date().toISOString().slice(0, 10), done: false };
    SCHED_EDIT_STATE = { siteId, idx: editing ? idx : null };
    document.getElementById('schedule-editor-title').textContent = editing ? '일정 수정' : '일정 추가';
    document.getElementById('sched-ed-date').value = item.date || '';
    document.getElementById('sched-ed-proc').value = item.proc || '';
    document.getElementById('sched-ed-title').value = item.title || '';
    document.getElementById('sched-ed-vendor').value = item.vendor || '';
    document.getElementById('sched-ed-done').checked = !!item.done;
    document.getElementById('sched-ed-delete').style.display = editing ? 'inline-block' : 'none';
    document.getElementById('sched-ed-copy').style.display = editing ? 'inline-block' : 'none';
    const box = document.getElementById('schedule-editor-box');
    box.style.display = 'block';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function saveScheduleEditor() {
    const site = STATE.sites.find(s => s.id === SCHED_EDIT_STATE.siteId);
    if (!site) return;
    const data = {
        title: document.getElementById('sched-ed-title').value.trim(),
        proc: document.getElementById('sched-ed-proc').value ? Number(document.getElementById('sched-ed-proc').value) : null,
        vendor: document.getElementById('sched-ed-vendor').value.trim(),
        date: document.getElementById('sched-ed-date').value,
        done: document.getElementById('sched-ed-done').checked,
    };
    if (!data.title) { alert('일정 제목을 입력해주세요'); return; }
    site.data.schedule = site.data.schedule || [];
    if (SCHED_EDIT_STATE.idx !== null && SCHED_EDIT_STATE.idx !== undefined) {
        site.data.schedule[SCHED_EDIT_STATE.idx] = { ...site.data.schedule[SCHED_EDIT_STATE.idx], ...data };
    } else {
        site.data.schedule.push({ id: Date.now(), ...data });
    }
    await saveSite(site);
    closeScheduleEditor();
    renderWorkspace();
}

async function deleteScheduleEditor() {
    const site = STATE.sites.find(s => s.id === SCHED_EDIT_STATE.siteId);
    if (!site || SCHED_EDIT_STATE.idx === null || SCHED_EDIT_STATE.idx === undefined) return;
    site.data.schedule.splice(SCHED_EDIT_STATE.idx, 1);
    await saveSite(site);
    closeScheduleEditor();
    renderWorkspace();
}

function copyScheduleEditor() {
    document.getElementById('sched-ed-title').value = document.getElementById('sched-ed-title').value + ' (복사)';
    SCHED_EDIT_STATE.idx = null;
    document.getElementById('schedule-editor-title').textContent = '일정 추가 (복사본 — 날짜를 확인하고 저장하세요)';
    document.getElementById('sched-ed-delete').style.display = 'none';
    document.getElementById('sched-ed-copy').style.display = 'none';
}

function closeScheduleEditor() {
    const box = document.getElementById('schedule-editor-box');
    if (box) box.style.display = 'none';
    SCHED_EDIT_STATE = { siteId: null, idx: null };
}

function renderWorkspace() {
    renderKpis();
    renderProjectSelect();
    renderActiveProjectCard();
    renderScheduleList();
    renderTaskList();
    renderExpenseList();
    renderProfitList();
    renderProjectGrid();
    populateProcessSelects();
    renderProcessTable();
    renderScheduleCalendar();
}

function renderKpis() {
    const sites = STATE.sites;
    const count = sites.length;
    const totalContract = sites.reduce((s, x) => s + ((x.data && x.data.contract) || 0), 0);
    const totalExpense = sites.reduce((s, x) => s + siteExpenseSum(x), 0);
    const profit = totalContract - totalExpense;

    setText('kpi-count', String(count));
    setText('kpi-count-note', count ? '전체 현장' : '첫 현장을 만들어보세요');
    setText('kpi-contract', fmtManwon(totalContract));
    setText('kpi-contract-note', count ? '' : '');
    setText('kpi-expense', fmtManwon(totalExpense));
    setText('kpi-expense-note', totalContract ? '집행률 ' + Math.min(100, Math.round(totalExpense / totalContract * 100)) + '%' : '');
    setText('kpi-profit', fmtManwon(profit));
    setText('kpi-profit-note', totalContract ? '원가율 ' + Math.min(100, Math.round(totalExpense / totalContract * 100)) + '%' : '');
}

function renderProjectSelect() {
    const select = document.getElementById('workspace-project-select');
    if (!select) return;
    const prev = STATE.activeSiteId;
    select.innerHTML = STATE.sites.length
        ? STATE.sites.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(siteName(s))}</option>`).join('')
        : '<option value="">현장 없음</option>';
    if (prev) select.value = prev;
}

function renderActiveProjectCard() {
    const site = getActiveSite();
    const titleEl = document.getElementById('workspace-project-title');
    const metaEl = document.getElementById('active-project-meta');
    const stateEl = document.getElementById('active-project-state');
    const progressText = document.getElementById('workspace-progress-text');
    const progressBar = document.getElementById('workspace-progress-bar');

    if (!site) {
        if (titleEl) titleEl.textContent = '현장을 선택하세요';
        if (metaEl) metaEl.textContent = '아직 등록된 현장이 없어요. "새 프로젝트 만들기"로 시작하세요.';
        if (stateEl) stateEl.textContent = '-';
        if (progressText) progressText.textContent = '0%';
        if (progressBar) progressBar.style.width = '0%';
        const completeBtn = document.getElementById('workspace-complete-btn');
        if (completeBtn) { completeBtn.textContent = '완료 처리할 일정 없음'; completeBtn.disabled = true; }
        return;
    }

    const d = site.data || {};
    const schedule = d.schedule || [];
    const doneCount = schedule.filter(x => x.done).length;
    const progress = schedule.length ? Math.round(doneCount / schedule.length * 100) : (d.progress || 0);

    if (titleEl) titleEl.textContent = siteName(site);
    if (metaEl) metaEl.textContent = (d.customer ? '고객 ' + d.customer + ' · ' : '') + fmtManwon(d.contract || 0) + ' 계약';
    if (stateEl) stateEl.textContent = d.status || '진행중';
    if (progressText) progressText.textContent = progress + '%';
    if (progressBar) progressBar.style.width = progress + '%';

    const nextItem = schedule.find(x => !x.done);
    const completeBtn = document.getElementById('workspace-complete-btn');
    if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = nextItem ? (nextItem.title + ' 완료 처리') : (schedule.length ? '모든 일정 완료됨' : '일정 추가 필요');
        completeBtn.disabled = !nextItem;
    }
    const openScheduleBtn = document.getElementById('workspace-open-schedule');
    if (openScheduleBtn) openScheduleBtn.textContent = '+ 일정 추가';
}

function renderScheduleList() {
    const wrap = document.getElementById('active-schedule-list');
    if (!wrap) return;
    const site = getActiveSite();
    const schedule = site && site.data && site.data.schedule ? site.data.schedule : [];
    if (!schedule.length) { wrap.innerHTML = '<div class="workspace-empty">일정이 없어요. "+ 일정 추가"로 만들어보세요.</div>'; return; }
    wrap.innerHTML = schedule.slice(0, 6).map(item => {
        const dot = item.done ? 'green' : '';
        return `<div class="workspace-list-row"><i class="schedule-dot ${dot}"></i><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.vendor || '')}</small></div><time>${item.done ? '완료' : escapeHtml(item.date || '')}</time></div>`;
    }).join('');
}

function renderTaskList() {
    const wrap = document.getElementById('workspace-task-list');
    const countLabel = document.getElementById('task-count-label');
    if (!wrap) return;
    const rows = [];
    STATE.sites.forEach(site => {
        const tasks = (site.data && site.data.tasks) || [];
        tasks.forEach((t, idx) => { if (!t.done) rows.push({ siteId: site.id, idx, text: t.text, siteName: siteName(site) }); });
    });
    if (countLabel) countLabel.textContent = rows.length + '건 남음';
    if (!rows.length) { wrap.innerHTML = '<div class="workspace-empty">할 일이 없어요. 위에서 추가해보세요.</div>'; return; }
    wrap.innerHTML = rows.slice(0, 8).map(r => `<div class="workspace-list-row"><i class="schedule-dot"></i><div><b>${escapeHtml(r.text)}</b><small>${escapeHtml(r.siteName)}</small></div><button class="workspace-btn" onclick="completeTask('${escapeHtml(r.siteId)}',${r.idx})">완료</button></div>`).join('');
}

function renderExpenseList() {
    const wrap = document.getElementById('workspace-expense-list');
    const label = document.getElementById('expense-total-label');
    const site = getActiveSite();
    const list = site && site.data && site.data.expenses ? site.data.expenses : [];
    if (label) label.textContent = (site ? siteName(site) + ' 누적 ' : '누적 ') + fmtManwon(siteExpenseSum(site || {data:{}}));
    if (!wrap) return;
    if (!list.length) { wrap.innerHTML = '<div class="workspace-empty">아직 입력된 지출이 없어요.</div>'; return; }
    ensureProcesses(site);
    wrap.innerHTML = list.slice(0, 6).map(e => {
        const proc = e.proc ? site.data.processes.find(p => p.id === e.proc) : null;
        return `<div class="workspace-expense-row"><span>${escapeHtml(e.name)}<small>${proc ? escapeHtml(proc.name) + ' · ' : ''}${escapeHtml(e.date || '')}</small></span><b>${fmtManwon(e.amount)}</b><span class="workspace-expense-tag">${proc ? '공정' : '미지정'}</span></div>`;
    }).join('');
}

function renderProfitList() {
    const wrap = document.getElementById('profit-by-site-list');
    if (!wrap) return;
    if (!STATE.sites.length) { wrap.innerHTML = '<div class="workspace-empty">현장이 없어요.</div>'; return; }
    wrap.innerHTML = STATE.sites.map(site => {
        const margin = siteMargin(site);
        const contract = (site.data && site.data.contract) || 0;
        const rate = contract ? Math.round(margin / contract * 100) : 0;
        const dot = margin >= 0 ? 'green' : 'orange';
        return `<div class="workspace-list-row"><i class="schedule-dot ${dot}"></i><div><b>${escapeHtml(siteName(site))}</b><small>예상 이익 ${fmtManwon(margin)}</small></div><time>${rate}%</time></div>`;
    }).join('');
}

function renderProjectGrid() {
    const wrap = document.getElementById('workspace-projects-grid');
    const countLabel = document.getElementById('project-count-label');
    if (countLabel) countLabel.textContent = '전체 ' + STATE.sites.length + '개';
    if (!wrap) return;
    if (!STATE.sites.length) {
        wrap.innerHTML = '<div class="workspace-empty">아직 등록된 현장이 없어요. 위에서 "새 프로젝트 만들기"로 첫 현장을 만들어보세요.</div>';
        return;
    }
    wrap.innerHTML = STATE.sites.map(site => {
        const d = site.data || {};
        const schedule = d.schedule || [];
        const doneCount = schedule.filter(x => x.done).length;
        const progress = schedule.length ? Math.round(doneCount / schedule.length * 100) : (d.progress || 0);
        return `<div class="workspace-project-card" data-site-id="${escapeHtml(site.id)}"><small>${escapeHtml(d.status || '진행중')} · ${progress}%</small><h4>${escapeHtml(siteName(site))}</h4><div class="project-mini-progress"><i style="width:${progress}%"></i></div><footer><span>계약 ${fmtManwon(d.contract || 0)}</span><span>${escapeHtml(d.customer || '')}</span></footer></div>`;
    }).join('');
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

/* ------------------------ 쓰기 동작 (새 현장/지출/일정/할일) ------------------------ */

async function createProject() {
    const nameEl = document.getElementById('np-name');
    const customerEl = document.getElementById('np-customer');
    const contractEl = document.getElementById('np-contract');
    const statusEl = document.getElementById('new-project-status');
    const name = nameEl.value.trim();
    const customer = customerEl.value.trim();
    const contract = Math.max(0, Number(contractEl.value) || 0);
    if (!name) { if (statusEl) statusEl.textContent = '프로젝트명을 입력해주세요'; return; }
    if (!STATE.companyId) { if (statusEl) statusEl.textContent = '회사 정보를 불러오지 못했습니다'; return; }

    const id = 'site_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const payload = {
      name, customer, contract, collected: 0, progress: 0, status: '진행중',
      expenses: [], tasks: [], schedule: [], createdAt: new Date().toISOString(),
      processes: DEFAULT_PROCESSES.map(p => ({ id: p.id, name: p.name, budget: 0 })),
      processItems: {}
    };
    if (statusEl) statusEl.textContent = '만드는 중...';
    const { error } = await supabaseClient.from('sites').insert({ id, company_id: STATE.companyId, data: payload, updated_at: new Date().toISOString() });
    if (error) { if (statusEl) statusEl.textContent = '실패: ' + error.message; return; }
    nameEl.value = ''; customerEl.value = ''; contractEl.value = '';
    if (statusEl) statusEl.textContent = '';
    document.getElementById('new-project-form').style.display = 'none';
    STATE.activeSiteId = id;
    await loadWorkspace();
}

async function addWorkspaceExpense() {
    const site = getActiveSite();
    if (!site) { alert('먼저 현장을 만들어주세요'); return; }
    const nameEl = document.getElementById('workspace-expense-name');
    const amountEl = document.getElementById('workspace-expense-amount');
    const procEl = document.getElementById('workspace-expense-proc');
    const name = nameEl.value.trim() || '지출';
    const amount = Math.max(0, Number(amountEl.value) || 0);
    const proc = procEl && procEl.value ? Number(procEl.value) : null;
    if (!amount) return;
    site.data = site.data || {};
    site.data.expenses = site.data.expenses || [];
    site.data.expenses.unshift({ id: Date.now(), name, amount, proc, date: new Date().toISOString().slice(0, 10) });
    await saveSite(site);
    nameEl.value = ''; amountEl.value = '';
    renderWorkspace();
}

async function completeNextSchedule() {
    const site = getActiveSite();
    if (!site) return;
    const schedule = (site.data && site.data.schedule) || [];
    const item = schedule.find(x => !x.done);
    if (!item) return;
    item.done = true;
    await saveSite(site);
    renderWorkspace();
}

async function quickAddSchedule() {
    const site = getActiveSite();
    if (!site) { alert('먼저 새 프로젝트를 만들어주세요'); return; }
    const title = prompt('공정/일정 이름을 입력하세요 (예: 전기배선)');
    if (!title) return;
    const date = prompt('날짜 (예: 2026-09-25)', new Date().toISOString().slice(0, 10)) || '';
    site.data.schedule = site.data.schedule || [];
    site.data.schedule.push({ id: Date.now(), title, vendor: '', date, done: false });
    await saveSite(site);
    renderWorkspace();
}

async function completeTask(siteId, idx) {
    const site = STATE.sites.find(s => s.id === siteId);
    if (!site || !site.data || !site.data.tasks || !site.data.tasks[idx]) return;
    site.data.tasks[idx].done = true;
    await saveSite(site);
    renderWorkspace();
}

async function addQuickTask() {
    const input = document.getElementById('task-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const site = getActiveSite();
    if (!site) { alert('먼저 현장을 만들어주세요'); return; }
    site.data.tasks = site.data.tasks || [];
    site.data.tasks.push({ id: Date.now(), text, done: false });
    await saveSite(site);
    input.value = '';
    renderWorkspace();
}

function toggleNewProjectForm() {
    const box = document.getElementById('new-project-form');
    if (!box) return;
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

/* ------------------------ 초기 바인딩 ------------------------ */

function initWorkspace() {
    const npSubmit = document.getElementById('np-submit');
    if (npSubmit) npSubmit.addEventListener('click', createProject);
    const newProjectBtn = document.getElementById('workspace-new-project');
    if (newProjectBtn) newProjectBtn.addEventListener('click', toggleNewProjectForm);

    const addExpense = document.getElementById('workspace-add-expense');
    if (addExpense) addExpense.addEventListener('click', addWorkspaceExpense);

    const completeBtn = document.getElementById('workspace-complete-btn');
    if (completeBtn) completeBtn.addEventListener('click', completeNextSchedule);

    const openScheduleBtn = document.getElementById('workspace-open-schedule');
    if (openScheduleBtn) openScheduleBtn.addEventListener('click', () => {
        const card = document.getElementById('schedule-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const copyBtn = document.getElementById('workspace-copy-info');
    if (copyBtn) copyBtn.addEventListener('click', () => {
        const site = getActiveSite();
        if (!site) return;
        const d = site.data || {};
        const text = `${d.name || ''}\n고객: ${d.customer || '-'}\n계약금액: ${fmtManwon(d.contract || 0)}\n진행률: ${d.progress || 0}%`;
        (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => {
            copyBtn.textContent = '복사 완료';
            setTimeout(() => copyBtn.textContent = '현장정보 복사', 1400);
        }).catch(() => {});
    });

    const taskAddBtn = document.getElementById('task-add-btn');
    if (taskAddBtn) taskAddBtn.addEventListener('click', addQuickTask);
    const taskInput = document.getElementById('task-input');
    if (taskInput) taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addQuickTask(); });

    const topExpense = document.getElementById('workspace-new-expense-top');
    if (topExpense) topExpense.addEventListener('click', () => {
        const input = document.getElementById('workspace-expense-name');
        if (input) { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });

    const select = document.getElementById('workspace-project-select');
    if (select) select.addEventListener('change', () => { STATE.activeSiteId = select.value; renderWorkspace(); });

    const grid = document.getElementById('workspace-projects-grid');
    if (grid) grid.addEventListener('click', (e) => {
        const card = e.target.closest('.workspace-project-card');
        if (!card) return;
        STATE.activeSiteId = card.dataset.siteId;
        renderWorkspace();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
window.addEventListener('load', initWorkspace);

/* ------------------------ 데모(비로그인 랜딩) 인터랙션 - 기존과 동일 ------------------------ */

function initShowcaseDemos() {
    const completeBtn = document.getElementById('demo-complete-task'); const addTaskBtn = document.getElementById('demo-add-task'); const job = document.getElementById('schedule-job'); const progress = document.getElementById('demo-progress'); const toast = document.getElementById('schedule-toast');
    if (completeBtn) { completeBtn.addEventListener('click', () => { job.classList.add('done'); job.innerHTML = '배선<br>완료'; progress.textContent = '76%'; completeBtn.textContent = '완료 처리됨'; completeBtn.disabled = true; toast.textContent = '전기배선이 완료되었습니다. 전체 진행률이 68%에서 76%로 바뀌었습니다.'; toast.classList.add('show'); }); }
    if (addTaskBtn) { addTaskBtn.addEventListener('click', () => { toast.textContent = '내일 일정에 타일 실측이 추가되었습니다. 담당자 알림도 함께 생성됩니다.'; toast.classList.add('show'); addTaskBtn.textContent = '일정 추가됨'; }); }
    const expenseBtn = document.getElementById('demo-add-expense'); if (expenseBtn) { expenseBtn.addEventListener('click', () => { const name = document.getElementById('demo-expense-name').value.trim() || '새 현장 지출'; const amount = Math.max(0, Number(document.getElementById('demo-expense-amount').value) || 120); const list = document.getElementById('demo-expense-list'); const item = document.createElement('div'); item.className = 'expense-item'; item.innerHTML = '<span>' + name + '<br><small>방금 전 · 직접 입력</small></span><b>' + amount.toLocaleString('ko-KR') + '만</b><span class="expense-tag">신규</span>'; list.prepend(item); const total = 1860 + amount; const left = Math.max(0, 4500 - total); document.getElementById('demo-expense-total').textContent = total.toLocaleString('ko-KR') + '만'; document.getElementById('demo-budget-left').textContent = left.toLocaleString('ko-KR') + '만'; const rate = Math.min(100, total / 4500 * 100); document.getElementById('demo-budget-percent').textContent = rate.toFixed(1) + '%'; document.getElementById('demo-budget-bar').style.width = rate + '%'; document.getElementById('demo-live-message').textContent = '방금 전 ' + amount.toLocaleString('ko-KR') + '만 원 지출이 분석에 반영되었습니다'; document.getElementById('demo-expense-name').value = ''; document.getElementById('demo-expense-amount').value = ''; }); }
    document.querySelectorAll('.analytics-tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.analytics-tab').forEach(x => x.classList.remove('active')); tab.classList.add('active'); const p = tab.dataset.project; document.getElementById('demo-analysis-title').textContent = p; const presets = { '상무 푸르지오 108동': ['4,500만', '58.7%', '1,240만'], '일곡 롯데아파트': ['3,200만', '63.4%', '870만'], '양림 힐스': ['2,850만', '54.2%', '1,010만'] }; const v = presets[p] || presets['상무 푸르지오 108동']; document.getElementById('demo-contract').textContent = v[0]; document.getElementById('demo-cost-rate').textContent = v[1]; document.getElementById('demo-profit').textContent = v[2]; document.getElementById('demo-live-message').textContent = p + ' 프로젝트 분석을 불러왔습니다'; }));
}
window.addEventListener('load', initShowcaseDemos);

/* ------------------------ AI 현장 조사관 - 실데이터 기반 ------------------------ */

function getSelectedAiProject() {
    const site = getActiveSite() || STATE.sites[0];
    if (!site) {
        return { name: '등록된 현장 없음', data: { contract: 0, expenses: 0, collected: 0, progress: 0, tasks: [], issues: ['등록된 현장이 없습니다. 먼저 새 프로젝트를 만들어주세요.'], schedule: [] } };
    }
    const d = site.data || {};
    const expensesSum = (d.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const schedule = d.schedule || [];
    const doneCount = schedule.filter(x => x.done).length;
    const progress = schedule.length ? Math.round(doneCount / schedule.length * 100) : (d.progress || 0);
    const openTasks = (d.tasks || []).filter(t => !t.done).map(t => t.text);
    const scheduleLabels = schedule.map(s => s.title + (s.done ? ' 완료' : ' 예정'));
    const issues = [];
    if (!schedule.length) issues.push('등록된 일정이 없습니다. 공정 일정을 먼저 넣어주세요.');
    if (openTasks.length) issues.push(openTasks[0]);
    ensureProcesses(site);
    const overProcs = site.data.processes
        .map(p => ({ name: p.name, budget: p.budget, spent: procExpenseSum(site, p.id) }))
        .filter(p => p.budget > 0 && p.spent > p.budget);
    if (overProcs.length) issues.push(overProcs.map(p => p.name + ' 공정 예산 ' + Math.round((p.spent - p.budget) / 10000) + '만원 초과').join(', '));
    const noBudgetProcs = site.data.processes.filter(p => p.budget === 0 && procExpenseSum(site, p.id) > 0);
    if (noBudgetProcs.length) issues.push(noBudgetProcs.map(p => p.name).join(', ') + ' 공정은 견적 없이 지출만 있어요. 견적을 먼저 넣어주세요.');
    return {
        name: siteName(site),
        data: {
            contract: Math.round((d.contract || 0) / 10000),
            expenses: Math.round(expensesSum / 10000),
            collected: Math.round((d.collected || 0) / 10000),
            progress,
            tasks: openTasks,
            issues,
            schedule: scheduleLabels
        }
    };
}

function setAiPrompt(text) {
    const input = document.getElementById('ai-prompt');
    if (input) input.value = text;
}

function runAiInvestigation() {
    const prompt = (document.getElementById('ai-prompt')?.value || '현장 상태를 조사해줘').trim();
    const { name, data } = getSelectedAiProject();
    const margin = data.contract - data.expenses;
    const marginRate = data.contract ? (margin / data.contract * 100) : 0;
    const unpaid = Math.max(0, data.contract - data.collected);
    const spendRate = data.contract ? (data.expenses / data.contract * 100) : 0;
    const risks = [];
    if (!data.contract) risks.push('현장 데이터가 아직 없습니다. 계약금액과 일정을 먼저 등록해주세요.');
    if (data.contract && marginRate < 25) risks.push('예상 마진이 25% 미만입니다. 실행비 추가 입력 전 승인 확인이 필요합니다.');
    if (spendRate > 60 && data.progress < 70) risks.push('공정 진행률 대비 지출률이 높습니다. 남은 공정의 예산 초과 가능성이 있습니다.');
    if (unpaid > 1000) risks.push('미수금이 1,000만 원 이상입니다. 다음 수금 일정을 먼저 확인하세요.');
    if (data.issues.length) risks.push(data.issues[0]);
    if (!risks.length) risks.push('현재 수치 기준 큰 위험은 없습니다. 일정 완료 증빙만 계속 관리하면 됩니다.');
    const recommendation = !data.contract
        ? '새 프로젝트를 만들고 계약금액·일정을 입력한 뒤 다시 조사해보세요.'
        : marginRate < 25
            ? '추가 지출은 바로 입력하지 말고 견적 잔액과 고객 추가공사 여부를 먼저 확인하세요.'
            : unpaid > 1000
                ? '수금 예정일을 확인하고 고객 안내 문자를 승인 후 발송하세요.'
                : '오늘 할 일 중 우선 항목을 먼저 처리하세요.';
    const approval = unpaid > 1000
        ? '수금 확인 알림 만들기'
        : data.tasks.length
            ? '오늘 우선 할 일로 표시'
            : '조사 기록만 저장';
    const session = {
        id: 'AI-' + Date.now(),
        time: new Date().toLocaleString('ko-KR'),
        project: name,
        prompt,
        status: '완료',
        tools: ['get_project_summary', 'get_schedule_risks', 'get_expense_vs_estimate', 'get_unpaid_collections', 'get_open_issues'],
        rows: [
            ['현장 요약', `계약 ${data.contract.toLocaleString('ko-KR')}만, 지출 ${data.expenses.toLocaleString('ko-KR')}만, 진행률 ${data.progress}%`],
            ['재무 판단', `예상 마진 ${margin.toLocaleString('ko-KR')}만 (${marginRate.toFixed(1)}%), 미수금 ${unpaid.toLocaleString('ko-KR')}만`],
            ['위험 신호', risks.join(' / ')],
            ['권장 조치', recommendation]
        ],
        approval
    };
    saveAiSession(session);
    renderAiSessions();
}

function saveAiSession(session) {
    const key = 'gonggancheckcheck_ai_sessions';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift(session);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
}

function renderAiSessions() {
    const wrap = document.getElementById('ai-session-list');
    if (!wrap) return;
    const list = JSON.parse(localStorage.getItem('gonggancheckcheck_ai_sessions') || '[]');
    if (!list.length) { wrap.innerHTML = '<div class="ai-empty">아직 실행된 AI 조사 세션이 없습니다.</div>'; return; }
    wrap.innerHTML = list.map(s => `<div class="ai-session"><div class="ai-session-head"><div><h4>${escapeHtml(s.project)}</h4><small>${escapeHtml(s.time)} · ${escapeHtml(s.prompt)}</small></div><span class="ai-badge">${escapeHtml(s.status)}</span></div><div class="ai-tools">${s.tools.map(t => `<span class="ai-tool">${t}</span>`).join('')}</div><div class="ai-result">${s.rows.map(r => `<div class="ai-result-row"><b>${escapeHtml(r[0])}</b>${escapeHtml(r[1])}</div>`).join('')}</div><div class="ai-approval"><span>쓰기 작업은 아직 실행하지 않았습니다. 승인안: ${escapeHtml(s.approval)}</span><button onclick="markAiApproval(this)">보류</button><button class="primary" onclick="markAiApproval(this)">승인 표시</button></div></div>`).join('');
}

function markAiApproval(btn) {
    const box = btn.closest('.ai-approval');
    if (!box) return;
    box.querySelector('span').textContent = btn.classList.contains('primary') ? '승인 표시됨. 실제 데이터 변경은 다음 단계에서 별도 확인 후 실행합니다.' : '보류 처리됨. 데이터는 변경하지 않았습니다.';
    box.querySelectorAll('button').forEach(b => b.disabled = true);
}

window.addEventListener('load', renderAiSessions);
