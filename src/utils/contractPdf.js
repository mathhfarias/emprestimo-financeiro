import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from './formatters.js';

const STATUS_LABELS = {
  active: 'Ativo',
  paid: 'Quitado',
  pending: 'Pendente',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
  inactive: 'Inativo',
};

const PAGE = {
  marginX: 16,
  topY: 16,
  bottomLimit: 260,
};

export function generateLoanContractPdf({ loan, installments = [] }) {
  if (!loan) {
    throw new Error('Empréstimo não informado para geração do contrato.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const client = loan.client || {};
  const currentInstallments = installments.filter(
    (item) => item.status !== 'cancelled'
  );
  const cancelledInstallments = installments.filter(
    (item) => item.status === 'cancelled'
  );

  const paidInstallments = installments.filter((item) => item.status === 'paid');
  const openInstallments = installments.filter(
    (item) => !['paid', 'cancelled'].includes(item.status)
  );

  const renegotiationLines = extractRenegotiationLines(loan.notes);
  const manualNotes = extractManualNotes(loan.notes);
  const hasRenegotiation =
    cancelledInstallments.length > 0 || renegotiationLines.length > 0;

  const documentTitle = hasRenegotiation
    ? 'Termo de Renegociação de Empréstimo Financeiro'
    : 'Contrato de Empréstimo Financeiro';

  const documentSubtitle = hasRenegotiation
    ? 'Instrumento particular com registro de renegociação'
    : 'Instrumento particular para controle administrativo interno';

  const contractNumber = buildContractNumber(loan.id);
  const generatedAt = new Date();

  doc.setProperties({
    title: documentTitle,
    subject: `Contrato nº ${contractNumber}`,
    author: 'LoanControl',
    creator: 'LoanControl',
    keywords: 'empréstimo, contrato, financeiro, LoanControl',
  });

  let y = PAGE.topY;

  addHeader(doc, {
    title: documentTitle,
    subtitle: documentSubtitle,
    contractNumber,
    y,
  });

  y = 42;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Gerado em ${generatedAt.toLocaleDateString(
      'pt-BR'
    )} às ${generatedAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    PAGE.marginX,
    y
  );

  y += 9;

  y = addClientSection(doc, y, client);
  y = addLoanSummarySection(doc, y, {
    loan,
    currentInstallments,
    cancelledInstallments,
    paidInstallments,
    openInstallments,
  });
  y = addLoanConditionsSection(doc, y, loan);
  y = addLateRulesSection(doc, y, loan);

  y = addInstallmentsSection(doc, y, {
    title: '5. Parcelas vigentes',
    description:
      'Parcelas que permanecem válidas no contrato atual, incluindo parcelas pagas e em aberto.',
    installments: currentInstallments,
  });

  if (cancelledInstallments.length > 0) {
    y = addInstallmentsSection(doc, y, {
      title: '6. Parcelas canceladas por renegociação',
      description:
        'Parcelas mantidas apenas como histórico, sem cobrança ativa no plano atual.',
      installments: cancelledInstallments,
    });
  }

  if (hasRenegotiation) {
    y = addRenegotiationSection(doc, y, {
      loan,
      renegotiationLines,
      cancelledInstallments,
      currentInstallments,
    });
  }

  y = addNotesSection(doc, y, manualNotes);
  y = addLegalNoticeSection(doc, y);
  y = addDeclarationSection(doc, y);
  y = addSignatureSection(doc, y, client);

  addFooterToAllPages(doc);

  const filename = buildContractFilename(client.name, loan.id, hasRenegotiation);
  doc.save(filename);
}

function addClientSection(doc, y, client) {
  y = ensureSpace(doc, y, 55);

  addSectionTitle(doc, '1. Dados do cliente', y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: defaultTableStyle(),
    headStyles: headStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 130 },
    },
    body: [
      ['Nome completo', safe(client.name)],
      ['CPF/CNPJ', formatDocument(client.document)],
      ['Telefone', formatPhone(client.phone)],
      ['E-mail', safe(client.email)],
      ['Endereço', safe(client.address)],
      ['Cidade/Estado', `${safe(client.city)} / ${safe(client.state)}`],
    ],
  });

  return doc.lastAutoTable.finalY + 10;
}

