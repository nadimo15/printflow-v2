# PrintFlow V2 — Official Archive & Cleanup Report
**Date:** March 2026
**Status:** Cleaned, Verified, Production-Ready

## Project Objective
This cleanup was executed to safely strip away legacy, duplicate, and unused code from the PrintFlow V2 project while keeping the active business logic intact. A safe archiving approach was prioritized.

## 📁 1. Files & Folders Archived

The following unused, legacy, or abandoned files have been moved securely to `_legacy_archive/` to ensure no active code is confused with historical work:

**Root Level**
- `.legacy-backend-deprecated/` : Old local Node.js backend. The system has fully migrated to Insforge (BaaS).
- `deploy/`, `deploy-dist/`, `deploy-dist-admin/` : Duplicate/old manual deployment output folders.
- `shared/` : Containing an unused `types.ts` that frontends do not reference.
- `deploy_store.bat`, `ecosystem.config.js`, `setup.ps1`, `start-all.ps1` : Local runner scripts tied to the deprecated backend model.

**Frontend ERP (`frontend-erp`)**
- `src/pages/TasksPage.tsx` : Abandoned page design; routing points to `ProductionBoardPage.tsx`.
- `src/components/ProductModal.tsx` : Legacy early version of the editor.
- `src/components/product-editor/[...Tabs].tsx` : Old segmented tabs (`ShippingWeightTab`, `PricingTab`, `AttributesTab`, etc.) rendered obsolete by the new unified `ProductEditorModal.tsx`.
- `src/utils/productDomain.ts` : Domain logic tied to the deprecated editor tabs.
- `src/store/syncStore.ts` & `src/store/productsStore.ts` : Unused Zustand stores (state management is handled properly in active areas via React Query / active stores).

**Frontend Store (`frontend-store`)**
- `src/{components,pages,...}/` : An empty typo generation folder created inadvertently during project history.

## 🗑️ 2. Files Deleted
Artifacts that served absolutely zero purpose (junk/temp responses) were permanently removed to free space:
- `payload.json`
- `response.json`

## ✅ 3. Files & Folders Kept (Active Architecture)

The project heavily relies on this cleaned configuration:
- `frontend-erp/`: The admin dashboard SPA (Vite + React + Insforge SDK).
- `frontend-store/`: The B2C e-commerce frontend (Vite + React + Insforge SDK).
- `edge-functions/`: Deno-compatible backend logic executed directly upon Insforge's servers.
- `package.json` (Root): The orchestration package defining the `npm run build` command that generates the single cohesive output layout for Vercel/Hostinger delivery.

## 🔍 4. Verification & Validation
- **Integrity Check:** `npm run build` compiles both the `frontend-store` and `frontend-erp` seamlessly.
- **Dependency Paths:** No orphaned references were found.
- **Route Checking:** Validated all App.tsx endpoints.

## 🎯 Important Notes for Future Maintenance
- **Backend:** DO NOT attempt to stand up a local Express backend. Any backend updates MUST happen via Insforge or the `edge-functions/`.
- **Compiling:** The deploy process triggers building the store and ERP sequentially, injecting the ERP inside `/admin` routing inside the store's output. Ensure custom hosting points correctly (see `vercel.json` rewrite rules).
