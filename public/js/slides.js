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

  const setLayerBg = (layer, url) => {

    let urlString = url ? `, url("${url}")` : '';

    layer.style.setProperty('--slide-img-light', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(231, 182, 238))" + urlString);
    layer.style.setProperty('--slide-img-dark', "linear-gradient(to left, rgba(245, 246, 252, 0), rgb(77, 26, 87))" + urlString);
  };

  const preload = (urls) => {
    urls.forEach(u => {
      const img = new Image();
      img.src = u;
    });
  };

  const crossfadeTo = (url) => {
    const next = 1 - active;
    setLayerBg(layers[next], url);

    layers[next].offsetHeight;

    layers[next].classList.add('show');
    layers[active].classList.remove('show');

    active = next;
  };

  ajaxGet('/api/slides/images', (data) => {
    const imgs = Array.isArray(data) ? data : (Array.isArray(data.images) ? data.images : []);

    if (!imgs.length) return;
    preload(imgs);

    let idx = Math.floor(Math.random() * imgs.length);

    const initial = imgs[idx];
    setLayerBg(layers[active], initial);
    layers[active].classList.add('show');

    setInterval(() => {
      idx = (idx + 1) % imgs.length;
      crossfadeTo(imgs[idx]);
    }, 5000);
  });
});