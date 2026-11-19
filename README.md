# Flickit

Starter customer storefront for Dimapur. The Next.js website and Flutter app use the same Node.js catalogue API. Both clients have search and an in-memory shopping bag. The API serves demo data by default and can read the catalogue from MongoDB Atlas.

## Run the website

From the root with Node.js 22 or later:

```sh
npm ci
npm run dev -w @dimapur/api
```

In a second terminal:

```sh
npm run dev -w @dimapur/web
```

Open http://localhost:3000. The web server uses http://localhost:4000 by default. Set `API_ORIGIN` if the API runs elsewhere. The API exposes `GET /health` and `GET /v1/products`. Prices are in paise.

## Use MongoDB Atlas

Copy `api/.env.example` to `api/.env` and set `MONGODB_URI` to the development cluster's connection string. With a database user authorized for this database, run `npm run seed -w @dimapur/api`, then restart the API. The seed inserts missing demo products while preserving existing catalogue records.

## Run the Flutter app

Install Flutter and Android or iOS tooling. Generate the native project shells before the first build:

```sh
cd mobile
flutter create --platforms=android,ios --android-language=kotlin --org com.dimapurmkt --project-name dimapur_market .
flutter pub get
flutter run --dart-define=API_ORIGIN=https://your-development-api.example
```

Use a reachable HTTPS API endpoint for device testing. Add the Android INTERNET permission to the generated main manifest for release builds. Kotlin is the Android integration language. This storefront slice uses Flutter for the UI and does not require a custom platform channel.

## Pending features

Accounts and shared carts, coverage checks, inventory reservations, checkout, payments, order status, and fulfilment tools are pending. The current shopping bag resets when the client restarts.

## Marketplace setup

The public web storefront supports delivery-area selection and filtering by category, brand, and delivery mode. Listings reference a seller-owned warehouse and carry an independent price, variety and stock count. Warehouse service zones determine an instant delivery estimate from 30 to 120 minutes. Standard shipping is a separate warehouse setting. Demo locations, sellers, estimates and stock are illustrative.

Set a random server-only `MARKETPLACE_ADMIN_TOKEN` of 32 characters or more to enable the admin API. Use that token as a Bearer credential over HTTPS. `GET /v1/admin/marketplace` reads the full configuration. `PUT /v1/admin/marketplace` validates and replaces the full configuration in MongoDB. The shape is shown by `demoMarketplace` in `api/marketplace.js`. With Atlas configured and no marketplace configuration saved, the original products collection remains available. `GET /v1/marketplace` exposes locations and accepted payment methods, and `GET /v1/products?location=<id>` returns eligible listings.

The admin API controls marketplace data. A seller portal, stock reservation, COD and online checkout, shipping rates and carrier integration are pending. The Flutter storefront reads the shared catalogue and still needs the location and delivery controls.

## Render production API

Deploy the Node API with `npm ci` and `npm run start -w @dimapur/api`.
Set `MONGODB_URI` as a Render secret, set `MONGODB_DATABASE=flickit`,
and set `FLICKIT_REQUIRE_DATABASE=true` so the API refuses to start
without a reachable database. Use `/health` to verify that the service
reports `mode: mongodb` after the deploy, then verify the catalogue.
The database user needs permissions scoped to the Flickit database.

Open `/admin` on the Next.js storefront to edit delivery areas, sellers,
warehouses, listings, and accepted payment methods. Use the API's configured
`MARKETPLACE_ADMIN_TOKEN` to load settings. The web app forwards the token to the
API for each request and does not persist it. Demo data can be viewed and edited
locally in the form. Saving is available only when the API uses MongoDB.

The web storefront supports cash-on-delivery checkout once MongoDB is connected,
a marketplace configuration exists, and COD is enabled. Checkout uses current
stock, prices and delivery eligibility. Confirmation and stock deduction are
atomic, and retrying an unchanged request uses the same order. Admin saves include
the current configuration revision so an order cannot be overwritten by a stale
admin form. This first checkout includes the item subtotal only. Fulfilment
operations, delivery fees, carrier booking, and online payment remain pending.

For the demo web deployment, set `FLICKIT_DEMO_CATALOGUE_FALLBACK=true`
to show the shared sample catalogue when the API is unreachable. The UI
labels the fallback and disables checkout. Remove this flag before going
live with real inventory.
