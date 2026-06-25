(() => {
    "use strict";

    const symbols = ["🚀", "🌙", "⭐", "🌈", "🍀", "🎵", "🐳", "🦋"];
    const board = document.getElementById("memory-board");
    const difficultySelect = document.getElementById("difficulty");
    const startButton = document.getElementById("start-button");
    const timerElement = document.getElementById("timer");
    const movesElement = document.getElementById("moves");
    const bestTimeElement = document.getElementById("best-time");
    const messageElement = document.getElementById("game-message");

    let partidaId = null;
    let firstCard = null;
    let matchedCards = 0;
    let moves = 0;
    let blocked = false;
    let playing = false;
    let startedAt = 0;
    let timerInterval = null;

    function formatMilliseconds(milliseconds) {
        const totalSeconds = milliseconds / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(1).padStart(4, "0");
        return `${String(minutes).padStart(2, "0")}:${seconds}`;
    }

    function setMessage(message, kind = "info") {
        messageElement.textContent = message;
        messageElement.dataset.kind = kind;
    }

    function shuffle(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
        }
        return shuffled;
    }

    function buildBoard(pairs) {
        const cards = shuffle([...symbols.slice(0, pairs), ...symbols.slice(0, pairs)]);
        board.innerHTML = "";
        board.dataset.cards = String(cards.length);
        board.className = `memory-board memory-board--${cards.length}`;

        cards.forEach((symbol, index) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "memory-card";
            card.dataset.symbol = symbol;
            card.dataset.index = String(index);
            card.setAttribute("aria-label", "Carta oculta");
            card.innerHTML = `
                <span class="memory-card__inner">
                    <span class="memory-card__back" aria-hidden="true">?</span>
                    <span class="memory-card__front" aria-hidden="true">${symbol}</span>
                </span>`;
            card.addEventListener("click", () => turnCard(card));
            board.appendChild(card);
        });
    }

    function updateTimer() {
        timerElement.textContent = formatMilliseconds(performance.now() - startedAt);
    }

    function startVisualTimer() {
        startedAt = performance.now();
        timerElement.textContent = "00:00.0";
        timerInterval = window.setInterval(updateTimer, 100);
    }

    function stopVisualTimer() {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }

    async function loadSummary() {
        try {
            const response = await fetch(`/api/memoria/resumen?dificultad=${encodeURIComponent(difficultySelect.value)}`);
            if (response.status === 401) {
                window.location.assign("/login");
                return;
            }
            if (!response.ok) {
                throw new Error("No se pudo obtener el resumen.");
            }
            const data = await response.json();
            bestTimeElement.textContent = data.mejor_tiempo_ms === null
                ? "—"
                : formatMilliseconds(data.mejor_tiempo_ms);
        } catch (error) {
            bestTimeElement.textContent = "—";
        }
    }

    async function startGame() {
        startButton.disabled = true;
        difficultySelect.disabled = true;
        setMessage("Preparando la partida…");

        try {
            const response = await fetch("/api/memoria/iniciar", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({difficulty: difficultySelect.value})
            });
            if (response.status === 401) {
                window.location.assign("/login");
                return;
            }
            if (!response.ok) {
                throw new Error("No se pudo iniciar la partida.");
            }

            const data = await response.json();
            partidaId = data.id_partida;
            firstCard = null;
            matchedCards = 0;
            moves = 0;
            blocked = false;
            playing = true;
            movesElement.textContent = "0";
            buildBoard(data.pares);
            startVisualTimer();
            setMessage("Partida iniciada. Encontrá todos los pares.", "playing");
        } catch (error) {
            startButton.disabled = false;
            difficultySelect.disabled = false;
            setMessage("No fue posible iniciar la partida. Volvé a intentarlo.", "error");
        }
    }

    function turnCard(card) {
        if (!playing || blocked || card.classList.contains("is-flipped") || card.classList.contains("is-matched")) {
            return;
        }

        card.classList.add("is-flipped");
        card.setAttribute("aria-label", `Carta ${card.dataset.symbol}`);

        if (!firstCard) {
            firstCard = card;
            return;
        }

        moves += 1;
        movesElement.textContent = String(moves);
        blocked = true;

        if (firstCard.dataset.symbol === card.dataset.symbol) {
            firstCard.classList.add("is-matched");
            card.classList.add("is-matched");
            matchedCards += 2;
            firstCard = null;
            blocked = false;

            if (matchedCards === Number(board.dataset.cards)) {
                finishGame();
            }
            return;
        }

        window.setTimeout(() => {
            firstCard.classList.remove("is-flipped");
            card.classList.remove("is-flipped");
            firstCard.setAttribute("aria-label", "Carta oculta");
            card.setAttribute("aria-label", "Carta oculta");
            firstCard = null;
            blocked = false;
        }, 700);
    }

    async function finishGame() {
        playing = false;
        blocked = true;
        stopVisualTimer();
        setMessage("Guardando tu resultado…");

        try {
            const response = await fetch("/api/memoria/finalizar", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id_partida: partidaId, movimientos: moves})
            });
            if (response.status === 401) {
                window.location.assign("/login");
                return;
            }
            if (!response.ok) {
                throw new Error("No se pudo guardar la partida.");
            }

            const data = await response.json();
            timerElement.textContent = formatMilliseconds(data.tiempo_ms);
            bestTimeElement.textContent = formatMilliseconds(data.mejor_tiempo_ms);
            setMessage(data.mensaje, data.mejoro ? "success" : "complete");
        } catch (error) {
            setMessage("Terminaste el juego, pero no fue posible guardar el resultado.", "error");
        } finally {
            startButton.disabled = false;
            startButton.textContent = "Nueva partida";
            difficultySelect.disabled = false;
        }
    }

    startButton.addEventListener("click", startGame);
    difficultySelect.addEventListener("change", loadSummary);
    loadSummary();
})();
