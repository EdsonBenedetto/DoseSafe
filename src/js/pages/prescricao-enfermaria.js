const $=s=>document.querySelector(s);
const ENFERMEIRA=(DS.session()||{nome:"Profissional não identificado"}).nome;
const p2=n=>String(n).padStart(2,"0");
const fmt=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const fmtL=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nowRound=()=>{const d=new Date();d.setSeconds(0,0);d.setMinutes(Math.ceil(d.getMinutes()/5)*5);return d};
const FREQ={int:"Intervalo fixo",unica:"Dose única",sos:"Se necessário"};
 
function mkDoses(r){
  if(r.freq==="sos")return [];
  const out=[],base=r.first.getTime();
  if(r.freq==="unica")return [{t:new Date(base),adm:null}];
  for(let k=0;k*r.int<24;k++)out.push({t:new Date(base+k*r.int*3600000),adm:null});
  return out;
}
const f0=nowRound();
let rx=DSData.read("ds_prescricoes_enfermaria",[]).map(r=>({...r,first:r.first?new Date(r.first):null,doses:(r.doses||[]).map(d=>({...d,t:new Date(d.t),adm:d.adm?new Date(d.adm):null})),sos:(r.sos||[]).map(d=>new Date(d))}));
let nextId=rx.reduce((n,r)=>Math.max(n,(r.id||0)+1),1),editId=null;
 
(()=>{const b=new Date(1985,2,15),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),2,15))a--;$("#nasc").textContent=`15/03/1985 (${a} anos)`})();
 
let tt;function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",3800)}
const used=r=>r.doses.some(d=>d.adm)||r.sos.length>0;
const freqTxt=r=>r.freq==="int"?`${r.int}/${r.int}h`:FREQ[r.freq];
 
function render(){
  $("#tb").innerHTML=rx.length?rx.map(r=>{
    const st=r.susp?'<span class="pill p-off">Suspensa</span>':r.sent?'<span class="pill p-sent">Enviada</span>':'<span class="pill p-draft">Aguardando envio</span>';
    const lock=r.susp||used(r);
    return `<tr class="${r.susp?"off ":""}${r.id===editId?"editing":""}"><td class="n">${esc(r.med)}${r.obs?`<small>${esc(r.obs)}</small>`:""}${r.alerta?`<small style="color:#b91c1c">⚠️ ${esc(r.alerta)}</small>`:""}</td><td>${r.dose} ${esc(r.un)} · ${r.via}</td><td>${freqTxt(r)}</td><td style="text-decoration:none">${st}</td><td><button class="ib e" data-e="${r.id}" aria-label="Editar ${esc(r.med)}" ${lock?"disabled":""} title="${used(r)?"Já há doses administradas":"Editar"}"><svg class="i" viewBox="0 0 24 24"><path d="M21.2 5.6 18.4 2.8a2 2 0 0 0-2.8 0L3 15.4V21h5.6L21.2 8.4a2 2 0 0 0 0-2.8ZM15 5l4 4"/></svg></button><button class="ib x" data-x="${r.id}" aria-label="Suspender ${esc(r.med)}" ${r.susp?"disabled":""} title="Suspender"><svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg></button></td></tr>`}).join(""):`<tr><td colspan="5" class="empty">Nenhuma prescrição adicionada neste atendimento.</td></tr>`;
  renderTL();
}
 
function renderTL(){
  const now=new Date(),items=[];
  rx.filter(r=>!r.susp).forEach(r=>{
    r.doses.forEach((d,i)=>items.push({r,d,i,t:d.t}));
    if(r.freq==="sos")items.push({r,sos:true,t:new Date(8.64e15)});
  });
  items.sort((a,b)=>a.t-b.t);
  $("#tl").innerHTML=items.length?items.map(o=>{
    const r=o.r,desc=`${r.dose} ${esc(r.un)} · ${r.via}${r.obs?" · "+esc(r.obs):""}`;
    if(o.sos){
      const last=r.sos.length?`Última: ${fmt(r.sos[r.sos.length-1])} · ${r.sos.length} dose(s) hoje`:"Nenhuma dose registrada";
      return `<div class="dose"><div class="t">SOS<small>Se necessário</small></div><div class="m"><b>${esc(r.med)}</b><small>${desc} · ${last}</small></div><span class="pill p-sos">Sob demanda</span><button class="btn s" data-sos="${r.id}" ${r.sent?"":"disabled"}>Registrar administração</button></div>`}
    const d=o.d;let pill,btn;
    if(d.adm){pill=`<span class="pill p-ok">Administrada ${fmt(d.adm).slice(-5)}</span>`;btn=`<span style="width:150px"></span>`}
    else if(!r.sent){pill='<span class="pill p-wait">Aguardando envio</span>';btn=`<button class="btn s" disabled>Registrar administração</button>`}
    else{const late=now-d.t>30*60000;pill=late?'<span class="pill p-late">Atrasada</span>':'<span class="pill p-pend">Pendente</span>';btn=`<button class="btn s" data-adm="${r.id}:${o.i}">Registrar administração</button>`}
    const day=d.t.toDateString()===now.toDateString()?"Hoje":fmt(d.t).slice(0,5);
    return `<div class="dose"><div class="t">${p2(d.t.getHours())}:${p2(d.t.getMinutes())}<small>${day}</small></div><div class="m"><b>${esc(r.med)}</b><small>${desc}</small></div>${pill}${btn}</div>`;
  }).join(""):`<div class="empty">Nenhuma dose programada. Adicione prescrições e envie à enfermaria.</div>`;
}
 
