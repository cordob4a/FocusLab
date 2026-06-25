const board = document.getElementById("reaction-board");
const startButton = document.getElementById("reaction-start");
const difficultySelect = document.getElementById("reaction-difficulty");

const progressElement = document.getElementById("reaction-progress");
const hitsElement = document.getElementById("reaction-hits");
const missesElement = document.getElementById("reaction-misses");
const averageElement = document.getElementById("reaction-average");
const accuracyElement = document.getElementById("reaction-accuracy");
const messageElement = document.getElementById("reaction-message");
const resultElement = document.getElementById("reaction-result");
const scoreElement = document.getElementById("reaction-score");
const comboElement = document.getElementById("reaction-combo");
const progressBar = document.getElementById("reaction-progress-bar");
const gameStatus = document.getElementById("game-status");

let partidaId = null;
let totalObjetivos = 0;
let vidaObjetivoMs = 0;
let intervaloMs = 0;

let objetivoActual = 0;
let aciertos = 0;
let fallos = 0;
let combo = 0;
let mejorCombo = 0;
let puntajeLocal = 0;
let tiemposReaccion = [];

let objetivoActivo = null;
let objetivoInicio = null;
let timeoutObjetivo = null;
let juegoActivo = false;

function limpiarObjetivo() {
    if (objetivoActivo) {
        objetivoActivo.classList.add("target-exit");
        const objetivoParaBorrar = objetivoActivo;
        setTimeout(() => objetivoParaBorrar.remove(), 180);
        objetivoActivo = null;
    }

    if (timeoutObjetivo) {
        clearTimeout(timeoutObjetivo);
        timeoutObjetivo = null;
    }
}

function calcularPromedio() {
    if (tiemposReaccion.length === 0) {
        return null;
    }

    return tiemposReaccion.reduce((total, valor) => total + valor, 0) / tiemposReaccion.length;
}

function calcularPrecision() {
    const total = aciertos + fallos;
    if (total === 0) {
        return null;
    }

    return (aciertos / total) * 100;
}

function formatearScore(valor) {
    return String(Math.max(0, Math.round(valor))).padStart(6, "0");
}

function actualizarPanel() {
    progressElement.textContent = `${objetivoActual}/${totalObjetivos}`;
    hitsElement.textContent = aciertos;
    missesElement.textContent = fallos;
    comboElement.textContent = `${combo}x`;
    scoreElement.textContent = formatearScore(puntajeLocal);

    const avance = totalObjetivos > 0 ? (objetivoActual / totalObjetivos) * 100 : 0;
    progressBar.style.width = `${Math.min(100, avance)}%`;

    const promedio = calcularPromedio();
    averageElement.textContent = promedio === null ? "—" : `${Math.round(promedio)} ms`;

    const precision = calcularPrecision();
    accuracyElement.textContent = precision === null ? "—" : `${precision.toFixed(1)}%`;
}

function posicionAleatoria() {
    const rect = board.getBoundingClientRect();
    const size = window.innerWidth <= 640 ? 66 : 82;
    const margen = 24;

    const maxX = Math.max(margen, rect.width - size - margen);
    const maxY = Math.max(margen, rect.height - size - margen);

    return {
        x: Math.floor(Math.random() * (maxX - margen + 1)) + margen,
        y: Math.floor(Math.random() * (maxY - margen + 1)) + margen,
        size,
    };
}

function mostrarFeedback(texto, x, y, tipo) {
    const feedback = document.createElement("div");
    feedback.className = `osu-feedback ${tipo}`;
    feedback.textContent = texto;
    feedback.style.left = `${x}px`;
    feedback.style.top = `${y}px`;

    board.appendChild(feedback);
    setTimeout(() => feedback.remove(), 760);
}

function evaluarGolpe(tiempo) {
    if (tiempo <= 360) {
        return { texto: "PERFECT", base: 320, clase: "perfect" };
    }

    if (tiempo <= 650) {
        return { texto: "GOOD", base: 180, clase: "good" };
    }

    return { texto: "OK", base: 90, clase: "ok" };
}

