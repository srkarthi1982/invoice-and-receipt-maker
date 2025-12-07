import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import {
  db,
  eq,
  and,
  Clients,
  Invoices,
  InvoiceItems,
  Receipts,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createClient: defineAction({
    input: z.object({
      id: z.string().optional(),
      displayName: z.string().min(1, "Client name is required"),
      contactPerson: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      billingAddress: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [client] = await db
        .insert(Clients)
        .values({
          id: input.id ?? crypto.randomUUID(),
          userId: user.id,
          displayName: input.displayName,
          contactPerson: input.contactPerson,
          email: input.email,
          phone: input.phone,
          billingAddress: input.billingAddress,
          notes: input.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { client };
    },
  }),

  updateClient: defineAction({
    input: z.object({
      id: z.string(),
      displayName: z.string().min(1).optional(),
      contactPerson: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      billingAddress: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(Clients)
        .where(and(eq(Clients.id, id), eq(Clients.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Client not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { client: existing };
      }

      const [client] = await db
        .update(Clients)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(Clients.id, id), eq(Clients.userId, user.id)))
        .returning();

      return { client };
    },
  }),

  listClients: defineAction({
    input: z.object({}).optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const clients = await db.select().from(Clients).where(eq(Clients.userId, user.id));

      return { clients };
    },
  }),

  deleteClient: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [deleted] = await db
        .delete(Clients)
        .where(and(eq(Clients.id, input.id), eq(Clients.userId, user.id)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Client not found.",
        });
      }

      return { client: deleted };
    },
  }),

  createInvoice: defineAction({
    input: z.object({
      id: z.string().optional(),
      clientId: z.string().optional(),
      invoiceNumber: z.string().min(1, "Invoice number is required"),
      issueDate: z.coerce.date().optional(),
      dueDate: z.coerce.date().optional(),
      currency: z.string().optional(),
      subTotal: z.number().optional(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      totalAmount: z.number().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.clientId) {
        const [client] = await db
          .select()
          .from(Clients)
          .where(and(eq(Clients.id, input.clientId), eq(Clients.userId, user.id)))
          .limit(1);

        if (!client) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Client not found.",
          });
        }
      }

      const [invoice] = await db
        .insert(Invoices)
        .values({
          id: input.id ?? crypto.randomUUID(),
          userId: user.id,
          clientId: input.clientId,
          invoiceNumber: input.invoiceNumber,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency: input.currency,
          subTotal: input.subTotal,
          taxAmount: input.taxAmount,
          discountAmount: input.discountAmount,
          totalAmount: input.totalAmount,
          status: input.status,
          notes: input.notes,
          terms: input.terms,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { invoice };
    },
  }),

  updateInvoice: defineAction({
    input: z.object({
      id: z.string(),
      clientId: z.string().optional(),
      invoiceNumber: z.string().optional(),
      issueDate: z.coerce.date().optional(),
      dueDate: z.coerce.date().optional(),
      currency: z.string().optional(),
      subTotal: z.number().optional(),
      taxAmount: z.number().optional(),
      discountAmount: z.number().optional(),
      totalAmount: z.number().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, clientId, ...rest } = input;

      const [existing] = await db
        .select()
        .from(Invoices)
        .where(and(eq(Invoices.id, id), eq(Invoices.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      if (typeof clientId !== "undefined") {
        if (clientId) {
          const [client] = await db
            .select()
            .from(Clients)
            .where(and(eq(Clients.id, clientId), eq(Clients.userId, user.id)))
            .limit(1);

          if (!client) {
            throw new ActionError({
              code: "NOT_FOUND",
              message: "Client not found.",
            });
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }
      if (typeof clientId !== "undefined") {
        updateData.clientId = clientId;
      }

      if (Object.keys(updateData).length === 0) {
        return { invoice: existing };
      }

      const [invoice] = await db
        .update(Invoices)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(Invoices.id, id), eq(Invoices.userId, user.id)))
        .returning();

      return { invoice };
    },
  }),

  listInvoices: defineAction({
    input: z.object({}).optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const invoices = await db.select().from(Invoices).where(eq(Invoices.userId, user.id));

      return { invoices };
    },
  }),

  deleteInvoice: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [deleted] = await db
        .delete(Invoices)
        .where(and(eq(Invoices.id, input.id), eq(Invoices.userId, user.id)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      return { invoice: deleted };
    },
  }),

  saveInvoiceItem: defineAction({
    input: z.object({
      id: z.string().optional(),
      invoiceId: z.string(),
      description: z.string().min(1, "Description is required"),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
      lineTotal: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [invoice] = await db
        .select()
        .from(Invoices)
        .where(and(eq(Invoices.id, input.invoiceId), eq(Invoices.userId, user.id)))
        .limit(1);

      if (!invoice) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      const baseValues = {
        invoiceId: input.invoiceId,
        description: input.description,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        lineTotal: input.lineTotal,
        createdAt: new Date(),
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(InvoiceItems)
          .where(eq(InvoiceItems.id, input.id))
          .limit(1);

        if (!existing || existing.invoiceId !== input.invoiceId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Invoice item not found.",
          });
        }

        const [item] = await db
          .update(InvoiceItems)
          .set(baseValues)
          .where(eq(InvoiceItems.id, input.id))
          .returning();

        return { item };
      }

      const [item] = await db.insert(InvoiceItems).values(baseValues).returning();
      return { item };
    },
  }),

  deleteInvoiceItem: defineAction({
    input: z.object({
      id: z.string(),
      invoiceId: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [invoice] = await db
        .select()
        .from(Invoices)
        .where(and(eq(Invoices.id, input.invoiceId), eq(Invoices.userId, user.id)))
        .limit(1);

      if (!invoice) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Invoice not found.",
        });
      }

      const [deleted] = await db
        .delete(InvoiceItems)
        .where(and(eq(InvoiceItems.id, input.id), eq(InvoiceItems.invoiceId, input.invoiceId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Invoice item not found.",
        });
      }

      return { item: deleted };
    },
  }),

  createReceipt: defineAction({
    input: z.object({
      id: z.string().optional(),
      invoiceId: z.string().optional(),
      receiptNumber: z.string().min(1, "Receipt number is required"),
      paymentDate: z.coerce.date().optional(),
      amountPaid: z.number(),
      currency: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.invoiceId) {
        const [invoice] = await db
          .select()
          .from(Invoices)
          .where(and(eq(Invoices.id, input.invoiceId), eq(Invoices.userId, user.id)))
          .limit(1);

        if (!invoice) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Invoice not found.",
          });
        }
      }

      const [receipt] = await db
        .insert(Receipts)
        .values({
          id: input.id ?? crypto.randomUUID(),
          userId: user.id,
          invoiceId: input.invoiceId,
          receiptNumber: input.receiptNumber,
          paymentDate: input.paymentDate,
          amountPaid: input.amountPaid,
          currency: input.currency,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { receipt };
    },
  }),

  updateReceipt: defineAction({
    input: z.object({
      id: z.string(),
      invoiceId: z.string().optional(),
      receiptNumber: z.string().optional(),
      paymentDate: z.coerce.date().optional(),
      amountPaid: z.number().optional(),
      currency: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, invoiceId, ...rest } = input;

      const [existing] = await db
        .select()
        .from(Receipts)
        .where(and(eq(Receipts.id, id), eq(Receipts.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Receipt not found.",
        });
      }

      if (typeof invoiceId !== "undefined") {
        if (invoiceId) {
          const [invoice] = await db
            .select()
            .from(Invoices)
            .where(and(eq(Invoices.id, invoiceId), eq(Invoices.userId, user.id)))
            .limit(1);

          if (!invoice) {
            throw new ActionError({
              code: "NOT_FOUND",
              message: "Invoice not found.",
            });
          }
        }
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }
      if (typeof invoiceId !== "undefined") {
        updateData.invoiceId = invoiceId;
      }

      if (Object.keys(updateData).length === 0) {
        return { receipt: existing };
      }

      const [receipt] = await db
        .update(Receipts)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(Receipts.id, id), eq(Receipts.userId, user.id)))
        .returning();

      return { receipt };
    },
  }),

  listReceipts: defineAction({
    input: z.object({}).optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const receipts = await db.select().from(Receipts).where(eq(Receipts.userId, user.id));

      return { receipts };
    },
  }),

  deleteReceipt: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [deleted] = await db
        .delete(Receipts)
        .where(and(eq(Receipts.id, input.id), eq(Receipts.userId, user.id)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Receipt not found.",
        });
      }

      return { receipt: deleted };
    },
  }),
};
