# School Payments & Finance Management Portal

A cross-platform mobile app for managing school fees. Parents pay bills online, bursars collect and track payments, and administrators manage students, parents and staff roles — all from one Expo / React Native app that talks to the FMS backend API.

## Features

The app shows a different set of screens depending on the role in the signed-in user's JWT.

| Role | What they can do |
| --- | --- |
| **Parent** | View linked children, see outstanding bills, pay online via Paystack, browse payment history and receipts |
| **Bursar** | Finance dashboard, payments ledger, record payments, manage bills/utilities and their prices, view debtors and student profiles |
| **Admin** | Dashboard, enroll students, link parents to students, manage user roles, record cash payments, payments reports, fees & utilities |
| **Principal** | Same screens as Admin, but cannot assign the admin role |
| **Teacher** | Profile and password management (no teacher-facing API yet) |

Shared across roles:

- Sign in, register, forgot / reset password, change password
- Payment receipts
- Light and dark theme (follows the system, can be overridden)
- Finance diagnostics with donut charts and date ranges (today, this week, this month, last three months)
- Amounts shown in Ghanaian Cedis (GH₵)

## Tech stack

- [Expo](https://expo.dev) SDK 57, React Native 0.86, React 19, TypeScript
- [React Navigation](https://reactnavigation.org) 7 (native stack + bottom tabs)
- `expo-secure-store` for the auth token, `react-native-webview` for Paystack checkout
- `react-native-svg` for charts, `react-native-reanimated` + `react-native-keyboard-controller` for UI
- `zod` for validation
- pnpm for package management

## Getting started

### Prerequisites

- Node.js (LTS) and [pnpm](https://pnpm.io)
- The FMS backend API running and reachable from your device or emulator
- Expo Go, or an Android emulator / iOS simulator

### Install

```bash
git clone git@github.com:dcs-edu/fms-f1.git
cd fms-f1
pnpm install
```

### Point the app at your API

The backend URL is set at build time in [`src/constants/config.ts`](src/constants/config.ts) — there's no in-app setting for it. Edit `DEFAULT_API_URL` before running or building:

```ts
export const DEFAULT_API_URL = 'https://api.your-school.com';
```

For local development:

- **iOS simulator** — `http://localhost:8080` works.
- **Android emulator** — use `http://10.0.2.2:8080` (the emulator's alias for your machine's localhost).
- **Physical device** — use your machine's LAN IP, e.g. `http://192.168.1.20:8080`. The phone and computer must be on the same network.

For a release build, set it to your hosted backend's URL (use HTTPS). Admins can see the configured server on their Profile screen.

### Run

```bash
pnpm start      # start the Expo dev server, then scan the QR code or press a / i
pnpm android    # open on Android
pnpm ios        # open on iOS
pnpm web        # open in the browser
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm android` / `pnpm ios` / `pnpm web` | Start and open on a platform |
| `pnpm lint` | Lint with ESLint (`expo lint`) |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm exec expo-doctor` | Diagnose dependency and config issues |

Add dependencies with `pnpm exec expo install <package>` so you get versions compatible with the Expo SDK.

## Project structure

```
.
├── App.tsx                 # Providers: safe area, keyboard, theme, auth, navigation
├── index.ts                # Entry point
├── app.json                # Expo config
├── assets/                 # Icons and splash images
└── src/
    ├── api/                # API client (fetch + JWT) and response types
    ├── components/
    │   ├── charts/         # Donut chart
    │   ├── common/         # Buttons, inputs, cards, badges, banners, spinner
    │   ├── finance/        # Metric tiles, date range selector
    │   └── payments/       # Bill forms, receipts, Paystack WebView modal
    ├── constants/          # App config, grades, keyboard settings
    ├── contexts/           # AuthContext, ThemeContext
    ├── hooks/              # useStudentBillLookup
    ├── navigation/         # RootNavigator (role-based) and route param types
    ├── screens/
    │   ├── auth/           # Login, register, forgot password
    │   ├── parent/         # Children, child detail, pay bill, history
    │   ├── bursar/         # Ledger, collect payment, bills
    │   ├── admin/          # Enroll, link parent, roles, cash payment
    │   ├── finance/        # Dashboard, debtors, payments report
    │   ├── students/       # Student list and profile
    │   └── shared/         # Profile, change password, receipt
    ├── theme/              # Colors, spacing, typography
    └── utils/              # Currency, JWT, finance helpers, student IDs
```

## How it works

- **Auth** — `POST /auth/login` returns a JWT. It's stored in Secure Store, decoded on startup, and dropped if expired. The `role` claim decides which navigator `RootNavigator` renders.
- **Online payments** — the app starts a payment with `POST /payments/online`, opens the Paystack checkout in a WebView, and verifies the transaction with `/payments/online/:reference` once Paystack redirects back.
- **Student IDs** — formatted as `YY-NNNN` (e.g. `30-0042`), built from a student's graduation year and sequence number. `src/utils/studentId.ts` mirrors the backend's `pkg/studentid.go`.

## Building for release

Builds are done in the cloud with [EAS](https://docs.expo.dev/eas/):

```bash
pnpm dlx eas-cli build --platform android
pnpm dlx eas-cli build --platform ios
```

The `ios/` and `android/` folders are generated and git-ignored — configure native settings in `app.json` instead of editing them.

## Contributing

1. Create a branch off `main`.
2. Make your changes and run `pnpm lint` and `pnpm exec tsc --noEmit`.
3. Open a pull request against `main`.

## License

Copyright (C) 2026 Jxt-Eli

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE). You're free to use, modify and self-host it, but if you distribute it or run a modified version as a service, you must release your source code under the same license.

If you want to use it in a closed-source or commercial product without those obligations, open an issue to ask about a commercial license.
