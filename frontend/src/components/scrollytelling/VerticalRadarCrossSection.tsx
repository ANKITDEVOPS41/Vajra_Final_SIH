import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StormPhase } from './StormAnatomyScrolly';

interface VerticalRadarCrossSectionProps {
  phaseIndex: number;
  scrollProgress: number;     // 0.0 to 1.0 total progress
  continuousPhase: number;    // 0.0 to 4.0 continuous interpolated phase
  phase: StormPhase;
  className?: string;
}

// Particle representation for hydrometeors (rain, hail, splash)
interface Hydrometeor {
  x: number;          // km (-15 to +15)
  y: number;          // km (0 to 18)
  vx: number;         // km/s
  vy: number;         // km/s
  type: 'rain' | 'hail' | 'graupel' | 'splash';
  size: number;
  alpha: number;
  life?: number;
  maxLife?: number;
}

export const VerticalRadarCrossSection: React.FC<VerticalRadarCrossSectionProps> = ({
  phaseIndex,
  scrollProgress,
  continuousPhase,
  phase,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ xKm: number; yKm: number; dbz: number } | null>(null);

  // Persistent animation references
  const continuousPhaseRef = useRef(continuousPhase);
  const phaseRef = useRef(phase);
  const hoverCoordsRef = useRef(hoverCoords);

  useEffect(() => {
    continuousPhaseRef.current = continuousPhase;
    phaseRef.current = phase;
    hoverCoordsRef.current = hoverCoords;
  }, [continuousPhase, phase, hoverCoords]);

  const particlesRef = useRef<Hydrometeor[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const dashOffsetRef = useRef<number>(0);
  const lightningFlashRef = useRef<{ active: boolean; opacity: number; path: Array<[number, number]> }>({
    active: false,
    opacity: 0,
    path: []
  });

  // Initialize particle pool
  useEffect(() => {
    const initialParticles: Hydrometeor[] = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const isHail = Math.random() < 0.35;
      initialParticles.push({
        x: (Math.random() - 0.5) * 16,
        y: isHail ? 5.0 + Math.random() * 6.0 : 0.5 + Math.random() * 10.0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: isHail ? (Math.random() - 0.5) * 0.8 : -1.5 - Math.random() * 2.0,
        type: isHail ? 'hail' : 'rain',
        size: isHail ? 2.5 + Math.random() * 3.5 : 1.0 + Math.random() * 1.5,
        alpha: 0.4 + Math.random() * 0.6
      });
    }
    particlesRef.current = initialParticles;
  }, []);

  // Handle Canvas Resizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const targetWidth = Math.max(300, Math.floor(rect.width));
    const targetHeight = Math.max(200, Math.floor(rect.height));

    if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      dashOffsetRef.current = (dashOffsetRef.current + dt * 25) % 100;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Deep Ocean Abyss Background
      ctx.fillStyle = '#020b14'; // ocean-950
      ctx.fillRect(0, 0, width, height);

      // Coordinate System Mappings
      // X: -15 km to +15 km
      // Y: 0 km to 18 km AGL
      const padLeft = 45;
      const padRight = 15;
      const padTop = 22;
      const padBottom = 26;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = height - padTop - padBottom;

      const kmToX = (km: number) => padLeft + ((km + 15) / 30) * plotWidth;
      const kmToY = (km: number) => padTop + (1 - km / 18.0) * plotHeight;
      const xToKm = (px: number) => ((px - padLeft) / plotWidth) * 30 - 15;
      const yToKm = (py: number) => (1 - (py - padTop) / plotHeight) * 18.0;

      // 2. Subtle Background Grid (every 2 km vertical, 5 km horizontal)
      ctx.lineWidth = 1;
      for (let km = 2; km <= 18; km += 2) {
        const y = kmToY(km);
        ctx.strokeStyle = km % 4 === 0 ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.5)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        // Y-axis kilometer labels in JetBrains Mono
        ctx.fillStyle = '#64748b'; // steel-400
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${km}k`, padLeft - 6, y);
      }

      // Horizontal range lines
      for (let xKm = -10; xKm <= 10; xKm += 5) {
        const x = kmToX(xKm);
        ctx.strokeStyle = xKm === 0 ? 'rgba(0, 229, 255, 0.2)' : 'rgba(30, 41, 59, 0.4)';
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, height - padBottom);
        ctx.stroke();

        ctx.fillStyle = xKm === 0 ? '#00e5ff' : '#64748b';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(xKm === 0 ? '0 km' : `${xKm > 0 ? '+' : ''}${xKm}k`, x, height - padBottom + 6);
      }

      // 3. Ground / Mountain Terrain Profile (Orographic slope)
      ctx.fillStyle = '#0a1626';
      ctx.beginPath();
      ctx.moveTo(padLeft, height - padBottom);
      // Gentle Himalayan foothill slope
      for (let xKm = -15; xKm <= 15; xKm += 1) {
        const px = kmToX(xKm);
        const terrainElevationKm = Math.max(0, 0.45 * Math.sin((xKm + 15) * 0.12) + 0.3 * Math.cos(xKm * 0.18));
        const py = kmToY(terrainElevationKm);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(width - padRight, height - padBottom);
      ctx.closePath();
      ctx.fill();

      // Terrain Boundary Line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ground Label
      ctx.fillStyle = '#475569';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('SURFACE / OROGRAPHIC SLOPE', padLeft + 6, height - padBottom - 6);

      // 4. Critical Atmospheric Isotherms
      // 0°C Freezing Level (4.5 km AGL)
      const y0C = kmToY(4.5);
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)'; // ice-500 cyan
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y0C);
      ctx.lineTo(width - padRight, y0C);
      ctx.stroke();
      ctx.restore();

      // Badge for 0°C
      ctx.fillStyle = 'rgba(4, 21, 39, 0.85)';
      ctx.fillRect(width - padRight - 215, y0C - 16, 210, 15);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - padRight - 215, y0C - 16, 210, 15);

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('0°C ISOTHERM (FREEZING LEVEL · 4.5 km)', width - padRight - 210, y0C - 5);

      // -20°C Mixed-Phase / Hail Growth Level (7.5 km AGL)
      const y20C = kmToY(7.5);
      ctx.save();
      ctx.strokeStyle = 'rgba(77, 208, 225, 0.65)'; // ice-400
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, y20C);
      ctx.lineTo(width - padRight, y20C);
      ctx.stroke();
      ctx.restore();

      // Badge for -20°C
      ctx.fillStyle = 'rgba(4, 21, 39, 0.85)';
      ctx.fillRect(width - padRight - 235, y20C - 16, 230, 15);
      ctx.strokeStyle = 'rgba(77, 208, 225, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(width - padRight - 235, y20C - 16, 230, 15);

      ctx.fillStyle = '#4dd0e1';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('-20°C MIXED-PHASE · 7.5 km (HAIL GROWTH)', width - padRight - 230, y20C - 5);

      // Tropopause / Equilibrium Level (15.0 km AGL)
      const yEL = kmToY(15.0);
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, yEL);
      ctx.lineTo(width - padRight, yEL);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('TROPOPAUSE / EL (15.0 km)', width - padRight - 8, yEL - 5);

      // 5. Calculate Smooth Interpolated Storm Geometry
      // We calculate parameters smoothly from continuousPhase (0.0 to 4.0)
      const cp = Math.max(0, Math.min(4, continuousPhaseRef.current));
      const currentPhaseData = phaseRef.current;
      
      // Interpolation anchor tables for 5 phases:
      // Phase 0: CI (T-60)
      // Phase 1: Updraft (T-45)
      // Phase 2: Hail Aloft (T-25)
      // Phase 3: Collapse (T-10)
      // Phase 4: Flood/Decay (T+0)
      const coreH_anchors = [3.2, 7.2, 8.9, 1.4, 0.4];
      const coreW_anchors = [2.8, 5.2, 6.8, 5.5, 9.0];
      const echoTop_anchors = [4.5, 14.8, 16.5, 11.5, 4.2];
      const echoBase_anchors = [0.8, 1.2, 2.2, 0.0, 0.0];
      const anvilSpread_anchors = [0.0, 6.0, 11.5, 4.0, 1.5];
      const zMax_anchors = [32.5, 54.0, 68.2, 66.5, 44.0];
      const w_anchors = [12.0, 36.5, 44.0, -28.0, -6.0];

      const lerpArray = (arr: number[], pos: number) => {
        const i = Math.floor(pos);
        const f = pos - i;
        if (i >= arr.length - 1) return arr[arr.length - 1];
        return arr[i] + f * (arr[i + 1] - arr[i]);
      };

      const interpCoreH = lerpArray(coreH_anchors, cp);
      const interpCoreW = lerpArray(coreW_anchors, cp);
      const interpEchoTop = lerpArray(echoTop_anchors, cp);
      const interpEchoBase = lerpArray(echoBase_anchors, cp);
      const interpAnvil = lerpArray(anvilSpread_anchors, cp);
      const interpZ = lerpArray(zMax_anchors, cp);
      const interpW = lerpArray(w_anchors, cp);

      const centerKm = 0; // Storm centered at 0 km
      const centerPx = kmToX(centerKm);

      // 6. Draw Multi-Layer DWR Reflectivity Contours
      // Helper function to render a vertical radar echo layer
      const drawReflectivityContour = (
        topKm: number,
        baseKm: number,
        widthKm: number,
        colorFill: string,
        strokeColor?: string,
        anvilWidthKm: number = 0,
        bwerVault: boolean = false
      ) => {
        const topY = kmToY(topKm);
        const baseY = kmToY(baseKm);
        const radiusX = (widthKm / 30) * plotWidth;
        const anvilRadiusX = (anvilWidthKm / 30) * plotWidth;

        ctx.save();
        ctx.fillStyle = colorFill;
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
        }

        ctx.beginPath();
        if (anvilWidthKm > 0.5 && topKm >= 12.0) {
          // Anvil geometry: broad horizontal mushroom cap at high altitude
          const anvilBaseY = kmToY(11.5);
          // Left anvil tip
          ctx.moveTo(centerPx - anvilRadiusX, topY + (anvilBaseY - topY) * 0.4);
          ctx.quadraticCurveTo(centerPx - anvilRadiusX * 0.6, topY - 5, centerPx, topY - (topKm > 15.0 ? 10 : 2)); // overshooting dome
          ctx.quadraticCurveTo(centerPx + anvilRadiusX * 0.6, topY - 5, centerPx + anvilRadiusX, topY + (anvilBaseY - topY) * 0.4);
          ctx.quadraticCurveTo(centerPx + radiusX * 1.2, anvilBaseY, centerPx + radiusX, (topY + baseY) * 0.5);
          // Main stem downward
          ctx.quadraticCurveTo(centerPx + radiusX * 0.8, baseY, centerPx, baseY);
          
          if (bwerVault) {
            // Weak Echo notch on inflow side (left)
            ctx.quadraticCurveTo(centerPx - radiusX * 0.3, baseY + (topY - baseY) * 0.3, centerPx - radiusX * 0.5, baseY + (topY - baseY) * 0.5);
          } else {
            ctx.quadraticCurveTo(centerPx - radiusX * 0.8, baseY, centerPx - radiusX, (topY + baseY) * 0.5);
          }
          ctx.quadraticCurveTo(centerPx - radiusX * 1.2, anvilBaseY, centerPx - anvilRadiusX, topY + (anvilBaseY - topY) * 0.4);
        } else {
          // Standard convective column / dome
          const centerY = (topY + baseY) / 2;
          const radiusY = Math.max(8, Math.abs(baseY - topY) / 2);
          ctx.ellipse(centerPx, centerY, Math.max(12, radiusX), radiusY, 0, 0, 2 * Math.PI);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeColor) ctx.stroke();
        ctx.restore();
      };

      // Layer 1: 15 - 25 dBZ (Light Blue / Cyan Outermost Cloud)
      drawReflectivityContour(
        interpEchoTop,
        interpEchoBase,
        interpCoreW * 2.2,
        'rgba(56, 189, 248, 0.22)',
        'rgba(56, 189, 248, 0.45)',
        interpAnvil
      );

      // Layer 2: 25 - 35 dBZ (Green Rain Envelope)
      if (interpZ >= 25) {
        drawReflectivityContour(
          Math.min(interpEchoTop - 1.0, 14.5),
          Math.max(interpEchoBase, 0.1),
          interpCoreW * 1.6,
          'rgba(34, 197, 94, 0.38)',
          'rgba(34, 197, 94, 0.65)',
          interpAnvil * 0.65
        );
      }

      // Layer 3: 35 - 45 dBZ (Yellow Heavy Rain)
      if (interpZ >= 35) {
        drawReflectivityContour(
          Math.min(interpEchoTop - 2.5, 12.5),
          Math.max(interpEchoBase, 0.0),
          interpCoreW * 1.2,
          'rgba(234, 179, 8, 0.55)',
          'rgba(234, 179, 8, 0.85)',
          0,
          cp > 0.8 && cp < 2.5 // BWER vault present during explosive updraft
        );
      }

      // Layer 4: 45 - 55 dBZ (Orange Intense Precipitation)
      if (interpZ >= 45) {
        drawReflectivityContour(
          Math.min(interpEchoTop - 4.0, interpCoreH + 2.8),
          Math.max(0.0, interpCoreH - 2.8),
          interpCoreW * 0.85,
          'rgba(249, 115, 22, 0.72)',
          'rgba(249, 115, 22, 0.95)'
        );
      }

      // Layer 5: 55 - 65 dBZ (Severe Red Core)
      if (interpZ >= 55) {
        drawReflectivityContour(
          interpCoreH + 1.8,
          Math.max(0.0, interpCoreH - 1.8),
          interpCoreW * 0.55,
          'rgba(239, 68, 68, 0.88)',
          'rgba(239, 68, 68, 1.0)'
        );
      }

      // Layer 6: 65+ dBZ (Extreme Giant Hail / Cloudburst Collapse Core - Violet/Magenta)
      if (interpZ >= 65) {
        const coreTop = interpCoreH + 1.2;
        const coreBase = Math.max(0.0, interpCoreH - 1.2);
        drawReflectivityContour(
          coreTop,
          coreBase,
          interpCoreW * 0.35,
          'rgba(168, 85, 247, 0.95)',
          '#f43f5e'
        );

        // Pulsing glow aura around 68 dBZ extreme core
        ctx.save();
        const pulse = Math.sin(now * 0.005) * 0.2 + 0.8;
        const glowGrad = ctx.createRadialGradient(
          centerPx,
          kmToY(interpCoreH),
          5,
          centerPx,
          kmToY(interpCoreH),
          (interpCoreW * 0.5 / 30) * plotWidth * 1.5
        );
        glowGrad.addColorStop(0, `rgba(244, 63, 94, ${0.4 * pulse})`);
        glowGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerPx, kmToY(interpCoreH), (interpCoreW * 0.6 / 30) * plotWidth * 1.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }

      // 7. Render Animated Convective Velocity Streamlines
      // Updraft / Downdraft flow indicators
      const isUpdraft = interpW >= 0;
      const streamColor = isUpdraft ? '#22c55e' : '#ef4444';
      ctx.save();
      ctx.strokeStyle = streamColor;
      ctx.lineWidth = 2.0;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = isUpdraft ? -dashOffsetRef.current : dashOffsetRef.current;

      const streamlineOffsets = [-2.8, -1.2, 0, 1.2, 2.8];
      streamlineOffsets.forEach((offsetKm) => {
        const startX = kmToX(centerKm + offsetKm * 0.6);
        let startY: number;
        let endY: number;
        let endX = kmToX(centerKm + offsetKm * (isUpdraft ? 1.4 : 1.8));

        if (isUpdraft) {
          // Inflow entering from ground to cloud top
          startY = kmToY(0.4);
          endY = kmToY(Math.min(13.5, interpEchoTop - 1.5));
        } else {
          // Cascading collapse from aloft to surface
          startY = kmToY(Math.max(6.0, interpCoreH + 2.0));
          endY = kmToY(0.2);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Slightly curved streamline
        const ctrlX = kmToX(centerKm + offsetKm * 0.3);
        const ctrlY = (startY + endY) / 2;
        ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
        ctx.stroke();

        // Arrowhead at terminus
        const arrowDir = isUpdraft ? -1 : 1;
        ctx.save();
        ctx.fillStyle = streamColor;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 4, endY - arrowDir * 8);
        ctx.lineTo(endX + 4, endY - arrowDir * 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      // 8. Particle System (Hydrometeors, Hail Aloft, Rain Streaks, Splashes)
      const particles = particlesRef.current;
      const isCollapsePhase = cp >= 2.5 && cp <= 3.8;
      const isHailAloftPhase = cp >= 1.6 && cp <= 2.8;

      particles.forEach((p) => {
        // Update particle physics
        if (p.type === 'hail') {
          if (isHailAloftPhase) {
            // Suspended aloft: oscillating violently in the 7-10 km hail growth zone
            p.y += (Math.random() - 0.5) * 0.25;
            p.x += (Math.random() - 0.5) * 0.15;
            // Kept within hail growth box (between 0°C and -40°C: 6 to 11 km)
            if (p.y < 6.0) p.y = 6.2 + Math.random() * 2.0;
            if (p.y > 11.0) p.y = 10.5 - Math.random() * 2.0;
            if (Math.abs(p.x) > 4.5) p.x = (Math.random() - 0.5) * 4.0;
          } else if (isCollapsePhase) {
            // Plunging downburst cascade!
            p.y -= (dt * 18.0 + Math.random() * 0.4);
            if (p.y <= 0.2) {
              p.y = 0.2;
              p.type = 'splash';
              p.life = 0;
              p.maxLife = 12;
              p.vx = (Math.random() - 0.5) * 8.0;
              p.vy = 2.0 + Math.random() * 4.0;
            }
          } else {
            // Normal decay / formation
            p.y -= dt * 4.0;
            if (p.y < 0.2) p.y = 7.0 + Math.random() * 3.0;
          }
        } else if (p.type === 'rain') {
          // Rain falls downward
          const fallSpeed = isCollapsePhase ? 22.0 : 8.0;
          p.y -= dt * fallSpeed;
          p.x += (Math.random() - 0.5) * 0.05;

          if (p.y <= 0.2) {
            p.y = 0.2;
            p.type = 'splash';
            p.life = 0;
            p.maxLife = 10;
            p.vx = (Math.random() - 0.5) * 6.0;
            p.vy = 1.5 + Math.random() * 3.0;
          }
        } else if (p.type === 'splash') {
          // Ground splash arc
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy -= dt * 25.0; // gravity pull down
          if (p.life !== undefined) p.life++;

          if (p.life !== undefined && p.maxLife !== undefined && p.life > p.maxLife) {
            // Reset to rain/hail aloft
            p.type = Math.random() < (isHailAloftPhase ? 0.6 : 0.2) ? 'hail' : 'rain';
            p.y = isHailAloftPhase ? 7.5 + Math.random() * 2.5 : Math.max(4.0, interpCoreH + 1.0);
            p.x = (Math.random() - 0.5) * (interpCoreW * 0.8);
          }
        }

        // Render Particle
        const px = kmToX(p.x);
        const py = kmToY(p.y);

        if (px >= padLeft && px <= width - padRight && py >= padTop && py <= height - padBottom) {
          if (p.type === 'hail') {
            // Hail stone: bright glowing sphere
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
          } else if (p.type === 'rain') {
            // Rain streak
            ctx.save();
            ctx.strokeStyle = isCollapsePhase ? 'rgba(0, 229, 255, 0.85)' : 'rgba(56, 189, 248, 0.65)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + (isCollapsePhase ? 9 : 5));
            ctx.stroke();
            ctx.restore();
          } else if (p.type === 'splash') {
            // Splash droplet
            ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      });

      // 9. Lightning Stroke Generator (triggers during severe updraft & hail aloft)
      if (currentPhaseData.metrics.lightningRate > 20 && Math.random() < 0.05) {
        lightningFlashRef.current = {
          active: true,
          opacity: 0.9,
          path: [
            [kmToX(centerKm + (Math.random() - 0.5) * 2), kmToY(interpEchoTop - 2)],
            [kmToX(centerKm + (Math.random() - 0.5) * 3), kmToY(7.5)],
            [kmToX(centerKm + (Math.random() - 0.5) * 2.5), kmToY(4.5)],
            [kmToX(centerKm + (Math.random() - 0.5) * 4), kmToY(0.5)]
          ]
        };
      }

      if (lightningFlashRef.current.active && lightningFlashRef.current.opacity > 0.05) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlashRef.current.opacity})`;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const pth = lightningFlashRef.current.path;
        if (pth.length > 0) {
          ctx.moveTo(pth[0][0], pth[0][1]);
          for (let i = 1; i < pth.length; i++) {
            ctx.lineTo(pth[i][0], pth[i][1]);
          }
          ctx.stroke();
        }
        ctx.restore();
        lightningFlashRef.current.opacity -= 0.12;
        if (lightningFlashRef.current.opacity <= 0.05) {
          lightningFlashRef.current.active = false;
        }
      }

      // 10. Core Centroid Reticle & Target HUD
      const coreY = kmToY(interpCoreH);
      ctx.save();
      // Glowing target reticle
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerPx, coreY, 7, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerPx, coreY, 2.5, 0, 2 * Math.PI);
      ctx.fill();

      // Crosshair ticks
      ctx.beginPath();
      ctx.moveTo(centerPx - 12, coreY);
      ctx.lineTo(centerPx - 8, coreY);
      ctx.moveTo(centerPx + 8, coreY);
      ctx.lineTo(centerPx + 12, coreY);
      ctx.moveTo(centerPx, coreY - 12);
      ctx.lineTo(centerPx, coreY - 8);
      ctx.moveTo(centerPx, coreY + 8);
      ctx.lineTo(centerPx, coreY + 12);
      ctx.stroke();

      // Core Label Card
      ctx.fillStyle = 'rgba(4, 21, 39, 0.9)';
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.lineWidth = 1;
      const labelText = `Z_MAX: ${interpZ.toFixed(1)} dBZ @ ${interpCoreH.toFixed(1)} km`;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillRect(centerPx + 14, coreY - 11, textWidth + 12, 20);
      ctx.strokeRect(centerPx + 14, coreY - 11, textWidth + 12, 20);

      ctx.fillStyle = '#e0f7fa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, centerPx + 20, coreY - 1);
      ctx.restore();

      // 11. DWR Reflectivity Colormap Scale Legend (Top Right)
      const legendX = padLeft + 12;
      const legendY = padTop + 8;
      const dbzSteps = [
        { label: '<15', color: '#1e293b' },
        { label: '20', color: '#38bdf8' },
        { label: '30', color: '#22c55e' },
        { label: '40', color: '#eab308' },
        { label: '50', color: '#f97316' },
        { label: '60', color: '#ef4444' },
        { label: '68+', color: '#a855f7' }
      ];

      ctx.save();
      ctx.fillStyle = 'rgba(4, 21, 39, 0.85)';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.fillRect(legendX, legendY, 210, 26);
      ctx.strokeRect(legendX, legendY, 210, 26);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('DWR dBZ SCALE', legendX + 6, legendY + 3);

      const stepW = 18;
      dbzSteps.forEach((step, sIdx) => {
        const sx = legendX + 75 + sIdx * stepW;
        ctx.fillStyle = step.color;
        ctx.fillRect(sx, legendY + 5, stepW - 2, 8);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(step.label, sx + stepW / 2 - 1, legendY + 15);
      });
      ctx.restore();

      // 12. Hover Interactive Crosshair
      const currentHover = hoverCoordsRef.current;
      if (currentHover) {
        const hx = kmToX(currentHover.xKm);
        const hy = kmToY(currentHover.yKm);

        if (hx >= padLeft && hx <= width - padRight && hy >= padTop && hy <= height - padBottom) {
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padLeft, hy);
          ctx.lineTo(width - padRight, hy);
          ctx.moveTo(hx, padTop);
          ctx.lineTo(hx, height - padBottom);
          ctx.stroke();

          // Tooltip Pill
          ctx.fillStyle = 'rgba(2, 11, 20, 0.95)';
          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          const tipText = `R: ${currentHover.xKm > 0 ? '+' : ''}${currentHover.xKm.toFixed(1)}km | H: ${currentHover.yKm.toFixed(1)}km AGL`;
          ctx.font = '9px "JetBrains Mono", monospace';
          const tipW = ctx.measureText(tipText).width + 12;
          const tipX = Math.min(width - padRight - tipW, Math.max(padLeft, hx + 10));
          const tipY = Math.max(padTop + 14, hy - 14);

          ctx.fillRect(tipX, tipY - 10, tipW, 18);
          ctx.strokeRect(tipX, tipY - 10, tipW, 18);

          ctx.fillStyle = '#00e5ff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(tipText, tipX + 6, tipY);
          ctx.restore();
        }
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Mouse Move for Interactive Coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padLeft = 45;
    const padRight = 15;
    const padTop = 22;
    const padBottom = 26;

    const plotWidth = rect.width - padLeft - padRight;
    const plotHeight = rect.height - padTop - padBottom;

    if (x >= padLeft && x <= rect.width - padRight && y >= padTop && y <= rect.height - padBottom) {
      const xKm = ((x - padLeft) / plotWidth) * 30 - 15;
      const yKm = (1 - (y - padTop) / plotHeight) * 18.0;
      setHoverCoords({ xKm, yKm, dbz: phase.metrics.zMax });
    } else {
      setHoverCoords(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};
