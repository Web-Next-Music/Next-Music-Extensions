// Theme Changer
const body = document.body;

const applyTheme = () => {
    if (
        !body.classList.contains("ym-dark-theme") &&
        !body.classList.contains("ym-light-theme")
    ) {
        body.classList.add("ym-dark-theme");
    } else if (body.classList.contains("ym-light-theme")) {
        body.classList.replace("ym-light-theme", "ym-dark-theme");
    }
};

applyTheme();

const observer = new MutationObserver(() => applyTheme());

observer.observe(body, { attributes: true, attributeFilter: ["class"] });

// TitleBar text changer
const titleBarTextElement = ["TitleBar_pulseText", "TitleBar_nextText"];

const titleBarTextObserver = new MutationObserver(() => {
    document
        .querySelectorAll(
            titleBarTextElement
                .map((cls) => `[class*="${cls}"]:not(.biteMeText)`)
                .join(", "),
        )
        .forEach((el) => {
            el.className = [...el.classList]
                .map((cls) =>
                    titleBarTextElement.some((t) => cls.includes(t))
                        ? "biteMeText"
                        : cls,
                )
                .join(" ");

            el.textContent = "BITE ME!";
        });
});

// Запуск observer
titleBarTextObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});
