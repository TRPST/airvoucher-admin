import * as React from 'react';
import { Printer, X } from 'lucide-react';

interface SaleReceiptDialogProps {
  receiptData: any;
  onClose: () => void;
  terminalName: string;
  retailerName: string;
  retailerId?: string;
}

export const SaleReceiptDialog: React.FC<SaleReceiptDialogProps> = ({
  receiptData,
  onClose,
  terminalName,
  retailerName,
  retailerId,
}) => {
  // Effect to prevent body scrolling when modal is open
  React.useEffect(() => {
    // Disable scrolling on body when modal is open
    document.body.style.overflow = 'hidden';

    // Cleanup function to ensure scrolling is re-enabled when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Format amount with Rand symbol
  const formatAmount = (amount: number) => {
    return `R ${amount.toFixed(2)}`;
  };

  // Format voucher code with spaces (xxxx xxxx xxxx xxxx)
  const formatVoucherCode = (code: string) => {
    if (!code) return '';
    return code.replace(/(.{4})(?=.)/g, '$1 ');
  };

  // Format date to receipt format (YYYY MM DD HH:mm:ss)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleString('en-ZA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      .replace(/\//g, ' ')
      .replace(',', '');
  };

  // Generate merchant ID (ARV + first 8 chars of retailer ID)
  const generateMerchantId = (retailerId: string) => {
    if (!retailerId) return 'ARV00000000';
    return `ARV${retailerId.substring(0, 8).toUpperCase()}`;
  };

  // Handle print button click
  const handlePrint = () => {
    // This will be implemented in the future
    console.log('Print functionality will be added in the future');
    window.print();
  };

  if (!receiptData) return null;

  const saleDate = receiptData.timestamp || receiptData.created_at || new Date().toISOString();
  const voucherAmount = receiptData.amount || 0;
  const pin = receiptData.voucher_code || receiptData.pin || '';
  const serialNumber = receiptData.serial_number || '';
  const refNumber =
    receiptData.ref_number ||
    (() => {
      const now = new Date();
      const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
      const timestamp = Math.floor(now.getTime() / 1000) % 100000000; // Last 8 digits
      const paddedTimestamp = timestamp.toString().padStart(8, '0');
      return `${dateStr}-${paddedTimestamp}`;
    })();
  const voucherType =
    receiptData.voucherType ||
    receiptData.product_name ||
    receiptData.voucher_type_name ||
    'Voucher';

  // New fields from voucher_types table
  const instructions = receiptData.instructions || '';
  const help = receiptData.help || '';
  const websiteUrl = receiptData.website_url || '';
  const merchantId = generateMerchantId(retailerId || receiptData.retailer_id || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 flex max-h-[90vh] w-full max-w-sm flex-col rounded-lg border border-border bg-card shadow-lg">
        {/* Receipt Content - Styled like a thermal printer receipt */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 text-center font-mono text-sm text-foreground">
            {/* Air Voucher Header */}
            <div className="text-lg font-bold">Air Voucher</div>

            {/* Retailer Name */}
            <div className="text-base font-semibold">{retailerName}</div>

            {/* Voucher Type */}
            <div className="text-base font-bold">{voucherType.toUpperCase()} VOUCHER</div>

            {/* Denomination */}
            <div className="text-base">
              {formatAmount(voucherAmount)} {voucherType}
            </div>

            {/* PIN - Most prominent */}
            <div className="my-6 rounded border-2 border-dashed border-border bg-muted p-4">
              <div className="break-all text-lg font-bold tracking-wider text-foreground">
                {formatVoucherCode(pin)}
              </div>
            </div>

            {/* Instructions */}
            {instructions && (
              <div className="text-left text-xs leading-relaxed text-muted-foreground">
                {instructions}
              </div>
            )}

            {/* Website */}
            {websiteUrl && <div className="text-xs text-muted-foreground">visit {websiteUrl}</div>}

            {/* Help Instructions */}
            {help && <div className="text-xs text-muted-foreground">{help}</div>}

            {/* Divider */}
            <div className="my-4 border-t border-border"></div>

            {/* Receipt Details */}
            <div className="space-y-1 text-left text-xs text-muted-foreground">
              {serialNumber && <div>Serial number: {serialNumber}</div>}
              <div>Merchant Id: {merchantId}</div>
              <div>Date: {formatDate(saleDate)}</div>
              <div>Ref: {refNumber}</div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="mt-6 rounded border border-yellow-200 bg-yellow-50 p-2 text-center text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            🛈 Please save this receipt. It will not be shown again after closing.
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-border bg-muted/50 p-4">
          <div className="flex w-full flex-col justify-end space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
