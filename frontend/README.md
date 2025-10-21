This is the Next.js frontend for the Customer Success Copilot. It calls backend tools via HMAC‑signed requests from server actions and renders planner results.

## Getting Started

Environment (server-only):

```
cp .env.example .env.local
BACKEND_BASE_URL=http://127.0.0.1:8787
HMAC_SECRET=<same as backend>
HMAC_CLIENT_ID=copilot-frontend
```

Install deps and run the development server:

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

Home page form submits to a server action which calls the planner: usage → tickets → contract → health → email. Results include tool timings and errors.

Contracts: Zod schemas in `src/contracts/tools.ts` validate responses to surface failures.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
