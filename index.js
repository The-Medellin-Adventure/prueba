// index.js completo (versión corregida y estable)
'use strict';

(function () {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);
  window.viewer = viewer;

  // Función para crear una escena
  function createScene(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" }
    );
    var geometry = new Marzipano.CubeGeometry(data.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100 * Math.PI / 180, 120 * Math.PI / 180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);
    var scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });

    data.linkHotspots.forEach(function (hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    data.infoHotspots.forEach(function (hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    if (data.hotSpots && data.hotSpots.length > 0) {
      data.hotSpots.forEach(function (hotspot) {
        if (hotspot.type === "camera") {
          var element = createCameraHotspot(hotspot);
          scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
        }
      });
    }

    // Hotspot de audio solo en la primera escena
    if (data.id === "0-plaza-botero-botero") {
      setTimeout(() => {
        createAudioHotspot(1.0, 0.1, 'audio/audio1.mp3');
      }, 500); // Esperamos a que la escena esté completamente cargada
    }

    return { data, scene, view };
  }

  var scenes = data.scenes.map(createScene);

  // Activar escena inicial
  switchScene(scenes[0]);

  // Funciones reutilizables
  function switchScene(scene) {
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    updateSceneName(scene);
    updateSceneList(scene);
    startAutorotate();
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    sceneElements.forEach(function (el) {
      el.classList.toggle('current', el.getAttribute('data-id') === scene.data.id);
    });
  }

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot', 'link-hotspot');

    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');
    icon.style.transform = 'rotate(' + hotspot.rotation + 'rad)';
    wrapper.appendChild(icon);

    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip', 'link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;
    wrapper.appendChild(tooltip);

    wrapper.addEventListener('click', function () {
      switchScene(findSceneById(hotspot.target));
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
    title.innerHTML = hotspot.title;
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
    text.innerHTML = hotspot.text;

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
    element.src = hotspot.image;
    element.className = 'camera-hotspot-icon';
    element.style = "width:48px;height:48px;cursor:pointer;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25);";
    element.title = hotspot.title || "";

    element.addEventListener('click', function () {
      if (hotspot.carrusel) {
        mostrarCarrusel();
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
    img.alt = title || "";
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
    close.addEventListener('click', function () {
      modal.remove();
    });
    content.appendChild(close);

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.remove();
    });
  }

  function createAudioHotspot(yaw, pitch, audioSrc) {
    var hotspot = document.createElement('div');
    hotspot.classList.add('hotspot-audio');

    var icon = document.createElement('img');
    icon.src = 'img/audio-icon.png';
    icon.style = 'width:40px;cursor:pointer;transition:transform 0.2s;';

    icon.addEventListener('mouseover', () => icon.style.transform = 'scale(1.2)');
    icon.addEventListener('mouseout', () => icon.style.transform = 'scale(1)');

    var audio = document.createElement('audio');
    audio.src = audioSrc;
    audio.preload = 'auto';

    icon.addEventListener('click', () => {
      if (audio.paused) audio.play();
      else audio.pause();
    });

    hotspot.appendChild(icon);
    hotspot.appendChild(audio);

    // Solo insertamos si ya hay una escena activa
    if (viewer.scene()) {
      viewer.scene().hotspotContainer().createHotspot(hotspot, { yaw, pitch });
    }
  }

  function mostrarCarrusel() {
    document.getElementById('carruselModal').style.display = 'flex';
    carruselSwiper.update();
  }

  document.getElementById('cerrarCarrusel').onclick = function () {
    document.getElementById('carruselModal').style.display = 'none';
  };

  document.getElementById('carruselModal').addEventListener('click', function (e) {
    if (e.target === this) this.style.display = 'none';
  });

  var carruselSwiper = new Swiper('.carrusel-swiper', {
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    }
  });

  function stopTouchAndScrollEventPropagation(element) {
    ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'].forEach(function (eventName) {
      element.addEventListener(eventName, function (event) {
        event.stopPropagation();
      });
    });
  }

  function findSceneById(id) {
    return scenes.find(function (s) { return s.data.id === id; });
  }

  function findSceneDataById(id) {
    return data.scenes.find(function (s) { return s.id === id; });
  }

  scenes.forEach(function (scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function () {
      switchScene(scene);
      if (document.body.classList.contains('mobile')) hideSceneList();
    });
  });

  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function () {
      screenfull.toggle();
    });
    screenfull.on('change', function () {
      fullscreenToggleElement.classList.toggle('enabled', screenfull.isFullscreen);
    });
  }

  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  var autorotate = Marzipano.autorotate({ yawSpeed: 0.03, targetPitch: 0, targetFov: Math.PI / 2 });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) return;
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  if (!document.body.classList.contains('mobile')) showSceneList();
// Mostrar / Ocultar panel de escenas
var sceneListToggle = document.getElementById("sceneListToggle");
var sceneList = document.getElementById("sceneList");

sceneListToggle.addEventListener("click", function () {
  var isEnabled = sceneList.classList.toggle("enabled");

  // Cambiar íconos expand/collapse según el estado
  var iconOn = sceneListToggle.querySelector(".icon.on");
  var iconOff = sceneListToggle.querySelector(".icon.off");

  if (isEnabled) {
    iconOn.style.display = "inline";
    iconOff.style.display = "none";
  } else {
    iconOn.style.display = "none";
    iconOff.style.display = "inline";
  }
});
// === CONTROLES DE VISTA CON BOTONES INFERIORES ===
var view = viewer.view();  // Obtenemos la vista de Marzipano
var velocity = 0.7;        // Velocidad de rotación (radianes)
var zoomSpeed = 1;         // Velocidad del zoom (fov)

// Funciones individuales
document.getElementById('viewLeft').addEventListener('click', function () {
  view.setYaw(view.yaw() - velocity);
});

document.getElementById('viewRight').addEventListener('click', function () {
  view.setYaw(view.yaw() + velocity);
});

document.getElementById('viewUp').addEventListener('click', function () {
  view.setPitch(view.pitch() + velocity);
});

document.getElementById('viewDown').addEventListener('click', function () {
  view.setPitch(view.pitch() - velocity);
});

document.getElementById('viewIn').addEventListener('click', function () {
  view.setFov(view.fov() - zoomSpeed);
});

document.getElementById('viewOut').addEventListener('click', function () {
  view.setFov(view.fov() + zoomSpeed);
});

})();
