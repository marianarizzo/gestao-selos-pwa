// PWA v2 (stylized) with login (single admin password) and protected dashboard
const ADMIN_PASSWORD = 'adminselos';

const tabs = document.querySelectorAll('.tab');
const buttons = document.querySelectorAll('.tab-btn');
buttons.forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
const hello = document.getElementById('hello');
const btnDashboard = document.getElementById('btnDashboard');
const btnSair = document.getElementById('btnSair');

function getSession(){
  try{ return JSON.parse(localStorage.getItem('selos_session')) || null; }catch{ return null; }
}
function setSession(s){ localStorage.setItem('selos_session', JSON.stringify(s)); syncHeader(); }
function clearSession(){ localStorage.removeItem('selos_session'); syncHeader(); }

function syncHeader(){
  const s = getSession();
  if(s){
    hello.textContent = `👋 Olá, ${s.nome} (${s.isAdmin ? 'Admin' : 'Colaborador'})`;
    btnSair.hidden = false;
    btnDashboard.hidden = !s.isAdmin;
  }else{
    hello.textContent = '—';
    btnSair.hidden = true;
    btnDashboard.hidden = true;
  }
}
btnSair.addEventListener('click', ()=>{ clearSession(); alert('Sessão encerrada.'); showTab('login'); });

function showTab(id){
  if(id==='dashboard'){
    const s = getSession();
    if(!s || !s.isAdmin){
      alert('Acesso restrito ao Painel. Faça login de administrador.');
      id = 'login';
    } else {
      renderDashboard();
    }
  }
  tabs.forEach(t=>t.classList.toggle('active', t.id===id));
  buttons.forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  if(id==='bloqueio') renderBloqueios();
  if(id==='tratativa') renderTratativas();
  if(id==='finalizacao') renderFinalizacoes();
}

// Login form
document.getElementById('form-login').addEventListener('submit', e=>{
  e.preventDefault();
  const f = e.target;
  const nome = f.nome.value.trim() || 'Usuário';
  const senha = f.senha.value;
  const isAdmin = senha === ADMIN_PASSWORD && senha.length>0;
  if(senha && !isAdmin){
    alert('Senha incorreta. Você entrará como colaborador sem acesso ao Painel.');
  }
  setSession({nome, isAdmin});
  f.reset();
  showTab('bloqueio');
});
document.getElementById('btnLimparDados').addEventListener('click',()=>{
  if(confirm('Isso vai apagar todos os dados locais (bloqueios, tratativas, finalizações). Continuar?')){
    store.reset();
    alert('Dados apagados. Recarregue a página se necessário.');
    renderBloqueios(); renderTratativas(); renderFinalizacoes(); renderDashboard();
  }
});
syncHeader();

// Data store
const store = {
  get k(){ return 'gestao_selos_v2'; },
  load(){
    try{ return JSON.parse(localStorage.getItem(this.k)) || {bloqueios:[], tratativas:[], finalizacoes:[]}; }
    catch{ return {bloqueios:[], tratativas:[], finalizacoes:[]}; }
  },
  save(data){ localStorage.setItem(this.k, JSON.stringify(data)); },
  reset(){ localStorage.removeItem(this.k); }
};

function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }

// Forms
document.getElementById('form-bloqueio').addEventListener('submit', e=>{
  e.preventDefault();
  const data = store.load();
  const f = e.target;
  const numero = Number(f.numero.value);
  if(data.bloqueios.some(b=>Number(b.numero)===numero)){
    if(!confirm('Já existe um Bloqueio com esse Número do Selo. Deseja cadastrar mesmo assim?')) return;
  }
  const item = {
    id: uid(),
    nome: f.nome.value.trim(),
    numero,
    area: f.area.value,
    promax: f.promax.value.trim(),
    problema: f.problema.value,
    qtd: Number(f.qtd.value),
    dataBloqueio: f.dataBloqueio.value,
    vencimento: f.vencimento.value,
    obs: f.obs.value.trim()
  };
  data.bloqueios.unshift(item);
  store.save(data);
  f.reset();
  renderBloqueios();
  alert('Bloqueio salvo!');
});

