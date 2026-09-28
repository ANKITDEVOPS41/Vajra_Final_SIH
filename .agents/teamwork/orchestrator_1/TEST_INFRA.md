# E2E Test Infra: Convect Live Feeds & Visual Intelligence

## Test Philosophy
- Opaque-box, requirement-driven. Derives strictly from ORIGINAL_REQUEST.md.
- Methodology: Category-Partition + Boundary Value Analysis + Combinatorial Verification + Real-World Operational Scenarios.

## Feature Inventory Mapping
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------|:------:|:------:|:------:|:------:|
| 1 | IMD INSAT-3DR TIR WMS | R1.1 | 5 | 5 | ✓ | ✓ |
| 2 | RainViewer Doppler Radar Tiles | R1.2 | 5 | 5 | ✓ | ✓ |
| 3 | Live Surface Heat Field | R1.3 | 5 | 5 | ✓ | ✓ |
| 4 | Live MSLP Pressure & Isobars | R1.4 | 5 | 5 | ✓ | ✓ |
| 5 | Live Humidity & Saturation | R1.5 | 5 | 5 | ✓ | ✓ |
| 6 | Weather Format Switcher | R1.6 | 5 | 5 | ✓ | ✓ |
| 7 | Floating Calibrated Colorbars | R1.6 | 5 | 5 | ✓ | ✓ |
| 8 | Eradication of 20 Weather Circles | R2.1 | 5 | 5 | ✓ | ✓ |
| 9 | Eradication of Storm Bullseyes | R2.2 | 5 | 5 | ✓ | ✓ |
| 10 | Retain 1–3 km Runway Safety Rings | R2.3 | 5 | 5 | ✓ | ✓ |
| 11 | Retain Velocity Vectors & Intercept Rays | R2.4 | 5 | 5 | ✓ | ✓ |
| 12 | Visual Intel Key on /hazard | R3.1 | 5 | 5 | ✓ | ✓ |
| 13 | Visual Intel Key on /dashboard | R3.2 | 5 | 5 | ✓ | ✓ |
| 14 | Visual Intel Key on /hyperlocal | R3.3 | 5 | 5 | ✓ | ✓ |
| 15 | Visual Intel Key on /inference | R3.4 | 5 | 5 | ✓ | ✓ |
| 16 | Visual Intel Key on /case-replay | R3.5 | 5 | 5 | ✓ | ✓ |
| 17 | Visual Intel Key on /grid | R3.6 | 5 | 5 | ✓ | ✓ |
| 18 | Visual Intel Key on /microburst | R3.7 | 5 | 5 | ✓ | ✓ |
| 19 | 1-Line Tactical Ticker Mode | R4.1 | 5 | 5 | ✓ | ✓ |
| 20 | Universal Mission Briefing Modal | R4.2 | 5 | 5 | ✓ | ✓ |
| 21 | Cognitive Load & Visual Psychology | R4.3 | 5 | 5 | ✓ | ✓ |
| 22 | Build Integrity (npm run build) | Acceptance | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **E2E Test Runner**: Dedicated verification script `scripts/verify-e2e.ts` or `scripts/verify-all.mjs` executed via `npm run test:e2e` or `node scripts/verify-all.mjs`.
- **Static Code Analysis**: `grep` / AST inspection script verifying absence of artificial concentric `<Circle>` definitions and presence of 1–3 km rings and visual keys.
- **Network Verification**: Automated HTTP connectivity tests for IMD Geoserver WMS, RainViewer radar API, and Open-Meteo endpoint.
- **Build Verification**: `npm run build` executing `tsc -b && vite build` with zero errors.

## Coverage Thresholds
- **Tier 1**: ≥ 5 test checks per feature (110 checks).
- **Tier 2**: Boundary & corner cases (50 checks: timeouts, bad API responses, rapid format switching, mobile viewports).
- **Tier 3**: Cross-feature interactions (25 checks: switching weather format while 1-3km rings are active, opening Mission Briefing modal from every single page, hotkey triggers).
- **Tier 4**: Real-world application scenarios (10 operational scenarios: ATC Runway Go-Around, Ramp Ground Stop, NDMA Siren Trigger, Sluice Gate Pre-activation, Cherrapunji validation).
- **Total Minimum**: ≥ 195 verification assertions.
