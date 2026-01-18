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

let tracks = [];
let current = 0;
let isSeeking = false;
let currentUrl = null;
let savedVolume = 0.05;
let isPlaying = false;
let repeat = false;

audio.volume = savedVolume;

function validateWindowState(state) {
    const defaults = { x: 216, y: 547, width: 370, height: 500 };
    if (state.x < -1000 || state.y < -1000 || state.x > 10000 || state.y > 10000) {
        state.x = defaults.x;
        state.y = defaults.y;
    }
    if (state.width < 100 || state.height < 100) {
        state.width = defaults.width;
        state.height = defaults.height;
    }
    return state;
}

async function saveWindowState() {
    try {
        const bounds = await Neutralino.window.getPosition();
        const size = await Neutralino.window.getSize();
        if (bounds.x > -1000 && bounds.y > -1000 && bounds.x < 10000 && bounds.y < 10000) {
            await Neutralino.filesystem.writeFile(NL_PATH + "/window_state.config.json",
                JSON.stringify({ x: bounds.x, y: bounds.y, width: size.width, height: size.height,
                    minWidth: 370, minHeight: 500, maxWidth: -1, maxHeight: -1, resizable: false, maximize: false }, null, 2));
        }
    } catch (err) {}
}

async function loadTrack(index) {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    current = index;
    const filePath = tracks[current];
    const data = await Neutralino.filesystem.readBinaryFile(filePath);
    const blob = new Blob([data], { type: "audio/mpeg" });
    currentUrl = URL.createObjectURL(blob);
    audio.src = currentUrl;
    audio.load();
    trackTitle.textContent = filePath.split('/').pop().replace(/\.mp3$/i, '');
    playPauseBtn.textContent = "▶";
}

function playTrack() {
    audio.play().then(() => {
        audio.volume = savedVolume;
        playPauseBtn.textContent = "⏸";
        isPlaying = true;
    }).catch(() => {});
}

function pauseTrack() {
    audio.pause();
    playPauseBtn.textContent = "▶";
    isPlaying = false;
}

async function changeTrack(index) {
    await loadTrack(index);
    if (isPlaying) playTrack();
}

Neutralino.events.on("ready", async () => {
    try {
        const state = JSON.parse(await Neutralino.filesystem.readFile(NL_PATH + "/window_state.config.json"));
        await Neutralino.filesystem.writeFile(NL_PATH + "/window_state.config.json", JSON.stringify(validateWindowState(state), null, 2));
    } catch(e) {}

    await Neutralino.window.setDraggableRegion("draggableRegion", { exclude: [".buttons"] });

    document.querySelector(".closeBtn").addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await saveWindowState();
        Neutralino.app.exit();
    });

    let canMinimize = true;
    document.querySelector(".minimizeBtn").addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!canMinimize) return;
        canMinimize = false;
        await saveWindowState();
        await Neutralino.window.minimize();
        setTimeout(() => { canMinimize = true; }, 500);
    });

    let saveTimeout;
    Neutralino.events.on("windowMove", () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveWindowState(), 1000);
    });

    try {
        const dir = NL_PATH + "/resources/tracklist/";
        const files = await Neutralino.filesystem.readDirectory(dir);
        tracks = files.filter(f => f.type === "FILE" && f.entry.toLowerCase().endsWith(".mp3")).map(f => dir + f.entry);
        if (tracks.length > 0) loadTrack(0);
        else trackTitle.textContent = "No mp3 files";
    } catch(e) {}
});

folderBtn.onclick = async () => {
    const folderPath = await Neutralino.os.showFolderDialog("Select music folder");
    if (!folderPath) return;
    const files = await Neutralino.filesystem.readDirectory(folderPath);
    tracks = files.filter(f => f.type === "FILE" && f.entry.toLowerCase().endsWith(".mp3")).map(f => folderPath + "/" + f.entry);
    if (tracks.length > 0) await loadTrack(0);
    else trackTitle.textContent = "No mp3 files in folder";
};

playPauseBtn.onclick = () => { if (!isPlaying) playTrack(); else pauseTrack(); };
volumeSlider.oninput = () => { savedVolume = volumeSlider.value; audio.volume = savedVolume; };
prevBtn.onclick = () => { if (tracks.length === 0) return; current = (current - 1 + tracks.length) % tracks.length; changeTrack(current); };
nextBtn.onclick = () => { if (tracks.length === 0) return; current = (current + 1) % tracks.length; changeTrack(current); };
shuffleBtn.onclick = () => { for (let i = tracks.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [tracks[i], tracks[j]] = [tracks[j], tracks[i]] }; current=0; changeTrack(current); };
repeatBtn.onclick = () => { repeat = !repeat; repeatBtn.style.opacity = repeat ? "1" : "0.5"; };

audio.addEventListener("ended", () => { if (repeat) playTrack(); else nextBtn.click(); });
audio.addEventListener("timeupdate", () => {
    if (isSeeking || !audio.duration) return;
    progressSlider.value = (audio.currentTime/audio.duration)*100;
    const m = Math.floor(audio.currentTime/60).toString().padStart(2,'0');
    const s = Math.floor(audio.currentTime%60).toString().padStart(2,'0');
    const tm = Math.floor(audio.duration/60).toString().padStart(2,'0');
    const ts = Math.floor(audio.duration%60).toString().padStart(2,'0');
    timeDisplay.textContent = `${m}:${s}`;
    timeDisplayEnd.textContent = `${tm}:${ts}`;
});

progressSlider.addEventListener("input", () => { if (!audio.duration) return; isSeeking=true; audio.currentTime=(progressSlider.value/100)*audio.duration; });
progressSlider.addEventListener("change", () => { isSeeking=false; });

Neutralino.events.on("windowClose", async () => {
    await saveWindowState();
    Neutralino.app.exit();
});