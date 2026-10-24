import "dotenv/config";
import { serviceCreditOverview, listServiceCreditTransactions } from "../../src/lib/employees";

const ov = await serviceCreditOverview({ q: "QA-SC" });
console.log("q=QA-SC → total:", ov.total, "rows:", ov.rows.map((r) => `${r.employeeNumber}|${r.balance}|${r.status}`));

const arch = await serviceCreditOverview({ status: "archived" });
console.log("status=archived → total:", arch.total, arch.rows.slice(0, 5).map((r) => r.employeeNumber));

const avail = await serviceCreditOverview({ balanceStatus: "has_available" });
console.log("has_available → total:", avail.total);

const zero = await serviceCreditOverview({ balanceStatus: "zero" });
console.log("zero → total:", zero.total);

const notx = await serviceCreditOverview({ txStatus: "no_transactions" });
console.log("no_tx → total:", notx.total);

const sortBal = await serviceCreditOverview({ sort: "balance", dir: "desc" });
console.log("sort balance desc → first 3:", sortBal.rows.slice(0, 3).map((r) => `${r.balance} ${r.employeeNumber}`));

const sortEarn = await serviceCreditOverview({ sort: "earned", dir: "asc" });
console.log("sort earned asc → first 3:", sortEarn.rows.slice(0, 3).map((r) => `${r.earned} ${r.employeeNumber}`));

const p2 = await serviceCreditOverview({ page: 2 });
console.log("page=2 (default size 25)? → total:", p2.total, "pageSize:", p2.pageSize, "first:", p2.rows[0]?.employeeNumber);

const led = await listServiceCreditTransactions("qa-emp-sc-active");
console.log("ledger default → count:", led.rows.length, "total:", led.total);
const ledDate = await listServiceCreditTransactions("qa-emp-sc-active", {
  from: "2026-10-01",
  to: "2026-10-31",
});
console.log("ledger Oct-2026 → count:", ledDate.rows.length, ledDate.rows.map((t) => `${t.transactionDate}|${t.type}|${t.credits}`));
const ledPg = await listServiceCreditTransactions("qa-emp-sc-active", { page: 2 });
console.log("ledger page=2 → count:", ledPg.rows.length);

const bad = await listServiceCreditTransactions("does-not-exist-xyz", { from: "zz", to: "z" });
console.log("invalid employee+bad dates → count:", bad.rows.length, "total:", bad.total);
process.exit(0);