document.getElementById('form-tratativa').addEventListener('submit', e=>{
  e.preventDefault();
  const data = store.load();
  const f = e.target;
  const numero = Number(f.numero.value);
  if(!data.bloqueios.some(b=>Number(b.numero)===numero)){
    alert('Atenção: não existe Bloqueio (selo vermelho) com este Número. Cadastre o Bloqueio primeiro.');
    return;
  }
  const item = {
    id: uid(),
    nome: f.nome.value.trim(),
    numero,
    dataLiberacao: f.dataLiberacao.value,
    cor: f.cor.value
  };
  data.tratativas.unshift(item);
  store.save(data);
  f.reset();
  renderTratativas();
  alert('Tratativa salva!');
});

document.getElementById('form-finalizacao').addEventListener('submit', e=>{
  e.preventDefault();
  const data = store.load();
  const f = e.target;
  const numero = Number(f.numero.value);
  if(!data.bloqueios.some(b=>Number(b.numero)===numero)){
    alert('Atenção: não existe Bloqueio (selo vermelho) com este Número. Cadastre o Bloqueio primeiro.');
    return;
  }
  const item = {
    id: uid(),
    nome: f.nome.value.trim(),
    numero,
    dataFinalizacao: f.dataFinalizacao.value,
    cor: f.cor.value
  };
  data.finalizacoes.unshift(item);
  store.save(data);
  f.reset();
  renderFinalizacoes();
  alert('Finalização salva!');
});

// Import / Export
document.getElementById('exportar').addEventListener('click', ()=>{
  const data = store.load();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gestao_selos_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
document.getElementById('importarBtn').addEventListener('click', ()=>document.getElementById('importar').click());
document.getElementById('importar').addEventListener('change', async (ev)=>{
  const file = ev.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  try{
    const obj = JSON.parse(text);
    if(!obj || !obj.bloqueios || !obj.tratativas || !obj.finalizacoes) throw new Error('Formato inválido');
    store.save(obj);
    renderBloqueios(); renderTratativas(); renderFinalizacoes(); renderDashboard();
    alert('Importado com sucesso!');
  }catch(e){ alert('Falha ao importar: ' + e.message); }
});

// Renders
function renderBloqueios(){
  const {bloqueios} = store.load();
  const tbody = document.querySelector('#tabela-bloqueios tbody');
  tbody.innerHTML = '';
  bloqueios.forEach((b, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${esc(b.nome)}</td>
      <td><span class="badge red">${esc(b.numero)}</span></td>
      <td>${esc(b.area)}</td>
      <td>${esc(b.promax)}</td>
      <td>${esc(b.problema)}</td>
      <td>${esc(b.qtd)}</td>
      <td>${fmtDate(b.dataBloqueio)}</td>
      <td>${fmtDate(b.vencimento)}</td>
      <td>${esc(b.obs)}</td>
      <td><button class="btn small ghost" data-del="${b.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('Excluir este bloqueio?')){
        const data = store.load();
        data.bloqueios = data.bloqueios.filter(x=>x.id!==btn.dataset.del);
        store.save(data);
        renderBloqueios(); renderDashboard();
      }
    });
  });
}

function renderTratativas(){
  const data = store.load();
  const tbody = document.querySelector('#tabela-tratativas tbody');
  tbody.innerHTML = '';
  data.tratativas.forEach((t, idx)=>{
    const status = tratativaStatus(t.cor);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${esc(t.nome)}</td>
      <td><span class="badge red">${esc(t.numero)}</span></td>
      <td>${fmtDate(t.dataLiberacao)}</td>
      <td>${badgeCor(t.cor)}</td>
      <td>${status === 'Liberado' ? badge('green','Liberado') : badge('yellow','Impróprio/PNC')}</td>
      <td><button class="btn small ghost" data-del="${t.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('Excluir esta tratativa?')){
        const data = store.load();
        data.tratativas = data.tratativas.filter(x=>x.id!==btn.dataset.del);
        store.save(data);
        renderTratativas(); renderDashboard();
      }
    });
  });
}

