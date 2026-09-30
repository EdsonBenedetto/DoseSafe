/* DoseSafe - base de medicamentos e verificação de segurança da prescrição (projeto acadêmico).
   Cadastro feito pelo administrador em admin-funcionarios.html, guardado no navegador.
   Futuramente: trocar list()/save() por chamadas a um banco de dados real. */
(function () {
  const MK = "ds_meds";
  const VIAS = ["EV", "IM", "VO", "SC", "SL", "INAL", "TOP"];
  const VIA_NOME = { EV: "Endovenosa (EV)", IM: "Intramuscular (IM)", VO: "Via Oral (VO)", SC: "Subcutânea (SC)", SL: "Sublingual (SL)", INAL: "Inalatória", TOP: "Tópica" };
 
  function list() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(MK)); } catch (e) {}
    return m || [];
  }
  function save(l) { try { localStorage.setItem(MK, JSON.stringify(l)); } catch (e) {} }
  function find(nome) {
    const n = (nome || "").trim().toLowerCase();
    return list().find(m => m.nome.toLowerCase() === n);
  }
  function buscar(q) {
    q = (q || "").trim().toLowerCase();
    return list().filter(m => m.ativo !== false && m.nome.toLowerCase().includes(q));
  }
 
  // Confere uma prescrição (medicamento + via + dose + paciente) contra a base cadastrada.
  // Devolve uma lista de alertas: { nivel: "info" | "atencao" | "bloqueio", msg }
  function avaliar({ medicamento, via, dose, peso, alergias }) {
    const alertas = [];
    const m = find(medicamento);
    if (!m) {
      alertas.push({ nivel: "info", msg: "Medicamento não cadastrado na base de segurança — confira manualmente a indicação, a via e a dose." });
      return alertas;
    }
 
    // Via de administração
    const v = (m.vias || []).find(x => x.via === via);
    if (v && v.nivel !== "ok") {
      alertas.push({ nivel: v.nivel, msg: `Via ${VIA_NOME[via] || via}: ${v.obs || (v.nivel === "bloqueio" ? "aplicação não recomendada por essa via." : "requer atenção redobrada por essa via.")}` });
    }
 
    // Dose máxima por aplicação
    if (m.doseMax && dose && Number(dose) > Number(m.doseMax)) {
      alertas.push({ nivel: "atencao", msg: `Dose informada (${dose}${m.doseUn || ""}) acima da dose máxima por aplicação cadastrada (${m.doseMax}${m.doseUn || ""}).` });
    }
 
    // Dose por peso (mg/kg)
    if (m.doseKg && peso && dose) {
      const max = Number(m.doseKg) * Number(peso);
      if (Number(dose) > max) {
        alertas.push({ nivel: "atencao", msg: `Dose acima do limite por peso do paciente: ${m.doseKg}${m.doseUn || "mg"}/kg × ${peso}kg = ${max.toFixed(1)}${m.doseUn || "mg"} no máximo.` });
      }
    }
 
    // Alergia do paciente (nome do medicamento, classe ou termos relacionados cadastrados)
    if (alergias && alergias.length) {
      const rel = [m.nome.toLowerCase(), (m.classe || "").toLowerCase(), ...(m.alergias || []).map(x => x.toLowerCase())].filter(Boolean);
      const bate = alergias.some(a => {
        const al = a.trim().toLowerCase();
        return rel.some(r => r === al || r.includes(al) || al.includes(r));
      });
      if (bate) alertas.push({ nivel: "bloqueio", msg: `Paciente possui alergia registrada relacionada a ${m.nome}. Confirme com o médico responsável antes de prosseguir.` });
    }
 
    if (m.contraindicacoes) alertas.push({ nivel: "info", msg: m.contraindicacoes });
    return alertas;
  }
 
  function piorNivel(alertas) {
    if (alertas.some(a => a.nivel === "bloqueio")) return "bloqueio";
    if (alertas.some(a => a.nivel === "atencao")) return "atencao";
    if (alertas.length) return "info";
    return null;
  }
 
  window.DSMeds = { VIAS, VIA_NOME, list, save, find, buscar, avaliar, piorNivel };
})();