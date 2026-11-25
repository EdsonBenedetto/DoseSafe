const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const AREAS={
  enfermagem:{nome:"Enfermagem",setores:["Triagem","Medicação"],cargos:["Enfermeiro(a)","Técnico(a) de Enfermagem"]},
  medica:{nome:"Área Médica",setores:["Atendimento Médico","Prescrição","Reavaliação"],cargos:["Médico(a)"]},
  exames:{nome:"Exames",setores:["Laboratório","Imagem"],cargos:["Biomédico(a)","Técnico(a) de Laboratório","Técnico(a) de Radiologia"]}
};
const MEDICO="Médico(a)";
let staff=DS.staff();
const save=()=>DS.saveStaff(staff);
let editing=null,sel=new Set(),tt;
function toast(m,bad){const t=$("#toast");t.textContent=m;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",3800)}
 
const areaOpts=Object.entries(AREAS).map(([k,a])=>`<option value="${k}">${a.nome}</option>`).join("");
$("#area").innerHTML=areaOpts;$("#fa").innerHTML+=areaOpts;
 
function fillCargos(keep){
  const a=$("#area").value;
  $("#cargo").innerHTML=AREAS[a].cargos.map(c=>`<option>${c}</option>`).join("");
  if(keep&&AREAS[a].cargos.includes(keep))$("#cargo").value=keep;
}
// Médico pode atuar em setores de qualquer área; os demais, só na própria área
function allowed(){return $("#cargo").value===MEDICO?Object.keys(AREAS):[$("#area").value]}
function renderSetores(){
  const al=allowed();
  sel=new Set([...sel].filter(k=>al.includes(k.split(":")[0])));
  $("#setores").innerHTML=al.map(k=>`<div class="grp"><b>${AREAS[k].nome}</b><div class="opts">${AREAS[k].setores.map(s=>`<label class="opt"><input type="checkbox" value="${k}:${s}" ${sel.has(k+":"+s)?"checked":""}>${s}</label>`).join("")}</div></div>`).join("");
  $("#shint").textContent=$("#cargo").value===MEDICO?"Médico: selecione os setores (de qualquer área) em que poderá atuar.":"Setores disponíveis apenas na área escolhida.";
  updPreview();
}
function updPreview(){
  const nome=$("#nome").value.trim()||"O funcionário";
  $("#preview").innerHTML=sel.size?`<b>${esc(nome)}</b> terá acesso somente a: ${[...sel].map(k=>{const[a,s]=k.split(":");return `${AREAS[a].nome} › ${s}`}).join("; ")}. Qualquer outro setor ficará bloqueado.`:"Nenhum setor selecionado — sem acesso a nenhuma tela do sistema.";
}
$("#setores").addEventListener("change",e=>{e.target.checked?sel.add(e.target.value):sel.delete(e.target.value);updPreview()});
$("#nome").addEventListener("input",updPreview);
$("#area").onchange=()=>{sel.clear();fillCargos();renderSetores()};
$("#cargo").onchange=renderSetores;
$("#vsenha").onclick=()=>{const i=$("#senha"),h=i.type==="password";i.type=h?"text":"password";$("#vsenha").textContent=h?"Ocultar":"Mostrar"};
$("#gen").onclick=()=>{let m;do{m=String(Math.floor(100000+Math.random()*900000))}while(staff.some(s=>s.mat===m));$("#mat").value=m;$("#mat").classList.remove("bad")};
 
function resetForm(){
  editing=null;sel.clear();$("#f").reset();$("#mat").disabled=false;$("#senha").type="password";$("#vsenha").textContent="Mostrar";$("#lsenha").textContent="Senha";$("#senha").placeholder="Mínimo 4 caracteres";$("#area").value="enfermagem";fillCargos();renderSetores();
  $("#ftitle").textContent="Novo Funcionário";$("#save").textContent="Cadastrar Funcionário";$("#cancel").hidden=true;
  document.querySelectorAll(".bad").forEach(x=>x.classList.remove("bad"));
}
$("#cancel").onclick=()=>{resetForm();$("#cred").classList.remove("show")};
 
$("#f").addEventListener("submit",e=>{
  e.preventDefault();
  const nome=$("#nome").value.trim().replace(/\s+/g," "),mat=$("#mat").value.trim();
  const okN=nome.split(" ").length>=2,okM=/^[A-Za-z0-9-]{3,15}$/.test(mat),dup=!editing&&staff.some(s=>s.mat.toLowerCase()===mat.toLowerCase());
  $("#nome").classList.toggle("bad",!okN);$("#mat").classList.toggle("bad",!okM||dup);
  if(!okN)return toast("Informe nome e sobrenome.",true);
  if(!okM)return toast("Matrícula: 3 a 15 letras, números ou hífen.",true);
  if(dup)return toast("Já existe um funcionário com essa matrícula.",true);
  const senha=$("#senha").value,okS=editing?(!senha||senha.length>=4):senha.length>=4;
  $("#senha").classList.toggle("bad",!okS);
  if(!okS)return toast(editing?"A nova senha deve ter ao menos 4 caracteres (ou deixe em branco).":"Defina uma senha com ao menos 4 caracteres.",true);
  if(!sel.size)return toast("Selecione ao menos um setor de atuação.",true);
  const d={nome,mat,area:$("#area").value,cargo:$("#cargo").value,setores:[...sel]};
  if(editing){const u=staff.find(s=>s.mat===editing);Object.assign(u,d);if(senha)u.senha=senha;toast(senha?"Cadastro e senha atualizados.":"Cadastro atualizado.");$("#cred").classList.remove("show")}
  else{
    staff.push({...d,ativo:true,senha});
    $("#cred").innerHTML=`<b>${esc(nome)} cadastrado.</b><br>Já pode entrar com a matrícula <b>${esc(mat)}</b> e a senha definida.`;
    $("#cred").classList.add("show");toast("Funcionário cadastrado.");
  }
  if(!save())return toast("Não foi possível salvar. Verifique o espaço disponível no navegador.",true);const keep=$("#cred").classList.contains("show");resetForm();if(keep)$("#cred").classList.add("show");render();
});
 
function render(){
  const q=$("#q").value.trim().toLowerCase(),fa=$("#fa").value;
  const l=staff.filter(s=>(!fa||s.area===fa)&&(!q||s.nome.toLowerCase().includes(q)||s.mat.toLowerCase().includes(q)));
  $("#tb").innerHTML=l.length?l.map(s=>`<tr class="${s.ativo?"":"off"}"><td><b>${esc(s.nome)}</b><small>Matrícula ${esc(s.mat)}</small></td><td>${esc(s.cargo)}<br><small>${AREAS[s.area].nome}</small></td><td>${s.setores.map(k=>{const[a,n]=k.split(":");return `<span class="tag a-${a}">${n}</span>`}).join("")}</td><td><span class="st ${s.ativo?"on":"no"}">${s.ativo?"Ativo":"Inativo"}</span></td><td><div class="acts"><button class="btn sm" data-e="${esc(s.mat)}">Editar</button><button class="btn sm r" data-t="${esc(s.mat)}">${s.ativo?"Desativar":"Reativar"}</button></div></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Nenhum funcionário encontrado.</td></tr>`;
}
$("#q").oninput=render;$("#fa").onchange=render;
$("#tb").addEventListener("click",e=>{
  const ed=e.target.closest("[data-e]"),tg=e.target.closest("[data-t]");
  if(ed){
    const s=staff.find(x=>x.mat===ed.dataset.e);editing=s.mat;
    $("#nome").value=s.nome;$("#mat").value=s.mat;$("#mat").disabled=true;$("#senha").value="";$("#lsenha").textContent="Nova senha (opcional)";$("#senha").placeholder="Deixe em branco para manter a atual";$("#area").value=s.area;fillCargos(s.cargo);
    sel=new Set(s.setores);renderSetores();
    $("#ftitle").textContent="Editar Funcionário";$("#save").textContent="Salvar Alterações";$("#cancel").hidden=false;$("#cred").classList.remove("show");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  if(tg){
    const s=staff.find(x=>x.mat===tg.dataset.t);
    if(s.ativo&&!confirm(`Desativar ${s.nome}? O acesso ao sistema será bloqueado imediatamente.`))return;
    s.ativo=!s.ativo;if(!save()){s.ativo=!s.ativo;return toast("Não foi possível salvar. Verifique o espaço disponível no navegador.",true)}render();toast(s.ativo?`${s.nome} reativado.`:`${s.nome} desativado.`);
  }
});
 
fillCargos();renderSetores();render();
 
// Troca de aba
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("act",x===t));
  $("#viewStaff").hidden=t.dataset.tab!=="staff";
  $("#viewMeds").hidden=t.dataset.tab!=="meds";
});
 
