Neutralino.init();

const audio = document.getElementById("audioPlayer");
const playPauseBtn = document.getElementById("playPauseBtn");
const progressSlider = document.getElementById("progressSlider");
const volumeSlider = document.getElementById("volumeSlider");
const timeDisplay = document.getElementById("timeDisplay");
const timeDisplayEnd = document.getElementById("timeDisplayEnd");
const trackTitle = document.getElementById("trackTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const folderBtn = document.getElementById("folderBtn");

let tracks = [], current = 0, isSeeking = false, currentUrl = null, isPlaying = false, repeat = false;
audio.volume = 0.05;

function updatePlayBtn() { playPauseBtn.textContent = isPlaying ? "⏸" : "▶"; }

function validateWindowState(state) {
    const d = { x: 216, y: 547, width: 370, height: 500 };
    if (state.x < -1000 || state.y < -1000 || state.x > 10000 || state.y > 10000) { state.x = d.x; state.y = d.y; }
    if (state.width < 100 || state.height < 100) { state.width = d.width; state.height = d.height; }
    return state;
}

async function saveWindowState() {
    try {
        const [bounds, size] = await Promise.all([Neutralino.window.getPosition(), Neutralino.window.getSize()]);
        if (bounds.x > -1000 && bounds.y > -1000 && bounds.x < 10000 && bounds.y < 10000) {
            await Neutralino.filesystem.writeFile(NL_PATH + "/window_state.config.json",
                JSON.stringify({ x: bounds.x, y: bounds.y, width: size.width, height: size.height,
                    minWidth: 370, minHeight: 500, maxWidth: -1, maxHeight: -1, resizable: false, maximize: false }, null, 2));
        }
    } catch {}
}

async function loadTrack(index) {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    current = index;
    const data = await Neutralino.filesystem.readBinaryFile(tracks[current]);
    currentUrl = URL.createObjectURL(new Blob([data], { type: "audio/mpeg" }));
    audio.src = currentUrl;
    audio.load();
    trackTitle.textContent = tracks[current].split('/').pop().replace(/\.mp3$/i, '');
    updatePlayBtn();
}

function playTrack() {
    audio.play().then(() => { isPlaying = true; updatePlayBtn(); }).catch(() => {});
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    updatePlayBtn();
}

async function changeTrack(index) {
    await loadTrack(index);
    if (isPlaying) playTrack();
}

async function loadFolder(path) {
    const files = await Neutralino.filesystem.readDirectory(path);
    tracks = files.filter(f => f.type === "FILE" && f.entry.toLowerCase().endsWith(".mp3")).map(f => path + "/" + f.entry);
    if (tracks.length > 0) await loadTrack(0);
    else trackTitle.textContent = "No mp3 files";
}

Neutralino.events.on("ready", async () => {
    try {
        const state = JSON.parse(await Neutralino.filesystem.readFile(NL_PATH + "/window_state.config.json"));
        await Neutralino.filesystem.writeFile(NL_PATH + "/window_state.config.json", JSON.stringify(validateWindowState(state), null, 2));
    } catch {}

    await Neutralino.window.setDraggableRegion("draggableRegion", { exclude: [".buttons"] });

    document.querySelector(".closeBtn").addEventListener("click", async e => {
        e.stopPropagation(); e.preventDefault();
        await saveWindowState(); Neutralino.app.exit();
    });

    let canMinimize = true;
    document.querySelector(".minimizeBtn").addEventListener("click", async e => {
        e.stopPropagation(); e.preventDefault();
        if (!canMinimize) return;
        canMinimize = false;
        await saveWindowState();
        await Neutralino.window.minimize();
        setTimeout(() => canMinimize = true, 500);
    });

    let saveTimeout;
    Neutralino.events.on("windowMove", () => { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveWindowState, 1000); });

    await loadFolder(NL_PATH + "/resources/tracklist");
});

folderBtn.onclick = async () => {
    const path = await Neutralino.os.showFolderDialog("Select music folder");
    if (path) await loadFolder(path);
};

playPauseBtn.onclick = () => isPlaying ? pauseTrack() : playTrack();
volumeSlider.oninput = () => { audio.volume = volumeSlider.value; };
prevBtn.onclick = () => tracks.length && changeTrack((current - 1 + tracks.length) % tracks.length);
nextBtn.onclick = () => tracks.length && changeTrack((current + 1) % tracks.length);
shuffleBtn.onclick = () => {
    for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    changeTrack(0);
};
repeatBtn.onclick = () => { repeat = !repeat; repeatBtn.style.opacity = repeat ? "1" : "0.5"; };

audio.addEventListener("ended", () => repeat ? playTrack() : nextBtn.click());
audio.addEventListener("timeupdate", () => {
    if (isSeeking || !audio.duration) return;
    progressSlider.value = (audio.currentTime / audio.duration) * 100;
    const fmt = t => `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
    timeDisplay.textContent = fmt(audio.currentTime);
    timeDisplayEnd.textContent = fmt(audio.duration);
});

progressSlider.addEventListener("input", () => { if (audio.duration) { isSeeking = true; audio.currentTime = (progressSlider.value / 100) * audio.duration; } });
progressSlider.addEventListener("change", () => { isSeeking = false; });

Neutralino.events.on("windowClose", async () => { await saveWindowState(); Neutralino.app.exit(); });
