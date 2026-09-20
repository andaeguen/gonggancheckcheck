
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

    document.querySelectorAll('.workspace-nav button').forEach(b => b.classList.remove('active'));
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


function initWorkspace(){
 const email=(currentUser&&currentUser.email)||'로그인 계정'; const emailEls=['workspace-user-email','workspace-user-top','settings-email']; emailEls.forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=email});
 const complete=document.getElementById('workspace-complete-btn'); const bar=document.getElementById('workspace-progress-bar'); const txt=document.getElementById('workspace-progress-text'); if(complete){complete.addEventListener('click',()=>{if(bar)bar.style.width='76%';if(txt)txt.textContent='76%';complete.textContent='완료 처리됨';complete.disabled=true;complete.style.opacity='.65';});}
 document.querySelectorAll('[data-task]').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.workspace-list-row');if(row){row.style.opacity='.45';row.style.textDecoration='line-through';btn.textContent='완료됨';btn.disabled=true;}}));
 const addExpense=document.getElementById('workspace-add-expense'); if(addExpense){addExpense.addEventListener('click',()=>{const nameEl=document.getElementById('workspace-expense-name');const amountEl=document.getElementById('workspace-expense-amount');const name=nameEl.value.trim()||'새 현장 지출';const amount=Math.max(0,Number(amountEl.value)||0);if(!amount)return;const list=document.getElementById('workspace-expense-list');const row=document.createElement('div');row.className='workspace-expense-row';row.innerHTML='<span>'+name+'<small>상무 푸르지오 · 방금 전</small></span><b>'+amount.toLocaleString('ko-KR')+'만</b><span class="workspace-expense-tag">신규</span>';list.prepend(row);nameEl.value='';amountEl.value='';});}
 const topExpense=document.getElementById('workspace-new-expense-top'); if(topExpense)topExpense.addEventListener('click',()=>{const input=document.getElementById('workspace-expense-name');if(input){input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});}});
 const select=document.getElementById('workspace-project-select'); const title=document.getElementById('workspace-project-title'); if(select&&title)select.addEventListener('change',()=>{title.textContent=select.value;});
 document.querySelectorAll('.workspace-project-card').forEach(card=>card.addEventListener('click',()=>{if(select){select.value=card.dataset.project;select.dispatchEvent(new Event('change'));window.scrollTo({top:0,behavior:'smooth'});}}));
 const newProject=document.getElementById('workspace-new-project'); if(newProject)newProject.addEventListener('click',()=>{newProject.textContent='프로젝트 생성 준비됨';newProject.style.background='#10B981';});
 const copyBtn=document.getElementById('workspace-copy-info'); if(copyBtn)copyBtn.addEventListener('click',()=>{copyBtn.textContent='복사 완료';setTimeout(()=>copyBtn.textContent='현장정보 복사',1400);});
}
window.addEventListener('load',initWorkspace);

const aiProjectStore = {
  '상무 푸르지오 108동 303호': {
    contract: 4500,
    expenses: 1860,
    collected: 2700,
    progress: 68,
    tasks: ['전기배선 완료 사진 업로드', '필름 색상 최종 확인', '내일 현장 방문 시간 확정'],
    issues: ['전기배선 완료 사진 미업로드', '필름 색상 고객 최종 확인 필요'],
    schedule: ['목공 가구 설치 완료', '전기배선 오늘 진행', '필름 내일 예정']
  },
  '일곡동 롯데아파트 103동': {
    contract: 3200,
    expenses: 1780,
    collected: 1600,
    progress: 42,
    tasks: ['타일 샘플 고객 확인', '폐기물 처리비 정산 확인'],
    issues: ['타일 샘플 확정 전', '외주비 입력 후 정산 확인 필요'],
    schedule: ['철거 완료', '타일 협의 대기', '전기 일정 조율 중']
  },
  '양림 힐스 103동 1906호': {
    contract: 2850,
    expenses: 420,
    collected: 500,
    progress: 12,
    tasks: ['착공 전 자재 발주 목록 작성', '고객 미팅 일정 확정'],
    issues: ['착공 전 견적 범위 재확인 필요'],
    schedule: ['실측 완료', '착공 예정']
  }
};

