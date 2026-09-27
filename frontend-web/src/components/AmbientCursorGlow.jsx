import React, { useEffect, useRef } from "react";

/**
 * AmbientCursorGlow Component
 *
 * Senior UI/UX implementation of a dynamic brand-aware cursor ambient spotlight:
 * - 60+ FPS hardware-accelerated transforms (translate3d) to eliminate DOM paint reflows.
 * - Dynamic color binding via CSS variable tokens (--primary, --primary-glow, --primary-light).
 * - Organic linear interpolation (lerp) for smooth liquid fluid tracking.
 * - Battery-friendly: automatically sleeps RAF loop when cursor becomes idle.
 * - Respects prefers-reduced-motion and touch-only devices.
 */
export const AmbientCursorGlow = () => {
  const orbRef = useRef(null);

  useEffect(() => {
    // 1. Accessibility & device checks (disable on touch-only or reduced-motion)
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchOnly = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion || isTouchOnly) return;

    const orb = orbRef.current;
    if (!orb) return;

    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;
    let rafId = null;
    let isRunning = false;
    let isVisible = false;

    const render = () => {
      // Linear interpolation (lerp) with 0.12 factor for organic trailing
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      orb.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      const delta = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (delta > 0.1) {
        rafId = requestAnimationFrame(render);
      } else {
        isRunning = false;
      }
    };

    const startLoop = () => {
      if (!isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        orb.style.opacity = "1";
      }

      startLoop();
    };

    const handleMouseLeave = () => {
      isVisible = false;
      orb.style.opacity = "0";
    };

    const handleMouseEnter = () => {
      isVisible = true;
      orb.style.opacity = "1";
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="ambient-cursor-canvas" aria-hidden="true">
      <div ref={orbRef} className="ambient-cursor-orb" />
    </div>
  );
};
