/* ============================================================
   Shared dummy data for the Retail Inventory demo app.
   All static/in-memory — nothing persists. Every view reads
   from here so the numbers stay consistent across tabs.
   ============================================================ */

/* ---------- Warehouses & stores (stock locations) ---------- */
export const WAREHOUSES = [
  { id: "WH-01", name: "Central DC — Toronto", type: "Distribution Center", city: "Toronto, ON", region: "Ontario" },
  { id: "WH-02", name: "West DC — Vancouver", type: "Distribution Center", city: "Vancouver, BC", region: "West Coast" },
  { id: "WH-03", name: "Prairie DC — Calgary", type: "Distribution Center", city: "Calgary, AB", region: "Prairies" },
  { id: "ST-11", name: "Flagship Store — Toronto", type: "Retail Store", city: "Toronto, ON", region: "Ontario" },
  { id: "ST-12", name: "Store — Ottawa", type: "Retail Store", city: "Ottawa, ON", region: "Ontario" },
  { id: "ST-13", name: "Store — Vancouver", type: "Retail Store", city: "Vancouver, BC", region: "West Coast" },
  { id: "ST-14", name: "Store — Montréal", type: "Retail Store", city: "Montréal, QC", region: "Quebec" },
  { id: "ST-15", name: "Store — Calgary", type: "Retail Store", city: "Calgary, AB", region: "Prairies" },
];

/* ---------- Suppliers / vendors ----------
   terms = current net terms; preferredTerms = cashflow-optimal target.
   leadDays = contracted lead; actualLeadDays = actual place→receive.
   since = relationship start year; creditsReceived = vendor credits to date ($).
   spendYtd = annual procurement spend ($); invSourcedValue = on-hand inventory sourced ($ at cost). */
