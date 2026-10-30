/**
 * Demon Scroll — Enhanced Vector Experience
 * Multi-pass sculpted vector planes, sharpened edges & corners,
 * anatomical features (eyes, horn strata, core fissures),
 * interactive structural insights codex, and dynamic lighting.
 */
(() => {
  "use strict";

  const TRACE_SCALE = 0.1;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FRAMES = window.FRAMES;
  const FRAME_COUNT = window.FRAME_COUNT || (FRAMES ? FRAMES.length : 0);
  const FRAME_W = window.FRAME_W || 540;
  const FRAME_H = window.FRAME_H || 280;
  const DEFAULT_FILL = window.FILL || "#000000";

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) {
    console.error("Failed to load GSAP / ScrollTrigger");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Themes Definition
  const THEMES = {
    inferno: {
      name: "Inferno",
      bgSolid: "#080306",
      bgRadialInner: "#1d0b17",
      bgRadialOuter: "#050204",
      silhouetteBase: "#070306",
      silhouetteTopLight: "#261120",
      silhouetteMid: "#12060f",
      rimStroke: "#ff5a1a",
      rimGlow: "rgba(255, 75, 20, 0.8)",
      ember: "#ff8438",
      emberGlow: "rgba(255, 85, 20, 0.95)",
      eyeColor: "#ffcc00",
      eyeCore: "#ffffff",
      fissureColor: "#ff4500",
      fissureGlow: "rgba(255, 69, 0, 0.9)",
      glowBlur: 18,
      particleColors: ["#ff4500", "#ff7b00", "#ffa600", "#ffd000", "#ff2200", "#ffffff"],
      wireframeColor: "rgba(255, 80, 20, 0.45)"
    },
    spectral: {
      name: "Spectral",
      bgSolid: "#030810",
      bgRadialInner: "#0a1e38",
      bgRadialOuter: "#02050c",
      silhouetteBase: "#030710",
      silhouetteTopLight: "#0e2948",
      silhouetteMid: "#061222",
      rimStroke: "#00d2ff",
      rimGlow: "rgba(0, 240, 255, 0.85)",
      ember: "#38e1ff",
      emberGlow: "rgba(0, 240, 255, 0.95)",
      eyeColor: "#00ffff",
      eyeCore: "#ffffff",
      fissureColor: "#9d4edd",
      fissureGlow: "rgba(157, 78, 221, 0.9)",
      glowBlur: 20,
      particleColors: ["#00d2ff", "#00f0ff", "#9d4edd", "#7b2cbf", "#c77dff", "#ffffff"],
      wireframeColor: "rgba(0, 210, 255, 0.45)"
    },
    noir: {
      name: "Noir",
      bgSolid: "#090a0c",
      bgRadialInner: "#22242c",
      bgRadialOuter: "#07080a",
      silhouetteBase: "#121318",
      silhouetteTopLight: "#2c2e3a",
      silhouetteMid: "#181922",
      rimStroke: "#e2e8f0",
      rimGlow: "rgba(255, 255, 255, 0.6)",
      ember: "#f8fafc",
      emberGlow: "rgba(255, 255, 255, 0.75)",
      eyeColor: "#ffffff",
      eyeCore: "#cbd5e1",
      fissureColor: "#94a3b8",
      fissureGlow: "rgba(203, 213, 225, 0.6)",
      glowBlur: 12,
      particleColors: ["#cbd5e1", "#94a3b8", "#e2e8f0", "#ffffff", "#64748b"],
      wireframeColor: "rgba(241, 245, 249, 0.4)"
    },
    classic: {
      name: "Classic",
      bgSolid: "#c4c4c4",
      bgRadialInner: "#d4d4d4",
      bgRadialOuter: "#b4b4b4",
      silhouetteBase: "#0d0d0d",
      silhouetteTopLight: "#222222",
      silhouetteMid: "#141414",
      rimStroke: "#000000",
      rimGlow: "rgba(0, 0, 0, 0.3)",
      ember: "#ffffff",
      emberGlow: "rgba(255, 255, 255, 0.4)",
      eyeColor: "#ffffff",
      eyeCore: "#000000",
      fissureColor: "#333333",
      fissureGlow: "rgba(0, 0, 0, 0.4)",
      glowBlur: 0,
      particleColors: ["#ffffff", "#e5e5e5", "#a0a0a0"],
      wireframeColor: "rgba(31, 41, 55, 0.45)"
    }
  };

  let currentThemeKey = "inferno";
  let currentTheme = THEMES[currentThemeKey];
  let showInsights = false;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function containFit(viewW, viewH, fw, fh) {
    const scale = Math.min(viewW / fw, viewH / fh);
    return {
      scale,
      ox: (viewW - fw * scale) * 0.5,
      oy: (viewH - fh * scale) * 0.5,
    };
  }

  /**
   * Parse layered <g fill="..."> markup into Path2D groups.
   */
  function parseFrameLayers(markup, fallbackFill) {
    const layers = [];
    const gre = /<g\b([^>]*)>([\s\S]*?)<\/g>/gi;
    let gm;
    while ((gm = gre.exec(markup))) {
      const fillM = /fill="([^"]+)"/i.exec(gm[1]);
      const fill = (fillM && fillM[1]) || fallbackFill || "#000";
      const paths = [];
      const re = /<path\b[^>]*\sd="([^"]*)"/gi;
      let m;
      while ((m = re.exec(gm[2]))) {
        const d = m[1].replace(/\s+/g, " ").trim();
        if (!d) continue;
        try {
          paths.push(new Path2D(d));
        } catch (_) {}
      }
      if (paths.length) {
        const isEmber = fill.toUpperCase() === "#FFFFFF" || fill.toLowerCase() === "white";
        layers.push({ fill, isEmber, paths });
      }
    }
    if (!layers.length) {
      const paths = [];
      const re = /<path\b[^>]*\sd="([^"]*)"/gi;
      let m;
      while ((m = re.exec(markup))) {
        const d = m[1].replace(/\s+/g, " ").trim();
        if (!d) continue;
        try {
          paths.push(new Path2D(d));
        } catch (_) {}
      }
      if (paths.length) {
        const fill = fallbackFill || "#000";
        const isEmber = fill.toUpperCase() === "#FFFFFF" || fill.toLowerCase() === "white";
        layers.push({ fill, isEmber, paths });
      }
    }
    return layers;
  }

  if (!FRAMES || FRAMES.length !== FRAME_COUNT) {
    console.error("Failed to load vector frames");
    return;
  }

  // Canvas elements
  const stageCanvas = document.getElementById("stage");
  const stageCtx = stageCanvas.getContext("2d", { alpha: false, desynchronized: true });
  const particleCanvas = document.getElementById("particle-layer");
  const particleCtx = particleCanvas.getContext("2d", { alpha: true });
  const insightCanvas = document.getElementById("insight-layer");
  const insightCtx = insightCanvas.getContext("2d", { alpha: true });
  const reelEl = document.getElementById("reel");

  // DOM HUD references
  const hudFrameNum = document.getElementById("hud-frame-num");
  const hudFrameTotal = document.getElementById("hud-frame-total");
  const hudPct = document.getElementById("hud-pct");
  const scrubberWrap = document.getElementById("scrubber-wrap");
  const scrubberFill = document.getElementById("scrubber-fill");
  const scrubberThumb = document.getElementById("scrubber-thumb");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");
  const heroOverlay = document.getElementById("hero-overlay");
  const btnSoundToggle = document.getElementById("btn-sound-toggle");
  const btnInsightsToggle = document.getElementById("btn-insights-toggle");
  const insightsContainer = document.getElementById("insights-container");
  const themeBtns = document.querySelectorAll(".theme-btn");

  if (hudFrameTotal) hudFrameTotal.textContent = String(FRAME_COUNT).padStart(2, "0");

  /** Precompute Path2D layers for all 98 frames */
  const frameLayers = new Array(FRAME_COUNT);
  for (let i = 0; i < FRAME_COUNT; i++) {
    frameLayers[i] = parseFrameLayers(FRAMES[i], DEFAULT_FILL);
  }

  let dpr = 1;
  let viewW = 0;
  let viewH = 0;
  let drawnIndex = -1;
  let progress = 0;
  let paused = false;
  let isPlaying = false;
  let isInternalScroll = false;
  let scrollTriggerInstance = null;
  let lastScrollTime = performance.now();
  let scrollVelocity = 0;

  // Particle System State
  const PARTICLE_COUNT = reduceMotion ? 20 : 50;
  const particles = [];

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }
  }

  function createParticle(randomY = false) {
    const colors = currentTheme.particleColors;
    const color = colors[Math.floor(Math.random() * colors.length)];
    return {
      x: Math.random() * (viewW || 800),
      y: randomY ? Math.random() * (viewH || 600) : (viewH || 600) + 10 + Math.random() * 40,
      size: Math.random() * 2.2 + 0.6,
      vy: -(Math.random() * 0.95 + 0.35),
      vx: (Math.random() - 0.5) * 0.45,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.04 + 0.015,
      wobbleAmp: Math.random() * 0.8 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      color: color
    };
  }

  function updateParticles() {
    particleCtx.clearRect(0, 0, viewW, viewH);

    const boost = Math.min(scrollVelocity * 2.5, 4.0);
    const glow = currentTheme.glowBlur > 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmp;
      p.y += p.vy - boost;

      if (p.y < -20 || p.x < -20 || p.x > viewW + 20) {
        particles[i] = createParticle(false);
        continue;
      }

      particleCtx.save();
      particleCtx.globalAlpha = p.alpha;
      particleCtx.fillStyle = p.color;
      if (glow) {
        particleCtx.shadowColor = p.color;
        particleCtx.shadowBlur = 8;
      }
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particleCtx.fill();
      particleCtx.restore();
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, Math.floor(window.innerWidth));
    viewH = Math.max(1, Math.floor(window.innerHeight));

    stageCanvas.width = Math.floor(viewW * dpr);
    stageCanvas.height = Math.floor(viewH * dpr);
    stageCanvas.style.width = `${viewW}px`;
    stageCanvas.style.height = `${viewH}px`;

    particleCanvas.width = Math.floor(viewW * dpr);
    particleCanvas.height = Math.floor(viewH * dpr);
    particleCanvas.style.width = `${viewW}px`;
    particleCanvas.style.height = `${viewH}px`;
    particleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    insightCanvas.width = Math.floor(viewW * dpr);
    insightCanvas.height = Math.floor(viewH * dpr);
    insightCanvas.style.width = `${viewW}px`;
    insightCanvas.style.height = `${viewH}px`;
    insightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawnIndex = -1;
  }

  function frameIndexFromProgress(p) {
    return Math.round(clamp01(p) * (FRAME_COUNT - 1));
  }

  /**
   * Anatomical anchors in potrace coordinates (5400 x 2800)
   * Dynamically interpolated based on zoom and creature movement across the 98 frames.
   */
  function getAnatomicalAnchors(index) {
    // Normalizing index 0..97
    const t = index / Math.max(1, FRAME_COUNT - 1);

    // Initial stance (frames 0-20): creature standing in center
    // Zoom sequence (frames 21-50): camera zooms deep into the face/horns/chest
    // Climax (frames 51-97): creature rearing/lunging
    let headX, headY, chestX, chestY, leftWingX, leftWingY, rightWingX, rightWingY, talonX, talonY;
    let eyeScale = 1.0;

    if (t < 0.22) {
      // Zoomed out stance
      const u = t / 0.22;
      headX = 2700;
      headY = 1680 - u * 60;
      chestX = 2700;
      chestY = 1420 - u * 40;
      leftWingX = 1800;
      leftWingY = 2200;
      rightWingX = 3600;
      rightWingY = 2200;
      talonX = 2700;
      talonY = 900;
      eyeScale = 1.0;
    } else if (t < 0.52) {
      // Deep zoom on face / upper torso
      const u = (t - 0.22) / 0.3;
      headX = 2700 - u * 950;
      headY = 1620 - u * 350;
      chestX = 2700 - u * 800;
      chestY = 1380 - u * 400;
      leftWingX = 1800 - u * 800;
      leftWingY = 2200 - u * 400;
      rightWingX = 3600 - u * 1200;
      rightWingY = 2200 - u * 500;
      talonX = 2500 - u * 1000;
      talonY = 700;
      eyeScale = 1.0 + u * 1.8;
    } else {
      // Dynamic motion / lunging frames
      const u = (t - 0.52) / 0.48;
      headX = 1750 + Math.sin(u * Math.PI) * 400;
      headY = 1270 + Math.cos(u * Math.PI) * 200;
      chestX = 1900 + Math.sin(u * Math.PI) * 350;
      chestY = 980 + Math.cos(u * Math.PI) * 150;
      leftWingX = 1000 + Math.sin(u * Math.PI) * 500;
      leftWingY = 1800;
      rightWingX = 2800 + Math.cos(u * Math.PI) * 400;
      rightWingY = 1900;
      talonX = 2100;
      talonY = 600;
      eyeScale = 2.0 - u * 0.6;
    }

    return {
      head: { x: headX, y: headY },
      chest: { x: chestX, y: chestY },
      leftWing: { x: leftWingX, y: leftWingY },
      rightWing: { x: rightWingX, y: rightWingY },
      talon: { x: talonX, y: talonY },
      eyeScale
    };
  }

  /**
   * Render vector frame to stage canvas with:
   * 1. Directional volumetric 2D gradient on silhouette
   * 2. Mitered razor-sharp rim strokes along vector corners & edges
   * 3. Chitin plate bevels & muscle contours clipped to silhouette
   * 4. Glowing demonic eyes with radiant slit pupils
   * 5. Volcanic chest fissures & wing struts
   * 6. Radiant bloom on embers/sparks
   */
  function paint(index) {
    const layers = frameLayers[index];
    if (!layers) return;

    stageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. Far Background: Deep Abyssal Radial Lighting
    const radialGrad = stageCtx.createRadialGradient(
      viewW * 0.5, viewH * 0.45, 30,
      viewW * 0.5, viewH * 0.5, Math.max(viewW, viewH) * 0.78
    );
    radialGrad.addColorStop(0, currentTheme.bgRadialInner);
    radialGrad.addColorStop(1, currentTheme.bgRadialOuter);
    stageCtx.fillStyle = radialGrad;
    stageCtx.fillRect(0, 0, viewW, viewH);

    // Subtle background cavern spires for multi-plane depth
    stageCtx.save();
    stageCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
    stageCtx.beginPath();
    stageCtx.moveTo(0, viewH);
    stageCtx.lineTo(viewW * 0.15, viewH * 0.62);
    stageCtx.lineTo(viewW * 0.28, viewH * 0.82);
    stageCtx.lineTo(viewW * 0.48, viewH * 0.55);
    stageCtx.lineTo(viewW * 0.72, viewH * 0.75);
    stageCtx.lineTo(viewW * 0.88, viewH * 0.58);
    stageCtx.lineTo(viewW, viewH);
    stageCtx.closePath();
    stageCtx.fill();
    stageCtx.restore();

    const fit = containFit(viewW, viewH, FRAME_W, FRAME_H);
    const anchors = getAnatomicalAnchors(index);

    stageCtx.save();
    stageCtx.beginPath();
    stageCtx.rect(fit.ox, fit.oy, FRAME_W * fit.scale, FRAME_H * fit.scale);
    stageCtx.clip();
    stageCtx.translate(fit.ox, fit.oy);
    stageCtx.scale(fit.scale, fit.scale);
    // Potrace coordinate transformation: translate(0,H) scale(0.1, -0.1)
    stageCtx.translate(0, FRAME_H);
    stageCtx.scale(TRACE_SCALE, -TRACE_SCALE);

    // 2. Iterate and render layers with refined vector graphics
    for (let L = 0; L < layers.length; L++) {
      const layer = layers[L];
      const paths = layer.paths;
      if (!paths.length) continue;

      if (!layer.isEmber) {
        // === DEMON SILHOUETTE & ANATOMICAL PLANES ===
        stageCtx.save();

        // Combined Path2D for silhouette clipping
        const fullSilhouette = new Path2D();
        for (let i = 0; i < paths.length; i++) {
          fullSilhouette.addPath(paths[i]);
        }

        // Pass A: Volumetric Directional Gradient Fill
        const bodyGrad = stageCtx.createLinearGradient(1200, 2600, 3600, 400);
        bodyGrad.addColorStop(0, currentTheme.silhouetteTopLight);
        bodyGrad.addColorStop(0.35, currentTheme.silhouetteMid);
        bodyGrad.addColorStop(1, currentTheme.silhouetteBase);
        stageCtx.fillStyle = bodyGrad;
        stageCtx.fill(fullSilhouette, "evenodd");

        // Pass B: Clip to Silhouette for Internal Vector Planes, Plates & Horn Strata
        stageCtx.save();
        stageCtx.clip(fullSilhouette, "evenodd");

        // B1: Internal Chitin Carapace Plates & Anatomical Bevels
        const plateGrad = stageCtx.createLinearGradient(anchors.chest.x - 300, anchors.chest.y + 400, anchors.chest.x + 300, anchors.chest.y - 400);
        plateGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        plateGrad.addColorStop(0.5, "rgba(255, 100, 30, 0.04)");
        plateGrad.addColorStop(1, "transparent");
        stageCtx.fillStyle = plateGrad;
        stageCtx.fillRect(0, 0, 5400, 2800);

        // B2: Interlocking Chest Armor Plates (Pectoral & Rib Arches)
        stageCtx.lineWidth = 14;
        stageCtx.lineCap = "round";
        stageCtx.strokeStyle = currentTheme.wireframeColor;

        const cx = anchors.chest.x;
        const cy = anchors.chest.y;

        // Pectoral plate lines
        stageCtx.beginPath();
        stageCtx.moveTo(cx - 140, cy + 80);
        stageCtx.quadraticCurveTo(cx - 70, cy + 30, cx, cy + 50);
        stageCtx.quadraticCurveTo(cx + 70, cy + 30, cx + 140, cy + 80);
        stageCtx.stroke();

        // Sternum plate line
        stageCtx.beginPath();
        stageCtx.moveTo(cx, cy + 50);
        stageCtx.lineTo(cx, cy - 180);
        stageCtx.stroke();

        // Rib striations
        for (let r = 0; r < 4; r++) {
          const ry = cy - 20 - r * 45;
          const rw = 110 - r * 15;
          stageCtx.beginPath();
          stageCtx.moveTo(cx - rw, ry - 15);
          stageCtx.quadraticCurveTo(cx - rw * 0.5, ry, cx - 15, ry - 5);
          stageCtx.stroke();

          stageCtx.beginPath();
          stageCtx.moveTo(cx + rw, ry - 15);
          stageCtx.quadraticCurveTo(cx + rw * 0.5, ry, cx + 15, ry - 5);
          stageCtx.stroke();
        }

        // B3: Horn Strata (Segmented Annular Ridges on Horns)
        const hx = anchors.head.x;
        const hy = anchors.head.y;
        stageCtx.lineWidth = 12;
        stageCtx.strokeStyle = "rgba(255, 255, 255, 0.12)";

        for (let hn = 1; hn <= 5; hn++) {
          const offset = hn * 55;
          // Left horn ridge
          stageCtx.beginPath();
          stageCtx.moveTo(hx - 120 - offset * 0.8, hy + 80 + offset);
          stageCtx.lineTo(hx - 70 - offset * 0.8, hy + 100 + offset);
          stageCtx.stroke();

          // Right horn ridge
          stageCtx.beginPath();
          stageCtx.moveTo(hx + 120 + offset * 0.8, hy + 80 + offset);
          stageCtx.lineTo(hx + 70 + offset * 0.8, hy + 100 + offset);
          stageCtx.stroke();
        }

        // B4: Volcanic Geothermal Fissures (Molten Veins across Chest)
        stageCtx.save();
        stageCtx.strokeStyle = currentTheme.fissureColor;
        stageCtx.shadowColor = currentTheme.fissureGlow;
        stageCtx.shadowBlur = 18;
        stageCtx.lineWidth = 10;
        stageCtx.lineJoin = "round";

        stageCtx.beginPath();
        stageCtx.moveTo(cx, cy + 20);
        stageCtx.lineTo(cx - 45, cy - 35);
        stageCtx.lineTo(cx - 20, cy - 90);
        stageCtx.lineTo(cx - 60, cy - 140);
        stageCtx.moveTo(cx, cy + 20);
        stageCtx.lineTo(cx + 35, cy - 40);
        stageCtx.lineTo(cx + 25, cy - 110);
        stageCtx.lineTo(cx + 70, cy - 160);
        // Branching shoulder fissures
        stageCtx.moveTo(cx - 45, cy - 35);
        stageCtx.lineTo(cx - 120, cy - 10);
        stageCtx.moveTo(cx + 35, cy - 40);
        stageCtx.lineTo(cx + 110, cy - 15);
        stageCtx.stroke();
        stageCtx.restore();

        // B5: Piercing Glowing Demonic Eyes with Slit Pupil
        const escale = anchors.eyeScale;
        const eyeSpacing = 48 * escale;
        const eyeY = hy + 20;

        const drawDemonicEye = (eyeX) => {
          stageCtx.save();
          // Luminous eye aura bleed
          stageCtx.shadowColor = currentTheme.eyeColor;
          stageCtx.shadowBlur = 24 * escale;
          stageCtx.fillStyle = currentTheme.eyeColor;

          // Almond-shaped fiery eye socket
          stageCtx.beginPath();
          stageCtx.moveTo(eyeX - 22 * escale, eyeY);
          stageCtx.quadraticCurveTo(eyeX, eyeY + 14 * escale, eyeX + 22 * escale, eyeY);
          stageCtx.quadraticCurveTo(eyeX, eyeY - 14 * escale, eyeX - 22 * escale, eyeY);
          stageCtx.closePath();
          stageCtx.fill();

          // Incandescent white-hot core
          stageCtx.fillStyle = currentTheme.eyeCore;
          stageCtx.beginPath();
          stageCtx.arc(eyeX, eyeY, 8 * escale, 0, Math.PI * 2);
          stageCtx.fill();

          // Vertical obsidian slit pupil
          stageCtx.fillStyle = "#000000";
          stageCtx.shadowBlur = 0;
          stageCtx.beginPath();
          stageCtx.ellipse(eyeX, eyeY, 3 * escale, 11 * escale, 0, 0, Math.PI * 2);
          stageCtx.fill();

          stageCtx.restore();
        };

        drawDemonicEye(hx - eyeSpacing);
        drawDemonicEye(hx + eyeSpacing);

        // B6: Razor Fangs Gleam (in close-up / roaring frames)
        if (index > 22) {
          stageCtx.save();
          stageCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
          stageCtx.shadowColor = "#ffffff";
          stageCtx.shadowBlur = 10;
          // Upper fangs
          const fangY = hy - 90;
          stageCtx.beginPath();
          stageCtx.moveTo(hx - 35, fangY);
          stageCtx.lineTo(hx - 25, fangY - 45);
          stageCtx.lineTo(hx - 15, fangY);
          stageCtx.closePath();
          stageCtx.fill();

          stageCtx.beginPath();
          stageCtx.moveTo(hx + 15, fangY);
          stageCtx.lineTo(hx + 25, fangY - 45);
          stageCtx.lineTo(hx + 35, fangY);
          stageCtx.closePath();
          stageCtx.fill();
          stageCtx.restore();
        }

        stageCtx.restore(); // end silhouette clip

        // Pass C: Razor-Sharp Mitered Rim Contour (Sharpened Corners & Edges)
        stageCtx.save();
        stageCtx.lineJoin = "miter";
        stageCtx.miterLimit = 3.5;
        stageCtx.lineWidth = 16;
        stageCtx.strokeStyle = currentTheme.rimStroke;
        if (currentTheme.glowBlur > 0) {
          stageCtx.shadowColor = currentTheme.rimGlow;
          stageCtx.shadowBlur = 14;
        }
        for (let i = 0; i < paths.length; i++) {
          stageCtx.stroke(paths[i]);
        }
        stageCtx.restore();

        stageCtx.restore(); // end silhouette layer
      } else {
        // === PASS 2: RADIANT EMBER BLOOM & MOLTEN SPATTERS ===
        stageCtx.save();
        stageCtx.fillStyle = currentTheme.ember;
        if (currentTheme.glowBlur > 0) {
          stageCtx.shadowColor = currentTheme.emberGlow;
          stageCtx.shadowBlur = currentTheme.glowBlur;
          stageCtx.globalCompositeOperation = "screen";
        }
        for (let i = 0; i < paths.length; i++) {
          stageCtx.fill(paths[i], "evenodd");
        }
        stageCtx.restore();
      }
    }

    stageCtx.restore(); // end containFit transform
    drawnIndex = index;

    // 3. Render Architectural Wireframe & Insight Overlays
    renderInsightOverlay(index, fit, anchors);
  }

  /**
   * Render vector architectural telemetry, callout lines, and reticles
   */
  function renderInsightOverlay(index, fit, anchors) {
    insightCtx.clearRect(0, 0, viewW, viewH);
    if (!showInsights) return;

    // Convert potrace coordinates to current canvas viewport space
    const toScreen = (potX, potY) => {
      // transform: translate(fit.ox, fit.oy) scale(fit.scale) translate(0, FRAME_H) scale(0.1, -0.1)
      const screenX = fit.ox + (potX * TRACE_SCALE) * fit.scale;
      const screenY = fit.oy + (FRAME_H - potY * TRACE_SCALE) * fit.scale;
      return { x: screenX, y: screenY };
    };

    const sHead = toScreen(anchors.head.x, anchors.head.y);
    const sChest = toScreen(anchors.chest.x, anchors.chest.y);
    const sLeftWing = toScreen(anchors.leftWing.x, anchors.leftWing.y);
    const sTalon = toScreen(anchors.talon.x, anchors.talon.y);

    const accent = currentTheme.rimStroke;

    // Draw technical targeting reticle & leader line to a screen element
    const drawTarget = (pt, cardId, label) => {
      const card = document.getElementById(cardId);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cardX = (pt.x > viewW * 0.5) ? rect.left : rect.right;
      const cardY = rect.top + rect.height * 0.5;

      insightCtx.save();
      insightCtx.strokeStyle = accent;
      insightCtx.fillStyle = accent;
      insightCtx.lineWidth = 1.2;

      // 1. Targeting reticle bracket
      const r = 16;
      insightCtx.beginPath();
      // Outer tick corners
      insightCtx.moveTo(pt.x - r, pt.y - r * 0.5);
      insightCtx.lineTo(pt.x - r, pt.y - r);
      insightCtx.lineTo(pt.x - r * 0.5, pt.y - r);

      insightCtx.moveTo(pt.x + r * 0.5, pt.y - r);
      insightCtx.lineTo(pt.x + r, pt.y - r);
      insightCtx.lineTo(pt.x + r, pt.y - r * 0.5);

      insightCtx.moveTo(pt.x + r, pt.y + r * 0.5);
      insightCtx.lineTo(pt.x + r, pt.y + r);
      insightCtx.lineTo(pt.x + r * 0.5, pt.y + r);

      insightCtx.moveTo(pt.x - r * 0.5, pt.y + r);
      insightCtx.lineTo(pt.x - r, pt.y + r);
      insightCtx.lineTo(pt.x - r, pt.y + r * 0.5);
      insightCtx.stroke();

      // Center crosshair dot
      insightCtx.beginPath();
      insightCtx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      insightCtx.fill();

      // 2. Vector Leader line connecting to insight card
      const midX = pt.x + (cardX - pt.x) * 0.45;
      insightCtx.setLineDash([4, 4]);
      insightCtx.beginPath();
      insightCtx.moveTo(pt.x, pt.y);
      insightCtx.lineTo(midX, pt.y);
      insightCtx.lineTo(midX, cardY);
      insightCtx.lineTo(cardX, cardY);
      insightCtx.stroke();
      insightCtx.setLineDash([]);

      // Leader joint dot
      insightCtx.beginPath();
      insightCtx.arc(midX, cardY, 3, 0, Math.PI * 2);
      insightCtx.fill();

      // Coordinate telemetry text
      insightCtx.font = "9px 'JetBrains Mono', monospace";
      insightCtx.fillText(`${label} [X:${Math.round(pt.x)} Y:${Math.round(pt.y)}]`, pt.x + r + 4, pt.y - 4);

      insightCtx.restore();
    };

    drawTarget(sHead, "card-horns", "CRANIAL");
    drawTarget(sLeftWing, "card-wings", "WING_JOINT");
    drawTarget(sChest, "card-core", "GEOTHERMAL_CORE");
    drawTarget(sTalon, "card-talons", "TALON_SHEAR");
  }

  function updateHUD(p, frameIdx) {
    const displayNum = String(frameIdx + 1).padStart(2, "0");
    if (hudFrameNum) hudFrameNum.textContent = displayNum;

    const pct = Math.round(p * 100);
    if (hudPct) hudPct.textContent = `${pct}%`;

    if (scrubberFill) scrubberFill.style.width = `${p * 100}%`;
    if (scrubberThumb) scrubberThumb.style.left = `${p * 100}%`;
    if (scrubberWrap) scrubberWrap.setAttribute("aria-valuenow", String(pct));

    if (heroOverlay) {
      if (p > 0.03) {
        heroOverlay.classList.add("scrolled");
      } else {
        heroOverlay.classList.remove("scrolled");
      }
    }
  }

  /**
   * Primary state update: paints frame, updates HUD, and optionally syncs window scroll
   */
  function goToProgress(p, syncScroll = true) {
    const prevP = progress;
    progress = clamp01(p);

    const now = performance.now();
    const dt = Math.max(1, now - lastScrollTime);
    const dp = Math.abs(progress - prevP);
    scrollVelocity = Math.min((dp / dt) * 1000, 3.0);
    lastScrollTime = now;

    const idx = frameIndexFromProgress(progress);
    if (idx !== drawnIndex) {
      paint(idx);
    }
    updateHUD(progress, idx);

    if (syncScroll && scrollTriggerInstance) {
      const scrollTotal = scrollTriggerInstance.end - scrollTriggerInstance.start;
      if (scrollTotal > 0) {
        const targetY = scrollTriggerInstance.start + progress * scrollTotal;
        isInternalScroll = true;
        window.scrollTo({ top: targetY, behavior: "auto" });
        requestAnimationFrame(() => {
          isInternalScroll = false;
        });
      }
    }
  }

  function onProgress(p) {
    if (paused || isInternalScroll) return;
    goToProgress(p, false);
  }

  function bindScroll() {
    if (scrollTriggerInstance) {
      scrollTriggerInstance.kill();
    }
    const travel = reduceMotion ? "200%" : "400%";
    scrollTriggerInstance = ScrollTrigger.create({
      trigger: reelEl,
      start: "top top",
      end: `+=${travel}`,
      pin: true,
      pinSpacing: true,
      scrub: reduceMotion ? 0.15 : 0.35,
      onUpdate: (self) => onProgress(self.progress),
      invalidateOnRefresh: true,
    });
    ScrollTrigger.refresh();
  }

  // Scrubber Interaction (Click & Drag)
  let isScrubbing = false;

  function handleScrubberEvent(e) {
    if (!scrubberWrap) return;
    const rect = scrubberWrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const targetProgress = clamp01((clientX - rect.left) / rect.width);
    goToProgress(targetProgress, true);
  }

  if (scrubberWrap) {
    scrubberWrap.addEventListener("mousedown", (e) => {
      isScrubbing = true;
      handleScrubberEvent(e);
      const onMove = (mv) => {
        if (isScrubbing) handleScrubberEvent(mv);
      };
      const onUp = () => {
        isScrubbing = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    scrubberWrap.addEventListener("touchstart", (e) => {
      isScrubbing = true;
      handleScrubberEvent(e);
      const onTouchMove = (mv) => {
        if (isScrubbing) handleScrubberEvent(mv);
      };
      const onTouchEnd = () => {
        isScrubbing = false;
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    }, { passive: true });
  }

  // Play / Pause Auto-Loop
  function togglePlay() {
    isPlaying = !isPlaying;
    if (iconPlay && iconPause) {
      iconPlay.style.display = isPlaying ? "none" : "block";
      iconPause.style.display = isPlaying ? "block" : "none";
    }
    if (btnPlayPause) {
      btnPlayPause.setAttribute("aria-label", isPlaying ? "Pause animation" : "Play animation");
      btnPlayPause.classList.toggle("is-playing", isPlaying);
    }
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
    });
  }

  // Insights Toggle
  function toggleInsights() {
    showInsights = !showInsights;
    if (btnInsightsToggle) {
      btnInsightsToggle.classList.toggle("active", showInsights);
    }
    if (insightsContainer) {
      insightsContainer.classList.toggle("active", showInsights);
    }
    const idx = frameIndexFromProgress(progress);
    paint(idx);
  }

  if (btnInsightsToggle) {
    btnInsightsToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleInsights();
    });
  }

  // Wheel listener failsafe
  window.addEventListener("wheel", (e) => {
    if (scrollTriggerInstance) {
      const scrollTotal = scrollTriggerInstance.end - scrollTriggerInstance.start;
      if (scrollTotal <= 0) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 0.02;
        goToProgress(progress + delta, false);
      }
    }
  }, { passive: false });

  // Theme Switching
  function setTheme(themeKey) {
    if (!THEMES[themeKey]) return;
    currentThemeKey = themeKey;
    currentTheme = THEMES[themeKey];
    document.documentElement.setAttribute("data-theme", themeKey);

    themeBtns.forEach((btn) => {
      if (btn.getAttribute("data-theme-target") === themeKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    initParticles();
    const idx = frameIndexFromProgress(progress);
    paint(idx);
  }

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = btn.getAttribute("data-theme-target");
      setTheme(target);
    });
  });

  // Ambient Audio
  let audioCtx = null;
  let isMuted = true;
  let masterGain = null;
  let droneOsc1 = null;
  let droneOsc2 = null;
  let noiseNode = null;

  function initAmbientAudio() {
    if (audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      droneOsc1 = audioCtx.createOscillator();
      droneOsc1.type = "sawtooth";
      droneOsc1.frequency.setValueAtTime(43, audioCtx.currentTime);

      droneOsc2 = audioCtx.createOscillator();
      droneOsc2.type = "sine";
      droneOsc2.frequency.setValueAtTime(45, audioCtx.currentTime);

      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(110, audioCtx.currentTime);

      const droneGain = audioCtx.createGain();
      droneGain.gain.setValueAtTime(0.18, audioCtx.currentTime);

      droneOsc1.connect(filter);
      droneOsc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(masterGain);

      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
      }

      noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
      noiseFilter.Q.setValueAtTime(1.5, audioCtx.currentTime);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      droneOsc1.start();
      droneOsc2.start();
      noiseNode.start();
    } catch (err) {
      console.warn("AudioContext initialization prevented:", err);
    }
  }

  function toggleSound() {
    initAmbientAudio();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    isMuted = !isMuted;
    if (btnSoundToggle) {
      btnSoundToggle.classList.toggle("active", !isMuted);
      const strikeLines = btnSoundToggle.querySelectorAll(".sound-off-strike");
      const waves = btnSoundToggle.querySelectorAll(".sound-wave");
      strikeLines.forEach(l => l.style.display = isMuted ? "block" : "none");
      waves.forEach(w => w.style.display = isMuted ? "none" : "block");
    }

    if (masterGain) {
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.linearRampToValueAtTime(isMuted ? 0.0001 : 0.22, now + 0.6);
    }
  }

  if (btnSoundToggle) {
    btnSoundToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSound();
    });
  }

  // Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight" || e.code === "ArrowDown") {
      e.preventDefault();
      goToProgress(progress + 1 / (FRAME_COUNT - 1), true);
    } else if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
      e.preventDefault();
      goToProgress(progress - 1 / (FRAME_COUNT - 1), true);
    } else if (e.key === "i" || e.key === "I") {
      toggleInsights();
    } else if (e.key === "1") {
      setTheme("inferno");
    } else if (e.key === "2") {
      setTheme("spectral");
    } else if (e.key === "3") {
      setTheme("noir");
    } else if (e.key === "4") {
      setTheme("classic");
    } else if (e.key === "m" || e.key === "M") {
      toggleSound();
    }
  });

  // Main Animation Loop
  function renderLoop() {
    if (!paused) {
      updateParticles();

      // Velocity decay
      scrollVelocity *= 0.92;
      if (scrollVelocity < 0.01) scrollVelocity = 0;

      // Autoplay advance
      if (isPlaying) {
        let nextP = progress + 0.0032;
        if (nextP > 1) nextP = 0;
        goToProgress(nextP, true);
      }
    }
    requestAnimationFrame(renderLoop);
  }

  function onVisibility() {
    paused = document.hidden;
    if (!paused) {
      const idx = frameIndexFromProgress(progress);
      paint(idx);
    }
  }

  // Initialization sequence
  resize();
  initParticles();
  bindScroll();
  goToProgress(0, false);
  paint(0);
  renderLoop();

  window.addEventListener(
    "resize",
    () => {
      resize();
      const idx = frameIndexFromProgress(progress);
      paint(idx);
      ScrollTrigger.refresh();
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", onVisibility);
})();
