/**
 * Application shell + client-side view router.
 *
 * Navigation is one piece of state (`active`): the Sidebar sets it, the VIEWS
 * map turns it into a component, and that component is rendered. No routing
 * library — a single state variable and a lookup is all fourteen self-contained
 * views need. Views may call onNavigate(id) to link to another view.
 */
import { useState } from "react";
import Header from "./components/Header";
import Sidebar, { NAV_ITEMS } from "./components/Sidebar";
import ExecutiveSummary from "./views/ExecutiveSummary";
import InventoryOverview from "./views/InventoryOverview";
import DemandForecast from "./views/DemandForecast";
import ReplenishmentPlan from "./views/ReplenishmentPlan";
import InventoryHealth from "./views/InventoryHealth";
import SitePerformance from "./views/SitePerformance";
import ReorderAlerts from "./views/ReorderAlerts";
import OffShelf from "./views/OffShelf";
import StockMovements from "./views/StockMovements";
import Orders from "./views/Orders";
import GoodsReceipt from "./views/GoodsReceipt";
import TransferOrders from "./views/TransferOrders";
import SuppliersProducts from "./views/SuppliersProducts";
import SupplierPerformance from "./views/SupplierPerformance";
import { useDataStatus } from "./data/useDataStatus";
import "./App.css";

const VIEWS = {
  summary: ExecutiveSummary,
  overview: InventoryOverview,
  reorder: ReorderAlerts,
  forecast: DemandForecast,
  replenishment: ReplenishmentPlan,
  health: InventoryHealth,
  sites: SitePerformance,
  offshelf: OffShelf,
  movements: StockMovements,
  orders: Orders,
  grn: GoodsReceipt,
  transfers: TransferOrders,
  master: SuppliersProducts,
  "supplier-perf": SupplierPerformance,
};

function App() {
  const [active, setActive] = useState("summary");
  // Bumps when snapshot or live data replaces the shared arrays; keying the view
  // on it remounts the screen so every derived number is recomputed.
  const { version } = useDataStatus();
  const ActiveView = VIEWS[active];
  const index = NAV_ITEMS.findIndex((n) => n.id === active);
  const label = NAV_ITEMS[index]?.label ?? "";

  return (
    <div className="app-shell">
      <Header />
      <Sidebar active={active} onSelect={setActive} />
      <main className="main">
        <ActiveView key={`${active}-${version}`} viewLabel={label} navLabel={label} onNavigate={setActive} />
      </main>
    </div>
  );
}

export default App;