function crearLineaGuia(x, y, size) {
    const ultimo = board.querySelector(".last-hit-marker");
    if (!ultimo) {
        return;
    }

    const fromX = parseFloat(ultimo.dataset.x);
    const fromY = parseFloat(ultimo.dataset.y);
    const toX = x + size / 2;
    const toY = y + size / 2;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const largo = Math.sqrt(dx * dx + dy * dy);
    const angulo = Math.atan2(dy, dx) * 180 / Math.PI;

    const linea = document.createElement("div");
    linea.className = "aim-line";
    linea.style.left = `${fromX}px`;
    linea.style.top = `${fromY}px`;
    linea.style.width = `${largo}px`;
    linea.style.transform = `rotate(${angulo}deg)`;

    board.appendChild(linea);
    setTimeout(() => linea.remove(), 520);
}

function guardarUltimoHit(x, y) {
    const anterior = board.querySelector(".last-hit-marker");
    if (anterior) {
        anterior.remove();
    }

    const marker = document.createElement("span");
    marker.className = "last-hit-marker";
    marker.dataset.x = x;
    marker.dataset.y = y;
    board.appendChild(marker);
}

function crearObjetivo() {
    limpiarObjetivo();

    if (!juegoActivo) {
        return;
    }

    if (objetivoActual >= totalObjetivos) {
        finalizarJuego();
        return;
    }

    objetivoActual += 1;
    actualizarPanel();

    messageElement.hidden = true;
    gameStatus.textContent = "En juego";

    const { x, y, size } = posicionAleatoria();
    crearLineaGuia(x, y, size);

    const target = document.createElement("button");
    target.type = "button";
    target.className = "osu-target";
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    target.style.setProperty("--life", `${vidaObjetivoMs}ms`);
    target.setAttribute("aria-label", `Objetivo ${objetivoActual}`);

    target.innerHTML = `
        <span class="approach-circle"></span>
        <span class="hit-circle">
            <span>${objetivoActual}</span>
        </span>
    `;

    objetivoActivo = target;
    objetivoInicio = performance.now();

    target.addEventListener("click", (event) => {
        event.stopPropagation();

        if (!juegoActivo || target !== objetivoActivo) {
            return;
        }

        const tiempo = performance.now() - objetivoInicio;
        const evaluacion = evaluarGolpe(tiempo);

        tiemposReaccion.push(tiempo);
        aciertos += 1;
        combo += 1;
        mejorCombo = Math.max(mejorCombo, combo);

        const bonusVelocidad = Math.max(0, Math.round(vidaObjetivoMs - tiempo));
        const bonusCombo = combo * 9;
        const puntos = evaluacion.base + bonusVelocidad + bonusCombo;
        puntajeLocal += puntos;

        mostrarFeedback(`${evaluacion.texto} +${puntos}`, x + size / 2, y - 10, evaluacion.clase);
        guardarUltimoHit(x + size / 2, y + size / 2);

        limpiarObjetivo();
        actualizarPanel();
        setTimeout(crearObjetivo, intervaloMs);
    });

    board.appendChild(target);

    timeoutObjetivo = setTimeout(() => {
        if (!juegoActivo || target !== objetivoActivo) {
            return;
        }

        fallos += 1;
        combo = 0;

        mostrarFeedback("MISS", x + size / 2, y - 10, "miss");
        limpiarObjetivo();
        actualizarPanel();
        setTimeout(crearObjetivo, intervaloMs);
    }, vidaObjetivoMs);
}

