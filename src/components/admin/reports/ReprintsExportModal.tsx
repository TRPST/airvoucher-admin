import { X, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';
import type { SalesReport } from '@/actions';

interface ReprintsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SalesReport[];
  startDate?: string;
  endDate?: string;
}

export function ReprintsExportModal({
  isOpen,
  onClose,
  sales,
  startDate,
  endDate,
}: ReprintsExportModalProps) {
  // Generate filename based on date range
  const getFilename = (extension: string) => {
    if (startDate && endDate) {
      return `arv-reprints-report-${startDate}-to-${endDate}.${extension}`;
    } else if (startDate) {
      return `arv-reprints-report-from-${startDate}.${extension}`;
    } else if (endDate) {
      return `arv-reprints-report-until-${endDate}.${extension}`;
    } else {
      return `arv-reprints-report-all-time.${extension}`;
    }
  };

  // Calculate totals
  const totals = sales.reduce(
    (acc, sale) => {
      return {
        amount: acc.amount + sale.amount,
      };
    },
    {
      amount: 0,
    }
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Retailer',
      'Retailer ID',
      'Agent',
      'Commission Group',
      'Terminal ID',
      'Type',
      'Amount',
    ];

    const rows = sales.map(sale => {
      return [
        new Date(sale.created_at).toLocaleString('en-ZA'),
        sale.retailer_name || 'Unknown',
        sale.retailer_short_code || '-',
        sale.agent_name || '-',
        sale.commission_group_name || '-',
        sale.terminal_short_code || '-',
        sale.voucher_type || 'Unknown',
        sale.amount.toFixed(2),
      ];
    });

    // Add totals row
    rows.push(['TOTAL', '', '', '', '', '', '', totals.amount.toFixed(2)]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('csv');
    link.click();
    onClose();
  };

  // Export to Excel (using xlsx library)
  const exportToExcel = async () => {
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');

      const data = sales.map(sale => {
        return {
          Date: new Date(sale.created_at).toLocaleString('en-ZA'),
          Retailer: sale.retailer_name || 'Unknown',
          'Retailer ID': sale.retailer_short_code || '-',
          Agent: sale.agent_name || '-',
          'Commission Group': sale.commission_group_name || '-',
          'Terminal ID': sale.terminal_short_code || '-',
          Type: sale.voucher_type || 'Unknown',
          Amount: parseFloat(sale.amount.toFixed(2)),
        };
      });

      // Add totals row
      data.push({
        Date: 'TOTAL',
        Retailer: '',
        'Retailer ID': '',
        Agent: '',
        'Commission Group': '',
        'Terminal ID': '',
        Type: '',
        Amount: parseFloat(totals.amount.toFixed(2)),
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reprints Report');

      // Write file
      XLSX.writeFile(workbook, getFilename('xlsx'));
      onClose();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try CSV instead.');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-amber-600" />
              <Dialog.Title className="text-lg font-semibold">Export Reprints Report</Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a format to export {sales.length} reprint record{sales.length !== 1 ? 's' : ''}
              :
            </p>

            <div className="space-y-2">
              {/* Excel Export */}
              <button
                onClick={exportToExcel}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 transition-colors group-hover:bg-green-500/20">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Excel (.xlsx)</p>
                  <p className="text-xs text-muted-foreground">Spreadsheet with formatting</p>
                </div>
              </button>

              {/* CSV Export */}
              <button
                onClick={exportToCSV}
                className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">CSV (.csv)</p>
                  <p className="text-xs text-muted-foreground">
                    Compatible with all spreadsheet apps
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Dialog.Close asChild>
              <button className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
