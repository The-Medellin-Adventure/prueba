'use strict';
(function(){
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  var panoElement = document.getElementById('pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.getElementById('sceneList');

  var viewer = new Marzipano.Viewer(panoElement, {
    controls:{ mouseViewMode: data.settings.mouseViewMode }
  });

  function createScene(sceneData) {
    var source = Marzipano.ImageUrlSource.fromString(`tiles/${sceneData.id}/{z}/{f}/{y}/{x}.jpg`, {
      cubeMapPreviewUrl: `tiles/${sceneData.id}/preview.jpg`
    });
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);
    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);
    var scene = viewer.createScene({ source, geometry, view, pinFirstLevel:true });

    sceneData.linkHotspots.forEach(function(h){
      var el = createLinkHotspotElement(h);
      scene.hotspotContainer().createHotspot(el, { yaw:h.yaw, pitch:h.pitch });
    });
    sceneData.infoHotspots.forEach(function(h){
      var el = createInfoHotspotElement(h);
      scene.hotspotContainer().createHotspot(el, { yaw:h.yaw, pitch:h.pitch });
    });

    return { scene, data: sceneData, view };
  }

  var scenes = data.scenes.map(createScene);
  function switchScene(s){
    s.scene.view.setParameters(s.data.initialViewParameters);
    s.scene.scene.switchTo();
    sceneNameElement.textContent = s.data.name;
  }
  switchScene(scenes[0]);

  function createLinkHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot','link-hotspot');
    var icon = document.createElement('img');
    icon.src = 'img/link.png'; icon.classList.add('link-hotspot-icon');
    icon.style.transform = `rotate(${hotspot.rotation}rad)`;
    wrapper.appendChild(icon);
    wrapper.addEventListener('click',function(){ switchScene(scenes.find(s=>s.data.id===hotspot.target)); });
    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot','info-hotspot');

    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.textContent = hotspot.title;

    var closeIcon = document.createElement('div');
    closeIcon.classList.add('info-hotspot-close');
    closeIcon.innerHTML = '&times;';
    closeIcon.addEventListener('click', function(e){ e.stopPropagation(); wrapper.classList.remove('open'); });

    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    wrapper.appendChild(title);
    wrapper.appendChild(closeIcon);
    wrapper.appendChild(text);

    wrapper.addEventListener('click',function(){ wrapper.classList.toggle('open'); });
    return wrapper;
  }

  var toggle = document.getElementById('toggleSceneList');
  toggle.addEventListener('click', function(){
    sceneListElement.classList.toggle('hidden');
  });

})();
