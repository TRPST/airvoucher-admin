import * as React from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AdminActions } from '@/actions';
import { getVoucherTypeNameFromFile } from '@/utils/voucherFileParser';

type UploadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  voucherTypeId?: string;
  voucherTypeName?: string;
};

export function VoucherUploadDialog({
  isOpen,
  onClose,
  onSuccess,
  voucherTypeId,
  voucherTypeName,
}: UploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);
  const [uploadMode, setUploadMode] = React.useState<'merge' | 'replace' | null>(null);
  const [fileValidationError, setFileValidationError] = React.useState<string | null>(null);
  const [isRefreshingVouchers, setIsRefreshingVouchers] = React.useState(false);

  // Reset state when dialog is opened/closed
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setUploadResult(null);
      setIsUploading(false);
      setUploadMode(null);
      setFileValidationError(null);
    }
  }, [isOpen]);

  // Validate file type matches current voucher type
  const validateFileType = async (file: File): Promise<{ isValid: boolean; message?: string }> => {
    if (!voucherTypeName) {
      return { isValid: true }; // If no specific type required, allow all
    }

    try {
      const fileContent = await readFileAsText(file);
      const detectedType = getVoucherTypeNameFromFile(fileContent);

      if (!detectedType) {
        return {
          isValid: false,
          message: `Unknown file format. Expected ${voucherTypeName} format.`,
        };
      }

      // Case-insensitive comparison
      if (detectedType.toLowerCase() !== voucherTypeName.toLowerCase()) {
        return {
          isValid: false,
          message: `File contains ${detectedType} vouchers, but you can only upload ${voucherTypeName} vouchers on this page.`,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        message: 'Failed to read or validate file format.',
      };
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFileValidationError(null);

      // Validate file type if we have a specific voucher type
      if (voucherTypeName) {
        const validation = await validateFileType(selectedFile);
        if (!validation.isValid) {
          setFileValidationError(validation.message || 'Invalid file type');
          setFile(null);
          return;
        }
      }

      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  // Handle drag and drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFileValidationError(null);

      // Validate file type if we have a specific voucher type
      if (voucherTypeName) {
        const validation = await validateFileType(droppedFile);
        if (!validation.isValid) {
          setFileValidationError(validation.message || 'Invalid file type');
          setFile(null);
          return;
        }
      }

      setFile(droppedFile);
      setUploadResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Process file upload
  const handleUpload = async (mode: 'merge' | 'replace') => {
    if (!file) return;

    setIsUploading(true);
    setUploadMode(mode);
    setUploadResult(null);

    try {
      // Read file content
      const fileContent = await readFileAsText(file);

      // Send to server for processing with mode and voucher type ID
      const { data, error } = await AdminActions.processVoucherFile(
        fileContent,
        mode,
        voucherTypeId
      );

      if (error) {
        setUploadResult({
          success: false,
          message: `Error: ${error.message}`,
        });
        return;
      }

      if (!data) {
        setUploadResult({
          success: false,
          message: 'Unknown error occurred during upload',
        });
        return;
      }

      // Handle the new response format with newVouchers and duplicateVouchers
      if (data.newVouchers === 0 && data.duplicateVouchers > 0 && mode === 'merge') {
        // All vouchers were duplicates in merge mode
        setUploadResult({
          success: false,
          message: `No new vouchers to upload. All ${data.duplicateVouchers} vouchers already exist in the database.`,
        });
      } else if (data.errors.length > 0 && data.newVouchers === 0) {
        // Had errors and no valid vouchers
        setUploadResult({
          success: false,
          message: 'Upload failed: No valid vouchers found',
          details: data.errors,
        });
      } else if (data.errors.length > 0) {
        // Had errors but some valid vouchers
        let message = `Successfully uploaded ${data.newVouchers} ${data.voucherType} vouchers`;
        if (data.duplicateVouchers > 0 && mode === 'merge') {
          message += ` (${data.duplicateVouchers} duplicates skipped)`;
        }
        message += ` with ${data.errors.length} errors`;

        setUploadResult({
          success: true,
          message,
          details: data.errors,
        });

        // Call onSuccess and wait for vouchers to refresh
        setIsRefreshingVouchers(true);
        try {
          await onSuccess();
          // Auto-close dialog after successful refresh
          onClose();
        } catch (err) {
          console.error('Failed to refresh vouchers:', err);
          setIsRefreshingVouchers(false);
        }
      } else {
        // Success with no errors
        let message = `Successfully uploaded ${data.newVouchers} ${data.voucherType} vouchers`;
        if (data.duplicateVouchers > 0 && mode === 'merge') {
          message += ` (${data.duplicateVouchers} duplicates skipped)`;
        }
        if (mode === 'replace') {
          message = `Successfully replaced all ${data.voucherType} vouchers with ${data.newVouchers} new vouchers`;
        }

        setUploadResult({
          success: true,
          message,
        });

        // Call onSuccess and wait for vouchers to refresh
        setIsRefreshingVouchers(true);
        try {
          await onSuccess();
          // Auto-close dialog after successful refresh
          onClose();
        } catch (err) {
          console.error('Failed to refresh vouchers:', err);
          setIsRefreshingVouchers(false);
        }
      }
    } catch (err) {
      setUploadResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      });
    } finally {
      setIsUploading(false);
      setUploadMode(null);
    }
  };

  // Helper to read file content as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target?.result as string);
      reader.onerror = e => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // If dialog is not open, don't render anything
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Upload {voucherTypeName ? `${voucherTypeName} ` : ''}Vouchers
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            disabled={isUploading || isRefreshingVouchers}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* File Drop Area */}
          {!uploadResult && (
            <div
              className={`rounded-lg border-2 border-dashed border-border p-8 text-center ${
                !!file ? 'bg-muted/50' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>

              {file ? (
                <div className="mt-4">
                  <p className="font-medium">{file.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm font-medium">
                    Drag and drop {voucherTypeName ? `${voucherTypeName} ` : ''}voucher file here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {voucherTypeName
                      ? `Only ${voucherTypeName} format files are accepted`
                      : 'Supported formats: Ringa, Hollywoodbets, Easyload, Vodacom, Telkom, MTN, and CellC'}
                  </p>
                </>
              )}

              <label className="mt-4 inline-block cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Browse Files
                <input
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          )}

          {/* File Validation Error */}
          {fileValidationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Upload failed: No valid vouchers found
                  </p>
                  <p className="mt-1 text-sm text-destructive/80">{fileValidationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div
              className={`rounded-lg border p-4 ${
                uploadResult.success
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-destructive/30 bg-destructive/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {uploadResult.success ? (
                  isRefreshingVouchers ? (
                    <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-green-500" />
                  ) : (
                    <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                  )
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium">
                    {uploadResult.message}
                    {isRefreshingVouchers && uploadResult.success && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading vouchers...
                      </span>
                    )}
                  </p>

                  {uploadResult.details && uploadResult.details.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded bg-card p-2 text-xs">
                      <ul className="list-inside list-disc space-y-1">
                        {uploadResult.details.slice(0, 10).map((detail, i) => (
                          <li key={i}>{detail}</li>
                        ))}
                        {uploadResult.details.length > 10 && (
                          <li>...and {uploadResult.details.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 pt-4">
            {!uploadResult && file && !fileValidationError && (
              <>
                <button
                  onClick={() => handleUpload('merge')}
                  className={`w-full rounded-md px-4 py-2 text-sm font-medium shadow ${
                    isUploading && uploadMode !== 'merge'
                      ? 'cursor-not-allowed bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  disabled={isUploading}
                >
                  {isUploading && uploadMode === 'merge' ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    'Upload & Merge'
                  )}
                </button>

                {/* <button
                  onClick={() => handleUpload("replace")}
                  className={`w-full rounded-md px-4 py-2 text-sm font-medium shadow ${
                    isUploading && uploadMode !== "replace" 
                      ? "bg-muted text-muted-foreground cursor-not-allowed" 
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  }`}
                  disabled={isUploading}
                >
                  {isUploading && uploadMode === "replace" ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Uploading...
                    </div>
                  ) : (
                    "Upload & Replace All"
                  )}
                </button> */}
              </>
            )}

            {(uploadResult && !uploadResult.success) || fileValidationError ? (
              <button
                onClick={() => {
                  setUploadResult(null);
                  setFile(null);
                  setFileValidationError(null);
                }}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                Try Again
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="w-full rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              disabled={isUploading}
            >
              {uploadResult?.success ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
