setInterval(() => {
  const element = document.querySelector('.FullscreenPlayerDesktopPoster_cover__CDmhM');
  if (element) {
    const link = element.src || element.style.backgroundImage;
    const srcset = element.srcset;
    
    if (link) {
      const newLink = link.replace(/(100|400|800)x(100|400|800)/, '1000x1000');
      if (element.src) {
        element.src = newLink;
      } else {
        element.style.backgroundImage = `url(${newLink})`;
      }
    }
    
    if (srcset) {
      const newSrcset = srcset.replace(/(100|400|800)x(100|400|800)/, '1000x1000');
      element.srcset = newSrcset;
    }
  }
}, 1000);