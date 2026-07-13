import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui";
import { TaskForm } from "@/components/task-form";
export default function NewTaskPage() {
  return (
    <AppShell active="/app/tasks">
      <PageHeader
        eyebrow="Aktionscenter"
        title="Aufgabe anlegen"
        description="Eine eigene Frist oder einen Arbeitsauftrag erfassen."
      />
      <TaskForm />
    </AppShell>
  );
}
