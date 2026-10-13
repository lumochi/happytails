/* ==========================================================
   CITA A CIEGAS — test de personalidad que sugiere un peludito
   ----------------------------------------------------------
   El emparejamiento usa SOLO datos reales de cada ficha:
   rasgos de personalidad, nivel de energía (si está registrado),
   peso, tamaño, sexo, especie y estado de adopción.
   Es una orientación: la adopción siempre se conversa con el albergue.

   Para editar: PREGUNTAS (texto, opciones y puntos),
   RASGO_DIM (cómo cada rasgo de la ficha suma a cada dimensión)
   y PERFILES (nombre y descripción de cada tipo de persona).
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  /* Dimensiones compartidas entre personas y peluditos */
  const DIM = ["calma", "afecto", "energia", "lealtad", "familia"];
  const DIM_TXT = { calma: "la calma", afecto: "el cariño", energia: "la energía y el juego", lealtad: "la lealtad", familia: "la vida en familia" };

  const PERFILES = {
    calma:   { n: "Alma serena", e: "🌙", d: "Disfrutas los planes tranquilos, el hogar y los momentos sin prisa. Conectas con peluditos relajados que agradecen la calma." },
    afecto:  { n: "Corazón tierno", e: "💛", d: "Lo tuyo es dar y recibir cariño. Te va un compañero mimoso que busque tus abrazos." },
    energia: { n: "Espíritu aventurero", e: "⚡", d: "Te mueve la acción: paseos, juego y salidas. Necesitas un peludito con energía para seguirte el ritmo." },
    lealtad: { n: "Amigo leal", e: "🤝", d: "Eres constante y presente. Conectas con peluditos nobles que forman un vínculo fiel contigo." },
    familia: { n: "Alma familiar", e: "🏡", d: "Tu vida está llena de gente querida. Buscas un peludito que se integre a toda la familia." },
  };

  /* Cada rasgo de la ficha (sin tildes, minúsculas) → puntos por dimensión */
  const RASGO_DIM = {
    "tranquilo": { calma: 3, lealtad: 1 }, "tranquila": { calma: 3, lealtad: 1 },
    "dulce": { afecto: 2, calma: 2 },
    "carinoso": { afecto: 3, familia: 1 }, "carinosa": { afecto: 3, familia: 1 },
    "amoroso": { afecto: 3, lealtad: 1 }, "amorosa": { afecto: 3, lealtad: 1 },
    "noble": { lealtad: 3, calma: 1 },
    "jugueton": { energia: 3, familia: 1 }, "juguetona": { energia: 3, familia: 1 },
    "llena de energia": { energia: 4 }, "lleno de energia": { energia: 4 }, "energetico": { energia: 3 },
    "lista para una familia": { familia: 3, afecto: 1 }, "listo para una familia": { familia: 3, afecto: 1 },
    "timido": { calma: 2 }, "timida": { calma: 2 }, "sociable": { familia: 2, energia: 1 },
    "protector": { lealtad: 2 }, "protectora": { lealtad: 2 }, "independiente": { calma: 2 },
  };
  const ENERGIA_DIM = { Baja: { calma: 2 }, Media: { lealtad: 1, energia: 1 }, Alta: { energia: 3 } };

  /* Preguntas. d = puntos a dimensiones; k = preferencia (peso, sexo, especie) */
  const BLOQUES = ["Tu estilo de vida", "Tu personalidad", "Tu hogar y preferencias"];
  const PREGUNTAS = [
    { b: 0, t: "Es sábado y no tienes pendientes. ¿Qué plan eliges?", o: [
      { l: "Sofá, mantita y una buena serie", e: "🛋️", d: { calma: 3 } },
      { l: "Una caminata tranquila por el parque", e: "🌳", d: { lealtad: 2, calma: 1 } },
      { l: "Deporte, playa o una aventura al aire libre", e: "⚡", d: { energia: 3 } },
      { l: "Almuerzo largo con familia o amigos", e: "🍲", d: { familia: 3 } } ] },
    { b: 0, t: "¿Cómo es tu semana normalmente?", o: [
      { l: "Paso muchas horas fuera de casa", e: "🎒", d: { calma: 2 } },
      { l: "Trabajo o estudio desde casa", e: "💻", d: { afecto: 2, lealtad: 1 } },
      { l: "Horarios variados: me gusta improvisar", e: "🎲", d: { energia: 2 } },
      { l: "Mi casa siempre tiene a alguien", e: "👥", d: { familia: 2 } } ] },
    { b: 0, t: "¿Cuánto tiempo al día podrías dedicarle (paseos, juego, compañía)?", o: [
      { l: "Menos de 1 hora", e: "⏱️", d: { calma: 2 } },
      { l: "Entre 1 y 3 horas", e: "🕒", d: { lealtad: 1, afecto: 1 } },
      { l: "Más de 3 horas, ¡me encanta salir!", e: "🏃", d: { energia: 3 } } ] },
    { b: 0, t: "¿Con qué frecuencia haces actividad física?", o: [
      { l: "Casi nunca, soy más de casa", e: "📚", d: { calma: 2 }, k: { pesoAjuste: -1 } },
      { l: "A veces, caminatas o paseos", e: "🚶", d: { lealtad: 1 } },
      { l: "Seguido: corro, monto bici o entreno", e: "🚴", d: { energia: 3 }, k: { pesoAjuste: 1.5 } } ] },
    { b: 1, t: "¿Cómo te describirían tus amigos?", o: [
      { l: "Sereno/a y paciente", e: "🧘", d: { calma: 3 } },
      { l: "Leal: siempre estoy cuando me necesitan", e: "🤝", d: { lealtad: 3 } },
      { l: "Muy cariñoso/a y apapachador/a", e: "🤗", d: { afecto: 3 } },
      { l: "Divertido/a e inquieto/a", e: "🎉", d: { energia: 3 } } ] },
    { b: 1, t: "En una reunión con amigos, tú…", o: [
      { l: "Me quedo con mi grupo de siempre", e: "👯", d: { lealtad: 2 } },
      { l: "Me aseguro de que todos estén bien", e: "🫶", d: { familia: 2, afecto: 1 } },
      { l: "Soy de los que bailan hasta el final", e: "💃", d: { energia: 2 } },
      { l: "Me voy temprano a descansar", e: "😴", d: { calma: 2 } } ] },
    { b: 1, t: "¿Cómo demuestras tu cariño?", o: [
      { l: "Con abrazos y mimos", e: "🤗", d: { afecto: 3 } },
      { l: "Estando presente, siempre", e: "🕯️", d: { lealtad: 3 } },
      { l: "Con planes y aventuras juntos", e: "🗺️", d: { energia: 2, familia: 1 } },
      { l: "Con detalles tranquilos", e: "🌷", d: { calma: 2, afecto: 1 } } ] },
    { b: 1, t: "¿Qué buscas en tu nuevo compañero?", o: [
      { l: "Alguien que me acompañe en calma", e: "🌙", d: { calma: 3 } },
      { l: "Un amigo fiel para toda la vida", e: "🐾", d: { lealtad: 3 } },
      { l: "Mucho amor y mimos", e: "💛", d: { afecto: 3 } },
      { l: "Un compañero de juegos y paseos", e: "🎾", d: { energia: 3 } },
      { l: "Alguien que se lleve con toda la familia", e: "👨‍👩‍👧", d: { familia: 3 } } ] },
    { b: 2, t: "¿Con quién vives?", o: [
      { l: "Vivo solo/a", e: "🏠", d: { afecto: 1, calma: 1 } },
      { l: "Con mi pareja o roommates", e: "👫", d: { afecto: 1, lealtad: 1 } },
      { l: "Con mi familia (incluye niños o adultos mayores)", e: "👨‍👩‍👧", d: { familia: 3 } } ] },
    { b: 2, t: "¿Cómo es tu hogar?", o: [
      { l: "Departamento pequeño", e: "🏢", k: { peso: 5 } },
      { l: "Departamento amplio o casa sin patio", e: "🏡", k: { peso: 7 } },
      { l: "Casa con patio o jardín", e: "🌼", k: { peso: 9.5 } } ] },
    { b: 2, t: "¿Qué tamaño te imaginas abrazando?", o: [
      { l: "Uno que quepa en mi regazo", e: "🧸", k: { peso: 5 } },
      { l: "Mediano, ideal para paseos", e: "🦮", k: { peso: 8 } },
      { l: "Robusto, de más de 10 kg", e: "🐕", k: { peso: 11 } },
      { l: "¡El tamaño no importa!", e: "💞", k: {} } ] },
    { b: 2, t: "¿Prefieres hembra o macho?", o: [
      { l: "Hembra", e: "♀️", k: { sexo: "Hembra" } },
      { l: "Macho", e: "♂️", k: { sexo: "Macho" } },
      { l: "Me da igual", e: "🤷", k: {} } ] },
    { b: 2, t: "Última: ¿a quién te gustaría conocer?", o: [
      { l: "Un perrito", e: "🐶", k: { especie: "Perro" } },
      { l: "Un gatito", e: "🐱", k: { especie: "Gato" } },
      { l: "¡Me da igual!", e: "🐾", k: {} } ] },
  ];

  let paso = 0, respuestas = [], resultado = null, verTodos = false;

  function vectorMascota(m) {
    const v = { calma: 0, afecto: 0, energia: 0, lealtad: 0, familia: 0 }, usados = [];
    (m.rasgos || []).forEach((r) => { const dd = RASGO_DIM[norm(r)]; if (dd) { usados.push(r); for (const k in dd) v[k] += dd[k]; } });
    if (m.energia && ENERGIA_DIM[m.energia]) for (const k in ENERGIA_DIM[m.energia]) v[k] += ENERGIA_DIM[m.energia][k];
    // Matiz por peso (dato real del afiche): los más livianos tienden a "regazo", los más grandes a "paseo"
    const kg = +m.pesoKg || 0;
    if (kg) { if (kg <= 5.5) v.calma += 0.6; else if (kg >= 9) v.energia += 0.6; }
    return { v, usados };
  }
  /* Pequeño valor (0–0.03) que depende de las respuestas: solo decide empates entre fichas casi idénticas */
  const desempate = (txt) => { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 * 0.03; };
  const coseno = (a, b) => { let p = 0, na = 0, nb = 0; DIM.forEach((k) => { p += a[k] * b[k]; na += a[k] ** 2; nb += b[k] ** 2; }); return na && nb ? p / Math.sqrt(na * nb) : 0; };

  function calcular() {
    const yo = { calma: 0, afecto: 0, energia: 0, lealtad: 0, familia: 0 };
    const pesos = []; let ajuste = 0, sexo = "", especie = "";
    respuestas.forEach((ri, i) => {
      const op = PREGUNTAS[i].o[ri];
      for (const k in op.d || {}) yo[k] += op.d[k];
      const k = op.k || {};
      if (k.peso) pesos.push(k.peso);
      if (k.pesoAjuste) ajuste += k.pesoAjuste;
      if (k.sexo) sexo = k.sexo;
      if (k.especie) especie = k.especie;
    });
    const pesoIdeal = pesos.length ? pesos.reduce((a, b) => a + b, 0) / pesos.length + ajuste : null;
    const semilla = respuestas.join("");
    const D = window.HT.datos();
    const todos = D.perritos.filter((m) => m.estado !== "adoptado");
    const ranking = todos.map((m) => {
      const { v, usados } = vectorMascota(m);
      const afin = coseno(yo, v);                                             // 0..1 personalidad
      const kg = +m.pesoKg || 0;
      const fitPeso = pesoIdeal && kg ? Math.exp(-Math.abs(kg - pesoIdeal) / 3) : 0.6;  // 0..1 tamaño
      const fitSexo = !sexo ? 0.7 : m.sexo === sexo ? 1 : 0.25;
      const esp = m.especie || "Perro";
      const fitEsp = !especie ? (esp === "Perro" ? 1 : 0.85) : esp.startsWith(especie) ? 1 : 0;
      let score = (0.58 * afin + 0.24 * fitPeso + 0.18 * fitSexo) * fitEsp;
      if (m.estado === "proceso") score *= 0.9;
      if (!usados.length) score *= 0.9;
      score += desempate(semilla + m.id);                  // empate técnico: alterna entre peluditos con fichas casi iguales
      const dims = DIM.map((k) => [k, yo[k] * v[k]]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
      return { m, score, afin, fitPeso, usados, dims, kg };
    }).sort((a, b) => b.score - a.score || (a.m.orden || 999) - (b.m.orden || 999));
    const max = ranking.length ? ranking[0].score : 1, min = ranking.length ? ranking[ranking.length - 1].score : 0;
    ranking.forEach((r) => { r.pct = max > min ? Math.round(52 + 46 * ((r.score - min) / (max - min))) : 90; if (r.score === 0) r.pct = 0; });
    const orden = DIM.map((k) => [k, yo[k]]).sort((a, b) => b[1] - a[1]);
    const perfil = PERFILES[orden[0][0]], segundo = orden[1][1] > 0 ? orden[1][0] : null;
    return { ranking, yo, perfil, principal: orden[0][0], segundo, pesoIdeal, sexo, especie };
  }

  function porQue(r, res) {
    const partes = [];
    if (r.usados.length) partes.push(`su ficha dice que es <strong>${esc(r.usados.join(", ").toLowerCase())}</strong>`);
    if (r.dims.length) partes.push(`comparten ${r.dims.map((k) => DIM_TXT[k]).join(" y ")}`);
    if (res.pesoIdeal && r.kg && Math.abs(r.kg - res.pesoIdeal) <= 2) partes.push(`con ${esc(r.kg)} kg encaja con el tamaño que imaginas`);
    if (res.sexo && r.m.sexo === res.sexo) partes.push(`es ${res.sexo === "Hembra" ? "hembra" : "macho"}, como preferías`);
    return partes.length ? cap(partes.join("; ")) + "." : "Tiene poca información registrada todavía: conócelo en persona.";
  }

  function render() {
    const box = $("#quiz"); if (!box || !window.HT) return;
    const D = window.HT.datos();
    if (!D.perritos.filter((m) => m.estado !== "adoptado").length) { box.innerHTML = `<div class="quiz-card"><p>Pronto habrá peluditos disponibles para tu cita.</p></div>`; return; }
    if (resultado) return renderResultado(box);
    if (!box.dataset.started) {
      const n = D.perritos.filter((m) => m.estado !== "adoptado").length;
      box.innerHTML = `<div class="quiz-card quiz-intro">
        <div class="quiz-hearts" aria-hidden="true">💘</div>
        <h3>Tu cita a ciegas con un peludito</h3>
        <p>${PREGUNTAS.length} preguntas en 3 partes: tu estilo de vida, tu personalidad y tu hogar. Te comparamos con los <strong>${n} peluditos</strong> que buscan familia y, al final, se revela tu cita.</p>
        <div class="quiz-blocks">${BLOQUES.map((b, i) => `<span><b>${i + 1}</b>${esc(b)}</span>`).join("")}</div>
        <button class="btn btn-primary" data-q="start">Empezar mi test</button>
        <p class="quiz-note">Toma unos 2 minutos. No guardamos tus respuestas.</p></div>`;
      return;
    }
    const q = PREGUNTAS[paso];
    box.innerHTML = `<div class="quiz-card">
      <div class="quiz-top"><p class="quiz-step">Parte ${q.b + 1} · ${esc(BLOQUES[q.b])}</p><p class="quiz-count">${paso + 1}/${PREGUNTAS.length}</p></div>
      <div class="quiz-progress"><span style="width:${(paso / PREGUNTAS.length) * 100}%"></span></div>
      <h3 id="qTitle">${esc(q.t)}</h3>
      <div class="quiz-options" role="radiogroup" aria-labelledby="qTitle">
        ${q.o.map((o, i) => `<button class="quiz-opt" role="radio" aria-checked="${respuestas[paso] === i}" data-opt="${i}"><span class="quiz-emoji" aria-hidden="true">${o.e}</span>${esc(o.l)}</button>`).join("")}
      </div>
      <div class="quiz-nav">${paso > 0 ? `<button class="linkish" data-q="back">← Anterior</button>` : "<span></span>"}</div></div>`;
    const sel = box.querySelector('.quiz-opt[aria-checked="true"]') || box.querySelector(".quiz-opt"); if (sel && box.dataset.focus) sel.focus({ preventScroll: true });
  }

  function barras(yo) {
    const max = Math.max(1, ...DIM.map((k) => yo[k]));
    const lbl = { calma: "Calma", afecto: "Cariño", energia: "Energía", lealtad: "Lealtad", familia: "Familia" };
    return `<div class="dims">${DIM.map((k) => `<div class="dim"><span>${lbl[k]}</span><span class="dim-bar"><i style="width:${Math.round((yo[k] / max) * 100)}%"></i></span></div>`).join("")}</div>`;
  }

  function renderResultado(box) {
    const res = resultado, top = res.ranking[0], alt = res.ranking.slice(1, 3);
    if (!res.revelado) {
      box.innerHTML = `<div class="quiz-card quiz-result">
        <div class="persona"><span class="persona-e" aria-hidden="true">${res.perfil.e}</span>
          <div><p class="quiz-step">Tu perfil</p><h3>${esc(res.perfil.n)}${res.segundo ? ` <small>con toque de ${esc(PERFILES[res.segundo].n.toLowerCase())}</small>` : ""}</h3><p>${esc(res.perfil.d)}</p></div></div>
        ${barras(res.yo)}
        <div class="reveal"><div class="reveal-photo"><img src="${esc(window.HT.foto(top.m))}" alt="Foto oculta de tu cita"></div>
          <div class="reveal-info"><h3>Ya tenemos a tu cita…</h3><p>Comparamos tu perfil con ${res.ranking.length} peluditos. Hay alguien que comparte tu forma de ser.</p>
          <button class="btn btn-primary" data-q="reveal">Revelar mi cita 💘</button></div></div></div>`;
      return;
    }
    box.innerHTML = `<div class="quiz-card quiz-result is-revealed">
      <div class="persona"><span class="persona-e" aria-hidden="true">${res.perfil.e}</span>
        <div><p class="quiz-step">Tu perfil</p><h3>${esc(res.perfil.n)}${res.segundo ? ` <small>con toque de ${esc(PERFILES[res.segundo].n.toLowerCase())}</small>` : ""}</h3></div></div>
      <div class="reveal">
        <div class="reveal-photo"><img src="${esc(window.HT.foto(top.m))}" alt="Foto de ${esc(top.m.nombre)}"></div>
        <div class="reveal-info">
          <span class="match-pct">${top.pct}% de afinidad</span>
          <h3>¡Tu cita es ${esc(top.m.nombre)}!</h3>
          <p>${porQue(top, res)}</p>
          <p class="quiz-note">${esc([top.m.sexo, top.m.tamano, top.kg ? top.kg + " kg" : "", top.m.especie && top.m.especie !== "Perro" ? top.m.especie : ""].filter(Boolean).join(" · "))}. Es una sugerencia según su ficha; el albergue te ayudará a confirmar si son compatibles.</p>
          <div class="quiz-actions">
            <button class="btn btn-primary" data-q="adoptar" data-id="${esc(top.m.id)}">💘 ¡Quiero mi cita con ${esc(top.m.nombre)}!</button>
            <button class="btn btn-soft" data-ver="${esc(top.m.id)}">Ver su ficha</button>
          </div>
          <button class="linkish" data-apadrinar="${esc(top.m.id)}" style="justify-self:start">🤝 ¿No puedes adoptar ahora? Apadrina a ${esc(top.m.nombre)}</button></div></div>
      ${alt.length ? `<div class="alt"><h4>También podrías conectar con…</h4><div class="alt-row">
        ${alt.map((r) => `<button class="alt-card" data-ver="${esc(r.m.id)}"><img src="${esc(window.HT.foto(r.m))}" alt=""><span><strong>${esc(r.m.nombre)}</strong><small>${r.pct}% afinidad · ${esc((r.usados[0] || r.m.tamano || "").toLowerCase())}</small></span></button>`).join("")}
      </div></div>` : ""}
      <div class="all-rank"><button class="linkish" data-q="todos" aria-expanded="${verTodos}">${verTodos ? "Ocultar" : "Ver"} tu afinidad con los ${res.ranking.length} peluditos</button>
        ${verTodos ? `<ol class="rank-list">${res.ranking.map((r, i) => `<li><button data-ver="${esc(r.m.id)}"><span class="rk">${i + 1}</span><img src="${esc(window.HT.foto(r.m))}" alt=""><span class="rk-name">${esc(r.m.nombre)}<small>${esc((r.usados.join(", ") || "sin rasgos registrados").toLowerCase())}</small></span><span class="rk-bar"><i style="width:${r.pct}%"></i></span><span class="rk-pct">${r.pct ? r.pct + "%" : "—"}</span></button></li>`).join("")}</ol>` : ""}</div>
      <button class="linkish" data-q="restart">Repetir el test</button></div>`;
  }

  document.addEventListener("click", (e) => {
    const box = $("#quiz"); if (!box || !box.contains(e.target)) return;
    const b = e.target.closest("[data-q],[data-opt]"); if (!b) return;
    const q = b.dataset.q;
    if (q === "start") { box.dataset.started = "1"; box.dataset.focus = "1"; paso = 0; return render(); }
    if (q === "back") { paso = Math.max(0, paso - 1); return render(); }
    if (q === "restart") { paso = 0; respuestas = []; resultado = null; verTodos = false; window.HT.cita = null; return render(); }
    if (q === "reveal") { resultado.revelado = true; return render(); }
    if (q === "todos") { verTodos = !verTodos; return render(); }
    if (q === "adoptar") {
      const r = resultado.ranking[0];
      window.HT.cita = { id: r.m.id, nombre: r.m.nombre, pct: r.pct, perfil: resultado.perfil.n };
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

  /* Para pruebas: permite calcular con respuestas dadas */
  window.HT_CITA = { PREGUNTAS, probar: (r) => { respuestas = r.slice(); const x = calcular(); respuestas = []; return x; } };
  render();
})();
