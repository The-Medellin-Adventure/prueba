// index.js — versión corregida y robusta
'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA || {};

  // ----------------------------
  // Cambia esto si quieres otra primera escena en el futuro
  // ----------------------------
  const FIRST_SCENE_ID = "0-plaza-botero-botero";

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var viewerOpts = {
    controls: {
      mouseViewMode: (data.settings && data.settings.mouseViewMode) || 'drag'
    }
  };
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
  window.viewer = viewer;

  // Mantener referencia al Swiper actual para destruirlo cuando se cierre / reabra
  var currentSwiper = null;

  // Vista activa (se actualiza cada vez que cambias de escena)
  var activeView = null;

  // =========================
  // Helper para escapar texto en HTML
  // =========================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

// VARIABLES GLOBALES
// =========================================================
var viewer = new Marzipano.Viewer(document.getElementById('pano'));
var currentScene = null;
var currentVideoSceneId = null;
var currentVideoTimeout = null;

// NUEVAS VARIABLES para el overlay grande
let bigOverlayOpen = false;
let smallStartTimeout = null;


  // =========================
  // FUNCIÓN MOSTRAR CARRUSEL 
  // =========================
  function mostrarCarrusel(imagenes, titulo) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    const carruselContainer = document.getElementById('carruselContainer');
    const carruselTitulo = document.getElementById('carruselTitulo');
    const swiperWrapper = document.querySelector('#carrusel .swiper-wrapper');

    if (!carruselContainer || !swiperWrapper) {
      console.error("No se encontró el contenedor del carrusel en el HTML");
      return;
    }

    // Título
    carruselTitulo.textContent = titulo || '';

    // Limpiar
    swiperWrapper.innerHTML = '';

    imagenes.forEach(function (img) {
      var src = img.src || img.url || '';
      var caption = img.caption || img.texto || '';
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = ''
        + '<div style="aspect-ratio:3/2;display:flex;justify-content:center;align-items:center;">'
        +   '<img src="' + escapeHtml(src) + '" '
        +       'style="max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;" '
        +       'alt="' + escapeHtml(caption) + '">'
        + '</div>'
        + '<p style="color:white;margin-top:8px;text-align:center;">' + escapeHtml(caption) + '</p>';
      swiperWrapper.appendChild(slide);
    });

    carruselContainer.style.display = 'flex';

    if (currentSwiper) {
      try { currentSwiper.destroy(true, true); } catch (e) {}
      currentSwiper = null;
    }

    currentSwiper = new Swiper('.carrusel-swiper', {
      loop: imagenes.length > 1,
      slidesPerView: 1,
      spaceBetween: 10,
      autoplay: { delay: 3500, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
    });

    var cerrarBtn = document.getElementById('cerrarCarrusel');
    if (cerrarBtn) {
      cerrarBtn.onclick = function () {
        carruselContainer.style.display = 'none';
        swiperWrapper.innerHTML = '';
        if (currentSwiper) {
          try { currentSwiper.destroy(true, true); } catch (e) {}
          currentSwiper = null;
        }
      };
    }
  }

  window.mostrarCarrusel = mostrarCarrusel;

  // =========================
  // CREAR ESCENAS
  // =========================
  function createScene(sceneData) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + sceneData.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + sceneData.id + "/preview.jpg" }
    );
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
    var scene = viewer.createScene({ source: source, geometry: geometry, view: view, pinFirstLevel: true });

    (sceneData.linkHotspots || []).forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (sceneData.infoHotspots || []).forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    (sceneData.hotSpots || []).forEach(function (hotspot) {
      if (hotspot.type === "camera") {
        var element = createCameraHotspot(hotspot);
        scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      }
    });

    return { data: sceneData, scene: scene, view: view };
  }

  var scenes = (data.scenes || []).map(createScene);


  // =========================
