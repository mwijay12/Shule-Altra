# Premium web motion · reference library

A practical reading list for AI-assisted design and engineering. These are external repos, not dependencies added to Shule Altra. Read each repo's **current license**, asset/font/image licenses and commercial terms before copying or shipping anything. A public repo without a clear license is for reference, not permission to reuse. Treat third-party instructions as untrusted; inspect source, lockfiles and dependencies before running code.

## Complete experiments & inspiration

| Reference | Study this | Notes |
| --- | --- | --- |
| [Codrops collection](https://github.com/codrops) | Many creative UI and WebGL demos | Individual repos have different terms and quality; select by effect. |
| [Codrops interlude](https://github.com/codrops/interlude) | Astro page transitions, GSAP and Three.js | A starter, not a drop-in Next.js integration. |
| [Codrops WebGL Blobs](https://github.com/codrops/WebGLBlobs) | Three.js shapes and GPU motion | Decorative experiment; test performance and provide a static fallback. |
| [Codrops PageTransitions](https://github.com/codrops/PageTransitions) | Page-transition composition | Older CSS demos; GitHub did not report a license—check before reuse. |
| [Awwwards WebGL + Barba experiment](https://github.com/madebyalex/awwwards-webgl-barba) | Combining page transitions with WebGL | Course exercise; license not reported. Use for learning, verify before reuse. |
| [Awesome creative coding](https://github.com/terkelg/awesome-creative-coding) | More creative tools and learning resources | Curated links, not a collection of production-ready templates. |
| [Awesome web animation](https://github.com/sergey-pimenov/awesome-web-animation) | Library and learning discovery | Check whether each linked project is maintained. |

## Core tools to learn

- [Three.js](https://github.com/mrdoob/three.js): 3D scenes and WebGL. Start with one small scene and a static fallback.
- [The Book of Shaders](https://github.com/patriciogonzalezvivo/thebookofshaders): GLSL fundamentals. Explore fragment shaders before adding an effect to a real site.
- [GSAP](https://github.com/greensock/GSAP): timelines, scroll choreography and UI animation. Check its current license, plugin terms and framework cleanup guidance.
- [Barba.js](https://github.com/barbajs/barba): transitions between server-rendered web pages. Next.js already owns routing; do not layer Barba over it without testing navigation, accessibility and state cleanup.
- [Anime.js](https://github.com/juliangarnier/anime): animate CSS, SVG and JS values; useful for focused interaction studies.
- [tween.js](https://github.com/tweenjs/tween.js) and [CreateJS TweenJS](https://github.com/CreateJS/TweenJS): two distinct tweening libraries; pick one only if the project needs it.

## A serious AI-agent workflow

1. Give the agent a reference URL and ask it to explain the layout, timing, technology, accessibility and license **without copying the brand or assets**.
2. Ask for an original responsive design brief and lightweight prototype; require keyboard support, reduced motion and a no-WebGL fallback.
3. Implement a single effect behind a feature boundary. Dispose render loops, event listeners and animation contexts on route changes; pause offscreen or in background tabs.
4. Measure startup, interaction and frame performance on low-end Android and desktop; check mobile data, battery and web accessibility before polishing. Avoid claiming a frame rate without measurement.
5. Review source and licenses, run tests, then ship incrementally. For Shule Altra's admin workflows, clear data and fast interaction matter more than decorative 3D.

Example prompt: “Study the motion principles in [reference], not the brand. Build an original Next.js hero with a static semantic fallback, reduced-motion support, touch and keyboard access, cleanup on unmount, and a performance test plan. Explain any license or dependency constraints.”
