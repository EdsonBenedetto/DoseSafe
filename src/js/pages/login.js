const form = document.getElementById("loginForm");
  const matriculaInput = document.getElementById("matricula");
  const senhaInput = document.getElementById("senha");
  const errMatricula = document.getElementById("errMatricula");
  const errSenha = document.getElementById("errSenha");

  function clearErrors() {
    matriculaInput.classList.remove("invalid");
    senhaInput.classList.remove("invalid");
    errMatricula.classList.remove("show");
    errSenha.classList.remove("show");
  }
  function tryLogin(m, s) {
    clearErrors();
    const r = DS.login(m, s);
    if (r.ok) { location.href = "inicio.html"; return; }
    if (r.err === "senha") {
      senhaInput.classList.add("invalid"); errSenha.classList.add("show"); senhaInput.focus();
    } else {
      errMatricula.textContent = r.err === "inativo" ? "Funcionário desativado. Fale com o administrador." : "Matrícula não encontrada.";
      matriculaInput.classList.add("invalid"); errMatricula.classList.add("show"); matriculaInput.focus();
    }
  }
  form.addEventListener("submit", e => { e.preventDefault(); tryLogin(matriculaInput.value, senhaInput.value); });
  document.getElementById("btnDemo").addEventListener("click", () => tryLogin("admin", "admin"));
  document.getElementById("btnBadge").addEventListener("click", () => {
    alert("Leitor de crachá (NFC) não está disponível neste dispositivo.\nDigite matrícula e senha.");
  });
