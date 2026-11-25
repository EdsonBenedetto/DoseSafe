const $=s=>document.querySelector(s);
const p2=n=>String(n).padStart(2,"0");
const stamp=d=>`${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let rx=DSData.read("ds_prescricoes_medicas",[]);
let nextId=rx.reduce((n,r)=>Math.max(n,(r.id||0)+1),1),editId=null,done=false;
 
// Idade calculada a partir da data de nascimento
(()=>{const b=new Date(1985,2,15),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),2,15))a--;$("#nasc").textContent=`15/03/1985 (${a} anos)`})();
 
let tt;function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",3800)}
 
function render(){
  const tb=$("#tb");
  tb.innerHTML=rx.length?rx.map(r=>`<tr class="${r.id===editId?"editing":""}"><td class="n">${esc(r.med)}${r.obs?`<small>${esc(r.obs)}</small>`:""}${r.alerta?`<small style="color:#b91c1c">⚠️ ${esc(r.alerta)}</small>`:""}</td><td>${r.dose} ${esc(r.un)}</td><td>${r.via}</td><td>${r.int}/${r.int}h</td><td class="d">${r.dt}</td><td><button class="ib e" data-e="${r.id}" aria-label="Editar ${esc(r.med)}" ${done?"disabled":""}><svg class="i" viewBox="0 0 24 24"><path d="M21.2 5.6 18.4 2.8a2 2 0 0 0-2.8 0L3 15.4V21h5.6L21.2 8.4a2 2 0 0 0 0-2.8ZM15 5l4 4"/></svg></button><button class="ib x" data-x="${r.id}" aria-label="Remover ${esc(r.med)}" ${done?"disabled":""}><svg class="i" viewBox="0 0 24 24"><path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button></td></tr>`).join(""):`<tr><td colspan="6" class="empty">Nenhuma prescrição adicionada neste atendimento.</td></tr>`;
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
document.addEventListener("click",e=>{if(!e.target.closest(".field"))hideDD()});
med.addEventListener("blur",()=>setTimeout(hideDD,120));
 
function resetForm(){$("#f").reset();$("#via").value="EV";editId=null;$("#ftitle").textContent="Nova Prescrição";$("#add span").textContent="Adicionar Prescrição";$("#cancelEdit").hidden=true;document.querySelectorAll(".bad").forEach(x=>x.classList.remove("bad"));render()}
 
$("#f").addEventListener("submit",e=>{
  e.preventDefault();
  if(done)return;
  const m=med.value.trim(),dose=parseFloat($("#dose").value),iv=parseInt($("#int").value,10);
  const okM=m.length>=2,okD=dose>0&&isFinite(dose),okI=iv>=1&&iv<=72;
  $("#cmed").classList.toggle("bad",!okM);$("#cdose").classList.toggle("bad",!okD);$("#cint").classList.toggle("bad",!okI);
  if(!okM)return toast("Informe o medicamento.",true);
  if(!okD)return toast("Informe uma dose maior que zero.",true);
  if(!okI)return toast("O intervalo deve ficar entre 1 e 72 horas.",true);
  const dup=rx.some(r=>r.id!==editId&&r.med.toLowerCase()===m.toLowerCase());
  if(dup&&!confirm(`“${m}” já está prescrito neste atendimento. Deseja adicionar mesmo assim?`))return;
  const alertas=DSMeds.avaliar({medicamento:m,via:$("#via").value,dose,alergias:[]});
  const grave=alertas.filter(a=>a.nivel==="bloqueio"||a.nivel==="atencao");
  if(grave.length){
    const txt=grave.map(a=>`${a.nivel==="bloqueio"?"⚠️ BLOQUEIO":"⚠️ ATENÇÃO"}: ${a.msg}`).join("\n\n");
    if(!confirm(`ALERTA DE SEGURANÇA DA PRESCRIÇÃO\n\n${txt}\n\nDeseja prescrever mesmo assim? Isso ficará registrado.`))return;
  }
  const item={med:m,dose,un:$("#un").value,via:$("#via").value,int:iv,obs:$("#obs").value.trim(),alerta:grave.length?grave.map(a=>a.msg).join(" | "):""};
  if(editId){const r=rx.find(x=>x.id===editId);Object.assign(r,item);}
  else{rx.push({id:nextId++,...item,dt:stamp(new Date())});}
  if(!DSData.write("ds_prescricoes_medicas",rx))return toast("Não foi possível salvar a prescrição neste navegador.",true);
  toast(editId?"Prescrição atualizada.":"Prescrição adicionada.");
  resetForm();
});
 
$("#tb").addEventListener("click",e=>{
  const ed=e.target.closest("[data-e]"),dl=e.target.closest("[data-x]");
  if(ed){const r=rx.find(x=>x.id==ed.dataset.e);editId=r.id;med.value=r.med;$("#dose").value=r.dose;$("#un").value=r.un;$("#via").value=r.via;$("#int").value=r.int;$("#obs").value=r.obs;
    $("#ftitle").textContent="Editar Prescrição";$("#add span").textContent="Salvar Alteração";$("#cancelEdit").hidden=false;render();med.focus();hideDD()}
  if(dl){const r=rx.find(x=>x.id==dl.dataset.x);if(!confirm(`Remover “${r.med}” das prescrições?`))return;rx=rx.filter(x=>x.id!==r.id);if(!DSData.write("ds_prescricoes_medicas",rx))return toast("Não foi possível atualizar os dados salvos.",true);if(editId===r.id)resetForm();else render();toast("Prescrição removida.")}
});
$("#cancelEdit").onclick=resetForm;
 
$("#voltar").onclick=()=>{if(!done&&(rx.length||med.value)&&!confirm("Voltar ao painel? As prescrições ficam salvas localmente neste navegador."))return;location.href="inicio.html"};
 
$("#fin").onclick=()=>{
  if(done)return;
  if(!rx.length)return toast("Adicione ao menos uma prescrição antes de finalizar.",true);
  if(!confirm(`Finalizar o atendimento com ${rx.length} prescrição(ões)? Elas serão enviadas à enfermagem.`))return;
  const user=DS.session();
  const payload={paciente:"João da Silva Santos",prontuario:"#854.291-A",medico:user?`${user.nome} — ${user.cargo}`:"Profissional não identificado",prescricoes:rx,finalizadoEm:new Date().toISOString()};
  if(!DSData.write("ds_atendimentos_finalizados",[...DSData.read("ds_atendimentos_finalizados",[]),payload]))return toast("Não foi possível finalizar e salvar o atendimento.",true);
  done=true;$("#fin").disabled=true;$("#add").disabled=true;document.querySelectorAll("#f input,#f select,#f textarea").forEach(x=>x.disabled=true);render();
  toast("Atendimento finalizado e salvo localmente neste navegador.");
};
 
render();
