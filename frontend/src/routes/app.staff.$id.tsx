import { createFileRoute, useParams } from "@tanstack/react-router";
import { StaffFormComponent } from "./app.staff.new";

export const Route = createFileRoute("/app/staff/$id")({
  head: () => ({ meta: [{ title: "Edit staff — PropertyWala" }] }),
  component: EditStaff,
});

function EditStaff() {
  const { id } = useParams({ from: "/app/staff/$id" });
  return <StaffFormComponent mode="edit" userId={id} />;
}
