"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type FlavorStep = {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  system_prompt: string | null;
  user_prompt: string | null;
  temperature: number | null;
  humor_flavor_step_type_id: number | null;
  llm_model_id: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
};

export type OptionItem = {
  id: number;
  name: string | null;
};

type FlavorStepFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  flavorId: number;
  nextOrder: number;
  initialStep?: FlavorStep | null;
  stepTypes: OptionItem[];
  models: OptionItem[];
  inputTypes: OptionItem[];
  outputTypes: OptionItem[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function FlavorStepFormModal({
  open,
  mode,
  flavorId,
  nextOrder,
  initialStep,
  stepTypes,
  models,
  inputTypes,
  outputTypes,
  onClose,
  onSuccess,
}: FlavorStepFormModalProps) {
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [temperature, setTemperature] = useState<string>("");
  const [stepTypeId, setStepTypeId] = useState<string>("");
  const [modelId, setModelId] = useState<string>("");
  const [inputTypeId, setInputTypeId] = useState<string>("");
  const [outputTypeId, setOutputTypeId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDescription(initialStep?.description ?? "");
    setSystemPrompt(initialStep?.system_prompt ?? "");
    setUserPrompt(initialStep?.user_prompt ?? "");
    setTemperature(
      initialStep?.temperature !== null && initialStep?.temperature !== undefined
        ? String(initialStep.temperature)
        : "",
    );
    setStepTypeId(
      initialStep?.humor_flavor_step_type_id
        ? String(initialStep.humor_flavor_step_type_id)
        : "",
    );
    setModelId(initialStep?.llm_model_id ? String(initialStep.llm_model_id) : "");
    setInputTypeId(
      initialStep?.llm_input_type_id ? String(initialStep.llm_input_type_id) : "",
    );
    setOutputTypeId(
      initialStep?.llm_output_type_id
        ? String(initialStep.llm_output_type_id)
        : "",
    );
    setError(null);
    setIsSaving(false);
  }, [open, initialStep]);

  const title = useMemo(
    () => (mode === "create" ? "Add Step" : "Edit Step"),
    [mode],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!stepTypeId || !modelId || !inputTypeId || !outputTypeId) {
      setError("Please select all required step settings.");
      return;
    }

    const orderBy = mode === "create" ? nextOrder : initialStep?.order_by;
    if (!orderBy) {
      setError("Order is required.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setIsSaving(true);

    const payload = {
      humor_flavor_id: flavorId,
      order_by: orderBy,
      description: description.trim() || null,
      system_prompt: systemPrompt.trim() || null,
      user_prompt: userPrompt.trim() || null,
      temperature: temperature ? Number(temperature) : null,
      humor_flavor_step_type_id: Number(stepTypeId),
      llm_model_id: Number(modelId),
      llm_input_type_id: Number(inputTypeId),
      llm_output_type_id: Number(outputTypeId),
    };

    if (mode === "create") {
      const { error: insertError } = await supabase
        .from("humor_flavor_steps")
        .insert(payload);

      if (insertError) {
        setError(insertError.message);
        setIsSaving(false);
        return;
      }
    } else if (initialStep) {
      const { error: updateError } = await supabase
        .from("humor_flavor_steps")
        .update(payload)
        .eq("id", initialStep.id);

      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    onSuccess();
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Step Type
              </label>
              <select
                value={stepTypeId}
                onChange={(event) => setStepTypeId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                required
              >
                <option value="">Select step type</option>
                {stepTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name ?? `Type ${type.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Model</label>
              <select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                required
              >
                <option value="">Select model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name ?? `Model ${model.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Input Type
              </label>
              <select
                value={inputTypeId}
                onChange={(event) => setInputTypeId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                required
              >
                <option value="">Select input type</option>
                {inputTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name ?? `Input ${type.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Output Type
              </label>
              <select
                value={outputTypeId}
                onChange={(event) => setOutputTypeId(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                required
              >
                <option value="">Select output type</option>
                {outputTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name ?? `Output ${type.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              placeholder="Short summary"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium text-zinc-700">
                Temperature
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                placeholder="e.g. 0.7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              placeholder="Optional system prompt"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">
              User Prompt
            </label>
            <textarea
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
              className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              placeholder="Optional user prompt"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
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
