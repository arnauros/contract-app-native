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

    // Set responsive canvas dimensions
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = Math.min(600, window.innerHeight * 0.6);
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    let animationFrameId: number;
    const cellSize = 8; // Smaller cells for better performance
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    const transitionSpeed = 0.08; // Smoother transitions

    // Create initial grid with fewer dots
    let grid: Grid = Array(rows)
      .fill(null)
      .map(() =>
        Array(cols)
          .fill(null)
          .map(() => ({
            alive: Math.random() > 0.9, // Even fewer initial dots (10%)
            opacity: Math.random() > 0.9 ? 0.4 : 0,
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

    // Track time for updates to reduce computation frequency
    let lastUpdateTime = 0;
    const updateInterval = 200; // Milliseconds between game-of-life updates

    const draw = (timestamp: number) => {
      // Clear with white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw dots
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const cell = grid[i][j];
          if (cell.alive && cell.opacity < 0.4) {
            cell.opacity = Math.min(cell.opacity + transitionSpeed, 0.4);
          } else if (!cell.alive && cell.opacity > 0) {
            cell.opacity = Math.max(cell.opacity - transitionSpeed, 0);
          }

          if (cell.opacity > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${cell.opacity})`;
            ctx.beginPath();
            ctx.arc(
              j * cellSize + cellSize / 2,
              i * cellSize + cellSize / 2,
              1, // Small dots
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }

      // Only update cell states occasionally to reduce CPU load
      if (timestamp - lastUpdateTime > updateInterval) {
        lastUpdateTime = timestamp;

        const next = grid.map((row, i) =>
          row.map((cell, j) => {
            // Only compute neighbors for cells that are alive or have alive neighbors
            // This dramatically reduces calculations for sparse grids
            if (!cell.alive && Math.random() > 0.05) {
              return cell; // 95% of dead cells stay unchanged
            }

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

      animationFrameId = requestAnimationFrame(draw);
    };

    draw(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  return (
    <div className="mask pointer-events-none overflow-hidden select-none w-full h-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}
