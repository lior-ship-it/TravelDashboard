/**
 * Export Service
 * Handles exporting filtered data to CSV
 */

class ExportService {
  /**
   * Export filtered data as CSV
   */
  exportFilteredCSV(filteredData, tenant) {
    if (!filteredData || filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    console.log(`Exporting ${filteredData.length} records to CSV...`);

    // Define CSV headers
    const headers = [
      'Issue Key',
      'Patient ID',
      'Total Allowed',
      'Total Overpayment',
      'Provider',
      'Provider NPI',
      'Payer',
      'Status',
      'Created Date',
      'Close Date',
      'Close Days',
      'Close Comment',
      'Type of Bill',
      'Tenant',
      'Bluespine Fee',
      'Fee Rate'
    ];

    // Generate CSV rows
    const rows = filteredData.map(row => [
      row['Issue key'] || '',
      row._patientId || '',
      row._allowed !== null ? row._allowed.toFixed(2) : '',
      row._overpayment !== null ? row._overpayment.toFixed(2) : '',
      row._provider || '',
      row._npi || '',
      row._payer || '',
      row._status || '',
      row._created ? row._created.toISOString().split('T')[0] : '',
      row._closed ? row._closed.toISOString().split('T')[0] : '',
      row._closeDays !== null ? Math.round(row._closeDays) : '',
      row._comment || '',
      row._typeOfBill || '',
      row._tenant || '',
      row._bluespineFee !== null ? row._bluespineFee.toFixed(2) : '',
      row._feeRate !== null ? (row._feeRate * 100).toFixed(0) + '%' : ''
    ]);

    // Escape CSV values (handle commas, quotes)
    const escapeCSV = (value) => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    // Create CSV string
    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `bluespine_dashboard_${tenant || 'export'}_${date}.csv`;

    // Download
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8;');

    console.log(`✓ Exported ${filteredData.length} records to ${filename}`);
  }

  /**
   * Download a file
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create global instance
window.exportService = new ExportService();