function addLoanSummarySection(
  doc,
  y,
  { loan, currentInstallments, cancelledInstallments, paidInstallments, openInstallments }
) {
  y = ensureSpace(doc, y, 68);

  addSectionTitle(doc, '2. Quadro resumo', y);
  y += 6;

  const received = sumBy(paidInstallments, (item) => item.paid_amount || item.amount);
  const openOriginal = sumBy(openInstallments, (item) => item.amount);
  const openUpdated = sumBy(
    openInstallments,
    (item) => item.updatedAmount || item.amount
  );

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: defaultTableStyle(),
    headStyles: headStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58 },
      1: { cellWidth: 114 },
    },
    body: [
      ['Contrato nº', buildContractNumber(loan.id)],
      ['Status do empréstimo', getStatusLabel(loan.status)],
      ['Valor emprestado', formatCurrency(loan.principal_amount)],
      ['Valor já recebido', formatCurrency(received)],
      ['Saldo original em aberto', formatCurrency(openOriginal)],
      ['Saldo atualizado em aberto', formatCurrency(openUpdated)],
      ['Valor total a receber', formatCurrency(loan.total_amount)],
      ['Parcelas vigentes', String(currentInstallments.length)],
      ['Parcelas canceladas', String(cancelledInstallments.length)],
    ],
  });

  return doc.lastAutoTable.finalY + 10;
}

function addLoanConditionsSection(doc, y, loan) {
  y = ensureSpace(doc, y, 60);

  addSectionTitle(doc, '3. Condições financeiras', y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: defaultTableStyle(),
    headStyles: headStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58 },
      1: { cellWidth: 114 },
    },
    body: [
      ['Taxa de juros mensal', formatPercent(loan.monthly_interest_rate)],
      ['Quantidade de parcelas registrada', String(loan.installments_count || '-')],
      ['Valor da parcela atual', formatCurrency(loan.installment_amount)],
      ['Data inicial', formatDate(loan.start_date)],
      ['Primeiro vencimento', formatDate(loan.first_due_date)],
    ],
  });

  return doc.lastAutoTable.finalY + 10;
}

function addLateRulesSection(doc, y, loan) {
  y = ensureSpace(doc, y, 52);

  addSectionTitle(doc, '4. Regras de atraso', y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: defaultTableStyle(),
    headStyles: headStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58 },
      1: { cellWidth: 114 },
    },
    body: [
      ['Multa por atraso', formatPercent(loan.late_fee_rate || 0)],
      ['Juros diário por atraso', formatPercent(loan.daily_late_interest_rate || 0)],
      [
        'Critério de cálculo',
        'A multa é aplicada uma única vez sobre a parcela vencida. Os juros diários são calculados conforme a quantidade de dias de atraso.',
      ],
    ],
  });

  return doc.lastAutoTable.finalY + 10;
}

function addInstallmentsSection(doc, y, { title, description, installments }) {
  y = ensureSpace(doc, y, 45);

  addSectionTitle(doc, title, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const descriptionLines = doc.splitTextToSize(
    description,
    doc.internal.pageSize.getWidth() - PAGE.marginX * 2
  );

  doc.text(descriptionLines, PAGE.marginX, y);
  y += descriptionLines.length * 4 + 4;

  if (installments.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Nenhuma parcela encontrada para esta seção.', PAGE.marginX, y);
    return y + 10;
  }

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: {
      ...defaultTableStyle(),
      fontSize: 8,
      cellPadding: 2.2,
    },
    headStyles: headStyle(),
    columns: [
      { header: 'Nº', dataKey: 'number' },
      { header: 'Vencimento', dataKey: 'dueDate' },
      { header: 'Valor original', dataKey: 'amount' },
      { header: 'Dias atraso', dataKey: 'daysLate' },
      { header: 'Valor atualizado', dataKey: 'updatedAmount' },
      { header: 'Status', dataKey: 'status' },
    ],
    body: installments.map((item) => ({
      number: `#${item.installment_number}`,
      dueDate: formatDate(item.due_date),
      amount: formatCurrency(item.amount),
      daysLate: item.daysLate > 0 ? String(item.daysLate) : '-',
      updatedAmount: formatCurrency(item.updatedAmount || item.amount),
      status: getStatusLabel(item.status),
    })),
  });

  return doc.lastAutoTable.finalY + 10;
}

function addRenegotiationSection(
  doc,
  y,
  { loan, renegotiationLines, cancelledInstallments, currentInstallments }
) {
  y = ensureSpace(doc, y, 62);

  addSectionTitle(doc, '7. Histórico de renegociação', y);
  y += 6;

  const activePending = currentInstallments.filter((item) =>
    ['pending', 'overdue'].includes(item.status)
  );

  const renegotiationDescription =
    renegotiationLines.length > 0
      ? renegotiationLines.join('\n')
      : 'Renegociação registrada no histórico do empréstimo.';

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: defaultTableStyle(),
    headStyles: headStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 62 },
      1: { cellWidth: 110 },
    },
    body: [
      ['Registro', renegotiationDescription],
      ['Parcelas canceladas', String(cancelledInstallments.length)],
      ['Parcelas vigentes em aberto', String(activePending.length)],
      ['Taxa mensal atual', formatPercent(loan.monthly_interest_rate)],
      ['Valor atual da parcela', formatCurrency(loan.installment_amount)],
      ['Total atualizado do contrato', formatCurrency(loan.total_amount)],
    ],
  });

  return doc.lastAutoTable.finalY + 10;
}

