'use client';

import {
  Field,
  NativeSelect,
  Panel,
  PanelHeader,
  TextInput,
} from '../shared/AdminUI';
import type { UserSectionProps } from './types';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export const AdminUserPayData = ({ user, updateField }: UserSectionProps) => {
  const payData = (user?.payData || {}) as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          title="Payout method"
          description="Where payouts for this person are sent."
          icon="account_balance"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Pay method" htmlFor="payData.payMethod">
            <TextInput
              id="payData.payMethod"
              value={(payData.payMethod as string) ?? ''}
              onChange={updateField}
              placeholder="UPI, bank transfer, crypto…"
            />
          </Field>

          <Field label="UPI ID" htmlFor="payData.upiId">
            <TextInput
              id="payData.upiId"
              value={(payData.upiId as string) ?? ''}
              onChange={updateField}
              placeholder="name@bank"
            />
          </Field>

          <Field
            label="Wallet address"
            htmlFor="payData.walletAddress"
            className="sm:col-span-2"
          >
            <TextInput
              id="payData.walletAddress"
              value={(payData.walletAddress as string) ?? ''}
              onChange={updateField}
              placeholder="0x…"
              className="font-mono text-xs"
            />
          </Field>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Stipend"
          description="Recurring stipend paid to this person."
          icon="payments"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Stipend amount" htmlFor="payData.stipendAmount">
            <TextInput
              id="payData.stipendAmount"
              type="number"
              value={(payData.stipendAmount as string) ?? ''}
              onChange={updateField}
              placeholder="0"
            />
          </Field>

          <Field label="Stipend currency" htmlFor="payData.stipendCurrency">
            <NativeSelect
              id="payData.stipendCurrency"
              value={(payData.stipendCurrency as string) ?? 'INR'}
              onChange={updateField}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Stipend wallet address"
            htmlFor="payData.stipendWalletAddress"
            className="sm:col-span-2"
          >
            <TextInput
              id="payData.stipendWalletAddress"
              value={(payData.stipendWalletAddress as string) ?? ''}
              onChange={updateField}
              placeholder="0x…"
              className="font-mono text-xs"
            />
          </Field>
        </div>
      </Panel>
    </div>
  );
};
