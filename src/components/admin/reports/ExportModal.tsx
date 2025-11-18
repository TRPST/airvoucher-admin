import { X, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';
import type { SalesReport } from '@/actions';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SalesReport[];
  startDate?: string;
  endDate?: string;
}

export function ExportModal({ isOpen, onClose, sales, startDate, endDate }: ExportModalProps) {
  // Generate filename based on date range
  const getFilename = (extension: string) => {
    if (startDate && endDate) {
      return `arv-sales-report-${startDate}-to-${endDate}.${extension}`;
    } else if (startDate) {
      return `arv-sales-report-from-${startDate}.${extension}`;
    } else if (endDate) {
      return `arv-sales-report-until-${endDate}.${extension}`;
    } else {
      return `arv-sales-report-all-time.${extension}`;
    }
  };

  // Calculate totals
  const totals = sales.reduce(
    (acc, sale) => {
      const supplierCommissionAmount =
        sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
      const airVoucherProfit = sale.profit || 0;

      return {
        amount: acc.amount + sale.amount,
        supplierCommission: acc.supplierCommission + (supplierCommissionAmount || 0),
        retailerCommission: acc.retailerCommission + (sale.retailer_commission || 0),
        agentCommission: acc.agentCommission + (sale.agent_commission || 0),
        profit: acc.profit + airVoucherProfit,
      };
    },
    {
      amount: 0,
      supplierCommission: 0,
      retailerCommission: 0,
      agentCommission: 0,
      profit: 0,
    }
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Retailer',
      'Agent',
      'Commission Group',
      'Type',
      'Amount',
      'Supplier Commission',
      'Retailer Commission',
      'Agent Commission',
      'AV Profit',
    ];

    const rows = sales.map(sale => {
      const supplierCommissionAmount =
        sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
      const airVoucherProfit = sale.profit || 0;

      return [
        new Date(sale.created_at).toLocaleString('en-ZA'),
        sale.retailer_name || 'Unknown',
        sale.agent_name || '-',
        sale.commission_group_name || '-',
        sale.voucher_type || 'Unknown',
        sale.amount.toFixed(2),
        (supplierCommissionAmount || 0).toFixed(2),
        (sale.retailer_commission || 0).toFixed(2),
        (sale.agent_commission || 0).toFixed(2),
        airVoucherProfit.toFixed(2),
      ];
    });

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totals.amount.toFixed(2),
      totals.supplierCommission.toFixed(2),
      totals.retailerCommission.toFixed(2),
      totals.agentCommission.toFixed(2),
      totals.profit.toFixed(2),
    ]);

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
        const supplierCommissionAmount =
          sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
        const airVoucherProfit = sale.profit || 0;

        return {
          Date: new Date(sale.created_at).toLocaleString('en-ZA'),
          Retailer: sale.retailer_name || 'Unknown',
          Agent: sale.agent_name || '-',
          'Commission Group': sale.commission_group_name || '-',
          Type: sale.voucher_type || 'Unknown',
          Amount: parseFloat(sale.amount.toFixed(2)),
          'Supplier Commission': parseFloat((supplierCommissionAmount || 0).toFixed(2)),
          'Retailer Commission': parseFloat((sale.retailer_commission || 0).toFixed(2)),
          'Agent Commission': parseFloat((sale.agent_commission || 0).toFixed(2)),
          'AV Profit': parseFloat(airVoucherProfit.toFixed(2)),
        };
      });

      // Add totals row
      data.push({
        Date: 'TOTAL',
        Retailer: '',
        Agent: '',
        'Commission Group': '',
        Type: '',
        Amount: parseFloat(totals.amount.toFixed(2)),
        'Supplier Commission': parseFloat(totals.supplierCommission.toFixed(2)),
        'Retailer Commission': parseFloat(totals.retailerCommission.toFixed(2)),
        'Agent Commission': parseFloat(totals.agentCommission.toFixed(2)),
        'AV Profit': parseFloat(totals.profit.toFixed(2)),
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      // Write file
      XLSX.writeFile(workbook, getFilename('xlsx'));
      onClose();
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try CSV instead.');
    }
  };

  // Export to PDF (using jspdf)
  const exportToPDF = async () => {
    try {
      // Dynamically import jspdf and jspdf-autotable
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add title
      doc.setFontSize(16);
      doc.text('AirVoucher Sales Report', 14, 15);

      // Add date range if applicable
      if (startDate || endDate) {
        doc.setFontSize(10);
        let dateText = '';
        if (startDate && endDate) {
          dateText = `Period: ${startDate} to ${endDate}`;
        } else if (startDate) {
          dateText = `From: ${startDate}`;
        } else if (endDate) {
          dateText = `Until: ${endDate}`;
        }
        doc.text(dateText, 14, 22);
      }

      // Prepare table data
      const tableData = sales.map(sale => {
        const supplierCommissionAmount =
          sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
        const airVoucherProfit = sale.profit || 0;

        return [
          new Date(sale.created_at).toLocaleString('en-ZA', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          sale.retailer_name || 'Unknown',
          sale.agent_name || '-',
          sale.voucher_type || 'Unknown',
          `R ${sale.amount.toFixed(2)}`,
          `R ${(supplierCommissionAmount || 0).toFixed(2)}`,
          `R ${(sale.retailer_commission || 0).toFixed(2)}`,
          `R ${(sale.agent_commission || 0).toFixed(2)}`,
          `R ${airVoucherProfit.toFixed(2)}`,
        ];
      });

      // Add totals row
      tableData.push([
        'TOTAL',
        '',
        '',
        '',
        `R ${totals.amount.toFixed(2)}`,
        `R ${totals.supplierCommission.toFixed(2)}`,
        `R ${totals.retailerCommission.toFixed(2)}`,
        `R ${totals.agentCommission.toFixed(2)}`,
        `R ${totals.profit.toFixed(2)}`,
      ]);

      // Add table with autoTable
      (doc as any).autoTable({
        head: [
          [
            'Date',
            'Retailer',
            'Agent',
            'Commission Group',
            'Type',
            'Amount',
            'Supp. Com.',
            'Ret. Com.',
            'Agent Com.',
            'AV Profit',
          ],
        ],
        body: tableData,
        startY: startDate || endDate ? 28 : 22,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [59, 130, 246], // Primary blue color
          textColor: 255,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [229, 231, 235], // Gray color
          textColor: 0,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Light gray
        },
      });

      // Save PDF
      doc.save(getFilename('pdf'));
      onClose();
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export to PDF. Please try CSV or Excel instead.');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">Export Sales Report</Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a format to export {sales.length} sales record{sales.length !== 1 ? 's' : ''}:
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

              {/* PDF Export - Temporarily disabled */}
              {/* <button
                onClick={exportToPDF}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors group"
              >
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">PDF (.pdf)</p>
                  <p className="text-xs text-muted-foreground">
                    Print-ready document (landscape)
                  </p>
                </div>
              </button> */}
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
