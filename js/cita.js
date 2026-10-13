/* ==========================================================
   CITA A CIEGAS — test de personalidad que sugiere un peludito
   El emparejamiento usa SOLO datos reales de cada ficha:
   rasgos de personalidad, nivel de energía (si está registrado),
   tamaño, especie y estado de adopción. Es una orientación:
   la adopción final siempre se conversa con el albergue.
   Para cambiar preguntas o pesos, edita PREGUNTAS y RASGO_DIM.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  /* Dimensiones de personalidad que comparten personas y peluditos */
  const DIMS = { calma: "calma", afecto: "cariño", energia: "energía y juego", lealtad: "lealtad", familia: "vida en familia" };

  /* Cómo se traduce cada rasgo de la ficha a dimensiones (rasgos sin tilde, en minúscula) */
  const RASGO_DIM = {
    "tranquilo": { calma: 3 }, "tranquila": { calma: 3 },
    "dulce": { afecto: 2, calma: 1 },
    "carinoso": { afecto: 3 }, "carinosa": { afecto: 3 },
    "amoroso": { afecto: 3 }, "amorosa": { afecto: 3 },
    "noble": { lealtad: 3, calma: 1 },
    "jugueton": { energia: 3 }, "juguetona": { energia: 3 },
    "llena de energia": { energia: 3 }, "lleno de energia": { energia: 3 }, "energetico": { energia: 3 },
    "lista para una familia": { familia: 3, afecto: 1 }, "listo para una familia": { familia: 3, afecto: 1 },
    "timido": { calma: 2 }, "timida": { calma: 2 }, "sociable": { familia: 2, energia: 1 }, "protector": { lealtad: 2 }, "protectora": { lealtad: 2 },
  };
  const ENERGIA_DIM = { Baja: { calma: 2 }, Media: { lealtad: 1, energia: 1 }, Alta: { energia: 2 } };

  /* Preguntas: cada opción suma puntos a dimensiones o fija una preferencia */
  const PREGUNTAS = [
    { t: "Es sábado y no tienes pendientes. ¿Qué plan eliges?", o: [
      { l: "Sofá, mantita y una buena serie", e: "🛋️", d: { calma: 3 } },
      { l: "Una caminata tranquila por el parque", e: "🌳", d: { lealtad: 2, calma: 1 } },
      { l: "Deporte, playa o una aventura al aire libre", e: "⚡", d: { energia: 3 } },
      { l: "Almuerzo largo con familia o amigos", e: "🍲", d: { familia: 3 } } ] },
    { t: "¿Cómo te describirían tus amigos?", o: [
      { l: "Sereno/a y paciente", e: "🧘", d: { calma: 2 } },
      { l: "Leal: siempre estoy cuando me necesitan", e: "🤝", d: { lealtad: 3 } },
      { l: "Muy cariñoso/a y apapachador/a", e: "🤗", d: { afecto: 3 } },
      { l: "Divertido/a e inquieto/a", e: "🎉", d: { energia: 2 } } ] },
    { t: "¿Qué buscas en tu nuevo compañero?", o: [
      { l: "Alguien que me acompañe en calma", e: "🌙", d: { calma: 3 } },
      { l: "Un amigo fiel para toda la vida", e: "🐾", d: { lealtad: 3 } },
      { l: "Mucho amor y mimos", e: "💛", d: { afecto: 3 } },
      { l: "Un compañero de juegos y paseos", e: "🎾", d: { energia: 3 } } ] },
    { t: "¿Cuánto tiempo al día podrías dedicarle (paseos, juego, compañía)?", o: [
      { l: "Menos de 1 hora", e: "⏱️", d: { calma: 2 } },
      { l: "Entre 1 y 3 horas", e: "🕒", d: { lealtad: 1, afecto: 1 } },
      { l: "Más de 3 horas, ¡me encanta salir!", e: "🏃", d: { energia: 3 } } ] },
    { t: "¿Con quién vives?", o: [
      { l: "Vivo solo/a", e: "🏠", d: { afecto: 1, calma: 1 } },
      { l: "Con mi pareja o roommates", e: "👫", d: { afecto: 1, lealtad: 1 } },
      { l: "Con mi familia (incluye niños o adultos mayores)", e: "👨‍👩‍👧", d: { familia: 3 } } ] },
    { t: "¿Cómo es tu hogar?", k: "tamano", o: [
      { l: "Departamento pequeño", e: "🏢", v: "Pequeño" },
      { l: "Departamento amplio o casa sin patio", e: "🏡", v: "" },
      { l: "Casa con patio o jardín", e: "🌼", v: "Mediano" } ] },
    { t: "Última: ¿a quién te gustaría conocer?", k: "especie", o: [
      { l: "Solo perritos", e: "🐶", v: "Perro" },
      { l: "¡Me da igual, perrito o gatito!", e: "🐱", v: "" } ] },
  ];

  let paso = 0, respuestas = [], resultado = null;

  function perfilMascota(m) {
    const p = { calma: 0, afecto: 0, energia: 0, lealtad: 0, familia: 0 };
    const usados = [];
    (m.rasgos || []).forEach((r) => { const dd = RASGO_DIM[norm(r)]; if (dd) { usados.push(r); for (const k in dd) p[k] += dd[k]; } });
    if (m.energia && ENERGIA_DIM[m.energia]) for (const k in ENERGIA_DIM[m.energia]) p[k] += ENERGIA_DIM[m.energia][k];
    return { p, usados };
  }

  function calcular() {
    const yo = { calma: 0, afecto: 0, energia: 0, lealtad: 0, familia: 0 };
    let tamano = "", especie = "";
    respuestas.forEach((ri, i) => {
      const q = PREGUNTAS[i], op = q.o[ri];
      if (q.k === "tamano") tamano = op.v; else if (q.k === "especie") especie = op.v;
      else for (const k in op.d) yo[k] += op.d[k];
    });
    const D = window.HT.datos();
    let candidatos = D.perritos.filter((m) => m.estado !== "adoptado");
    if (especie) { const solo = candidatos.filter((m) => (m.especie || "Perro") === especie); if (solo.length) candidatos = solo; }
    const maxYo = Math.max(1, ...Object.values(yo));
    const ranking = candidatos.map((m) => {
      const { p, usados } = perfilMascota(m);
      let afin = 0, top = [];
      for (const k in yo) { const v = yo[k] * p[k]; afin += v; if (v > 0) top.push([k, v]); }
      const maxM = Math.max(1, ...Object.values(p));
      let score = afin / (maxYo * maxM * 1.6);              // 0..~1 según coincidencia de dimensiones
      if (tamano && m.tamano === tamano) score += 0.12;       // encaja con tu espacio
      if (tamano === "Pequeño" && m.tamano && m.tamano !== "Pequeño") score -= 0.08;
      if (m.estado === "proceso") score -= 0.1;              // prioriza a quienes siguen disponibles
      if (!usados.length) score -= 0.05;                       // poca información en su ficha
      top.sort((a, b) => b[1] - a[1]);
      const pct = Math.round(Math.max(55, Math.min(98, 58 + score * 42)));
      return { m, score, pct, dims: top.slice(0, 2).map(([k]) => DIMS[k]), usados };
    }).sort((a, b) => b.score - a.score || (a.m.orden || 999) - (b.m.orden || 999));
    const misDims = Object.entries(yo).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 2).map(([k]) => DIMS[k]);
    return { ranking, misDims, tamano };
  }

  function porQue(r, misDims, tamano) {
    const partes = [];
    if (r.usados.length) partes.push(`su ficha dice que es <strong>${esc(r.usados.join(", ").toLowerCase())}</strong>`);
    if (r.dims.length) partes.push(`comparten ${esc(r.dims.join(" y "))}`);
    if (tamano && r.m.tamano === tamano) partes.push(`su tamaño (${esc(r.m.tamano.toLowerCase())}) encaja con tu hogar`);
    return partes.length ? cap(partes.join("; ")) + "." : "Tiene poca información registrada todavía: conócelo en persona.";
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function render() {
    const box = $("#quiz"); if (!box || !window.HT) return;
    const D = window.HT.datos();
    if (!D.perritos.filter((m) => m.estado !== "adoptado").length) { box.innerHTML = `<div class="quiz-card"><p>Pronto habrá peluditos disponibles para tu cita.</p></div>`; return; }
    if (resultado) return renderResultado(box);
    if (paso === 0 && !respuestas.length && !box.dataset.started) {
      box.innerHTML = `<div class="quiz-card quiz-intro">
        <div class="quiz-hearts" aria-hidden="true">💘</div>
        <h3>Tu cita a ciegas con un peludito</h3>
        <p>No verás a nadie hasta el final. Responde con sinceridad: buscamos a quien comparta tu ritmo de vida.</p>
        <button class="btn btn-primary" data-q="start">Empezar mi test</button>
        <p class="quiz-note">Toma 1 minuto. No guardamos tus respuestas.</p></div>`;
      return;
    }
    const q = PREGUNTAS[paso];
    box.innerHTML = `<div class="quiz-card">
      <div class="quiz-progress"><span style="width:${(paso / PREGUNTAS.length) * 100}%"></span></div>
      <p class="quiz-step">Pregunta ${paso + 1} de ${PREGUNTAS.length}</p>
      <h3 id="qTitle">${esc(q.t)}</h3>
      <div class="quiz-options" role="radiogroup" aria-labelledby="qTitle">
        ${q.o.map((o, i) => `<button class="quiz-opt" role="radio" aria-checked="${respuestas[paso] === i}" data-opt="${i}"><span class="quiz-emoji" aria-hidden="true">${o.e}</span>${esc(o.l)}</button>`).join("")}
      </div>
      <div class="quiz-nav">${paso > 0 ? `<button class="linkish" data-q="back">← Anterior</button>` : "<span></span>"}</div></div>`;
    const first = box.querySelector(".quiz-opt"); if (first && box.dataset.focus) first.focus();
  }

  function renderResultado(box) {
    const { ranking, misDims, tamano } = resultado;
    const top = ranking[0], alt = ranking.slice(1, 3);
    const foto = window.HT.foto(top.m);
    box.innerHTML = `<div class="quiz-card quiz-result ${resultado.revelado ? "is-revealed" : ""}">
      <p class="quiz-step">Tu perfil: ${misDims.length ? esc(misDims.join(" + ")) : "equilibrado"}</p>
      <div class="reveal">
        <div class="reveal-photo"><img src="${esc(foto)}" alt="${resultado.revelado ? "Foto de " + esc(top.m.nombre) : "Foto oculta de tu cita"}"></div>
        ${resultado.revelado ? `<div class="reveal-info">
            <span class="match-pct">${top.pct}% de afinidad</span>
            <h3>¡Tu cita es ${esc(top.m.nombre)}!</h3>
            <p>${porQue(top, misDims, tamano)}</p>
            <p class="quiz-note">Es una sugerencia según su ficha. El albergue te ayudará a confirmar si son compatibles.</p>
            <div class="quiz-actions">
              <button class="btn btn-primary" data-q="adoptar" data-id="${esc(top.m.id)}">💘 ¡Quiero mi cita con ${esc(top.m.nombre)}!</button>
              <button class="btn btn-soft" data-ver="${esc(top.m.id)}">Ver su ficha</button>
            </div></div>`
        : `<div class="reveal-info"><h3>Ya tenemos a tu cita…</h3><p>Hay alguien que comparte tu forma de ser. ¿List@ para conocerl@?</p>
            <button class="btn btn-primary" data-q="reveal">Revelar mi cita 💘</button></div>`}
      </div>
      ${resultado.revelado && alt.length ? `<div class="alt"><h4>También podrías conectar con…</h4><div class="alt-row">
        ${alt.map((r) => `<button class="alt-card" data-ver="${esc(r.m.id)}"><img src="${esc(window.HT.foto(r.m))}" alt=""><span><strong>${esc(r.m.nombre)}</strong><small>${r.pct}% afinidad</small></span></button>`).join("")}
      </div></div>` : ""}
      ${resultado.revelado ? `<button class="linkish" data-q="restart">Repetir el test</button>` : ""}</div>`;
  }

  document.addEventListener("click", (e) => {
    const box = $("#quiz"); if (!box || !box.contains(e.target)) return;
    const b = e.target.closest("[data-q],[data-opt]"); if (!b) return;
    if (b.dataset.q === "start") { box.dataset.started = "1"; box.dataset.focus = "1"; paso = 0; return render(); }
    if (b.dataset.q === "back") { paso = Math.max(0, paso - 1); return render(); }
    if (b.dataset.q === "restart") { paso = 0; respuestas = []; resultado = null; window.HT.cita = null; box.dataset.started = "1"; return render(); }
    if (b.dataset.q === "reveal") { resultado.revelado = true; render(); return; }
    if (b.dataset.q === "adoptar") {
      const r = resultado.ranking[0];
      window.HT.cita = { id: r.m.id, nombre: r.m.nombre, pct: r.pct, perfil: resultado.misDims.join(" + ") };
      window.HT.elegirPerrito(r.m.id);
      document.getElementById("formulario").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (b.dataset.opt != null) {
      respuestas[paso] = +b.dataset.opt;
      if (paso < PREGUNTAS.length - 1) { paso++; render(); }
      else { resultado = calcular(); resultado.revelado = false; render(); box.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
  document.addEventListener("ht:datos", () => { if (resultado) resultado = Object.assign(calcular(), { revelado: resultado.revelado }); render(); });
  render();
})();
