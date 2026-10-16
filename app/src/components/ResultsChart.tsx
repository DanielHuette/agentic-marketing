// Daily reads and clicks of a campaign as a line chart.
import { CategoryScale, Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";
import { useEffect, useRef } from "preact/hooks";
import type { DayRow } from "../lib/results";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip, Filler);

export function ResultsChart({ rows }: { rows: DayRow[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current === null) return;
    const chart = new Chart(canvas.current, {
      type: "line",
      data: {
        labels: rows.map((row) => new Date(`${row.day}T12:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })),
        datasets: [
          { label: "Aufrufe", data: rows.map((row) => row.views), borderColor: "#0b1a2c", backgroundColor: "rgba(11,26,44,0.08)", fill: true, tension: 0.3, yAxisID: "y" },
          { label: "Klicks", data: rows.map((row) => row.clicks), borderColor: "#b07a12", backgroundColor: "#b07a12", tension: 0.3, yAxisID: "y2" },
          { label: "Anfragen", data: rows.map((row) => row.leads), borderColor: "#0f766e", backgroundColor: "#0f766e", tension: 0.3, yAxisID: "y2", borderDash: [4, 4] },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Inter" } } } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Aufrufe" }, grid: { color: "#e2e6ec" } },
          y2: { beginAtZero: true, position: "right", title: { display: true, text: "Klicks, Anfragen" }, grid: { display: false } },
          x: { grid: { display: false } },
        },
      },
    });
    return () => {
      chart.destroy();
    };
  }, [rows]);
  return (
    <div class="chart">
      <canvas ref={canvas} role="img" aria-label="Aufrufe, Klicks und Anfragen je Tag" />
    </div>
  );
}