function renderFinalizacoes(){
  const data = store.load();
  const tbody = document.querySelector('#tabela-finalizacoes tbody');
  tbody.innerHTML = '';
  data.finalizacoes.forEach((f, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${esc(f.nome)}</td>
      <td><span class="badge red">${esc(f.numero)}</span></td>
      <td>${fmtDate(f.dataFinalizacao)}</td>
      <td>${badgeCor(f.cor)}</td>
      <td><button class="btn small ghost" data-del="${f.id}">Excluir</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('Excluir esta finalização?')){
        const data = store.load();
        data.finalizacoes = data.finalizacoes.filter(x=>x.id!==btn.dataset.del);
        store.save(data);
        renderFinalizacoes(); renderDashboard();
      }
    });
  });
}

function renderDashboard(){
  const s = getSession();
  if(!s || !s.isAdmin) return;
  const data = store.load();
  const totalVermelhos = data.bloqueios.length;
  const porNumero = groupByNumero(data);
  let liberados = 0, improprios = 0, semTratativa = 0, finalizados = 0;
  for(const numero of Object.keys(porNumero)){
    const info = porNumero[numero];
    if(info.ultimaTratativa){
      const st = tratativaStatus(info.ultimaTratativa.cor);
      if(st==='Liberado') liberados++; else improprios++;
    } else { semTratativa++; }
    if(info.finalizacao) finalizados++;
  }
  const cards = document.getElementById('cards'); cards.innerHTML='';
  cards.appendChild(card('Selos Vermelhos', totalVermelhos, 'red'));
  cards.appendChild(card('Liberados', liberados, 'green'));
  cards.appendChild(card('Impróprios (PNC)', improprios, 'yellow'));
  cards.appendChild(card('Finalizados', finalizados, ''));
  cards.appendChild(card('Sem Tratativa', semTratativa, ''));

  const tbody = document.querySelector('#tabela-status tbody'); tbody.innerHTML='';
  const numerosOrdenados = Object.keys(porNumero).sort((a,b)=>Number(a)-Number(b));
  numerosOrdenados.forEach(numero=>{
    const {bloqueio, ultimaTratativa, finalizacao} = porNumero[numero];
    const statusAtual = ultimaTratativa ? tratativaStatus(ultimaTratativa.cor) : 'Aguardando';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge red">${esc(numero)}</span></td>
      <td>${bloqueio ? `${esc(bloqueio.problema)} • ${fmtDate(bloqueio.dataBloqueio)}` : '-'}</td>
      <td>${statusAtual==='Liberado' ? badge('green','Liberado') :
            statusAtual==='Impróprio/PNC' ? badge('yellow','Impróprio/PNC') : badge('', 'Aguardando')}</td>
      <td>${ultimaTratativa ? (badgeCor(ultimaTratativa.cor)+' '+fmtDate(ultimaTratativa.dataLiberacao)) : '-'}</td>
      <td>${finalizacao ? (badgeCor(finalizacao.cor)+' '+fmtDate(finalizacao.dataFinalizacao)) : '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function groupByNumero(data){
  const by = {};
  data.bloqueios.forEach(b=>{ const n=String(b.numero); by[n]=by[n]||{}; by[n].bloqueio=b; });
  data.tratativas.sort((a,b)=> (a.dataLiberacao||'').localeCompare(b.dataLiberacao||'')).forEach(t=>{ const n=String(t.numero); by[n]=by[n]||{}; by[n].ultimaTratativa=t; });
  data.finalizacoes.sort((a,b)=> (a.dataFinalizacao||'').localeCompare(b.dataFinalizacao||'')).forEach(f=>{ const n=String(f.numero); by[n]=by[n]||{}; by[n].finalizacao=f; });
  return by;
}

// Helpers
function card(titulo, valor, color){ const d=document.createElement('div'); d.className='card card-stat'; d.innerHTML=`<h4>${titulo}</h4><div class="big">${valor}</div>`; return d; }
function tratativaStatus(cor){ if(cor==='Amarelo') return 'Liberado'; if(cor==='Verde') return 'Impróprio/PNC'; return 'Aguardando'; }
function esc(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function fmtDate(d){ if(!d) return ''; try{ return new Date(d+'T00:00:00').toLocaleDateString(); }catch{ return d; } }
function badge(color, text){ return `<span class="badge ${color}">${esc(text)}</span>`; }
function badgeCor(cor){ return cor==='Verde' ? badge('green','Verde') : cor==='Amarelo' ? badge('yellow','Amarelo') : '-'; }

// Initial
