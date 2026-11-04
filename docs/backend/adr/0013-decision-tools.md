# 0013: Service-level and working-capital decision tools in the browser

**Date:** 04/11/2026 · **Status:** Accepted

## Context

The dashboard explained what happened and what the policy recommends, but not the two questions a planning lead and a CFO actually trade off: *how much availability is worth paying for*, and *how much cash the inventory ties up and who is financing it*.

## Decision

Two views computed in the browser from the published month files, with no new backend endpoint:

- **Service Levels.** For each position, σ<sub>LT</sub> = √(L·σd² + d̄²·σL²). At cycle service level *s*: safety stock = z(*s*)·σ<sub>LT</sub>; expected units short per year = (annual demand ÷ EOQ)·σ<sub>LT</sub>·G(z), G = standard normal loss function. Yearly cost = safety stock × unit cost × 25% + units short × unit gross margin. A slider per ABC class; the cost-minimising level is found on a 0.5-point grid and checked in tests against the closed form 1 − Φ(z\*) = h·c ÷ (cycles·margin).
- **Working Capital.** DIO (network days of supply), DPO (supplier terms weighted by spend), the gap the business finances, inventory funded by open supplier invoices, excess above reorder point + EOQ, and DC stock by age.

## Findings at 31 Oct 2026 (synthetic data)

- Cost-minimising service levels are **higher** than policy in every class (A 98→99%, B 95→98.5%, C 90→97%): with ~58% gross margin, a lost sale costs far more than a year's holding. About $104K more safety stock lowers total yearly cost by ~$16.6K (7%).
- Suppliers fund 92% of inventory through open invoices; DIO 48 days vs DPO 40 days leaves 8.5 days financed by the business; one day of inventory ≈ $25K of cash. Excess stock is small ($16.7K) and almost nothing is older than 60 days.

## Consequences and limits

- The modelled fill rate (~99.8%) assumes the statistical policy is followed; the actual stock-out rate (~5%) reflects how the simulated business replenishes today. That **policy-compliance gap** is shown, not hidden.
- Assumes normal lead-time demand, lost sales (no backorders), and costs a DC shortage like a lost sale (upper bound). DPO is contractual, not observed payment behaviour.
- A production version would move the maths server-side and add multi-echelon optimisation (improvement plan R9).
