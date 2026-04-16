"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Flavor = {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
};

export type FlavorStepOption = {
  id: number;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  is_temperature_supported?: boolean | null;
};

type DraftStep = {
  llm_input_type_id: string;
  llm_output_type_id: string;
  llm_model_id: string;
  humor_flavor_step_type_id: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  temperature: string;
};

type FlavorFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialFlavor?: Flavor | null;
  stepTypes: FlavorStepOption[];
  models: FlavorStepOption[];
  inputTypes: FlavorStepOption[];
  outputTypes: FlavorStepOption[];
  stepTypesError: string | null;
  modelsError: string | null;
  inputTypesError: string | null;
  outputTypesError: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

function getFriendlyError(message: string) {
  if (message.toLowerCase().includes("duplicate key")) {
    return "That slug is already in use. Please choose another.";
  }
  return message;
}

export default function FlavorFormModal({
  open,
  mode,
  initialFlavor,
  stepTypes,
  models,
  inputTypes,
  outputTypes,
  stepTypesError,
  modelsError,
  inputTypesError,
  outputTypesError,
  onClose,
  onSuccess,
}: FlavorFormModalProps) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [steps, setSteps] = useState<DraftStep[]>([]);

  useEffect(() => {
    if (open) {
      setSlug(initialFlavor?.slug ?? "");
      setDescription(initialFlavor?.description ?? "");
      setSteps([
        {
          llm_input_type_id: "",
          llm_output_type_id: "",
          llm_model_id: "",
          humor_flavor_step_type_id: "",
          description: "",
          system_prompt: "",
          user_prompt: "",
          temperature: "",
        },
      ]);
      setError(null);
      setIsSaving(false);
    }
  }, [open, initialFlavor]);

  const title = useMemo(
    () => (mode === "create" ? "New Flavor" : "Edit Flavor"),
    [mode],
  );

  const getLabel = (option: FlavorStepOption) =>
    option.slug ?? option.description ?? option.name ?? `Item ${option.id}`;

  const inputTypeSlugById = useMemo(
    () => new Map(inputTypes.map((type) => [String(type.id), type.slug ?? ""])),
    [inputTypes],
  );
  const outputTypeSlugById = useMemo(
    () => new Map(outputTypes.map((type) => [String(type.id), type.slug ?? ""])),
    [outputTypes],
  );

  const stepFieldErrors = useMemo(() => {
    return steps.map((step) => {
      const errors: string[] = [];
      if (!step.humor_flavor_step_type_id) errors.push("Step Type is required.");
      if (!step.llm_model_id) errors.push("Model is required.");
      if (!step.llm_input_type_id) errors.push("Input Type is required.");
      if (!step.llm_output_type_id) errors.push("Output Type is required.");
      return errors;
    });
  }, [steps]);

  const chainError = useMemo(() => {
    if (steps.length === 0) return "Add at least one step to create this flavor.";
    const firstInputSlug = inputTypeSlugById.get(steps[0].llm_input_type_id) ?? "";
    if (firstInputSlug && firstInputSlug !== "image-and-text") {
      return "Step 1 input type must be image-and-text.";
    }
    for (let i = 1; i < steps.length; i += 1) {
      const slug = inputTypeSlugById.get(steps[i].llm_input_type_id) ?? "";
      if (slug && slug !== "text-only") {
        return `Step ${i + 1} input type must be text-only.`;
      }
    }
    for (let i = 0; i < steps.length - 1; i += 1) {
      const slug = outputTypeSlugById.get(steps[i].llm_output_type_id) ?? "";
      if (slug && slug !== "string") {
        return `Step ${i + 1} output type must be string.`;
      }
    }
    if (steps.length > 0) {
      const lastSlug =
        outputTypeSlugById.get(steps[steps.length - 1].llm_output_type_id) ?? "";
      if (lastSlug && lastSlug !== "array") {
        return `Step ${steps.length} output type must be array.`;
      }
    }
    return null;
  }, [steps, inputTypeSlugById, outputTypeSlugById]);

  const hasStepFieldErrors = stepFieldErrors.some((errs) => errs.length > 0);
  const canSubmit = mode === "edit" || (!hasStepFieldErrors && !chainError);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }

    if (mode === "create") {
      if (steps.length < 1) {
        setError("Add at least one step to create this flavor.");
        return;
      }
      if (hasStepFieldErrors) {
        setError("All steps must include the required dropdown selections.");
        return;
      }
      if (chainError) {
        setError(chainError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "create") {
      // Verification checklist:
      // 1) Create flavor with steps here.
      // 2) Insert steps with llm_* columns and humor_flavor_id.
      // 3) Navigate to /app/flavors/[id] and confirm steps render.
      const { data: flavor, error: insertError } = await supabase
        .from("humor_flavors")
        .insert({
          slug: slug.trim(),
          description: description.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(getFriendlyError(insertError.message));
        setIsSaving(false);
        return;
      }

      const createdFlavorId = flavor?.id ?? null;
      if (!createdFlavorId) {
        setError("Flavor was created, but we could not read its id.");
        setIsSaving(false);
        return;
      }

      const stepPayload = steps.map((step, index) => ({
        humor_flavor_id: createdFlavorId,
        order_by: index + 1,
        llm_input_type_id: Number(step.llm_input_type_id),
        llm_output_type_id: Number(step.llm_output_type_id),
        llm_model_id: Number(step.llm_model_id),
        humor_flavor_step_type_id: Number(step.humor_flavor_step_type_id),
        description: step.description.trim() || null,
        llm_system_prompt: step.system_prompt.trim() || null,
        llm_user_prompt: step.user_prompt.trim() || null,
        llm_temperature: step.temperature ? Number(step.temperature) : null,
      }));

      const { error: stepsError } = await supabase
        .from("humor_flavor_steps")
        .insert(stepPayload);

      if (stepsError) {
        setError(
          `Flavor created, but steps failed to save: ${stepsError.message}. You can retry or add steps on the flavor page.`,
        );
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      onClose();
      router.push(`/app/flavors/${createdFlavorId}`);
      return;
    } else if (initialFlavor) {
      const { error: updateError } = await supabase
        .from("humor_flavors")
        .update({
          slug: slug.trim(),
          description: description.trim() || null,
        })
        .eq("id", initialFlavor.id);

      if (updateError) {
        setError(getFriendlyError(updateError.message));
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    onSuccess();
    onClose();
  };

  const updateStep = (index: number, update: Partial<DraftStep>) => {
    setSteps((prev) =>
      prev.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...update } : step,
      ),
    );
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        llm_input_type_id: "",
        llm_output_type_id: "",
        llm_model_id: "",
        humor_flavor_step_type_id: "",
        description: "",
        system_prompt: "",
        user_prompt: "",
        temperature: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, stepIndex) => stepIndex !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex w-full max-w-3xl max-h-[85vh] flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              placeholder="e.g. dry-wit"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
              placeholder="Optional description"
            />
          </div>

          {mode === "create" ? (
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Steps
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Add at least one step (3 recommended).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300"
                >
                  Add Step
                </button>
              </div>

              {steps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                  No steps added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div
                      key={`step-${index}`}
                      className="rounded-xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Step {index + 1}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => moveStep(index, "up")}
                            disabled={index === 0}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, "down")}
                            disabled={index === steps.length - 1}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(index)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-red-600 hover:border-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            Step Type
                          </label>
                          <select
                            value={step.humor_flavor_step_type_id}
                            onChange={(event) =>
                              updateStep(index, {
                                humor_flavor_step_type_id: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            required
                          >
                            <option value="">Select</option>
                            {stepTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {getLabel(type)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            Model
                          </label>
                          <select
                            value={step.llm_model_id}
                            onChange={(event) =>
                              updateStep(index, { llm_model_id: event.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            required
                          >
                            <option value="">Select</option>
                            {models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name ?? `Model ${model.id}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            Input Type
                          </label>
                          <select
                            value={step.llm_input_type_id}
                            onChange={(event) =>
                              updateStep(index, { llm_input_type_id: event.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            required
                          >
                            <option value="">Select</option>
                            {inputTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {getLabel(type)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            Output Type
                          </label>
                          <select
                            value={step.llm_output_type_id}
                            onChange={(event) =>
                              updateStep(index, { llm_output_type_id: event.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            required
                          >
                            <option value="">Select</option>
                            {outputTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {getLabel(type)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-medium text-zinc-600">
                            Description
                          </label>
                          <input
                            type="text"
                            value={step.description}
                            onChange={(event) =>
                              updateStep(index, { description: event.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            placeholder="Optional step summary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            Temperature
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={step.temperature}
                            onChange={(event) =>
                              updateStep(index, { temperature: event.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            System Prompt
                          </label>
                          <textarea
                            value={step.system_prompt}
                            onChange={(event) =>
                              updateStep(index, { system_prompt: event.target.value })
                            }
                            className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            placeholder="Optional system prompt"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">
                            User Prompt
                          </label>
                          <textarea
                            value={step.user_prompt}
                            onChange={(event) =>
                              updateStep(index, { user_prompt: event.target.value })
                            }
                            className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-2 py-2 text-xs text-zinc-900"
                            placeholder="Optional user prompt"
                          />
                        </div>
                      </div>

                      {stepFieldErrors[index]?.length ? (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          {stepFieldErrors[index].join(" ")}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {mode === "create" &&
          (stepTypesError || modelsError || inputTypesError || outputTypesError) ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {stepTypesError ? `Step types: ${stepTypesError}` : null}
              {modelsError ? ` Models: ${modelsError}` : null}
              {inputTypesError ? ` Input types: ${inputTypesError}` : null}
              {outputTypesError ? ` Output types: ${outputTypesError}` : null}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          </div>

          <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-zinc-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (mode === "create" && !canSubmit)}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
