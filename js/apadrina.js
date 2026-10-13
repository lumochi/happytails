/* ==========================================================
   APADRINA — para quien no puede adoptar pero quiere hacerse
   responsable de una parte del cuidado de un peludito.
   No se procesan pagos en la página: se genera un mensaje de
   WhatsApp para coordinar con el albergue. Los montos sugeridos
   se editan en Administrar → Albergue y contacto → Apadrinamiento.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const MODALIDADES = [
    { id: "alimento", e: "🍖", t: "Padrino de alimento", d: "Cubres su comida para que esté bien alimentado mientras encuentra hogar.", monto: (c) => c.alimento },
    { id: "salud", e: "💉", t: "Padrino de salud", d: "Apoyas sus vacunas, desparasitación y controles veterinarios.", monto: (c) => c.salud },
    { id: "tiempo", e: "🦮", t: "Padrino de tiempo", d: "Lo visitas, lo paseas y le das cariño en el albergue (coordinando horarios).", monto: () => "Tu tiempo y cariño" },
    { id: "libre", e: "🎁", t: "Aporte libre o en especie", d: "Donas lo que puedas: dinero, comida, mantas, juguetes o artículos de limpieza.", monto: (c) => c.libre },
  ];
  const PASOS = [
    ["Elige", "a tu ahijado y cómo quieres ayudarlo."],
    ["Escríbenos", "se genera un mensaje de WhatsApp para el albergue."],
    ["Coordinamos", "el albergue te confirma cómo y cuándo aportar."],
    ["Acompáñalo", "recibe novedades y visítalo cuando quieras."],
  ];

  let sel = { perrito: "", modalidad: "alimento", frecuencia: "Mensual" };

  function disponibles() { return window.HT.datos().perritos.filter((m) => m.estado !== "adoptado").sort((a, b) => a.nombre.localeCompare(b.nombre, "es")); }

  function render() {
    const root = $("#apadrinaRoot"); if (!root || !window.HT) return;
    const c = (window.HT.cfg().apadrinaje) || {};
    const lista = disponibles();
    if (sel.perrito && !lista.some((m) => m.id === sel.perrito)) sel.perrito = "";
    const elegido = lista.find((m) => m.id === sel.perrito);
    root.innerHTML = `
      <ol class="ap-steps">${PASOS.map(([a, b], i) => `<li><span>${i + 1}</span><p><strong>${a}</strong> ${b}</p></li>`).join("")}</ol>
      <div class="ap-grid">
        <div class="ap-mods" role="radiogroup" aria-label="Modalidad de apadrinamiento">
          ${MODALIDADES.map((m) => { const monto = m.monto(c); return `<button class="ap-mod" role="radio" aria-checked="${sel.modalidad === m.id}" data-mod="${m.id}">
            <span class="ap-e" aria-hidden="true">${m.e}</span><span class="ap-txt"><strong>${esc(m.t)}</strong><small>${esc(m.d)}</small>
            <em>${monto ? esc(monto) : "Monto a coordinar con el albergue"}</em></span></button>`; }).join("")}
        </div>
        <form class="form ap-form" id="apForm" novalidate>
          <div class="ap-pick">${elegido ? `<img src="${esc(window.HT.foto(elegido))}" alt=""><div><small>Tu ahijado</small><strong>${esc(elegido.nombre)}</strong>${elegido.apadrinado ? `<small>💛 Ya tiene padrino: ¡puede tener más de uno!</small>` : ""}</div>` : `<div class="ap-ph">🐾</div><div><small>Tu ahijado</small><strong>Elige a un peludito</strong></div>`}</div>
          <div class="field"><label for="ap-perrito">Peludito que quieres apadrinar <span class="req">*</span></label>
            <select id="ap-perrito"><option value="">Elige…</option>${lista.map((m) => `<option value="${esc(m.id)}" ${m.id === sel.perrito ? "selected" : ""}>${esc(m.nombre)}${m.apadrinado ? " 💛" : ""}</option>`).join("")}</select><span class="error-msg" id="ap-e-perrito"></span></div>
          <div class="field"><span class="label">Frecuencia</span><div class="chips">${["Mensual", "Una sola vez"].map((f) => `<button type="button" class="chip" data-frec="${f}" aria-pressed="${sel.frecuencia === f}">${f}</button>`).join("")}</div></div>
          <div class="form-row">
            <div class="field"><label for="ap-nombre">Tu nombre <span class="req">*</span></label><input id="ap-nombre" autocomplete="name"><span class="error-msg" id="ap-e-nombre"></span></div>
            <div class="field"><label for="ap-tel">Teléfono <span class="req">*</span></label><input id="ap-tel" type="tel" inputmode="tel" autocomplete="tel"><span class="error-msg" id="ap-e-tel"></span></div>
          </div>
          <div class="field"><label for="ap-msg">¿Algo que quieras contarnos? (opcional)</label><textarea id="ap-msg" placeholder="Ej.: puedo visitarlo los sábados, o quiero donar una manta"></textarea></div>
          <label class="check"><input type="checkbox" id="ap-ok"> <span>Entiendo que apadrinar es un compromiso: cumpliré el apoyo que acuerde con el albergue. <span class="req">*</span></span></label><span class="error-msg" id="ap-e-ok"></span>
          <button class="btn btn-primary" type="submit">🤝 Quiero apadrinar</button>
          <div id="apResult" hidden></div>
        </form>
      </div>
      <p class="quiz-note" style="margin-top:14px">La página no procesa pagos: todo aporte se coordina directamente con el albergue por WhatsApp.</p>`;
  }

  function enviar(e) {
    e.preventDefault();
    const nombre = $("#ap-nombre").value.trim(), tel = $("#ap-tel").value.replace(/[\s()+-]/g, ""), ok = $("#ap-ok").checked;
    const errs = { perrito: sel.perrito ? "" : "Elige al peludito que quieres apadrinar.", nombre: nombre.length >= 2 ? "" : "Escribe tu nombre.", tel: /^\d{9,15}$/.test(tel) ? "" : "Escribe un teléfono válido (9 a 15 dígitos).", ok: ok ? "" : "Debes aceptar el compromiso." };
    Object.entries(errs).forEach(([k, v]) => { $("#ap-e-" + k).textContent = v; });
    const primero = Object.keys(errs).find((k) => errs[k]);
    if (primero) { ({ perrito: $("#ap-perrito"), nombre: $("#ap-nombre"), tel: $("#ap-tel"), ok: $("#ap-ok") })[primero].focus(); return; }
    const c = window.HT.cfg(), m = window.HT.datos().perritos.find((x) => x.id === sel.perrito), mod = MODALIDADES.find((x) => x.id === sel.modalidad);
    const monto = mod.monto(c.apadrinaje || {});
    const msg = [`¡Hola${c.nombre ? ", " + c.nombre : ""}! Quiero apadrinar a ${m.nombre} 🤝`, "",
      `• Modalidad: ${mod.t}${monto && sel.modalidad !== "tiempo" ? " (" + monto + ")" : ""}`, `• Frecuencia: ${sel.frecuencia}`, `• Nombre: ${nombre}`, `• Teléfono: ${tel}`,
      ...($("#ap-msg").value.trim() ? ["", $("#ap-msg").value.trim()] : []), "", "Entiendo que es un compromiso y quisiera coordinar cómo empezar."].join("\n");
    const wa = (c.whatsapp || "").replace(/\D/g, "");
    const r = $("#apResult"); r.hidden = false; r.className = "wa-result";
    r.innerHTML = `<h4>✔ Tu mensaje está listo</h4><p>${wa ? "Ábrelo en WhatsApp y envíalo para coordinar con el albergue. Solo se envía si tú lo confirmas." : "El WhatsApp del albergue aún no está configurado: copia el mensaje y envíalo por sus redes."}</p>
      <pre>${esc(msg)}</pre><div class="wa-actions">${wa ? `<a class="btn btn-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Abrir en WhatsApp</a>` : ""}<button type="button" class="btn btn-ghost" id="apCopy">Copiar mensaje</button></div>`;
    $("#apCopy").addEventListener("click", () => window.HT.copiar(msg));
    r.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function guardarCampos() { const g = (id) => ($("#" + id) ? $("#" + id).value : ""); return { n: g("ap-nombre"), t: g("ap-tel"), m: g("ap-msg"), ok: $("#ap-ok") && $("#ap-ok").checked }; }
  function restaurarCampos(v) { if (!v) return; $("#ap-nombre").value = v.n; $("#ap-tel").value = v.t; $("#ap-msg").value = v.m; $("#ap-ok").checked = v.ok; }

  document.addEventListener("click", (e) => {
    const ap = e.target.closest("[data-apadrinar]");
    if (ap) { e.preventDefault(); sel.perrito = ap.dataset.apadrinar; window.HT.cerrarFicha(); const v = guardarCampos(); render(); restaurarCampos(v); $("#apadrina").scrollIntoView({ behavior: "smooth" }); return; }
    const root = $("#apadrinaRoot"); if (!root || !root.contains(e.target)) return;
    const mod = e.target.closest("[data-mod]"), fr = e.target.closest("[data-frec]");
    if (mod || fr) { const v = guardarCampos(); if (mod) sel.modalidad = mod.dataset.mod; if (fr) sel.frecuencia = fr.dataset.frec; render(); restaurarCampos(v); }
  });
  document.addEventListener("change", (e) => { if (e.target.id === "ap-perrito") { const v = guardarCampos(); sel.perrito = e.target.value; render(); restaurarCampos(v); } });
  document.addEventListener("submit", (e) => { if (e.target.id === "apForm") enviar(e); });
  document.addEventListener("ht:datos", () => { const v = guardarCampos(); render(); restaurarCampos(v); });
  render();
})();
