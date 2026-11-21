const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const p2=n=>String(n).padStart(2,"0");
const fmt=d=>`${p2(d.getHours())}:${p2(d.getMinutes())}`;
const RISK={red:["Vermelho","r-red"],orange:["Laranja","r-orange"],yellow:["Amarelo","r-yellow"],green:["Verde","r-green"],blue:["Azul","r-blue"]};
const NURSES=[{nome:"Enf. Maria Silva",cargo:"Coren 123.456"},{nome:"Enf. João Pedro",cargo:"Coren 234.567"},{nome:"Enf. Beatriz Alves",cargo:"Coren 345.678"}];
// Pacientes do pronto atendimento — cada um chega com a rodada de medicação prescrita agora pelo médico
let patients=[
  {id:1,nome:"João da Silva Santos",prontuario:"#854.291-A",local:"Sala Amarela — Box 3",risco:"yellow",alergias:["Dipirona Sódica"],status:"fila",rodada:1,chegada:new Date(Date.now()-25*60000),peso:70,meds:[]},
  {id:2,nome:"Ana Beatriz Souza",prontuario:"#611.008-B",local:"Sala Vermelha — Box 1",risco:"red",alergias:[],status:"fila",rodada:1,chegada:new Date(Date.now()-52*60000),peso:62,meds:[]},
  {id:3,nome:"Carlos Eduardo Lima",prontuario:"#233.774-C",local:"Sala Verde — Box 5",risco:"green",alergias:["Penicilina"],status:"fila",rodada:1,chegada:new Date(Date.now()-8*60000),peso:80,meds:[]},
  {id:4,nome:"Fernanda Costa",prontuario:"#905.512-D",local:"Sala Azul — Box 2",risco:"blue",alergias:[],status:"fila",rodada:1,chegada:new Date(Date.now()-15*60000),peso:58,meds:[]}
];
// Sem medicamentos de exemplo: a prescrição chega da tela do médico (ainda não integrada) e o cadastro de medicamentos é feito pelo administrador.
patients.forEach(p=>p.meds.forEach(m=>{m.status="pendente";m.adm=null;m.motivo=null}));
 
let currentNurse={nome:(DS.session()||{nome:"Maria Silva"}).nome,cargo:""},currentPatientId=null,tab="fila";
let tt;function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",3800)}
function now(){return new Date()}
function setNurseUI(){$("#idtxt").textContent=currentNurse.nome;$("#avMini").textContent=currentNurse.nome.replace("Enf. ","").split(" ").map(w=>w[0]).slice(0,2).join("")}
setNurseUI();
 
function switchTab(t){
  tab=t;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("act",x.dataset.tab===t));
  $("#viewQueue").hidden=t!=="fila";$("#viewReav").hidden=t!=="reav";
  $("#viewPatient").hidden=true;
}
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));
 
function counts(){
  $("#nFila").textContent=patients.filter(p=>p.status==="fila").length;
  $("#nReav").textContent=patients.filter(p=>p.status==="reav").length;
}
 
function tempoEspera(d){const m=Math.round((now()-d)/60000);return m<60?`${m} min`:`${Math.floor(m/60)}h${p2(m%60)}`}
 
function renderQueue(){
  const list=patients.filter(p=>p.status==="fila").sort((a,b)=>a.chegada-b.chegada);
  const q=$("#queue");
  if(!list.length){q.innerHTML=`<div class="empty">Nenhum paciente aguardando medicação no momento.</div>`;return}
  q.innerHTML=list.map(p=>{
    const [rt,rc]=RISK[p.risco];
    const urgent=p.risco==="red"||p.risco==="orange";
    return `<div class="pcard ${urgent?"urgent":""}" data-sel="${p.id}">
      <div class="pav">${p.nome.split(" ").slice(0,2).map(w=>w[0]).join("")}</div>
      <div class="pinfo"><b>${esc(p.nome)}</b><span>${esc(p.local)} · ${p.prontuario}${p.rodada>1?` · Rodada ${p.rodada}`:""}</span></div>
      <div class="pmeta">
        <span class="pill ${rc}">${rt}</span>
        <div class="mcol"><span>Medicamentos</span><b>${p.meds.length}</b></div>
        <div class="mcol"><span>Aguardando há</span><b>${tempoEspera(p.chegada)}</b></div>
      </div>
      <button class="btn p" data-sel="${p.id}">Selecionar Paciente</button>
    </div>`;
  }).join("");
  counts();
}
 
$("#queue").addEventListener("click",e=>{
  const b=e.target.closest("[data-sel]");if(!b)return;
  openPatient(+b.dataset.sel);
});
 
function openPatient(id){
  currentPatientId=id;
  const p=patients.find(x=>x.id===id);
  $("#viewQueue").hidden=true;$("#viewReav").hidden=true;$("#viewPatient").hidden=false;
  $("#pnome").textContent=p.nome;
  $("#prodada").textContent=`Rodada ${p.rodada}`;
  $("#ploc").textContent=p.local;
  $("#pront").textContent=p.prontuario;
  $("#palerg").textContent=p.alergias.length?p.alergias.join(", "):"Nenhuma registrada — confirmar";
  $("#pnurse").textContent=currentNurse.nome;
  const [rt,rc]=RISK[p.risco];$("#prisco").className="pill "+rc;$("#prisco").textContent=rt;
  renderMeds(p);
}
 
