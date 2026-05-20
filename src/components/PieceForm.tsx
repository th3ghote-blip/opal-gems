"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface EnumOption {
  value: string;
}

export interface PieceFormInitial {
  id?: string;
  sku?: string;
  type?: string;
  metal?: string | null;
  karat?: string | null;
  main_stone?: string | null;
  stone_cut?: string | null;
  clarity?: string | null;
  color_grade?: string | null;
  ctw?: number | null;
  gram_weight?: number | null;
  length_in?: number | null;
  width_mm?: number | null;
  ring_size?: number | null;
  description?: string | null;
  cost?: number | null;       // only when isOwner
  original_price?: number;
  sale_price?: number;
  current_shop_id?: string | null;
  status?: string;
  tags?: string[];
  existing_photos?: { id: string; url: string; storage_path: string }[];
}

interface Props {
  initial?: PieceFormInitial;
  shops: { id: string; name: string }[];
  enums: Record<string, EnumOption[]>;
  isOwner: boolean;
  mode: "new" | "edit";
}

export function PieceForm({ initial = {}, shops, enums, isOwner, mode }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [existingPhotos, setExistingPhotos] = useState(initial.existing_photos ?? []);

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();

    // Upload new photos first (RLS allows authenticated insert into piece-photos bucket).
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("piece-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`Photo upload failed: ${upErr.message}`);
        return;
      }
      uploadedPaths.push(path);
    }

    const body = {
      id: initial.id,
      sku: String(fd.get("sku") ?? "").trim(),
      type: String(fd.get("type") ?? "").trim(),
      metal: nullable(fd.get("metal")),
      karat: nullable(fd.get("karat")),
      main_stone: nullable(fd.get("main_stone")),
      stone_cut: nullable(fd.get("stone_cut")),
      clarity: nullable(fd.get("clarity")),
      color_grade: nullable(fd.get("color_grade")),
      ctw: numOrNull(fd.get("ctw")),
      gram_weight: numOrNull(fd.get("gram_weight")),
      length_in: numOrNull(fd.get("length_in")),
      width_mm: numOrNull(fd.get("width_mm")),
      ring_size: numOrNull(fd.get("ring_size")),
      description: nullable(fd.get("description")),
      original_price: numOrNull(fd.get("original_price")),
      sale_price: numOrNull(fd.get("sale_price")),
      cost: isOwner ? numOrNull(fd.get("cost")) : undefined,
      current_shop_id: nullable(fd.get("current_shop_id")),
      status: String(fd.get("status") ?? "in_stock"),
      tags,
      new_photo_paths: uploadedPaths,
      kept_photo_ids: existingPhotos.map((p) => p.id),
    };

    start(async () => {
      const res = await fetch(mode === "new" ? "/api/pieces" : `/api/pieces/${initial.id}`, {
        method: mode === "new" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push(`/pieces/${json.id ?? initial.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <Section title="Identification">
        <Field label="SKU" required>
          <input
            name="sku"
            defaultValue={initial.sku ?? ""}
            required
            autoComplete="off"
            className={inputCls}
            placeholder="DM-342666"
          />
        </Field>
        <Field label="Type" required>
          <Select name="type" required defaultValue={initial.type ?? ""} options={enums.type} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={initial.status ?? "in_stock"} className={inputCls}>
            <option value="in_stock">In stock</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="in_transit">In transit</option>
            <option value="written_off">Written off</option>
          </select>
        </Field>
        <Field label="Shop">
          <select name="current_shop_id" defaultValue={initial.current_shop_id ?? ""} className={inputCls}>
            <option value="">— Select shop —</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Attributes">
        <Field label="Metal">     <Select name="metal"       defaultValue={initial.metal ?? ""}       options={enums.metal} /></Field>
        <Field label="Karat">     <Select name="karat"       defaultValue={initial.karat ?? ""}       options={enums.karat} /></Field>
        <Field label="Main stone"><Select name="main_stone"  defaultValue={initial.main_stone ?? ""}  options={enums.main_stone} /></Field>
        <Field label="Cut">       <Select name="stone_cut"   defaultValue={initial.stone_cut ?? ""}   options={enums.stone_cut} /></Field>
        <Field label="Clarity">   <Select name="clarity"     defaultValue={initial.clarity ?? ""}     options={enums.clarity} /></Field>
        <Field label="Color">     <Select name="color_grade" defaultValue={initial.color_grade ?? ""} options={enums.color_grade} /></Field>
      </Section>

      <Section title="Measurements">
        <Field label="CTW (carat total weight)"><input type="number" step="0.01" name="ctw"          defaultValue={initial.ctw ?? ""} className={inputCls} /></Field>
        <Field label="Weight (g)">              <input type="number" step="0.01" name="gram_weight"  defaultValue={initial.gram_weight ?? ""} className={inputCls} /></Field>
        <Field label="Length (in)">             <input type="number" step="0.01" name="length_in"    defaultValue={initial.length_in ?? ""} className={inputCls} /></Field>
        <Field label="Width (mm)">              <input type="number" step="0.01" name="width_mm"     defaultValue={initial.width_mm ?? ""} className={inputCls} /></Field>
        <Field label="Ring size">               <input type="number" step="0.25" name="ring_size"    defaultValue={initial.ring_size ?? ""} className={inputCls} /></Field>
      </Section>

      <Section title="Pricing">
        <Field label="Original price ($)" required>
          <input type="number" step="0.01" name="original_price" defaultValue={initial.original_price ?? ""} required className={inputCls} />
        </Field>
        <Field label="Sale price ($)" required>
          <input type="number" step="0.01" name="sale_price" defaultValue={initial.sale_price ?? ""} required className={inputCls} />
        </Field>
        {isOwner && (
          <Field label="Cost ($) — owner only">
            <input type="number" step="0.01" name="cost" defaultValue={initial.cost ?? ""} className={inputCls} />
          </Field>
        )}
      </Section>

      <Section title="Description">
        <Field label="Public description (visible to staff & in detail view)">
          <textarea name="description" defaultValue={initial.description ?? ""} rows={3} className={inputCls + " resize-none"} />
        </Field>
        <Field label="Tags">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-neutral-500 hover:text-red-600">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="bridal, anniversary, …"
              className={inputCls}
            />
            <button type="button" onClick={addTag} className="px-3 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">Add</button>
          </div>
        </Field>
      </Section>

      <Section title="Photos">
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {existingPhotos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <Image src={p.url} alt="" fill sizes="120px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingPhotos(existingPhotos.filter((x) => x.id !== p.id))}
                  className="absolute top-1 right-1 bg-black/70 text-white text-xs w-5 h-5 grid place-items-center rounded-full"
                  aria-label="Remove photo"
                >×</button>
              </div>
            ))}
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-900 dark:file:text-neutral-100"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-neutral-500">{files.length} new file{files.length === 1 ? "" : "s"} selected</p>
        )}
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-md bg-gold-600 hover:bg-gold-700 dark:bg-gold-500 dark:hover:bg-gold-600 text-white dark:text-neutral-950 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : mode === "new" ? "Create piece" : "Save changes"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs uppercase tracking-wide text-neutral-500">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Select({ name, defaultValue, required, options }: { name: string; defaultValue?: string; required?: boolean; options: EnumOption[] }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} required={required} className={inputCls}>
      <option value="">—</option>
      {(options ?? []).map((o) => (
        <option key={o.value} value={o.value}>{o.value}</option>
      ))}
    </select>
  );
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
