const styles = `
  .FullscreenPlayerDesktopContent_sliderContainer__FtBZ7,
  .FullscreenPlayerDesktopControls_root__tviu4 {
    display: none;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

let isFullscreenActive = false;

setInterval(() => {
    const fullscreenModal = document.querySelector('.FullscreenPlayerDesktop_important__dGfiL');
    const playerBar = document.querySelector('section.PlayerBar_root__cXUnU');

    if (playerBar) {
        const playerColor = getComputedStyle(playerBar).getPropertyValue('--player-average-color-background').trim();

        if (fullscreenModal && !isFullscreenActive) {
            isFullscreenActive = true;
            playerBar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            playerBar.style.transform = 'translateZ(0)';
            playerBar.style.opacity = '0';

            setTimeout(() => {
                Object.assign(playerBar.style, {
                    position: 'fixed',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    height: '80px',
                    zIndex: '410',
                    borderRadius: '0',
                    borderWidth: '0',
                    visibility: 'visible',
                    willChange: 'opacity, box-shadow, transform',
                });

                playerBar.style.boxShadow = `0px 0px 10px 10px ${playerColor}`;

                setTimeout(() => {
                    playerBar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    playerBar.style.opacity = '1';
                    playerBar.style.transform = 'translateZ(0)';
                }, 50);
            }, 300);
        } else if (!fullscreenModal && isFullscreenActive) {
            isFullscreenActive = false;
            playerBar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            playerBar.style.transform = 'translateZ(0)';
            playerBar.style.opacity = '0';

            setTimeout(() => {
                Object.assign(playerBar.style, {
                    position: '',
                    left: '',
                    right: '',
                    bottom: '',
                    height: '',
                    zIndex: '',
                    borderRadius: '',
                    borderWidth: '',
                    boxShadow: '',
                    visibility: 'visible',
                    willChange: 'opacity, box-shadow, transform',
                });

                setTimeout(() => {
                    playerBar.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    playerBar.style.opacity = '1';
                    playerBar.style.transform = 'translateZ(0)';
                }, 50);
            }, 300);
        }

        if (isFullscreenActive && playerBar.style.opacity === '1') {
            playerBar.style.boxShadow = `0px 0px 10px 10px ${playerColor}`;
        }
    }
}, 0);