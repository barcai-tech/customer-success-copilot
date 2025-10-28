import { create } from "zustand";

export type CustomerRow = {
  id: string;
  name: string;
  trend?: string | null;
  openTickets?: number | null;
  renewalDate?: string | null;
};

export type CustomerDetails = {
  company?: {
    id: string;
    name: string;
  };
  contract?: {
    renewalDate?: string;
    arr?: number;
  };
  tickets?: {
    recentTickets?: Array<{
      id: string;
      severity: string;
    }>;
  };
  usage?: {
    sparkline?: number[];
  };
};

export type ModalState = {
  deleteDialog: {
    isOpen: boolean;
    customer: CustomerRow | null;
  };
  formDialog: {
    isOpen: boolean;
    mode: "add" | "edit";
    customer: CustomerRow | null;
    details: CustomerDetails | null;
  };
};

interface CustomerStoreState {
  // Data
  rows: CustomerRow[];

  // Modal state
  modals: ModalState;

  // Pending operations
  isPending: boolean;

  // Actions
  setRows: (rows: CustomerRow[]) => void;

  // Delete dialog actions
  openDeleteDialog: (customer: CustomerRow) => void;
  closeDeleteDialog: () => void;

  // Form dialog actions
  openAddDialog: () => void;
  openEditDialog: (customer: CustomerRow, details: CustomerDetails) => void;
  closeFormDialog: () => void;

  // Pending state
  setPending: (pending: boolean) => void;
}

export const useCustomerStore = create<CustomerStoreState>((set) => ({
  // Initial state
  rows: [],
  modals: {
    deleteDialog: {
      isOpen: false,
      customer: null,
    },
    formDialog: {
      isOpen: false,
      mode: "add",
      customer: null,
      details: null,
    },
  },
  isPending: false,

  // Actions
  setRows: (rows) => set({ rows }),

  // Delete dialog
  openDeleteDialog: (customer) =>
    set((state) => ({
      modals: {
        ...state.modals,
        deleteDialog: {
          isOpen: true,
          customer,
        },
      },
    })),
  closeDeleteDialog: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        deleteDialog: {
          isOpen: false,
          customer: null,
        },
      },
    })),

  // Form dialog
  openAddDialog: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        formDialog: {
          isOpen: true,
          mode: "add",
          customer: null,
          details: null,
        },
      },
    })),
  openEditDialog: (customer, details) =>
    set((state) => ({
      modals: {
        ...state.modals,
        formDialog: {
          isOpen: true,
          mode: "edit",
          customer,
          details,
        },
      },
    })),
  closeFormDialog: () =>
    set((state) => ({
      modals: {
        ...state.modals,
        formDialog: {
          isOpen: false,
          mode: "add",
          customer: null,
          details: null,
        },
      },
    })),

  // Pending
  setPending: (pending) => set({ isPending: pending }),
}));
