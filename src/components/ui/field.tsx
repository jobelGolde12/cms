import { cloneElement, isValidElement, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border border-brand-300 bg-white px-3 text-brand-950 placeholder:text-brand-400 transition-colors focus:border-action-600 disabled:bg-brand-100 disabled:text-[#64748B]";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-brand-800", className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "h-11", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, "min-h-[88px] py-2", className)} {...props} />
  );
}

/** Stable description id for a field's hint / error text. */
const hintId = (htmlFor: string) => `${htmlFor}-hint`;
const errorId = (htmlFor: string) => `${htmlFor}-error`;

export function FieldHint({ id, children }: { id: string; children?: string | undefined }) {
  if (!children) return null;
  return (
    <p id={id} className="text-xs text-[#64748B]">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  // Link the control to its error/hint text: aria-invalid flags the failing
  // control; aria-describedby points at the actual message for screen readers.
  const describedBy = error ? errorId(htmlFor) : hint ? hintId(htmlFor) : undefined;
  const control = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>,
        {
          "aria-invalid": error ? (true as const) : undefined,
          "aria-describedby": describedBy,
        },
      )
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-red-700">
            *
          </span>
        ) : null}
      </Label>
      {control}
      <FieldHint id={hintId(htmlFor)}>{hint}</FieldHint>
      <FieldError id={errorId(htmlFor)} message={error} />
    </div>
  );
}
