# Demon Scroll — Scroll-Driven Vector Canvas Animation 👹📜

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas%20Path2D-E34F26.svg?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Path2D)
[![GSAP](https://img.shields.io/badge/GSAP-ScrollTrigger-88CE02.svg?logo=greensock&logoColor=white)](https://greensock.com/scrolltrigger/)
[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

> **Awwwards-level 60 FPS scroll-bound vector silhouette animation engine.**  
> Vectorizes animated frames via Potrace into pre-compiled `Path2D` coordinates, driven with zero-jank frame rendering synchronized to GSAP ScrollTrigger timeline pins.

---

## ⚡ Technical Architecture

1. **Vector Pipeline:**
   - Source: Animated silhouette frames decomposed into coordinate paths.
   - Processing: Potrace vectorization converting frames into high-precision SVG `Path2D` vector objects stored in `data/frames-data.js`.
2. **Rendering Engine:**
   - Pre-compiled HTML5 `Path2D` cache with instantaneous single-frame opacity rendering (eliminating muddy cross-fades).
   - High-performance `requestAnimationFrame` loop synced directly to scroll percentage.
3. **Scroll Choreography:**
   - GSAP ScrollTrigger pins the viewport while scroll progress scrub-controls playback.
   - Smart pause management on `visibilitychange` (page blur/tab switch).

---

## 📁 Repository Structure

```text
demon-scroll/
├── app.js               # Main Canvas render engine & ScrollTrigger binding
├── build_frames.py      # Python vector frame extractor & Potrace builder
├── index.html           # Main interactive showcase page
├── style.css            # Responsive layout & typography
├── data/
│   └── frames-data.js   # Compiled Path2D coordinate vectors (690KB)
├── vendor/
│   ├── gsap.min.js          # GreenSock animation platform
│   └── ScrollTrigger.min.js # GSAP ScrollTrigger plugin
├── LICENSE              # MIT License
└── README.md            # Documentation
```

---

## 🚀 Quickstart

No complex build steps required. Serve with any static HTTP server:

```bash
# Clone the repository
git clone https://github.com/MirhazarKhan/demon-scroll.git
cd demon-scroll

# Serve locally
python -m http.server 8830
```

Open [http://localhost:8830](http://localhost:8830) in your browser.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 👨‍💻 Author

**Mirhazar Khan**  
*Senior 3D & Creative Web Engineer | AI Systems & Procedural Graphics Researcher*  
- **GitHub:** [@MirhazarKhan](https://github.com/MirhazarKhan)  
- **Website:** [mirhazarkhan.com](https://mirhazarkhan.com)
