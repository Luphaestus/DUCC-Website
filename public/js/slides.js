import { ajaxGet } from './misc/ajax.js';

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const layerA = document.createElement('div');
  const layerB = document.createElement('div');
  layerA.className = 'slide';
  layerB.className = 'slide';
  hero.appendChild(layerA);
  hero.appendChild(layerB);

  let layers = [layerA, layerB];
  let active = 0;

  /**
   * Sets the hero background image.
   * @param {HTMLElement} layer - The slide layer element.
   * @param {string} url - The URL of the image to set as the background.
   */
  const setLayerBg = (layer, url) => {

    let urlString = url ? `, url("${url}")` : '';

    layer.style.setProperty('--slide-img-light', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(231, 182, 238))" + urlString);
    layer.style.setProperty('--slide-img-dark', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(77, 26, 87))" + urlString);
  };

  /**
   * Preloads an array of image URLs to avoid flickering.
   * @param {string[]} urls - An array of image URLs to preload.
   */
  const preload = (urls) => {
    urls.forEach(u => {
      const img = new Image();
      img.src = u;
    });
  };

  /**
   * Crossfades to a new slide image.
   * @param {string} url - The URL of the new image to display.
   */
  const crossfadeTo = (url) => {
    const nextLayerIndex = 1 - active;
    const nextLayer = layers[nextLayerIndex];
    const activeLayer = layers[active];

    setLayerBg(nextLayer, url);

    nextLayer.classList.add('show');
    activeLayer.classList.remove('show');

    active = nextLayerIndex;
  };

  ajaxGet('/api/slides/images').then((data) => {
    const imgs = data?.images || [];

    if (!imgs.length) return;
    preload(imgs);

    let idx = Math.floor(Math.random() * imgs.length);

    setLayerBg(layers[active], imgs[idx]);
    layers[active].classList.add('show');

    // Set transition after the initial image is shown to prevent the first image from fading in.
    setTimeout(() => {
      layerA.style.transition = 'opacity 900ms ease';
      layerB.style.transition = 'opacity 900ms ease';
    }, 50);

    setInterval(() => {
      idx = (idx + 1) % imgs.length;
      crossfadeTo(imgs[idx]);
    }, 5000);
  }).catch(error => {
    console.error('Failed to load slide images:', error);
    setLayerBg(layers[0], null);
    layers[0].classList.add('show');
  });
});