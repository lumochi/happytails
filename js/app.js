/* ==========================================================
   Patas al Rescate — lógica de la página
   Secciones: utilidades · componentes (tarjeta, ficha médica, modal)
   · catálogo y filtros · formulario/WhatsApp · panel de administración
   ========================================================== */
(function () {
  "use strict";

  /* ---------------- Utilidades ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PEND = "Información pendiente de confirmar";
  const pend = (v, txt = PEND) => (v != null && String(v).trim() !== "" ? esc(v) : `<span class="pending">${esc(txt)}</span>`);
  const icon = (id, extra = "") => `<svg viewBox="0 0 24 24" fill="currentColor" ${extra}><use href="#${id}"/></svg>`;
  const iconS = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#${id}"/></svg>`;
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "perrito";
  const ESTADOS = { disponible: "Disponible", proceso: "En proceso de adopción", adoptado: "Adoptado" };
  const ETAPAS = ["Cachorro", "Joven", "Adulto", "Senior"];
  const ENERGIAS = ["Baja", "Media", "Alta"];
  const TAMANOS = ["Pequeño", "Mediano", "Grande"];
  const COMPAT = { ninos: "niños", perros: "otros perros", gatos: "gatos" };
  const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#F4EADA"/><g fill="#E0CDB4" transform="translate(26 24) scale(2)"><ellipse cx="6" cy="9.5" rx="2.1" ry="2.7"/><ellipse cx="10" cy="5.6" rx="2.1" ry="2.7"/><ellipse cx="14.4" cy="5.6" rx="2.1" ry="2.7"/><ellipse cx="18.3" cy="9.5" rx="2.1" ry="2.7"/><path d="M12.2 11c-2.6 0-6 3.4-6 6.2 0 1.9 1.4 2.8 3 2.8 1.3 0 2-.7 3-.7s1.7.7 3 .7c1.6 0 3-.9 3-2.8 0-2.8-3.4-6.2-6-6.2z"/></g></svg>');

  function toast(msg, tipo = "") {
    const t = document.createElement("div"); t.className = "toast " + tipo; t.textContent = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), tipo === "error" ? 6500 : 3800);
  }
  async function copiar(texto, el) {
    try { await navigator.clipboard.writeText(texto); toast("Copiado al portapapeles."); }
    catch (e) { if (el) { el.focus(); el.select && el.select(); } toast("No se pudo copiar automáticamente: el texto quedó seleccionado, cópialo con Ctrl+C."); }
  }
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- Estado ---------------- */
  let store = null;
  let D = { perritos: [], config: {} };
  let cargado = false;
  const filtros = { especie: new Set(), tamano: new Set(), etapa: new Set(), sexo: new Set(), rasgo: new Set(), energia: new Set(), compat: new Set(), estado: new Set() };
  let busqueda = "", orden = "orden", perritoElegido = "";

  const foto = (ref) => (store && store.resolverFoto(ref)) || "";
  const fotoPrincipal = (d) => foto((d.fotos || [])[0]) || PLACEHOLDER;
  const cfg = () => D.config || {};
  const articulo = (d) => (d.sexo === "Hembra" ? "a" : "o");

  /* ================= COMPONENTES ================= */
  function badgeEstado(e) { return `<span class="badge ${esc(e || "disponible")}">${esc(ESTADOS[e] || "Disponible")}</span>`; }

  function Tarjeta(d) {
    const rasgos = (d.rasgos || []).slice(0, 3).map((r) => `<span class="tag">${esc(cap(r))}</span>`).join("");
    const noPerro = d.especie && d.especie !== "Perro" ? `<span class="tag warn">${esc(d.especie)}</span>` : "";
    return `<article class="card ${d.estado === "adoptado" ? "is-adopted" : ""}">
      <div class="card-photo"><img src="${esc(fotoPrincipal(d))}" alt="Foto de ${esc(d.nombre)}" loading="lazy" width="640" height="640">${badgeEstado(d.estado)}
        ${d.destacado ? `<span class="fav" title="Destacado">${icon("i-heart")}</span>` : ""}</div>
      <div class="card-body">
        <div class="card-title"><h3>${esc(d.nombre)}</h3><span class="sex">${esc(d.sexo || "")}</span></div>
        <div class="card-meta">
          <span>${icon("i-cake")}${d.edad ? esc(d.edad) : '<span class="pending">Edad por confirmar</span>'}</span>
          <span>${iconS("i-ruler")}${pend(d.tamano, "Tamaño por confirmar")}</span>
          ${d.pesoKg ? `<span>${iconS("i-weight")}${esc(d.pesoKg)} kg</span>` : ""}
          ${d.raza ? `<span>${esc(d.raza)}</span>` : ""}
        </div>
        <div class="tags">${rasgos}${noPerro}</div>
        <button class="btn btn-soft" data-ver="${esc(d.id)}">Conoce su historia</button>
      </div></article>`;
  }

  function nivelMedico(m) {
    m = m || {};
    const items = [m.ultimaVacuna, (m.vacunas || []).length ? "x" : "", m.desparasitacion, m.esterilizacion];
    const n = items.filter((v) => v && String(v).trim()).length;
    if (n >= 4) return { clase: "high", txt: "Ficha médica completa", pct: 100 };
    if (n >= 2) return { clase: "mid", txt: "Ficha médica en progreso", pct: n * 25 };
    return { clase: "low", txt: "Información médica parcial · pendiente de confirmar", pct: Math.max(n * 25, 8) };
  }

  function FichaMedica(d) {
    const m = d.medica || {};
    const nv = nivelMedico(m);
    const vac = (m.vacunas || []).length
      ? `<ul style="margin:0;padding-left:18px">${m.vacunas.map((v) => `<li>${esc(v.nombre || "Vacuna")}${v.fecha ? " — " + esc(v.fecha) : ""}</li>`).join("")}</ul>`
      : `<span class="pending">${PEND}</span>`;
    return `<div class="block"><h3>${iconS("i-syringe")}Ficha médica</h3>
      <div class="med-status ${nv.clase}" role="img" aria-label="${esc(nv.txt)}"><strong>${esc(nv.txt)}</strong><span class="bar"><i style="width:${nv.pct}%"></i></span></div>
      <div class="kv">
        <div>Estado de salud (afiche)</div><div>${pend(d.saludAfiche)}</div>
        <div>Última vacuna registrada</div><div>${pend(m.ultimaVacuna)}${m.ultimaVacuna ? '<br><small style="color:var(--muted)">Es la fecha de la vacuna más reciente, no la de la próxima dosis.</small>' : ""}</div>
        <div>Vacunas registradas</div><div>${vac}</div>
        <div>Desparasitación</div><div>${pend(m.desparasitacion)}</div>
        <div>Esterilización</div><div>${pend(m.esterilizacion)}</div>
        <div>Enfermedades o tratamientos</div><div>${pend(m.condiciones)}</div>
        <div>Próxima vacuna o control</div><div>${pend(m.proximoControl, "No indicado en los datos")}</div>
      </div></div>`;
  }

  function descripcionBase(d) {
    const partes = [];
    if (d.pesoKg || d.tamano) partes.push(`${esc(d.nombre)} ${d.pesoKg ? `pesa ${esc(d.pesoKg)} kg` : ""}${d.pesoKg && d.tamano ? " y " : ""}${d.tamano ? `es de tamaño ${esc(d.tamano.toLowerCase())}` : ""}.`);
    if (d.saludAfiche) partes.push(`Su afiche dice: <span class="quote">“${esc(d.saludAfiche)}”</span>`);
    return partes.join(" ");
  }

  function Ficha(d) {
    const fotos = (d.fotos || []).map((r) => ({ ref: r, src: foto(r) })).filter((f) => f.src);
    if (!fotos.length) fotos.push({ ref: "", src: PLACEHOLDER });
    const esAfiche = (r) => /afiches\//.test(r);
    const compat = Object.entries(COMPAT).map(([k, label]) => {
      const v = (d.compatibilidad || {})[k];
      return `<div>Con ${label}</div><div>${pend(v)}</div>`;
    }).join("");
    const rasgos = (d.rasgos || []).length ? `<div class="tags">${d.rasgos.map((r) => `<span class="tag">${esc(cap(r))}</span>`).join("")}</div>` : `<span class="pending">${PEND}</span>`;
    const notas = (d.notas || []).filter(Boolean);
    const adoptado = d.estado === "adoptado";
    return `<div class="dossier">
      <div class="gallery">
        <div class="gallery-main"><img id="galMain" src="${esc(fotos[0].src)}" alt="Foto de ${esc(d.nombre)}" class="${esAfiche(fotos[0].ref) ? "is-poster" : ""}"></div>
        ${fotos.length > 1 ? `<div class="thumbs">${fotos.map((f, i) => `<button class="thumb" data-thumb="${i}" data-src="${esc(f.src)}" data-poster="${esAfiche(f.ref) ? 1 : 0}" aria-pressed="${i === 0}" aria-label="Ver foto ${i + 1}${esAfiche(f.ref) ? " (afiche original)" : ""}"><img src="${esc(f.src)}" alt=""></button>`).join("")}</div>` : ""}
        <p class="caption">${d.archivoOriginal ? `Archivo original: ${esc(d.archivoOriginal)}` : ""}${fotos.some((f) => esAfiche(f.ref)) ? " · Incluye el afiche original." : ""}</p>
      </div>
      <div class="dossier-body">
        <div class="dossier-head">${badgeEstado(d.estado)}<h2 id="modalTitle">${esc(d.nombre)}</h2>
          ${d.especie && d.especie !== "Perro" ? `<div class="note">${icon("i-info")}<span>Especie registrada: ${esc(d.especie)}.</span></div>` : ""}</div>
        <div class="facts">
          <div class="fact"><span class="k">Edad</span><span class="v ${d.edad ? "" : "pending"}">${d.edad ? esc(d.edad) : PEND}</span></div>
          <div class="fact"><span class="k">Sexo</span><span class="v">${pend(d.sexo)}</span></div>
          <div class="fact"><span class="k">Tamaño</span><span class="v">${pend(d.tamano)}</span></div>
          <div class="fact"><span class="k">Peso</span><span class="v">${d.pesoKg ? esc(d.pesoKg) + " kg" : `<span class="pending">${PEND}</span>`}</span></div>
          <div class="fact"><span class="k">Raza</span><span class="v ${d.raza ? "" : "pending"}">${d.raza ? esc(d.raza) : PEND}</span></div>
        </div>
        <div class="block"><h3>${icon("i-paw")}Su historia</h3>
          <p>${descripcionBase(d)}</p>
          <p>${d.historia ? esc(d.historia) : `<span class="pending">Su historia aún no ha sido registrada por el albergue.</span>`}</p></div>
        <div class="block"><h3>${iconS("i-smile")}Personalidad y comportamiento</h3>
          ${rasgos}
          <div class="kv"><div>Nivel de energía</div><div>${pend(d.energia, "No registrado")}</div>${compat}
            <div>Cuidados especiales</div><div>${pend(d.cuidados, "No documentados")}</div></div></div>
        ${FichaMedica(d)}
        ${notas.length ? `<div class="block verify"><h3>${iconS("i-info")}Datos por verificar</h3>${notas.map((n) => `<div class="note">${icon("i-info")}<span>${esc(n)}</span></div>`).join("")}</div>` : ""}
        ${d.fuente ? `<p style="font-size:12.5px;color:var(--muted)">Fuente: ${esc(d.fuente)}</p>` : ""}
        <div class="dossier-cta">${adoptado
          ? `<button class="btn btn-primary" disabled>${esc(d.nombre)} ya encontró un hogar</button>`
          : `<button class="btn btn-primary" data-adoptar="${esc(d.id)}">${icon("i-heart")}¡Quiero adoptar a ${esc(d.nombre)}!</button>`}
          ${d.estado === "proceso" ? `<p style="font-size:13px;color:var(--muted);text-align:center;margin-top:6px">Ya tiene una adopción en proceso, pero puedes dejar tu interés.</p>` : ""}</div>
      </div></div>`;
  }

  /* ---------------- Modal ---------------- */
  let ultimoFoco = null;
  function abrirFicha(id) {
    const d = D.perritos.find((x) => x.id === id); if (!d) return;
    ultimoFoco = document.activeElement;
    $("#modalRoot").innerHTML = `<div class="overlay" data-cerrar><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1">
      <button class="modal-close" data-cerrar-btn aria-label="Cerrar ficha">${iconS("i-x")}</button>${Ficha(d)}</div></div>`;
    document.body.style.overflow = "hidden";
    $(".modal").focus();
  }
  function cerrarFicha() {
    if (!$("#modalRoot").firstChild) return;
    $("#modalRoot").innerHTML = ""; document.body.style.overflow = "";
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }
  $("#modalRoot").addEventListener("click", (e) => {
    if (e.target.matches("[data-cerrar]") || e.target.closest("[data-cerrar-btn]")) return cerrarFicha();
    const t = e.target.closest("[data-thumb]");
    if (t) {
      const img = $("#galMain"); img.src = t.dataset.src; img.classList.toggle("is-poster", t.dataset.poster === "1");
      $$("[data-thumb]").forEach((b) => b.setAttribute("aria-pressed", b === t)); return;
    }
    const a = e.target.closest("[data-adoptar]");
    if (a) { cerrarFicha(); elegirPerrito(a.dataset.adoptar); $("#formulario").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("#f-nombre").focus({ preventScroll: true }), 500); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if ($("#modalRoot").firstChild) cerrarFicha(); }
    if (e.key === "Tab" && $("#modalRoot").firstChild) {
      const f = $$("button:not([disabled]), [href], input, select, textarea", $(".modal")); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-ver]"); if (b) abrirFicha(b.dataset.ver); });

  /* ================= SECCIONES DE LA PORTADA ================= */
  function renderSitio() {
    const c = cfg();
    $$("[data-bind]").forEach((el) => { el.textContent = c[el.dataset.bind] || ""; });
    document.title = (c.nombre || "Adopción") + " · Adopta a tu compañero ideal";
    const disp = D.perritos.filter((d) => d.estado === "disponible");
    $("#heroCount").textContent = disp.length + (disp.length === 1 ? " peludito" : " peluditos");
    const heroDog = D.perritos.find((d) => (d.fotos || []).includes(c.heroFoto)) || D.perritos[0];
    const heroSrc = foto(c.heroFoto) || (heroDog ? fotoPrincipal(heroDog) : PLACEHOLDER);
    $("#heroPhoto").src = heroSrc; $("#heroPhoto").alt = heroDog ? `Foto de ${heroDog.nombre}` : "";
    $("#heroChipName").innerHTML = heroDog ? `<strong>Hola, soy ${esc(heroDog.nombre)}</strong>¿me llevas a casa?` : "<strong>Hola</strong>¿me llevas a casa?";

    // Destacados
    let dest = D.perritos.filter((d) => d.destacado && d.estado !== "adoptado");
    if (!dest.length) dest = D.perritos.filter((d) => d.estado === "disponible");
    dest = dest.sort((a, b) => (a.orden || 999) - (b.orden || 999)).slice(0, 8);
    $("#featuredRow").innerHTML = dest.length ? dest.map(Tarjeta).join("") : `<div class="empty"><p>Aún no hay perritos destacados.</p></div>`;

    // Estadísticas
    const auto = { disponibles: disp.length, proceso: D.perritos.filter((d) => d.estado === "proceso").length, adoptados: D.perritos.filter((d) => d.estado === "adoptado").length, total: D.perritos.length };
    const stats = c.stats || [];
    let hayPend = false;
    $("#stats").innerHTML = stats.map((s) => {
      let v = s.valor, nota = "";
      if (s.auto && s.id in auto) { v = auto[s.id]; nota = "Calculado automáticamente del catálogo"; }
      const p = v === null || v === undefined || v === "";
      if (p) hayPend = true;
      return `<div class="stat"><span class="stat-value ${p ? "is-pending" : ""}">${p ? "—" : esc(v)}</span><span class="stat-label">${esc(s.etiqueta)}</span>
        <span class="stat-note">${p ? '<span class="tag warn">Valor provisional · pendiente de confirmar</span>' : esc(nota || "Dato registrado por el albergue")}</span></div>`;
    }).join("");
    $("#impactNote").textContent = hayPend ? "Las cifras marcadas como pendientes aún no han sido confirmadas por el albergue y se completan desde el panel de administración." : "";

    // Sobre nosotros
    $("#aboutMosaic").innerHTML = D.perritos.slice(0, 6).map((d) => `<img src="${esc(fotoPrincipal(d))}" alt="" loading="lazy">`).join("");
    const wa = (c.whatsapp || "").replace(/\D/g, "");
    const fila = (ic, k, v, txt) => `<li>${iconS(ic)}<span style="min-width:0"><span class="k">${k}</span><span class="v">${v ? esc(v) : `<span class="pending">${txt || "Pendiente de configurar"}</span>`}</span></span></li>`;
    $("#contactList").innerHTML =
      `<li>${iconS("i-chat")}<span style="min-width:0"><span class="k">WhatsApp</span><span class="v">${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">+${esc(wa)}</a>` : '<span class="pending">Número pendiente de configurar</span>'}</span></span></li>` +
      `<li>${iconS("i-camera")}<span style="min-width:0"><span class="k">Instagram / redes</span><span class="v">${c.instagram ? (/^https?:\/\//.test(c.instagram) ? `<a href="${esc(c.instagram)}" target="_blank" rel="noopener">${esc(c.instagram)}</a>` : esc(c.instagram)) : '<span class="pending">Pendiente de configurar</span>'}</span></span></li>` +
      fila("i-mail", "Correo", c.correo) + fila("i-pin", "Ubicación", c.ubicacion) + fila("i-clock", "Horario de visitas", c.horario);
    renderWaNota();
  }

  /* ================= CATÁLOGO Y FILTROS ================= */
  function opcionesFiltro() {
    const rasgos = new Map();
    D.perritos.forEach((d) => (d.rasgos || []).forEach((r) => rasgos.set(norm(r), cap(r))));
    const compatDisp = Object.keys(COMPAT).filter((k) => D.perritos.some((d) => norm((d.compatibilidad || {})[k]) === "si"));
    const hayEtapa = D.perritos.some((d) => d.etapa), hayEnergia = D.perritos.some((d) => d.energia);
    const especies = [...new Set(D.perritos.map((d) => d.especie || "Perro"))].sort();
    return [
      ...(especies.length > 1 ? [{ k: "especie", t: "Especie", ops: especies.map((x) => [x, x]) }] : []),
      { k: "tamano", t: "Tamaño", ops: TAMANOS.filter((x) => D.perritos.some((d) => d.tamano === x)).map((x) => [x, x]) },
      { k: "etapa", t: "Edad", ops: [...ETAPAS.filter((x) => D.perritos.some((d) => d.etapa === x)).map((x) => [x, x]), ["", "Sin confirmar"]],
        nota: hayEtapa ? "" : "Las edades aún no están registradas." },
      { k: "sexo", t: "Sexo", ops: [["Macho", "Macho"], ["Hembra", "Hembra"]] },
      { k: "rasgo", t: "Personalidad", ops: [...rasgos.entries()].sort((a, b) => a[1].localeCompare(b[1])) },
      { k: "energia", t: "Nivel de energía", ops: [...ENERGIAS.filter((x) => D.perritos.some((d) => d.energia === x)).map((x) => [x, x]), ["", "Sin registrar"]],
        nota: hayEnergia ? "" : "Ningún nivel de energía registrado todavía." },
      { k: "compat", t: "Compatibilidad confirmada", ops: compatDisp.map((k) => [k, "Con " + COMPAT[k]]),
        nota: compatDisp.length ? "Solo incluye datos confirmados." : "Aún no hay compatibilidades confirmadas. Se activarán cuando el albergue las registre." },
      { k: "estado", t: "Estado", ops: Object.entries(ESTADOS) },
    ];
  }
  function renderFiltros() {
    $("#filters").innerHTML = opcionesFiltro().map((g) => `<div class="filter-group" role="group" aria-label="${esc(g.t)}"><span>${esc(g.t)}</span>
      <div class="chips">${g.ops.map(([v, l]) => `<button type="button" class="chip" data-f="${g.k}" data-v="${esc(v)}" aria-pressed="${filtros[g.k].has(v)}">${esc(l)}</button>`).join("")}</div>
      ${g.nota ? `<span class="filter-note">${esc(g.nota)}</span>` : ""}</div>`).join("");
  }
  function coincide(d) {
    if (busqueda && !norm(d.nombre).includes(norm(busqueda))) return false;
    const f = filtros;
    if (f.especie.size && !f.especie.has(d.especie || "Perro")) return false;
    if (f.tamano.size && !f.tamano.has(d.tamano)) return false;
    if (f.etapa.size && !f.etapa.has(d.etapa || "")) return false;
    if (f.sexo.size && !f.sexo.has(d.sexo)) return false;
    if (f.rasgo.size && !(d.rasgos || []).some((r) => f.rasgo.has(norm(r)))) return false;
    if (f.energia.size && !f.energia.has(d.energia || "")) return false;
    if (f.compat.size && ![...f.compat].every((k) => norm((d.compatibilidad || {})[k]) === "si")) return false;
    if (f.estado.size && !f.estado.has(d.estado || "disponible")) return false;
    return true;
  }
  const ORDENES = {
    orden: (a, b) => (a.estado === "adoptado") - (b.estado === "adoptado") || (a.orden || 999) - (b.orden || 999) || a.nombre.localeCompare(b.nombre),
    az: (a, b) => a.nombre.localeCompare(b.nombre, "es"), za: (a, b) => b.nombre.localeCompare(a.nombre, "es"),
    "peso-asc": (a, b) => (a.pesoKg || 1e9) - (b.pesoKg || 1e9), "peso-desc": (a, b) => (b.pesoKg || -1) - (a.pesoKg || -1),
    recientes: (a, b) => String(b.actualizado || "").localeCompare(String(a.actualizado || "")),
  };
  function renderCatalogo() {
    const lista = D.perritos.filter(coincide).sort(ORDENES[orden] || ORDENES.orden);
    const activos = busqueda || Object.values(filtros).some((s) => s.size);
    $("#resetFilters").hidden = !activos;
    $("#resultsCount").innerHTML = `<strong>${lista.length}</strong> de ${D.perritos.length} ${D.perritos.length === 1 ? "registro" : "registros"}`;
    if (!D.perritos.length) {
      $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("i-paw")}<h3>Todavía no hay perritos registrados</h3><p>${store && store.puedeAdministrar() ? "Abre el panel de administración para cargar los registros iniciales o agregar uno nuevo." : "Vuelve pronto: el albergue está cargando la información."}</p></div>`;
    } else if (!lista.length) {
      $("#grid").innerHTML = `<div class="empty" style="grid-column:1/-1">${icon("i-paw")}<h3>No encontramos coincidencias</h3><p>Prueba con otros filtros o limpia la búsqueda.</p><button class="btn btn-soft" data-reset>Limpiar filtros</button></div>`;
    } else $("#grid").innerHTML = lista.map(Tarjeta).join("");
  }
  function limpiarFiltros() { Object.values(filtros).forEach((s) => s.clear()); busqueda = ""; $("#q").value = ""; renderFiltros(); renderCatalogo(); }
  $("#filters").addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c || c.disabled) return;
    const s = filtros[c.dataset.f], v = c.dataset.v;
    s.has(v) ? s.delete(v) : s.add(v);
    c.setAttribute("aria-pressed", s.has(v)); renderCatalogo();
  });
  $("#q").addEventListener("input", (e) => { busqueda = e.target.value; renderCatalogo(); });
  $("#sort").addEventListener("change", (e) => { orden = e.target.value; ls.set("patas.orden", orden); renderCatalogo(); });
  $("#resetFilters").addEventListener("click", limpiarFiltros);
  $("#grid").addEventListener("click", (e) => { if (e.target.closest("[data-reset]")) limpiarFiltros(); });
  $("#filtersToggle").addEventListener("click", (e) => { const o = $("#filters").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); });

  /* ================= FORMULARIO / WHATSAPP ================= */
  function renderSelectPerritos() {
    const sel = $("#f-perrito");
    const lista = D.perritos.filter((d) => d.estado !== "adoptado").sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    sel.innerHTML = `<option value="">Elige un perrito…</option>` + lista.map((d) => `<option value="${esc(d.id)}">${esc(d.nombre)}${d.estado === "proceso" ? " (adopción en proceso)" : ""}</option>`).join("");
    if (perritoElegido && lista.some((d) => d.id === perritoElegido)) sel.value = perritoElegido; else perritoElegido = "";
    renderElegido();
  }
  function elegirPerrito(id) { perritoElegido = id; $("#f-perrito").value = id; renderElegido(); limpiarError("perrito"); }
  function renderElegido() {
    const d = D.perritos.find((x) => x.id === perritoElegido);
    $("#pickedDog").innerHTML = d ? `<div class="picked"><img src="${esc(fotoPrincipal(d))}" alt=""><div><strong>${esc(d.nombre)}</strong><br><small style="color:var(--muted)">${esc([d.sexo, d.tamano, d.pesoKg ? d.pesoKg + " kg" : ""].filter(Boolean).join(" · "))}</small></div></div>` : "";
  }
  function renderWaNota() {
    const wa = (cfg().whatsapp || "").replace(/\D/g, "");
    $("#waStatusNote").innerHTML = wa
      ? `<div class="note sage">${iconS("i-chat")}<span>El mensaje se abrirá en WhatsApp dirigido al +${esc(wa)}. Tú decides si lo envías.</span></div>`
      : `<div class="note">${icon("i-info")}<span><strong>WhatsApp pendiente de configurar.</strong> El número del albergue aún no se ha registrado (Panel de administración → Albergue). Mientras tanto podrás copiar el mensaje.</span></div>`;
  }
  $("#f-perrito").addEventListener("change", (e) => { perritoElegido = e.target.value; renderElegido(); });

  const reglas = {
    nombre: (v) => (v.trim().length >= 2 ? "" : "Escribe tu nombre."),
    distrito: (v) => (v.trim().length >= 2 ? "" : "Indica tu distrito o ciudad."),
    correo: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Escribe un correo válido (ej.: nombre@correo.com)."),
    telefono: (v) => { const n = v.replace(/[\s()+-]/g, ""); return /^\d{9,15}$/.test(n) ? "" : "Escribe un teléfono válido (9 a 15 dígitos)."; },
    perrito: (v) => (v ? "" : "Elige al perrito que deseas adoptar."),
    motivo: (v) => (v.trim().length >= 20 ? "" : "Cuéntanos un poco más (mínimo 20 caracteres)."),
    hogar: (v) => (v.trim().length >= 10 ? "" : "Describe brevemente tu hogar y experiencia."),
  };
  function marcarError(k, msg) { const el = $("#e-" + k); el.textContent = msg; const f = el.closest(".field"); f && f.classList.toggle("invalid", !!msg); const i = $("#f-" + k); i && i.setAttribute("aria-invalid", msg ? "true" : "false"); }
  function limpiarError(k) { marcarError(k, ""); }
  Object.keys(reglas).forEach((k) => $("#f-" + k).addEventListener("blur", (e) => { if (e.target.value) marcarError(k, reglas[k](e.target.value)); }));
  Object.keys(reglas).forEach((k) => $("#f-" + k).addEventListener("input", (e) => { if ($("#e-" + k).textContent) marcarError(k, reglas[k](e.target.value)); }));

  $("#adoptForm").addEventListener("submit", (e) => {
    e.preventDefault();
    let primero = null;
    Object.keys(reglas).forEach((k) => { const m = reglas[k]($("#f-" + k).value); marcarError(k, m); if (m && !primero) primero = k; });
    const comp = $("#f-compromiso").checked;
    $("#e-compromiso").textContent = comp ? "" : "Debes aceptar el compromiso de adopción responsable.";
    if (!comp && !primero) primero = "compromiso";
    if (primero) { $("#f-" + primero).focus(); toast("Revisa los campos marcados en rojo.", "error"); $("#waResult").hidden = true; return; }
    const v = (k) => $("#f-" + k).value.trim();
    const d = D.perritos.find((x) => x.id === v("perrito"));
    const c = cfg();
    const lineas = [
      `¡Hola${c.nombre ? ", " + c.nombre : ""}! Me interesa adoptar a ${d ? d.nombre : v("perrito")}.`, "",
      `• Nombre: ${v("nombre")}`, `• Distrito/ciudad: ${v("distrito")}`,
      ...($("#f-compartir").checked ? [`• Correo: ${v("correo")}`, `• Teléfono: ${v("telefono")}`] : []),
      "", `¿Por qué quiero adoptar?`, v("motivo"), "", `Mi hogar y experiencia con animales:`, v("hogar"), "",
      "Entiendo que la adopción es un compromiso responsable de largo plazo.",
    ];
    const msg = lineas.join("\n");
    const wa = (c.whatsapp || "").replace(/\D/g, "");
    const r = $("#waResult");
    r.className = "wa-result"; r.hidden = false;
    r.innerHTML = `<h4>✔ Tu mensaje está listo</h4>
      <p>${wa ? "Revisa el texto y pulsa “Abrir en WhatsApp”. El mensaje solo se envía si tú lo confirmas dentro de WhatsApp." : "El número de WhatsApp del albergue aún no está configurado, así que no se puede abrir el chat. Copia el mensaje y envíalo por el canal de contacto del albergue (por ejemplo, mensaje directo en sus redes)."}</p>
      <label class="sr-only" for="waText">Mensaje generado</label><pre id="waPre" tabindex="0">${esc(msg)}</pre>
      <textarea id="waText" class="sr-only" readonly>${esc(msg)}</textarea>
      <div class="wa-actions">${wa ? `<a class="btn btn-wa" id="waLink" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${iconS("i-chat")}Abrir en WhatsApp</a>` : ""}
        <button type="button" class="btn btn-ghost" id="waCopy">Copiar mensaje</button></div>`;
    $("#waCopy").addEventListener("click", () => copiar(msg, $("#waText")));
    r.scrollIntoView({ behavior: "smooth", block: "nearest" });
    toast("Mensaje preparado. Aún no se ha enviado nada.");
  });

  /* ================= NAVEGACIÓN ================= */
  $("#menuToggle").addEventListener("click", () => { const o = $("#nav").classList.toggle("open"); $("#menuToggle").setAttribute("aria-expanded", o); });
  $("#nav").addEventListener("click", (e) => { if (e.target.closest("a")) { $("#nav").classList.remove("open"); $("#menuToggle").setAttribute("aria-expanded", "false"); } });
  window.addEventListener("scroll", () => $(".header").classList.toggle("scrolled", window.scrollY > 10), { passive: true });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) $$(".nav a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); }), { rootMargin: "-45% 0px -50% 0px" });
    ["inicio", "perritos", "como-adoptar", "nosotros"].forEach((id) => io.observe(document.getElementById(id)));
  }

  /* ================= PANEL DE ADMINISTRACIÓN ================= */
  const A = { abierto: false, tab: "perritos", editando: null, borrador: null, confirmar: null, filtro: "", ocupado: false };

  function perritoVacio() {
    return { id: "", nombre: "", especie: "Perro", sexo: "", pesoKg: "", tamano: "", edad: "", etapa: "", raza: "", energia: "", rasgos: [],
      compatibilidad: { ninos: "", perros: "", gatos: "" }, historia: "", cuidados: "", saludAfiche: "",
      medica: { ultimaVacuna: "", vacunas: [], desparasitacion: "", esterilizacion: "", condiciones: "", proximoControl: "" },
      estado: "disponible", destacado: false, fotos: [], archivoOriginal: "", fuente: "Registrado desde el panel de administración", notas: [], orden: D.perritos.length + 1 };
  }
  function abrirAdmin() {
    if (!store || !store.puedeAdministrar()) { toast("No tienes acceso al panel de administración.", "error"); return; }
    A.abierto = true; document.body.style.overflow = "hidden"; renderAdmin();
  }
  function cerrarAdmin() {
    A.abierto = false; A.editando = null; A.borrador = null; $("#adminRoot").innerHTML = ""; document.body.style.overflow = "";
    if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search);
  }
  $("#adminOpen").addEventListener("click", abrirAdmin);

  const sel = (name, val, ops, extra = "") => `<select name="${name}" ${extra}>${ops.map(([v, l]) => `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const fld = (label, inner, hint = "") => `<div class="field"><label>${label}${inner}</label>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const inp = (name, val, extra = "") => `<input name="${name}" value="${esc(val)}" ${extra}>`;
  const SINO = [["", "Sin confirmar"], ["Sí", "Sí"], ["No", "No"]];

  function renderAdmin() {
    if (!A.abierto) return;
    const loginNecesario = store.necesitaLogin && !store.sesion;
    const tabs = [["perritos", "Perritos"], ["albergue", "Albergue y contacto"], ["stats", "Estadísticas"], ["datos", "Datos y almacenamiento"]];
    $("#adminRoot").innerHTML = `<div class="admin" role="dialog" aria-modal="true" aria-label="Panel de administración">
      <div class="admin-top"><div class="wrap"><span class="brand-mark" aria-hidden="true">${icon("i-paw")}</span><h2>Panel de administración</h2><span class="spacer"></span>
        ${store.necesitaLogin && store.sesion ? `<button class="btn btn-ghost btn-sm" data-a="logout">Cerrar sesión</button>` : ""}
        <button class="btn btn-primary btn-sm" data-a="cerrar">Volver a la página</button></div>
        ${loginNecesario ? "" : `<div class="wrap"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${A.tab === k}">${l}</button>`).join("")}</div></div>`}</div>
      <div class="admin-body wrap">${loginNecesario ? vistaLogin() : vistaTab()}</div></div>`;
  }
  function vistaLogin() {
    return `<form class="panel login" id="loginForm"><h3>Iniciar sesión</h3><p style="color:var(--muted)">Usa el correo y la contraseña del administrador creado en Supabase (ver README). La contraseña no se guarda en esta página.</p>
      ${fld("Correo", inp("email", A.loginEmail || "", 'type="email" autocomplete="username" required'))}${fld("Contraseña", '<input name="pass" type="password" autocomplete="current-password" required>')}
      <button class="btn btn-primary" type="submit">Entrar</button></form>`;
  }
  function vistaTab() {
    const aviso = `<div class="note ${store.modo === "local" ? "" : "sage"}">${icon("i-info")}<span><strong>${{ artifact: "Base de datos compartida", supabase: "Supabase", local: "Modo local (limitado)", lectura: "Solo lectura" }[store.modo]}:</strong> ${esc(store.descripcion)}</span></div>`;
    if (A.tab === "perritos") return A.editando ? vistaEditor() : `<div style="display:grid;gap:16px">${aviso}${vistaLista()}</div>`;
    if (A.tab === "albergue") return vistaAlbergue();
    if (A.tab === "stats") return vistaStats();
    return `<div style="display:grid;gap:16px">${aviso}${vistaDatos()}</div>`;
  }
  function vistaLista() {
    const lista = D.perritos.filter((d) => !A.filtro || norm(d.nombre).includes(norm(A.filtro))).sort(ORDENES.orden);
    return `<div class="panel"><div class="toolbar"><label class="search" style="flex:1 1 220px">${iconS("i-paw")}<span class="sr-only">Buscar</span><input id="admFiltro" placeholder="Buscar perrito…" value="${esc(A.filtro)}"></label>
        <button class="btn btn-primary" data-a="nuevo">+ Agregar perrito</button></div>
      ${!D.perritos.length ? `<div class="empty"><p>No hay registros todavía.</p><button class="btn btn-soft" data-a="cargar-iniciales">Cargar los ${(window.DATOS_INICIALES || { perritos: [] }).perritos.length} registros iniciales del ZIP</button></div>` : ""}
      <div class="admin-list">${lista.map((d) => `<div class="admin-item"><img src="${esc(fotoPrincipal(d))}" alt=""><div class="info"><strong>${esc(d.nombre)}</strong>
          <small>${esc(ESTADOS[d.estado] || "")} · ${esc([d.sexo, d.tamano, d.pesoKg ? d.pesoKg + " kg" : ""].filter(Boolean).join(" · "))}</small></div>
          <div class="actions">${A.confirmar === d.id
            ? `<span class="confirm-inline">¿Eliminar a ${esc(d.nombre)}? <button class="btn btn-danger btn-sm" data-a="borrar-si" data-id="${esc(d.id)}">Sí, eliminar</button><button class="btn btn-ghost btn-sm" data-a="borrar-no">Cancelar</button></span>`
            : `<label class="sr-only" for="st-${esc(d.id)}">Estado de ${esc(d.nombre)}</label>${sel("estadoRapido", d.estado, Object.entries(ESTADOS), `class="select" id="st-${esc(d.id)}" data-id="${esc(d.id)}" style="padding:7px 10px;font-size:13px"`)}
               <button class="btn btn-soft btn-sm" data-a="editar" data-id="${esc(d.id)}">Editar</button><button class="btn btn-danger btn-sm" data-a="borrar" data-id="${esc(d.id)}">Eliminar</button>`}</div></div>`).join("")}</div></div>`;
  }
  function vistaEditor() {
    const d = A.borrador, m = d.medica, nuevo = A.editando === "nuevo";
    return `<form class="panel" id="dogForm" novalidate>
      <div class="toolbar"><button type="button" class="btn btn-ghost btn-sm" data-a="volver">← Volver a la lista</button><h3 style="flex:1">${nuevo ? "Nuevo perrito" : "Editar a " + esc(d.nombre)}</h3></div>
      <p class="hint" style="color:var(--muted)">Deja vacío lo que no esté confirmado: la página mostrará “${PEND}”. No completes datos supuestos.</p>
      <fieldset class="fieldset"><legend>Fotografías</legend>
        <div class="photo-manager">${d.fotos.map((r, i) => `<div class="photo-slot"><img src="${esc(foto(r) || PLACEHOLDER)}" alt="Foto ${i + 1}"><span>${i === 0 ? "<strong>Principal</strong>" : /afiches\//.test(r) ? "Afiche" : "Foto " + (i + 1)}</span>
          <div class="row">${i > 0 ? `<button type="button" data-a="foto-principal" data-i="${i}">Principal</button>` : ""}<button type="button" data-a="foto-quitar" data-i="${i}">Quitar</button></div></div>`).join("")}
          <label class="upload-box">${A.ocupado ? "Subiendo…" : "+ Agregar fotos<br>(JPG/PNG)"}<input type="file" accept="image/*" multiple id="fotoInput" class="sr-only"></label></div>
        <span class="hint">Las fotos se reducen automáticamente antes de guardarse. La primera es la foto principal de la tarjeta.</span></fieldset>
      <fieldset class="fieldset"><legend>Información personal</legend><div class="grid-3">
        ${fld('Nombre <span class="req">*</span>', inp("nombre", d.nombre, 'required maxlength="40"'))}
        ${fld("Especie", inp("especie", d.especie))}
        ${fld("Sexo", sel("sexo", d.sexo, [["", "Sin confirmar"], ["Macho", "Macho"], ["Hembra", "Hembra"]]))}
        ${fld("Edad", inp("edad", d.edad, 'placeholder="Ej.: 2 años aprox."'))}
        ${fld("Etapa (para el filtro de edad)", sel("etapa", d.etapa, [["", "Sin confirmar"], ...ETAPAS.map((x) => [x, x])]))}
        ${fld("Raza", inp("raza", d.raza, 'placeholder="Ej.: mestizo"'))}
        ${fld("Peso (kg)", inp("pesoKg", d.pesoKg, 'inputmode="decimal"'))}
        ${fld("Tamaño", sel("tamano", d.tamano, [["", "Sin confirmar"], ...TAMANOS.map((x) => [x, x])]))}
        ${fld("Estado de adopción", sel("estado", d.estado, Object.entries(ESTADOS)))}
      </div>
      <label class="check"><input type="checkbox" name="destacado" ${d.destacado ? "checked" : ""}> Mostrar en “Perritos destacados”</label>
      ${fld("Su historia", `<textarea name="historia">${esc(d.historia)}</textarea>`, "Cómo llegó al albergue, cómo es su día a día…")}</fieldset>
      <fieldset class="fieldset"><legend>Personalidad y comportamiento</legend>
        ${fld("Rasgos de personalidad", inp("rasgos", (d.rasgos || []).join(", ")), "Separados por comas. Ej.: Cariñoso, Juguetón, Tranquilo")}
        <div class="grid-3">${fld("Nivel de energía", sel("energia", d.energia, [["", "No registrado"], ...ENERGIAS.map((x) => [x, x])]))}
          ${fld("¿Compatible con niños?", sel("c_ninos", d.compatibilidad.ninos, SINO))}${fld("¿Con otros perros?", sel("c_perros", d.compatibilidad.perros, SINO))}${fld("¿Con gatos?", sel("c_gatos", d.compatibilidad.gatos, SINO))}</div>
        ${fld("Cuidados o necesidades especiales", `<textarea name="cuidados">${esc(d.cuidados)}</textarea>`)}</fieldset>
      <fieldset class="fieldset"><legend>Ficha médica</legend>
        ${fld("Estado de salud (texto)", inp("saludAfiche", d.saludAfiche))}
        <div class="grid-3">${fld("Última vacuna (fecha)", inp("ultimaVacuna", m.ultimaVacuna, 'placeholder="Ej.: Septiembre 2026 o 15/09/2026"'))}
          ${fld("Desparasitación", inp("desparasitacion", m.desparasitacion, 'placeholder="Ej.: Sí, 10/09/2026"'))}
          ${fld("Esterilización", inp("esterilizacion", m.esterilizacion, 'placeholder="Ej.: Sí / No / Programada"'))}
          ${fld("Próxima vacuna o control", inp("proximoControl", m.proximoControl), "Solo si el veterinario lo indicó.")}</div>
        ${fld("Enfermedades o tratamientos", `<textarea name="condiciones">${esc(m.condiciones)}</textarea>`)}
        <div class="field"><span class="label">Vacunas registradas</span>
          ${m.vacunas.map((v, i) => `<div class="vac-row">${fld("Vacuna", inp("vac_n_" + i, v.nombre, 'placeholder="Ej.: Séxtuple"'))}${fld("Fecha", inp("vac_f_" + i, v.fecha, 'placeholder="dd/mm/aaaa"'))}<button type="button" class="btn btn-ghost btn-sm" data-a="vac-quitar" data-i="${i}">Quitar</button></div>`).join("")}
          <button type="button" class="btn btn-soft btn-sm" data-a="vac-agregar" style="justify-self:start">+ Agregar vacuna</button></div></fieldset>
      <fieldset class="fieldset"><legend>Notas internas por verificar</legend>
        ${fld("Una nota por línea (se muestran en la ficha como “Datos por verificar”)", `<textarea name="notas">${esc((d.notas || []).join("\n"))}</textarea>`)}</fieldset>
      <span class="error-msg" id="dogFormError"></span>
      <div class="toolbar"><button class="btn btn-primary" type="submit" ${A.ocupado ? "disabled" : ""}>${A.ocupado ? "Guardando…" : "Guardar cambios"}</button><button type="button" class="btn btn-ghost" data-a="volver">Cancelar</button></div></form>`;
  }
  function sincronizarBorrador() {
    const f = $("#dogForm"); if (!f || !A.borrador) return;
    const g = (n) => (f.elements[n] ? f.elements[n].value.trim() : "");
    const d = A.borrador;
    Object.assign(d, { nombre: g("nombre"), especie: g("especie"), sexo: g("sexo"), edad: g("edad"), etapa: g("etapa"), raza: g("raza"), tamano: g("tamano"),
      estado: g("estado") || "disponible", destacado: f.elements.destacado.checked, historia: g("historia"), energia: g("energia"), cuidados: g("cuidados"), saludAfiche: g("saludAfiche"),
      rasgos: g("rasgos").split(",").map((s) => s.trim()).filter(Boolean), notas: g("notas").split("\n").map((s) => s.trim()).filter(Boolean) });
    const p = g("pesoKg").replace(",", "."); d.pesoKg = p === "" ? "" : (isNaN(+p) ? p : +p);
    d.compatibilidad = { ninos: g("c_ninos"), perros: g("c_perros"), gatos: g("c_gatos") };
    Object.assign(d.medica, { ultimaVacuna: g("ultimaVacuna"), desparasitacion: g("desparasitacion"), esterilizacion: g("esterilizacion"), proximoControl: g("proximoControl"), condiciones: g("condiciones") });
    d.medica.vacunas = d.medica.vacunas.map((v, i) => ({ nombre: g("vac_n_" + i), fecha: g("vac_f_" + i) }));
  }
  function vistaAlbergue() {
    const c = cfg();
    const fotosOps = [["", "Automática"], ...D.perritos.flatMap((d) => (d.fotos || []).slice(0, 1).map((r) => [r, d.nombre]))];
    return `<form class="panel" id="cfgForm" novalidate><h3>Albergue y contacto</h3>
      <div class="grid-3">${fld("Nombre del albergue", inp("nombre", c.nombre, "required"))}${fld("Subtítulo", inp("lema", c.lema))}
        ${fld("Foto principal (portada)", sel("heroFoto", c.heroFoto || "", fotosOps))}</div>
      ${fld("Descripción (Sobre nosotros)", `<textarea name="descripcion">${esc(c.descripcion)}</textarea>`)}
      <fieldset class="fieldset"><legend>Contacto</legend>
        ${fld("Número de WhatsApp del albergue", inp("whatsapp", c.whatsapp, 'inputmode="tel" placeholder="Código de país + número, sin espacios"'), "Ej. para Perú: 51 seguido de los 9 dígitos del celular. Es el número que recibirá los mensajes del formulario. Déjalo vacío si aún no está definido.")}
        <div class="grid-3">${fld("Instagram / redes", inp("instagram", c.instagram, 'placeholder="@usuario o enlace"'))}${fld("Correo", inp("correo", c.correo, 'type="email"'))}
          ${fld("Ubicación", inp("ubicacion", c.ubicacion))}${fld("Horario de visitas", inp("horario", c.horario))}</div></fieldset>
      <span class="error-msg" id="cfgError"></span>
      <div><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  }
  function vistaStats() {
    const st = cfg().stats || [];
    return `<form class="panel" id="statsForm" novalidate><h3>Estadísticas de impacto</h3>
      <p style="color:var(--muted)">Deja el valor vacío si aún no está confirmado: se mostrará como “pendiente”. “Automático” calcula la cifra desde el catálogo (válido para los indicadores disponibles, proceso, adoptados y total).</p>
      ${st.map((s, i) => `<div class="vac-row">${fld("Etiqueta", inp("s_l_" + i, s.etiqueta))}${fld("Valor", inp("s_v_" + i, s.valor == null ? "" : s.valor, s.auto ? "disabled" : 'inputmode="numeric"'))}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${["disponibles", "proceso", "adoptados", "total"].includes(s.id) ? `<label class="check"><input type="checkbox" name="s_a_${i}" ${s.auto ? "checked" : ""} data-a="stat-auto"> Automático</label>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-a="stat-quitar" data-i="${i}">Quitar</button></div></div>`).join("")}
      <div class="toolbar"><button type="button" class="btn btn-soft btn-sm" data-a="stat-agregar">+ Agregar indicador</button>
        <button type="button" class="btn btn-soft btn-sm" data-a="stat-agregar-auto" data-k="adoptados">+ Adoptados (automático)</button></div>
      <div><button class="btn btn-primary" type="submit">Guardar estadísticas</button></div></form>`;
  }
  function leerStats() {
    const f = $("#statsForm"); const st = (cfg().stats || []).map((s) => Object.assign({}, s));
    st.forEach((s, i) => {
      s.etiqueta = f.elements["s_l_" + i].value.trim() || s.etiqueta;
      const a = f.elements["s_a_" + i]; s.auto = a ? a.checked : false;
      const v = f.elements["s_v_" + i].value.trim(); s.valor = s.auto ? null : v === "" ? null : isNaN(+v) ? v : +v;
    });
    return st;
  }
  function vistaDatos() {
    const json = JSON.stringify({ perritos: D.perritos, config: cfg() }, null, 1);
    const enArtefacto = store.modo === "artifact";
    return `<div class="panel"><h3>Exportar datos (copia de seguridad)</h3>
        <p style="color:var(--muted)">Guarda este texto en un archivo <code>.json</code> como respaldo, o para pasar tus datos de un modo de almacenamiento a otro.${enArtefacto ? " Las fotos subidas en esta página no se incluyen (solo su referencia)." : ""}</p>
        <textarea class="code" id="exportText" readonly>${esc(json)}</textarea>
        <div class="toolbar"><button class="btn btn-soft btn-sm" data-a="exp-copiar">Copiar</button>${enArtefacto ? "" : `<button class="btn btn-soft btn-sm" data-a="exp-descargar">Descargar .json</button>`}</div></div>
      <div class="panel"><h3>Importar datos</h3><p style="color:var(--muted)">Pega aquí un respaldo exportado o elige el archivo. <strong>Reemplaza todos los perritos y la configuración.</strong></p>
        <input type="file" accept=".json,application/json" id="importFile"><textarea class="code" id="importText" placeholder='{"perritos":[...],"config":{...}}'></textarea>
        <span class="error-msg" id="importError"></span>
        <div class="toolbar">${A.confirmar === "importar" ? `<span class="confirm-inline">Esto reemplaza todo. ¿Continuar? <button class="btn btn-danger btn-sm" data-a="imp-si">Sí, importar</button><button class="btn btn-ghost btn-sm" data-a="borrar-no">Cancelar</button></span>` : `<button class="btn btn-primary btn-sm" data-a="imp">Importar</button>`}</div></div>
      <div class="panel"><h3>Restaurar registros iniciales</h3><p style="color:var(--muted)">Vuelve a cargar los 18 registros extraídos de los afiches del ZIP y la configuración inicial. Se perderán los cambios hechos.</p>
        <div>${A.confirmar === "restaurar" ? `<span class="confirm-inline">¿Seguro? <button class="btn btn-danger btn-sm" data-a="rest-si">Sí, restaurar</button><button class="btn btn-ghost btn-sm" data-a="borrar-no">Cancelar</button></span>` : `<button class="btn btn-ghost btn-sm" data-a="rest">Restaurar registros iniciales</button>`}</div></div>`;
  }
  function validarImport(o) {
    if (!o || !Array.isArray(o.perritos)) throw new Error("El archivo no tiene la lista “perritos”.");
    o.perritos.forEach((d, i) => { if (!d || !d.id || !d.nombre) throw new Error("El registro #" + (i + 1) + " no tiene id o nombre."); d.medica = d.medica || { vacunas: [] }; d.fotos = d.fotos || []; });
    return o;
  }
  async function ejecutar(fn, ok) {
    A.ocupado = true; renderAdmin();
    try { await fn(); if (ok) toast(ok); return true; }
    catch (e) { toast(e.message || "Ocurrió un error al guardar.", "error"); return false; }
    finally { A.ocupado = false; renderAdmin(); }
  }

  // Eventos del panel (delegados)
  $("#adminRoot").addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tab]"); if (t) { sincronizarBorrador(); A.tab = t.dataset.tab; A.confirmar = null; renderAdmin(); return; }
    const b = e.target.closest("[data-a]"); if (!b || b.tagName === "INPUT") return;
    const a = b.dataset.a, id = b.dataset.id, i = +b.dataset.i;
    if (a === "cerrar") return cerrarAdmin();
    if (a === "logout") { await store.logout(); renderAdmin(); return; }
    if (a === "nuevo") { A.editando = "nuevo"; A.borrador = perritoVacio(); return renderAdmin(); }
    if (a === "editar") { const d = D.perritos.find((x) => x.id === id); A.editando = id; A.borrador = Object.assign(perritoVacio(), JSON.parse(JSON.stringify(d))); A.borrador.medica = Object.assign(perritoVacio().medica, A.borrador.medica); A.borrador.compatibilidad = Object.assign({ ninos: "", perros: "", gatos: "" }, A.borrador.compatibilidad); return renderAdmin(); }
    if (a === "volver") { A.editando = null; A.borrador = null; return renderAdmin(); }
    if (a === "borrar") { A.confirmar = id; return renderAdmin(); }
    if (a === "borrar-no") { A.confirmar = null; return renderAdmin(); }
    if (a === "borrar-si") { A.confirmar = null; const n = (D.perritos.find((x) => x.id === id) || {}).nombre; return ejecutar(() => store.eliminarPerrito(id), `Se eliminó a ${n}.`); }
    if (a === "cargar-iniciales" || a === "rest-si") { A.confirmar = null; return ejecutar(() => store.importar(window.Almacenamiento.iniciales()), "Registros iniciales cargados."); }
    if (a === "rest") { A.confirmar = "restaurar"; return renderAdmin(); }
    if (a === "vac-agregar") { sincronizarBorrador(); A.borrador.medica.vacunas.push({ nombre: "", fecha: "" }); return renderAdmin(); }
    if (a === "vac-quitar") { sincronizarBorrador(); A.borrador.medica.vacunas.splice(i, 1); return renderAdmin(); }
    if (a === "foto-principal") { sincronizarBorrador(); const f = A.borrador.fotos.splice(i, 1)[0]; A.borrador.fotos.unshift(f); return renderAdmin(); }
    if (a === "foto-quitar") { sincronizarBorrador(); A.borrador.fotos.splice(i, 1); return renderAdmin(); }
    if (a === "stat-agregar" || a === "stat-agregar-auto") {
      const c = JSON.parse(JSON.stringify(cfg())); c.stats = $("#statsForm") ? leerStats() : c.stats || [];
      c.stats.push(a === "stat-agregar" ? { id: "s" + Date.now(), etiqueta: "Nuevo indicador", valor: null, auto: false } : { id: "adoptados", etiqueta: "Perritos adoptados (catálogo)", valor: null, auto: true });
      D.config = c; return renderAdmin(); // se guarda al pulsar "Guardar estadísticas"
    }
    if (a === "stat-quitar") { const c = JSON.parse(JSON.stringify(cfg())); c.stats = leerStats(); c.stats.splice(i, 1); D.config = c; return renderAdmin(); }
    if (a === "exp-copiar") return copiar($("#exportText").value, $("#exportText"));
    if (a === "exp-descargar") {
      const url = URL.createObjectURL(new Blob([$("#exportText").value], { type: "application/json" }));
      const l = document.createElement("a"); l.href = url; l.download = "perritos-respaldo-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (a === "imp") { try { validarImport(JSON.parse($("#importText").value)); A.confirmar = "importar"; A._import = $("#importText").value; renderAdmin(); $("#importText").value = A._import; } catch (err) { $("#importError").textContent = "No se puede importar: " + (err.message || "JSON inválido"); } return; }
    if (a === "imp-si") { A.confirmar = null; let o; try { o = validarImport(JSON.parse(A._import)); } catch (err) { toast(err.message, "error"); return renderAdmin(); } return ejecutar(() => store.importar(o), "Datos importados."); }
  });
  $("#adminRoot").addEventListener("change", async (e) => {
    if (e.target.matches("[data-a='stat-auto']")) { const c = JSON.parse(JSON.stringify(cfg())); c.stats = leerStats(); D.config = c; return renderAdmin(); }
    if (e.target.name === "estadoRapido") {
      const d = D.perritos.find((x) => x.id === e.target.dataset.id); if (!d) return;
      const nuevo = Object.assign({}, d, { estado: e.target.value, actualizado: new Date().toISOString() });
      return ejecutar(() => store.guardarPerrito(nuevo), `${d.nombre}: ${ESTADOS[nuevo.estado]}.`);
    }
    if (e.target.id === "fotoInput") {
      const files = [...e.target.files]; if (!files.length) return;
      sincronizarBorrador();
      await ejecutar(async () => { for (const f of files) A.borrador.fotos.push(await store.subirFoto(f)); }, files.length > 1 ? "Fotos agregadas. Pulsa “Guardar cambios”." : "Foto agregada. Pulsa “Guardar cambios”.");
      return;
    }
    if (e.target.id === "importFile") { const f = e.target.files[0]; if (f) $("#importText").value = await f.text(); }
  });
  $("#adminRoot").addEventListener("input", (e) => { if (e.target.id === "admFiltro") { A.filtro = e.target.value; const pos = e.target.selectionStart; renderAdmin(); const n = $("#admFiltro"); n.focus(); n.setSelectionRange(pos, pos); } });
  $("#adminRoot").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (e.target.id === "loginForm") { const f = e.target; A.loginEmail = f.elements.email.value.trim(); return ejecutar(() => store.login(f.elements.email.value.trim(), f.elements.pass.value), "Sesión iniciada."); }
    if (e.target.id === "dogForm") {
      sincronizarBorrador(); const d = A.borrador;
      if (!d.nombre) { $("#dogFormError").textContent = "El nombre es obligatorio."; e.target.elements.nombre.focus(); return; }
      if (d.pesoKg !== "" && (typeof d.pesoKg !== "number" || d.pesoKg <= 0 || d.pesoKg > 100)) { $("#dogFormError").textContent = "El peso debe ser un número en kg (ej.: 7.5)."; e.target.elements.pesoKg.focus(); return; }
      if (A.editando === "nuevo") { let base = slug(d.nombre), id = base, n = 2; while (D.perritos.some((x) => x.id === id)) id = base + "-" + n++; d.id = id; }
      d.medica.vacunas = d.medica.vacunas.filter((v) => v.nombre || v.fecha);
      d.actualizado = new Date().toISOString();
      const original = D.perritos.find((x) => x.id === d.id);
      const quitadas = original ? (original.fotos || []).filter((r) => !d.fotos.includes(r)) : [];
      const ok = await ejecutar(async () => { await store.guardarPerrito(d); for (const r of quitadas) await store.quitarFoto(r); }, `Se guardó a ${d.nombre}.`);
      if (ok) { A.editando = null; A.borrador = null; renderAdmin(); }
      return;
    }
    if (e.target.id === "cfgForm") {
      const f = e.target, g = (n) => f.elements[n].value.trim();
      const wa = g("whatsapp").replace(/[\s()+-]/g, "");
      if (wa && !/^\d{8,15}$/.test(wa)) { $("#cfgError").textContent = "El WhatsApp debe tener solo dígitos, con código de país (8 a 15 dígitos)."; return; }
      if (!g("nombre")) { $("#cfgError").textContent = "El nombre del albergue es obligatorio."; return; }
      const c = Object.assign({}, cfg(), { nombre: g("nombre"), lema: g("lema"), heroFoto: g("heroFoto"), descripcion: g("descripcion"), whatsapp: wa, instagram: g("instagram"), correo: g("correo"), ubicacion: g("ubicacion"), horario: g("horario") });
      return ejecutar(() => store.guardarConfig(c), "Datos del albergue guardados.");
    }
    if (e.target.id === "statsForm") { const c = Object.assign({}, cfg(), { stats: leerStats() }); return ejecutar(() => store.guardarConfig(c), "Estadísticas guardadas."); }
  });

  /* ================= ARRANQUE ================= */
  function aplicarDatos(nuevo, error) {
    if (error) { toast(error, "error"); return; }
    if (!nuevo) return;
    const ini = window.Almacenamiento.iniciales();
    D = { perritos: (nuevo.perritos || []).map((d) => Object.assign({ fotos: [], rasgos: [], medica: { vacunas: [] }, compatibilidad: {} }, d)), config: Object.assign({}, ini.config, nuevo.config || {}) };
    cargado = true;
    renderSitio(); renderFiltros(); renderCatalogo(); renderSelectPerritos();
    if (A.abierto && !A.editando) renderAdmin();
    $("#adminOpen").hidden = !(store && store.puedeAdministrar());
    if (store && !aplicarDatos._hash) { aplicarDatos._hash = true; abrirDesdeHash(); }
  }
  function abrirDesdeHash() {
    const h = location.hash.slice(1);
    if (h === "admin") abrirAdmin();
    else if (h.startsWith("perrito-")) abrirFicha(h.slice(8));
  }
  window.addEventListener("hashchange", () => { if (location.hash === "#admin") abrirAdmin(); });

  orden = ls.get("patas.orden") || "orden"; $("#sort").value = ORDENES[orden] ? orden : "orden";
  window.Almacenamiento.crear(aplicarDatos).then((s) => {
    store = s;
    const banner = $("#modeBanner");
    const msgs = [];
    if (s.avisoExtra) msgs.push(s.avisoExtra);
    if (s.modo === "local") msgs.push("Modo local: los cambios del panel se guardan solo en este navegador." + (s.persistente === false ? " Este navegador no permite guardar datos." : ""));
    if (s.modo === "lectura") msgs.push(s.descripcion);
    if (msgs.length) { banner.hidden = false; banner.textContent = msgs.join(" "); }
    if (cargado) { renderSitio(); renderCatalogo(); renderSelectPerritos(); $("#adminOpen").hidden = !s.puedeAdministrar(); if (!aplicarDatos._hash) { aplicarDatos._hash = true; abrirDesdeHash(); } }
    // Por si el primer snapshot llegó antes de tener `store` (para resolver fotos):
    else setTimeout(() => { if (cargado) { renderSitio(); renderCatalogo(); } }, 0);
  });
  // Pinta la estructura mientras cargan los datos
  $("#resultsCount").textContent = "Cargando perritos…";
  renderWaNota();
})();
