// ============================================================
//  ДАННЫЕ
// ============================================================

const SKINS = [
    { id: "common", name: "обычное плохоефото",            rarity: "Обычное",            bonus: 1,   emoji: "📷", photo: "photos/1.jpg" },
    { id: "rare",   name: "редкое плохоефото",             rarity: "Редкое",             bonus: 3,   emoji: "🖼️", photo: "photos/2.jpg" },
    { id: "epic",   name: "эпическое плохоефото",          rarity: "Эпическое",          bonus: 7,   emoji: "🎞️", photo: "photos/3.jpg" },
    { id: "mythic", name: "мифическое плохоефото",         rarity: "Мифическое",         bonus: 15,  emoji: "🔮", photo: "photos/4.jpg" },
    { id: "super",  name: "сверхъестественное плохоефото", rarity: "Сверхъестественное", bonus: 40,  emoji: "👻", photo: "photos/5.jpg" },
    { id: "divine", name: "божественное плохоефото",       rarity: "Божественное",       bonus: 100, emoji: "✨", photo: "photos/6.jpg" }
];

const RARITY_COLORS = {
    "Обычное": "#888",
    "Редкое": "#4ea8de",
    "Эпическое": "#9d4edd",
    "Мифическое": "#f72585",
    "Сверхъестественное": "#fca311",
    "Божественное": "#ffd60a"
};

const CASES = [
    {
        id: "basic",
        name: "Обычный кейс",
        cost: 10,
        drops: [
            { id: "common", chance: 50 },
            { id: "rare",   chance: 40 },
            { id: "epic",   chance: 10 }
        ]
    },
    {
        id: "premium",
        name: "Премиум кейс",
        cost: 200,
        drops: [
            { id: "common", chance: 10 },
            { id: "rare",   chance: 25 },
            { id: "epic",   chance: 35 },
            { id: "mythic", chance: 25 },
            { id: "super",  chance: 4  },
            { id: "divine", chance: 1  }
        ]
    }
];

// ============================================================
//  ЗВУК (Web Audio API — без файлов)
// ============================================================

let audioCtx = null;
let muted = false;

function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

// Базовая функция: играет тон заданной частоты
function tone(freq, duration, type = "sine", volume = 0.15, delay = 0) {
    if (muted) return;
    const ctx = ensureAudio();
    const t0 = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
}

// --- Клик по фото ---
function sfxClick() {
    tone(880, 0.06, "square", 0.08);
}

// --- Открытие кейса (свист) ---
function sfxOpen() {
    if (muted) return;
    const ctx = ensureAudio();
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, t0);
    osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.35);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
}

// --- Выпадение скина (звук зависит от редкости) ---
function sfxDrop(rarity) {
    switch (rarity) {
        case "Обычное":
            tone(220, 0.15, "sine", 0.12);
            break;
        case "Редкое":
            tone(330, 0.15, "sine", 0.14);
            tone(440, 0.2, "sine", 0.12, 0.1);
            break;
        case "Эпическое":
            tone(440, 0.15, "triangle", 0.14);
            tone(554, 0.15, "triangle", 0.12, 0.1);
            tone(659, 0.25, "triangle", 0.12, 0.2);
            break;
        case "Мифическое":
            [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, "triangle", 0.12, i * 0.07));
            break;
        case "Сверхъестественное":
            [659, 784, 988, 1175, 1319].forEach((f, i) => tone(f, 0.25, "sine", 0.14, i * 0.08));
            break;
        case "Божественное":
            [784, 988, 1175, 1568, 1760, 2093].forEach((f, i) => tone(f, 0.3, "sine", 0.16, i * 0.1));
            break;
    }
}

// ============================================================
//  ФОНОВАЯ МУЗЫКА (из файла)
// ============================================================

