"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import FlavorStepFormModal, {
  FlavorStep,
  OptionItem,
} from "./FlavorStepFormModal";

type Flavor = {
  id: number;
  slug: string;
  description: string | null;
};

type FlavorStepsClientProps = {
  flavor: Flavor;
  steps: FlavorStep[];
  stepTypes: OptionItem[];
  models: OptionItem[];
  inputTypes: OptionItem[];
  outputTypes: OptionItem[];
};

function formatPrompt(value: string | null) {
  if (!value) {
    return "—";
  }
  return value;
}

export default function FlavorStepsClient({
  flavor,
  steps,
  stepTypes,
  models,
  inputTypes,
  outputTypes,
}: FlavorStepsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<FlavorStep | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stepTypeMap = useMemo(() => {
    return new Map(stepTypes.map((type) => [type.id, type.name ?? "—"]));
  }, [stepTypes]);

  const modelMap = useMemo(() => {
    return new Map(models.map((model) => [model.id, model.name ?? "—"]));
  }, [models]);

  const inputTypeMap = useMemo(() => {
    return new Map(inputTypes.map((type) => [type.id, type.name ?? "—"]));
  }, [inputTypes]);

  const outputTypeMap = useMemo(() => {
    return new Map(outputTypes.map((type) => [type.id, type.name ?? "—"]));
  }, [outputTypes]);

  const nextOrder = useMemo(() => {
    const maxOrder = steps.reduce((max, step) => Math.max(max, step.order_by), 0);
    return maxOrder + 1;
  }, [steps]);

  const openCreate = () => {
    setEditingStep(null);
    setIsModalOpen(true);
  };

  const openEdit = (step: FlavorStep) => {
    setEditingStep(step);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingStep(null);
  };

  const handleSuccess = () => {
    setActionError(null);
    router.refresh();
  };

  const handleDelete = async (step: FlavorStep) => {
    const confirmed = window.confirm(
      `Delete step ${step.order_by}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("humor_flavor_steps")
      .delete()
      .eq("id", step.id);

    if (error) {
      setActionError(error.message);
      return;
    }

    router.refresh();
  };

  const handleReorder = async (step: FlavorStep, direction: "up" | "down") => {
    setActionError(null);
    const response = await fetch("/app/api/steps/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId: step.id, direction }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setActionError(data?.error ?? "Unable to reorder step.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="text-sm text-zinc-500">
              <a href="/app/flavors" className="hover:underline">
                Flavors
              </a>
              <span className="px-2">/</span>
              <span>{flavor.slug}</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                {flavor.slug}
              </h1>
              <p className="text-sm text-zinc-500">
                {flavor.description || "No description provided."}
              </p>
              <a
                href={`/app/flavors/${flavor.id}/results`}
                className="mt-2 inline-block text-sm font-medium text-zinc-700 hover:underline"
              >
                View results
              </a>
            </div>
          </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Add step
        </button>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-4">
        {steps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            No steps yet. Add the first step to get started.
          </div>
        ) : (
          steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Step {step.order_by}
                  </div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {step.description || "Untitled step"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Type: {stepTypeMap.get(step.humor_flavor_step_type_id ?? -1) ?? "—"}
                    <span className="px-2">•</span>
                    Model: {modelMap.get(step.llm_model_id ?? -1) ?? "—"}
                    <span className="px-2">•</span>
                    Temp: {step.temperature ?? "—"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Input: {inputTypeMap.get(step.llm_input_type_id ?? -1) ?? "—"}
                    <span className="px-2">•</span>
                    Output: {outputTypeMap.get(step.llm_output_type_id ?? -1) ?? "—"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    {expandedId === step.id ? "Hide" : "View"} prompts
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(step)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(step)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:border-red-300 hover:text-red-700"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(step, "up")}
                    disabled={index === 0}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorder(step, "down")}
                    disabled={index === steps.length - 1}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Move down
                  </button>
                </div>
              </div>

              {expandedId === step.id ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      System prompt
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-zinc-700">
                      {formatPrompt(step.system_prompt)}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      User prompt
                    </div>
                    <pre className="whitespace-pre-wrap text-xs text-zinc-700">
                      {formatPrompt(step.user_prompt)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <FlavorStepFormModal
        open={isModalOpen}
        mode={editingStep ? "edit" : "create"}
        flavorId={flavor.id}
        nextOrder={nextOrder}
        initialStep={editingStep}
        stepTypes={stepTypes}
        models={models}
        inputTypes={inputTypes}
        outputTypes={outputTypes}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
