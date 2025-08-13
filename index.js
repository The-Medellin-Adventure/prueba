'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA || {};

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

  var currentSwiper = null;
  var activeView = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function mostrarCarrusel(imagenes, titulo) {
    imagenes = Array.isArray(imagenes) ? imagenes : [];
    const carruselContainer = document.getElementById('carruselContainer');
    const carruselTitulo = document.getElementById('carruselTitulo');
    const swiperWrapper = document.querySelector('#carrusel .swiper-wrapper');
    if (!carruselContainer || !swiperWrapper) return;
    carruselTitulo.textContent = titulo || '';
    swiperWrapper.innerHTML = '';

    imagenes.forEach(function (img) {
      var src = img.src || img.url || '';
      var caption = img.caption || img.texto || '';
      var slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = '<div style="aspect-ratio:3/2;display:flex;justify-content:center;align-items:center;">'
        + '<img src="' + escapeHtml(src) + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;">'
        + '</div>'
        + '<p style="color:white;margin-top:8px;text-align:center;">' + escapeHtml(caption) + '</p>';
      swiperWrapper.appendChild(slide);
    });

    carruselContainer.style.display = 'flex';
    if (currentSwiper) { try { currentSwiper.destroy(true, true); } catch (e) {} currentSwiper = null; }

    currentSwiper = new Swiper('.carrusel-swiper', {
      loop: imagenes.length > 1,
      slidesPerView: 1,
      spaceBetween: 10,
      pagination: { el: '.swiper-pagination', clickable: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
    });

    var cerrarBtn = document.getElementById('cerrarCarrusel');
    if (cerrarBtn) {
      cerrarBtn.onclick = function () {
        carruselContainer.style.display = 'none';
        swiperWrapper.innerHTML = '';
        if (currentSwiper) { try { currentSwiper.destroy(true, true); } catch (e) {} currentSwiper = null; }
      };
    }
  }

  window.mostrarCarrusel = mostrarCarrusel;

  function createScene(sceneData) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(urlPrefix + "/" + sceneData.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + sceneData.id + "/preview.jpg" });
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

  const sceneVideos = {
    "0-plaza-botero-botero": "videos/video1.mp4",
    "1-plaza-botero-y-palacio-rafael-uribe-uribe": "videos/video2.mp4",
    "2-esculturas-y-tradicin": "videos/video3.mp4",
    "3-palacio-rafael-uribe-uribe": "videos/video4.mp4",
    "4-parque-de-las-luces": "videos/video5.mp4",
    "5-antiguo-ferrocarril": "videos/video6.mp4",
    "6-antigua-estacin-medelln": "videos/video7.mp4",
    "7-alpujarra": "videos/video8.mp4",
    "8-transicin-ciudad-a-naturaleza": "videos/video9.mp4",
    "9-pies_descalzos": "videos/video10.mp4",
    "10-conexin-naturaleza": "videos/video11.mp4",
    "11-laberinto-de-bamb": "videos/video12.mp4",
    "12-edificio-inteligente-epm": "videos/video13.mp4",
    "13-centro-de-convenciones-y-teatro": "videos/video14.mp4"
  };

  var currentBlobUrl = null;
  var videoControlsInitialized = false;

  function initVideoControlsOnce() {
    if (videoControlsInitialized) return;
    videoControlsInitialized = true;
    const sceneVideo = document.getElementById("sceneVideo");
    const volumeSlider = document.getElementById("volumeSlider");
    if (!sceneVideo) return;
    sceneVideo.controls = false;
    sceneVideo.addEventListener('contextmenu', e => e.preventDefault());
    sceneVideo.muted = false;
    sceneVideo.volume = 0.5;
    if (volumeSlider) {
      volumeSlider.value = sceneVideo.volume;
      volumeSlider.addEventListener('input', function () {
        sceneVideo.volume = parseFloat(this.value);
      });
    }
  }

  async function loadVideoBlob(sceneVideo, src) {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} }
    currentBlobUrl = blobUrl;
    sceneVideo.src = blobUrl;
    sceneVideo.load();
    await sceneVideo.play().catch(() => {});
    return blobUrl;
  }

  async function clearVideo(sceneVideo) {
    if (!sceneVideo) return;
    sceneVideo.pause();
    sceneVideo.currentTime = 0;
    try { sceneVideo.removeAttribute('src'); sceneVideo.load(); } catch (e) {}
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} currentBlobUrl = null; }
    delete sceneVideo.dataset.currentSrc;
  }

  async function updateVideoForScene(sceneId) {
    initVideoControlsOnce();
    const videoCard = document.getElementById("videoCard");
    const sceneVideo = document.getElementById("sceneVideo");
    if (!videoCard || !sceneVideo) return;
    const videoSrc = sceneVideos[sceneId] || null;

    if (!videoSrc) {
      await clearVideo(sceneVideo);
      videoCard.style.display = "none";
      return;
    }

    if (sceneVideo.dataset.currentSrc && sceneVideo.dataset.currentSrc === videoSrc) {
      videoCard.style.display = "block";
      return;
    }

    await clearVideo(sceneVideo);
    sceneVideo.dataset.currentSrc = videoSrc;

    setTimeout(async () => {
      try {
        await loadVideoBlob(sceneVideo, videoSrc);
        sceneVideo.onended = () => {
          sceneVideo.pause();
          sceneVideo.currentTime = sceneVideo.duration;
        };
        videoCard.style.display = "block";
      } catch (e) {
        videoCard.style.display = "none";
      }
    }, 3000);
  }

  function switchScene(scene) {
    if (!scene) return;
    stopAutorotate();
    try { scene.view.setParameters(scene.data.initialViewParameters); } catch (e) {}
    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);
    activeView = scene.view;
    updateVideoForScene(scene.data.id).catch(() => {});
    if (scene.data.id === FIRST_SCENE_ID) { showSceneList(); } else { hideSceneList(); }
    startAutorotate();
  }

  if (scenes.length > 0) {
    switchScene(scenes[0]);
  }

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
