import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API = 'http://localhost/shopping-mall-system/kigali-mall/api/main.php';

export const exportInventoryPDF = async (items) => {
  try {
    // Fetch EBM report data
    const res = await fetch(`${API}?action=ebm_report`);
    const ebmData = await res.json();

    const doc = new jsPDF();
    const date = new Date().toLocaleString();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("KIGALI MALL", 14, 20);
    doc.setFontSize(16);
    doc.text("INVENTORY MANAGEMENT REPORT", 14, 28);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${date}`, 14, 35);
    doc.text("RRA EBM-VSDC Compliance Report", 14, 40);

    // Current Inventory Table
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Current Inventory Status", 14, 50);

    const tableData = items.map(item => [
      item.item_name || 'N/A',
      item.category_name || 'Uncategorized',
      item.current_quantity || 0,
      item.current_quantity <= item.reorder_level ? 'LOW' : 'OK',
      item.days_until_stockout === 999 ? 'N/A' : `${item.days_until_stockout} days`
    ]);

    doc.autoTable({
      head: [['Item Name', 'Category', 'Stock', 'Status', 'Days Left']],
      body: tableData,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 9 }
    });

    // EBM Transactions Table
    const finalY = doc.lastAutoTable.finalY + 15;
    
    if (ebmData && ebmData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Recent EBM Transactions", 14, finalY);

      const ebmTableData = ebmData.slice(0, 20).map(tx => [
        new Date(tx.stock_out_date).toLocaleDateString(),
        tx.item_name,
        tx.quantity,
        `RWF ${parseFloat(tx.total_amount || 0).toLocaleString()}`,
        tx.ebm_signature || 'N/A'
      ]);

      doc.autoTable({
        head: [['Date', 'Item', 'Qty', 'Amount', 'EBM Signature']],
        body: ebmTableData,
        startY: finalY + 5,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Authorized Signature: ___________________________", 14, pageHeight - 20);
    doc.text("Kigali Mall Inventory Management System - RRA Compliant", 14, pageHeight - 15);
    doc.text("This document is generated automatically and is compliant with Rwanda Revenue Authority standards.", 14, pageHeight - 10);

    // Save PDF
    doc.save(`Kigali_Mall_Report_${Date.now()}.pdf`);
    
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Error generating PDF. Please try again.');
    return false;
  }
};

export const exportEBMReport = async () => {
  try {
    const res = await fetch(`${API}?action=ebm_report`);
    const data = await res.json();

    if (!data || data.length === 0) {
      alert('No EBM transactions found');
      return;
    }

    const doc = new jsPDF();
    const date = new Date().toLocaleString();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("RRA EBM TRANSACTION REPORT", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${date}`, 14, 28);
    doc.text("Kigali Mall - Rwanda Revenue Authority Compliance", 14, 33);

    // EBM Transactions
    const tableData = data.map(tx => [
      new Date(tx.stock_out_date).toLocaleString(),
      tx.item_name,
      tx.quantity,
      `RWF ${parseFloat(tx.selling_price || 0).toLocaleString()}`,
      `RWF ${parseFloat(tx.total_amount || 0).toLocaleString()}`,
      tx.ebm_signature || 'PENDING'
    ]);

    doc.autoTable({
      head: [['Date & Time', 'Item Name', 'Quantity', 'Unit Price', 'Total Amount', 'EBM Signature']],
      body: tableData,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Rwanda Revenue Authority - Electronic Billing Machine Compliance", 14, pageHeight - 20);
    doc.text("All transactions are recorded and compliant with RRA standards.", 14, pageHeight - 15);

    doc.save(`EBM_Report_${Date.now()}.pdf`);
    return true;
  } catch (error) {
    console.error('EBM Report Export Error:', error);
    alert('Error generating EBM report');
    return false;
  }
};
