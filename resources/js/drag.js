Neutralino.events.on("ready", async () => {
    // Настройка draggable региона
    try {
        await Neutralino.window.setDraggableRegion("draggableRegion", {
            exclude: [".buttons"]
        });
    } catch (err) {
        console.error("Draggable region error:", err);
    }

    // Обработчик закрытия
    const closeBtn = document.querySelector(".closeBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            Neutralino.app.exit();
        });
    }

    // Обработчик минимизации с защитой от двойного вызова
    const minimizeBtn = document.querySelector(".minimizeBtn");
    if (minimizeBtn) {
        let canMinimize = true;

        minimizeBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            e.preventDefault();

            if (!canMinimize) return;
            canMinimize = false;

            try {
                await Neutralino.window.minimize();
            } catch (err) {
                console.error("Minimize error:", err);
            }

            // Разрешаем следующую минимизацию через 300мс
            setTimeout(() => { canMinimize = true; }, 300);
        });
    }
});

// Обработчик закрытия окна
Neutralino.events.on("windowClose", () => {
    Neutralino.app.exit();
});