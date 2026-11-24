/* Vida Plena - simulação: contas e dados ficam só no navegador (localStorage). */
const $ = (id) => document.getElementById(id);
const mem = {};
const ler = (k, p) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : p; } catch (e) { return k in mem ? mem[k] : p; } };
const gravar = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const apagar = (k) => { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} };
const pad = (n) => String(n).padStart(2, '0');
const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const agoraHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const br = (s) => s.split('-').reverse().join('/');
function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
function ico(n) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s;
}
/* Janela de confirmação própria, que funciona em qualquer navegador */
function confirmar(msg, okTxt = 'Confirmar', href) {
  return new Promise((res) => {
    const m = $('modal'), a = $('modal-acoes'); $('modal-txt').textContent = msg; a.replaceChildren();
    const fim = (v) => { m.hidden = true; res(v); };
    const sim = el(href ? 'a' : 'button', 'btn perigo', okTxt), nao = el('button', 'btn sec', 'Cancelar');
    if (href) sim.href = href;
    sim.onclick = () => fim(true); nao.onclick = () => fim(false);
    a.append(sim, nao); m.hidden = false; sim.focus();
  });
}

let timer;
function aviso(msg, ms = 3000) {
  const t = $('toast'); t.textContent = msg; t.classList.add('mostra');
  clearTimeout(timer); timer = setTimeout(() => t.classList.remove('mostra'), ms);
}

let usuario = null, D = null;
const salvar = () => gravar('vp:dados:' + usuario, D);
const TITULOS = { 'ab-inicio': 'Início', 'ab-remedios': 'Meus remédios', 'ab-consultas': 'Consultas', 'ab-saude': 'Minha saúde', 'ab-perfil': 'Meu perfil' };

function ir(id) {
  document.querySelectorAll('.vista').forEach((v) => v.classList.remove('ativa'));
  $(id).classList.add('ativa');
  const app = id.startsWith('ab-');
  document.body.classList.toggle('logado', app);
  document.querySelectorAll('nav button').forEach((b) => { const s = b.dataset.ir === id; b.classList.toggle('sel', s); if (s) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (app) { $('titulo-aba').textContent = TITULOS[id]; $('con-data').min = hoje(); renderTudo(); }
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => ir(b.dataset.ir)));

/* Conta */
async function hash(t) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map((x) => pad(x.toString(16))).join(''); }
  catch (e) { let h = 5381; for (const c of t) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'f' + h.toString(16); } /* só para demonstração, sem crypto.subtle */
}
const norm = (s) => { s = s.trim().toLowerCase(); return s.includes('@') ? s : s.replace(/[\s()-]/g, ''); };
const eEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const eTel = (s) => /^\+?\d{10,13}$/.test(s);

function entrar(id) {
  usuario = id; gravar('vp:sessao', id);
  const conta = ler('vp:conta:' + id, {});
  D = Object.assign({ remedios: [], tomados: {}, consultas: [], registros: [], perfil: {} }, ler('vp:dados:' + id, {}));
  if (!D.perfil.nome) D.perfil.nome = conta.nome || '';
  if (!D.perfil.tel && eTel(id)) D.perfil.tel = id;
  salvar(); ir('ab-inicio');
}
$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault(); const erro = $('login-erro'); erro.textContent = '';
  const id = norm($('login-id').value), s = $('login-senha').value;
  if (!eEmail(id) && !eTel(id)) { erro.textContent = 'Digite um e-mail ou telefone válido.'; return; }
  if (s.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  const conta = ler('vp:conta:' + id, null);
  if (!conta) { erro.textContent = 'Conta não encontrada. Toque em "Cadastre-se".'; return; }
  if (conta.hash !== await hash(s)) { erro.textContent = 'Senha incorreta. Tente novamente.'; return; }
  $('form-login').reset(); entrar(id);
});
$('form-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault(); const erro = $('cad-erro'); erro.textContent = '';
  const nome = $('cad-nome').value.trim(), id = norm($('cad-id').value), s1 = $('cad-senha').value;
  if (nome.length < 2) { erro.textContent = 'Digite o seu nome.'; return; }
  if (!eEmail(id) && !eTel(id)) { erro.textContent = 'Digite um e-mail ou telefone válido.'; return; }
  if (s1.length < 6) { erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.'; return; }
  if (s1 !== $('cad-senha2').value) { erro.textContent = 'As senhas não são iguais.'; return; }
  if (ler('vp:conta:' + id, null)) { erro.textContent = 'Já existe uma conta com esse e-mail ou telefone.'; return; }
  gravar('vp:conta:' + id, { hash: await hash(s1), nome });
  $('form-cadastro').reset(); aviso('Conta criada com sucesso!'); entrar(id);
});
$('btn-esqueci').addEventListener('click', () => aviso('Demonstração: numa versão real, enviaríamos um link para o seu e-mail ou telefone.', 4500));
$('btn-facial').addEventListener('click', () => aviso('Reconhecimento facial ainda não está disponível.'));
$('btn-sair').addEventListener('click', () => { apagar('vp:sessao'); usuario = D = null; ir('login'); });

