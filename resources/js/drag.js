Neutralino.events.on("ready", async () => {
    await Neutralino.window.setDraggableRegion("draggableRegion", { exclude: [".buttons"] });

    document.querySelector(".closeBtn").addEventListener("click", e => {
        e.stopPropagation(); e.preventDefault();
        Neutralino.app.exit();
    });

    let canMinimize = true;
    document.querySelector(".minimizeBtn").addEventListener("click", async e => {
        e.stopPropagation(); e.preventDefault();
        if (!canMinimize) return;
        canMinimize = false;
        await Neutralino.window.minimize();
        setTimeout(() => canMinimize = true, 300);
    });
});

Neutralino.events.on("windowClose", () => Neutralino.app.exit());
