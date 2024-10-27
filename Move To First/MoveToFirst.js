function movePinToFirstIfNotFirst() {
    let pin = document.querySelector('.PinsList_pin__4G9XT > a[aria-label="Плейлист Мне нравится"]');
    if (pin) {
        let parentPin = pin.closest('.PinsList_pin__4G9XT');
        if (parentPin) {
            let pinsList = parentPin.parentNode;
            if (pinsList.firstChild !== parentPin) {
                pinsList.insertBefore(parentPin, pinsList.firstChild);
            }
        }
    }
}

setInterval(movePinToFirstIfNotFirst, 250);