/* Remédios */
const tomados = () => D.tomados[hoje()] || [];
function alternarTomado(id) {
  const t = D.tomados[hoje()] || (D.tomados[hoje()] = []), i = t.indexOf(id);
  if (i < 0) { t.push(id); aviso('Remédio marcado como tomado'); } else t.splice(i, 1);
  salvar(); renderTudo();
}
function renderRemedios() {
  const box = $('lista-remedios'); box.replaceChildren();
  const lista = [...D.remedios].sort((a, b) => a.horario.localeCompare(b.horario));
  if (!lista.length) { box.appendChild(el('p', 'vazio', 'Nenhum remédio cadastrado ainda.')); return; }
  lista.forEach((r) => {
    const ok = tomados().includes(r.id), it = el('div', 'item' + (ok ? ' ok' : ''));
    it.append(el('strong', '', r.nome), el('small', '', r.horario + (r.dose ? ' · ' + r.dose : '')));
    const ac = el('div', 'acoes'), b1 = el('button', 'mini'), b2 = el('button', 'mini x');
    b1.append(ico('check'), document.createTextNode(ok ? 'Tomado (desfazer)' : 'Tomei agora')); b2.append(ico('trash'), document.createTextNode('Excluir'));
    b2.setAttribute('aria-label', 'Excluir ' + r.nome);
    b1.onclick = () => alternarTomado(r.id);
    b2.onclick = async () => { if (await confirmar('Excluir "' + r.nome + '"?', 'Excluir')) { D.remedios = D.remedios.filter((x) => x.id !== r.id); salvar(); renderTudo(); } };
    ac.append(b1, b2); it.appendChild(ac); box.appendChild(it);
  });
}
$('form-remedio').addEventListener('submit', (e) => {
  e.preventDefault();
  D.remedios.push({ id: Date.now(), nome: $('rem-nome').value.trim(), dose: $('rem-dose').value.trim(), horario: $('rem-hora').value });
  salvar(); e.target.reset(); renderTudo(); aviso('Remédio adicionado!');
});

/* Consultas */
function renderConsultas() {
  const box = $('lista-consultas'); box.replaceChildren();
  const lista = [...D.consultas].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  if (!lista.length) { box.appendChild(el('p', 'vazio', 'Nenhuma consulta agendada.')); return; }
  lista.forEach((c) => {
    const it = el('div', 'item' + (c.data < hoje() ? ' passou' : ''));
    it.append(el('strong', '', c.nome), el('small', '', br(c.data) + ' às ' + c.hora + (c.local ? ' · ' + c.local : '') + (c.data < hoje() ? ' (já passou)' : '')));
    const b = el('button', 'mini x'), ac = el('div', 'acoes'); b.append(ico('trash'), document.createTextNode('Excluir'));
    b.setAttribute('aria-label', 'Excluir consulta ' + c.nome);
    b.onclick = async () => { if (await confirmar('Excluir esta consulta?', 'Excluir')) { D.consultas = D.consultas.filter((x) => x.id !== c.id); salvar(); renderTudo(); } };
    ac.appendChild(b); it.appendChild(ac); box.appendChild(it);
  });
}
$('form-consulta').addEventListener('submit', (e) => {
  e.preventDefault();
  D.consultas.push({ id: Date.now(), nome: $('con-nome').value.trim(), data: $('con-data').value, hora: $('con-hora').value, local: $('con-local').value.trim() });
  salvar(); e.target.reset(); renderTudo(); aviso('Consulta agendada!');
});

/* Saúde */
const UN = { 'Pressão arterial': 'mmHg (ex: 120/80)', Glicemia: 'mg/dL', Peso: 'kg', Batimentos: 'bpm' };
const atualizaUn = () => { $('reg-un').textContent = '(' + UN[$('reg-tipo').value] + ')'; };
$('reg-tipo').addEventListener('change', atualizaUn); atualizaUn();
function renderRegistros() {
  const box = $('lista-registros'); box.replaceChildren();
  if (!D.registros.length) { box.appendChild(el('p', 'vazio', 'Nenhuma medição salva ainda.')); return; }
  [...D.registros].reverse().slice(0, 20).forEach((r) => {
    const it = el('div', 'item');
    it.append(el('strong', '', r.tipo + ': ' + r.valor), el('small', '', br(r.data) + ' às ' + r.hora));
    const b = el('button', 'mini x'), ac = el('div', 'acoes'); b.append(ico('trash'), document.createTextNode('Excluir'));
    b.setAttribute('aria-label', 'Excluir medição');
    b.onclick = async () => { if (await confirmar('Excluir esta medição?', 'Excluir')) { D.registros = D.registros.filter((x) => x.id !== r.id); salvar(); renderTudo(); } };
    ac.appendChild(b); it.appendChild(ac); box.appendChild(it);
  });
}
$('form-registro').addEventListener('submit', (e) => {
  e.preventDefault();
  const tipo = $('reg-tipo').value, valor = $('reg-valor').value.trim().replace(',', '.');
  const valido = tipo === 'Pressão arterial' ? /^\d{2,3}\/\d{2,3}$/.test(valor) : /^\d{1,3}(\.\d{1,2})?$/.test(valor);
  if (!valido) { aviso(tipo === 'Pressão arterial' ? 'Digite a pressão assim: 120/80' : 'Digite apenas números. Ex: 95'); return; }
  D.registros.push({ id: Date.now(), tipo, valor, data: hoje(), hora: agoraHM() });
  salvar(); $('reg-valor').value = ''; renderTudo(); aviso('Medição salva!');
});

