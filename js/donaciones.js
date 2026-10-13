/* ==========================================================
   DONACIONES — formas de donar, registro de donantes,
   transparencia del uso del dinero y envío de actualizaciones.
   ----------------------------------------------------------
   · Datos de pago, necesidades y movimientos: config.donaciones
     (públicos, se editan en Administrar → Donaciones).
   · Donantes (nombre y contacto): tabla privada "donantes" en
     Supabase; solo la administradora los puede leer.
   · La página NO procesa pagos ni envía mensajes sola: arma el
     mensaje y la administradora lo envía por WhatsApp o correo.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const soles = (n) => "S/ " + (Math.round((+n || 0) * 100) / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const fFecha = (iso) => { if (!iso) return ""; const [y, m, d] = String(iso).slice(0, 10).split("-"); return d && m && y ? `${d}/${m}/${y}` : iso; };
  const D = () => (window.HT.cfg().donaciones) || {};
  const PEND = '<span class="pending">Pendiente de configurar</span>';

  /* ---------------- Sección pública ---------------- */
  let form = { tipo: "linea", canal: "whatsapp", medio: "yape" };

  const linkSeguro = (u) => /^https:\/\/[^\s"'<>]+$/i.test(String(u || "").trim()) ? String(u).trim() : "";
  const MEDIOS = [
    { id: "yape", e: "💜", t: "Yape", listo: (d) => !!d.yape, filas: (d) => [["Número", d.yape], ["A nombre de", d.titular]] },
    { id: "plin", e: "💙", t: "Plin", listo: (d) => !!d.plin, filas: (d) => [["Número", d.plin], ["A nombre de", d.titular]] },
    { id: "transferencia", e: "🏦", t: "Transferencia bancaria", listo: (d) => !!(d.cuenta || d.cci), filas: (d) => [["Banco", d.banco], ["Cuenta", d.cuenta], ["CCI", d.cci], ["Titular", d.titular]] },
    { id: "tarjeta", e: "💳", t: "Tarjeta de débito o crédito", listo: (d) => !!linkSeguro(d.linkTarjeta), filas: () => [] },
  ];
  function medioHTML(m, d) { return `<div class="don-medio${m.listo(d) ? "" : " off"}"><strong>${m.e} ${m.t}</strong>${medioCuerpo(m, d)}</div>`; }
  function medioCuerpo(m, d) {
    const listo = m.listo(d);
    let cuerpo;
    if (!listo) cuerpo = `<p class="don-k">${PEND}</p>`;
    else if (m.id === "tarjeta") cuerpo =`<a class="btn btn-soft btn-sm" href="${esc(linkSeguro(d.linkTarjeta))}" target="_blank" rel="noopener">Pagar con tarjeta ↗</a><small class="don-k">Se abre la pasarela de pago segura del albergue. Esta página no ve ni guarda los datos de tu tarjeta.</small>`;
    else cuerpo = `<dl class="don-pay">${m.filas(d).filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd><span>${esc(v)}</span>${k === "Titular" || k === "A nombre de" || k === "Banco" ? "" : `<button class="linkish" data-copy="${esc(v)}">Copiar</button>`}</dd></div>`).join("")}</dl>`;
    return cuerpo;
  }

  function totales(movs) {
    const ing = movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + (+m.monto || 0), 0);
    const uso = movs.filter((m) => m.tipo === "uso").reduce((a, m) => a + (+m.monto || 0), 0);
    return { ing, uso, saldo: ing - uso };
  }

  function render() {
    const root = $("#donaRoot"); if (!root || !window.HT) return;
    const d = D(), c = window.HT.cfg();
    const necesidades = (d.necesidades || []).filter(Boolean);
    const movs = (d.movimientos || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const t = totales(movs), usos = movs.filter((m) => m.tipo === "uso");
    root.innerHTML = `
      <div class="don-ways">
        <article class="don-way"><span class="don-e">🥫</span><h3>Lleva comida o insumos</h3>
          <p>Alimento, mantas, artículos de limpieza o medicinas indicadas por el veterinario.</p>
          <p class="don-k"><strong>Dónde:</strong> ${c.ubicacion ? esc(c.ubicacion) : PEND}</p>
          <p class="don-k"><strong>Horario:</strong> ${c.horario ? esc(c.horario) : PEND}</p></article>
        <article class="don-way"><span class="don-e">🤝</span><h3>Dona dinero en persona</h3>
          <p>Entrégalo directamente en el albergue. Te registramos para que sepas en qué se usó.</p>
          <p class="don-k">Coordina tu visita por WhatsApp${c.whatsapp ? `: <strong>+${esc(c.whatsapp)}</strong>` : ""}.</p></article>
        <article class="don-way"><span class="don-e">📱</span><h3>Dona en línea</h3>
          <p>Elige el medio que prefieras:</p>
          <div class="don-medios">${MEDIOS.map((m) => medioHTML(m, d)).join("")}</div></article>
      </div>
      ${necesidades.length ? `<div class="don-needs"><h3>Lo que más necesitamos</h3><div class="tags">${necesidades.map((n) => { const urg = /^!|urgente/i.test(n); return `<span class="tag ${urg ? "warn" : "sage"}">${urg ? "⚠️ " : ""}${esc(n.replace(/^!\s*/, ""))}</span>`; }).join("")}</div></div>` : ""}
      <div class="don-grid">
        <form class="form" id="donForm" novalidate>
          <h3 style="font-size:24px">Registra tu donación</h3>
          <p class="hint" style="color:var(--muted)">Déjanos tus datos y te iremos contando cómo se usa tu aporte, por el medio que prefieras.</p>
          <div class="field"><span class="label">¿Cómo vas a donar?</span><div class="chips">${[["linea", "En línea"], ["persona", "Dinero en persona"], ["especie", "Comida o insumos"]].map(([v, l]) => `<button type="button" class="chip" data-dtipo="${v}" aria-pressed="${form.tipo === v}">${l}</button>`).join("")}</div></div>
          ${form.tipo === "linea" ? `<div class="field"><span class="label">¿Por qué medio?</span><div class="chips">${MEDIOS.map((m) => `<button type="button" class="chip" data-dmedio="${m.id}" aria-pressed="${form.medio === m.id}">${m.e} ${m.id === "tarjeta" ? "Tarjeta" : m.id === "transferencia" ? "Transferencia" : m.t}</button>`).join("")}</div></div>` : ""}
          <div class="form-row">
            <div class="field"><label for="dn-nombre">Tu nombre <span class="req">*</span></label><input id="dn-nombre" autocomplete="name"><span class="error-msg" id="dn-e-nombre"></span></div>
            <div class="field"><label for="dn-monto">${form.tipo === "especie" ? "¿Qué vas a llevar?" : "Monto (S/)"} <span class="req">*</span></label><input id="dn-monto" ${form.tipo === "especie" ? 'placeholder="Ej.: 2 sacos de comida"' : 'inputmode="decimal" placeholder="Ej.: 50"'}><span class="error-msg" id="dn-e-monto"></span></div>
          </div>
          <div class="field"><span class="label">¿Por dónde quieres recibir las actualizaciones?</span><div class="chips">${[["whatsapp", "WhatsApp"], ["correo", "Correo"], ["ambos", "Ambos"]].map(([v, l]) => `<button type="button" class="chip" data-dcanal="${v}" aria-pressed="${form.canal === v}">${l}</button>`).join("")}</div></div>
          <div class="form-row">
            ${form.canal !== "correo" ? `<div class="field"><label for="dn-tel">WhatsApp <span class="req">*</span></label><input id="dn-tel" type="tel" inputmode="tel" autocomplete="tel"><span class="error-msg" id="dn-e-tel"></span></div>` : ""}
            ${form.canal !== "whatsapp" ? `<div class="field"><label for="dn-correo">Correo <span class="req">*</span></label><input id="dn-correo" type="email" autocomplete="email"><span class="error-msg" id="dn-e-correo"></span></div>` : ""}
          </div>
          <div class="field"><label for="dn-destino">¿Para qué te gustaría que se use? (opcional)</label>
            <select id="dn-destino"><option value="">Donde más se necesite</option><option>Alimento</option><option>Salud y vacunas</option><option>Esterilizaciones</option><option>Mejoras del albergue</option></select></div>
          <label class="check"><input type="checkbox" id="dn-ok"> <span>Acepto que el albergue guarde mis datos y me contacte para enviarme actualizaciones sobre el uso de mi donación. <span class="req">*</span></span></label><span class="error-msg" id="dn-e-ok"></span>
          <button class="btn btn-primary" type="submit">💛 Registrar mi donación</button>
          <div id="donResult" hidden></div>
        </form>
        <div class="don-transp">
          <h3 style="font-size:24px">Así usamos tus donaciones</h3>
          ${movs.length ? `<div class="don-totals">
              <div><span>Recibido</span><strong>${soles(t.ing)}</strong></div>
              <div><span>Utilizado</span><strong>${soles(t.uso)}</strong></div>
              <div><span>Saldo</span><strong>${soles(t.saldo)}</strong></div></div>
            ${t.ing > 0 ? `<div class="don-bar" aria-label="Porcentaje utilizado"><i style="width:${Math.min(100, Math.round((t.uso / t.ing) * 100))}%"></i></div><p class="quiz-note">${Math.min(100, Math.round((t.uso / t.ing) * 100))}% de lo recibido ya se destinó al cuidado de los peluditos.</p>` : ""}
            <ol class="don-timeline">${usos.slice(0, 8).map((m) => `<li><span class="don-date">${esc(fFecha(m.fecha))}</span><div><strong>${esc(m.concepto)}</strong> · ${soles(m.monto)}${m.detalle ? `<small>${esc(m.detalle)}</small>` : ""}</div></li>`).join("") || `<li><div>Aún no se registran gastos.</div></li>`}</ol>`
          : `<div class="empty" style="padding:28px 16px"><p>Aún no hay movimientos registrados. Cuando el albergue registre donaciones y gastos, aparecerán aquí con su detalle.</p></div>`}
          <p class="quiz-note">Montos registrados por el albergue. Los comprobantes se comparten con cada donante en sus actualizaciones.</p>
        </div>
      </div>`;
  }

  function leerForm() { const g = (id) => ($("#" + id) ? $("#" + id).value : ""); return { n: g("dn-nombre"), m: g("dn-monto"), t: g("dn-tel"), c: g("dn-correo"), d: g("dn-destino"), ok: $("#dn-ok") && $("#dn-ok").checked }; }
  function ponerForm(v) { if (!v) return; const s = (id, x) => { if ($("#" + id)) $("#" + id).value = x || ""; }; s("dn-nombre", v.n); s("dn-monto", v.m); s("dn-tel", v.t); s("dn-correo", v.c); s("dn-destino", v.d); if ($("#dn-ok")) $("#dn-ok").checked = v.ok; }

  async function enviar(e) {
    e.preventDefault();
    const v = leerForm(), tel = (v.t || "").replace(/[\s()+-]/g, "");
    const montoNum = +String(v.m).replace(",", ".");
    const errs = {
      nombre: v.n.trim().length >= 2 ? "" : "Escribe tu nombre.",
      monto: form.tipo === "especie" ? (v.m.trim().length >= 3 ? "" : "Cuéntanos qué vas a llevar.") : (montoNum > 0 ? "" : "Escribe un monto válido (ej.: 50)."),
      tel: form.canal === "correo" ? "" : (/^\d{9,15}$/.test(tel) ? "" : "Escribe un WhatsApp válido (9 a 15 dígitos)."),
      correo: form.canal === "whatsapp" ? "" : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v.c || "").trim()) ? "" : "Escribe un correo válido."),
      ok: v.ok ? "" : "Necesitamos tu permiso para enviarte actualizaciones.",
    };
    Object.entries(errs).forEach(([k, m]) => { const el = $("#dn-e-" + k); if (el) el.textContent = m; });
    const primero = Object.keys(errs).find((k) => errs[k]);
    if (primero) { const el = $({ nombre: "#dn-nombre", monto: "#dn-monto", tel: "#dn-tel", correo: "#dn-correo", ok: "#dn-ok" }[primero]); el && el.focus(); return; }
    const medio = form.tipo === "linea" ? MEDIOS.find((m) => m.id === form.medio) : null;
    const tipoTxt = { linea: "En línea" + (medio ? " (" + medio.t + ")" : ""), persona: "Dinero en persona", especie: "Comida o insumos" }[form.tipo];
    const donante = { nombre: v.n.trim(), tipo: tipoTxt, aporte: form.tipo === "especie" ? v.m.trim() : soles(montoNum), monto: form.tipo === "especie" ? null : montoNum,
      canal: form.canal, telefono: form.canal === "correo" ? "" : tel, correo: form.canal === "whatsapp" ? "" : v.c.trim(), destino: v.d || "Donde más se necesite",
      fecha: hoy(), estado: "Por confirmar", ultimaActualizacion: null };
    const store = window.HT.store(), c = window.HT.cfg(), r = $("#donResult");
    let guardado = false, errorGuardar = "";
    if (store && store.donantesPrivados) { try { await store.registrarDonante(donante); guardado = true; } catch (err) { errorGuardar = err.message || String(err); } }
    const msg = [`¡Hola${c.nombre ? ", " + c.nombre : ""}! Quiero hacer una donación 💛`, "", `• Nombre: ${donante.nombre}`, `• Forma: ${tipoTxt}`, `• Aporte: ${donante.aporte}`, `• Destino: ${donante.destino}`,
      `• Actualizaciones por: ${{ whatsapp: "WhatsApp", correo: "correo", ambos: "WhatsApp y correo" }[form.canal]}${donante.telefono ? " · " + donante.telefono : ""}${donante.correo ? " · " + donante.correo : ""}`].join("\n");
    const wa = (c.whatsapp || "").replace(/\D/g, "");
    r.hidden = false; r.className = "wa-result";
    r.innerHTML = `<h4>${guardado ? "✔ ¡Gracias! Quedaste registrado/a" : "✔ Tu mensaje está listo"}</h4>
      <p>${guardado ? "El albergue confirmará tu donación cuando la reciba y te enviará actualizaciones del uso de tu aporte por " + ({ whatsapp: "WhatsApp", correo: "correo", ambos: "WhatsApp y correo" }[form.canal]) + ". Si quieres, avísale también ahora:" : (errorGuardar ? "No pudimos guardar tu registro (" + esc(errorGuardar) + "). Envía este mensaje al albergue para que te registre:" : "Envía este mensaje al albergue para que te registre y te mantenga al tanto:")}</p>
      ${medio ? `<div class="don-medio"><strong>${medio.e} Ahora haz tu aporte de ${esc(donante.aporte)} por ${medio.t}</strong>${medioCuerpo(medio, D())}${medio.listo(D()) ? "" : `<small class="don-k">El albergue aún no registró este medio: pídele los datos por WhatsApp o elige otro medio.</small>`}</div>` : ""}
      <pre>${esc(msg)}</pre><div class="wa-actions">${wa ? `<a class="btn btn-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Avisar por WhatsApp</a>` : ""}<button type="button" class="btn btn-ghost" id="dnCopy">Copiar</button></div>`;
    $("#dnCopy").addEventListener("click", () => window.HT.copiar(msg));
    r.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (guardado) window.HT.toast("¡Gracias por tu donación! Quedaste registrado/a.");
  }

  /* ---------------- Panel de administración ---------------- */
  const AD = { donantes: null, cargando: false, error: "", confirmar: null };

  async function cargarDonantes() {
    const store = window.HT.store(); if (!store || !store.donantesPrivados) return;
    AD.cargando = true; AD.error = "";
    try { AD.donantes = await store.listarDonantes(); } catch (e) { AD.error = e.message || String(e); AD.donantes = []; }
    AD.cargando = false; window.HT.renderAdmin();
  }

  function resumenUso(d) {
    const movs = (d.movimientos || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const t = totales(movs), usos = movs.filter((m) => m.tipo === "uso").slice(0, 5);
    return { t, usos };
  }
  function mensajeActualizacion(don) {
    const c = window.HT.cfg(), d = D(), { t, usos } = resumenUso(d);
    return [`¡Hola, ${don.nombre}! 💛 Te escribimos de ${c.nombre || "el albergue"} para contarte en qué se está usando tu donación${don.aporte ? " (" + don.aporte + ")" : ""}.`, "",
      usos.length ? "Últimos usos de las donaciones:" : "Aún estamos destinando las donaciones recibidas; te contaremos pronto en qué se usan.",
      ...usos.map((m) => `• ${fFecha(m.fecha)} — ${m.concepto}: ${soles(m.monto)}${m.detalle ? " (" + m.detalle + ")" : ""}`), "",
      `Total recibido: ${soles(t.ing)} · Utilizado: ${soles(t.uso)} · Saldo: ${soles(t.saldo)}`, "",
      "Te adjuntamos fotos y comprobantes. ¡Gracias por cuidar de nuestros peluditos! 🐾"].join("\n");
  }

  function vistaAdmin() {
    const d = D(), store = window.HT.store();
    const movs = (d.movimientos || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const t = totales(movs);
    if (store && store.donantesPrivados && AD.donantes === null && !AD.cargando) setTimeout(cargarDonantes, 0);
    const inp = (n, v, ex = "") => `<input name="${n}" value="${esc(v || "")}" ${ex}>`;
    const fld = (l, i, h = "") => `<div class="field"><label>${l}${i}</label>${h ? `<span class="hint">${h}</span>` : ""}</div>`;
    return `<div style="display:grid;gap:16px">
      <form class="panel" id="donCfgForm" novalidate><h3>Datos para donar</h3>
        <p class="hint" style="color:var(--muted)">Se muestran en la sección pública “Dona”. Deja vacío lo que no uses. El lugar y horario de entrega se toman de “Albergue y contacto”.</p>
        <div class="grid-3">${fld("Yape (número)", inp("yape", d.yape, 'inputmode="tel"'))}${fld("Plin (número)", inp("plin", d.plin, 'inputmode="tel"'))}${fld("Banco", inp("banco", d.banco, 'placeholder="Ej.: BCP"'))}
          ${fld("N.º de cuenta", inp("cuenta", d.cuenta))}${fld("CCI", inp("cci", d.cci))}${fld("Titular (nombre que aparece en Yape/Plin/cuenta)", inp("titular", d.titular))}</div>
        ${fld("Link de pago con tarjeta (opcional)", inp("linkTarjeta", d.linkTarjeta, 'type="url" placeholder="https://… (link de pago de Mercado Pago, Izipay, Niubiz, etc.)"'), "Crea un “link de pago” en tu pasarela y pégalo aquí. Debe empezar con https://. Si lo dejas vacío, la opción Tarjeta aparece como pendiente.")}
        <span class="error-msg" id="donCfgError"></span>
        ${fld("Lo que más necesitamos (uno por línea; empieza con ! para marcar urgente)", `<textarea name="necesidades" placeholder="!Comida para cachorros&#10;Mantas&#10;Desinfectante">${esc((d.necesidades || []).join("\n"))}</textarea>`)}
        <div><button class="btn btn-primary" type="submit">Guardar datos de donación</button></div></form>

      <div class="panel"><h3>Ingresos y gastos (transparencia)</h3>
        <p class="hint" style="color:var(--muted)">Lo que registres aquí se publica en “Así usamos tus donaciones” y se usa en los mensajes de actualización a los donantes.</p>
        <div class="don-totals"><div><span>Recibido</span><strong>${soles(t.ing)}</strong></div><div><span>Utilizado</span><strong>${soles(t.uso)}</strong></div><div><span>Saldo</span><strong>${soles(t.saldo)}</strong></div></div>
        <form id="donMovForm" class="mov-form" novalidate>
          ${fld("Fecha", `<input name="fecha" type="date" value="${hoy()}">`)}
          ${fld("Tipo", `<select name="tipo"><option value="uso">Gasto / uso</option><option value="ingreso">Donación recibida</option></select>`)}
          ${fld("Concepto", inp("concepto", "", 'placeholder="Ej.: Saco de comida 15 kg"'))}
          ${fld("Monto (S/)", inp("monto", "", 'inputmode="decimal"'))}
          ${fld("Detalle (opcional)", inp("detalle", "", 'placeholder="Ej.: para cachorros; boleta 001-234"'))}
          <div style="align-self:end"><button class="btn btn-primary btn-sm" type="submit">+ Registrar</button></div>
          <span class="error-msg" id="movError" style="grid-column:1/-1"></span></form>
        <div class="admin-list">${movs.length ? movs.map((m) => `<div class="admin-item"><span class="tag ${m.tipo === "uso" ? "warn" : "sage"}">${m.tipo === "uso" ? "Uso" : "Ingreso"}</span>
          <div class="info"><strong>${esc(m.concepto)} · ${soles(m.monto)}</strong><small>${esc(fFecha(m.fecha))}${m.detalle ? " · " + esc(m.detalle) : ""}</small></div>
          <div class="actions">${AD.confirmar === m.id ? `<span class="confirm-inline">¿Eliminar? <button class="btn btn-danger btn-sm" data-d="mov-del-si" data-id="${esc(m.id)}">Sí</button><button class="btn btn-ghost btn-sm" data-d="no">No</button></span>` : `<button class="btn btn-danger btn-sm" data-d="mov-del" data-id="${esc(m.id)}">Eliminar</button>`}</div></div>`).join("") : `<p style="color:var(--muted)">Aún no hay movimientos.</p>`}</div></div>

      <div class="panel"><h3>Donantes</h3>
        ${!(store && store.donantesPrivados) ? `<div class="note">${"ℹ️"} <span>Los donantes se guardan de forma privada en Supabase. En esta versión no hay base privada, así que los registros llegan como mensaje de WhatsApp al albergue. En el sitio público (GitHub + Supabase) aparecen aquí.</span></div>`
        : AD.cargando || AD.donantes === null ? `<p>Cargando donantes…</p>`
        : AD.error ? `<div class="note">⚠️ <span>No se pudo leer la lista de donantes: ${esc(AD.error)}. Revisa que ejecutaste el código SQL de donantes en Supabase y que iniciaste sesión.</span></div>`
        : !AD.donantes.length ? `<p style="color:var(--muted)">Todavía no hay donantes registrados.</p>`
        : `<p class="hint" style="color:var(--muted)">“Enviar actualización” arma un mensaje con los últimos gastos y el saldo, y lo abre en WhatsApp o en tu correo para que lo revises, adjuntes fotos o comprobantes y lo envíes.</p>
          <div class="admin-list">${AD.donantes.map((r) => { const x = r.datos || {}; return `<div class="admin-item don-row">
            <div class="info"><strong>${esc(x.nombre)} · ${esc(x.aporte || "")}</strong>
              <small>${esc(x.tipo || "")} · ${esc(fFecha(x.fecha))} · prefiere ${esc({ whatsapp: "WhatsApp", correo: "correo", ambos: "WhatsApp y correo" }[x.canal] || x.canal)}${x.telefono ? " · " + esc(x.telefono) : ""}${x.correo ? " · " + esc(x.correo) : ""}</small>
              <small>Destino: ${esc(x.destino || "—")} · ${x.ultimaActualizacion ? "Última actualización: " + esc(fFecha(x.ultimaActualizacion)) : "Sin actualizaciones enviadas"}</small></div>
            <div class="actions">
              <select class="select" data-d="estado" data-id="${esc(r.id)}" style="padding:7px 10px;font-size:13px">${["Por confirmar", "Recibida", "No se concretó"].map((s) => `<option ${x.estado === s ? "selected" : ""}>${s}</option>`).join("")}</select>
              ${x.telefono ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" data-d="enviado" data-id="${esc(r.id)}" href="https://wa.me/${esc(x.telefono.length <= 9 ? "51" + x.telefono : x.telefono)}?text=${encodeURIComponent(mensajeActualizacion(x))}">WhatsApp</a>` : ""}
              ${x.correo ? `<a class="btn btn-soft btn-sm" data-d="enviado" data-id="${esc(r.id)}" href="mailto:${esc(x.correo)}?subject=${encodeURIComponent("Así usamos tu donación 💛")}&body=${encodeURIComponent(mensajeActualizacion(x))}">Correo</a>` : ""}
              <button class="btn btn-ghost btn-sm" data-d="copiar" data-id="${esc(r.id)}">Copiar mensaje</button>
              ${AD.confirmar === r.id ? `<span class="confirm-inline">¿Borrar? <button class="btn btn-danger btn-sm" data-d="don-del-si" data-id="${esc(r.id)}">Sí</button><button class="btn btn-ghost btn-sm" data-d="no">No</button></span>` : `<button class="btn btn-danger btn-sm" data-d="don-del" data-id="${esc(r.id)}">Borrar</button>`}
            </div></div>`; }).join("")}</div>
          <button class="linkish" data-d="recargar">Actualizar lista</button>`}
      </div></div>`;
  }

  function guardarDon(cambios, ok) {
    const c = Object.assign({}, window.HT.cfg()); c.donaciones = Object.assign({}, c.donaciones || {}, cambios);
    return window.HT.ejecutar(() => window.HT.guardarConfig(c), ok);
  }
  function donantePorId(id) { return (AD.donantes || []).find((r) => String(r.id) === String(id)); }
  async function actualizarDonante(id, cambios, ok) {
    const r = donantePorId(id); if (!r) return;
    const datos = Object.assign({}, r.datos, cambios);
    await window.HT.ejecutar(() => window.HT.store().actualizarDonante(id, datos), ok);
    r.datos = datos; window.HT.renderAdmin();
  }

  /* ---------------- Eventos ---------------- */
  document.addEventListener("click", async (e) => {
    const cp = e.target.closest("[data-copy]"); if (cp && $("#donaRoot") && $("#donaRoot").contains(cp)) { window.HT.copiar(cp.dataset.copy); return; }
    const root = $("#donaRoot");
    if (root && root.contains(e.target)) {
      const tp = e.target.closest("[data-dtipo]"), cn = e.target.closest("[data-dcanal]"), md = e.target.closest("[data-dmedio]");
      if (tp || cn || md) { const v = leerForm(); if (tp) form.tipo = tp.dataset.dtipo; if (cn) form.canal = cn.dataset.dcanal; if (md) form.medio = md.dataset.dmedio; render(); ponerForm(v); }
      return;
    }
    const b = e.target.closest("#adminRoot [data-d]"); if (!b) return;
    const a = b.dataset.d, id = b.dataset.id;
    if (a === "no") { AD.confirmar = null; return window.HT.renderAdmin(); }
    if (a === "mov-del" || a === "don-del") { AD.confirmar = id; return window.HT.renderAdmin(); }
    if (a === "mov-del-si") { AD.confirmar = null; return guardarDon({ movimientos: (D().movimientos || []).filter((m) => m.id !== id) }, "Movimiento eliminado."); }
    if (a === "don-del-si") { AD.confirmar = null; await window.HT.ejecutar(() => window.HT.store().eliminarDonante(id), "Donante eliminado."); AD.donantes = (AD.donantes || []).filter((r) => String(r.id) !== String(id)); return window.HT.renderAdmin(); }
    if (a === "recargar") { AD.donantes = null; return cargarDonantes(); }
    if (a === "copiar") { const r = donantePorId(id); if (r) { window.HT.copiar(mensajeActualizacion(r.datos)); actualizarDonante(id, { ultimaActualizacion: hoy() }); } return; }
    if (a === "enviado") { setTimeout(() => actualizarDonante(id, { ultimaActualizacion: hoy() }, "Marcado como actualizado hoy."), 300); }
  });
  document.addEventListener("change", (e) => {
    const s = e.target.closest("#adminRoot select[data-d='estado']"); if (s) actualizarDonante(s.dataset.id, { estado: s.value }, "Estado actualizado.");
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id === "donForm") return enviar(e);
    if (e.target.id === "donCfgForm") {
      e.preventDefault(); const f = e.target, g = (n) => f.elements[n].value.trim();
      if (g("linkTarjeta") && !linkSeguro(g("linkTarjeta"))) { $("#donCfgError").textContent = "El link de pago debe empezar con https:// y no tener espacios."; return; }
      return guardarDon({ yape: g("yape"), plin: g("plin"), banco: g("banco"), cuenta: g("cuenta"), cci: g("cci"), titular: g("titular"), linkTarjeta: g("linkTarjeta"),
        necesidades: g("necesidades").split("\n").map((s) => s.trim()).filter(Boolean) }, "Datos de donación guardados.");
    }
    if (e.target.id === "donMovForm") {
      e.preventDefault(); const f = e.target, g = (n) => f.elements[n].value.trim();
      const monto = +g("monto").replace(",", ".");
      if (!g("concepto")) { $("#movError").textContent = "Escribe el concepto."; return; }
      if (!(monto > 0)) { $("#movError").textContent = "Escribe un monto válido en soles."; return; }
      const mov = { id: "m" + Date.now(), fecha: g("fecha") || hoy(), tipo: g("tipo"), concepto: g("concepto"), monto, detalle: g("detalle") };
      return guardarDon({ movimientos: (D().movimientos || []).concat(mov) }, "Movimiento registrado.");
    }
  });
  document.addEventListener("ht:datos", () => { const v = leerForm(); render(); ponerForm(v); });

  window.HT_DON = { vistaAdmin, alSalir: () => { AD.confirmar = null; } };
  render();
})();
