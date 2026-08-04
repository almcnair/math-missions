// ============================================================================
// /teacher — Client UI for the dashboard.
// ----------------------------------------------------------------------------
// Client component so we can use useTransition + useState for flash
// messages after server actions run. Data comes from the parent server
// component; mutations go through server actions imported from ./actions.
// ============================================================================

"use client";

import { useState, useTransition } from "react";
import {
  createStudentAction,
  resetPinAction,
  deleteStudentAction,
  type ActionResult,
} from "./actions";

type Student = {
  id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  coins: number;
  created_at: string;
};

type TeacherProps = {
  teacher: { id: string; displayName: string; email: string | null };
  students: Student[];
  listError: string | null;
};

type Flash = { kind: "success" | "error"; message: string; credentials?: ActionResult["createdStudent"] };

export function TeacherDashboardClient({ teacher, students, listError }: TeacherProps) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const res = await createStudentAction(formData);
      if (res.ok && res.createdStudent) {
        setFlash({
          kind: "success",
          message: `Created ${res.createdStudent.displayName} (${res.createdStudent.username}). Write the PIN down — it won't be shown again.`,
          credentials: res.createdStudent,
        });
      } else {
        setFlash({ kind: "error", message: res.message ?? "Something went wrong." });
      }
    });
  }

  function handleResetPin(studentId: string, pin: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("student_id", studentId);
      fd.set("pin", pin);
      const res = await resetPinAction(fd);
      if (res.ok && res.createdStudent) {
        setFlash({
          kind: "success",
          message: `New PIN set for ${res.createdStudent.displayName}. Write it down.`,
          credentials: res.createdStudent,
        });
      } else {
        setFlash({ kind: "error", message: res.message ?? "Could not reset PIN." });
      }
    });
  }

  function handleDelete(studentId: string, displayName: string) {
    if (!confirm(`Delete ${displayName}? This removes the account and all their data. Cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("student_id", studentId);
      const res = await deleteStudentAction(fd);
      if (res.ok) {
        setFlash({ kind: "success", message: `Deleted ${displayName}.` });
      } else {
        setFlash({ kind: "error", message: res.message ?? "Could not delete." });
      }
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Math Missions — Teacher</h1>
            <p className="text-sm text-zinc-600">
              Signed in as {teacher.displayName}
              {teacher.email ? ` (${teacher.email})` : ""}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Flash */}
        {flash && (
          <div
            className={`rounded-md border p-4 ${
              flash.kind === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 text-sm">
                <p>{flash.message}</p>
                {flash.credentials && (
                  <div className="rounded-md bg-white border border-zinc-200 p-3 font-mono text-sm text-zinc-900">
                    <div>username: <span className="font-semibold">{flash.credentials.username}</span></div>
                    <div>PIN: <span className="font-semibold">{flash.credentials.pin}</span></div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFlash(null)}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                dismiss
              </button>
            </div>
          </div>
        )}

        {listError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            Could not load students: {listError}
          </div>
        )}

        {/* Add student */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-medium text-zinc-900">Add a student</h2>
          <p className="text-sm text-zinc-600">
            Pick a username and a 6-digit PIN. Give them to the student on
            paper — the PIN is only shown here once.
          </p>
          <form
            action={handleCreate}
            className="grid gap-4 sm:grid-cols-3"
          >
            <label className="text-sm font-medium text-zinc-700 sm:col-span-1">
              Username
              <input
                name="username"
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="anna.b"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-zinc-500">
                lowercase, 3–32 chars, letters/digits/._-
              </span>
            </label>

            <label className="text-sm font-medium text-zinc-700 sm:col-span-1">
              Display name
              <input
                name="display_name"
                required
                maxLength={80}
                placeholder="Anna B."
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-zinc-500">shown in the app</span>
            </label>

            <label className="text-sm font-medium text-zinc-700 sm:col-span-1">
              PIN
              <input
                name="pin"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <span className="mt-1 block text-xs text-zinc-500">exactly 6 digits</span>
            </label>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending ? "Working…" : "Create student"}
              </button>
            </div>
          </form>
        </section>

        {/* Roster */}
        <section className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b border-zinc-200 p-4">
            <h2 className="text-lg font-medium text-zinc-900">
              Roster ({students.length})
            </h2>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No students yet. Add one above.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {students.map((s) => (
                <StudentRow
                  key={s.id}
                  student={s}
                  disabled={pending}
                  onResetPin={handleResetPin}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function StudentRow({
  student,
  disabled,
  onResetPin,
  onDelete,
}: {
  student: Student;
  disabled: boolean;
  onResetPin: (id: string, pin: string) => void;
  onDelete: (id: string, displayName: string) => void;
}) {
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState("");

  return (
    <li className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-900">{student.display_name}</div>
        <div className="text-sm text-zinc-500 font-mono">
          {student.username ?? "(no username)"}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showPinForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{6}$/.test(pin)) {
                onResetPin(student.id, pin);
                setPin("");
                setShowPinForm(false);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="new PIN"
              className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={disabled || !/^\d{6}$/.test(pin)}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPinForm(false);
                setPin("");
              }}
              className="text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowPinForm(true)}
              disabled={disabled}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              Reset PIN
            </button>
            <button
              type="button"
              onClick={() => onDelete(student.id, student.display_name)}
              disabled={disabled}
              className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