/* Perfil e emergência */
function renderPerfil() {
  const p = D.perfil;
  [['nome', 'nome'], ['idade', 'idade'], ['tel', 'tel'], ['sangue', 'sangue'], ['cnome', 'cnome'], ['ctel', 'ctel']]
    .forEach(([c, k]) => { $('p-' + c).value = p[k] || ''; });
}
$('form-perfil').addEventListener('submit', (e) => {
  e.preventDefault();
  D.perfil = { nome: $('p-nome').value.trim(), idade: $('p-idade').value, tel: $('p-tel').value.trim(), sangue: $('p-sangue').value.trim().toUpperCase(), cnome: $('p-cnome').value.trim(), ctel: $('p-ctel').value.trim() };
  salvar(); renderTudo(); aviso('Dados salvos com sucesso!');
});
$('btn-emergencia').addEventListener('click', () => {
  const p = D.perfil, tel = (p.ctel || '').replace(/[^\d+]/g, '');
  if (!tel) { aviso('Cadastre um contato de emergência no seu perfil.'); ir('ab-perfil'); return; }
  confirmar('Ligar para ' + (p.cnome || 'seu contato de emergência') + '?', 'Ligar agora', 'tel:' + tel);
});

/* Início */
const DICAS = ['Beba água ao longo do dia, mesmo sem sentir sede.', 'Uma caminhada leve todos os dias faz bem ao coração.', 'Deixe os remédios em um lugar fácil de ver.', 'Levante-se devagar para evitar tontura.', 'Converse com alguém querido hoje. Isso faz bem à saúde.'];
function renderInicio() {
  const nome = (D.perfil.nome || '').split(' ')[0];
  $('saudacao').textContent = (new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite') + (nome ? ', ' + nome : '') + '!';
  $('data-hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const tom = tomados(), pend = D.remedios.filter((r) => !tom.includes(r.id)).sort((a, b) => a.horario.localeCompare(b.horario));
  const prox = pend.find((r) => r.horario >= agoraHM()) || pend[0], card = $('prox-remedio'); card.replaceChildren();
  if (!D.remedios.length) { card.append(el('strong', '', 'Nenhum remédio cadastrado'), el('p', '', 'Cadastre seus remédios para receber lembretes.')); const b = el('button', 'btn', 'Cadastrar remédio'); b.onclick = () => ir('ab-remedios'); card.appendChild(b); }
  else if (!prox) card.append(el('strong', '', 'Tudo certo por hoje!'), el('p', '', 'Você tomou todos os remédios de hoje.'));
  else { card.append(el('small', '', prox.horario < agoraHM() ? 'Atrasado' : 'Próximo remédio'), el('strong', '', prox.nome + ' às ' + prox.horario)); const b = el('button', 'btn', 'Tomei agora'); b.onclick = () => alternarTomado(prox.id); card.appendChild(b); }
  $('res-tomados').textContent = tom.filter((id) => D.remedios.some((r) => r.id === id)).length + '/' + D.remedios.length;
  const c = D.consultas.filter((x) => x.data >= hoje()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
  $('res-consulta').textContent = c ? br(c.data).slice(0, 5) : '-';
  $('res-consulta-txt').textContent = c ? c.nome : 'nenhuma consulta marcada';
  $('dica').textContent = DICAS[new Date().getDate() % DICAS.length];
}
function renderTudo() { renderInicio(); renderRemedios(); renderConsultas(); renderRegistros(); renderPerfil(); }

/* Lembretes: enquanto o app estiver aberto, avisa na hora do remédio */
let ultimoAlerta = '';
setInterval(() => {
  if (!D) return; const hm = agoraHM(); if (ultimoAlerta === hm) return;
  const rs = D.remedios.filter((x) => x.horario === hm && !tomados().includes(x.id));
  if (rs.length) { ultimoAlerta = hm; aviso('Hora do remédio: ' + rs.map((x) => x.nome).join(', '), 10000); if (navigator.vibrate) navigator.vibrate([300, 150, 300]); }
}, 15000);

const sessao = ler('vp:sessao', null);
if (sessao && ler('vp:conta:' + sessao, null)) entrar(sessao);
