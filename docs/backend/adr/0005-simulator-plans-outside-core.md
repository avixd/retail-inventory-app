# 0005 · Keep the simulator's future events out of the system of record

Date: 02/11/2026 · Status: accepted

## Context

The simulator decides some things in advance: when an approved PO will actually arrive, whether it will be short-shipped, when an invoice will be paid. Between nightly runs those decisions must survive. Storing them on `core.purchase_order` would mix facts ("approved on 3 Oct") with predictions ("will arrive 21 Oct") in the table the business would treat as truth.

## Decision

- `core` holds only events that have happened.
- Pending events live in `ops.sim_plan` (one JSON plan per open PO, transfer or invoice), document counters in `ops.sim_counter`, and run parameters in `ops.sim_config`.
- The nightly job rebuilds the simulator's state from `core` + `ops` and continues. Each day's randomness is seeded from (seed, date), so results don't depend on how many draws came before.

## Consequences

- A unit test proves that save → reload → continue produces byte-identical output to an uninterrupted simulation, over five days.
- The analytics layer and API never see simulation internals; replacing the simulator with a real ERP feed would touch `ops`, not `core` or anything downstream.