function renderMeds(p){
  const box=$("#meds");
  if(!p.meds.length){box.innerHTML=`<div class="empty">Nenhum medicamento prescrito para esta rodada ainda.</div>`;$("#resumo").textContent="";$("#retornar").disabled=false;return}
  box.innerHTML=p.meds.map(m=>{
    const alertas=DSMeds.avaliar({medicamento:m.med,via:m.via,dose:m.dose,peso:p.peso,alergias:p.alergias});
    const graves=alertas.filter(a=>a.nivel==="bloqueio"||a.nivel==="atencao");
    const alertaHtml=graves.map(a=>`<div class="medalert"><svg class="i" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg><b>${a.nivel==="bloqueio"?"Alerta:":"Atenção:"}</b>&nbsp;${esc(a.msg)}</div>`).join("");
    let statusHtml,actionsHtml;
    if(m.status==="administrado"){statusHtml=`<span class="status s-ok">Administrado</span>`;actionsHtml=`<div class="donebox" style="padding:0">às ${fmt(m.adm)} por ${esc(m.nurse)}</div>`}
    else if(m.status==="nao_admin"){statusHtml=`<span class="status s-off">Não administrado</span>`;actionsHtml=`<div class="donebox" style="padding:0">Motivo: ${esc(m.motivo)} — registrado por ${esc(m.nurse)}</div>`}
    else{statusHtml=`<span class="status s-pend">Pendente</span>`;actionsHtml=`<div class="medactions"><button class="btn g sm" data-adm="${m.id}">Administrar</button><button class="btn r sm" data-neg="${m.id}">Não administrado</button></div>`}
    return `<div class="medgroup">
      <div class="medhead">
        <div><b>${esc(m.med)} — ${m.dose}${esc(m.un)} · ${m.via}</b><small>${m.obs?esc(m.obs):"Aplicação única nesta rodada"}</small></div>
        <div style="display:flex;gap:10px;align-items:center">${statusHtml}${m.status==="pendente"?"":""}</div>
        ${m.status==="pendente"?actionsHtml:""}
      </div>
      ${alertaHtml}
      ${m.status!=="pendente"?`<div style="padding:8px 16px 12px">${actionsHtml}</div>`:""}
    </div>`;
  }).join("");
  const pend=p.meds.filter(x=>x.status==="pendente").length,tot=p.meds.length;
  $("#resumo").textContent=pend?`${tot-pend}/${tot} itens resolvidos — ${pend} pendente(s).`:`${tot}/${tot} itens resolvidos. Pronto para retornar ao médico.`;
  $("#retornar").disabled=pend>0;
}
 
function confirmarAdministracao(p,m){
  let msg=`CONFIRA ANTES DE ADMINISTRAR\n\nPaciente: ${p.nome} — ${p.local}\nMedicamento: ${m.med}\nDose: ${m.dose} ${m.un}\nVia: ${m.via}\nRegistrado por: ${currentNurse.nome}\n\nO paciente foi identificado (pulseira) e as alergias foram conferidas?`;
  if(!confirm(msg))return false;
  const alertas=DSMeds.avaliar({medicamento:m.med,via:m.via,dose:m.dose,peso:p.peso,alergias:p.alergias});
  const graves=alertas.filter(a=>a.nivel==="bloqueio"||a.nivel==="atencao");
  if(graves.length){
    const txt=graves.map(a=>`${a.nivel==="bloqueio"?"⚠️ ALERTA":"⚠️ ATENÇÃO"}: ${a.msg}`).join("\n\n");
    alert(`ALERTA DE SEGURANÇA\n\n${txt}\n\nEsta administração será registrada como confirmada mesmo com o alerta, e o médico responsável será notificado na reavaliação.`);
    if(!confirm("Deseja realmente prosseguir com a administração mesmo com o alerta?"))return false;
  }
  return true;
}
 
$("#meds").addEventListener("click",e=>{
  const p=patients.find(x=>x.id===currentPatientId);
  const adm=e.target.closest("[data-adm]"),neg=e.target.closest("[data-neg]");
  if(adm){
    const m=p.meds.find(x=>x.id===adm.dataset.adm);
    if(!confirmarAdministracao(p,m))return;
    m.status="administrado";m.adm=new Date();m.nurse=currentNurse.nome;
    renderMeds(p);toast(`${m.med} administrado e registrado em nome de ${currentNurse.nome}.`);
  }
  if(neg){
    const m=p.meds.find(x=>x.id===neg.dataset.neg);
    const motivo=prompt(`Por que "${m.med}" não será administrado agora?\n(ex: paciente recusou, acesso venoso perdido, sinal vital alterado)`);
    if(motivo===null||!motivo.trim())return;
    m.status="nao_admin";m.motivo=motivo.trim();m.nurse=currentNurse.nome;
    renderMeds(p);toast(`Registrado: ${m.med} não administrado. O médico será avisado na reavaliação.`,true);
  }
});
 
