/* ==========================================================
   3D AVATAR — Three.js stylised developer bust
   ========================================================== */
(function () {
  'use strict';

  /* -------------------------------------------------------
     Guard: Only run once Three.js is available
  ------------------------------------------------------- */
  function init() {
    if (typeof THREE === 'undefined') { return; }

    var container = document.getElementById('hero-avatar-container');
    if (!container) { return; }

    /* -------------------------------------------------------
       1. Scene, Camera, Renderer
    ------------------------------------------------------- */
    var W = container.offsetWidth  || 520;
    var H = container.offsetHeight || 750;

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 60);
    camera.position.set(0, 0.4, 8.5);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;

    Object.assign(renderer.domElement.style, {
      position      : 'absolute',
      top           : '0',
      left          : '0',
      width         : '100%',
      height        : '100%',
      zIndex        : '1',
      pointerEvents : 'none'
    });
    container.appendChild(renderer.domElement);

    /* -------------------------------------------------------
       2. Lighting rig
    ------------------------------------------------------- */
    // Atmospheric base
    scene.add(new THREE.AmbientLight(0x080810, 1.0));

    // Key light — warm white from upper-right-front
    var keyLight = new THREE.DirectionalLight(0xfff8e7, 2.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Gold orbital point light (animated)
    var goldPt = new THREE.PointLight(0xffbd39, 5.5, 18);
    goldPt.position.set(3, 2, 4);
    scene.add(goldPt);

    // Cool blue rim from behind-left (creates depth separation)
    var rimLight = new THREE.PointLight(0x4488ff, 2.5, 12);
    rimLight.position.set(-4, 1.5, -3);
    scene.add(rimLight);

    // Warm fill from below (bounce)
    var fillLight = new THREE.PointLight(0xff6b35, 1.8, 10);
    fillLight.position.set(0, -5, 3);
    scene.add(fillLight);

    /* -------------------------------------------------------
       3. Shared materials
    ------------------------------------------------------- */
    var darkMetal = new THREE.MeshStandardMaterial({
      color     : 0x0d1117,
      metalness : 0.85,
      roughness : 0.22
    });

    var goldMetal = new THREE.MeshStandardMaterial({
      color             : 0xffbd39,
      metalness         : 1.0,
      roughness         : 0.08,
      emissive          : new THREE.Color(0xffbd39),
      emissiveIntensity : 0.35
    });

    var wireMat = new THREE.MeshBasicMaterial({
      color       : 0xffbd39,
      wireframe   : true,
      transparent : true,
      opacity     : 0.13
    });

    /* -------------------------------------------------------
       4. Avatar group  (all avatar geometry lives here)
    ------------------------------------------------------- */
    var avatar = new THREE.Group();
    scene.add(avatar);

    /* ---- Utility: clone mat ---- */
    function dm() { return darkMetal.clone(); }
    function gm() { return goldMetal.clone(); }

    /* ---- HEAD ---- */
    var headGeo = new THREE.IcosahedronGeometry(1.18, 3);
    // Subtle vertex noise → organic, non-spherical silhouette
    (function () {
      var pos = headGeo.attributes.position;
      var s   = 12345;
      function lcg() { s = (s * 1664525 + 1013904223) & 0xffffffff; return ((s >>> 0) / 0xffffffff); }
      for (var i = 0; i < pos.count; i++) {
        var n = 0.065;
        pos.setX(i, pos.getX(i) + (lcg() - 0.5) * n);
        pos.setY(i, pos.getY(i) + (lcg() - 0.5) * n * 0.7);
        pos.setZ(i, pos.getZ(i) + (lcg() - 0.5) * n);
      }
      headGeo.computeVertexNormals();
    })();

    var head = new THREE.Mesh(headGeo, dm());
    head.position.y = 1.22;
    head.castShadow = true;
    avatar.add(head);

    // Wireframe shell — slightly larger, low-subdivision
    var wireHead = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.28, 2),
      wireMat
    );
    wireHead.position.y = 1.22;
    avatar.add(wireHead);

    /* ---- EYES ---- */
    var eyeGeo = new THREE.SphereGeometry(0.135, 12, 12);
    var eyeMatL = new THREE.MeshStandardMaterial({
      color             : 0xffbd39,
      emissive          : new THREE.Color(0xffbd39),
      emissiveIntensity : 1.5,
      metalness         : 0,
      roughness         : 0.15
    });
    var eyeMatR = eyeMatL.clone();

    var lEye = new THREE.Mesh(eyeGeo, eyeMatL);
    lEye.position.set(-0.38, 1.35, 1.02);
    avatar.add(lEye);

    var rEye = new THREE.Mesh(eyeGeo.clone(), eyeMatR);
    rEye.position.set(0.38, 1.35, 1.02);
    avatar.add(rEye);

    /* ---- Eye glow sprites ---- */
    function makeGlowSprite(col, sz) {
      var cv  = document.createElement('canvas');
      cv.width = cv.height = 128;
      var c   = cv.getContext('2d');
      var gr  = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, col);
      gr.addColorStop(0.35, col.replace('1.0', '0.55'));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 128, 128);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map        : new THREE.CanvasTexture(cv),
        transparent: true,
        blending   : THREE.AdditiveBlending,
        depthWrite : false
      }));
      sp.scale.set(sz, sz, 1);
      return sp;
    }
    var lGlow = makeGlowSprite('rgba(255,189,57,1.0)', 0.9);
    lGlow.position.set(-0.38, 1.35, 1.08);
    avatar.add(lGlow);
    var rGlow = makeGlowSprite('rgba(255,189,57,1.0)', 0.9);
    rGlow.position.set(0.38, 1.35, 1.08);
    avatar.add(rGlow);

    /* ---- NECK ---- */
    var neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.29, 0.40, 0.55, 10),
      dm()
    );
    neck.position.y = 0.06;
    avatar.add(neck);

    /* ---- SHOULDERS platform ---- */
    var shoulderRing = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.30, 0.32, 14),
      dm()
    );
    shoulderRing.position.y = -0.42;
    avatar.add(shoulderRing);

    /* ---- Gold collar torus ---- */
    var collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.038, 8, 48),
      gm()
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -0.25;
    avatar.add(collar);

    /* ---- TORSO ---- */
    var torso = new THREE.Mesh(
      new THREE.CylinderGeometry(1.22, 0.98, 2.4, 12),
      dm()
    );
    torso.position.y = -1.82;
    avatar.add(torso);

    /* ---- ARMS ---- */
    var armGeo = new THREE.CylinderGeometry(0.27, 0.20, 1.85, 8);

    var lArm = new THREE.Mesh(armGeo, dm());
    lArm.position.set(-1.58, -1.80, 0.0);
    lArm.rotation.z = 0.16;
    avatar.add(lArm);

    var rArm = new THREE.Mesh(armGeo, dm());
    rArm.position.set(1.58, -1.80, 0.0);
    rArm.rotation.z = -0.16;
    avatar.add(rArm);

    /* ---- Shoulder badges — spinning octahedra ---- */
    var badgeGeo = new THREE.OctahedronGeometry(0.22, 0);

    var lBadge = new THREE.Mesh(badgeGeo, gm());
    lBadge.position.set(-1.52, -0.52, 0.52);
    avatar.add(lBadge);

    var rBadge = new THREE.Mesh(badgeGeo.clone(), gm());
    rBadge.position.set(1.52, -0.52, 0.52);
    avatar.add(rBadge);

    /* ---- Gold chest accent lines ---- */
    // Vertical centre line
    var vLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 2.1, 0.038),
      gm()
    );
    vLine.position.set(0, -1.82, 1.0);
    avatar.add(vLine);

    // Two horizontal cross-bars
    [[-0.88], [-2.72]].forEach(function (yArr) {
      var h = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.038, 0.038),
        gm()
      );
      h.position.set(0, yArr[0], 1.0);
      avatar.add(h);
    });

    /* ---- Chest centre diamond accent ---- */
    var diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      gm()
    );
    diamond.position.set(0, -1.82, 1.06);
    avatar.add(diamond);

    /* -------------------------------------------------------
       5. Floating rings (not in avatar group — independent spin)
    ------------------------------------------------------- */
    var ringA = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.022, 4, 100),
      new THREE.MeshBasicMaterial({ color: 0xffbd39, transparent: true, opacity: 0.38 })
    );
    ringA.rotation.x = Math.PI / 2;
    scene.add(ringA);

    var ringB = new THREE.Mesh(
      new THREE.TorusGeometry(2.78, 0.014, 4, 100),
      new THREE.MeshBasicMaterial({ color: 0xff7043, transparent: true, opacity: 0.22 })
    );
    ringB.rotation.x = Math.PI / 2.8;
    ringB.rotation.z = Math.PI / 4;
    scene.add(ringB);

    var ringC = new THREE.Mesh(
      new THREE.TorusGeometry(3.1, 0.01, 4, 100),
      new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15 })
    );
    ringC.rotation.x = Math.PI / 1.6;
    ringC.rotation.y = Math.PI / 5;
    scene.add(ringC);

    /* -------------------------------------------------------
       6. Orbiting particles
    ------------------------------------------------------- */
    var P      = 320;
    var pPos   = new Float32Array(P * 3);
    var pAngle = new Float32Array(P);
    var pR     = new Float32Array(P);
    var pSpd   = new Float32Array(P);
    var pH     = new Float32Array(P);
    var pLayer = new Float32Array(P); // 0 = gold, 1 = orange, 2 = blue

    for (var i = 0; i < P; i++) {
      pAngle[i] = Math.random() * Math.PI * 2;
      pR[i]     = 2.1 + Math.random() * 2.2;
      pSpd[i]   = (0.35 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1);
      pH[i]     = (Math.random() - 0.5) * 6.0;
      pLayer[i] = Math.floor(Math.random() * 3);
    }

    // Three particle systems with different colours
    var pColors = [0xffbd39, 0xff7043, 0x88aaff];
    var pSystems = pColors.map(function (col) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P * 3), 3));
      var mesh = new THREE.Points(geo, new THREE.PointsMaterial({
        color       : col,
        size        : 0.042,
        transparent : true,
        opacity     : 0.72,
        blending    : THREE.AdditiveBlending,
        depthWrite  : false
      }));
      scene.add(mesh);
      return geo;
    });

    /* -------------------------------------------------------
       7. Holographic scan-line plane
       (a flat plane with an animated alpha that sweeps up)
    ------------------------------------------------------- */
    var scanPlaneMat = new THREE.MeshBasicMaterial({
      color       : 0xffbd39,
      transparent : true,
      opacity     : 0.0,
      side        : THREE.DoubleSide,
      blending    : THREE.AdditiveBlending,
      depthWrite  : false
    });
    var scanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.025),
      scanPlaneMat
    );
    scanPlane.position.set(0, -3, 0);
    avatar.add(scanPlane);

    /* -------------------------------------------------------
       8. Mouse target rotation
    ------------------------------------------------------- */
    var tRY = 0, tRX = 0, cRY = 0, cRX = 0;
    var autoRotY = 0;

    document.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth  - 0.5) * 2;
      var ny = (e.clientY / window.innerHeight - 0.5) * 2;
      tRY =  nx * 0.55;
      tRX = -ny * 0.22;
    });

    /* -------------------------------------------------------
       9. Animation loop
    ------------------------------------------------------- */
    var clock = new THREE.Clock();

    (function tick() {
      requestAnimationFrame(tick);
      var t = clock.getElapsedTime();

      /* -- Avatar rotation & float -- */
      autoRotY  += 0.0045;
      cRX       += (tRX - cRX) * 0.04;
      cRY       += (tRY - cRY) * 0.04;

      avatar.rotation.y = autoRotY + cRY;
      avatar.rotation.x = cRX;
      avatar.position.y = Math.sin(t * 0.65) * 0.14;

      /* -- Independent ring orbits -- */
      ringA.rotation.z = t * 0.38;
      ringB.rotation.y = t * 0.22;
      ringC.rotation.x = Math.PI / 1.6 + t * 0.15;
      ringC.rotation.z = t * 0.28;

      /* -- Spinning badges -- */
      lBadge.rotation.y = t * 1.8;
      rBadge.rotation.y = -t * 1.8;
      diamond.rotation.y = t * 1.2;
      diamond.rotation.x = t * 0.7;

      /* -- Orbiting gold light -- */
      goldPt.position.set(
        Math.sin(t * 0.42) * 5.5,
        2.5 + Math.sin(t * 0.28) * 1.2,
        Math.cos(t * 0.42) * 5.5
      );

      /* -- Particles -- */
      for (var i = 0; i < P; i++) {
        pAngle[i] += pSpd[i] * 0.007;
        var px = Math.cos(pAngle[i]) * pR[i];
        var pz = Math.sin(pAngle[i]) * pR[i];
        var py = pH[i] + Math.sin(t * 0.38 + i * 0.08) * 0.18;
        var layer = pLayer[i];
        var geo   = pSystems[layer];
        var pa    = geo.attributes.position.array;
        pa[i * 3    ] = px;
        pa[i * 3 + 1] = py;
        pa[i * 3 + 2] = pz;
      }
      pSystems.forEach(function (g) { g.attributes.position.needsUpdate = true; });

      /* -- Wireframe pulse -- */
      wireMat.opacity = 0.08 + Math.sin(t * 1.7) * 0.06;

      /* -- Eye pulse -- */
      var eyeI = 1.2 + Math.sin(t * 2.8) * 0.55;
      eyeMatL.emissiveIntensity = eyeI;
      eyeMatR.emissiveIntensity = eyeI;

      /* -- Holographic scan-line sweep -- */
      var scanPhase = (t % 4.5) / 4.5;         // 0-1 every 4.5 s
      scanPlane.position.y = -3 + scanPhase * 8;
      scanPlaneMat.opacity = scanPhase < 0.15 || scanPhase > 0.85
        ? 0 : 0.45;

      renderer.render(scene, camera);
    }());

    /* -------------------------------------------------------
       10. Responsive resize
    ------------------------------------------------------- */
    window.addEventListener('resize', function () {
      var nW = container.offsetWidth;
      var nH = container.offsetHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    });
  }

  /* ---- Run after DOM + Three.js are ready ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
