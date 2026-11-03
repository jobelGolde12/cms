"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "./modal";
import { EmployeeForm } from "./employee-form";
import type { SectionOption } from "@/components/sections/section-dialog";

export function AddEmployeeModal({ sectionOptions = [] }: { sectionOptions?: SectionOption[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Employee
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Employee Record"
        description="The employee number is generated automatically unless you type one."
        wide
      >
        <EmployeeForm
          mode="create"
          sectionOptions={sectionOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}

export function EditEmployeeModal({
  employee,
  sectionOptions = [],
}: {
  employee: Parameters<typeof EmployeeForm>[0]["employee"];
  sectionOptions?: SectionOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-900 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-800"
      >
        Edit Record
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit — ${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`}
        wide
      >
        <EmployeeForm
          key={employee?.id}
          employee={employee}
          mode="edit"
          sectionOptions={sectionOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </Modal>
    </>
  );
}
