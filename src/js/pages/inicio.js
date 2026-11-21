const u=DS.session();
if(u){
  document.getElementById("ola").textContent="Olá, "+u.nome;
  document.getElementById("cargo").textContent=u.cargo+" · matrícula "+u.mat;
  document.getElementById("tags").innerHTML=u.admin?'<span class="tag">Acesso administrativo</span>':u.setores.map(s=>'<span class="tag"></span>').join("");
  if(!u.admin)document.querySelectorAll("#tags .tag").forEach((t,i)=>t.textContent=u.setores[i].replace(":"," › "));
  const l=DS.PAGES.filter(p=>DS.can(u,p));
  document.getElementById("grid").innerHTML=l.length?l.map(p=>'<a class="card" href="'+p.f+'"><b>'+p.n+'</b><span>'+p.d+'</span></a>').join(""):'<div class="empty">Nenhuma tela liberada para o seu cadastro. Fale com o administrador.</div>';
}
