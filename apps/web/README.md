This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Service configuration

The Firebase web settings use `NEXT_PUBLIC_FIREBASE_*` variables. They are public client configuration, not Firebase Admin credentials. To use Google sign-in through Firebase, enable Google in Firebase Authentication, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to that provider's web client ID for Google Identity Services, and configure the API server with `FIREBASE_PROJECT_ID` plus a Firebase Admin service account. For local development, download the service account JSON from Firebase Console → Project settings → Service accounts → Generate new private key and save it as `apps/api/secrets/firebase-service-account.json`. The root `.env.example` points to that ignored file by default. Never commit or place its private key in web variables. The web Firebase config alone cannot generate this Admin credential.

GeoChat does not use a separately issued API key in this project. Its VQA and grounding endpoints run the local `MBZUAI/geochat-7B` adapter; the root `.env.example` expects the checkpoint at `apps/api/models/geochat-7B` when running the API from `apps/api`. Set `GEOCHAT_MODEL_PATH` to your actual checkpoint directory, and configure `GEOCHAT_MODEL_BASE` and `GEOCHAT_DEVICE` when required by the upstream runtime. This path setting does not download model weights or create a third-party API key. The model registry reports the unavailable state until the runtime and weights are installed.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
