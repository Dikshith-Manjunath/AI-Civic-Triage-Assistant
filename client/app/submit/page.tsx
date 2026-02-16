"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ComplaintSubmission } from "@/lib/types";

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [channel, setChannel] = useState("web");
  const [audio, setAudio] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplaintSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (location) formData.append("location", location);
    formData.append("channel", channel);
    if (audio) formData.append("audio", audio);
    if (image) formData.append("image", image);
    if (pdf) formData.append("pdf", pdf);

    try {
      const res = await api.submitComplaint(formData);
      setResult(res);
      // Reset form
      setText("");
      setLocation("");
      setAudio(null);
      setImage(null);
      setPdf(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Submit Complaint
        </h1>
        <p className="text-sm text-zinc-500">
          Report a civic issue with text, audio, images, or documents
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          {/* Text */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
              Complaint Description
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              placeholder="Describe the civic issue in detail..."
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              placeholder="Street address or landmark..."
            />
          </div>

          {/* Channel */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
              <option value="web">Web Portal</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Audio */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
                🎤 Audio
              </label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300"
              />
              {audio && (
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {audio.name}
                </p>
              )}
            </div>

            {/* Image */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
                📷 Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300"
              />
              {image && (
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {image.name}
                </p>
              )}
            </div>

            {/* PDF */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
                📄 PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-zinc-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300"
              />
              {pdf && (
                <p className="mt-1 truncate text-xs text-zinc-400">
                  {pdf.name}
                </p>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (!text && !audio && !image && !pdf)}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              "Submit Complaint"
            )}
          </button>
        </form>

        {/* Success */}
        {result && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
              ✅ Complaint Submitted!
            </h3>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              {result.message}
            </p>
            <p className="mt-1 text-xs text-green-600 dark:text-green-500">
              Ticket ID: {result.ticket_id}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              ❌ Submission Failed
            </h3>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
