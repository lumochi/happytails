/* ==========================================================
   ALMACENAMIENTO — elige automáticamente dónde se guardan los datos
   1) "artifact": base de datos del artefacto de Claude (si existe)
   2) "supabase": base de datos compartida (si config.js está lleno)
   3) "local":    localStorage de ESTE navegador (opción limitada)
   4) "lectura":  solo muestra los registros iniciales
   Todos exponen la misma interfaz, usada por app.js:
     modo, descripcion, puedeAdministrar(), necesitaLogin, sesion,
     login(), logout(), guardarPerrito(), eliminarPerrito(),
     guardarConfig(), subirFoto(), resolverFoto(), importar()
   ========================================================== */
(function () {
  "use strict";
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const iniciales = () => copia(window.DATOS_INICIALES || { perritos: [], config: {} });

  /* ---- Reducir y comprimir una foto en el navegador ---- */
  function leerImagen(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error("El archivo no es una imagen (usa JPG, PNG o WEBP)."));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No se pudo leer la imagen.")); };
      img.src = url;
    });
  }
  function aCanvas(img, max) {
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  async function fotoComoDataURL(file, max, calidad, limite) {
    const img = await leerImagen(file);
    let m = max, q = calidad, data;
    for (let i = 0; i < 6; i++) {
      data = aCanvas(img, m).toDataURL("image/jpeg", q);
      if (!limite || data.length <= limite) return data;
      m = Math.round(m * 0.8); q = Math.max(0.5, q - 0.08);
    }
    throw new Error("La foto es demasiado grande incluso comprimida.");
  }
  async function fotoComoBlob(file, max, calidad) {
    const img = await leerImagen(file);
    return new Promise((res) => aCanvas(img, max).toBlob(res, "image/jpeg", calidad));
  }

  /* ================= 1) Artefacto de Claude ================= */
  async function adaptadorArtifact(alCambiar) {
    if (!window.claude || typeof window.claude.use !== "function") return null;
    const db = await window.claude.use("db");
    if (!db) return null;
    const user = await window.claude.use("user");
    let admin = false;
    try { admin = user ? await user.canEdit() : false; } catch (e) { admin = false; }

    const estado = { perritos: new Map(), config: null, fotos: new Map(), listo: { p: false, c: false, f: false } };
    const emitir = () => {
      if (!(estado.listo.p && estado.listo.c && estado.listo.f)) return;
      alCambiar({ perritos: [...estado.perritos.values()], config: estado.config, vacio: estado.perritos.size === 0 && !estado.config });
    };
    const err = (e) => alCambiar(null, mensajeError(e));
    db.collection("perritos").onSnapshot((s) => {
      estado.perritos = new Map(s.docs.map((d) => [d.id, Object.assign({}, d.data(), { id: d.id })]));
      estado.listo.p = true; emitir();
    }, err);
    db.doc("config/sitio").onSnapshot((s) => { estado.config = s.exists ? s.data() : null; estado.listo.c = true; emitir(); }, err);
    db.collection("fotosSubidas").onSnapshot((s) => {
      estado.fotos = new Map(s.docs.map((d) => [d.id, (d.data() || {}).data]));
      estado.listo.f = true; emitir();
    }, err);

    function mensajeError(e) {
      const c = e && e.code;
      if (c === "permission_denied") return "No tienes permiso para guardar cambios en esta página.";
      if (c === "resource_exhausted") return "Se alcanzó el límite de la base de datos. Intenta con menos datos o fotos más pequeñas.";
      if (c === "unavailable") return "La base de datos no está disponible en este momento. Recarga la página.";
      return "No se pudo completar la operación" + (c ? " (" + c + ")" : "") + ".";
    }
    const envolver = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw new Error(e && e.code ? mensajeError(e) : (e.message || String(e))); } };

    return {
      modo: "artifact",
      descripcion: "Base de datos compartida del artefacto: los cambios se guardan en línea y los ven todas las personas que abren esta página. Solo quienes tienen permiso de edición del artefacto pueden administrar.",
      necesitaLogin: false, sesion: true,
      puedeAdministrar: () => admin,
      guardarPerrito: envolver(async (d) => { await db.collection("perritos").doc(d.id).set(copia(d)); }),
      eliminarPerrito: envolver(async (id) => {
        const d = estado.perritos.get(id);
        await db.collection("perritos").doc(id).delete();
        for (const ref of (d && d.fotos) || []) if (ref.startsWith("db:")) await db.collection("fotosSubidas").doc(ref.slice(3)).delete();
      }),
      quitarFoto: envolver(async (ref) => { if (ref.startsWith("db:")) await db.collection("fotosSubidas").doc(ref.slice(3)).delete(); }),
      guardarConfig: envolver(async (c) => { await db.doc("config/sitio").set(copia(c)); }),
      subirFoto: envolver(async (file) => {
        const data = await fotoComoDataURL(file, 900, 0.82, 230000);
        const ref = db.collection("fotosSubidas").doc();
        await ref.set({ data, creado: new Date().toISOString() });
        return "db:" + ref.id;
      }),
      resolverFoto: (ref) => (ref && ref.startsWith("db:") ? estado.fotos.get(ref.slice(3)) || "" : ref || ""),
      importar: envolver(async (datos) => {
        for (const d of datos.perritos) await db.collection("perritos").doc(d.id).set(copia(d));
        const nuevos = new Set(datos.perritos.map((d) => d.id));
        for (const id of [...estado.perritos.keys()]) if (!nuevos.has(id)) await db.collection("perritos").doc(id).delete();
        if (datos.config) await db.doc("config/sitio").set(copia(datos.config));
      }),
    };
  }

  /* ================= 2) Supabase ================= */
  function cargarScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = src; s.onload = res;
      s.onerror = () => rej(new Error("No se pudo cargar la librería de Supabase.")); document.head.appendChild(s);
    });
  }
  async function adaptadorSupabase(alCambiar) {
    const cfg = (window.CONFIG_SITIO || {}).supabase || {};
    if (!cfg.url || !cfg.anonKey) return null;
    await cargarScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    let sesion = (await sb.auth.getSession()).data.session;
    const comprobar = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

    let yaCargo = false;
    const conTiempo = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error("la base de datos no responde")), ms))]);
    async function recargar() {
      try {
        const ps = comprobar(await conTiempo(sb.from("perritos").select("id, datos"), 8000));
        const cs = comprobar(await conTiempo(sb.from("sitio").select("datos").eq("id", "config").maybeSingle(), 8000));
        yaCargo = true;
        const perritos = ps.map((r) => Object.assign({}, r.datos, { id: r.id }));
        if (perritos.length === 0 && !cs) {
          // Base aún vacía: se muestran los registros iniciales (sin guardar) hasta que el administrador los cargue.
          const ini = iniciales();
          alCambiar({ perritos: ini.perritos, config: ini.config, vacio: true });
          return;
        }
        alCambiar({ perritos, config: cs ? cs.datos : null, vacio: perritos.length === 0 && !cs });
      } catch (e) {
        console.warn("Supabase:", e);
        if (!yaCargo) {
          // Respaldo: si la base en línea no responde, se muestran las fichas incluidas en la web (sin guardar).
          const ini = iniciales();
          alCambiar({ perritos: ini.perritos, config: ini.config, vacio: false,
            aviso: "Estamos mostrando las fichas guardadas en la web porque la base de datos en línea no respondió. Los perritos registrados recientemente pueden no aparecer por ahora." });
        } else alCambiar(null, "No se pudo leer Supabase: " + e.message);
      }
    }
    const a = {
      modo: "supabase",
      descripcion: "Base de datos Supabase compartida: los cambios se guardan en línea y se ven desde cualquier dispositivo. Para administrar debes iniciar sesión con un usuario autorizado.",
      necesitaLogin: true,
      get sesion() { return !!sesion; },
      puedeAdministrar: () => true, // el panel muestra login; los permisos reales los aplica RLS en Supabase
      async login(email, pass) { const r = await sb.auth.signInWithPassword({ email, password: pass }); if (r.error) throw new Error("No se pudo iniciar sesión: " + r.error.message); sesion = r.data.session; },
      async logout() { await sb.auth.signOut(); sesion = null; },
      async guardarPerrito(d) { comprobar(await sb.from("perritos").upsert({ id: d.id, datos: copia(d), actualizado: new Date().toISOString() })); await recargar(); },
      async eliminarPerrito(id) { comprobar(await sb.from("perritos").delete().eq("id", id)); await recargar(); },
      async quitarFoto() { /* las fotos quedan en el bucket; puedes borrarlas desde Supabase → Storage */ },
      async guardarConfig(c) { comprobar(await sb.from("sitio").upsert({ id: "config", datos: copia(c) })); await recargar(); },
      async subirFoto(file) {
        const blob = await fotoComoBlob(file, 1200, 0.85);
        const ruta = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
        comprobar(await sb.storage.from("fotos").upload(ruta, blob, { contentType: "image/jpeg" }));
        return sb.storage.from("fotos").getPublicUrl(ruta).data.publicUrl;
      },
      resolverFoto: (ref) => ref || "",
      donantesPrivados: true,
      async registrarDonante(datos) { comprobar(await sb.from("donantes").insert({ datos })); },
      async listarDonantes() { return comprobar(await sb.from("donantes").select("id, datos, creado").order("creado", { ascending: false })); },
      async actualizarDonante(id, datos) { comprobar(await sb.from("donantes").update({ datos }).eq("id", id)); },
      async eliminarDonante(id) { comprobar(await sb.from("donantes").delete().eq("id", id)); },
      async importar(datos) {
        comprobar(await sb.from("perritos").upsert(datos.perritos.map((d) => ({ id: d.id, datos: copia(d), actualizado: new Date().toISOString() }))));
        const ids = datos.perritos.map((d) => d.id);
        const ps = comprobar(await sb.from("perritos").select("id"));
        const sobran = ps.map((r) => r.id).filter((id) => !ids.includes(id));
        if (sobran.length) comprobar(await sb.from("perritos").delete().in("id", sobran));
        if (datos.config) comprobar(await sb.from("sitio").upsert({ id: "config", datos: copia(datos.config) }));
        await recargar();
      },
    };
    sb.auth.onAuthStateChange((_e, s) => { sesion = s; });
    await recargar();
    return a;
  }

  /* ================= 3) Local (solo este navegador) ================= */
  const CLAVE = "patasAlRescate.datos.v1";
  function adaptadorLocal(alCambiar) {
    let datos = null;
    try { const raw = localStorage.getItem(CLAVE); if (raw) datos = JSON.parse(raw); } catch (e) { datos = null; }
    let persistente = true;
    try { localStorage.setItem(CLAVE + ".test", "1"); localStorage.removeItem(CLAVE + ".test"); } catch (e) { persistente = false; }
    if (!datos) datos = iniciales();
    const guardar = () => {
      try { localStorage.setItem(CLAVE, JSON.stringify(datos)); }
      catch (e) { throw new Error(persistente ? "El almacenamiento local está lleno (las fotos ocupan espacio). Usa fotos más pequeñas o activa Supabase." : "Este navegador no permite guardar datos (modo privado o bloqueado)."); }
    };
    const emitir = () => alCambiar({ perritos: copia(datos.perritos), config: copia(datos.config), vacio: datos.perritos.length === 0 });
    setTimeout(emitir, 0);
    return {
      modo: "local",
      descripcion: "Modo local (limitado): los cambios se guardan solo en ESTE navegador y en ESTE dispositivo. No se sincronizan con otros equipos ni los ven otras personas. Para compartir cambios, activa Supabase (ver README) o exporta/importa el archivo de datos.",
      necesitaLogin: false, sesion: true, persistente,
      puedeAdministrar: () => true,
      async guardarPerrito(d) { const i = datos.perritos.findIndex((x) => x.id === d.id); if (i >= 0) datos.perritos[i] = copia(d); else datos.perritos.push(copia(d)); guardar(); emitir(); },
      async eliminarPerrito(id) { datos.perritos = datos.perritos.filter((x) => x.id !== id); guardar(); emitir(); },
      async quitarFoto() {},
      async guardarConfig(c) { datos.config = copia(c); guardar(); emitir(); },
      async subirFoto(file) { return fotoComoDataURL(file, 700, 0.75, 180000); },
      resolverFoto: (ref) => ref || "",
      async importar(nuevos) { datos = copia(nuevos); guardar(); emitir(); },
    };
  }

  /* ================= 4) Solo lectura ================= */
  function adaptadorLectura(alCambiar, motivo) {
    setTimeout(() => { const d = iniciales(); alCambiar({ perritos: d.perritos, config: d.config, vacio: false }); }, 0);
    const no = async () => { throw new Error("Esta vista es de solo lectura."); };
    return { modo: "lectura", descripcion: motivo, necesitaLogin: false, sesion: false, puedeAdministrar: () => false,
      guardarPerrito: no, eliminarPerrito: no, quitarFoto: no, guardarConfig: no, subirFoto: no, importar: no, resolverFoto: (r) => r || "" };
  }

  /* ---- Selección automática ---- */
  window.Almacenamiento = {
    iniciales,
    async crear(alCambiar) {
      const enArtefacto = !!(window.claude && typeof window.claude.use === "function");
      if (enArtefacto) {
        try { const a = await adaptadorArtifact(alCambiar); if (a) return a; } catch (e) { console.warn(e); }
        return adaptadorLectura(alCambiar, "Mostrando los registros iniciales del ZIP: la base de datos no está disponible en esta vista (por ejemplo, sin iniciar sesión).");
      }
      try { const s = await adaptadorSupabase(alCambiar); if (s) return s; }
      catch (e) { console.warn(e); return Object.assign(adaptadorLocal(alCambiar), { avisoExtra: "No se pudo conectar con Supabase (" + e.message + "). Se usa el modo local." }); }
      return adaptadorLocal(alCambiar);
    },
  };
})();
