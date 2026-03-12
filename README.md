# PrintFlow V2

PrintFlow V2 is a full-stack, dual-application ecosystem consisting of an eCommerce Storefront and a comprehensive Enterprise Resource Planning (ERP) Dashboard. The entire system is powered securely by Insforge as the Backend-as-a-Service (BaaS).

## System Architecture

The project contains two highly decoupled Frontends (SPAs) sharing an external backend:

1. **`frontend-store/`**: The public-facing customer portal.
2. **`frontend-erp/`**: The staff management dashboard.
3. **`edge-functions/`**: Deno-compatible serverless functions executed natively upon Insforge (for processing strict backend calculations like Inventory BOM deduction).

There is **no localized Node.js server runtime** needed for this application.

## Run Development Servers

To run the apps locally:

**Storefront:**
```bash
cd frontend-store
npm install
npm run dev
```

**ERP Dashboard:**
```bash
cd frontend-erp
npm install
npm run dev
```

## Production Build

The root `package.json` contains a unified production build sequence. Running `npm run build` from the project root will:
1. Compile the Storefront.
2. Compile the ERP.
3. Combine both architectures such that the ERP serves beautifully from the `/admin` subdirectory of the final deployment structure.

```bash
npm install
npm run build
```
Once completed, the production-ready code is located inside `frontend-store/dist/`.

## Deployment

The project output is fully static HTML/JS/CSS assets.
- **Vercel**: Deploy the `frontend-store/dist/` directory, the existing `vercel.json` rules will map routes automatically.
- **Hostinger/Apache**: Simply push `frontend-store/dist/` to `public_html` and utilize an `.htaccess` pointing catch-all requests to `index.html` logic.

### Notes
- *For details regarding legacy code cleaning/archiving, read `CLEANUP_REPORT.md`.*
