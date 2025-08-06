// ✅ data.js COMPLETO

window.APP_DATA = {
  "scenes": [
    {
      "id": "0-plaza-botero-botero",
      "name": "Plaza Botero",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 1520,
      "initialViewParameters": {
        "yaw": 0.1,
        "pitch": 0.1,
        "fov": 1.5708
      },
      "linkHotspots": [
        {
          "yaw": -0.8,
          "pitch": 0.05,
          "rotation": 0,
          "target": "1-otra-escena"
        }
      ],
      "infoHotspots": [
        {
          "yaw": 0.3,
          "pitch": 0.1,
          "title": "Fernando Botero",
          "text": "Esculturas en bronce representativas del artista."
        },
        {
          "yaw": 0.6,
          "pitch": 0.2,
          "title": "Museo de Antioquia",
          "text": "Ubicado frente a la plaza, alberga importantes colecciones."
        }
      ],
      "hotSpots": [
        {
          "type": "camera",
          "yaw": 0.2,
          "pitch": 0.05,
          "photo": "img/estacion_berrio.jpg",
          "title": "Estación Berrío",
          "image": "img/camera.png"
        },
        {
          "type": "camera",
          "yaw": -0.4,
          "pitch": 0.15,
          "photo": "img/hotel_nutibara.jpg",
          "title": "Hotel Nutibara",
          "image": "img/camera.png"
        },
        {
          "type": "camera",
          "yaw": 0.8,
          "pitch": -0.1,
          "photo": "img/edificio_rafael_uribe.jpg",
          "title": "Edificio Rafael Uribe",
          "image": "img/camera.png"
        },
        {
          "type": "camera",
          "yaw": 0.0,
          "pitch": 0.0,
          "carrusel": true,
          "image": "img/camera.png"
        }
      ]
    },
    {
      "id": "1-otra-escena",
      "name": "Otra Escena",
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 1520,
      "initialViewParameters": {
        "yaw": 0,
        "pitch": 0,
        "fov": 1.5708
      },
      "linkHotspots": [
        {
          "yaw": 0,
          "pitch": 0.1,
          "rotation": 0,
          "target": "0-plaza-botero-botero"
        }
      ],
      "infoHotspots": []
    }
  ],
  "name": "City Tour Medellín",
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": true,
    "fullscreenButton": true,
    "viewControlButtons": true
  }
};