// Combobox de medicamento
const med=$("#med"),dd=$("#dd");let act=-1;
function showDD(){
  const q=med.value.trim().toLowerCase();
  const l=DSMeds.buscar(q).slice(0,30).map(m=>m.nome);
  let h=l.map((m,i)=>`<div role="option" data-v="${esc(m)}" class="${i===act?"act":""}">${esc(m)}</div>`).join("");
  if(q&&!l.some(m=>m.toLowerCase()===q))h+=`<div role="option" data-v="${esc(med.value.trim())}">Usar “${esc(med.value.trim())}”<small>(não cadastrado na base — sem verificação de segurança)</small></div>`;
  dd.innerHTML=h||(q?`<div style="color:var(--muted);cursor:default">Nenhum medicamento cadastrado com esse nome</div>`:`<div style="color:var(--muted);cursor:default">Nenhum medicamento cadastrado ainda — peça ao administrador</div>`);
  dd.classList.add("open");med.setAttribute("aria-expanded","true");
}
function hideDD(){dd.classList.remove("open");med.setAttribute("aria-expanded","false");act=-1}
med.addEventListener("focus",showDD);
med.addEventListener("input",()=>{act=-1;showDD();$("#cmed").classList.remove("bad")});
med.addEventListener("keydown",e=>{
  const o=[...dd.querySelectorAll("[data-v]")];
  if(e.key==="ArrowDown"){e.preventDefault();act=Math.min(act+1,o.length-1);showDD()}
  else if(e.key==="ArrowUp"){e.preventDefault();act=Math.max(act-1,0);showDD()}
  else if(e.key==="Enter"&&dd.classList.contains("open")&&act>=0){e.preventDefault();med.value=o[act].dataset.v;hideDD();$("#dose").focus()}
  else if(e.key==="Escape")hideDD();
});
dd.addEventListener("mousedown",e=>{const o=e.target.closest("[data-v]");if(!o)return;e.preventDefault();med.value=o.dataset.v;hideDD();$("#cmed").classList.remove("bad");$("#dose").focus()});
med.addEventListener("blur",()=>setTimeout(hideDD,120));
 
function syncFreq(){const v=$("#freq").value;$("#gint").hidden=v!=="int";$("#gfirst").hidden=v==="sos"}
$("#freq").onchange=syncFreq;
 
function resetForm(){$("#f").reset();$("#via").value="EV";editId=null;$("#ftitle").textContent="Nova Prescrição Hospitalar";$("#add span").textContent="Adicionar Prescrição";$("#cancelEdit").hidden=true;document.querySelectorAll(".bad").forEach(x=>x.classList.remove("bad"));$("#first").value=fmtL(nowRound());syncFreq();render()}
 
$("#f").addEventListener("submit",e=>{
  e.preventDefault();
  const m=med.value.trim(),dose=parseFloat($("#dose").value),fr=$("#freq").value,iv=parseInt($("#int").value,10),fs=$("#first").value?new Date($("#first").value):null;
  const okM=m.length>=2,okD=dose>0&&isFinite(dose),okI=fr!=="int"||(iv>=1&&iv<=72),okF=fr==="sos"||(fs&&!isNaN(fs));
  $("#cmed").classList.toggle("bad",!okM);$("#cdose").classList.toggle("bad",!okD);$("#cint").classList.toggle("bad",!okI);$("#cfirst").classList.toggle("bad",!okF);
  if(!okM)return toast("Informe o medicamento.",true);
  if(!okD)return toast("Informe uma dose maior que zero.",true);
  if(!okI)return toast("O intervalo deve ficar entre 1 e 72 horas.",true);
  if(!okF)return toast("Informe o horário da 1ª dose.",true);
  const dup=rx.some(r=>r.id!==editId&&!r.susp&&r.med.toLowerCase()===m.toLowerCase());
  if(dup&&!confirm(`“${m}” já está prescrito e ativo neste atendimento. Deseja adicionar mesmo assim?`))return;
  const alertas=DSMeds.avaliar({medicamento:m,via:$("#via").value,dose,alergias:[]});
  const grave=alertas.filter(a=>a.nivel==="bloqueio"||a.nivel==="atencao");
  if(grave.length){
    const txt=grave.map(a=>`${a.nivel==="bloqueio"?"⚠️ BLOQUEIO":"⚠️ ATENÇÃO"}: ${a.msg}`).join("\n\n");
    if(!confirm(`ALERTA DE SEGURANÇA DA PRESCRIÇÃO\n\n${txt}\n\nDeseja prescrever mesmo assim? Isso ficará registrado.`))return;
  }
  const item={med:m,dose,un:$("#un").value,via:$("#via").value,freq:fr,int:fr==="int"?iv:null,first:fr==="sos"?null:fs,obs:$("#obs").value.trim(),alerta:grave.length?grave.map(a=>a.msg).join(" | "):""};
  if(editId){const r=rx.find(x=>x.id===editId);Object.assign(r,item,{sent:false});r.doses=mkDoses(r);}
  else{const r={id:nextId++,...item,sent:false,susp:false,sos:[]};r.doses=mkDoses(r);rx.push(r);}
  if(!DSData.write("ds_prescricoes_enfermaria",rx))return toast("Não foi possível salvar a prescrição neste navegador.",true);
  toast(editId?"Prescrição atualizada. Reenvie à enfermaria.":"Prescrição adicionada.");
  resetForm();
});
 
