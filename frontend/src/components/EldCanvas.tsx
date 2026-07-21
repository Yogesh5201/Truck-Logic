import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import type { DaySegment } from './eldLogic';
import { STATUS_ORDER } from './eldLogic';
import { STATUS_COLORS } from '../theme/theme';
import type { DutyStatus } from '../types';

interface Props {
  segments: DaySegment[];
}

const STATUS_ROW_LABELS: Record<DutyStatus, string> = {
  OFF_DUTY: '1. Off Duty',
  SLEEPER_BERTH: '2. Sleeper',
  DRIVING: '3. Driving',
  ON_DUTY: '4. On Duty',
};

// Canvas layout constants.
const W = 900;
const H = 240;
const PAD_LEFT = 96; // room for status row labels
const PAD_RIGHT = 44; // room for the totals column
const PAD_TOP = 28; // room for hour numbers
const PAD_BOTTOM = 18;

/**
 * Draws a single FMCSA 24-hour ELD grid with the stepped duty-status line.
 *
 * Time (0–24h) maps to X; the four duty statuses map to Y rows. Each segment
 * is a horizontal line at its status row; consecutive segments are joined by
 * a vertical riser, producing the characteristic stepped log line.
 */
export default function EldCanvas({ segments }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI crispness.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${W}px`;
    canvas.style.height = 'auto';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, W, H);

    const gridW = W - PAD_LEFT - PAD_RIGHT;
    const gridH = H - PAD_TOP - PAD_BOTTOM;
    const offsetX = gridW / 24;
    const offsetY = gridH / 4;

    const xForHour = (hr: number) => PAD_LEFT + hr * offsetX;
    const yForRow = (rowIdx: number) => PAD_TOP + rowIdx * offsetY + offsetY / 2;

    // --- Background rows (subtle alternating shading) --------------------
    STATUS_ORDER.forEach((_status, i) => {
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      ctx.fillRect(PAD_LEFT, PAD_TOP + i * offsetY, gridW, offsetY);
    });

    // --- Grid lines ------------------------------------------------------
    // 15-minute subdivisions (light).
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let h = 0; h < 24; h++) {
      for (let q = 1; q < 4; q++) {
        const x = xForHour(h + q / 4);
        ctx.beginPath();
        ctx.moveTo(x, PAD_TOP);
        ctx.lineTo(x, PAD_TOP + gridH);
        ctx.stroke();
      }
    }

    // Hour lines (medium) + hour labels.
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h++) {
      const x = xForHour(h);
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, PAD_TOP + gridH);
      ctx.stroke();
      const label = h === 24 ? 'M' : h === 0 ? 'M' : h === 12 ? 'N' : `${h % 12 || 12}`;
      ctx.fillText(label, x, PAD_TOP - 10);
    }

    // Row separator lines (medium) + row labels.
    ctx.strokeStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const y = PAD_TOP + i * offsetY;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + gridW, y);
      ctx.stroke();
    }
    STATUS_ORDER.forEach((status, i) => {
      ctx.fillStyle = '#334155';
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(STATUS_ROW_LABELS[status], 8, PAD_TOP + i * offsetY + offsetY / 2 + 4);
    });

    // --- Duty status stepped line ---------------------------------------
    if (segments.length > 0) {
      const rowIndexOf = (s: DutyStatus) => STATUS_ORDER.indexOf(s);

      // Thick black base line (regulatory style).
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      let prevY: number | null = null;
      segments.forEach((seg) => {
        const y = yForRow(rowIndexOf(seg.status));
        const xStart = xForHour(seg.startHr);
        const xEnd = xForHour(seg.endHr);

        if (prevY === null) {
          ctx.moveTo(xStart, y);
        } else if (prevY !== y) {
          // Vertical riser connecting the previous row to this one.
          ctx.lineTo(xStart, prevY);
          ctx.lineTo(xStart, y);
        } else {
          ctx.lineTo(xStart, y);
        }
        ctx.lineTo(xEnd, y);
        prevY = y;
      });
      ctx.stroke();

      // Colored overlay per status segment for readability.
      segments.forEach((seg) => {
        const y = yForRow(rowIndexOf(seg.status));
        ctx.strokeStyle = STATUS_COLORS[seg.status];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xForHour(seg.startHr), y);
        ctx.lineTo(xForHour(seg.endHr), y);
        ctx.stroke();
      });
    }
  }, [segments]);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <canvas ref={canvasRef} aria-label="ELD daily log grid" />
    </Box>
  );
}
