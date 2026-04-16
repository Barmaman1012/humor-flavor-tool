"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const API_BASE_URL = "https://api.almostcrackd.ai";
const SUPPORTED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

type FlavorOption = {
  id: number;
  slug: string;
};

type ImageOption = {
  id: number;
  url: string;
  is_common_use?: boolean | null;
  created_datetime_utc?: string | null;
};

type TestClientProps = {
  flavors: FlavorOption[];
  images: ImageOption[];
};

type CaptionResponse = {
  captions?: string[];
  data?: { captions?: string[] };
  result?: { captions?: string[] };
};

type DebugStep = {
  step: string;
  status?: number;
  detail?: string;
  imageUrl?: string;
};

type RunRecord = {
  id: string;
  source: "file" | "image";
  imageUrl: string;
  status: "pending" | "success" | "error";
  captions: string[];
  error?: string;
  imageId?: string;
  flavorRejected?: boolean;
};

type StepCountState = {
  count: number | null;
  error: string | null;
  isLoading: boolean;
};

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("No active session. Please sign in again.");
  }
  return data.session.access_token;
}

function getCaptions(payload: CaptionResponse) {
  return (
    payload.captions ?? payload.data?.captions ?? payload.result?.captions ?? []
  );
}

async function checkPublicUrl(url: string) {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return true;
  } catch {
    // Ignore and try GET as fallback
  }

  try {
    const get = await fetch(url, { method: "GET" });
    return get.ok;
  } catch {
    return false;
  }
}