const bgMusic = new Audio("sounds/music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;

let musicStarted = false;

// Запустить музыку (только после первого клика пользователя)
function startMusic() {
    if (musicStarted || !state.musicOn) return;
    bgMusic.play()
        .then(() => { musicStarted = true; })
        .catch(err => console.warn("Музыка не запустилась:", err));
}

function stopMusic() {
    bgMusic.pause();
    musicStarted = false;
}

// ============================================================
//  СОСТОЯНИЕ
// ============================================================

let state = {
    coins: 0,
    owned: { common: 1 },
    equipped: "common",
    muted: false,
    musicOn: true
};

// ============================================================
//  DOM-ССЫЛКИ
// ============================================================

const $ = (id) => document.getElementById(id);

const $coinsCount     = $("coins-count");
const $perClickValue  = $("per-click-value");
const $photo          = $("photo");
const $photoContent   = $("photo-content");
const $btnCases       = $("btn-cases");
const $btnCollection  = $("btn-collection");
const $btnSettings    = $("btn-settings");

const $casesModal     = $("cases-modal");
const $casesList      = $("cases-list");

const $dropModal      = $("drop-modal");
const $dropPhoto      = $("drop-photo");
const $dropName       = $("drop-name");
const $dropRarity     = $("drop-rarity");
const $dropBadge      = $("drop-badge");
const $dropClose      = $("drop-close");

const $collectionScreen = $("collection-screen");
const $collectionGrid   = $("collection-grid");
const $collectionBack   = $("collection-back");

const $settingsModal  = $("settings-modal");
const $resetBtn       = $("reset-btn");

// ============================================================
//  СОХРАНЕНИЕ / ЗАГРУЗКА
// ============================================================

const SAVE_KEY = "badphoto_state";

// Дебаунс: пишем не на каждый клик, а раз в 300 мс после последнего
let saveTimer = null;

function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }, 300);
}

