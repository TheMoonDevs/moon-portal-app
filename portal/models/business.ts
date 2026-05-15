import { createCrudSchemas, type BaseModel, type DateValue, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import { type ENGAGEMENTTYPE, type PayType } from './shared/enums';

export type Engagement = Loose<
  BaseModel & {
    client_id: string;
    developer_ids: string[];
    title: string;
    startDate?: OptionalNullable<DateValue>;
    endDate?: OptionalNullable<DateValue>;
    isActive: boolean;
    engagementType: ENGAGEMENTTYPE;
    numberOfHours: Nullable<number>;
    progressPercentage: Nullable<number>;
  }
>;

export type Invoice = Loose<
  BaseModel & {
    updatedAt: DateValue;
    startDate: DateValue;
    endDate: DateValue;
    dueDate: DateValue;
    title: string;
    description?: Nullable<string>;
    clientId: string;
    devIds: string[];
    amountTotal: number;
    amountToPay: number;
    amountDiscount: number;
    isInvoicePaid: boolean;
    paidDate?: OptionalNullable<DateValue>;
    payType: PayType;
    invoicePdf?: OptionalNullable<string>;
    workInfo?: OptionalNullable<Record<string, unknown>>;
  }
>;

export const engagementSchemas = createCrudSchemas<Engagement>();
export const invoiceSchemas = createCrudSchemas<Invoice>();
