/* ==========================================================
   VOLUNTARIADO Y VISITAS
   · Sección pública: próximas jornadas, inscripción de voluntarios
     y "Ven a compartir con los peluditos" (visita con aporte).
   · Panel (pestaña "🙋 Voluntariado"): la dueña agenda jornadas,
     ve a los inscritos y configura las visitas.
   Las jornadas y visitas se guardan en la configuración del sitio.
   Los inscritos se guardan en la tabla privada "voluntarios"
   (supabase/voluntarios.sql); si aún no existe, la inscripción
   igual llega al WhatsApp del albergue.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  const MESL = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const hoyISO = () => { const t = new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
  const partes = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); if (!m) return null; const f = new Date(+m[1], +m[2] - 1, +m[3]); return { d: +m[3], mes: MES[+m[2] - 1], mesL: MESL[+m[2] - 1], dia: DIA[f.getDay()] }; };
  const larga = (iso) => { const p = partes(iso); return p ? `${p.dia} ${p.d} de ${p.mesL}` : ""; };
  const TIPOS = { voluntariado: "Jornada de voluntariado", adopcion: "Evento de adopción", visita: "Día de visitas" };
  const TAREAS = [["🧽", "Limpiar y ordenar", "Trapear, cambiar mantas y dejar los espacios listos."], ["🛁", "Bañar y secar", "Siempre en parejas y con la guía de la encargada."],
    ["🍲", "Dar de comer", "Servir la comida y el agua de cada grupo de perritos."], ["📸", "Fotos para sus fichas", "Las fotos ayudan a que los adopten más rápido."],
    ["📣", "Difundir", "Compartir las fichas y los eventos en tus redes."]];
  const AYUDAS = TAREAS.map((t) => t[1]);

  /* ---- Configuración con valores de partida (solo si el albergue aún no la ha guardado) ---- */
  const DEF_JORNADAS = [
    { id: "j15", fecha: "2026-11-15", hora: "9:00 a. m.", tipo: "voluntariado", titulo: "Jornada en el albergue", detalle: "Limpieza, baños y fotos de los perritos adultos." },
    { id: "j22", fecha: "2026-11-22", hora: "9:00 a. m.", tipo: "adopcion", titulo: "Evento de adopción + voluntariado", detalle: "Conoce a los perritos en persona o ayuda a organizar el evento. Te confirmamos las tareas por WhatsApp." },
  ];
  const DEF_VISITAS = { activo: true, aporte: "Un aporte voluntario o una bolsa de comida", horario: "Fines de semana, coordinando por WhatsApp" };
  const cfg = () => (window.HT ? window.HT.cfg() : {}) || {};
  const jornadas = () => (Array.isArray(cfg().jornadas) ? cfg().jornadas : DEF_JORNADAS).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const proximas = () => jornadas().filter((j) => String(j.fecha) >= hoyISO());
  const visitas = () => Object.assign({}, DEF_VISITAS, cfg().visitas || {});
  const wa = () => String(cfg().whatsapp || "").replace(/\D/g, "");
  const waLink = (txt) => (wa() ? `https://wa.me/${wa()}?text=${encodeURIComponent(txt)}` : "");

  /* ================= SECCIÓN PÚBLICA ================= */
  let F = { ayuda: [], jornada: "", enviado: null }, V = { enviado: null };

  function ticket(j, grande) {
    const p = partes(j.fecha); if (!p) return "";
    return `<article class="vol-ticket${grande ? " grande" : ""}">
      <div class="vol-fecha" aria-hidden="true"><span class="vol-mes">${p.mes}</span><span class="vol-dia">${p.d}</span><span class="vol-sem">${p.dia}</span></div>
      <div class="vol-info"><span class="vol-tipo t-${esc(j.tipo || "voluntariado")}">${esc(TIPOS[j.tipo] || TIPOS.voluntariado)}</span>
        <h3>${esc(j.titulo || TIPOS[j.tipo] || "Jornada")}</h3>
        <p>${esc(larga(j.fecha))}${j.hora ? ", " + esc(j.hora) : ""}${j.detalle ? `<br>${esc(j.detalle)}` : ""}</p></div></article>`;
  }

  function render() {
    const root = $("#voluntarioRoot"); if (!root || !window.HT) return;
    const prox = proximas(), v = visitas();
    if (F.jornada && !prox.some((j) => j.id === F.jornada)) F.jornada = "";
    root.innerHTML = `
      <div class="vol-agenda">
        ${prox.length ? `<div class="vol-tickets">${prox.slice(0, 3).map((j, i) => ticket(j, i === 0)).join("")}</div>`
          : `<div class="vol-vacio"><p>Pronto anunciamos la siguiente jornada. Anótate y te avisamos por WhatsApp.</p></div>`}
      </div>
      <div class="vol-grid">
        <div class="vol-tareas"><h3>Qué se hace en una jornada</h3>
          <ul>${TAREAS.map(([e, t, d]) => `<li><span class="vol-e" aria-hidden="true">${e}</span><span><strong>${esc(t)}</strong>${esc(d)}</span></li>`).join("")}</ul>
          <p class="vol-nota">Ven con ropa cómoda que se pueda mojar. Los menores de 18 años vienen acompañados de un adulto.</p></div>
        ${F.enviado ? `<div class="vol-ok panel"><h3>🙌 ¡Gracias, ${esc(F.enviado.nombre)}!</h3>
            <p>Para terminar, envía tu inscripción al albergue por WhatsApp. Así te confirman la hora y la dirección.</p>
            ${waLink(F.enviado.msg) ? `<a class="btn btn-primary" href="${esc(waLink(F.enviado.msg))}" target="_blank" rel="noopener">Enviar por WhatsApp</a>` : ""}
            <button class="btn btn-ghost" data-vol="otro">Inscribir a otra persona</button></div>`
        : `<form class="form vol-form" id="volForm" novalidate><h3>Anótate como voluntario</h3>
            <div class="form-row">
              <div class="field"><label for="vo-nombre">Tu nombre <span class="req">*</span></label><input id="vo-nombre" autocomplete="name"><span class="error-msg" id="vo-e-nombre"></span></div>
              <div class="field"><label for="vo-tel">Celular (WhatsApp) <span class="req">*</span></label><input id="vo-tel" type="tel" inputmode="tel" autocomplete="tel"><span class="error-msg" id="vo-e-tel"></span></div>
            </div>
            <div class="field"><span class="label">¿A qué jornada vienes?</span><div class="chips">
              ${prox.slice(0, 4).map((j) => `<button type="button" class="chip" data-vol-j="${esc(j.id)}" aria-pressed="${F.jornada === j.id}">${esc(larga(j.fecha))}</button>`).join("")}
              <button type="button" class="chip" data-vol-j="" aria-pressed="${!F.jornada}">Avísenme de la próxima</button></div></div>
            <div class="field"><span class="label">¿Cómo te gustaría ayudar?</span><div class="chips">${AYUDAS.map((a) => `<button type="button" class="chip" data-vol-a="${esc(a)}" aria-pressed="${F.ayuda.includes(a)}">${esc(a)}</button>`).join("")}</div></div>
            <label class="check"><input type="checkbox" id="vo-ok"> <span>Acepto que el albergue guarde mis datos para coordinar las jornadas. <span class="req">*</span></span></label><span class="error-msg" id="vo-e-ok"></span>
            <button class="btn btn-primary" type="submit">Quiero ser voluntario</button></form>`}
      </div>
      ${v.activo ? `<div class="vol-visita">
        <div class="vol-visita-txt"><h3>¿No puedes adoptar? Ven a compartir con ellos</h3>
          <p>Pasa una mañana jugando y dando cariño a los peluditos. A cambio, deja un aporte para su comida y cuidado.</p>
          <dl><div><dt>Aporte sugerido</dt><dd>${esc(v.aporte)}</dd></div><div><dt>Horario</dt><dd>${esc(v.horario)}</dd></div></dl></div>
        ${V.enviado ? `<div class="vol-visita-form"><p><strong>Listo.</strong> Envía tu solicitud y el albergue te confirma el día.</p>
            ${waLink(V.enviado) ? `<a class="btn btn-primary" href="${esc(waLink(V.enviado))}" target="_blank" rel="noopener">Enviar por WhatsApp</a>` : ""}<button class="btn btn-ghost btn-sm" data-vol="visita-otra">Pedir otra visita</button></div>`
        : `<form class="vol-visita-form" id="visForm" novalidate>
            <div class="field"><label for="vi-nombre">Tu nombre <span class="req">*</span></label><input id="vi-nombre" autocomplete="name"><span class="error-msg" id="vi-e-nombre"></span></div>
            <div class="form-row"><div class="field"><label for="vi-fecha">¿Qué día te gustaría?</label><input id="vi-fecha" type="date" min="${hoyISO()}"></div>
              <div class="field"><label for="vi-n">¿Cuántas personas?</label><input id="vi-n" type="number" min="1" max="10" value="1" inputmode="numeric"></div></div>
            <button class="btn btn-primary" type="submit">Pedir mi visita</button></form>`}
      </div>` : ""}`;
  }

  async function inscribir(e) {
    e.preventDefault();
    const n = ($("#vo-nombre").value || "").trim(), tel = ($("#vo-tel").value || "").replace(/[\s()+-]/g, ""), ok = $("#vo-ok").checked;
    const errs = { nombre: n.length >= 2 ? "" : "Escribe tu nombre.", tel: /^\d{9,15}$/.test(tel) ? "" : "Escribe un celular válido (9 dígitos).", ok: ok ? "" : "Necesitamos tu permiso para coordinar contigo." };
    Object.entries(errs).forEach(([k, m]) => { const el = $("#vo-e-" + k); if (el) el.textContent = m; });
    const primero = Object.keys(errs).find((k) => errs[k]); if (primero) { const el = $({ nombre: "#vo-nombre", tel: "#vo-tel", ok: "#vo-ok" }[primero]); el && el.focus(); return; }
    const j = jornadas().find((x) => x.id === F.jornada);
    const datos = { nombre: n, telefono: tel, jornada: j ? `${larga(j.fecha)} · ${j.titulo || ""}` : "Avisar de la próxima", jornadaId: F.jornada || "", ayuda: F.ayuda.slice(), fecha: hoyISO() };
    const store = window.HT.store();
    if (store && store.registrarVoluntario) { try { await store.registrarVoluntario(datos); } catch (err) { console.warn("No se guardó el voluntario en la base:", err); } }
    const msg = `¡Hola! Soy ${n} y quiero ser voluntario/a en el albergue 🐾\n• Jornada: ${datos.jornada}\n• Me gustaría ayudar en: ${datos.ayuda.join(", ") || "lo que se necesite"}\n• Mi celular: ${tel}`;
    F = { ayuda: [], jornada: "", enviado: { nombre: n, msg } }; render();
  }
  function pedirVisita(e) {
    e.preventDefault();
    const n = ($("#vi-nombre").value || "").trim(); const err = $("#vi-e-nombre");
    if (n.length < 2) { err.textContent = "Escribe tu nombre."; $("#vi-nombre").focus(); return; }
    const f = $("#vi-fecha").value, k = Math.max(1, Math.min(10, +$("#vi-n").value || 1));
    V.enviado = `¡Hola! Soy ${n} y me gustaría visitar a los peluditos 🐶\n• Día: ${f ? larga(f) : "el que me indiquen"}\n• Personas: ${k}\n• Llevo mi aporte para su comida y cuidado.`;
    render();
  }

  /* ================= PANEL: pestaña "🙋 Voluntariado" ================= */
  const A = { inscritos: null, cargando: false, error: "", confirmar: null, nueva: { fecha: "", hora: "9:00 a. m.", tipo: "voluntariado", titulo: "", detalle: "" } };
  async function cargarInscritos() {
    const store = window.HT.store(); if (!store || !store.listarVoluntarios || A.cargando) return;
    A.cargando = true;
    try { A.inscritos = await store.listarVoluntarios(); A.error = ""; }
    catch (e) { A.inscritos = []; A.error = /does not exist|relation|schema cache/i.test(e.message || "") ? "tabla" : (e.message || "error"); }
    A.cargando = false; window.HT.renderAdmin();
  }
  function vistaAdmin() {
    const store = window.HT.store(), todas = jornadas(), v = visitas(), N = A.nueva;
    if (A.inscritos === null && store && store.listarVoluntarios && !A.cargando) setTimeout(cargarInscritos, 0);
    const ins = A.inscritos || [];
    const lista = ins.map((r) => Object.assign({ id: r.id, creado: r.creado }, r.datos || {}));
    const textoLista = lista.map((x, i) => `${i + 1}. ${x.nombre} – ${x.telefono} – ${x.jornada}`).join("\n");
    return `<div class="vol-admin">
      <section class="panel"><div class="reg-intro"><h3>📅 Próximas jornadas</h3><p>Lo que pongas aquí aparece en la sección <strong>Voluntariado</strong> de la página. Las fechas pasadas se ocultan solas.</p></div>
        <div class="admin-list">${todas.map((j) => `<div class="admin-item vol-adm-j"><span class="vol-mini">${(partes(j.fecha) || {}).d || "?"}<small>${(partes(j.fecha) || {}).mes || ""}</small></span>
            <div class="info"><strong>${esc(j.titulo || TIPOS[j.tipo])}</strong><small>${esc(TIPOS[j.tipo] || "")} · ${esc(larga(j.fecha))}${j.hora ? ", " + esc(j.hora) : ""}${String(j.fecha) < hoyISO() ? " · ya pasó" : ""}</small></div>
            <div class="actions">${A.confirmar === j.id ? `<span class="confirm-inline">¿Quitar esta fecha? <button class="btn btn-danger btn-sm" data-vol="j-del-si" data-id="${esc(j.id)}">Sí, quitar</button><button class="btn btn-ghost btn-sm" data-vol="j-del-no">Cancelar</button></span>`
              : `<button class="btn btn-danger btn-sm" data-vol="j-del" data-id="${esc(j.id)}">Quitar</button>`}</div></div>`).join("") || `<p class="reg-ayuda">No hay jornadas. Agrega la primera aquí abajo.</p>`}</div>
        <form id="volNueva" class="vol-nueva" novalidate><h4>Agregar una fecha</h4>
          <div class="form-row"><div class="field"><label>Fecha<input type="date" id="vn-fecha" value="${esc(N.fecha)}" required></label></div><div class="field"><label>Hora<input id="vn-hora" value="${esc(N.hora)}" placeholder="Ej.: 9:00 a. m."></label></div></div>
          <div class="field"><span class="label">¿Qué es?</span><div class="chips">${Object.entries(TIPOS).map(([k, l]) => `<button type="button" class="chip" data-vn-tipo="${k}" aria-pressed="${N.tipo === k}">${l}</button>`).join("")}</div></div>
          <div class="field"><label>Título (opcional)<input id="vn-titulo" value="${esc(N.titulo)}" placeholder="Ej.: Jornada de baños"></label></div>
          <div class="field"><label>Detalle (opcional)<input id="vn-detalle" value="${esc(N.detalle)}" placeholder="Ej.: Traer ropa que se pueda mojar"></label></div>
          <button class="btn btn-primary" type="submit">Agregar fecha</button></form></section>

      <section class="panel"><div class="reg-intro"><h3>🙋 Voluntarios inscritos ${lista.length ? `(${lista.length})` : ""}</h3><p>Personas que se anotaron desde la página. Toca su número para escribirles por WhatsApp.</p></div>
        ${A.cargando ? `<p class="reg-ayuda">Cargando…</p>`
          : A.error === "tabla" ? `<div class="note"><span>Las inscripciones llegan a su WhatsApp. Para verlas también aquí, el equipo debe activar la lista una sola vez (archivo <code>supabase/voluntarios.sql</code>).</span></div>`
          : !store || !store.listarVoluntarios ? `<div class="note"><span>En este modo las inscripciones llegan solo por WhatsApp.</span></div>`
          : lista.length ? `<div class="admin-list">${lista.map((x) => `<div class="admin-item"><span class="vol-mini">🙋</span><div class="info"><strong>${esc(x.nombre)}</strong>
                <small><a href="https://wa.me/${esc(String(x.telefono).length === 9 ? "51" + x.telefono : x.telefono)}" target="_blank" rel="noopener">${esc(x.telefono)}</a> · ${esc(x.jornada)}${(x.ayuda || []).length ? " · " + esc(x.ayuda.join(", ")) : ""}</small></div>
                <div class="actions">${A.confirmar === x.id ? `<span class="confirm-inline">¿Borrar? <button class="btn btn-danger btn-sm" data-vol="v-del-si" data-id="${esc(x.id)}">Sí</button><button class="btn btn-ghost btn-sm" data-vol="j-del-no">No</button></span>` : `<button class="btn btn-ghost btn-sm" data-vol="v-del" data-id="${esc(x.id)}">Borrar</button>`}</div></div>`).join("")}</div>
              <button class="btn btn-soft" data-vol="copiar" data-txt="${esc(textoLista)}">Copiar la lista para el grupo de WhatsApp</button>`
          : `<p class="reg-ayuda">Todavía no hay inscritos desde la página.</p>`}</section>

      <form class="panel" id="visConfig" novalidate><div class="reg-intro"><h3>🐶 Visitas con aporte</h3><p>Para las personas que quieren venir a compartir con los perritos dejando una donación.</p></div>
        <label class="check"><input type="checkbox" id="vc-activo" ${v.activo ? "checked" : ""}> <span>Mostrar esta opción en la página</span></label>
        <div class="field"><label>Aporte sugerido<input id="vc-aporte" value="${esc(v.aporte)}" placeholder="Ej.: S/ 10 por persona o una bolsa de comida"></label></div>
        <div class="field"><label>Horario de visitas<input id="vc-horario" value="${esc(v.horario)}" placeholder="Ej.: Sábados de 10 a. m. a 12 m."></label></div>
        <button class="btn btn-primary" type="submit">Guardar</button></form>
    </div>`;
  }
  async function guardar(cambios, ok) { const c = Object.assign({}, window.HT.cfg(), cambios); await window.HT.ejecutar(() => window.HT.guardarConfig(c), ok); render(); }

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-vol-j]"); if (t) { F.jornada = t.dataset.volJ; keep(render); return; }
    const a = e.target.closest("[data-vol-a]"); if (a) { const x = a.dataset.volA; F.ayuda = F.ayuda.includes(x) ? F.ayuda.filter((y) => y !== x) : F.ayuda.concat(x); keep(render); return; }
    const tp = e.target.closest("[data-vn-tipo]"); if (tp) { leerNueva(); A.nueva.tipo = tp.dataset.vnTipo; window.HT.renderAdmin(); return; }
    const b = e.target.closest("[data-vol]"); if (!b) return;
    const k = b.dataset.vol, id = b.dataset.id;
    if (k === "otro") { F.enviado = null; render(); return; }
    if (k === "visita-otra") { V.enviado = null; render(); return; }
    if (k === "j-del" || k === "v-del") { A.confirmar = id; window.HT.renderAdmin(); return; }
    if (k === "j-del-no") { A.confirmar = null; window.HT.renderAdmin(); return; }
    if (k === "j-del-si") { A.confirmar = null; await guardar({ jornadas: jornadas().filter((j) => j.id !== id) }, "Fecha quitada."); return; }
    if (k === "v-del-si") { A.confirmar = null; await window.HT.ejecutar(() => window.HT.store().eliminarVoluntario(id), "Voluntario borrado."); A.inscritos = (A.inscritos || []).filter((r) => String(r.id) !== String(id)); window.HT.renderAdmin(); return; }
    if (k === "copiar") { window.HT.copiar(b.dataset.txt); }
  });
  // Mantiene lo escrito en el formulario público al repintar
  function keep(fn) { const g = (id) => ($("#" + id) ? $("#" + id).value : null); const n = g("vo-nombre"), t = g("vo-tel"), ok = $("#vo-ok") && $("#vo-ok").checked; fn(); if (n != null && $("#vo-nombre")) { $("#vo-nombre").value = n; $("#vo-tel").value = t; $("#vo-ok").checked = ok; } }
  function leerNueva() { const g = (id) => ($("#" + id) ? $("#" + id).value : ""); Object.assign(A.nueva, { fecha: g("vn-fecha"), hora: g("vn-hora"), titulo: g("vn-titulo"), detalle: g("vn-detalle") }); }
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "volForm") return inscribir(e);
    if (e.target.id === "visForm") return pedirVisita(e);
    if (e.target.id === "volNueva") {
      e.preventDefault(); leerNueva(); const N = A.nueva;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(N.fecha)) { window.HT.toast("Elige la fecha.", "error"); return; }
      const j = { id: Date.now().toString(36), fecha: N.fecha, hora: N.hora.trim(), tipo: N.tipo, titulo: N.titulo.trim() || TIPOS[N.tipo], detalle: N.detalle.trim() };
      A.nueva = { fecha: "", hora: N.hora, tipo: N.tipo, titulo: "", detalle: "" };
      await guardar({ jornadas: jornadas().concat(j) }, "Fecha agregada. Ya aparece en la página.");
    }
    if (e.target.id === "visConfig") {
      e.preventDefault();
      await guardar({ visitas: { activo: $("#vc-activo").checked, aporte: $("#vc-aporte").value.trim() || DEF_VISITAS.aporte, horario: $("#vc-horario").value.trim() || DEF_VISITAS.horario } }, "Visitas actualizadas.");
    }
  });
  document.addEventListener("ht:datos", render);
  window.HT_VOL = { vistaAdmin, render };
})();
