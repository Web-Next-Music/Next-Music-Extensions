// Получение настроек из PulseSync
async function getSettings(name) {
    try {
        const response = await fetch(
            `http://localhost:2007/get_handle?name=${name}`,
        );
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);

        const { data } = await response.json();
        if (!data?.sections) {
            console.warn("Структура данных не соответствует ожидаемой");
            return null;
        }

        return transformJSON(data);
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Преобразование настроек в удобный формат
function transformJSON(data) {
    const result = {};

    try {
        data.sections.forEach((section) => {
            section.items.forEach((item) => {
                if (item.type === "text" && item.buttons) {
                    result[item.id] = {};
                    item.buttons.forEach((button) => {
                        result[item.id][button.id] = {
                            value: button.text,
                            default: button.defaultParameter,
                        };
                    });
                } else {
                    // Правильное определение значения в зависимости от типа
                    let value;
                    if (item.type === "button") {
                        value = item.bool;
                    } else if (item.type === "color") {
                        value = item.input;
                    } else if (item.type === "selector") {
                        value = item.selected;
                    } else if (item.type === "slider") {
                        value = item.value;
                    } else if (item.type === "file") {
                        value = item.filePath;
                    }

                    result[item.id] = {
                        value: value,
                        default: item.defaultParameter,
                    };
                }
            });
        });
    } finally {
        return result;
    }
}

// Класс для управления таймером
class MusicTimer {
    constructor() {
        this.totalTime = this.loadTime();
        this.isPlaying = false;
        this.startTime = null;
        this.timerElement = null;
        this.lastResetState = false;
    }

    // Загрузка сохраненного времени
    loadTime() {
        const saved = localStorage.getItem("yandexMusicTotalTime");
        return saved ? parseInt(saved, 10) : 0;
    }

    // Сохранение времени
    saveTime() {
        localStorage.setItem("yandexMusicTotalTime", this.totalTime.toString());
    }

    // Сброс времени
    resetTime() {
        this.totalTime = 0;
        this.saveTime();
    }

    // Запуск таймера
    start() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.startTime = Date.now();
        }
    }

    // Остановка таймера
    stop() {
        if (this.isPlaying) {
            this.isPlaying = false;
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.totalTime += elapsed;
            this.saveTime();
        }
    }

    // Получение текущего времени
    getCurrentTime() {
        let time = this.totalTime;
        if (this.isPlaying && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            time += elapsed;
        }
        return time;
    }

    // Форматирование времени
    formatTime(seconds, showSeconds = true) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (showSeconds) {
            return `${hours}ч ${minutes}м ${secs}с`;
        } else {
            return `${hours}ч ${minutes}м`;
        }
    }

    // Создание элемента таймера
    createTimerElement(settings) {
        if (this.timerElement) {
            this.timerElement.remove();
        }

        this.timerElement = document.createElement("div");
        this.timerElement.id = "yandex-music-timer";

        // Применение стилей на основе настроек
        const position = this.getPosition(settings.timerPosition.value);
        const fontSize = settings.fontSize.value;

        // Определяем цвет: статический или динамический
        let color;
        if (settings.timerColor.value === true) {
            // Статический цвет из настроек
            color = settings.customColor.value;
        } else {
            // Динамический цвет из заголовка страницы (имя пользователя)
            const titleElement = document.querySelector(
                `[class*="UserProfile_userName"]`,
            );
            color = titleElement
                ? window.getComputedStyle(titleElement).color
                : "#ffffff";
        }

        this.timerElement.style.cssText = `
            position: fixed;
            ${position}
            color: ${color};
            padding: 10px 15px;
            font-size: ${fontSize}px;
            font-family: 'YS Text', Arial, sans-serif;
            z-index: 10000;
            pointer-events: none;
            user-select: none;
            max-height: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            box-sizing: border-box;
        `;

        document.body.appendChild(this.timerElement);
    }

    // Определение позиции таймера
    getPosition(positionValue) {
        const positions = {
            1: "top: 0px; left: 50%; transform: translateX(-50%);",
            2: "top: 0px; left: 0px;",
            3: "bottom: 0px; left: 0px;",
        };
        return positions[positionValue] || positions[1];
    }

    // Обновление отображения таймера
    updateDisplay(settings) {
        if (!settings.showTimer.value) {
            if (this.timerElement) {
                this.timerElement.remove();
                this.timerElement = null;
            }
            return;
        }

        if (!this.timerElement) {
            this.createTimerElement(settings);
        }

        const currentTime = this.getCurrentTime();
        const formattedTime = this.formatTime(
            currentTime,
            settings.showSeconds.value,
        );
        const icon = settings.showIcon.value ? "🎵 " : "";

        // Определяем цвет: статический или динамический
        let color;
        if (settings.timerColor.value === true) {
            // Статический цвет из настроек
            color = settings.customColor.value;
        } else {
            // Динамический цвет из заголовка страницы (имя пользователя)
            const titleElement = document.querySelector(
                `[class*="UserProfile_userName"]`,
            );
            color = titleElement
                ? window.getComputedStyle(titleElement).color
                : "#ffffff";
        }

        if (this.timerElement) {
            this.timerElement.textContent = `${icon}${formattedTime}`;

            // Обновление стилей при изменении настроек
            const position = this.getPosition(settings.timerPosition.value);
            const fontSize = settings.fontSize.value;

            this.timerElement.style.cssText = `
                position: fixed;
                ${position}
                color: ${color};
                padding: 10px 15px;
                font-size: ${fontSize}px;
                font-family: 'YS Text', Arial, sans-serif;
                z-index: 10000;
                pointer-events: none;
                user-select: none;
                max-height: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                box-sizing: border-box;
            `;
        }
    }
}

// Инициализация таймера
const musicTimer = new MusicTimer();

// Функция для проверки состояния воспроизведения
function checkPlaybackState() {
    // Проверяем наличие кнопки паузы (означает, что музыка играет)
    const playButton = [
        ...document.querySelectorAll(
            '[class*="BaseSonataControlsDesktop_sonataButton"] use',
        ),
    ].find((el) => {
        const href = el.getAttribute("href") || el.getAttribute("xlink:href");
        return href?.includes("play_filled_l");
    });

    const pauseButton = [
        ...document.querySelectorAll(
            '[class*="BaseSonataControlsDesktop_sonataButton"] use',
        ),
    ].find((el) => {
        const href = el.getAttribute("href") || el.getAttribute("xlink:href");
        return href?.includes("pause_filled_l");
    });

    console.log(playButton);
    console.log(pauseButton);

    if (pauseButton) {
        musicTimer.start();
    } else if (playButton) {
        musicTimer.stop();
    }
}

// Применение настроек
async function applySettings() {
    const settings = await getSettings("YandexMusicTime");
    if (!settings) return;

    // Проверка на сброс статистики
    if (settings.resetButton.value === true && !musicTimer.lastResetState) {
        musicTimer.resetTime();
        musicTimer.lastResetState = true;
    } else if (settings.resetButton.value === false) {
        musicTimer.lastResetState = false;
    }

    // Обновление отображения
    musicTimer.updateDisplay(settings);
}

// Основной цикл обновления
setInterval(() => {
    checkPlaybackState();
    applySettings();
}, 1000);

// Сохранение времени при закрытии страницы
window.addEventListener("beforeunload", () => {
    musicTimer.stop();
});

console.log("Yandex Music Time загружен");