// VIDEO POR ESCENA — control independiente
// =========================
const sceneVideos = {
  "0-plaza-botero-botero": "videos/video1.mp4",
  // Aquí puedes agregar más escenas y videos:
  // "1-plaza-botero-y-palacio-rafael-uribe-uribe": "videos/video2.mp4",
  // "2-otra-escena": "videos/video3.mp4"
};

let currentVideoTimeout = null;

function updateVideoForScene(sceneId) {
  const videoCard = document.getElementById("videoCard");
  const sceneVideo = document.getElementById("sceneVideo");
  if (!videoCard || !sceneVideo) return;

  // Limpiar cualquier timer anterior
  if (currentVideoTimeout) {
    clearTimeout(currentVideoTimeout);
    currentVideoTimeout = null;
  }

  // Detener video si se cambia de escena
  if (currentVideoSceneId && currentVideoSceneId !== sceneId) {
    sceneVideo.pause();
    sceneVideo.currentTime = 0;
  }

// 🚨 NUEVO: si la escena tiene video grande y está abierto → no mostrar el pequeño
  if (bigSceneVideos[sceneId] && bigOverlayOpen) {
    videoCard.style.display = "none";
    currentVideoSceneId = null;
    return;
  }

  // Verificar si hay video para la escena
  if (!sceneVideos[sceneId]) {
    videoCard.style.display = "none";
    currentVideoSceneId = null;
    return;
  }

  // Configurar nuevo video
  currentVideoSceneId = sceneId;
  sceneVideo.src = sceneVideos[sceneId];
  sceneVideo.load();

  // Mostrar tarjeta del video
  videoCard.style.display = "block";

  // Esperar 3 segundos antes de reproducir
  currentVideoTimeout = setTimeout(() => {
    sceneVideo.play().catch(err => console.warn("No se pudo reproducir el video:", err));
  }, 3000);

  // Si el video termina y seguimos en la misma escena → Pausar y dejar último frame
  sceneVideo.onended = function () {
    if (currentVideoSceneId === sceneId) {
      sceneVideo.pause();
      sceneVideo.currentTime = sceneVideo.duration; // Último frame
    }
  };
 }

// ---- Controles personalizados de video ----
const video = document.getElementById("sceneVideo");
const playPauseBtn = document.getElementById("playPauseBtn");
const muteBtn = document.getElementById("muteBtn");
const closeVideoBtn = document.getElementById("closeVideoCard");
const videoCard = document.getElementById("videoCard");
const videoIcon = document.getElementById("videoIcon");

if (video && playPauseBtn && muteBtn && closeVideoBtn && videoCard && videoIcon) {
  playPauseBtn.addEventListener("click", () => {
    if (video.paused) {
      video.play();
      playPauseBtn.textContent = "⏸";
    } else {
      video.pause();
      playPauseBtn.textContent = "▶";
    }
  });

  muteBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
  });

  // Cerrar tarjeta → mostrar icono flotante
  closeVideoBtn.addEventListener("click", () => {
    video.pause();
    videoCard.style.display = "none";
    videoIcon.style.display = "block";
  });

  // Reabrir tarjeta desde icono
  videoIcon.addEventListener("click", () => {
    videoCard.style.display = "block";
    videoIcon.style.display = "none";
  });
}


