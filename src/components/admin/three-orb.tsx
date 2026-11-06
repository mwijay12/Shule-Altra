'use client';

/**
 * @fileOverview Three.js "institutional orb" — a live WebGL centrepiece for the
 * command deck. Wireframe icosahedron + particle halo with pointer parallax.
 * Degrades to a static gradient when WebGL or motion is unavailable.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ThreeOrbProps {
  className?: string;
  /** Base hue in degrees, used for the wireframe + particles. */
  hue?: number;
  /** Disable pointer interaction (e.g. behind dense content). */
  interactive?: boolean;
}

export function ThreeOrb({ className, hue = 214, interactive = true }: ThreeOrbProps) {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup = () => {};

    // Environments without WebGL (JSDOM, some kiosk browsers) keep the CSS fallback.
    if (typeof window === 'undefined' || typeof (window as any).WebGLRenderingContext === 'undefined') {
      return () => {};
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

        // Outer wireframe shell
        const shell = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.42, 1),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(`hsl(${hue} 85% 62%)`),
            wireframe: true,
            transparent: true,
            opacity: 0.5,
          })
        );
        group.add(shell);

        // Inner core with additive glow-ish structure
        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.72, 2),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(`hsl(${hue + 40} 90% 70%)`),
            wireframe: true,
            transparent: true,
            opacity: 0.85,
          })
        );
        group.add(core);

        // Particle halo
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
            color: new THREE.Color(`hsl(${hue + 20} 90% 72%)`),
            size: 0.028,
            transparent: true,
            opacity: 0.7,
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
          frame = requestAnimationFrame(render);
          const elapsed = clock.getElapsedTime();

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
        };
        const observer =
          typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
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
  }, [hue, interactive]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-full',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-full transition-opacity duration-700',
          ready ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background: `radial-gradient(circle at 30% 30%, hsl(${hue} 90% 70% / 0.75), hsl(${hue + 50} 85% 60% / 0.35) 45%, transparent 70%)`,
          filter: 'blur(14px)',
        }}
      />
    </div>
  );
}
