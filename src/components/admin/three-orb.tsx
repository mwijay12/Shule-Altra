'use client';

/**
 * @fileOverview Three.js brand orb for the command deck.
 *
 * The first version drew pale wireframes (62–72% lightness at 0.5 opacity), which
 * read well on the midnight surface and all but vanished on paper. Colours are
 * now derived from the active palette AND the active mode: saturated mid-dark
 * strokes with real opacity on light, luminous strokes on dark.
 *
 * Degrades to a static gradient when WebGL or motion is unavailable.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/components/admin/theme-provider';

interface ThreeOrbProps {
  className?: string;
  /** Override the palette hue (degrees). Defaults to the school's palette. */
  hue?: number;
  /** Disable pointer interaction (e.g. behind dense content). */
  interactive?: boolean;
}

export function ThreeOrb({ className, hue, interactive = true }: ThreeOrbProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { theme, palette } = useTheme();
  const [ready, setReady] = React.useState(false);

  const baseHue = hue ?? palette.orbHue;
  const isDark = theme === 'dark';

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup = () => {};

    // Environments without WebGL (JSDOM, some kiosk browsers) keep the CSS fallback.
    if (typeof window === 'undefined' || typeof (window as any).WebGLRenderingContext === 'undefined') {
      return () => {};
    }

    setReady(false);

    (async () => {
      try {
        // A software rasteriser (SwiftShader, llvmpipe, Remote Desktop, many
        // low-end Android GPUs) cannot afford a per-frame WebGL draw. Measured
        // here: the orb alone took the command deck from 60 fps to 4, which made
        // every counter, ring and chart on the page look like a slideshow. On
        // those machines keep the CSS orb below, which the compositor animates
        // for free.
        try {
          const probe = document.createElement('canvas');
          const gl = (probe.getContext('webgl') || probe.getContext('experimental-webgl')) as WebGLRenderingContext | null;
          if (!gl) return;
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
          gl.getExtension('WEBGL_lose_context')?.loseContext();
          if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(name)) return;
        } catch {
          return;
        }

        const THREE = await import('three');
        if (disposed || !mountRef.current) return;

        const width = mount.clientWidth || 320;
        const height = mount.clientHeight || 320;

        // This is a decorative wireframe, not a product viewer. DPR 2 with MSAA
        // rendered four times the pixels and starved every other animation on
        // the page: the dashboard measured 2-3 fps against a 60 fps baseline.
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: 'low-power',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.setSize(width, height);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 4.4);

        const group = new THREE.Group();
        scene.add(group);

        // three.js only understands the COMMA form of hsl(). The space-separated
        // CSS syntax silently parses to white, which is exactly why this orb
        // used to vanish against the pale hero. Keep the commas here. (The CSS
        // gradients below are real CSS and correctly use the space form.)
        // On paper the lines must be darker than the surface and mostly opaque;
        // on midnight they can be light and additive.
        const shellColor = isDark ? `hsl(${baseHue}, 88%, 66%)` : `hsl(${baseHue}, 74%, 31%)`;
        const coreColor = isDark ? `hsl(${baseHue + 34}, 92%, 74%)` : `hsl(${baseHue + 24}, 80%, 26%)`;
        const haloColor = isDark ? `hsl(${baseHue + 18}, 92%, 76%)` : `hsl(${baseHue + 12}, 70%, 34%)`;

        const shell = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.42, 1),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(shellColor),
            wireframe: true,
            transparent: true,
            opacity: isDark ? 0.5 : 0.85,
            depthWrite: false,
          })
        );
        group.add(shell);

        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.72, 2),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(coreColor),
            wireframe: true,
            transparent: true,
            opacity: isDark ? 0.85 : 1,
            depthWrite: false,
          })
        );
        group.add(core);

        const count = 520;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
          const radius = 1.75 + Math.random() * 0.95;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = radius * Math.cos(phi);
        }
        const haloGeometry = new THREE.BufferGeometry();
        haloGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const halo = new THREE.Points(
          haloGeometry,
          new THREE.PointsMaterial({
            color: new THREE.Color(haloColor),
            size: isDark ? 0.028 : 0.042,
            transparent: true,
            opacity: isDark ? 0.7 : 0.7,
            depthWrite: false,
          })
        );
        group.add(halo);

        const pointer = { x: 0, y: 0 };
        const target = { x: 0, y: 0 };

        const onPointerMove = (event: PointerEvent) => {
          const rect = mount.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        };

        if (interactive && !reduceMotion) {
          window.addEventListener('pointermove', onPointerMove, { passive: true });
        }

        const clock = new THREE.Clock();
        let frame = 0;
        // Pause when the orb is off screen or the tab is hidden. Previously it
        // span at full rate forever, wherever the reader was on the page.
        let onScreen = true;
        let lastDraw = 0;
        // 30 fps is indistinguishable from 60 for a 0.28 rad/s rotation, and
        // leaves the main thread free for the charts and counters.
        const FRAME_MS = 1000 / 30;
        const render = () => {
          if (!reduceMotion) frame = requestAnimationFrame(render);
          if (!reduceMotion) {
            if (!onScreen || document.hidden) return;
            const now = performance.now();
            if (now - lastDraw < FRAME_MS) return;
            lastDraw = now;
          }
          const elapsed = reduceMotion ? 0 : clock.getElapsedTime();

          target.x += (pointer.x - target.x) * 0.045;
          target.y += (pointer.y - target.y) * 0.045;

          const spin = reduceMotion ? 0.25 : elapsed * 0.28;
          group.rotation.y = spin + target.x * 0.45;
          group.rotation.x = Math.sin(elapsed * 0.35) * 0.12 + target.y * 0.3;
          core.rotation.y = -elapsed * (reduceMotion ? 0.15 : 0.5);
          core.rotation.z = elapsed * 0.22;
          halo.rotation.y = -spin * 0.55;
          halo.rotation.x = elapsed * 0.08;

          const pulse = reduceMotion ? 1 : 1 + Math.sin(elapsed * 1.6) * 0.03;
          group.scale.setScalar(pulse);

          renderer.render(scene, camera);
        };
        render();
        setReady(true);

        const resize = () => {
          const w = mount.clientWidth || width;
          const h = mount.clientHeight || height;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          if (reduceMotion) renderer.render(scene, camera);
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
        observer?.observe(mount);

        const visibility = typeof IntersectionObserver !== 'undefined'
          ? new IntersectionObserver((entries) => { onScreen = entries.some((e) => e.isIntersecting); }, { threshold: 0 })
          : null;
        visibility?.observe(mount);

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer?.disconnect();
          visibility?.disconnect();
          window.removeEventListener('pointermove', onPointerMove);
          haloGeometry.dispose();
          (halo.material as import('three').Material).dispose();
          shell.geometry.dispose();
          (shell.material as import('three').Material).dispose();
          core.geometry.dispose();
          (core.material as import('three').Material).dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        // WebGL unavailable, the CSS fallback below stays visible.
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [baseHue, interactive, reduceMotion, isDark]);

  return (
    <div ref={mountRef} aria-hidden className={cn('relative aspect-square w-full overflow-hidden rounded-full', className)}>
      {/* A soft disc gives the wireframe something to sit on. On light it is a
          tint of the palette; on dark it is the old glow. */}
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full"
        style={{
          background: isDark
            ? `radial-gradient(circle at 32% 30%, hsl(${baseHue} 90% 62% / 0.30), transparent 68%)`
            : `radial-gradient(circle at 32% 30%, hsl(${baseHue} 80% 52% / 0.16), hsl(${baseHue + 30} 75% 55% / 0.07) 55%, transparent 74%)`,
        }}
      />
      {/* Only while WebGL is starting. This used to linger at opacity 0 with a
          blur(14px) filter, so the compositor kept paying for a blurred 330px
          layer on every frame even though nothing was visible. The gradient is
          already soft, so it needs no filter at all. */}
      {!ready && (
        <>
          <div
            className={cn('pointer-events-none absolute inset-[6%] rounded-full', !reduceMotion && 'sd-orb-spin')}
            style={{
              background: isDark
                ? `conic-gradient(from 0deg, hsl(${baseHue} 90% 66% / 0.55), hsl(${baseHue + 50} 85% 60% / 0.22) 35%, hsl(${baseHue} 90% 70% / 0.5) 70%, hsl(${baseHue + 30} 80% 62% / 0.2) 100%)`
                : `conic-gradient(from 0deg, hsl(${baseHue} 78% 42% / 0.34), hsl(${baseHue + 40} 70% 48% / 0.12) 35%, hsl(${baseHue} 78% 40% / 0.32) 70%, hsl(${baseHue + 30} 72% 46% / 0.1) 100%)`,
              maskImage: 'radial-gradient(circle, transparent 38%, black 52%, black 72%, transparent 82%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 38%, black 52%, black 72%, transparent 82%)',
            }}
          />
          <div
            className={cn('pointer-events-none absolute inset-[24%] rounded-full', !reduceMotion && 'sd-orb-breathe')}
            style={{
              background: isDark
                ? `radial-gradient(circle at 34% 30%, hsl(${baseHue + 40} 92% 74% / 0.6), transparent 70%)`
                : `radial-gradient(circle at 34% 30%, hsl(${baseHue + 24} 80% 40% / 0.34), transparent 70%)`,
            }}
          />
        </>
      )}
    </div>
  );
}