/* ---- Medicamentos ---- */
$("#mvia").innerHTML=DSMeds.VIAS.map(v=>`<option value="${v}">${DSMeds.VIA_NOME[v]}</option>`).join("");
let meds=DSMeds.list(),mEditing=null,viasTmp=[];
const saveMeds=()=>DSMeds.save(meds);
 
function renderViaList(){
  $("#mviaList").innerHTML=viasTmp.length?viasTmp.map((v,i)=>`<div class="viachip"><span><b class="nivel-${v.nivel}">${DSMeds.VIA_NOME[v.via]}</b> — ${v.nivel==="bloqueio"?"Bloqueada":"Atenção"}${v.obs?": "+esc(v.obs):""}</span><button type="button" class="rm" data-rmvia="${i}">×</button></div>`).join(""):`<span class="hint">Nenhuma via restrita adicionada ainda.</span>`;
}
$("#mviaAdd").onclick=()=>{
  const via=$("#mvia").value;
  if(viasTmp.some(v=>v.via===via))return toast("Essa via já foi adicionada. Remova-a para alterar.",true);
  viasTmp.push({via,nivel:$("#mnivel").value,obs:$("#mviaObs").value.trim()});
  $("#mviaObs").value="";renderViaList();
};
$("#mviaList").addEventListener("click",e=>{
  const r=e.target.closest("[data-rmvia]");if(!r)return;
  viasTmp.splice(+r.dataset.rmvia,1);renderViaList();
});
 