$("#retornar").onclick=()=>{
  const p=patients.find(x=>x.id===currentPatientId);
  if(p.meds.some(x=>x.status==="pendente"))return;
  const naoAdm=p.meds.filter(x=>x.status==="nao_admin").length;
  if(!confirm(`Retornar ${p.nome} ao médico para reavaliação?${naoAdm?`\n\nAtenção: ${naoAdm} medicamento(s) não foram administrados e serão sinalizados ao médico.`:""}`))return;
  p.status="reav";
  currentPatientId=null;
  $("#viewPatient").hidden=true;
  switchTab("fila");
  renderQueue();renderReav();
  toast(naoAdm?`${p.nome} encaminhado ao médico com pendência(s) sinalizada(s).`:`${p.nome} encaminhado ao médico para reavaliação.`,naoAdm>0);
};
 
function renderReav(){
  const list=patients.filter(p=>p.status==="reav");
  const box=$("#reavList");
  if(!list.length){box.innerHTML=`<div class="empty">Nenhum paciente aguardando reavaliação médica no momento.</div>`;return}
  box.innerHTML=list.map(p=>{
    const [rt,rc]=RISK[p.risco];
    const naoAdm=p.meds.filter(m=>m.status==="nao_admin");
    return `<div class="reav-card">
      <div class="reav-top">
        <div><b style="font-size:15px">${esc(p.nome)}</b><span style="display:block;font-size:12px;color:var(--muted);margin-top:2px">${esc(p.local)} · ${p.prontuario} · Rodada ${p.rodada}</span></div>
        <span class="pill ${rc}">${rt}</span>
      </div>
      <div class="reav-meds">
        ${p.meds.map(m=>`<div><span>${esc(m.med)} ${m.dose}${esc(m.un)}</span><small>${m.status==="administrado"?"Administrado "+fmt(m.adm):"Não administrado — "+esc(m.motivo)}</small></div>`).join("")}
      </div>
      ${naoAdm.length?`<div class="medalert" style="border-radius:8px;border:1px solid #fecaca"><svg class="i" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>${naoAdm.length} medicamento(s) não administrado(s) nesta rodada — revisar antes de decidir.</div>`:""}
      <div class="reav-actions">
        <button class="btn r sm" data-alta="${p.id}">Dar Alta</button>
        <button class="btn p sm" data-nova="${p.id}">Prescrever Nova Rodada</button>
      </div>
      <div class="hint" style="font-size:11px;color:var(--muted)">Simulação: em um sistema real, essa decisão parte da tela do médico. Os botões aqui só demonstram o ciclo completo.</div>
    </div>`;
  }).join("");
  counts();
}
 
$("#reavList").addEventListener("click",e=>{
  const alta=e.target.closest("[data-alta]"),nova=e.target.closest("[data-nova]");
  if(alta){
    const p=patients.find(x=>x.id==alta.dataset.alta);
    if(!confirm(`Confirmar alta de ${p.nome}?`))return;
    patients=patients.filter(x=>x.id!==p.id);
    renderReav();toast(`${p.nome} recebeu alta e saiu do pronto atendimento.`);
  }
  if(nova){
    const p=patients.find(x=>x.id==nova.dataset.nova);
    if(!confirm(`Simular nova prescrição médica para ${p.nome}? O paciente voltará à fila de medicação.`))return;
    p.rodada++;p.status="fila";p.chegada=new Date();
    p.meds=p.meds.map((b,i)=>({id:`${p.id}-${p.rodada}-${i}`,med:b.med,dose:b.dose,un:b.un,via:b.via,obs:b.obs,status:"pendente",adm:null,motivo:null,nurse:null}));
    if(!p.meds.length)toast("Aviso: este paciente não tem medicamentos de rodada anterior para repetir — cadastre a prescrição na tela do médico.",true);
    renderReav();renderQueue();switchTab("fila");
    toast(`Nova rodada prescrita para ${p.nome}. Paciente voltou à fila de medicação.`);
  }
});
 
$("#voltarFila").onclick=()=>{currentPatientId=null;switchTab("fila");renderQueue()};
 
$("#trocarUsuario").onclick=()=>{
  $("#userList").innerHTML=NURSES.map((n,i)=>`<div class="uopt" data-u="${i}"><div class="avmini">${n.nome.replace("Enf. ","").split(" ").map(w=>w[0]).slice(0,2).join("")}</div><div><b>${esc(n.nome)}</b><span>${esc(n.cargo)}</span></div></div>`).join("");
  $("#ovUser").classList.add("open");
};
$("#userCancel").onclick=()=>$("#ovUser").classList.remove("open");
$("#userList").addEventListener("click",e=>{
  const o=e.target.closest("[data-u]");if(!o)return;
  currentNurse=NURSES[+o.dataset.u];setNurseUI();$("#ovUser").classList.remove("open");
  toast(`Sessão trocada para ${currentNurse.nome}.`);
  if(currentPatientId)$("#pnurse").textContent=currentNurse.nome;
});
 
renderQueue();renderReav();
setInterval(()=>{if(tab==="fila"&&!currentPatientId)renderQueue()},60000);
