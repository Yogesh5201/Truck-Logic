import { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import type { DaySegment } from './eldLogic';
import { STATUS_ORDER } from './eldLogic';
import { STATUS_COLORS } from '../theme/theme';
import type { DutyStatus } from '../types';

interface Props {
  segments: DaySegment[];
  totals: Record<DutyStatus, number>;
}

// Official FMCSA row labels (top -> bottom).
const STATUS_ROW_LABELS: Record<DutyStatus, string> = {
  OFF_DUTY: '1. Off Duty',
  SLEEPER_BERTH: '2. Sleeper Berth',
  DRIVING: '3. Driving',
  ON_DUTY: '4. On Duty (not driving)',
};

// Canvas layout constants.
const W = 940;
const H = 260;
const PAD_LEFT = 150; // room for status row labels
const PAD_RIGHT = 66; // room for the "Total Hours" column
const PAD_TOP = 34; // room for the hour header row
const PAD_BOTTOM = 20;

/**
 * Draws a single FMCSA "Driver's Daily Log" 24-hour grid with the stepped
 * duty-status line — modeled on the official paper log:
 *   • hour header from Midnight → Noon → Midnight
 *   • four status rows with numbered labels on the left
 *   • 15-minute tick subdivisions inside every hour column
 *   • a "Total Hours" column on the right with each row's daily total
 *   • the thick black stepped line with colored per-status overlay
 */
export default function EldCanvas({ segments, totals }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Theme-aware ink so the log is legible in both light and dark mode.
    const pal = {
      rowA: isDark ? '#1b1f27' : '#f8fafc',
      rowB: isDark ? '#171a21' : '#ffffff',
      tick: isDark ? '#3a4150' : '#cbd5e1',
      line: isDark ? '#4b5568' : '#94a3b8',
      labelStrong: isDark ? '#e6e8ee' : '#1e293b',
      labelSoft: isDark ? '#9aa2b1' : '#334155',
      value: isDark ? '#f1f5f9' : '#0f172a',
      dutyLine: isDark ? '#e6e8ee' : '#0f172a',
      accent: theme.palette.primary.main,
    };

    // High-DPI crispness.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${W}px`;
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, W, H);

    const gridW = W - PAD_LEFT - PAD_RIGHT;
    const gridH = H - PAD_TOP - PAD_BOTTOM;
    const offsetX = gridW / 24;
    const offsetY = gridH / 4;

    const xForHour = (hr: number) => PAD_LEFT + hr * offsetX;
    const yForRowCenter = (rowIdx: number) => PAD_TOP + rowIdx * offsetY + offsetY / 2;

    // --- Alternating row shading ----------------------------------------
    STATUS_ORDER.forEach((_status, i) => {
      ctx.fillStyle = i % 2 === 0 ? pal.rowA : pal.rowB;
      ctx.fillRect(PAD_LEFT, PAD_TOP + i * offsetY, gridW, offsetY);
    });

    // --- Hour header labels (Midnight | 1..11 | Noon | 1..11 | Midnight) -
    ctx.fillStyle = pal.labelSoft;
    ctx.font = '600 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h++) {
      const x = xForHour(h);
      let label: string;
      if (h === 0 || h === 24) label = 'Mid-\nnight';
      else if (h === 12) label = 'Noon';
      else label = `${h % 12}`;
      // Support the two-line "Midnight" label.
      const lines = label.split('\n');
      lines.forEach((ln, li) => ctx.fillText(ln, x, PAD_TOP - 22 + li * 9));
    }

    // --- 15-minute tick subdivisions ------------------------------------
    // Ticks rise from each row's baseline, like the paper log.
    ctx.strokeStyle = pal.tick;
    ctx.lineWidth = 0.5;
    for (let h = 0; h < 24; h++) {
      for (let q = 1; q < 4; q++) {
        const x = xForHour(h + q / 4);
        // Longer tick at the half hour, shorter at the quarters.
        const tickFrac = q === 2 ? 0.5 : 0.3;
        for (let r = 0; r < 4; r++) {
          const rowTop = PAD_TOP + r * offsetY;
          const rowBot = rowTop + offsetY;
          ctx.beginPath();
          ctx.moveTo(x, rowBot);
          ctx.lineTo(x, rowBot - offsetY * tickFrac);
          ctx.stroke();
        }
      }
    }

    // --- Hour vertical lines (medium) -----------------------------------
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1;
    for (let h = 0; h <= 24; h++) {
      const x = xForHour(h);
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, PAD_TOP + gridH);
      ctx.stroke();
    }

    // --- Row separator lines + left labels ------------------------------
    ctx.strokeStyle = pal.line;
    for (let i = 0; i <= 4; i++) {
      const y = PAD_TOP + i * offsetY;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + gridW, y);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    STATUS_ORDER.forEach((status, i) => {
      ctx.fillStyle = pal.labelStrong;
      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillText(STATUS_ROW_LABELS[status], 8, yForRowCenter(i) + 4);
    });

    // --- "Total Hours" column -------------------------------------------
    const totalsX = PAD_LEFT + gridW;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(totalsX, PAD_TOP);
    ctx.lineTo(totalsX, PAD_TOP + gridH);
    ctx.stroke();

    ctx.fillStyle = pal.labelSoft;
    ctx.font = '600 8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Total', totalsX + PAD_RIGHT / 2, PAD_TOP - 22);
    ctx.fillText('Hours', totalsX + PAD_RIGHT / 2, PAD_TOP - 13);

    STATUS_ORDER.forEach((status, i) => {
      ctx.fillStyle = pal.value;
      ctx.font = '700 12px Inter, sans-serif';
      ctx.fillText(
        totals[status].toFixed(2),
        totalsX + PAD_RIGHT / 2,
        yForRowCenter(i) + 4,
      );
    });

    // Grand total under the column.
    const grand = STATUS_ORDER.reduce((a, s) => a + totals[s], 0);
    ctx.strokeStyle = pal.line;
    ctx.beginPath();
    ctx.moveTo(totalsX, PAD_TOP + gridH);
    ctx.lineTo(totalsX + PAD_RIGHT, PAD_TOP + gridH);
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillText(grand.toFixed(1), totalsX + PAD_RIGHT / 2, PAD_TOP + gridH + 14);

    // --- Duty status stepped line ---------------------------------------
    if (segments.length > 0) {
      const rowIndexOf = (s: DutyStatus) => STATUS_ORDER.indexOf(s);

      // Thick base line (regulatory style).
      ctx.strokeStyle = pal.dutyLine;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      let prevY: number | null = null;
      segments.forEach((seg) => {
        const y = yForRowCenter(rowIndexOf(seg.status));
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
        const y = yForRowCenter(rowIndexOf(seg.status));
        ctx.strokeStyle = STATUS_COLORS[seg.status];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xForHour(seg.startHr), y);
        ctx.lineTo(xForHour(seg.endHr), y);
        ctx.stroke();
      });
    }
  }, [segments, totals, isDark, theme.palette.primary.main]);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <canvas ref={canvasRef} aria-label="ELD daily log grid" />
    </Box>
  );
}