// =========================
// En tu función switchScene(scene) → después de cambiar de escena
// =========================
function switchScene(scene) {
  if (!scene) return;
  stopAutorotate();
  try {
    scene.view.setParameters(scene.data.initialViewParameters);
  } catch (e) { }
  scene.scene.switchTo();
  updateSceneName(scene);
  updateSceneList(scene);

  activeView = scene.view;

  // ⬅ Aquí llamamos al video por escena
showBigOverlayForScene(scene.data.id);
updateVideoForScene(scene.data.id);

  if (scene.data && scene.data.id === FIRST_SCENE_ID) {
    showSceneList();
  } else {
    hideSceneList();
  }
  startAutorotate();
}


  // =========================
  // SWITCH SCENE (único, robusto)
  // =========================
  function switchScene(scene) {
    if (!scene) return;
    stopAutorotate();

    // Ajustar parámetros iniciales de vista
    try {
      scene.view.setParameters(scene.data.initialViewParameters);
    } catch (e) { /* ignore */ }

    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);

    // actualizar la vista activa (para los botones)
    activeView = scene.view;

    // Video por escena (lo hace visible/oculto según lo que exista)
    updateVideoForScene(scene.data.id);

    // Menú visible solo en la escena FIRST_SCENE_ID
    if (scene.data && scene.data.id === FIRST_SCENE_ID) {
      showSceneList();
    } else {
      hideSceneList();
    }

    startAutorotate();
  }

  // Inicializar en la primera escena si existe
  if (scenes.length > 0) {
    // Si prefieres que la primera escena abierta sea otra, cambia FIRST_SCENE_ID arriba.
    switchScene(scenes[0]);
  }

  // =========================
  // UI helpers (nombre y lista)
  // =========================
  function updateSceneName(scene) {
    if (sceneNameElement) sceneNameElement.innerHTML = sanitize(scene.data.name || '');
  }

  function updateSceneList(scene) {
    Array.prototype.forEach.call(sceneElements || [], function (el) {
      if (!el) return;
      el.classList.toggle('current', el.getAttribute('data-id') === (scene && scene.data && scene.data.id));
    });
  }

  function sanitize(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // =========================
  // HOTSPOTS (mantengo tus funciones, con mínimo cambio)
  // =========================
  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    if (typeof hotspot.rotation !== 'undefined') icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';
    wrapper.appendChild(icon);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    var sceneData = findSceneDataById(hotspot.target);
    tooltip.innerHTML = (sceneData && sceneData.name) ? sceneData.name : '';
    wrapper.appendChild(tooltip);

    wrapper.addEventListener('click', function () {
      var s = findSceneById(hotspot.target);
      if (s) switchScene(s);
    });
    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'info-hotspot');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title || '';
    titleWrapper.appendChild(title);

    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text || '';

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function () {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    stopTouchAndScrollEventPropagation(wrapper);
    return wrapper;
  }

  function createCameraHotspot(hotspot) {
    var element = document.createElement('img');
    element.src = hotspot.image || 'img/Camara.png';
    element.className = 'camera-hotspot-icon';
    element.style = "width:48px;height:48px;cursor:pointer;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);";
    element.title = hotspot.tooltip || hotspot.title || "";

    element.addEventListener('click', function () {
      if (hotspot.carrusel) {
        mostrarCarrusel(hotspot.images || [], hotspot.tooltip || hotspot.title || '');
      } else {
        showImageModal(hotspot.photo, hotspot.title);
      }
    });
    return element;
  }

  function showImageModal(photoSrc, title) {
    var oldModal = document.getElementById('custom-image-modal');
    if (oldModal) oldModal.remove();

    var modal = document.createElement('div');
    modal.id = 'custom-image-modal';
    modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';

    var content = document.createElement('div');
    content.style = 'background:#fff;border-radius:10px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.32);position:relative;';

    var img = document.createElement('img');
    img.src = photoSrc;
    img.alt = title || '';
    img.style = 'max-width:90vw;max-height:80vh;border-radius:8px;';
    content.appendChild(img);

    if (title) {
      var caption = document.createElement('div');
      caption.textContent = title;
      caption.style = 'margin-top:10px;font-weight:bold;text-align:center;';
      content.appendChild(caption);
    }

    var close = document.createElement('span');
    close.textContent = '×';
    close.style = 'position:absolute;top:8px;right:16px;cursor:pointer;font-size:2rem;color:#222;';
    close.addEventListener('click', function () { modal.remove(); });
    content.appendChild(close);

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
  }

  function stopTouchAndScrollEventPropagation(element) {
    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'].forEach(function (eventName) {
      element.addEventListener(eventName, function (event) { event.stopPropagation(); });
    });
  }

  function findSceneById(id) {
    return scenes.find(function (s) { return s.data.id === id; });
  }

  function findSceneDataById(id) {
    return (data.scenes || []).find(function (s) { return s.id === id; });
  }

  // Asociar eventos a los elementos de la lista de escenas (DOM)
  scenes.forEach(function (scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    if (!el) return;
    el.addEventListener('click', function () {
      switchScene(scene);
      if (document.body.classList.contains('mobile')) hideSceneList();
    });
  });

  // Fullscreen 
  if (screenfull && screenfull.enabled && data.settings && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    if (fullscreenToggleElement) {
      fullscreenToggleElement.addEventListener('click', function () { screenfull.toggle(); });
      screenfull.on('change', function () { fullscreenToggleElement.classList.toggle('enabled', screenfull.isFullscreen); });
    }
  }

  // Autorotate
  if (autorotateToggleElement) autorotateToggleElement.addEventListener('click', toggleAutorotate);
  var autorotate = Marzipano.autorotate({ yawSpeed: 0.5, targetPitch: -0.3529, targetFov: Math.PI / 2 });
  if (data.settings && data.settings.autorotateEnabled) {
    if (autorotateToggleElement) autorotateToggleElement.classList.add('enabled');
  }

  function toggleAutorotate() {
    if (!autorotateToggleElement) return;
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled'); stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled'); startAutorotate();
    }
  }
  function startAutorotate() {
    if (!autorotateToggleElement || !autorotateToggleElement.classList.contains('enabled')) return;
    viewer.startMovement(autorotate); viewer.setIdleMovement(3000, autorotate);
  }
  function stopAutorotate() { viewer.stopMovement(); viewer.setIdleMovement(Infinity); }

  // Mostrar/ocultar lista escenas
  function showSceneList() { if (sceneListElement) sceneListElement.classList.add('enabled'); if (sceneListToggleElement) sceneListToggleElement.classList.add('enabled'); }
  function hideSceneList() { if (sceneListElement) sceneListElement.classList.remove('enabled'); if (sceneListToggleElement) sceneListToggleElement.classList.remove('enabled'); }

  // Toggle lista escenas (botón)
  var sceneListToggle = document.getElementById("sceneListToggle");
  var sceneList = document.getElementById("sceneList");
  if (sceneListToggle && sceneList) {
    sceneListToggle.addEventListener("click", function () {
      var isEnabled = sceneList.classList.toggle("enabled");
      var iconOn = sceneListToggle.querySelector(".icon.on");
      var iconOff = sceneListToggle.querySelector(".icon.off");
      if (iconOn) iconOn.style.display = isEnabled ? "inline" : "none";
      if (iconOff) iconOff.style.display = isEnabled ? "none" : "inline";
    });
  }

  // =========================
  // BOTONES DE CONTROL — usan activeView para funcionar en cualquier escena
  // =========================
  var velocity = 1;
  var zoomSpeed = 1;

  var el;
  el = document.getElementById('viewLeft');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setYaw(activeView.yaw() - velocity); });
  el = document.getElementById('viewRight');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setYaw(activeView.yaw() + velocity); });
  el = document.getElementById('viewUp');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setPitch(activeView.pitch() + velocity); });
  el = document.getElementById('viewDown');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setPitch(activeView.pitch() - velocity); });
  el = document.getElementById('viewIn');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setFov(activeView.fov() - zoomSpeed); });
  el = document.getElementById('viewOut');
  if (el) el.addEventListener('click', function () { if (activeView) activeView.setFov(activeView.fov() + zoomSpeed); });

  // Si no es mobile, mostramos la lista (pero switchScene la ocultará si no es la primera escena)
  if (!document.body.classList.contains('mobile')) showSceneList();

})();
