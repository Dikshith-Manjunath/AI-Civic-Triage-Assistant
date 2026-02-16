"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DEPT_CONFIG, URGENCY_CONFIG } from "@/lib/types";
import type { GeoPoint } from "@/lib/types";

export default function MapPage() {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getHeatmap();
        setPoints(data.points);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load map data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Complaint Map
        </h1>
        <p className="text-sm text-zinc-500">
          Geographic distribution of civic complaints ({points.length} located)
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Map placeholder - swap with deck.gl or Mapbox in production */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-[500px] items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
          {points.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl">🗺️</p>
              <p className="mt-2 text-zinc-500">
                No geo-located complaints yet
              </p>
              <p className="text-xs text-zinc-400">
                Submit complaints with location data to see them here
              </p>
            </div>
          ) : (
            <div className="w-full p-6">
              <p className="mb-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                📍 {points.length} geo-located complaints
                <br />
                <span className="text-xs">
                  Integrate deck.gl / react-map-gl for production heatmap
                </span>
              </p>
              <div className="mx-auto max-w-2xl space-y-2">
                {points.slice(0, 10).map((pt) => {
                  const dept = DEPT_CONFIG[pt.department] || DEPT_CONFIG.general;
                  const urg = URGENCY_CONFIG[pt.urgency];
                  return (
                    <div
                      key={pt.complaint_id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      onClick={() => setSelectedPoint(pt)}
                    >
                      <span className="text-lg">{dept.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-zinc-900 dark:text-white">
                          {pt.summary}
                        </p>
                        <p className="text-xs text-zinc-500">
                          📍 {pt.lat.toFixed(4)}, {pt.lon.toFixed(4)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${urg.bg} ${urg.color}`}
                      >
                        {urg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
          Low urgency
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
          Medium urgency
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
          High urgency
        </div>
      </div>

      {/* Selected point detail */}
      {selectedPoint && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {selectedPoint.summary}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Department: {DEPT_CONFIG[selectedPoint.department]?.label} |
                Location: {selectedPoint.lat.toFixed(4)},{" "}
                {selectedPoint.lon.toFixed(4)}
              </p>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
