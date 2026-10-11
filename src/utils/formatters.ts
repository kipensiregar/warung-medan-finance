/**
 * WARUNG MEDAN FINANCE - FORMATTERS & EXPORT UTILITIES
 * Warung Medan CT Catering
 */

/**
 * Format angka ke Rupiah resmi Indonesia: Rp1.250.000
 * Tidak menggunakan pecahan desimal karena rupiah menggunakan bilangan bulat
 */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Rp0';
  }
  const rounded = Math.round(value);
  const isNegative = rounded < 0;
  const absValue = Math.abs(rounded);
  const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp${formatted}` : `Rp${formatted}`;
}

/**
 * Format tanggal ISO (YYYY-MM-DD) ke Bahasa Indonesia: 11 Okt 2026
 */
export function formatIndonesianDate(
  dateStr: string | null | undefined,
  includeDay = false
): string {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des'
    ];
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const formatted = `${day} ${months[month - 1]} ${year}`;
    if (includeDay) {
      return `${days[date.getDay()]}, ${formatted}`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
}

/**
 * Unduh string sebagai file di browser / webview Android
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate CSV dengan UTF-8 BOM untuk kompatibilitas Excel di Android & PC
 */
export function generateCsv(headers: string[], rows: (string | number)[][]): string {
  const BOM = '\uFEFF';
  const escapeCell = (cell: string | number) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  return BOM + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Buka jendela cetak / simpan sebagai PDF laporan keuangan
 */
export function printFinancialReport(title: string, htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mencetak laporan');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${title} - Warung Medan CT Catering</title>
      <style>
        body {
          font-family: 'Plus Jakarta Sans', Arial, sans-serif;
          color: #1e293b;
          padding: 24px;
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #800020;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .brand {
          font-size: 20px;
          font-weight: 800;
          color: #800020;
          letter-spacing: -0.5px;
        }
        .sub-brand {
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          margin-top: 2px;
        }
        .report-title {
          font-size: 16px;
          font-weight: 700;
          margin-top: 12px;
          color: #0f172a;
          text-transform: uppercase;
        }
        .meta {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          margin-bottom: 24px;
        }
        th {
          background-color: #f8fafc;
          border-bottom: 2px solid #cbd5e1;
          padding: 8px 12px;
          text-align: left;
          font-weight: 700;
          font-size: 12px;
          color: #334155;
        }
        td {
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .text-right { text-align: right; }
        .text-bold { font-weight: 700; }
        .bg-highlight { background-color: #f1f5f9; font-weight: 700; }
        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
        }
        .signature-box {
          text-align: center;
          width: 200px;
          margin-top: 10px;
        }
        .signature-line {
          margin-top: 60px;
          border-top: 1px solid #94a3b8;
          padding-top: 4px;
          font-weight: 600;
        }
        @media print {
          @page { margin: 15mm; size: A4; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">WARUNG MEDAN FINANCE</div>
        <div class="sub-brand">Warung Medan CT Catering - Masakan Khas Batak & Catering Nusantara</div>
        <div class="report-title">${title}</div>
        <div class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')} | Zona Waktu: Asia/Jakarta</div>
      </div>
      <div>
        ${htmlContent}
      </div>
      <div class="footer">
        <div>Dokumen resmi pembukuan usaha Warung Medan CT Catering</div>
        <div class="signature-box">
          <div>Medan, ${formatIndonesianDate(new Date().toISOString().slice(0, 10))}</div>
          <div>Pemilik Usaha,</div>
          <div class="signature-line">Warung Medan CT Catering</div>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