function resetMedForm(){
  mEditing=null;viasTmp=[];$("#fm").reset();$("#mdoseun").value="mg";renderViaList();
  $("#mftitle").textContent="Novo Medicamento";$("#msave").textContent="Cadastrar Medicamento";$("#mcancel").hidden=true;
  document.querySelectorAll("#fm .bad").forEach(x=>x.classList.remove("bad"));
}
$("#mcancel").onclick=resetMedForm;
 
$("#fm").addEventListener("submit",e=>{
  e.preventDefault();
  const nome=$("#mnome").value.trim();
  const dup=!mEditing&&meds.some(m=>m.nome.toLowerCase()===nome.toLowerCase());
  $("#mnome").classList.toggle("bad",nome.length<2);
  if(nome.length<2)return toast("Informe o nome do medicamento.",true);
  if(dup)return toast("Já existe um medicamento com esse nome.",true);
  const d={
    nome,classe:$("#mclasse").value.trim(),vias:[...viasTmp],
    doseMax:$("#mdosemax").value?Number($("#mdosemax").value):null,doseUn:$("#mdoseun").value,
    doseKg:$("#mdosekg").value?Number($("#mdosekg").value):null,
    alergias:$("#malerg").value.split(",").map(s=>s.trim()).filter(Boolean),
    contraindicacoes:$("#mcontra").value.trim()
  };
  if(mEditing){Object.assign(meds.find(m=>m.nome===mEditing),d);toast("Medicamento atualizado.")}
  else{meds.push({...d,ativo:true});toast("Medicamento cadastrado.")}
  if(!saveMeds())return toast("Não foi possível salvar. Verifique o espaço disponível no navegador.",true);resetMedForm();renderMeds();
});
 
function renderMeds(){
  const q=$("#mq").value.trim().toLowerCase();
  const l=meds.filter(m=>!q||m.nome.toLowerCase().includes(q)||(m.classe||"").toLowerCase().includes(q));
  $("#mtb").innerHTML=l.length?l.map(m=>`<tr class="${m.ativo===false?"off":""}"><td><b>${esc(m.nome)}</b>${m.classe?`<small>${esc(m.classe)}</small>`:""}</td><td>${m.vias&&m.vias.length?m.vias.map(v=>`<span class="pill pill-${v.nivel}">${v.via}</span>`).join(""):"<small>Nenhuma restrição</small>"}</td><td>${m.doseMax?`${m.doseMax}${esc(m.doseUn)}${m.doseKg?` · ${m.doseKg}${esc(m.doseUn)}/kg`:""}`:"—"}</td><td><span class="st ${m.ativo===false?"no":"on"}">${m.ativo===false?"Inativo":"Ativo"}</span></td><td><div class="acts"><button class="btn sm" data-me="${esc(m.nome)}">Editar</button><button class="btn sm r" data-mt="${esc(m.nome)}">${m.ativo===false?"Reativar":"Desativar"}</button></div></td></tr>`).join(""):`<tr><td colspan="5" class="empty">Nenhum medicamento cadastrado ainda.</td></tr>`;
}
$("#mq").oninput=renderMeds;
$("#mtb").addEventListener("click",e=>{
  const ed=e.target.closest("[data-me]"),tg=e.target.closest("[data-mt]");
  if(ed){
    const m=meds.find(x=>x.nome===ed.dataset.me);mEditing=m.nome;
    $("#mnome").value=m.nome;$("#mclasse").value=m.classe||"";viasTmp=[...(m.vias||[])];renderViaList();
    $("#mdosemax").value=m.doseMax||"";$("#mdoseun").value=m.doseUn||"mg";$("#mdosekg").value=m.doseKg||"";
    $("#malerg").value=(m.alergias||[]).join(", ");$("#mcontra").value=m.contraindicacoes||"";
    $("#mftitle").textContent="Editar Medicamento";$("#msave").textContent="Salvar Alterações";$("#mcancel").hidden=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }
  if(tg){
    const m=meds.find(x=>x.nome===tg.dataset.mt);
    m.ativo=!(m.ativo!==false);if(!saveMeds()){m.ativo=!(m.ativo!==false);return toast("Não foi possível salvar. Verifique o espaço disponível no navegador.",true)}renderMeds();
    toast(m.ativo?`${m.nome} reativado — volta a aparecer nas buscas.`:`${m.nome} desativado — some das buscas, mas o histórico é mantido.`);
  }
});
 
renderViaList();renderMeds();
