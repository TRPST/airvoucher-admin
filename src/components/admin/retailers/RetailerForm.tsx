import * as React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { Agent, CommissionGroup } from '@/actions';

interface RetailerFormProps {
  formData: {
    businessName: string;
    contactName: string;
    secondaryContactName: string;
    email: string;
    location: string;
    agentId: string;
    commissionGroupId: string;
    initialBalance: string;
    creditLimit: string;
    password: string;
    autoGeneratePassword: boolean;
  };
  agents: Agent[];
  commissionGroups: CommissionGroup[];
  formError: string | null;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onRegeneratePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RetailerForm({
  formData,
  agents,
  commissionGroups,
  formError,
  isSubmitting,
  onInputChange,
  onRegeneratePassword,
  onSubmit,
}: RetailerFormProps) {
  return (
    <form onSubmit={onSubmit}>
      {formError && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            {formError}
          </div>
        </div>
      )}
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Retailer Name</label>
        <input
          type="text"
          name="businessName"
          value={formData.businessName}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Enter retailer name"
          required
        />
      </div>
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Contact Person</label>
        <input
          type="text"
          name="contactName"
          value={formData.contactName}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Contact person name"
          required
        />
      </div>
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Second Contact Person</label>
        <input
          type="text"
          name="secondaryContactName"
          value={formData.secondaryContactName}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Optional secondary contact"
        />
      </div>
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Contact email"
          required
        />
      </div>
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Business location"
        />
      </div>
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Password</label>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoGeneratePassword"
              name="autoGeneratePassword"
              checked={formData.autoGeneratePassword}
              onChange={onInputChange}
              className="mr-2 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="autoGeneratePassword" className="text-sm text-muted-foreground">
              Auto-generate password
            </label>
          </div>
        </div>
        <div className="flex">
          <input
            type="text"
            name="password"
            value={formData.password}
            onChange={onInputChange}
            disabled={formData.autoGeneratePassword}
            className="w-full rounded-md rounded-r-none border border-input bg-background px-3 py-2 text-sm"
            placeholder={formData.autoGeneratePassword ? 'Auto-generated password' : 'Set password'}
            required
          />
          {formData.autoGeneratePassword && (
            <button
              type="button"
              onClick={onRegeneratePassword}
              className="flex items-center justify-center rounded-md rounded-l-none border border-l-0 border-input bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/90"
            >
              Regenerate
            </button>
          )}
        </div>
        {formData.autoGeneratePassword && (
          <p className="text-xs text-muted-foreground">
            This password will be used for the retailer's login account.
          </p>
        )}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Agent</label>
          <select
            name="agentId"
            value={formData.agentId}
            onChange={onInputChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select Agent</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Commission Group</label>
          <select
            name="commissionGroupId"
            value={formData.commissionGroupId}
            onChange={onInputChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select Group</option>
            {commissionGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Initial Available Balance</label>
        <input
          type="number"
          name="initialBalance"
          value={formData.initialBalance}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="0.00"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="mb-6 space-y-2">
        <label className="text-sm font-medium">Credit Limit</label>
        <input
          type="number"
          name="creditLimit"
          value={formData.creditLimit}
          onChange={onInputChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="0.00"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Add Retailer'
          )}
        </button>
      </div>
    </form>
  );
}
