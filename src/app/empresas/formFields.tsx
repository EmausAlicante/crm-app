export const COMPANY_FORM_ID = "company-form";

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        form={COMPANY_FORM_ID}
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <textarea
        form={COMPANY_FORM_ID}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input form={COMPANY_FORM_ID} type="checkbox" name={name} defaultChecked={defaultChecked ?? false} />
      {label}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
      <h2 className="font-medium text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
