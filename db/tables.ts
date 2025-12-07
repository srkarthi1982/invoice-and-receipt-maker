/**
 * Invoice & Receipt Maker - create branded invoices and receipts.
 *
 * Design goals:
 * - Core entities: Clients, Invoices, InvoiceItems, Receipts.
 * - Simple enough for small businesses, but future-proof for expansions.
 */

import { defineTable, column, NOW } from "astro:db";

export const Clients = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),                             // owner (business/user)
    displayName: column.text(),                        // client/company name
    contactPerson: column.text({ optional: true }),
    email: column.text({ optional: true }),
    phone: column.text({ optional: true }),
    billingAddress: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const Invoices = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    clientId: column.text({
      references: () => Clients.columns.id,
      optional: true,
    }),
    invoiceNumber: column.text(),                      // user-facing invoice ID
    issueDate: column.date({ optional: true }),
    dueDate: column.date({ optional: true }),
    currency: column.text({ optional: true }),         // "AED", "INR", "USD"
    subTotal: column.number({ optional: true }),
    taxAmount: column.number({ optional: true }),
    discountAmount: column.number({ optional: true }),
    totalAmount: column.number({ optional: true }),
    status: column.text({ optional: true }),           // "draft", "sent", "paid", "cancelled"
    notes: column.text({ optional: true }),
    terms: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const InvoiceItems = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    invoiceId: column.text({
      references: () => Invoices.columns.id,
    }),
    description: column.text(),
    quantity: column.number({ optional: true }),
    unitPrice: column.number({ optional: true }),
    lineTotal: column.number({ optional: true }),      // cached line amount
    createdAt: column.date({ default: NOW }),
  },
});

export const Receipts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    invoiceId: column.text({
      references: () => Invoices.columns.id,
      optional: true,                                  // standalone receipts allowed
    }),
    receiptNumber: column.text(),                      // user-facing receipt ID
    paymentDate: column.date({ optional: true }),
    amountPaid: column.number(),
    currency: column.text({ optional: true }),
    paymentMethod: column.text({ optional: true }),    // "cash", "card", "bank-transfer"
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const tables = {
  Clients,
  Invoices,
  InvoiceItems,
  Receipts,
} as const;
