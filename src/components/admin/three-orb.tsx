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
        const THREE = await import('three');
        if (disposed || !mountRef.current) return;

        const width = mount.clientWidth || 320;
        const height = mount.clientHeight || 320;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
        // CSS syntax silently parses to white — which is exactly why this orb
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
        const render = () => {
          if (!reduceMotion) frame = requestAnimationFrame(render);
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

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer?.disconnect();
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
        // WebGL unavailable — the CSS fallback below stays visible.
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
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-full transition-opacity duration-700',
          ready ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background: isDark
            ? `radial-gradient(circle at 30% 30%, hsl(${baseHue} 90% 70% / 0.75), hsl(${baseHue + 50} 85% 60% / 0.35) 45%, transparent 70%)`
            : `radial-gradient(circle at 30% 30%, hsl(${baseHue} 78% 45% / 0.42), hsl(${baseHue + 40} 70% 48% / 0.18) 45%, transparent 70%)`,
          filter: 'blur(14px)',
        }}
      />
    </div>
  );
}
