import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { createAdmin } from '@/actions/admin/adminActions';
import { PermissionKey, ALL_PERMISSIONS, PERMISSION_LABELS } from '@/actions/types/adminTypes';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminAdded: () => void;
}

export function AddAdminModal({ isOpen, onClose, onAdminAdded }: AddAdminModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    is_super_admin: false,
    autoGeneratePassword: false,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<PermissionKey>>(new Set());

  // Generate a random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handler for input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));

      // If auto-generate is checked, generate a random password
      if (name === 'autoGeneratePassword' && checked) {
        const generatedPassword = generateRandomPassword();
        setFormData(prev => ({ ...prev, password: generatedPassword }));
      }

      // If super admin is checked, clear permissions
      if (name === 'is_super_admin' && checked) {
        setSelectedPermissions(new Set());
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler for re-generating password
  const handleRegeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  // Toggle all permissions
  const handleToggleAll = () => {
    if (selectedPermissions.size === ALL_PERMISSIONS.length) {
      setSelectedPermissions(new Set());
    } else {
      setSelectedPermissions(new Set(ALL_PERMISSIONS));
    }
  };

  // Toggle individual permission
  const handleTogglePermission = (permission: PermissionKey) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
  };

  // Validate form
  const validateForm = (): { isValid: boolean; error?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    if (formData.password.length < 6) {
      return {
        isValid: false,
        error: 'Password must be at least 6 characters long',
      };
    }

    if (!formData.full_name.trim()) {
      return {
        isValid: false,
        error: 'Please enter a full name',
      };
    }

    return { isValid: true };
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid form submission');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const { data, error } = await createAdmin({
        profileData: {
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || undefined,
        },
        password: formData.password,
        is_super_admin: formData.is_super_admin,
        permissions: formData.is_super_admin ? [] : Array.from(selectedPermissions),
      });

      if (error) {
        setFormError(`Failed to create admin: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (data) {
        // Reset form
        setFormData({
          full_name: '',
          email: '',
          phone: '',
          password: '',
          is_super_admin: false,
          autoGeneratePassword: false,
        });
        setSelectedPermissions(new Set());

        onAdminAdded();
        onClose();
      }
    } catch (err) {
      setFormError(`Error creating admin: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Add New Admin</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-2 space-y-6">
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {formError}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Phone number"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Password</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoGeneratePassword"
                        name="autoGeneratePassword"
                        checked={formData.autoGeneratePassword}
                        onChange={handleInputChange}
                        className="mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor="autoGeneratePassword"
                        className="text-sm text-muted-foreground"
                      >
                        Auto-generate password
                      </label>
                    </div>
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={formData.autoGeneratePassword}
                      className="w-full rounded-md rounded-r-none border border-input bg-background px-3 py-2 text-sm"
                      placeholder={
                        formData.autoGeneratePassword ? 'Auto-generated password' : 'Set password'
                      }
                      required
                    />
                    {formData.autoGeneratePassword && (
                      <button
                        type="button"
                        onClick={handleRegeneratePassword}
                        className="flex items-center justify-center rounded-md rounded-l-none border border-l-0 border-input bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/90"
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_super_admin"
                      name="is_super_admin"
                      checked={formData.is_super_admin}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor="is_super_admin"
                      className="flex items-center text-sm font-medium"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                      Super Admin (has all permissions)
                    </label>
                  </div>

                  {!formData.is_super_admin && (
                    <div className="space-y-2 rounded-md border border-border p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Permissions</label>
                        <button
                          type="button"
                          onClick={handleToggleAll}
                          className="text-xs text-primary hover:text-primary/80"
                        >
                          {selectedPermissions.size === ALL_PERMISSIONS.length
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      </div>
                      <div className="max-h-48 space-y-1.5 overflow-y-auto">
                        {ALL_PERMISSIONS.map(permission => (
                          <label
                            key={permission}
                            className="flex items-center space-x-2 rounded px-2 py-1.5 hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission)}
                              onChange={() => handleTogglePermission(permission)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm">{PERMISSION_LABELS[permission]}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedPermissions.size} of {ALL_PERMISSIONS.length} permissions
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Add Admin'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
