const $=s=>document.querySelector(s);
const RISKS=[["red","Vermelho","Emergência (Atendimento imediato)"],["orange","Laranja","Muito Urgente (Atendimento em até 10min)"],["yellow","Amarelo","Urgente (Atendimento em até 60min)"],["green","Verde","Pouco Urgente (Atendimento em até 120min)"],["blue","Azul","Não Urgente (Atendimento em até 240min)"]];
const STATUS=["Aguardando Médico","Em Atendimento","Medicação","Alta"];
const SYMPTOMS=["Dor de Cabeça","Febre","Náusea","Tontura","Dor no Peito","Falta de Ar","Dor Abdominal","Vômito"];
// Base simulada de pacientes (substitua por chamada à sua API/prontuário)
const PACIENTES={"52998224725":{nome:"Ana Beatriz Souza",dn:"14/03/1988"},"11144477735":{nome:"Carlos Eduardo Lima",dn:"02/11/1975"}};
let risk="yellow";const sel=new Set();

// Render
$("#risk").innerHTML=RISKS.map(([c,t,d])=>`<button type="button" class="rc ${c}${c===risk?" sel":""}" data-r="${c}" aria-pressed="${c===risk}"><div class="rt"><span class="pill">${t}</span><span class="tick"><svg class="i" viewBox="0 0 24 24" style="stroke-width:3"><path d="M20 6 9 17l-5-5"/></svg></span></div><div><b>${t}</b><small>${d}</small></div></button>`).join("");
$("#status").innerHTML=STATUS.map((s,i)=>`<label class="st"><input type="radio" name="status" value="${s}"${i?"":" checked"}><span class="dot"></span>${s}</label>`).join("");
$("#chips").innerHTML=SYMPTOMS.map(s=>`<button type="button" class="chip" aria-pressed="false">${s}</button>`).join("");

// Interações
$("#risk").onclick=e=>{const b=e.target.closest(".rc");if(!b)return;risk=b.dataset.r;document.querySelectorAll(".rc").forEach(x=>{const on=x===b;x.classList.toggle("sel",on);x.setAttribute("aria-pressed",on)})};
$("#chips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;const t=b.textContent;sel.has(t)?sel.delete(t):sel.add(t);b.classList.toggle("on",sel.has(t));b.setAttribute("aria-pressed",sel.has(t))};

const digits=v=>v.replace(/\D/g,"");
$("#cpf").oninput=e=>{let v=digits(e.target.value).slice(0,11);v=v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");e.target.value=v};
$("#dn").oninput=e=>{let v=digits(e.target.value).slice(0,8);v=v.replace(/(\d{2})(\d)/,"$1/$2").replace(/(\d{2})(\d)/,"$1/$2");e.target.value=v};
$("#pa").oninput=e=>{let v=e.target.value.replace(/[^\d/]/g,"");const [a,...r]=v.split("/");v=r.length?a.slice(0,3)+"/"+r.join("").slice(0,3):a.length>3?a.slice(0,3)+"/"+a.slice(3,6):a;e.target.value=v};

function cpfOk(c){c=digits(c);if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(let t=9;t<11;t++){let s=0;for(let i=0;i<t;i++)s+=c[i]*(t+1-i);if(((s*10)%11)%10!=c[t])return false}return true}
function dateOk(v){const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return false;const d=new Date(+m[3],m[2]-1,+m[1]);return d.getFullYear()==m[3]&&d.getMonth()==m[2]-1&&d.getDate()==m[1]&&d<=new Date()&&m[3]>=1900}

let tt;function toast(msg,bad){const t=$("#toast");t.textContent=msg;t.className="show"+(bad?" bad":"");clearTimeout(tt);tt=setTimeout(()=>t.className="",4200)}
function flag(id,bad){$(id).classList.toggle("invalid",bad)}

$("#busca").onclick=()=>{
  const c=digits($("#cpf").value);
  if(!cpfOk(c)){flag("#cpf",true);return toast("Informe um CPF válido para buscar.",true)}
  flag("#cpf",false);
  const p=PACIENTES[c];
  if(p){$("#nome").value=p.nome;$("#dn").value=p.dn;flag("#nome",false);flag("#dn",false);toast("Paciente encontrado: "+p.nome)}
  else toast("Paciente não encontrado. Preencha os dados manualmente.",true)
};

function reset(){$("#f").reset();sel.clear();document.querySelectorAll(".chip").forEach(c=>{c.classList.remove("on");c.setAttribute("aria-pressed","false")});document.querySelectorAll(".invalid").forEach(x=>x.classList.remove("invalid"));risk="yellow";document.querySelectorAll(".rc").forEach(x=>{const on=x.dataset.r===risk;x.classList.toggle("sel",on);x.setAttribute("aria-pressed",on)})}
$("#cancel").onclick=()=>{reset();toast("Triagem cancelada.")};

$("#f").onsubmit=e=>{
  e.preventDefault();
  const bad=[];
  const chk=(id,ok,msg)=>{flag(id,!ok);if(!ok)bad.push(msg)};
  chk("#cpf",cpfOk($("#cpf").value),"CPF inválido");
  chk("#nome",$("#nome").value.trim().split(/\s+/).filter(Boolean).length>=2,"informe o nome completo");
  chk("#dn",dateOk($("#dn").value),"data de nascimento inválida");
  const t=$("#temp").value;if(t)chk("#temp",+t>=30&&+t<=45,"temperatura fora do intervalo (30–45 °C)");else flag("#temp",false);
  if(bad.length)return toast("Revise: "+bad.join("; ")+".",true);
  const reg={
    cpf:$("#cpf").value,nome:$("#nome").value.trim(),nascimento:$("#dn").value,
    sinaisVitais:{pressao:$("#pa").value,temperatura:$("#temp").value,peso:$("#peso").value},
    sintomas:{descricao:$("#desc").value.trim(),inicio:$("#inicio").value.trim(),comuns:[...sel]},
    classificacao:RISKS.find(r=>r[0]===risk)[1],
    status:document.querySelector('input[name=status]:checked').value,
    registradoEm:new Date().toISOString(),profissional:"Enf. Maria Silva — Coren 123.456"
  };
  console.log("Triagem registrada:",reg); // envie `reg` para sua API aqui
  toast(`Triagem registrada: ${reg.nome} — ${reg.classificacao} — ${reg.status}`);
  reset()
};
