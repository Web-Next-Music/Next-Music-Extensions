// Скрипт для смены темы
function yandexThemeUpdate() {
    const body = document.body;
    if (
        !body.classList.contains("ym-light-theme") &&
        !body.classList.contains("ym-dark-theme")
    ) {
        body.classList.add("ym-dark-theme");
    } else if (body.classList.contains("ym-light-theme")) {
        body.classList.replace("ym-light-theme", "ym-dark-theme");
    }
}

yandexThemeUpdate();

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
            yandexThemeUpdate();
        }
    }
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
});
