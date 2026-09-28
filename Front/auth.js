/* DoseSafe - autenticação simples no navegador (projeto acadêmico).
   Futuramente: trocar as funções staff()/saveStaff()/login() por chamadas a um banco de dados real. */
(function () {
  const SK = "ds_staff", SS = "ds_session";
  const ADMIN = { mat: "admin", senha: "admin", nome: "Administrador", cargo: "Administrador do Sistema", setores: [], admin: true, ativo: true };
  const SEED = [
    { nome: "Maria Silva", mat: "1001", senha: "1234", area: "enfermagem", cargo: "Enfermeiro(a)", setores: ["enfermagem:Triagem", "enfermagem:Medicação"], ativo: true },
    { nome: "Carlos Mendes", mat: "CRM55512", senha: "1234", area: "medica", cargo: "Médico(a)", setores: ["medica:Atendimento Médico", "medica:Prescrição", "medica:Reavaliação"], ativo: true },
    { nome: "Paula Rocha", mat: "2040", senha: "1234", area: "exames", cargo: "Biomédico(a)", setores: ["exames:Laboratório"], ativo: true }
  ];
  // Telas do sistema e o setor exigido para cada uma
  const PAGES = [
    { f: "triagem-hospitalar.html", n: "Triagem", d: "Cadastro e classificação de risco do paciente", s: "enfermagem:Triagem" },
    { f: "central-enfermagem.html", n: "Medicação", d: "Central de enfermagem: aplicar a medicação prescrita", s: "enfermagem:Medicação" },
    { f: "prescricao-enfermaria.html", n: "Prescrição (pronto atendimento)", d: "Prescrever medicação para a enfermaria", s: "medica:Prescrição" },
    { f: "prescricao-medica.html", n: "Prescrição (receita)", d: "Prescrição médica do atendimento", s: "medica:Prescrição" },
    { f: "admin-funcionarios.html", n: "Administração", d: "Cadastro de funcionários e setores", admin: true }
  ];
  const LOGIN = "dosesafe-login.html";

  function staff() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SK)); } catch (e) {}
    if (!s) { s = SEED; saveStaff(s); }
    s.forEach(x => { if (!x.senha) x.senha = "1234"; }); // cadastros antigos sem senha
    return s;
  }
  function saveStaff(l) { try { localStorage.setItem(SK, JSON.stringify(l)); } catch (e) {} }

  // Sempre relê o cadastro: se o admin desativar ou alterar setores, vale no próximo carregamento
  function session() {
    let m = null;
    try { m = JSON.parse(sessionStorage.getItem(SS)); } catch (e) {}
    if (!m) return null;
    if (m.mat === ADMIN.mat) return ADMIN;
    const u = staff().find(x => x.mat === m.mat);
    return u && u.ativo ? u : null;
  }
  function login(mat, senha) {
    mat = (mat || "").trim();
    if (mat.toLowerCase() === ADMIN.mat) {
      if (senha !== ADMIN.senha) return { err: "senha" };
      sessionStorage.setItem(SS, JSON.stringify({ mat: ADMIN.mat })); return { ok: 1 };
    }
    const u = staff().find(x => x.mat.toLowerCase() === mat.toLowerCase());
    if (!u) return { err: "mat" };
    if (u.senha !== senha) return { err: "senha" };
    if (!u.ativo) return { err: "inativo" };
    sessionStorage.setItem(SS, JSON.stringify({ mat: u.mat })); return { ok: 1 };
  }
  function logout() { sessionStorage.removeItem(SS); location.href = LOGIN; }
  function can(u, p) { return p.admin ? !!u.admin : (!u.admin && u.setores.indexOf(p.s) >= 0); }
  function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }

  // Uso: DS.guard({setor:"enfermagem:Triagem"}) | DS.guard({admin:true}) | DS.guard({any:true})
  function guard(o) {
    const u = session();
    if (!u) { location.replace(LOGIN); return null; }
    ready(function () {
      const bar = document.createElement("div");
      bar.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:9000;background:#0f172a;color:#fff;font:600 12px/1 -apple-system,Segoe UI,Roboto,sans-serif;padding:10px 14px;border-radius:999px;display:flex;gap:12px;align-items:center;box-shadow:0 4px 12px rgba(0,0,0,.25)";
      bar.innerHTML = '<span></span><a href="inicio.html" style="color:#7dd3fc">Início</a><a href="#" id="dsOut" style="color:#fca5a5">Sair</a>';
      bar.firstChild.textContent = u.nome + " · " + u.cargo;
      document.body.appendChild(bar);
      bar.querySelector("#dsOut").onclick = function (e) { e.preventDefault(); logout(); };
      const ok = o.any || (o.admin ? u.admin : (!u.admin && u.setores.indexOf(o.setor) >= 0));
      if (!ok) {
        const ov = document.createElement("div");
        ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.94);display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,Segoe UI,Roboto,sans-serif";
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px;max-width:400px;text-align:center"><h2 style="font-size:20px;margin-bottom:8px;color:#b91c1c">Acesso negado</h2><p style="font-size:14px;color:#475569;line-height:1.5;margin-bottom:20px">Seu cadastro não tem permissão para acessar esta área' + (o.setor ? " (" + o.setor.split(":")[1] + ")" : "") + '. Fale com o administrador do sistema.</p><a href="inicio.html" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">Voltar ao início</a></div>';
        document.body.appendChild(ov);
      }
    });
    return u;
  }

  window.DS = { staff, saveStaff, session, login, logout, guard, can, PAGES };
})();