async function iniciarJuego() {
    startButton.disabled = true;
    difficultySelect.disabled = true;
    resultElement.hidden = true;
    resultElement.innerHTML = "";

    board.querySelectorAll(".osu-feedback, .aim-line, .last-hit-marker").forEach((elemento) => elemento.remove());

    partidaId = null;
    totalObjetivos = 0;
    vidaObjetivoMs = 0;
    intervaloMs = 0;
    objetivoActual = 0;
    aciertos = 0;
    fallos = 0;
    combo = 0;
    mejorCombo = 0;
    puntajeLocal = 0;
    tiemposReaccion = [];

    actualizarPanel();

    messageElement.hidden = false;
    messageElement.innerHTML = `
        <strong>Preparando</strong>
        <span>Cuando aparezca el círculo, hacé clic lo más rápido posible.</span>
    `;
    gameStatus.textContent = "Preparando";

    try {
        const response = await fetch("/api/reaccion/iniciar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                dificultad: difficultySelect.value,
            }),
        });

        if (!response.ok) {
            throw new Error("No se pudo iniciar la partida.");
        }

        const data = await response.json();

        partidaId = data.id_partida;
        totalObjetivos = data.objetivos;
        vidaObjetivoMs = data.vida_ms;
        intervaloMs = data.intervalo_ms;
        juegoActivo = true;

        actualizarPanel();

        setTimeout(() => {
            if (!juegoActivo) {
                return;
            }

            messageElement.innerHTML = `
                <strong>¡Ahora!</strong>
                <span>Tocá los círculos en orden.</span>
            `;
            setTimeout(crearObjetivo, 420);
        }, 620);
    } catch (error) {
        messageElement.innerHTML = `
            <strong>Error</strong>
            <span>No se pudo iniciar el juego. Intentá nuevamente.</span>
        `;
        startButton.disabled = false;
        difficultySelect.disabled = false;
        gameStatus.textContent = "Error";
    }
}

async function finalizarJuego() {
    juegoActivo = false;
    limpiarObjetivo();

    startButton.disabled = false;
    difficultySelect.disabled = false;
    gameStatus.textContent = "Finalizado";

    messageElement.hidden = false;
    messageElement.innerHTML = `
        <strong>Partida finalizada</strong>
        <span>Guardando resultado...</span>
    `;

    const total = aciertos + fallos;
    const precision = total > 0 ? (aciertos / total) * 100 : 0;

    let promedio = 10000;
    let mejor = 10000;
    let peor = 10000;

    if (tiemposReaccion.length > 0) {
        promedio = calcularPromedio();
        mejor = Math.min(...tiemposReaccion);
        peor = Math.max(...tiemposReaccion);
    }

    const puntajeFinal = Math.max(0, Math.round(puntajeLocal));
    actualizarPanel();

    try {
        const response = await fetch("/api/reaccion/finalizar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id_partida: partidaId,
                aciertos: aciertos,
                fallos: fallos,
                promedio_ms: promedio,
                mejor_ms: mejor,
                peor_ms: peor,
                precision: precision,
                puntaje: puntajeFinal,
            }),
        });

        if (!response.ok) {
            throw new Error("No se pudo guardar el resultado.");
        }

        const data = await response.json();

        messageElement.innerHTML = `
            <strong>Completado</strong>
            <span>Tu partida quedó registrada.</span>
        `;

        resultElement.hidden = false;
        resultElement.innerHTML = `
            <div class="osu-result-main">
                <span>${data.mejoro ? "Progreso detectado" : "Resultado"}</span>
                <h3>${data.mensaje}</h3>
            </div>
            <div class="osu-result-grid">
                <div><span>Puntaje</span><strong>${data.puntaje}</strong></div>
                <div><span>Combo máximo</span><strong>${mejorCombo}x</strong></div>
                <div><span>Promedio</span><strong>${Math.round(data.promedio_ms)} ms</strong></div>
                <div><span>Mejor</span><strong>${Math.round(data.mejor_ms)} ms</strong></div>
                <div><span>Precisión</span><strong>${data.precision.toFixed(1)}%</strong></div>
            </div>
        `;
    } catch (error) {
        messageElement.innerHTML = `
            <strong>Completado</strong>
            <span>No se pudo guardar en la base de datos.</span>
        `;
        resultElement.hidden = false;
        resultElement.innerHTML = `
            <div class="osu-result-main">
                <span>Error</span>
                <h3>La partida terminó, pero no se pudo guardar el resultado.</h3>
            </div>
        `;
    }
}

startButton.addEventListener("click", iniciarJuego);
