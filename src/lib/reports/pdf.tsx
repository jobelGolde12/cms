import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { BuiltReport } from "./report-data";
import { MUNI_HEADER } from "./report-data";
import { formatDateTime } from "../utils";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: { marginBottom: 16 },
  hMuni: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  hSub: { fontSize: 9, color: "#334155", marginTop: 2 },
  hTitle: { fontSize: 12, fontWeight: "bold", color: "#0369a1", marginTop: 10 },
  meta: { marginTop: 8, fontSize: 8, color: "#475569" },
  summary: {
    marginTop: 12,
    marginBottom: 16,
    border: "1pt solid #cbd5e1",
    borderRadius: 3,
    padding: 10,
  },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  summaryCell: { width: "33%", paddingTop: 4 },
  summaryLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  summaryValue: { fontSize: 14, fontWeight: "bold", color: "#0f172a", marginTop: 2 },
  table: { marginTop: 4 },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #e2e8f0" },
  th: {
    flexDirection: "row",
    borderBottom: "1pt solid #0f172a",
    backgroundColor: "#f1f5f9",
  },
  cell: { padding: 4, color: "#0f172a" },
  thText: { fontSize: 7, fontWeight: "bold", color: "#1e293b", padding: 4, textTransform: "uppercase" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#64748b",
    borderTop: "0.5pt solid #e2e8f0",
    paddingTop: 6,
  },
});

function ReportTable({ report }: { report: BuiltReport }) {
  const width = (100 / report.columns.length).toFixed(2);
  return (
    <View style={styles.table}>
      <View style={styles.th}>
        {report.columns.map((c) => (
          <Text key={c} style={[styles.thText, { width: `${width}%` }]}>
            {c}
          </Text>
        ))}
      </View>
      {report.rows.map((row, i) => (
        <View key={i} style={styles.tr}>
          {report.columns.map((c) => (
            <Text key={c} style={[styles.cell, { width: `${width}%` }]}>
              {row[c] == null || row[c] === "" ? "—" : String(row[c])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const reportDoc = (report: BuiltReport) => (
  <Document title={report.title}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.hMuni}>{MUNI_HEADER.name}</Text>
        <Text style={styles.hSub}>
          {MUNI_HEADER.province} · {MUNI_HEADER.region}
        </Text>
        <Text style={styles.hTitle}>{report.title}</Text>
        <Text style={styles.meta}>
          Filters: {report.filters} · Generated: {formatDateTime(report.generatedAt)} · By:{" "}
          {report.generatedBy}
        </Text>
      </View>

      <View style={styles.summary}>
        <View>
          <Text style={styles.hTitle}>Summary</Text>
        </View>
        <View style={styles.summaryRow}>
          {report.summary.map((s) => (
            <View key={s.label} style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>{s.label}</Text>
              <Text style={styles.summaryValue}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <ReportTable report={report} />

      <View style={styles.footer}>
        <Text>{`${MUNI_HEADER.name} — Child Mapping Information System`}</Text>
        <Text
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </View>
    </Page>
  </Document>
);

export async function renderReportPdf(report: BuiltReport): Promise<Uint8Array> {
  return renderToBuffer(reportDoc(report));
}