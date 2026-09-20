
const SUPABASE_URL = 'https://ikdmjytplaecswchjzlh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZG1qeXRwbGFlY3N3Y2hqemxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk4NjkzNDcsImV4cCI6MjAyNTQ0OTM0N30.jQo1QkJdLjIZQpM8F9x4Z3L8V9pXqO1F9L8L3F9L9F9';

let supabaseClient = null;
let currentUser = null;
let currentPlan = null;
let currentPayment = { plan: null, amount: null };
let isSignupMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.log('Supabase 초기화 실패 - localStorage 사용');
    }
    checkAuth();
});

function checkAuth() {
    const localUser = localStorage.getItem('gonggancheckcheck_user');
    if (localUser) {
        currentUser = JSON.parse(localUser);
        showPage('dashboard');
        updateNavbar();
    } else {
        showPage('landing');
    }
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
    isSignupMode = false;
    updateAuthForm();
    showPage('auth');
}

function goToLanding() {
    showPage('landing');
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isSignupMode) {
        currentUser = { email: email, id: Date.now().toString() };
        localStorage.setItem('gonggancheckcheck_user', JSON.stringify(currentUser));
        showStatus('회원가입 성공!', 'success', 'auth-status');
        setTimeout(() => { showPage('dashboard'); updateNavbar(); }, 1000);
    } else {
        if (email && password.length >= 6) {
            currentUser = { email: email, id: Date.now().toString() };
            localStorage.setItem('gonggancheckcheck_user', JSON.stringify(currentUser));
            showStatus('로그인 성공!', 'success', 'auth-status');
            setTimeout(() => { showPage('dashboard'); updateNavbar(); }, 1000);
        } else {
            showStatus('로그인 실패', 'error', 'auth-status');
        }
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
}

function logout() {
    localStorage.removeItem('gonggancheckcheck_user');
    currentUser = null;
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
    const name = document.getElementById('payment-name').value;
    const email = document.getElementById('payment-email').value;
    const phone = document.getElementById('payment-phone').value;

    alert('✅ 결제 완료!\n\n계획: ' + currentPayment.plan.toUpperCase() + '\n금액: ' + currentPayment.amount + '원\n\n✨ 구독이 활성화되었습니다.');
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

    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function showStatus(message, type, elementId) {
    const el = document.getElementById(elementId);
    el.className = 'status-message ' + type;
    el.textContent = message;
}

setTimeout(() => {
    if (currentUser) {
        updateDashboard();
    }
}, 500);

function initShowcaseDemos(){
 const completeBtn=document.getElementById('demo-complete-task'); const addTaskBtn=document.getElementById('demo-add-task'); const job=document.getElementById('schedule-job'); const progress=document.getElementById('demo-progress'); const toast=document.getElementById('schedule-toast');
 if(completeBtn){ completeBtn.addEventListener('click',()=>{ job.classList.add('done'); job.innerHTML='배선<br>완료'; progress.textContent='76%'; completeBtn.textContent='완료 처리됨'; completeBtn.disabled=true; toast.textContent='전기배선이 완료되었습니다. 전체 진행률이 68%에서 76%로 바뀌었습니다.'; toast.classList.add('show'); }); }
 if(addTaskBtn){ addTaskBtn.addEventListener('click',()=>{ toast.textContent='내일 일정에 타일 실측이 추가되었습니다. 담당자 알림도 함께 생성됩니다.'; toast.classList.add('show'); addTaskBtn.textContent='일정 추가됨'; }); }
 const expenseBtn=document.getElementById('demo-add-expense'); if(expenseBtn){ expenseBtn.addEventListener('click',()=>{ const name=document.getElementById('demo-expense-name').value.trim()||'새 현장 지출'; const amount=Math.max(0,Number(document.getElementById('demo-expense-amount').value)||120); const list=document.getElementById('demo-expense-list'); const item=document.createElement('div'); item.className='expense-item'; item.innerHTML='<span>'+name+'<br><small>방금 전 · 직접 입력</small></span><b>'+amount.toLocaleString('ko-KR')+'만</b><span class="expense-tag">신규</span>'; list.prepend(item); const total=1860+amount; const left=Math.max(0,4500-total); document.getElementById('demo-expense-total').textContent=total.toLocaleString('ko-KR')+'만'; document.getElementById('demo-budget-left').textContent=left.toLocaleString('ko-KR')+'만'; const rate=Math.min(100,total/4500*100); document.getElementById('demo-budget-percent').textContent=rate.toFixed(1)+'%'; document.getElementById('demo-budget-bar').style.width=rate+'%'; document.getElementById('demo-live-message').textContent='방금 전 '+amount.toLocaleString('ko-KR')+'만 원 지출이 분석에 반영되었습니다'; document.getElementById('demo-expense-name').value=''; document.getElementById('demo-expense-amount').value=''; }); }
 document.querySelectorAll('.analytics-tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.analytics-tab').forEach(x=>x.classList.remove('active'));tab.classList.add('active'); const p=tab.dataset.project; document.getElementById('demo-analysis-title').textContent=p; const presets={'상무 푸르지오 108동':['4,500만','58.7%','1,240만'],'일곡 롯데아파트':['3,200만','63.4%','870만'],'양림 힐스':['2,850만','54.2%','1,010만']}; const v=presets[p]||presets['상무 푸르지오 108동']; document.getElementById('demo-contract').textContent=v[0]; document.getElementById('demo-cost-rate').textContent=v[1]; document.getElementById('demo-profit').textContent=v[2]; document.getElementById('demo-live-message').textContent=p+' 프로젝트 분석을 불러왔습니다';}));
}
window.addEventListener('load',initShowcaseDemos);

