"use client";

import { useEffect, useRef } from "react";

type Grid = { alive: boolean; opacity: number }[][];

export default function GameOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set fixed canvas dimensions to match reference
    canvas.width = 1500;
    canvas.height = 600;

    let animationFrameId: number;
    const cellSize = 20; // Cell size for proper dot spacing
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    const transitionSpeed = 0.04; // Controls fade speed

    // Create initial grid with dots
    let grid: Grid = Array(rows)
      .fill(null)
      .map(() =>
        Array(cols)
          .fill(null)
          .map(() => ({
            alive: Math.random() > 0.85, // Fewer initial dots
            opacity: Math.random() > 0.85 ? 0.5 : 0,
          }))
      );

    const countNeighbors = (grid: Grid, x: number, y: number): number => {
      let sum = 0;
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          const row = (x + i + rows) % rows;
          const col = (y + j + cols) % cols;
          sum += grid[row][col].alive ? 1 : 0;
        }
      }
      sum -= grid[x][y].alive ? 1 : 0;
      return sum;
    };

    const draw = () => {
      // Clear with white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw dots
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const cell = grid[i][j];
          if (cell.alive && cell.opacity < 0.5) {
            cell.opacity = Math.min(cell.opacity + transitionSpeed, 0.5);
          } else if (!cell.alive && cell.opacity > 0) {
            cell.opacity = Math.max(cell.opacity - transitionSpeed, 0);
          }

          if (cell.opacity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${cell.opacity})`;
            ctx.beginPath();
            ctx.arc(
              j * cellSize + cellSize / 2,
              i * cellSize + cellSize / 2,
              1, // Smaller dots to match reference
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }

      // Update cell states based on Conway's Game of Life rules
      if (Math.random() > 0.8) {
        // Only update occasionally
        const next = grid.map((row, i) =>
          row.map((cell, j) => {
            const neighbors = countNeighbors(grid, i, j);
            const willBeAlive = cell.alive
              ? neighbors >= 2 && neighbors <= 3
              : neighbors === 3;
            return {
              alive: willBeAlive,
              opacity: cell.opacity,
            };
          })
        );
        grid = next;
      }

      setTimeout(() => {
        animationFrameId = requestAnimationFrame(draw);
      }, 125); // Match reference animation timing
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="mask pointer-events-none overflow-hidden select-none">
      <canvas ref={canvasRef} width="1500" height="600" />
    </div>
  );
}
