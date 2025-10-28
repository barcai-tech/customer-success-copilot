"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { deleteCustomerAction } from "@/app/dashboard/actions";
import { useCustomerStore } from "@/src/store/customer-store";

export function DeleteCustomerDialog() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { modals, closeDeleteDialog } = useCustomerStore();
  const { isOpen, customer } = modals.deleteDialog;

  const handleDelete = () => {
    if (!customer?.id) return;

    startTransition(async () => {
      await deleteCustomerAction(customer.id);
      closeDeleteDialog();
      router.refresh();
    });
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeDeleteDialog();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete customer</AlertDialogTitle>
          <AlertDialogDescription>
            {customer ? (
              <>
                This will remove{" "}
                <span className="font-medium">{customer.name}</span> and
                associated summaries. This action cannot be undone.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={closeDeleteDialog}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