function addNotesSection(doc, y, manualNotes) {
  y = ensureSpace(doc, y, 36);

  addSectionTitle(doc, '8. Observações adicionais', y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const notes = manualNotes?.trim()
    ? manualNotes.trim()
    : 'Sem observações adicionais registradas.';

  const notesLines = doc.splitTextToSize(
    notes,
    doc.internal.pageSize.getWidth() - PAGE.marginX * 2
  );

  doc.text(notesLines, PAGE.marginX, y);

  return y + notesLines.length * 5 + 8;
}

function addLegalNoticeSection(doc, y) {
  y = ensureSpace(doc, y, 42);

  addSectionTitle(doc, '9. Aviso administrativo', y);
  y += 7;

  const text =
    'Este documento foi gerado automaticamente pelo sistema LoanControl para fins de controle administrativo interno. Recomenda-se validação jurídica antes do uso como instrumento contratual definitivo.';

  const lines = doc.splitTextToSize(
    text,
    doc.internal.pageSize.getWidth() - PAGE.marginX * 2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(lines, PAGE.marginX, y);

  return y + lines.length * 5 + 8;
}

function addDeclarationSection(doc, y) {
  y = ensureSpace(doc, y, 48);

  addSectionTitle(doc, '10. Declaração', y);
  y += 7;

  const declaration =
    'As partes declaram ciência das condições financeiras descritas neste documento, incluindo valor emprestado, taxa de juros, quantidade de parcelas, vencimentos, multa e juros por atraso.';

  const declarationLines = doc.splitTextToSize(
    declaration,
    doc.internal.pageSize.getWidth() - PAGE.marginX * 2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(declarationLines, PAGE.marginX, y);

  return y + declarationLines.length * 5 + 12;
}

function addSignatureSection(doc, y, client) {
  y = ensureSpace(doc, y, 58);

  const pageWidth = doc.internal.pageSize.getWidth();
  const lineWidth = 76;
  const rightX = pageWidth - PAGE.marginX - lineWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  doc.text('Local e data: ________________________________', PAGE.marginX, y);
  y += 24;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  doc.line(PAGE.marginX, y, PAGE.marginX + lineWidth, y);
  doc.line(rightX, y, rightX + lineWidth, y);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Assinatura do cliente', PAGE.marginX + 16, y + 5);
  doc.text(`Nome: ${safe(client.name)}`, PAGE.marginX, y + 10);
  doc.text(`CPF/CNPJ: ${formatDocument(client.document)}`, PAGE.marginX, y + 15);

  doc.text('Assinatura do responsável', rightX + 12, y + 5);
  doc.text('Nome: ___________________________', rightX, y + 10);
  doc.text('Documento: ______________________', rightX, y + 15);

  return y + 22;
}

function addHeader(doc, { title, subtitle, contractNumber, y }) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(title, PAGE.marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, PAGE.marginX, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Contrato nº ${contractNumber}`, pageWidth - PAGE.marginX, y + 7, {
    align: 'right',
  });
}

function addSectionTitle(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, PAGE.marginX, y);
}

function addFooterToAllPages(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);

    doc.text(
      `LoanControl • Página ${pageNumber} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }
}

function ensureSpace(doc, y, neededSpace) {
  if (y + neededSpace <= PAGE.bottomLimit) {
    return y;
  }

  doc.addPage();
  return PAGE.topY;
}

function defaultTableStyle() {
  return {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: 2.8,
    textColor: [51, 65, 85],
    lineColor: [226, 232, 240],
    lineWidth: 0.2,
    valign: 'middle',
  };
}

function headStyle() {
  return {
    fillColor: [15, 23, 42],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
  };
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || '-';
}

function safe(value) {
  return value || '-';
}

function sumBy(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function formatDocument(value) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }

  return value || '-';
}

function formatPhone(value) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return value || '-';
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function extractRenegotiationLines(notes) {
  return String(notes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().includes('renegociação'));
}

function extractManualNotes(notes) {
  return String(notes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.toLowerCase().includes('renegociação'))
    .join('\n');
}

function buildContractNumber(loanId) {
  return String(loanId || 'sem-id').slice(0, 8).toUpperCase();
}

function buildContractFilename(clientName, loanId, hasRenegotiation) {
  const cleanedName = String(clientName || 'cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const shortId = String(loanId || '').slice(0, 8);
  const prefix = hasRenegotiation ? 'termo-renegociacao' : 'contrato';

  return `${prefix}-${cleanedName || 'cliente'}-${shortId}.pdf`;
}