function load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        state = {
            coins: parsed.coins ?? 0,
            owned: parsed.owned ?? { common: 1 },
            equipped: parsed.equipped ?? "common",
            muted: parsed.muted ?? false,
            musicOn: parsed.musicOn ?? true
        };
        muted = state.muted;
        // Восстановление целостности
        if (!state.owned[state.equipped]) {
            state.equipped = "common";
            if (!state.owned.common) state.owned.common = 1;
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ
// ============================================================

function getSkin(id) {
    return SKINS.find(s => s.id === id);
}

function currentSkin() {
    return getSkin(state.equipped);
}

function renderSkinPhoto(el, skin) {
    if (skin.photo) {
        el.innerHTML = `<img src="${skin.photo}" alt="${skin.name}">`;
    } else {
        el.textContent = skin.emoji;
    }
}

// ============================================================
//  ОТРИСОВКА
// ============================================================

function render() {
    const skin = currentSkin();
    $coinsCount.textContent = state.coins;
    $perClickValue.textContent = "+" + skin.bonus;
    renderSkinPhoto($photoContent, skin);
    save();
}

// ============================================================
//  КЛИК ПО ФОТО
// ============================================================

$photo.addEventListener("click", (e) => {
    startMusic();   // ← первый клик запускает музыку
    const skin = currentSkin();
    state.coins += skin.bonus;
    sfxClick();

    // Всплывающий +N
    const fly = document.createElement("div");
    fly.className = "click-fly";
    fly.textContent = "+" + skin.bonus;

    const rect = $photo.getBoundingClientRect();
    fly.style.left = (e.clientX - rect.left - 15) + "px";
    fly.style.top  = (e.clientY - rect.top  - 20) + "px";
    $photo.appendChild(fly);
    setTimeout(() => fly.remove(), 700);

    render();
});

// ============================================================
//  ВЫБОР ПРЕДМЕТА ИЗ КЕЙСА
// ============================================================

function pickItem(caseObj) {
    const total = caseObj.drops.reduce((sum, d) => sum + d.chance, 0);
    let r = Math.random() * total;
    for (const d of caseObj.drops) {
        r -= d.chance;
        if (r <= 0) return getSkin(d.id);
    }
    return getSkin(caseObj.drops[0].id);
}

// ============================================================
//  МОДАЛКА КЕЙСОВ
// ============================================================

function openCasesModal() {
    renderCasesList();
    $casesModal.classList.remove("hidden");
}

function renderCasesList() {
    $casesList.innerHTML = "";
    CASES.forEach(c => {
        const btn = document.createElement("button");
        btn.className = "case-item";
        btn.disabled = state.coins < c.cost;
        btn.innerHTML = `
            <span class="case-item-name">${c.name}</span>
            <span class="case-item-cost">${c.cost} 🪙</span>
        `;
        btn.addEventListener("click", () => openCase(c));
        $casesList.appendChild(btn);
    });
}

function openCase(c) {
    state.coins -= c.cost;
    sfxOpen();        
    const skin = pickItem(c);
    const isNew = !state.owned[skin.id];
    state.owned[skin.id] = (state.owned[skin.id] || 0) + 1;

    $casesModal.classList.add("hidden");
    showDrop(skin, isNew);
    render();
}

// ============================================================
//  МОДАЛКА ВЫПАДЕНИЯ
// ============================================================

function showDrop(skin, isNew) {
    renderSkinPhoto($dropPhoto, skin);
    $dropName.textContent = skin.name;
    $dropRarity.textContent = skin.rarity;
    sfxDrop(skin.rarity);   
    $dropRarity.style.color = RARITY_COLORS[skin.rarity] || "#fff";
    $dropBadge.classList.toggle("hidden", !isNew);
    $dropModal.classList.remove("hidden");
}

$dropClose.addEventListener("click", () => {
    $dropModal.classList.add("hidden");
});

// ============================================================
//  ЭКРАН КОЛЛЕКЦИИ
// ============================================================

function openCollection() {
    renderCollection();
    $collectionScreen.classList.remove("hidden");
}

function renderCollection() {
    $collectionGrid.innerHTML = "";
    SKINS.forEach(skin => {
        const owned = state.owned[skin.id] || 0;
        const isEquipped = state.equipped === skin.id;

        const item = document.createElement("div");
        item.className = "collection-item";
        if (!owned) item.classList.add("locked");
        if (isEquipped) item.classList.add("equipped");

        // Фото
        const photoDiv = document.createElement("div");
        photoDiv.className = "collection-photo";
        if (owned) {
            renderSkinPhoto(photoDiv, skin);
        } else {
            photoDiv.textContent = "❓";
        }
        item.appendChild(photoDiv);

        // Название
        const name = document.createElement("div");
        name.className = "collection-name";
        name.textContent = owned ? skin.name : "???";
        item.appendChild(name);

        // Редкость
        const rarity = document.createElement("div");
        rarity.className = "collection-rarity";
        rarity.textContent = skin.rarity;
        rarity.style.color = RARITY_COLORS[skin.rarity] || "#888";
        item.appendChild(rarity);

        // Счётчик
        const count = document.createElement("div");
        count.className = "collection-count";
        count.textContent = owned ? `Выпало: ${owned}` : "";
        item.appendChild(count);

        // Кнопка
        const btn = document.createElement("button");
        btn.className = "equip-btn";
        if (isEquipped) {
            btn.textContent = "НАДЕТО";
            btn.disabled = true;
        } else if (owned) {
            btn.textContent = "НАНЯТЬ";
            btn.addEventListener("click", () => {
                state.equipped = skin.id;
                render();
                renderCollection();
            });
        } else {
            btn.textContent = "НЕ НАЙДЕНО";
            btn.disabled = true;
        }
        item.appendChild(btn);

        $collectionGrid.appendChild(item);
    });
}

$collectionBack.addEventListener("click", () => {
    $collectionScreen.classList.add("hidden");
});

// ============================================================
//  НАСТРОЙКИ
// ============================================================

$btnSettings.addEventListener("click", () => {
    $settingsModal.classList.remove("hidden");
});

$resetBtn.addEventListener("click", () => {
    if (!confirm("Точно сбросить весь прогресс?")) return;
    state = { coins: 0, owned: { common: 1 }, equipped: "common" };
    localStorage.removeItem(SAVE_KEY);
    $settingsModal.classList.add("hidden");
    render();
});

// ============================================================
//  ЗАКРЫТИЕ МОДАЛОК
// ============================================================

document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
        $(btn.dataset.close).classList.add("hidden");
    });
});

// ============================================================
//  НАВИГАЦИЯ
// ============================================================

$btnCases.addEventListener("click", openCasesModal);
$btnCollection.addEventListener("click", openCollection);

// ============================================================
//  УПРАВЛЕНИЕ ЗВУКОМ
// ============================================================

const $soundToggle = $("sound-toggle");

// При загрузке синхронизируем галочку с состоянием
function syncSoundToggle() {
    $soundToggle.checked = !muted;
}

$soundToggle.addEventListener("change", () => {
    muted = !$soundToggle.checked;
    state.muted = muted;
    save();
    // Небольшой подтверждающий звук при включении
    if (!muted) sfxClick();
});

const $musicToggle = $("music-toggle");

function syncMusicToggle() {
    $musicToggle.checked = state.musicOn;
}

$musicToggle.addEventListener("change", () => {
    state.musicOn = $musicToggle.checked;
    save();

    if (state.musicOn) {
        // если музыка ещё ни разу не играла — запустим
        if (!musicStarted) startMusic();
        else bgMusic.play().catch(() => {});
    } else {
        bgMusic.pause();
    }
});

// Регистрируем сразу после load()

// ============================================================
//  СТАРТ
// ============================================================

load();
syncSoundToggle();
syncMusicToggle();
render();