export const SUPPLIERS = [
  { id: "SUP-100", name: "Northwind Trading Co.", contact: "P. Okafor", email: "orders@northwind.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 12, actualLeadDays: 13, since: 2016, creditsReceived: 3200, onTimeRate: 97, defectRate: 0.6, fillRate: 98, priceIndex: 96, spendYtd: 182000, invSourcedValue: 41000, rating: "A" },
  { id: "SUP-101", name: "Meridian Apparel Ltd.", contact: "R. Sato", email: "sales@meridian.example", terms: "Net 45", preferredTerms: "Net 60", leadDays: 21, actualLeadDays: 25, since: 2019, creditsReceived: 1500, onTimeRate: 86, defectRate: 2.4, fillRate: 89, priceIndex: 101, spendYtd: 128000, invSourcedValue: 24000, rating: "A" },
  { id: "SUP-102", name: "Cascade Electronics", contact: "D. Volkov", email: "supply@cascade.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 18, actualLeadDays: 25, since: 2020, creditsReceived: 600, onTimeRate: 78, defectRate: 4.0, fillRate: 82, priceIndex: 103, spendYtd: 112000, invSourcedValue: 28000, rating: "B" },
  { id: "SUP-103", name: "Harbor Home Goods", contact: "M. Ferreira", email: "po@harborhome.example", terms: "Net 60", preferredTerms: "Net 60", leadDays: 30, actualLeadDays: 40, since: 2023, creditsReceived: 200, onTimeRate: 60, defectRate: 7.4, fillRate: 64, priceIndex: 108, spendYtd: 90000, invSourcedValue: 18000, rating: "C" },
  { id: "SUP-104", name: "Summit Outdoor Supply", contact: "L. Andersson", email: "hello@summitoutdoor.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 15, actualLeadDays: 16, since: 2017, creditsReceived: 2600, onTimeRate: 95, defectRate: 0.9, fillRate: 96, priceIndex: 98, spendYtd: 156000, invSourcedValue: 33000, rating: "A" },
  { id: "SUP-105", name: "Aurora Textiles", contact: "N. Bianchi", email: "orders@auroratextiles.example", terms: "Net 45", preferredTerms: "Net 60", leadDays: 24, actualLeadDays: 27, since: 2021, creditsReceived: 700, onTimeRate: 88, defectRate: 2.6, fillRate: 90, priceIndex: 100, spendYtd: 84000, invSourcedValue: 12000, rating: "B" },
  { id: "SUP-106", name: "Vertex Components", contact: "K. Tan", email: "sales@vertexcomp.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 20, actualLeadDays: 22, since: 2020, creditsReceived: 900, onTimeRate: 89, defectRate: 2.0, fillRate: 91, priceIndex: 99, spendYtd: 96000, invSourcedValue: 15000, rating: "B" },
  { id: "SUP-107", name: "Ironclad Hardware", contact: "G. Novak", email: "po@ironcladhw.example", terms: "Net 60", preferredTerms: "Net 60", leadDays: 28, actualLeadDays: 36, since: 2022, creditsReceived: 400, onTimeRate: 70, defectRate: 5.2, fillRate: 75, priceIndex: 104, spendYtd: 72000, invSourcedValue: 14000, rating: "B" },
  { id: "SUP-108", name: "Pinnacle Foods", contact: "A. Costa", email: "orders@pinnaclefoods.example", terms: "Net 45", preferredTerms: "Net 45", leadDays: 10, actualLeadDays: 10, since: 2015, creditsReceived: 4100, onTimeRate: 96, defectRate: 0.7, fillRate: 97, priceIndex: 95, spendYtd: 138000, invSourcedValue: 22000, rating: "A" },
  { id: "SUP-109", name: "BlueRidge Footwear", contact: "T. Meyer", email: "sales@blueridgefw.example", terms: "Net 30", preferredTerms: "Net 60", leadDays: 22, actualLeadDays: 30, since: 2024, creditsReceived: 150, onTimeRate: 64, defectRate: 6.6, fillRate: 70, priceIndex: 106, spendYtd: 46000, invSourcedValue: 7000, rating: "C" },
  { id: "SUP-110", name: "Cobalt Distribution", contact: "S. Rahman", email: "po@cobaltdist.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 16, actualLeadDays: 20, since: 2023, creditsReceived: 300, onTimeRate: 76, defectRate: 4.4, fillRate: 80, priceIndex: 102, spendYtd: 58000, invSourcedValue: 9000, rating: "C" },
  { id: "SUP-111", name: "Evergreen Packaging", contact: "J. Park", email: "orders@evergreenpkg.example", terms: "Net 30", preferredTerms: "Net 45", leadDays: 14, actualLeadDays: 21, since: 2024, creditsReceived: 100, onTimeRate: 62, defectRate: 6.4, fillRate: 68, priceIndex: 105, spendYtd: 38000, invSourcedValue: 5000, rating: "C" },
];

/* ---------- Product / SKU catalog ---------- */
export const PRODUCTS = [
  { sku: "SKU-1001", name: "Merino Wool Sweater", category: "Apparel", department: "Apparel", class: "Tops", subclass: "Sweaters", style: "Merino Crewneck", supplierId: "SUP-101", uom: "each", unitCost: 28.0, unitPrice: 69.0, reorderPoint: 120, safetyStock: 60 },
  { sku: "SKU-1002", name: "Classic Denim Jacket", category: "Apparel", department: "Apparel", class: "Outerwear", subclass: "Jackets", style: "Denim", supplierId: "SUP-101", uom: "each", unitCost: 34.5, unitPrice: 89.0, reorderPoint: 90, safetyStock: 45 },
  { sku: "SKU-1003", name: "Running Shoe — Trail", category: "Footwear", department: "Footwear", class: "Athletic", subclass: "Running", style: "Trail", supplierId: "SUP-104", uom: "pair", unitCost: 41.0, unitPrice: 110.0, reorderPoint: 80, safetyStock: 40 },
  { sku: "SKU-1004", name: "Waterproof Hiking Boot", category: "Footwear", department: "Footwear", class: "Outdoor", subclass: "Boots", style: "Hiking", supplierId: "SUP-104", uom: "pair", unitCost: 58.0, unitPrice: 145.0, reorderPoint: 60, safetyStock: 30 },
  { sku: "SKU-1005", name: "Wireless Earbuds Pro", category: "Electronics", department: "Electronics", class: "Audio", subclass: "Earbuds", style: "Wireless Pro", supplierId: "SUP-102", uom: "each", unitCost: 46.0, unitPrice: 129.0, reorderPoint: 100, safetyStock: 50 },
  { sku: "SKU-1006", name: "Smart LED Bulb 4-pack", category: "Electronics", department: "Electronics", class: "Smart Home", subclass: "Lighting", style: "LED Bulb", supplierId: "SUP-102", uom: "pack", unitCost: 12.5, unitPrice: 34.0, reorderPoint: 150, safetyStock: 75 },
  { sku: "SKU-1007", name: "Stainless Water Bottle 1L", category: "Outdoor", department: "Outdoor", class: "Hydration", subclass: "Bottles", style: "Stainless 1L", supplierId: "SUP-104", uom: "each", unitCost: 8.0, unitPrice: 24.0, reorderPoint: 200, safetyStock: 100 },
  { sku: "SKU-1008", name: "Insulated Camp Mug", category: "Outdoor", department: "Outdoor", class: "Drinkware", subclass: "Mugs", style: "Insulated", supplierId: "SUP-104", uom: "each", unitCost: 6.5, unitPrice: 19.0, reorderPoint: 180, safetyStock: 90 },
  { sku: "SKU-1009", name: "Ceramic Dinner Set 16pc", category: "Home", department: "Home", class: "Kitchen", subclass: "Dinnerware", style: "Ceramic 16pc", supplierId: "SUP-103", uom: "set", unitCost: 32.0, unitPrice: 79.0, reorderPoint: 50, safetyStock: 25 },
  { sku: "SKU-1010", name: "Cotton Bath Towel Bundle", category: "Home", department: "Home", class: "Bath", subclass: "Towels", style: "Cotton Bundle", supplierId: "SUP-103", uom: "bundle", unitCost: 18.0, unitPrice: 45.0, reorderPoint: 110, safetyStock: 55 },
  { sku: "SKU-1011", name: "Organic Coffee Beans 1kg", category: "Grocery", department: "Grocery", class: "Beverages", subclass: "Coffee", style: "Organic Whole Bean", supplierId: "SUP-100", uom: "bag", unitCost: 9.5, unitPrice: 22.0, reorderPoint: 240, safetyStock: 120 },
  { sku: "SKU-1012", name: "Artisan Olive Oil 750ml", category: "Grocery", department: "Grocery", class: "Pantry", subclass: "Oils", style: "Olive Oil", supplierId: "SUP-100", uom: "bottle", unitCost: 7.0, unitPrice: 18.0, reorderPoint: 160, safetyStock: 80 },
];

/* ---------- Per-SKU stock position (on-shelf vs off-shelf) ----------
   onShelf  = available to sell (store floor + online-fulfillable)
   offShelf = held in warehouse / back-of-house reserve            */
export const STOCK = [
  { sku: "SKU-1001", onShelf: 74, offShelf: 210 },
  { sku: "SKU-1002", onShelf: 40, offShelf: 62 },   // low
  { sku: "SKU-1003", onShelf: 55, offShelf: 130 },
  { sku: "SKU-1004", onShelf: 22, offShelf: 30 },   // low
  { sku: "SKU-1005", onShelf: 88, offShelf: 260 },
  { sku: "SKU-1006", onShelf: 60, offShelf: 95 },   // low
  { sku: "SKU-1007", onShelf: 190, offShelf: 420 },
  { sku: "SKU-1008", onShelf: 120, offShelf: 240 },
  { sku: "SKU-1009", onShelf: 12, offShelf: 18 },   // low
  { sku: "SKU-1010", onShelf: 65, offShelf: 180 },
  { sku: "SKU-1011", onShelf: 210, offShelf: 520 },
  { sku: "SKU-1012", onShelf: 0, offShelf: 0 },     // out of stock
];

/* ---------- On-shelf placement by store location ----------
   Per-SKU units on display / sellable at each retail store.
   Each SKU's store quantities sum to its STOCK.onShelf.       */
export const SHELF = {
  "SKU-1001": { "ST-11": 24, "ST-12": 18, "ST-13": 14, "ST-14": 10, "ST-15": 8 },
  "SKU-1002": { "ST-11": 12, "ST-12": 10, "ST-13": 8, "ST-14": 6, "ST-15": 4 },
  "SKU-1003": { "ST-11": 15, "ST-12": 12, "ST-13": 12, "ST-14": 8, "ST-15": 8 },
  "SKU-1004": { "ST-11": 6, "ST-12": 5, "ST-13": 5, "ST-14": 3, "ST-15": 3 },
  "SKU-1005": { "ST-11": 28, "ST-12": 20, "ST-13": 18, "ST-14": 12, "ST-15": 10 },
  "SKU-1006": { "ST-11": 18, "ST-12": 14, "ST-13": 12, "ST-14": 8, "ST-15": 8 },
  "SKU-1007": { "ST-11": 55, "ST-12": 45, "ST-13": 40, "ST-14": 28, "ST-15": 22 },
  "SKU-1008": { "ST-11": 35, "ST-12": 28, "ST-13": 25, "ST-14": 18, "ST-15": 14 },
  "SKU-1009": { "ST-11": 4, "ST-12": 3, "ST-13": 3, "ST-14": 1, "ST-15": 1 },
  "SKU-1010": { "ST-11": 20, "ST-12": 15, "ST-13": 14, "ST-14": 8, "ST-15": 8 },
  "SKU-1011": { "ST-11": 60, "ST-12": 50, "ST-13": 45, "ST-14": 30, "ST-15": 25 },
  "SKU-1012": {},
};

/* ---------- Warehouse bin placement (off-shelf detail) ----------
   A SKU can sit in multiple bins across warehouses.                */
export const BINS = [
  { sku: "SKU-1001", warehouse: "WH-01", bin: "A12-R03-S2", qty: 140, lastMove: "2026-07-21" },
  { sku: "SKU-1001", warehouse: "WH-02", bin: "C04-R01-S4", qty: 70, lastMove: "2026-07-18" },
  { sku: "SKU-1002", warehouse: "WH-01", bin: "A14-R02-S1", qty: 62, lastMove: "2026-07-19" },
  { sku: "SKU-1003", warehouse: "WH-02", bin: "D08-R05-S3", qty: 90, lastMove: "2026-07-22" },
  { sku: "SKU-1003", warehouse: "WH-03", bin: "B02-R04-S2", qty: 40, lastMove: "2026-07-15" },
  { sku: "SKU-1004", warehouse: "WH-02", bin: "D09-R01-S1", qty: 30, lastMove: "2026-07-20" },
  { sku: "SKU-1005", warehouse: "WH-01", bin: "E01-R06-S5", qty: 160, lastMove: "2026-07-23" },
  { sku: "SKU-1005", warehouse: "WH-03", bin: "B05-R02-S3", qty: 100, lastMove: "2026-07-17" },
  { sku: "SKU-1006", warehouse: "WH-03", bin: "B06-R03-S1", qty: 95, lastMove: "2026-07-16" },
  { sku: "SKU-1007", warehouse: "WH-01", bin: "F10-R08-S2", qty: 250, lastMove: "2026-07-22" },
  { sku: "SKU-1007", warehouse: "WH-02", bin: "C11-R04-S4", qty: 170, lastMove: "2026-07-21" },
  { sku: "SKU-1008", warehouse: "WH-01", bin: "F11-R08-S3", qty: 240, lastMove: "2026-07-19" },
  { sku: "SKU-1009", warehouse: "WH-03", bin: "G01-R02-S1", qty: 18, lastMove: "2026-07-14" },
  { sku: "SKU-1010", warehouse: "WH-01", bin: "H03-R05-S2", qty: 110, lastMove: "2026-07-18" },
  { sku: "SKU-1010", warehouse: "WH-02", bin: "C07-R03-S1", qty: 70, lastMove: "2026-07-20" },
  { sku: "SKU-1011", warehouse: "WH-03", bin: "K09-R10-S4", qty: 320, lastMove: "2026-07-23" },
  { sku: "SKU-1011", warehouse: "WH-01", bin: "H08-R06-S3", qty: 200, lastMove: "2026-07-22" },
  { sku: "SKU-1012", warehouse: "WH-03", bin: "K10-R10-S5", qty: 0, lastMove: "2026-07-05" },
];

/* ---------- Purchase orders (procure-to-pay) ----------
   status lifecycle: Draft → Submitted for Approval → Open (approved/ordered)
   → Partially Received → Received → Closed. On Hold is an off-path state.
   createdDate = drafted; closedDate = when the PO was closed.            */
export const PURCHASE_ORDERS = [
  {
    po: "PO-5011", supplierId: "SUP-102", createdDate: "2026-07-19", orderDate: "2026-07-21", expected: "2026-08-12", closedDate: null, status: "On Hold",
    lines: [{ sku: "SKU-1005", qty: 150, unitCost: 46.0 }],
  },
  {
    po: "PO-5010", supplierId: "SUP-103", createdDate: "2026-07-25", orderDate: "—", expected: "—", closedDate: null, status: "Draft",
    lines: [{ sku: "SKU-1010", qty: 120, unitCost: 18.0 }],
  },
  {
    po: "PO-5009", supplierId: "SUP-100", createdDate: "2026-07-25", orderDate: "—", expected: "—", closedDate: null, status: "Draft",
    lines: [{ sku: "SKU-1011", qty: 300, unitCost: 9.5 }],
  },
  {
    po: "PO-5008", supplierId: "SUP-101", createdDate: "2026-07-24", orderDate: "—", expected: "2026-08-18", closedDate: null, status: "Submitted for Approval",
    lines: [{ sku: "SKU-1002", qty: 100, unitCost: 34.5 }],
  },
  {
    po: "PO-5007", supplierId: "SUP-102", createdDate: "2026-07-20", orderDate: "2026-07-22", expected: "2026-08-09", closedDate: null, status: "Open",
    lines: [
      { sku: "SKU-1005", qty: 200, unitCost: 46.0 },
      { sku: "SKU-1006", qty: 300, unitCost: 12.5 },
    ],
  },
  {
    po: "PO-5006", supplierId: "SUP-104", createdDate: "2026-07-16", orderDate: "2026-07-18", expected: "2026-08-02", closedDate: null, status: "Partially Received",
    lines: [
      { sku: "SKU-1004", qty: 120, unitCost: 58.0 },
      { sku: "SKU-1007", qty: 400, unitCost: 8.0 },
    ],
  },
  {
    po: "PO-5005", supplierId: "SUP-101", createdDate: "2026-07-08", orderDate: "2026-07-10", expected: "2026-07-31", closedDate: null, status: "Open",
    lines: [{ sku: "SKU-1002", qty: 150, unitCost: 34.5 }],
  },
  {
    po: "PO-5004", supplierId: "SUP-103", createdDate: "2026-06-30", orderDate: "2026-07-02", expected: "2026-08-01", closedDate: null, status: "Open",
    lines: [{ sku: "SKU-1009", qty: 80, unitCost: 32.0 }],
  },
  {
    po: "PO-5003", supplierId: "SUP-100", createdDate: "2026-06-20", orderDate: "2026-06-24", expected: "2026-07-06", closedDate: null, status: "Received",
    lines: [
      { sku: "SKU-1011", qty: 500, unitCost: 9.5 },
      { sku: "SKU-1012", qty: 300, unitCost: 7.0 },
    ],
  },
  {
    po: "PO-5002", supplierId: "SUP-101", createdDate: "2026-06-11", orderDate: "2026-06-15", expected: "2026-07-05", closedDate: "2026-07-05", status: "Closed",
    lines: [{ sku: "SKU-1001", qty: 260, unitCost: 28.0 }],
  },
  {
    po: "PO-5001", supplierId: "SUP-104", createdDate: "2026-06-04", orderDate: "2026-06-08", expected: "2026-06-22", closedDate: "2026-06-25", status: "Closed",
    lines: [{ sku: "SKU-1003", qty: 180, unitCost: 41.0 }],
  },
  {
    po: "PO-4998", supplierId: "SUP-103", createdDate: "2026-05-30", orderDate: "2026-06-03", expected: "2026-06-18", closedDate: "2026-06-20", status: "Closed",
    lines: [{ sku: "SKU-1009", qty: 80, unitCost: 32.0 }],
  },
  {
    po: "PO-4995", supplierId: "SUP-102", createdDate: "2026-05-14", orderDate: "2026-05-18", expected: "2026-06-05", closedDate: "2026-06-06", status: "Closed",
    lines: [{ sku: "SKU-1006", qty: 400, unitCost: 12.5 }],
  },
];

/* ---------- Supplier invoices (billing for historical POs) ---------- */
export const INVOICES = [
  { inv: "INV-9007", po: "PO-5003", supplierId: "SUP-100", invoiceDate: "2026-07-07", dueDate: "2026-08-06", amount: 6850.0, status: "Open" },
  { inv: "INV-9006", po: "PO-5002", supplierId: "SUP-101", invoiceDate: "2026-07-06", dueDate: "2026-08-20", amount: 7280.0, status: "Open" },
  { inv: "INV-9005", po: "PO-5001", supplierId: "SUP-104", invoiceDate: "2026-06-23", dueDate: "2026-07-23", amount: 7380.0, status: "Overdue" },
  { inv: "INV-9004", po: "PO-4998", supplierId: "SUP-103", invoiceDate: "2026-06-18", dueDate: "2026-08-17", amount: 4120.0, status: "Open" },
  { inv: "INV-9003", po: "PO-4995", supplierId: "SUP-102", invoiceDate: "2026-06-10", dueDate: "2026-07-10", amount: 9240.0, status: "Paid" },
  { inv: "INV-9002", po: "PO-4991", supplierId: "SUP-100", invoiceDate: "2026-05-28", dueDate: "2026-06-27", amount: 3110.0, status: "Paid" },
  { inv: "INV-9001", po: "PO-4988", supplierId: "SUP-104", invoiceDate: "2026-05-19", dueDate: "2026-06-18", amount: 5240.0, status: "Paid" },
];

/* ---------- Transfer orders (warehouse-to-warehouse) ---------- */
export const TRANSFER_ORDERS = [
  {
    to: "TO-320", fromWh: "WH-01", toWh: "ST-11", status: "In Transit", shipDate: "2026-07-22", eta: "2026-07-26",
    lines: [{ sku: "SKU-1001", qty: 40 }, { sku: "SKU-1005", qty: 25 }],
  },
  {
    to: "TO-319", fromWh: "WH-02", toWh: "WH-03", status: "In Transit", shipDate: "2026-07-21", eta: "2026-07-28",
    lines: [{ sku: "SKU-1003", qty: 60 }],
  },
  {
    to: "TO-318", fromWh: "WH-01", toWh: "ST-12", status: "Picked", shipDate: "2026-07-23", eta: "2026-07-27",
    lines: [{ sku: "SKU-1010", qty: 30 }, { sku: "SKU-1007", qty: 80 }],
  },
  {
    to: "TO-317", fromWh: "WH-03", toWh: "WH-01", status: "Draft", shipDate: "—", eta: "—",
    lines: [{ sku: "SKU-1011", qty: 150 }],
  },
  {
    to: "TO-316", fromWh: "WH-02", toWh: "ST-11", status: "Received", shipDate: "2026-07-14", eta: "2026-07-18",
    lines: [{ sku: "SKU-1004", qty: 20 }],
  },
  {
    to: "TO-315", fromWh: "WH-01", toWh: "WH-02", status: "Received", shipDate: "2026-07-10", eta: "2026-07-15",
    lines: [{ sku: "SKU-1008", qty: 120 }, { sku: "SKU-1006", qty: 50 }],
  },
];

/* ---------- Stock movement ledger (audit trail) ---------- */
export const MOVEMENTS = [
  { id: "MV-8801", ts: "2026-07-23 14:20", sku: "SKU-1011", type: "Receipt", qty: 500, from: "SUP-100", to: "WH-03", ref: "PO-5003", reason: "PO receipt" },
  { id: "MV-8800", ts: "2026-07-23 11:05", sku: "SKU-1005", type: "Sale", qty: -18, from: "ST-11", to: "Customer", ref: "POS-4471", reason: "Store sale" },
  { id: "MV-8799", ts: "2026-07-23 09:48", sku: "SKU-1007", type: "Transfer Out", qty: -80, from: "WH-01", to: "ST-12", ref: "TO-318", reason: "Store replenishment" },
  { id: "MV-8798", ts: "2026-07-22 16:32", sku: "SKU-1001", type: "Transfer Out", qty: -40, from: "WH-01", to: "ST-11", ref: "TO-320", reason: "Store replenishment" },
  { id: "MV-8797", ts: "2026-07-22 15:10", sku: "SKU-1004", type: "Receipt", qty: 60, from: "SUP-104", to: "WH-02", ref: "PO-5006", reason: "Partial PO receipt" },
  { id: "MV-8796", ts: "2026-07-22 12:44", sku: "SKU-1009", type: "Adjustment", qty: -4, from: "WH-03", to: "—", ref: "ADJ-221", reason: "Damaged in storage" },
  { id: "MV-8795", ts: "2026-07-21 17:20", sku: "SKU-1003", type: "Transfer Out", qty: -60, from: "WH-02", to: "WH-03", ref: "TO-319", reason: "Rebalance stock" },
  { id: "MV-8794", ts: "2026-07-21 10:15", sku: "SKU-1012", type: "Sale", qty: -24, from: "ST-11", to: "Customer", ref: "POS-4460", reason: "Store sale" },
  { id: "MV-8793", ts: "2026-07-20 14:02", sku: "SKU-1010", type: "Transfer In", qty: 70, from: "WH-01", to: "WH-02", ref: "TO-312", reason: "Rebalance stock" },
  { id: "MV-8792", ts: "2026-07-20 09:30", sku: "SKU-1002", type: "Sale", qty: -12, from: "ST-12", to: "Customer", ref: "POS-4455", reason: "Store sale" },
  { id: "MV-8791", ts: "2026-07-19 16:50", sku: "SKU-1008", type: "Adjustment", qty: 6, from: "—", to: "WH-01", ref: "ADJ-219", reason: "Cycle count gain" },
  { id: "MV-8790", ts: "2026-07-19 11:12", sku: "SKU-1001", type: "Receipt", qty: 260, from: "SUP-101", to: "WH-01", ref: "PO-5002", reason: "PO receipt" },
  { id: "MV-8789", ts: "2026-07-18 15:40", sku: "SKU-1005", type: "Sale", qty: -30, from: "ST-11", to: "Customer", ref: "POS-4448", reason: "Online order" },
  { id: "MV-8788", ts: "2026-07-18 10:05", sku: "SKU-1007", type: "Receipt", qty: 400, from: "SUP-104", to: "WH-01", ref: "PO-5006", reason: "PO receipt" },
];

/* ---------- Goods receipts (GRN) ---------- */
export const GRNS = [
  { grn: "GRN-701", po: "PO-5006", supplierId: "SUP-104", received: "2026-07-22", warehouse: "WH-02", lines: 1, units: 60, status: "Partial" },
  { grn: "GRN-700", po: "PO-5003", supplierId: "SUP-100", received: "2026-07-07", warehouse: "WH-03", lines: 2, units: 800, status: "Complete" },
  { grn: "GRN-699", po: "PO-5002", supplierId: "SUP-101", received: "2026-07-05", warehouse: "WH-01", lines: 1, units: 260, status: "Complete" },
  { grn: "GRN-698", po: "PO-5001", supplierId: "SUP-104", received: "2026-06-22", warehouse: "WH-02", lines: 1, units: 180, status: "Complete" },
];

/* ============================================================
   Lookups & derived helpers
   ============================================================ */
export const productBySku = (sku) => PRODUCTS.find((p) => p.sku === sku);
export const supplierById = (id) => SUPPLIERS.find((s) => s.id === id);
export const warehouseById = (id) => WAREHOUSES.find((w) => w.id === id);
export const stockBySku = (sku) => STOCK.find((s) => s.sku === sku);

export const skuName = (sku) => productBySku(sku)?.name ?? sku;
export const supplierName = (id) => supplierById(id)?.name ?? id;
export const warehouseName = (id) => warehouseById(id)?.name ?? id;

export const onHand = (sku) => {
  const s = stockBySku(sku);
  return s ? s.onShelf + s.offShelf : 0;
};

/* All bins a SKU is stored in */
export const binsFor = (sku) => BINS.filter((b) => b.sku === sku);

/* ---------- Location lists + scoping (Inventory Overview) ----------
   On-shelf lives at STORES (SHELF); off-shelf lives at DCS (BINS).
   A `location` selection scopes each side independently.
   location: {kind:'all'} | {kind:'type', type:'store'|'dc'}
           | {kind:'loc', id, type}                                  */
export const STORES = WAREHOUSES.filter((w) => w.type === "Retail Store");
export const DCS = WAREHOUSES.filter((w) => w.type === "Distribution Center");

const storeInScope = (loc, id) =>
  loc.kind === "all" ||
  (loc.kind === "type" && loc.type === "store") ||
  (loc.kind === "loc" && loc.type === "store" && loc.id === id);

const dcInScope = (loc, id) =>
  loc.kind === "all" ||
  (loc.kind === "type" && loc.type === "dc") ||
  (loc.kind === "loc" && loc.type === "dc" && loc.id === id);

/* Per-SKU on-shelf (SHELF/stores) and off-shelf (BINS/DCs), scoped to a location.
   Pass a SKU array to also apply a product-hierarchy filter.               */
export function scopedRows(skus, loc = { kind: "all" }) {
  const set = skus ? new Set(skus) : null;
  return PRODUCTS.filter((p) => !set || set.has(p.sku)).map((p) => {
    const shelf = SHELF[p.sku] || {};
    const onShelf = Object.entries(shelf).reduce(
      (s, [store, q]) => s + (storeInScope(loc, store) ? q : 0), 0);
    const offShelf = BINS.filter((b) => b.sku === p.sku).reduce(
      (s, b) => s + (dcInScope(loc, b.warehouse) ? b.qty : 0), 0);
    return { sku: p.sku, onShelf, offShelf };
  });
}

/* On-shelf units by store (only stores in scope). */
export function onShelfByStore(skus, loc = { kind: "all" }) {
  const set = skus ? new Set(skus) : null;
  return STORES.filter((st) => storeInScope(loc, st.id)).map((st) => {
    const units = Object.entries(SHELF).reduce((sum, [sku, dist]) => {
      if (set && !set.has(sku)) return sum;
      return sum + (dist[st.id] || 0);
    }, 0);
    return { code: st.id, name: st.city.split(",")[0], units };
  });
}

/* Off-shelf units by distribution warehouse (only DCs in scope). */
export function offShelfByWarehouse(skus, loc = { kind: "all" }) {
  const set = skus ? new Set(skus) : null;
  return DCS.filter((dc) => dcInScope(loc, dc.id)).map((dc) => {
    const units = BINS.reduce((sum, b) => {
      if (b.warehouse !== dc.id) return sum;
      if (set && !set.has(b.sku)) return sum;
      return sum + b.qty;
    }, 0);
    return { code: dc.id, name: dc.city.split(",")[0], units };
  });
}

/* ---------- Warehouse floor-plan map (Off-Shelf tab) ----------
   Empty bin slots per DC (not in BINS, so the item table is untouched).
   Reuse each warehouse's real aisle letters so empties interleave.       */
export const EMPTY_BINS = {
  "WH-01": ["A15-R02-S2", "E02-R06-S1", "F12-R08-S4", "H04-R05-S3", "H09-R06-S1"],
  "WH-02": ["C05-R01-S2", "C08-R03-S3", "D10-R05-S1", "D11-R01-S2"],
  "WH-03": ["B03-R04-S1", "B07-R03-S3", "G02-R02-S2", "K11-R10-S1"],
};

/* Per-bin capacity: 50, or the site's largest bin / 1.5 if higher —
   calibrated so each site shows empty / half / full locations.          */
export function siteBinCapacity(whId) {
  const qtys = BINS.filter((b) => b.warehouse === whId).map((b) => b.qty);
  const max = qtys.length ? Math.max(...qtys) : 0;
  return Math.max(50, Math.round(max / 1.5));
}

function binTier(qty, pct) {
  if (qty === 0) return "empty";
  if (pct < 33) return "low";
  if (pct < 66) return "half";
  if (pct < 100) return "high";
  return "full";
}

/* Full storage layout for a warehouse: occupied (BINS) + empty (EMPTY_BINS),
   grouped by aisle letter, with fill% and conditional-format tier.        */
export function warehouseFloor(whId) {
  const capacity = siteBinCapacity(whId);
  const occ = BINS.filter((b) => b.warehouse === whId).map((b) => ({
    code: b.bin, sku: b.sku, qty: b.qty,
  }));
  const empt = (EMPTY_BINS[whId] || []).map((code) => ({ code, sku: null, qty: 0 }));

  const all = [...occ, ...empt].map((s) => {
    const pct = Math.min(100, Math.round((s.qty / capacity) * 100));
    return { ...s, fillPct: pct, tier: binTier(s.qty, pct) };
  });

  const byAisle = {};
  all.forEach((s) => {
    const a = s.code[0];
    (byAisle[a] = byAisle[a] || []).push(s);
  });
  const aisles = Object.keys(byAisle)
    .sort()
    .map((a) => ({
      aisle: a,
      bins: byAisle[a].sort((x, y) => x.code.localeCompare(y.code)),
    }));

  return {
    capacity,
    aisles,
    occupied: all.filter((s) => s.qty > 0).length,
    empty: all.filter((s) => s.qty === 0).length,
    total: all.length,
  };
}

/* PO line + header totals */
export const poTotal = (po) =>
  po.lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);
export const poUnits = (po) => po.lines.reduce((sum, l) => sum + l.qty, 0);

/* Status → pill class map (reuses theme pill modifiers) */
export function statusPill(status) {
  switch (status) {
    case "Received":
    case "Complete":
    case "Paid":
    case "Closed":
      return "pill--success";
    case "Open":
    case "In Transit":
    case "Picked":
    case "Partial":
    case "Partially Received":
      return "pill";
    case "Overdue":
    case "Out of stock":
      return "pill--danger";
    case "Submitted for Approval":
      return "pill";
    case "On Hold":
      return "pill--accent";
    case "Draft":
      return "pill--muted";
    default:
      return "pill--accent";
  }
}

/* ---------- Procure-to-pay KPI helpers (Orders · Place PO) ---------- */

/* YTD $ value + count by PO lifecycle bucket (each PO in exactly one). */
export const PO_BUCKETS = [
  { label: "Draft", statuses: ["Draft"], tone: "#8aa0ac" },
  { label: "Submitted for approval", statuses: ["Submitted for Approval"], tone: "#57b0d6" },
  { label: "On hold", statuses: ["On Hold"], tone: "#f4a63b" },
  { label: "Purchased", statuses: ["Open", "Partially Received"], tone: "#1a6790" },
  { label: "Received", statuses: ["Received"], tone: "#7a5cc4" },
  { label: "Closed", statuses: ["Closed"], tone: "#2e9e6b" },
];

export function poStatusSummary() {
  return PO_BUCKETS.map((b) => {
    const pos = PURCHASE_ORDERS.filter((p) => b.statuses.includes(p.status));
    return {
      label: b.label,
      tone: b.tone,
      count: pos.length,
      value: pos.reduce((s, p) => s + poTotal(p), 0),
    };
  });
}

/* Average PO cycle time (create → close) over POs that have both dates. */
export function avgPoCycleTime() {
  const days = PURCHASE_ORDERS.filter((p) => p.createdDate && p.closedDate).map(
    (p) => (new Date(p.closedDate) - new Date(p.createdDate)) / 86400000
  );
  if (!days.length) return { avgDays: 0, count: 0 };
  return { avgDays: Math.round(days.reduce((s, d) => s + d, 0) / days.length), count: days.length };
}

/* Count of suppliers by net payment terms. */
export function suppliersByTerms() {
  const map = {};
  SUPPLIERS.forEach((s) => { map[s.terms] = (map[s.terms] || 0) + 1; });
  return Object.keys(map)
    .sort()
    .map((terms) => ({ terms, count: map[terms] }));
}

/* Outstanding payable (unpaid supplier invoices) grouped by payment terms. */
export function outstandingByTerms() {
  const map = {};
  INVOICES.filter((i) => i.status !== "Paid").forEach((i) => {
    const terms = supplierById(i.supplierId)?.terms ?? "—";
    map[terms] = (map[terms] || 0) + i.amount;
  });
  return Object.keys(map)
    .sort()
    .map((terms) => ({ terms, amount: map[terms] }));
}

/* ---------- Supplier performance scoring (Supplier Performance tab) ---------- */
export function termDays(terms) {
  const m = /(\d+)/.exec(terms || "");
  return m ? Number(m[1]) : 0;
}

const clamp01 = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* Weighted score criteria (sum to 1.0). */
export const SUPPLIER_WEIGHTS = [
  { key: "onTime", label: "On-time delivery", weight: 0.25 },
  { key: "quality", label: "Quality (defect-adj.)", weight: 0.20 },
  { key: "fill", label: "Fill rate", weight: 0.15 },
  { key: "lead", label: "Lead-time reliability", weight: 0.15 },
  { key: "terms", label: "Payment terms (cashflow)", weight: 0.15 },
  { key: "relationship", label: "Relationship & credits", weight: 0.10 },
];

export const COHORT_META = {
  Strategic: { action: "Grow", tone: "#2e9e6b" },
  Preferred: { action: "Maintain", tone: "#1a6790" },
  Approved: { action: "Monitor", tone: "#f4a63b" },
  Watchlist: { action: "Review / exit", tone: "#d0563f" },
};

export function supplierScore(s) {
  const years = 2026 - s.since;
  const parts = {
    onTime: clamp01(s.onTimeRate, 0, 100),
    quality: clamp01(100 - s.defectRate * 8, 0, 100),
    fill: clamp01(s.fillRate, 0, 100),
    lead: clamp01(100 - Math.max(0, s.actualLeadDays - s.leadDays) * 6, 40, 100),
    terms: clamp01((termDays(s.terms) / termDays(s.preferredTerms)) * 100, 0, 100),
    relationship: clamp01(Math.min(years, 10) * 8 + Math.min(s.creditsReceived / 500, 20), 0, 100),
  };
  const score = SUPPLIER_WEIGHTS.reduce((sum, w) => sum + parts[w.key] * w.weight, 0);
  return { score: Math.round(score), parts };
}

export function supplierCohort(score) {
  const label = score >= 82 ? "Strategic" : score >= 70 ? "Preferred" : score >= 58 ? "Approved" : "Watchlist";
  return { label, ...COHORT_META[label] };
}

/* All suppliers enriched with score, cohort, and derived evaluation fields; sorted by spend desc. */
export function supplierMetrics() {
  return SUPPLIERS.map((s) => {
    const { score, parts } = supplierScore(s);
    return {
      ...s,
      score,
      parts,
      cohort: supplierCohort(score),
      years: 2026 - s.since,
      leadVariance: s.actualLeadDays - s.leadDays,
      termsGapDays: termDays(s.preferredTerms) - termDays(s.terms),
    };
  }).sort((a, b) => b.spendYtd - a.spendYtd);
}

/* Pareto contribution: suppliers ranked by spend with %/cumulative %, plus totals + top-10 share. */
export function spendContribution() {
  const rows = supplierMetrics();
  const totalSpend = rows.reduce((s, r) => s + r.spendYtd, 0);
  const totalInv = rows.reduce((s, r) => s + r.invSourcedValue, 0);
  let cum = 0;
  const ranked = rows.map((r, i) => {
    cum += r.spendYtd;
    return { ...r, rank: i + 1, pct: (r.spendYtd / totalSpend) * 100, cumPct: (cum / totalSpend) * 100 };
  });
  const top10 = ranked.slice(0, 10);
  const top10Share = (top10.reduce((s, r) => s + r.spendYtd, 0) / totalSpend) * 100;
  return { ranked, top10, totalSpend, totalInv, top10Share };
}

/* Cohort roll-up: count, spend, inventory value, and members per tier. */
export function cohortSummary() {
  const rows = supplierMetrics();
  return ["Strategic", "Preferred", "Approved", "Watchlist"].map((label) => {
    const members = rows.filter((r) => r.cohort.label === label);
    return {
      label,
      ...COHORT_META[label],
      count: members.length,
      spend: members.reduce((s, r) => s + r.spendYtd, 0),
      invValue: members.reduce((s, r) => s + r.invSourcedValue, 0),
      members,
    };
  });
}

/* Low-stock / reorder computation */
export function lowStock() {
  return PRODUCTS.map((p) => {
    const oh = onHand(p.sku);
    let level = "OK";
    if (oh === 0) level = "Out of stock";
    else if (oh < p.reorderPoint) level = "Below reorder";
    else if (oh <= p.reorderPoint + p.safetyStock * 0.25) level = "Low";
    const suggested =
      level === "OK" ? 0 : Math.max(p.reorderPoint + p.safetyStock - oh, 0);
    return { ...p, onHand: oh, level, suggested };
  }).filter((p) => p.level !== "OK")
    .sort((a, b) => a.onHand - b.onHand);
}

/* KPI roll-ups for the overview */
export function totals() {
  const onShelf = STOCK.reduce((s, x) => s + x.onShelf, 0);
  const offShelf = STOCK.reduce((s, x) => s + x.offShelf, 0);
  const units = onShelf + offShelf;
  const value = STOCK.reduce((s, x) => {
    const p = productBySku(x.sku);
    return s + (x.onShelf + x.offShelf) * (p?.unitCost ?? 0);
  }, 0);
  return {
    skus: PRODUCTS.length,
    units,
    onShelf,
    offShelf,
    onShelfPct: units ? Math.round((onShelf / units) * 100) : 0,
    value,
    warehouses: WAREHOUSES.length,
    lowCount: lowStock().length,
  };
}

/* Units by category (for charts) */
export function unitsByCategory() {
  const map = {};
  STOCK.forEach((x) => {
    const p = productBySku(x.sku);
    const c = p?.category ?? "Other";
    map[c] = (map[c] ?? 0) + x.onShelf + x.offShelf;
  });
  return Object.entries(map).map(([name, units]) => ({ name, units }));
}

/* Units held per warehouse (from bin data) */
export function unitsByWarehouse() {
  const map = {};
  BINS.forEach((b) => {
    map[b.warehouse] = (map[b.warehouse] ?? 0) + b.qty;
  });
  return WAREHOUSES.filter((w) => map[w.id]).map((w) => ({
    name: w.id,
    units: map[w.id],
  }));
}

/* 6-month on-hand trend (demo series) */
export const STOCK_TREND = [
  { month: "Feb", onShelf: 820, offShelf: 1980 },
  { month: "Mar", onShelf: 910, offShelf: 2120 },
  { month: "Apr", onShelf: 870, offShelf: 2010 },
  { month: "May", onShelf: 960, offShelf: 2260 },
  { month: "Jun", onShelf: 1010, offShelf: 2340 },
  { month: "Jul", onShelf: 936, offShelf: 2165 },
];

export const CAD = (n) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
