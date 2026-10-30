/**
 * Demon Scroll — Path2D vector playback of potrace frames from ref.gif
 * SCROLL drives progress (GSAP ScrollTrigger pin). One full-opacity frame —
 * no crossfade. Pause when document hidden.
 */
(() => {
  "use strict";

  const TRACE_SCALE = 0.1;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const FRAMES = window.FRAMES;
  const FRAME_COUNT = window.FRAME_COUNT;
  const FRAME_W = window.FRAME_W;
  const FRAME_H = window.FRAME_H;
  const FILL = window.FILL || "#000000";
  const BG = window.BG || "#C4C4C4";

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) {
    document.body.textContent = "Failed to load GSAP";
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /** object-fit: contain — full art visible, gray letterbox */
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
   * Falls back to a single FILL group if no <g> wrappers.
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
        } catch (_) {
          /* skip */
        }
      }
      if (paths.length) layers.push({ fill, paths });
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
        } catch (_) {
          /* skip */
        }
      }
      if (paths.length) layers.push({ fill: fallbackFill || "#000", paths });
    }
    return layers;
  }

  if (!FRAMES || FRAMES.length !== FRAME_COUNT) {
    document.body.textContent = "Failed to load vector frames";
    return;
  }

  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const reelEl = document.getElementById("reel");

  /** @type {{fill:string, paths:Path2D[]}[][]} */
  const frameLayers = new Array(FRAME_COUNT);
  for (let i = 0; i < FRAME_COUNT; i++) {
    frameLayers[i] = parseFrameLayers(FRAMES[i], FILL);
  }

  let dpr = 1;
  let viewW = 0;
  let viewH = 0;
  let drawnIndex = -1;
  let progress = 0;
  let paused = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = Math.max(1, Math.floor(window.innerWidth));
    viewH = Math.max(1, Math.floor(window.innerHeight));
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    drawnIndex = -1;
  }

  function frameIndexFromProgress(p) {
    return Math.round(clamp01(p) * (FRAME_COUNT - 1));
  }

  function paint(index) {
    const layers = frameLayers[index];
    if (!layers) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, viewW, viewH);

    const fit = containFit(viewW, viewH, FRAME_W, FRAME_H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(fit.ox, fit.oy, FRAME_W * fit.scale, FRAME_H * fit.scale);
    ctx.clip();
    ctx.translate(fit.ox, fit.oy);
    ctx.scale(fit.scale, fit.scale);
    // Potrace Y-flip: translate(0,H) scale(0.1,-0.1)
    ctx.translate(0, FRAME_H);
    ctx.scale(TRACE_SCALE, -TRACE_SCALE);

    for (let L = 0; L < layers.length; L++) {
      const { fill, paths } = layers[L];
      ctx.fillStyle = fill || FILL || "#000";
      for (let i = 0; i < paths.length; i++) {
        ctx.fill(paths[i], "evenodd");
      }
    }
    ctx.restore();

    drawnIndex = index;
  }

  function onProgress(p) {
    if (paused) return;
    progress = clamp01(p);
    const idx = frameIndexFromProgress(progress);
    if (idx !== drawnIndex) paint(idx);
  }

  function bindScroll() {
    const travel = reduceMotion ? "200%" : "400%";
    ScrollTrigger.create({
      trigger: reelEl,
      start: "top top",
      end: `+=${travel}`,
      pin: true,
      scrub: reduceMotion ? 0.15 : 0.35,
      onUpdate: (self) => onProgress(self.progress),
      invalidateOnRefresh: true,
    });
  }

  function onVisibility() {
    paused = document.hidden;
    if (!paused) {
      // re-sync paint after tab returns
      const idx = frameIndexFromProgress(progress);
      paint(idx);
    }
  }

  resize();
  bindScroll();
  onProgress(0);
  paint(0);

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
