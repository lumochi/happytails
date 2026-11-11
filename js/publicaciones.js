/* ==========================================================
   NOVEDADES DEL ALBERGUE — un "mini Instagram" dentro de la web.
   La dueña publica fotos + un texto corto desde el panel
   (pestaña "📸 Publicar") y aparecen en la sección pública
   "Novedades". Se guarda en la configuración del sitio
   (config.publicaciones), así que no requiere tablas nuevas.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CLAVE = "happytails.borradorPublicacion";
  const MAX_FOTOS = 4, MAX_TEXTO = 600, VISIBLES = 6;
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const hoyISO = () => { const t = new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
  const fechaBonita = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : ""; };

  const vacio = () => ({ texto: "", fotos: [], fecha: hoyISO() });
  let B = cargar();
  let subiendo = 0, confirmar = null, verTodas = false, recienPublicada = false;

  function cargar() { try { const v = JSON.parse(localStorage.getItem(CLAVE)); if (v && typeof v === "object") return Object.assign(vacio(), v); } catch (e) {} return vacio(); }
  function persistir() { try { localStorage.setItem(CLAVE, JSON.stringify(B)); } catch (e) {} }
  function limpiar() { B = vacio(); try { localStorage.removeItem(CLAVE); } catch (e) {} }
  const lista = () => { const c = window.HT ? window.HT.cfg() : null; return (c && Array.isArray(c.publicaciones) ? c.publicaciones : []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.id).localeCompare(String(a.id))); };

  /* ---------------- Tarjeta (se usa en la página y en la vista previa) ---------------- */
  function tarjeta(p, previa) {
    const H = window.HT, fotos = (p.fotos || []).map((r) => H.fotoRef(r)).filter(Boolean);
    const texto = esc(p.texto || "").replace(/\n/g, "<br>");
    return `<article class="pub-card${previa ? " pub-previa" : ""}">
      ${fotos.length ? `<div class="pub-fotos n${Math.min(fotos.length, 4)}">${fotos.slice(0, 4).map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} de la publicación" loading="lazy">`).join("")}</div>` : ""}
      <div class="pub-cuerpo"><div class="pub-meta"><span class="pub-avatar" aria-hidden="true">🐾</span><span><strong>${esc((H.cfg() || {}).nombre || "El albergue")}</strong><small>${esc(fechaBonita(p.fecha))}</small></span></div>
        ${texto ? `<p>${texto}</p>` : ""}</div></article>`;
  }

  /* ---------------- Sección pública "Novedades" ---------------- */
  function renderPublico() {
    const sec = $("#novedades"), root = $("#novedadesRoot"); if (!sec || !root || !window.HT) return;
    const pubs = lista(); sec.hidden = pubs.length === 0; if (!pubs.length) { root.innerHTML = ""; return; }
    const c = window.HT.cfg() || {};
    const ig = c.instagram ? (/^https?:\/\//.test(c.instagram) ? c.instagram : "https://www.instagram.com/" + String(c.instagram).replace(/^@/, "")) : "";
    const vis = verTodas ? pubs : pubs.slice(0, VISIBLES);
    root.innerHTML = `<div class="pub-grid">${vis.map((p) => tarjeta(p)).join("")}</div>
      <div class="pub-pie">${pubs.length > VISIBLES ? `<button class="btn btn-soft" data-pub="mas">${verTodas ? "Ver menos" : `Ver las ${pubs.length} publicaciones`}</button>` : ""}
        ${ig ? `<a class="btn btn-ghost" href="${esc(ig)}" target="_blank" rel="noopener">Síguenos en Instagram</a>` : ""}</div>`;
  }

  /* ---------------- Panel: pestaña "📸 Publicar" ---------------- */
  function vista() {
    const H = window.HT, pubs = lista();
    const listo = (B.texto.trim() || B.fotos.length) && !subiendo;
    return `<div class="pub-admin">
      <form class="panel pub-form" id="pubForm" novalidate>
        <div class="reg-intro"><h3>📸 Contar qué pasó en el albergue</h3>
          <p>Sube fotos, escribe unas líneas y presiona <strong>Publicar</strong>. Aparecerá en la sección <strong>Novedades</strong> de la página para que todos lo vean.</p></div>
        ${recienPublicada ? `<div class="note sage"><span>🎉 <strong>¡Listo! Tu publicación ya está en la página.</strong> Puedes hacer otra cuando quieras.</span></div>` : ""}
        <section class="reg-paso"><div class="reg-num" aria-hidden="true">1</div><div class="reg-cont"><h4>Fotos (hasta ${MAX_FOTOS})</h4><p class="reg-ayuda">Fotos de día, donde se vea bien a los perritos o a la gente ayudando.</p>
          <div class="reg-fotos">${B.fotos.map((r, i) => `<div class="reg-foto"><img src="${esc(H.fotoRef(r))}" alt="Foto ${i + 1}"><button type="button" class="reg-x" data-pub="quitar" data-i="${i}" aria-label="Quitar foto ${i + 1}">✕</button></div>`).join("")}
            ${B.fotos.length < MAX_FOTOS ? `<label class="upload-box reg-subir">${subiendo ? `Subiendo ${subiendo} foto${subiendo > 1 ? "s" : ""}…` : "📷<br><strong>Tomar o elegir fotos</strong>"}<input type="file" accept="image/*" multiple class="sr-only" id="pubFotos" ${subiendo ? "disabled" : ""}></label>` : ""}</div></div></section>
        <section class="reg-paso"><div class="reg-num" aria-hidden="true">2</div><div class="reg-cont"><h4>¿Qué pasó?</h4><p class="reg-ayuda">Como si le contaras a un amigo. Ej.: “Hoy vinieron 8 voluntarios y bañamos a los cachorros 🐶”.</p>
          <textarea class="reg-input pub-texto" id="pubTexto" maxlength="${MAX_TEXTO}" rows="5" placeholder="Escribe aquí…">${esc(B.texto)}</textarea>
          <small class="reg-ayuda" id="pubCuenta">${B.texto.length} / ${MAX_TEXTO}</small></div></section>
        <section class="reg-paso"><div class="reg-num" aria-hidden="true">3</div><div class="reg-cont"><h4>Publicar</h4>
          <button class="btn btn-primary pub-btn" type="submit" ${listo ? "" : "disabled"}>Publicar en la página</button>
          <p class="reg-ayuda">${listo ? "Se publicará con la fecha de hoy." : "Agrega al menos una foto o un texto."}</p></div></section>
      </form>
      <aside class="pub-lado"><h4>Así se verá</h4>${tarjeta(Object.assign({}, B, { texto: B.texto || "Tu texto aparecerá aquí…" }), true)}</aside>
      <div class="panel pub-mias"><h4>Tus publicaciones (${pubs.length})</h4>
        ${pubs.length ? `<div class="admin-list">${pubs.map((p) => `<div class="admin-item">${(p.fotos || [])[0] ? `<img src="${esc(H.fotoRef(p.fotos[0]))}" alt="">` : `<span class="pub-sinfoto" aria-hidden="true">📝</span>`}
            <div class="info"><strong>${esc(fechaBonita(p.fecha))}</strong><small>${esc(String(p.texto || "").slice(0, 90))}${String(p.texto || "").length > 90 ? "…" : ""}</small></div>
            <div class="actions">${confirmar === p.id ? `<span class="confirm-inline">¿Borrar esta publicación? <button class="btn btn-danger btn-sm" data-pub="borrar-si" data-id="${esc(p.id)}">Sí, borrar</button><button class="btn btn-ghost btn-sm" data-pub="borrar-no">Cancelar</button></span>`
              : `<button class="btn btn-danger btn-sm" data-pub="borrar" data-id="${esc(p.id)}">Borrar</button>`}</div></div>`).join("")}</div>`
          : `<p class="reg-ayuda">Todavía no hay publicaciones. ¡La primera puede ser sobre la jornada de voluntariado!</p>`}</div>
    </div>`;
  }

  async function publicar() {
    const H = window.HT; if (!(B.texto.trim() || B.fotos.length) || subiendo) return;
    const nueva = { id: Date.now().toString(36), fecha: hoyISO(), texto: B.texto.trim().slice(0, MAX_TEXTO), fotos: B.fotos.slice(0, MAX_FOTOS) };
    const c = Object.assign({}, H.cfg()); c.publicaciones = [nueva].concat(Array.isArray(c.publicaciones) ? c.publicaciones : []);
    const ok = await H.ejecutar(() => H.guardarConfig(c), "¡Publicado! Ya está en la sección Novedades.");
    if (ok) { limpiar(); recienPublicada = true; H.renderAdmin(); renderPublico(); }
  }
  async function borrar(id) {
    const H = window.HT, c = Object.assign({}, H.cfg());
    c.publicaciones = (Array.isArray(c.publicaciones) ? c.publicaciones : []).filter((p) => p.id !== id);
    confirmar = null; await H.ejecutar(() => H.guardarConfig(c), "Publicación borrada."); renderPublico();
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pub]"); if (!b) return;
    const a = b.dataset.pub;
    if (a === "mas") { verTodas = !verTodas; renderPublico(); return; }
    if (a === "quitar") { B.fotos.splice(+b.dataset.i, 1); persistir(); recienPublicada = false; window.HT.renderAdmin(); return; }
    if (a === "borrar") { confirmar = b.dataset.id; window.HT.renderAdmin(); return; }
    if (a === "borrar-no") { confirmar = null; window.HT.renderAdmin(); return; }
    if (a === "borrar-si") { borrar(b.dataset.id); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "pubTexto") return;
    B.texto = e.target.value; persistir(); recienPublicada = false;
    const n = $("#pubCuenta"); if (n) n.textContent = `${B.texto.length} / ${MAX_TEXTO}`;
    const btn = $("#pubForm .pub-btn"); if (btn) btn.disabled = !(B.texto.trim() || B.fotos.length) || subiendo > 0;
    const prev = $(".pub-lado"); if (prev) prev.innerHTML = `<h4>Así se verá</h4>${tarjeta(Object.assign({}, B, { texto: B.texto || "Tu texto aparecerá aquí…" }), true)}`;
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "pubFotos") return;
    const files = Array.from(e.target.files || []).slice(0, MAX_FOTOS - B.fotos.length); if (!files.length) return;
    const H = window.HT, store = H.store(); subiendo = files.length; recienPublicada = false; H.renderAdmin();
    for (const f of files) {
      try { const ref = await store.subirFoto(f); if (ref) B.fotos.push(ref); persistir(); }
      catch (err) { H.toast(err.message || "No se pudo subir una foto.", "error"); }
      subiendo--; H.renderAdmin();
    }
  });
  document.addEventListener("submit", (e) => { if (e.target.id === "pubForm") { e.preventDefault(); publicar(); } });
  document.addEventListener("ht:datos", renderPublico);

  window.HT_PUB = { vista, renderPublico };
})();
