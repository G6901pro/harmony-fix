# Harmony Fix

Please clone and build the complete project directly from my public GitHub repository:

https://github.com/G6901pro/shop-health-harmony

STRICT MINIMAL FIX: FIX ADMIN AUTHORIZATION (403 ERROR) AND "ADD TO BAG" SOLD OUT BUG

Do NOT overhaul or rewrite the design, layout, or unrelated components. Perform a surgical fix for ONLY these 2 issues:

1. FIX ERROR 403 (UNAUTHORIZED ACCESS):

- Check the Admin authorization guard / role check logic.

- Ensure logged-in users with admin role (or main user session) can access the admin dashboard without getting "Error 403: Unauthorized access".

- If checking Supabase user metadata / user_roles table, fallback gracefully so authorized admins are not blocked.

2. FIX "ADD TO BAG" / IS SOLD OUT BUG:

- In the product listing card component, fix the click handler for "Add to Bag".

- Ensure that clicking "Add to Bag" correctly adds the product to the cart without showing a false "(product) is sold out" error toast/alert when stock is available.

- Ensure stock checking directly pulls accurate data or defaults to available if stock_quantity > 0.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/103be9ed-786b-4d6c-955c-070986bf979d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
