/* ==========================================================
   NUEVO PELUDITO — formulario sencillo para la dueña del albergue.
   Está dentro del acceso del albergue (requiere iniciar sesión).
   Fotos + nombre + peso + lo básico → se publica al instante.
   También pinta la sección pública "Recién llegados".
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoy = () => { const t = new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
  const DIAS_RECIEN = 45;
  const CLAVE = "happytails.borradorNuevo";

  const RASGOS = [["Cariñoso", "Cariñosa"], ["Tranquilo", "Tranquila"], ["Juguetón", "Juguetona"], ["Dulce", "Dulce"], ["Noble", "Noble"], ["Amoroso", "Amorosa"],
    ["Lleno de energía", "Llena de energía"], ["Tímido", "Tímida"], ["Sociable", "Sociable"], ["Protector", "Protectora"], ["Independiente", "Independiente"]];
  const etiquetaRasgo = ([m, f]) => (m === f ? m : m + (f.endsWith("a") && f.slice(0, -1) === m.slice(0, -1) ? "/a" : " / " + f));

  const vacio = () => ({ fotos: [], nombre: "", especie: "Perro", sexo: "", pesoKg: "", sinPeso: false, tamano: "", etapa: "", edad: "", rasgos: [], energia: "",
    vacunado: "", vacunaCuando: "", desparasitado: "", esterilizado: "", salud: "", historia: "", fechaIngreso: hoy() });
  let R = cargar();
  let paso = "form", guardado = null, subiendo = 0, error = "";

  function cargar() { try { const v = JSON.parse(localStorage.getItem(CLAVE)); if (v && typeof v === "object") return Object.assign(vacio(), v); } catch (e) {} return vacio(); }
  function persistir() { try { localStorage.setItem(CLAVE, JSON.stringify(R)); } catch (e) {} }
  function limpiar() { R = vacio(); try { localStorage.removeItem(CLAVE); } catch (e) {} }

  const chips = (campo, ops, multi) => `<div class="chips reg-chips">${ops.map(([v, l]) => {
    const on = multi ? R[campo].includes(v) : R[campo] === v;
    return `<button type="button" class="chip" data-rc="${campo}" data-v="${esc(v)}" ${multi ? 'data-multi="1"' : ""} aria-pressed="${on}">${esc(l)}</button>`; }).join("")}</div>`;
  const paso_ = (n, titulo, ayuda, cuerpo) => `<section class="reg-paso"><div class="reg-num" aria-hidden="true">${n}</div><div class="reg-cont"><h4>${titulo}</h4>${ayuda ? `<p class="reg-ayuda">${ayuda}</p>` : ""}${cuerpo}</div></section>`;

  function borradorPerrito() {
    const H = window.HT, hembra = R.sexo === "Hembra";
    const rasgos = R.rasgos.map((m) => { const r = RASGOS.find((x) => x[0] === m); return r ? (hembra ? r[1] : r[0]) : m; });
    const lista = H.datos().perritos;
    const ordenMin = lista.reduce((a, d) => Math.min(a, +d.orden || 0), 1);
    const p = String(R.pesoKg).replace(",", ".");
    return {
      id: "", nombre: R.nombre.trim(), especie: R.especie, sexo: R.sexo, pesoKg: R.sinPeso || p === "" ? "" : +p, tamano: R.tamano, edad: R.edad.trim(), etapa: R.etapa,
      raza: "", energia: R.energia, rasgos, compatibilidad: { ninos: "", perros: "", gatos: "" }, historia: R.historia.trim(), cuidados: "", saludAfiche: R.salud.trim(),
      medica: { ultimaVacuna: R.vacunado === "Sí" ? (R.vacunaCuando.trim() || "Sí (fecha por confirmar)") : R.vacunado === "No" ? "" : "", vacunas: [],
        desparasitacion: R.desparasitado, esterilizacion: R.esterilizado, condiciones: "", proximoControl: "" },
      estado: "disponible", destacado: false, apadrinado: false, fotos: R.fotos.slice(), archivoOriginal: "", fechaIngreso: R.fechaIngreso || hoy(),
      fuente: "Registrado por el albergue (formulario «Nuevo peludito»)", notas: R.vacunado === "No" ? ["Aún no está vacunado según el albergue."] : [], orden: ordenMin - 1,
    };
  }

  function vista() {
    const H = window.HT;
    if (paso === "ok" && guardado) return `<div class="panel reg-ok">
      <div class="reg-ok-foto"><img src="${esc(H.fotoRef(guardado.foto) || "")}" alt=""></div>
      <h3>🎉 ¡${esc(guardado.nombre)} ya está en la página!</h3>
      <p>Ya aparece en el catálogo y en “Recién llegados”, y también puede salir en la Cita a ciegas. Cualquier persona que abra la página lo verá.</p>
      <div class="reg-acciones"><button class="btn btn-primary" data-r="ver">Ver su ficha</button><button class="btn btn-soft" data-r="otro">+ Registrar otro peludito</button>
        <button class="btn btn-ghost" data-r="lista">Editar más detalles</button></div></div>`;
    const prev = Object.assign(borradorPerrito(), { nombre: R.nombre.trim() || "Su nombre" });
    const art = R.sexo === "Hembra" ? "a" : "o";
    return `<div class="reg-wrap">
      <form class="panel reg-form" id="regForm" novalidate>
        <div class="reg-intro"><h3>🐶 Registrar un nuevo peludito</h3>
          <p>Llena lo que sepas y presiona <strong>Publicar</strong>. Lo que no sepas, déjalo en blanco: la página dirá “pendiente de confirmar”. Tus avances se guardan en este equipo por si se corta la conexión.</p></div>

        ${paso_(1, "Sus fotos", "Fotos claras, de día, donde se vea su carita. La primera será la principal.",
          `<div class="reg-fotos">${R.fotos.map((r, i) => `<div class="reg-foto"><img src="${esc(H.fotoRef(r))}" alt="Foto ${i + 1}">${i === 0 ? '<span class="reg-principal">Principal</span>' : `<button type="button" data-r="principal" data-i="${i}">Hacer principal</button>`}<button type="button" class="reg-x" data-r="quitar" data-i="${i}" aria-label="Quitar foto ${i + 1}">✕</button></div>`).join("")}
            <label class="upload-box reg-subir">${subiendo ? `Subiendo ${subiendo} foto${subiendo > 1 ? "s" : ""}…` : "📷<br><strong>Tomar o elegir fotos</strong>"}<input type="file" accept="image/*" multiple class="sr-only" id="regFotos" ${subiendo ? "disabled" : ""}></label></div>
          <span class="error-msg" id="reg-e-fotos"></span>`)}

        ${paso_(2, "¿Cómo se llama?", "", `<input class="reg-input" id="reg-nombre" data-rf="nombre" value="${esc(R.nombre)}" maxlength="40" placeholder="Ej.: Rocky" autocomplete="off"><span class="error-msg" id="reg-e-nombre"></span>
          <div class="reg-fila"><div><span class="label">Es un</span>${chips("especie", [["Perro", "🐕 Perro"], ["Gato", "🐈 Gato"]])}</div>
          <div><span class="label">Sexo</span>${chips("sexo", [["Macho", "♂ Macho"], ["Hembra", "♀ Hembra"], ["", "No sé"]])}</div></div>`)}

        ${paso_(3, "¿Cuánto pesa?", "Truco: súbete a la balanza cargándolo y luego réstale tu propio peso.",
          `<div class="reg-peso"><input class="reg-input" id="reg-peso" data-rf="pesoKg" value="${esc(R.pesoKg)}" inputmode="decimal" placeholder="Ej.: 8.5" ${R.sinPeso ? "disabled" : ""}><span>kg</span></div>
          <label class="check"><input type="checkbox" data-rf="sinPeso" ${R.sinPeso ? "checked" : ""}> <span>Todavía no lo he pesado</span></label><span class="error-msg" id="reg-e-peso"></span>
          <div><span class="label">Tamaño</span>${chips("tamano", [["Pequeño", "Pequeño"], ["Mediano", "Mediano"], ["Grande", "Grande"], ["", "No sé"]])}</div>`)}

        ${paso_(4, "¿Qué edad tiene más o menos?", "", `${chips("etapa", [["Cachorro", "Cachorro"], ["Joven", "Joven"], ["Adulto", "Adulto"], ["Senior", "Abuelito"], ["", "No sé"]])}
          <input class="reg-input" data-rf="edad" value="${esc(R.edad)}" placeholder="Opcional, ej.: unos 2 años" maxlength="40">`)}

        ${paso_(5, `¿Cómo es su carácter?`, "Marca todas las que le queden. Esto ayuda a que la Cita a ciegas le encuentre la familia ideal.",
          `${chips("rasgos", RASGOS.map((r) => [r[0], etiquetaRasgo(r)]), true)}
          <div><span class="label">Energía</span>${chips("energia", [["Baja", "😴 Baja"], ["Media", "🙂 Media"], ["Alta", "⚡ Alta"], ["", "No sé"]])}</div>`)}

        ${paso_(6, "Su salud", "Solo lo que sepas con seguridad.",
          `<div class="reg-salud">
            <div><span class="label">¿Vacunad${art}?</span>${chips("vacunado", [["Sí", "Sí"], ["No", "No"], ["", "No sé"]])}${R.vacunado === "Sí" ? `<input class="reg-input" data-rf="vacunaCuando" value="${esc(R.vacunaCuando)}" placeholder="¿Cuándo? Ej.: Octubre 2026 (opcional)">` : ""}</div>
            <div><span class="label">¿Desparasitad${art}?</span>${chips("desparasitado", [["Sí", "Sí"], ["No", "No"], ["", "No sé"]])}</div>
            <div><span class="label">¿Esterilizad${art}?</span>${chips("esterilizado", [["Sí", "Sí"], ["No", "No"], ["", "No sé"]])}</div></div>
          <input class="reg-input" data-rf="salud" value="${esc(R.salud)}" placeholder="¿Cómo está de salud? Ej.: sano, en recuperación de una patita (opcional)" maxlength="160">`)}

        ${paso_(7, "Cuéntanos su historia 💛", "Esto es lo que más conmueve a quien piensa en adoptar. ¿Cómo llegó? ¿Qué le gusta? ¿Qué lo hace especial?",
          `<textarea class="reg-input" data-rf="historia" rows="4" maxlength="900" placeholder="Ej.: Lo encontramos bajo la lluvia cerca del mercado. Al principio tenía miedo, pero ahora corre a saludarnos cada mañana y le encanta dormir al sol.">${esc(R.historia)}</textarea>
          <div class="reg-fila"><label class="reg-fecha"><span class="label">¿Cuándo llegó al albergue?</span><input type="date" class="reg-input" data-rf="fechaIngreso" value="${esc(R.fechaIngreso)}" max="${hoy()}"></label></div>`)}

        ${error ? `<div class="note">⚠️ <span>${esc(error)}</span></div>` : ""}
        <div class="reg-enviar"><button class="btn btn-primary btn-lg" type="submit" ${subiendo ? "disabled" : ""}>🐾 Publicar en la página</button>
          <button type="button" class="btn btn-ghost btn-sm" data-r="limpiar">Empezar de nuevo</button></div>
      </form>
      <aside class="reg-preview" aria-label="Vista previa">
        <span class="label">Así se verá en la página</span>
        <div class="reg-card" inert>${H.tarjeta(prev)}</div>
        <p class="reg-ayuda">La tarjeta se actualiza mientras llenas el formulario.</p>
      </aside></div>`;
  }

  function refrescar() { if (window.HT) window.HT.renderAdmin(); }
  function refrescarPreview() { const c = $(".reg-card"); if (c && window.HT) c.innerHTML = window.HT.tarjeta(Object.assign(borradorPerrito(), { nombre: R.nombre.trim() || "Su nombre" })); }

  async function subirFotos(files) {
    const store = window.HT.store(); error = "";
    subiendo = files.length; refrescar();
    for (const f of files) {
      if (!/^image\//.test(f.type)) { error = `“${f.name}” no es una imagen.`; subiendo--; continue; }
      try { R.fotos.push(await store.subirFoto(f)); persistir(); }
      catch (e) { error = "No se pudo subir una foto: " + (e.message || e) + ". Revisa tu conexión e inténtalo otra vez."; }
      subiendo--; refrescar();
    }
    subiendo = 0; refrescar();
  }

  async function publicar() {
    const H = window.HT; error = "";
    const p = String(R.pesoKg).replace(",", ".").trim();
    const errs = {
      fotos: R.fotos.length ? "" : "Agrega al menos una foto: es lo primero que mira quien quiere adoptar.",
      nombre: R.nombre.trim() ? "" : "Escribe su nombre.",
      peso: R.sinPeso ? "" : p === "" ? "Escribe su peso o marca “Todavía no lo he pesado”." : (isNaN(+p) || +p <= 0 || +p > 100) ? "El peso debe ser un número en kilos, por ejemplo 8.5" : "",
    };
    Object.entries(errs).forEach(([k, v]) => { const el = $("#reg-e-" + k); if (el) el.textContent = v; });
    const primero = Object.keys(errs).find((k) => errs[k]);
    if (primero) { const el = $("#reg-e-" + primero); el && el.closest(".reg-paso").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    const d = borradorPerrito();
    let base = H.slug(d.nombre), id = base, n = 2; while (H.datos().perritos.some((x) => x.id === id)) id = base + "-" + n++;
    d.id = id; d.actualizado = new Date().toISOString();
    const ok = await H.ejecutar(() => H.store().guardarPerrito(d), `¡${d.nombre} ya está publicad${d.sexo === "Hembra" ? "a" : "o"}!`);
    if (ok) { guardado = { id: d.id, nombre: d.nombre, foto: d.fotos[0] }; paso = "ok"; limpiar(); refrescar(); const top = $("#adminRoot .admin"); top && top.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  /* -------- Eventos (solo dentro del formulario) -------- */
  document.addEventListener("input", (e) => {
    const f = e.target.closest("#regForm [data-rf]"); if (!f) return;
    const k = f.dataset.rf; R[k] = f.type === "checkbox" ? f.checked : f.value; persistir();
    if (k === "sinPeso") { const pi = $("#reg-peso"); if (pi) pi.disabled = f.checked; }
    const em = { nombre: "reg-e-nombre", pesoKg: "reg-e-peso", sinPeso: "reg-e-peso" }[k]; if (em && $("#" + em)) $("#" + em).textContent = "";
    refrescarPreview();
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "regFotos" && e.target.files.length) { const files = [...e.target.files]; e.target.value = ""; const em = $("#reg-e-fotos"); if (em) em.textContent = ""; subirFotos(files); return; }
    const f = e.target.closest("#regForm [data-rf]"); if (f && f.type === "checkbox") { R[f.dataset.rf] = f.checked; persistir(); }
  });
  document.addEventListener("click", (e) => {
    const c = e.target.closest("#regForm [data-rc]");
    if (c) { const k = c.dataset.rc, v = c.dataset.v;
      if (c.dataset.multi) R[k] = R[k].includes(v) ? R[k].filter((x) => x !== v) : R[k].concat(v); else R[k] = v;
      persistir(); refrescar(); return; }
    const b = e.target.closest("#adminRoot [data-r]"); if (!b) return;
    const a = b.dataset.r, i = +b.dataset.i;
    if (a === "quitar") { R.fotos.splice(i, 1); persistir(); return refrescar(); }
    if (a === "principal") { R.fotos.unshift(R.fotos.splice(i, 1)[0]); persistir(); return refrescar(); }
    if (a === "limpiar") { if (b.dataset.seguro) { limpiar(); error = ""; return refrescar(); } b.dataset.seguro = "1"; b.textContent = "¿Seguro? Toca otra vez para borrar el formulario"; return; }
    if (a === "otro") { paso = "form"; guardado = null; return refrescar(); }
    if (a === "lista") { paso = "form"; const g = guardado; guardado = null; window.HT.irATab("perritos"); return g; }
    if (a === "ver") { const id = guardado && guardado.id; paso = "form"; guardado = null; window.HT.cerrarAdmin(); if (id) setTimeout(() => window.HT.abrirFicha(id), 50); }
  });
  document.addEventListener("submit", (e) => { if (e.target.id === "regForm") { e.preventDefault(); publicar(); } });

  /* -------- Sección pública "Recién llegados" -------- */
  function recientes() {
    return window.HT.datos().perritos.filter((d) => {
      if (!d.fechaIngreso || d.estado === "adoptado") return false;
      const t = new Date(d.fechaIngreso + "T12:00:00"); return !isNaN(t) && (Date.now() - t) / 864e5 <= DIAS_RECIEN;
    }).sort((a, b) => String(b.fechaIngreso).localeCompare(String(a.fechaIngreso)));
  }
  function renderRecien() {
    const sec = $("#recien"), row = $("#recienRow"); if (!sec || !row || !window.HT) return;
    const l = recientes(); sec.hidden = !l.length;
    row.innerHTML = l.map((d) => window.HT.tarjeta(d)).join("");
  }
  document.addEventListener("ht:datos", renderRecien);

  window.HT_REG = { vista };
})();