export default function TestClient({ flavors, images }: TestClientProps) {
  const fallbackImages: ImageOption[] = useMemo(() => {
    if (images.length > 0) return [];
    return [
      { id: 1, url: "https://picsum.photos/seed/humor-1/800/600" },
      { id: 2, url: "https://picsum.photos/seed/humor-2/800/600" },
      { id: 3, url: "https://picsum.photos/seed/humor-3/800/600" },
    ];
  }, [images.length]);
  const testImages = images.length > 0 ? images : fallbackImages;

  const [selectedFlavorId, setSelectedFlavorId] = useState<string>(
    flavors[0]?.id ? String(flavors[0].id) : "",
  );
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [step4Status, setStep4Status] = useState<number | null>(null);
  const [step4ResponseText, setStep4ResponseText] = useState<string | null>(null);
  const [step4ImageId, setStep4ImageId] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState<number | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [stepCount, setStepCount] = useState<StepCountState>({
    count: null,
    error: null,
    isLoading: false,
  });
  const [imageAccess, setImageAccess] = useState<Record<string, boolean>>({});

  const selectedImages = useMemo(() => {
    return testImages.filter((image) =>
      selectedImageIds.includes(String(image.id)),
    );
  }, [testImages, selectedImageIds]);

  const visibleImages = useMemo(() => {
    return testImages.filter((image) => image.url.startsWith("http"));
  }, [testImages]);

  useEffect(() => {
    let active = true;
    const checkImages = async () => {
      if (visibleImages.length === 0) {
        setImageAccess({});
        return;
      }
      const entries = await Promise.all(
        visibleImages.map(async (image) => {
          const ok = await checkPublicUrl(image.url);
          return [String(image.id), ok] as const;
        }),
      );
      if (!active) return;
      setImageAccess(Object.fromEntries(entries));
    };
    checkImages();
    return () => {
      active = false;
    };
  }, [visibleImages]);

  useEffect(() => {
    let active = true;
    const fetchStepCount = async () => {
      if (!selectedFlavorId) {
        setStepCount({ count: null, error: null, isLoading: false });
        return;
      }

      setStepCount((prev) => ({ ...prev, isLoading: true, error: null }));
      const response = await fetch("/app/api/flavors/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flavorId: Number(selectedFlavorId) }),
      });

      if (!active) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStepCount({
          count: 0,
          error: payload?.error ?? "Unable to validate flavor steps.",
          isLoading: false,
        });
        return;
      }

      setStepCount({ count: 1, error: null, isLoading: false });
    };

    fetchStepCount();
    return () => {
      active = false;
    };
  }, [selectedFlavorId]);

  const handleFlavorChange = (value: string) => {
    setSelectedFlavorId(value);
  };

  const toggleImage = (id: number) => {
    const key = String(id);
    if (imageAccess[key] === false) {
      return;
    }
    setSelectedImageIds((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
    setFile(null);
  };

  const handleFileChange = (newFile: File | null) => {
    if (!newFile) {
      return;
    }
    setFile(newFile);
    setPreviewUrl(URL.createObjectURL(newFile));
    setSelectedImageIds([]);
  };

  const handleGenerate = async () => {
    setError(null);
    setWarning(null);
    setDebugSteps([]);
    setCaptions([]);
    setStep4Status(null);
    setStep4ResponseText(null);
    setStep4ImageId(null);
    setPollAttempt(null);
    setRuns([]);

    if (!selectedFlavorId) {
      setError("Please select a humor flavor.");
      return;
    }

    if (stepCount.count === 0) {
      setError("This flavor has no steps. Add steps first.");
      return;
    }

    const validateResponse = await fetch("/app/api/flavors/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flavorId: Number(selectedFlavorId) }),
    });
    if (!validateResponse.ok) {
      const payload = await validateResponse.json().catch(() => null);
      setError(
        payload?.error ?? "This flavor has no steps. Add steps first.",
      );
      return;
    }

    if (!file && selectedImages.length === 0) {
      setError("Please select one or more test images, or upload a file.");
      return;
    }

    try {
      setIsLoading(true);
      const accessToken = await getAccessToken();

      const runForImageUrl = async (imageUrl: string, source: RunRecord["source"]) => {
        const runId = `${source}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setRuns((prev) => [
          ...prev,
          {
            id: runId,
            source,
            imageUrl,
            status: "pending",
            captions: [],
          },
        ]);

        let imageId: string | null = null;
        let flavorRejected = false;

        const uploadFromUrlResponse = await fetch(
          `${API_BASE_URL}/pipeline/upload-image-from-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              imageUrl,
              isCommonUse: false,
            }),
          },
        );

        if (!uploadFromUrlResponse.ok) {
          const detail = await uploadFromUrlResponse.text();
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 3: upload-image-from-url",
              status: uploadFromUrlResponse.status,
              detail,
              imageUrl,
            },
          ]);
          setRuns((prev) =>
            prev.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "error",
                    error: "Failed to register uploaded image.",
                  }
                : run,
            ),
          );
          return;
        }

        const uploadPayload = await uploadFromUrlResponse.json();
        imageId = uploadPayload.imageId ?? null;
        if (!imageId) {
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 3: upload-image-from-url",
              detail: JSON.stringify(uploadPayload),
              imageUrl,
            },
          ]);
          setRuns((prev) =>
            prev.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "error",
                    error: "API did not return an image id.",
                  }
                : run,
            ),
          );
          return;
        }

        setStep4ImageId(imageId);

        const callGenerateCaptions = async (includeFlavor: boolean) => {
          return fetch(`${API_BASE_URL}/pipeline/generate-captions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(
              includeFlavor
                ? { imageId, humorFlavorId: Number(selectedFlavorId) }
                : { imageId },
            ),
          });
        };

        const parseStep4 = async (response: Response) => {
          const rawText = await response.text();
          setStep4Status(response.status);
          setStep4ResponseText(rawText);
          if (!response.ok) {
            return { ok: false, rawText, captions: null };
          }
          try {
            const parsed = rawText ? JSON.parse(rawText) : null;
            if (Array.isArray(parsed)) {
              return { ok: true, rawText, captions: parsed as unknown[] };
            }
            return { ok: true, rawText, captions: null, nonArray: true };
          } catch {
            return { ok: true, rawText, captions: null, nonJson: true };
          }
        };

        let captionsResponse = await callGenerateCaptions(true);
        let parsed = await parseStep4(captionsResponse);

        if (
          !captionsResponse.ok &&
          (captionsResponse.status === 400 || captionsResponse.status === 422)
        ) {
          flavorRejected = true;
          setWarning(
            `Flavor parameter rejected by API, retrying without it. (${parsed.rawText})`,
          );
          captionsResponse = await callGenerateCaptions(false);
          parsed = await parseStep4(captionsResponse);
        }

        if (!captionsResponse.ok) {
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 4: generate-captions",
              status: captionsResponse.status,
              detail: parsed.rawText,
            },
          ]);
          setRuns((prev) =>
            prev.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "error",
                    error: "Failed to generate captions.",
                    imageId,
                    flavorRejected,
                  }
                : run,
            ),
          );
          return;
        }

        const normalizeCaptions = (items: unknown[]) =>
          items.map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "content" in item) {
              return String((item as { content?: unknown }).content ?? "");
            }
            return JSON.stringify(item);
          });

        if (parsed.captions && parsed.captions.length > 0) {
          const normalized = normalizeCaptions(parsed.captions);
          setCaptions((prev) => [...prev, ...normalized]);
          setRuns((prev) =>
            prev.map((run) =>
              run.id === runId
                ? {
                    ...run,
                    status: "success",
                    captions: normalized,
                    imageId,
                    flavorRejected,
                  }
                : run,
            ),
          );
          return;
        }

        if (parsed.captions && parsed.captions.length === 0) {
          let attempt = 1;
          let foundCaptions: string[] | null = null;
          while (attempt <= 20) {
            setPollAttempt(attempt);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const pollResponse = await callGenerateCaptions(false);
            const pollParsed = await parseStep4(pollResponse);

            if (!pollResponse.ok) {
              setDebugSteps((steps) => [
                ...steps,
                {
                  step: "Step 4: generate-captions (poll)",
                  status: pollResponse.status,
                  detail: pollParsed.rawText,
                },
              ]);
              setRuns((prev) =>
                prev.map((run) =>
                  run.id === runId
                    ? {
                        ...run,
                        status: "error",
                        error: "Failed to generate captions.",
                        imageId,
                        flavorRejected,
                      }
                    : run,
                ),
              );
              return;
            }

            if (pollParsed.captions && pollParsed.captions.length > 0) {
              foundCaptions = normalizeCaptions(pollParsed.captions);
              const resolvedCaptions = foundCaptions ?? [];
              setCaptions((prev) => [...prev, ...resolvedCaptions]);
              setRuns((prev) =>
                prev.map((run) =>
                  run.id === runId
                    ? {
                        ...run,
                        status: "success",
                        captions: foundCaptions ?? [],
                        imageId,
                        flavorRejected,
                      }
                    : run,
                ),
              );
              setPollAttempt(null);
              break;
            }

            attempt += 1;
          }

          if (!foundCaptions || foundCaptions.length === 0) {
            setError("Still processing—try again in a few seconds.");
            setRuns((prev) =>
              prev.map((run) =>
                run.id === runId
                  ? {
                      ...run,
                      status: "error",
                      error: "Still processing—try again in a few seconds.",
                      imageId,
                      flavorRejected,
                    }
                  : run,
              ),
            );
          }
          return;
        }

        setRuns((prev) =>
          prev.map((run) =>
            run.id === runId
              ? {
                  ...run,
                  status: "error",
                  error:
                    "Unexpected response from captions API. Check status and raw response below.",
                  imageId,
                  flavorRejected,
                }
              : run,
          ),
        );
      };

      const runWithFile = async (uploadFile: File) => {
        if (!SUPPORTED_CONTENT_TYPES.includes(uploadFile.type)) {
          throw new Error(
            "Unsupported file type. Use JPG, PNG, WebP, GIF, or HEIC.",
          );
        }

        const presignResponse = await fetch(
          `${API_BASE_URL}/pipeline/generate-presigned-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ contentType: uploadFile.type }),
          },
        );

        if (!presignResponse.ok) {
          const detail = await presignResponse.text();
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 1: generate-presigned-url",
              status: presignResponse.status,
              detail,
            },
          ]);
          throw new Error("Failed to generate upload URL.");
        }

        const presignPayload = await presignResponse.json();
        const presignedUrl = presignPayload.presignedUrl ?? null;
        const cdnUrl = presignPayload.cdnUrl ?? null;

        if (!presignedUrl || !cdnUrl) {
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 1: generate-presigned-url",
              detail: JSON.stringify(presignPayload),
            },
          ]);
          throw new Error("Upload URL not provided by API.");
        }

        const uploadResponse = await fetch(presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": uploadFile.type,
          },
          body: await uploadFile.arrayBuffer(),
        });

        if (!uploadResponse.ok) {
          const detail = await uploadResponse.text();
          setDebugSteps((steps) => [
            ...steps,
            {
              step: "Step 2: upload bytes",
              status: uploadResponse.status,
              detail,
            },
          ]);
          throw new Error("Failed to upload image bytes.");
        }

        await runForImageUrl(cdnUrl, "file");
      };

      if (file) {
        await runWithFile(file);
      } else {
        for (const image of selectedImages) {
          const isReachable = await checkPublicUrl(image.url);
          if (!isReachable) {
            setError(
              "Selected image URL is not publicly accessible. Upload a file instead.",
            );
            setRuns((prev) => [
              ...prev,
              {
                id: `image-${image.id}-${Date.now()}`,
                source: "image",
                imageUrl: image.url,
                status: "error",
                captions: [],
                error:
                  "Selected image URL is not publicly accessible. Upload a file instead.",
              },
            ]);
            continue;
          }
          await runForImageUrl(image.url, "image");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const previewImageUrl =
    previewUrl ?? (selectedImages.length > 0 ? selectedImages[0].url : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Test Flavor</h1>
          <p className="text-sm text-zinc-500">
            Generate captions from the REST pipeline and review results.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || stepCount.count === 0}
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Generating..." : "Generate captions"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </div>
      ) : null}

      {stepCount.count === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This flavor has no steps. Add steps first.
        </div>
      ) : stepCount.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {stepCount.error}
        </div>
      ) : null}

      {pollAttempt !== null ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Generating captions… (attempt {pollAttempt}/20)
        </div>
      ) : null}

      {step4Status !== null || step4ResponseText !== null || step4ImageId ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div className="mb-2 text-sm font-semibold text-zinc-900">
            Step 4 debug
          </div>
          <div className="space-y-2 text-xs text-zinc-600">
            <div>imageId: {step4ImageId ?? "—"}</div>
            <div>status: {step4Status ?? "—"}</div>
            <div>raw response:</div>
            <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">
              {step4ResponseText ?? "—"}
            </pre>
          </div>
        </div>
      ) : null}

      {debugSteps.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div className="mb-2 text-sm font-semibold text-zinc-900">
            Debug details
          </div>
          <ul className="space-y-3">
            {debugSteps.map((step, index) => (
              <li key={`${step.step}-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {step.step}
                </div>
                {step.status !== undefined ? (
                  <div className="text-xs text-zinc-600">Status: {step.status}</div>
                ) : null}
                {step.imageUrl ? (
                  <div className="mt-1 text-xs text-zinc-600">
                    imageUrl: {step.imageUrl}
                  </div>
                ) : null}
                {step.detail ? (
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-700">
                    {step.detail}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Humor flavor
            </label>
            <select
              value={selectedFlavorId}
              onChange={(event) => handleFlavorChange(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
            >
              <option value="">Select flavor</option>
              {flavors.map((flavor) => (
                <option key={flavor.id} value={flavor.id}>
                  {flavor.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-700">
              Test images
            </label>
            {visibleImages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
                No test images found.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleImages.map((image) => {
                  const isSelected = selectedImageIds.includes(String(image.id));
                  const isAccessible = imageAccess[String(image.id)] !== false;
                  const baseClass = isSelected
                    ? "rounded-lg border-2 border-zinc-900 p-2 text-left"
                    : "rounded-lg border border-zinc-200 p-2 text-left hover:border-zinc-300";
                  const className = isAccessible
                    ? baseClass
                    : `${baseClass} opacity-50 cursor-not-allowed hover:border-zinc-200`;
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => toggleImage(image.id)}
                      disabled={!isAccessible}
                      className={className}
                    >
                      <img
                        src={image.url}
                        alt={`Image ${image.id}`}
                        className="h-24 w-full rounded-md object-cover"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                        <span>Image {image.id}</span>
                        <span>
                          {!isAccessible
                            ? "Not public"
                            : isSelected
                              ? "Selected"
                              : "Select"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {images.length === 0 ? (
              <p className="text-xs text-amber-700">
                Using fallback test images because none were found in the
                database.
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Uses common-use images when available.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Upload (optional)
            </label>
            <input
              type="file"
              accept={SUPPORTED_CONTENT_TYPES.join(",")}
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-medium text-zinc-700">Preview</div>
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                alt="Preview"
                className="mt-3 max-h-80 w-full rounded-xl object-contain"
              />
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
                Select an image to preview.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-medium text-zinc-700">Captions</div>
            {captions.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                Captions will appear here after generation.
              </div>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-zinc-800">
                {captions.map((caption, index) => (
                  <li
                    key={`${caption}-${index}`}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    {caption}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {runs.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-sm font-medium text-zinc-700">Run history</div>
          <div className="mt-4 space-y-4">
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={run.imageUrl}
                      alt="Run image"
                      className="h-16 w-20 rounded-md object-cover"
                    />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        {run.source === "file" ? "Uploaded file" : "Test image"}
                      </div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {run.status === "pending"
                          ? "Running"
                          : run.status === "success"
                            ? "Completed"
                            : "Failed"}
                      </div>
                      {run.imageId ? (
                        <div className="text-xs text-zinc-500">
                          imageId: {run.imageId}
                        </div>
                      ) : null}
                      {run.flavorRejected ? (
                        <div className="text-xs text-amber-700">
                          Flavor not passed to API (unsupported)
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                {run.error ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {run.error}
                  </div>
                ) : null}
                {run.captions.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-zinc-800">
                    {run.captions.map((caption, index) => (
                      <li
                        key={`${run.id}-caption-${index}`}
                        className="rounded-lg border border-zinc-100 bg-white px-3 py-2"
                      >
                        {caption}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selectedFlavorId ? (
        <div className="text-sm text-zinc-600">
          View full results in{" "}
          <a
            href={`/app/results?flavorId=${selectedFlavorId}`}
            className="font-medium text-zinc-900 underline"
          >
            Results
          </a>
          .
        </div>
      ) : null}
    </div>
  );
}
