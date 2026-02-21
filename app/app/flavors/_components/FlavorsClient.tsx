"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import FlavorFormModal, { Flavor } from "./FlavorFormModal";

type FlavorsClientProps = {
  flavors: Flavor[];
  loadError: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FlavorsClient({ flavors, loadError }: FlavorsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<Flavor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingFlavor(null);
    setIsModalOpen(true);
  };

  const openEdit = (flavor: Flavor) => {
    setEditingFlavor(flavor);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingFlavor(null);
  };

  const handleSuccess = () => {
    setActionError(null);
    router.refresh();
  };

  const handleDelete = async (flavor: Flavor) => {
    const confirmed = window.confirm(
      `Delete flavor "${flavor.slug}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("humor_flavors")
      .delete()
      .eq("id", flavor.id);

    if (error) {
      if (error.message.toLowerCase().includes("foreign key")) {
        setActionError(
          "This flavor cannot be deleted because it is referenced by steps.",
        );
      } else {
        setActionError(error.message);
      }
      return;
    }

    router.refresh();
  };

  const rows = useMemo(() => flavors ?? [], [flavors]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Humor Flavors</h1>
          <p className="text-sm text-zinc-500">
            Manage the flavor taxonomy used across humor steps.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          New Flavor
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 bg-zinc-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <div className="col-span-3">Slug</div>
          <div className="col-span-6">Description</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              No flavors yet.
            </div>
          ) : (
            rows.map((flavor) => (
              <div
                key={flavor.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 text-sm text-zinc-700"
              >
                <div className="col-span-3">
                  <Link
                    href={`/app/flavors/${flavor.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {flavor.slug}
                  </Link>
                </div>
                <div className="col-span-6 text-zinc-600">
                  {flavor.description || "—"}
                </div>
                <div className="col-span-2 text-zinc-500">
                  {formatDate(flavor.created_datetime_utc)}
                </div>
                <div className="col-span-1 flex justify-end gap-2 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(flavor)}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(flavor)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <FlavorFormModal
        open={isModalOpen}
        mode={editingFlavor ? "edit" : "create"}
        initialFlavor={editingFlavor}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
