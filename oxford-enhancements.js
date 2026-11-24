(function (root) {
  "use strict";

  const SUBJECTS = [
    { id: "english", name: "Inglés", detail: "Writing, listening, speaking y reading" },
    { id: "mathematics", name: "Matemáticas", detail: "Razonamiento y resolución de problemas" },
    { id: "engineering", name: "Ingeniería", detail: "Diseño, mecanismos y aplicación" },
    { id: "physics", name: "Física", detail: "Modelos, magnitudes y problemas" }
  ];
  const STAGES = [
    "Definir el problema",
    "Investigar y reunir ideas",
    "Diseñar una solución",
    "Construir un prototipo seguro",
    "Probar y medir",
    "Mejorar y comunicar"
  ];
  const INTERVALS = [1, 3, 7, 14, 30, 60];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  function isDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const [year, month, day] = String(value).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function addDays(dateString, days) {
    if (!isDate(dateString)) return "";
    const value = dateString;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + Number(days || 0));
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function mondayOf(dateString) {
    if (!isDate(dateString)) return "";
    const value = dateString;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function nextReview(stage, grade) {
    const current = clamp(Number.isFinite(Number(stage)) ? Number(stage) : 0, 0, INTERVALS.length - 1);
    if (grade === "again") return { stage: 0, intervalDays: 1 };
    if (grade === "hard") return { stage: current, intervalDays: 2 };
    const next = clamp(current + (grade === "easy" ? 2 : 1), 0, INTERVALS.length - 1);
    return { stage: next, intervalDays: INTERVALS[next] };
  }

  function dueConcepts(concepts, today) {
    return (Array.isArray(concepts) ? concepts : [])
      .filter(item => item && isDate(item.dueDate) && item.dueDate <= today)
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  function subjectSummary(sessions, subject) {
    const entries = (Array.isArray(sessions) ? sessions : [])
      .filter(item => item && item.subject === subject)
      .slice()
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const scored = entries.filter(item => Number.isFinite(Number(item.score)) && item.score !== null && item.score !== "");
    return {
      count: entries.length,
      minutes: entries.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0),
      average: scored.length ? Math.round(scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length) : null,
      recent: entries.slice(0, 3),
      recentScored: scored.slice(0, 3)
    };
  }

  function getGuidance(sessions, subject) {
    const summary = subjectSummary(sessions, subject);
    if (!summary.count) return {
      kind: "diagnostic",
      label: "Diagnóstico inicial",
      explanation: "Todavía no hay sesiones registradas para esta materia.",
      action: "Comprueba primero los fundamentos y registra el resultado."
    };
    if (summary.recent.some(item => Number(item.fundamentalErrors) > 0)) return {
      kind: "foundation",
      label: "Recuperar fundamentos",
      explanation: "Hay un error fundamental registrado en las sesiones recientes.",
      action: "Detén el aumento de dificultad; explica el concepto y practica el paso que falló."
    };
    if (summary.average === null) return {
      kind: "practice",
      label: "Consolidar y comprobar",
      explanation: "Hay actividad registrada, pero todavía no hay resultados de evaluación.",
      action: "Haz una comprobación breve sin consultar apuntes y registra el resultado."
    };
    const recentScores = summary.recentScored.slice(0, 3);
    const twoStrong = recentScores.length >= 2 &&
      recentScores.slice(0, 2).every(item => Number(item.score) >= 85 && Number(item.fundamentalErrors) === 0);
    if (twoStrong) return {
      kind: "transfer",
      label: "Preparado para transferencia",
      explanation: "Las dos evaluaciones puntuadas más recientes superan el 85% y no registran errores fundamentales.",
      action: "Prueba un problema nuevo o una aplicación real; aumenta solo una variable de dificultad."
    };
    const recentAverage = recentScores.length
      ? recentScores.reduce((sum, item) => sum + Number(item.score), 0) / recentScores.length
      : summary.average;
    if (recentAverage < 85) return {
      kind: "consolidate",
      label: "Consolidación guiada",
      explanation: "Los resultados recientes están por debajo del objetivo inicial del 85%.",
      action: "Practica los pasos que fallaron y vuelve a comprobar antes de avanzar."
    };
    return {
      kind: "confirm",
      label: "Confirmar dominio",
      explanation: "El resultado alcanza el objetivo inicial, pero faltan comprobaciones independientes.",
      action: "Explica el razonamiento sin ayuda y aplica el concepto en otro contexto."
    };
  }

  function init(context) {
    if (!context || typeof context.getData !== "function" || typeof context.save !== "function") {
      throw new Error("OxfordEnhancements necesita getData y save.");
    }
    const getData = context.getData;
    const save = context.save;
    const today = typeof context.today === "function" ? context.today : () => {
      const d = new Date();
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    };
    const data = () => {
      const value = getData();
      if (!value.learning || typeof value.learning !== "object") value.learning = {};
      const learning = value.learning;
      if (!Array.isArray(learning.sessions)) learning.sessions = [];
      if (!Array.isArray(learning.concepts)) learning.concepts = [];
      if (!Array.isArray(learning.projects)) learning.projects = [];
      if (!Array.isArray(learning.englishWeeks)) learning.englishWeeks = [];
      return value;
    };
    const learning = () => data().learning;
    const $ = id => document.getElementById(id);
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined && text !== null) node.textContent = String(text);
      return node;
    };
    const dateLabel = value => {
      if (!isDate(value)) return "Sin fecha";
      const [y, m, d] = value.split("-").map(Number);
      return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
    };
    const subjectName = id => (SUBJECTS.find(item => item.id === id) || {}).name || "Materia";
    const tag = text => el("span", "ox-tag", text);
    const saveRefresh = () => { save(); refresh(); };

    function renderDashboard() {
      const value = data();
      const sessions = value.learning.sessions;
      const due = dueConcepts(value.learning.concepts, today()).length;
      const openErrors = (value.errors || []).filter(item => item && !item.resolved).length;
      const minutes = sessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const weekStart = mondayOf(today());
      const weekSessions = sessions.filter(item => isDate(item.date) && item.date >= weekStart);
      const weekMinutes = weekSessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const metrics = $("ox-dashboard-metrics");
      metrics.replaceChildren();
      [
        ["Sesiones", "Aprendizaje registrado", sessions.length],
        ["Tiempo", "Minutos acumulados", minutes],
        ["Repasos", "Pendientes hoy", due],
        ["Errores", "Por recuperar", openErrors]
      ].forEach(([title, detail, amount]) => {
        const box = el("article", "ox-metric");
        box.append(el("span", "ox-metric-label", title), el("strong", "ox-metric-value", amount), el("span", "ox-metric-detail", detail));
        metrics.append(box);
      });
      $("ox-week-summary").textContent = "Esta semana: " + weekSessions.length + " sesiones y " + weekMinutes + " minutos registrados. El tiempo mide actividad, no dominio.";
      const rootNode = $("ox-subject-progress");
      rootNode.replaceChildren();
      SUBJECTS.forEach(subject => {
        const summary = subjectSummary(sessions, subject.id);
        const guidance = getGuidance(sessions, subject.id);
        const box = el("article", "ox-subject-card");
        const head = el("div", "ox-subject-head");
        head.append(el("strong", "", subject.name), tag(guidance.label));
        box.append(head, el("p", "ox-muted", subject.detail), el("strong", "ox-subject-score", summary.average === null ? "Sin evaluación" : summary.average + "%"));
        const bar = el("div", "ox-progress");
        const fill = el("div", "ox-progress-fill");
        fill.style.width = (summary.average === null ? 0 : clamp(summary.average, 0, 100)) + "%";
        bar.append(fill);
        box.append(bar, el("p", "ox-small", summary.count + " sesiones · " + summary.minutes + " min"));
        rootNode.append(box);
      });
    }

    function renderGuidance() {
      const subject = $("ox-subject").value || "english";
      const guidance = getGuidance(learning().sessions, subject);
      const rootNode = $("ox-current-guidance");
      rootNode.replaceChildren(el("strong", "", guidance.label), el("p", "ox-muted", guidance.explanation), el("p", "ox-guidance-action", guidance.action));
    }

    function renderSessions() {
      const rootNode = $("ox-session-history");
      rootNode.replaceChildren();
      const sessions = learning().sessions.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 8);
      if (!sessions.length) {
        rootNode.append(el("p", "ox-muted", "Aún no hay sesiones registradas. Añade una al terminar un bloque de estudio."));
      } else sessions.forEach(item => {
        const row = el("article", "ox-list-item");
        const head = el("div", "ox-list-top");
        head.append(el("strong", "", subjectName(item.subject) + " · " + (item.topic || "Sesión")), tag(item.mode || "Práctica"));
        row.append(head, el("p", "ox-small", dateLabel(item.date) + " · " + item.minutes + " min" + (item.score === null || item.score === "" ? " · Sin nota" : " · Evaluación: " + item.score + "%") + " · Errores fundamentales: " + (Number(item.fundamentalErrors) || 0)));
        if (item.reflection) row.append(el("p", "ox-muted", item.reflection));
        rootNode.append(row);
      });
      renderGuidance();
    }

    function renderReviews() {
      const rootNode = $("ox-review-queue");
      rootNode.replaceChildren();
      const concepts = learning().concepts;
      const due = dueConcepts(concepts, today());
      const list = due.length ? due : concepts.slice().sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || ""))).slice(0, 5);
      if (!list.length) rootNode.append(el("p", "ox-muted", "Guarda conceptos después de las lecciones para programar su repaso."));
      if (list.length && !due.length) rootNode.append(el("p", "ox-muted", "No hay repasos vencidos. Estos son los próximos conceptos:"));
      list.slice(0, 8).forEach(concept => {
        const row = el("article", "ox-list-item");
        const head = el("div", "ox-list-top");
        head.append(el("strong", "", concept.topic), tag(subjectName(concept.subject)));
        row.append(head, el("p", "ox-small", "Próximo repaso: " + dateLabel(concept.dueDate) + " · Repasos: " + (Number(concept.reviewCount) || 0)));
        if (due.includes(concept)) {
          const actions = el("div", "ox-actions");
          [["again", "No lo recordé"], ["hard", "Me costó"], ["good", "Correcto"], ["easy", "Fácil"]].forEach(([grade, label]) => {
            const button = el("button", "secondary ox-compact", label);
            button.type = "button";
            button.addEventListener("click", () => {
              const next = nextReview(concept.stage, grade);
              concept.stage = next.stage;
              concept.dueDate = addDays(today(), next.intervalDays);
              concept.lastReviewed = today();
              concept.reviewCount = (Number(concept.reviewCount) || 0) + 1;
              concept.lastGrade = grade;
              saveRefresh();
            });
            actions.append(button);
          });
          row.append(actions);
        }
        rootNode.append(row);
      });
    }

    function renderErrors() {
      const rootNode = $("ox-error-recovery");
      rootNode.replaceChildren();
      const errors = Array.isArray(data().errors) ? data().errors : [];
      if (!errors.length) {
        rootNode.append(el("p", "ox-muted", "No hay errores registrados. Cuando aparezca uno, anota la causa y la práctica para corregirla."));
        return;
      }
      errors.slice().reverse().forEach(error => {
        const row = el("article", "ox-list-item");
        const head = el("div", "ox-list-top");
        head.append(el("strong", "", (error.subject || "Tema") + " · " + (error.date || "Sin fecha")), tag(error.resolved ? "Recuperado" : "Pendiente"));
        row.append(head, el("p", "ox-muted", error.text || "Sin descripción"), el("p", "ox-small", "Recuperación: " + (error.fix || "Pendiente")));
        if (!error.resolved) row.append(el("p", "ox-small", "Revisar desde: " + dateLabel(error.reviewDue || error.date || today())));
        const button = el("button", "secondary ox-compact", error.resolved ? "Reabrir error" : "Marcar como recuperado");
        button.type = "button";
        button.addEventListener("click", () => {
          error.resolved = !error.resolved;
          error.resolvedAt = error.resolved ? today() : null;
          if (!error.resolved) error.reviewDue = today();
          saveRefresh();
        });
        row.append(button);
        rootNode.append(row);
      });
    }

    function renderProjects() {
      const rootNode = $("ox-project-list");
      rootNode.replaceChildren();
      const projects = learning().projects;
      if (!projects.length) rootNode.append(el("p", "ox-muted", "Todavía no hay proyectos. Registra un problema, una hipótesis y una prueba segura."));
      projects.slice().reverse().forEach(project => {
        const box = el("article", "ox-project-card");
        const head = el("div", "ox-list-top");
        head.append(el("strong", "", project.title), tag(project.discipline || "Ingeniería"));
        box.append(head, el("p", "ox-muted", project.challenge || "Sin objetivo descrito"));
        const label = el("label", "ox-field");
        label.append(el("span", "", "Fase del proceso tecnológico"));
        const select = el("select");
        STAGES.forEach((stage, index) => {
          const option = el("option", "", stage);
          option.value = String(index);
          select.append(option);
        });
        select.value = String(clamp(Number(project.stage) || 0, 0, STAGES.length - 1));
        select.addEventListener("change", () => { project.stage = Number(select.value); saveRefresh(); });
        label.append(select);
        box.append(label);
        const notes = el("textarea", "ox-project-notes");
        notes.maxLength = 1200;
        notes.placeholder = "Hipótesis, boceto, medidas, pruebas, resultado y siguiente mejora...";
        notes.value = project.notes || "";
        notes.addEventListener("change", () => { project.notes = notes.value.trim(); save(); });
        box.append(notes, el("p", "ox-small", "Creado: " + dateLabel(project.createdAt)));
        rootNode.append(box);
      });
    }

    function renderEnglish() {
      const week = mondayOf(today());
      const entries = learning().englishWeeks;
      const current = entries.find(item => item.week === week);
      ["listening", "speaking", "reading", "writing", "grammar"].forEach(field => {
        const input = $("ox-c2-" + field);
        if (document.activeElement !== input) input.value = current && Number.isFinite(current[field]) ? current[field] : "";
      });
      ["writingError", "nextExercise"].forEach(field => {
        const input = $("ox-c2-" + (field === "writingError" ? "writing-error" : "next-exercise"));
        if (document.activeElement !== input) input.value = current ? current[field] || "" : "";
      });
      const rootNode = $("ox-c2-history");
      rootNode.replaceChildren();
      const history = entries.slice().sort((a, b) => String(b.week || "").localeCompare(String(a.week || ""))).slice(0, 5);
      if (!history.length) rootNode.append(el("p", "ox-muted", "Registra tu primera evaluación dominical para empezar el seguimiento."));
      history.forEach(entry => {
        const scores = ["listening", "speaking", "reading", "writing", "grammar"].map(field => Number(entry[field])).filter(Number.isFinite);
        const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
        const row = el("article", "ox-list-item");
        row.append(el("strong", "", "Semana del " + dateLabel(entry.week)), el("p", "ox-small", average === null ? "Sin puntuaciones" : "Media: " + average + "% · Writing: " + (Number.isFinite(entry.writing) ? entry.writing + "%" : "sin nota")));
        if (entry.writingError) row.append(el("p", "ox-muted", "Patrón de escritura: " + entry.writingError));
        rootNode.append(row);
      });
    }

    function renderRoutine() {
      const dataValue = data();
      const day = (new Date().getDay() + 6) % 7;
      const tasks = (dataValue.tasks || []).filter(item => Number(item.day) === day);
      const pending = tasks.filter(item => !item.done);
      const planned = tasks.reduce((sum, item) => {
        const category = String(item.category || "");
        if (category.startsWith("Oxford · Inglés")) return sum + 45;
        if (category.startsWith("Oxford · Matemáticas")) return sum + 30;
        const match = String(item.name || "").match(/(\d{1,3})\s*min/i);
        return sum + (category.startsWith("Oxford") && match ? Number(match[1]) : 0);
      }, 0);
      const doneMinutes = dataValue.learning.sessions.filter(item => item.date === today()).reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
      const rootNode = $("ox-routine-analysis");
      rootNode.replaceChildren();
      rootNode.append(el("p", "ox-routine-lead", "Hoy: " + (tasks.length ? tasks.length + " tareas, " + pending.length + " pendientes." : "no hay tareas registradas.")));
      rootNode.append(el("p", "ox-muted", "Estudio Oxford estimado: " + planned + " min · Sesiones registradas: " + doneMinutes + " min."));
      if (planned > 75) rootNode.append(el("div", "ox-callout ox-warning", "La planificación supera el objetivo habitual de 75 minutos de inglés y matemáticas. Reparte o reduce carga si hay deberes, fútbol o cansancio. No añadas más tareas automáticamente."));
      else if (planned) rootNode.append(el("div", "ox-callout", "La planificación estimada está dentro del objetivo habitual. Divide las sesiones y conserva las pausas."));
      else rootNode.append(el("div", "ox-callout", "No se detecta un bloque Oxford con duración. Usa solo el hueco ya previsto; no hace falta añadir horas."));
      if (pending.length > 5) rootNode.append(el("p", "ox-muted", "Hay varias tareas pendientes. Prioriza el deber más urgente y un objetivo académico; evita recuperar todo de golpe."));
      if (tasks.some(item => /fútbol/i.test(String(item.category || "") + " " + String(item.name || "")))) rootNode.append(el("p", "ox-muted", "Hay fútbol registrado hoy. Mantén la recuperación y no añadas entrenamiento extra por defecto."));
      rootNode.append(el("p", "ox-small", "Este análisis no mueve, elimina ni crea tareas y respeta el horario existente."));
    }

    function buildTeacherPrompt() {
      const subject = $("ox-subject").value || "english";
      const topic = $("ox-topic").value.trim() || "empieza con un diagnóstico para elegir el tema";
      const mode = $("ox-mode").value || "diagnostic";
      const modes = {
        diagnostic: "Comienza con un diagnóstico breve y adaptativo antes de enseñar.",
        lesson: "Enseña desde los fundamentos, comprueba comprensión y usa ejemplos reales.",
        practice: "Propón práctica deliberada adaptativa y corrige el razonamiento.",
        review: "Activa el recuerdo sin apuntes y trabaja los repasos vencidos.",
        transfer: "Aplica el conocimiento a un problema nuevo del mundo real."
      };
      const sessions = learning().sessions.filter(item => item.subject === subject).slice(-4);
      const due = dueConcepts(learning().concepts, today()).filter(item => item.subject === subject).slice(0, 5);
      const openErrors = (data().errors || []).filter(item => !item.resolved && (String(item.subject || "").toLowerCase().includes(subject) || subject === "english" && /ingl[eé]s|writing/i.test(String(item.subject || "")))).slice(-4);
      const sessionLines = sessions.map(item => "- " + item.date + ": " + item.topic + "; " + (item.score === null ? "sin nota" : item.score + "%") + "; " + (Number(item.fundamentalErrors) || 0) + " errores fundamentales.");
      const reviewLines = due.map(item => "- " + item.topic + " (repaso pendiente desde " + item.dueDate + ").");
      const errorLines = openErrors.map(item => "- " + item.text + " Recuperación: " + (item.fix || "por definir") + ".");
      const englishRule = subject === "english" ? "Corrige especialmente el writing: señala el error, explica la regla, ofrece una versión corregida y hazme reescribirla sin dar por terminado el ejercicio." : "Explica en español y exige que razone; no conviertas la clase en memorización.";
      return [
        "Eres mi profesor personal del programa OXFORD 3.0. Tu prioridad es que aprenda de verdad, con rigor, progresión adaptativa y descansos sostenibles.",
        "MATERIA: " + subjectName(subject) + ". TEMA: " + topic + ".",
        "MODO DE TRABAJO: " + (modes[mode] || modes.diagnostic),
        englishRule,
        "REGLAS DIDÁCTICAS: una pregunta cada vez; cuando sea tipo test, 3–4 opciones A–D y PASO; espera mi respuesta; no reveles la solución antes de mi intento; adapta la dificultad a mis respuestas; registra errores y su causa; si hay un error fundamental, detente y recupéralo antes de avanzar; usa recuperación activa, repetición espaciada, intercalado y método Feynman; termina con una aplicación o explicación propia.",
        "OBJETIVO DE DOMINIO: al menos 85% y cero errores fundamentales en la comprobación inicial. Un buen resultado aislado no basta: confirma en más de un contexto antes de subir de nivel.",
        "CONTEXTO RECIENTE DE LA APP:",
        sessionLines.length ? sessionLines.join("\n") : "- No hay sesiones previas guardadas.",
        "REPASOS VENCIDOS:",
        reviewLines.length ? reviewLines.join("\n") : "- No hay repasos vencidos registrados.",
        "ERRORES SIN RECUPERAR:",
        errorLines.length ? errorLines.join("\n") : "- No hay errores pendientes asociados a esta materia.",
        "Respeta el horario ya configurado en mi app: no añadas sesiones ni alargues la jornada automáticamente. Empieza ahora con la primera pregunta o actividad, sin mostrarme un plan largo de respuestas."
      ].join("\n\n");
    }

    function attachEvents() {
      $("ox-study-form").addEventListener("submit", event => {
        event.preventDefault();
        const topic = $("ox-topic").value.trim();
        const minutes = Number($("ox-minutes").value);
        const scoreValue = $("ox-score").value.trim();
        const score = scoreValue === "" ? null : Number(scoreValue);
        const fundamentals = Number($("ox-fundamentals").value);
        if (!topic || !Number.isFinite(minutes) || minutes < 1 || minutes > 180) return;
        if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) return;
        learning().sessions.push({
          id: "session-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          date: today(),
          subject: $("ox-subject").value,
          topic,
          mode: $("ox-mode").value,
          minutes,
          score,
          fundamentalErrors: clamp(Number.isFinite(fundamentals) ? fundamentals : 0, 0, 99),
          reflection: $("ox-reflection").value.trim()
        });
        $("ox-study-form").reset();
        $("ox-minutes").value = "30";
        $("ox-fundamentals").value = "0";
        saveRefresh();
      });

      $("ox-add-concept").addEventListener("click", () => {
        const topic = $("ox-concept-name").value.trim();
        if (!topic) return;
        learning().concepts.push({
          id: "concept-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          topic,
          subject: $("ox-concept-subject").value,
          stage: 0,
          dueDate: addDays(today(), 1),
          reviewCount: 0,
          createdAt: today()
        });
        $("ox-concept-name").value = "";
        saveRefresh();
      });

      $("ox-add-project").addEventListener("click", () => {
        const title = $("ox-project-title").value.trim();
        if (!title) return;
        learning().projects.push({
          id: "project-" + Date.now().toString(36),
          title,
          discipline: $("ox-project-discipline").value,
          challenge: $("ox-project-challenge").value.trim(),
          stage: 0,
          notes: "",
          createdAt: today()
        });
        $("ox-project-title").value = "";
        $("ox-project-challenge").value = "";
        saveRefresh();
      });

      $("ox-english-save").addEventListener("click", () => {
        const week = mondayOf(today());
        const fields = ["listening", "speaking", "reading", "writing", "grammar"];
        const entry = learning().englishWeeks.find(item => item.week === week) || { week };
        fields.forEach(field => {
          const value = $( "ox-c2-" + field).value.trim();
          entry[field] = value === "" ? null : clamp(Number(value), 0, 100);
        });
        entry.writingError = $("ox-c2-writing-error").value.trim();
        entry.nextExercise = $("ox-c2-next-exercise").value.trim();
        const oldIndex = learning().englishWeeks.findIndex(item => item.week === week);
        if (oldIndex >= 0) learning().englishWeeks[oldIndex] = entry;
        else learning().englishWeeks.push(entry);
        saveRefresh();
        $("ox-english-status").textContent = "Evaluación semanal guardada.";
      });

      $("ox-teacher-launch").addEventListener("click", async () => {
        const prompt = buildTeacherPrompt();
        const output = $("ox-teacher-prompt");
        const status = $("ox-teacher-status");
        output.value = prompt;
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: "Clase OXFORD 3.0", text: prompt });
            status.textContent = "Menú de compartir completado. Si elegiste ChatGPT, la instrucción se ha compartido allí para iniciar la clase.";
            return;
          } catch (error) {
            if (error && error.name === "AbortError") {
              status.textContent = "Compartir cancelado; no se ha enviado nada. Puedes copiar la instrucción manualmente.";
              return;
            }
          }
        }
        try {
          if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard API no disponible");
          await navigator.clipboard.writeText(prompt);
          status.textContent = "Instrucción copiada. Abre ChatGPT y pégala en el chat. Si aparece en el menú de compartir de Android, también puedes seleccionarlo directamente.";
        } catch (error) {
          output.focus();
          output.select();
          status.textContent = "Copia el texto seleccionado y ábrelo en ChatGPT.";
        }
      });

      $("ox-teacher-copy").addEventListener("click", async () => {
        const output = $("ox-teacher-prompt");
        const status = $("ox-teacher-status");
        output.value = buildTeacherPrompt();
        try {
          await navigator.clipboard.writeText(output.value);
          status.textContent = "Instrucción copiada.";
        } catch (error) {
          output.focus();
          output.select();
          status.textContent = "Selecciona y copia el texto.";
        }
      });

      $("ox-subject").addEventListener("change", renderGuidance);
    }

    function refresh() {
      renderDashboard();
      renderSessions();
      renderReviews();
      renderErrors();
      renderProjects();
      renderEnglish();
      renderRoutine();
    }

    attachEvents();
    const prompt = buildTeacherPrompt();
    $("ox-teacher-prompt").value = prompt;
    refresh();
    root.OxfordEnhancements.refresh = refresh;
  }

  root.OxfordEnhancements = {
    init,
    refresh: null,
    addDays,
    mondayOf,
    nextReview,
    dueConcepts,
    subjectSummary,
    getGuidance,
    subjects: SUBJECTS,
    stages: STAGES
  };
})(window);
