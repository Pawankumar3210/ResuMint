"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const COLORS = ["var(--color-primary)", "var(--color-accent)"];
const PIECE_COUNT = 18;

interface Piece {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  delay: number;
}

function generatePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 20,
      rotate: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.1,
    };
  });
}

/**
 * A small, tasteful confetti burst -- not a full library dependency
 * (keeps bundle size minimal, per spec). The random layout is generated
 * once via a lazy useState initializer (guaranteed to run exactly once),
 * not during render, since calling Math.random() on every render would
 * violate component purity and make the burst reshuffle unpredictably.
 */
export function ConfettiBurst() {
  const [pieces] = useState(generatePieces);

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
          transition={{ duration: 0.7, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute h-1.5 w-1.5 rounded-sm"
          style={{ background: p.color }}
        />
      ))}
    </div>
  );
}