function getSelectedAiProject(){
  const select=document.getElementById('workspace-project-select');
  const name=select ? select.value : '상무 푸르지오 108동 303호';
  return { name, data: aiProjectStore[name] || aiProjectStore['상무 푸르지오 108동 303호'] };
}

function setAiPrompt(text){
  const input=document.getElementById('ai-prompt');
  if(input) input.value=text;
}

function runAiInvestigation(){
  const prompt=(document.getElementById('ai-prompt')?.value || '현장 상태를 조사해줘').trim();
  const {name,data}=getSelectedAiProject();
  const margin=data.contract-data.expenses;
  const marginRate=data.contract ? (margin/data.contract*100) : 0;
  const unpaid=Math.max(0,data.contract-data.collected);
  const spendRate=data.contract ? (data.expenses/data.contract*100) : 0;
  const risks=[];
  if(marginRate<25) risks.push('예상 마진이 25% 미만입니다. 실행비 추가 입력 전 승인 확인이 필요합니다.');
  if(spendRate>60 && data.progress<70) risks.push('공정 진행률 대비 지출률이 높습니다. 남은 공정의 예산 초과 가능성이 있습니다.');
  if(unpaid>1000) risks.push('미수금이 1,000만 원 이상입니다. 다음 수금 일정을 먼저 확인하세요.');
  if(data.issues.length) risks.push(data.issues[0]);
  if(!risks.length) risks.push('현재 수치 기준 큰 위험은 없습니다. 일정 완료 증빙만 계속 관리하면 됩니다.');
  const recommendation = marginRate<25
    ? '추가 지출은 바로 입력하지 말고 견적 잔액과 고객 추가공사 여부를 먼저 확인하세요.'
    : unpaid>1000
      ? '수금 예정일을 확인하고 고객 안내 문자를 승인 후 발송하세요.'
      : '오늘 할 일 중 사진 업로드와 고객 확인 항목을 먼저 처리하세요.';
  const approval = unpaid>1000
    ? '수금 확인 알림 만들기'
    : data.tasks.length
      ? '오늘 우선 할 일로 표시'
      : '조사 기록만 저장';
  const session={
    id:'AI-'+Date.now(),
    time:new Date().toLocaleString('ko-KR'),
    project:name,
    prompt,
    status:'완료',
    tools:['get_project_summary','get_schedule_risks','get_expense_vs_estimate','get_unpaid_collections','get_open_issues'],
    rows:[
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

function saveAiSession(session){
  const key='gonggancheckcheck_ai_sessions';
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  list.unshift(session);
  localStorage.setItem(key, JSON.stringify(list.slice(0,12)));
}

function renderAiSessions(){
  const wrap=document.getElementById('ai-session-list');
  if(!wrap) return;
  const list=JSON.parse(localStorage.getItem('gonggancheckcheck_ai_sessions')||'[]');
  if(!list.length){ wrap.innerHTML='<div class="ai-empty">아직 실행된 AI 조사 세션이 없습니다.</div>'; return; }
  wrap.innerHTML=list.map(s=>`<div class="ai-session"><div class="ai-session-head"><div><h4>${escapeHtml(s.project)}</h4><small>${escapeHtml(s.time)} · ${escapeHtml(s.prompt)}</small></div><span class="ai-badge">${escapeHtml(s.status)}</span></div><div class="ai-tools">${s.tools.map(t=>`<span class="ai-tool">${t}</span>`).join('')}</div><div class="ai-result">${s.rows.map(r=>`<div class="ai-result-row"><b>${escapeHtml(r[0])}</b>${escapeHtml(r[1])}</div>`).join('')}</div><div class="ai-approval"><span>쓰기 작업은 아직 실행하지 않았습니다. 승인안: ${escapeHtml(s.approval)}</span><button onclick="markAiApproval(this)">보류</button><button class="primary" onclick="markAiApproval(this)">승인 표시</button></div></div>`).join('');
}

function markAiApproval(btn){
  const box=btn.closest('.ai-approval');
  if(!box) return;
  box.querySelector('span').textContent = btn.classList.contains('primary') ? '승인 표시됨. 실제 데이터 변경은 다음 단계에서 별도 확인 후 실행합니다.' : '보류 처리됨. 데이터는 변경하지 않았습니다.';
  box.querySelectorAll('button').forEach(b=>b.disabled=true);
}

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

window.addEventListener('load', renderAiSessions);
