import { useState } from "react";
import Header from "./components/Header";
import Sidebar, { NAV_ITEMS } from "./components/Sidebar";
import InventoryOverview from "./views/InventoryOverview";
import ReorderAlerts from "./views/ReorderAlerts";
import OffShelf from "./views/OffShelf";
import StockMovements from "./views/StockMovements";
import Orders from "./views/Orders";
import GoodsReceipt from "./views/GoodsReceipt";
import TransferOrders from "./views/TransferOrders";
import SuppliersProducts from "./views/SuppliersProducts";
import SupplierPerformance from "./views/SupplierPerformance";
import "./App.css";

const VIEWS = {
  overview: InventoryOverview,
  reorder: ReorderAlerts,
  offshelf: OffShelf,
  movements: StockMovements,
  orders: Orders,
  grn: GoodsReceipt,
  transfers: TransferOrders,
  master: SuppliersProducts,
  "supplier-perf": SupplierPerformance,
};

function App() {
  const [active, setActive] = useState("overview");
  const ActiveView = VIEWS[active];
  const index = NAV_ITEMS.findIndex((n) => n.id === active);
  const label = NAV_ITEMS[index]?.label ?? "";

  return (
    <div className="app-shell">
      <Header />
      <Sidebar active={active} onSelect={setActive} />
      <main className="main">
        <ActiveView viewLabel={label} navLabel={label} />
      </main>
    </div>
  );
}

export default App;