$("#tb").addEventListener("click",e=>{
  const ed=e.target.closest("[data-e]"),dl=e.target.closest("[data-x]");
  if(ed){const r=rx.find(x=>x.id==ed.dataset.e);editId=r.id;med.value=r.med;$("#dose").value=r.dose;$("#un").value=r.un;$("#via").value=r.via;$("#freq").value=r.freq;$("#int").value=r.int||"";$("#first").value=r.first?fmtL(r.first):fmtL(nowRound());$("#obs").value=r.obs;syncFreq();
    $("#ftitle").textContent="Editar Prescrição";$("#add span").textContent="Salvar Alteração";$("#cancelEdit").hidden=false;render();med.focus();hideDD()}
  if(dl){const r=rx.find(x=>x.id==dl.dataset.x);if(!confirm(`Suspender “${r.med}”? As doses pendentes serão canceladas e a suspensão não pode ser desfeita.`))return;r.susp=true;if(!DSData.write("ds_prescricoes_enfermaria",rx)){r.susp=false;return toast("Não foi possível salvar a suspensão.",true)}if(editId===r.id)resetForm();else render();toast("Prescrição suspensa.")}
});
$("#cancelEdit").onclick=resetForm;
 
function checagem(r,horario){
  return confirm(`CONFIRA ANTES DE ADMINISTRAR\n\nPaciente: João da Silva Santos — Enfermaria 02, Leito 04\nMedicamento: ${r.med}\nDose: ${r.dose} ${r.un}\nVia: ${r.via}\nHorário: ${horario}\n\nO paciente foi identificado (pulseira) e as alergias foram verificadas?\nConfirmar administração por ${ENFERMEIRA}?`);
}
$("#tl").addEventListener("click",e=>{
  const a=e.target.closest("[data-adm]"),s=e.target.closest("[data-sos]");
  if(a){const [id,i]=a.dataset.adm.split(":").map(Number);const r=rx.find(x=>x.id===id),d=r.doses[i];if(!checagem(r,fmt(d.t)))return;d.adm=new Date();if(!DSData.write("ds_prescricoes_enfermaria",rx))return toast("Não foi possível salvar o registro da administração.",true);renderAll();toast(`${r.med} administrada às ${p2(d.adm.getHours())}:${p2(d.adm.getMinutes())} (${ENFERMEIRA}).`)}
  if(s){const r=rx.find(x=>x.id==s.dataset.sos);if(!checagem(r,"Se necessário (agora)"))return;r.sos.push(new Date());if(!DSData.write("ds_prescricoes_enfermaria",rx))return toast("Não foi possível salvar o registro da administração.",true);renderAll();toast(`${r.med} (SOS) registrada.`)}
});
function renderAll(){render()}
 
$("#send").onclick=()=>{
  const pend=rx.filter(r=>!r.sent&&!r.susp);
  if(!pend.length)return toast("Não há prescrições novas para enviar.",true);
  if(!confirm(`Enviar ${pend.length} prescrição(ões) à enfermaria? A equipe passará a ver os horários de administração.`))return;
  pend.forEach(r=>r.sent=true);
  if(!DSData.write("ds_prescricoes_enfermaria",rx)){pend.forEach(r=>r.sent=false);return toast("Não foi possível salvar o envio.",true)}
  render();toast("Prescrição marcada como enviada neste navegador. A enfermaria não recebe os dados automaticamente.");
};
$("#voltar").onclick=()=>{if((rx.some(r=>!r.sent&&!r.susp)||med.value)&&!confirm("Existem prescrições ainda não marcadas como enviadas. Voltar ao painel mesmo assim?"))return;location.href="inicio.html"};
 
$("#first").value=fmtL(nowRound());syncFreq();render();
setInterval(renderTL,60000);
