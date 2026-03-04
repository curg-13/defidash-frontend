# Protocol & Token Logo Sourcing Guide

When adding new protocols or tokens to the application, it's best practice to use local images rather than relying on external image URLs. This ensures faster load times and prevents broken images if the external URLs change or go down.

Here is the step-by-step process we used to find and collect these logos:

## 1. Using CoinGecko (Recommended for Most Tokens & Protocols)

CoinGecko's image CDN (`coin-images.coingecko.com`) provides high-quality imagery for almost all legitimate crypto projects.

**Steps:**

1. Call the CoinGecko Search API with the protocol/token name:
   `https://api.coingecko.com/api/v3/search?query=[NAME]`
   _(e.g., `query=suilend` or `query=navi+protocol`)_
2. Find the target item in the JSON response and extract the `large` image link.
   Example URL: `https://coin-images.coingecko.com/coins/images/.../large/....png`
3. If using the exact Coin ID (e.g., `okx-wrapped-btc`, `sui`, `usd-coin`, `lombard-staked-btc`), you can query the exact Coin info endpoint and parse out the large image URL:
   `https://api.coingecko.com/api/v3/coins/[COIN_ID]`
4. Download the image using curl or a similar tool:
   `curl -sSL "https://coin-images.coingecko.com/coins/images/..." -o src/assets/tokens/token_name.png`

## 2. Using DefiLlama Protocol API (Great for Protocols)

DefiLlama tracks many protocols and has a standardized repository for SVG/PNG logos.
**Steps:**

1. Fetch protocol data:
   `https://api.llama.fi/protocols`
2. Search for the specific protocol's name and extract the `logo` attribute.
   Example: `https://icons.llama.fi/suilend.png`

## 3. Extracting Directly from the Protocol's Web Code

If the token/protocol cannot be found on major trackers (rare), look for the raw SVGs or transparent PNGs on their official website.
**Steps:**

1. Use a standard `curl` or browser inspector on the official site domain.
2. Search for common logo paths: `<img src=".../logo.svg"` or `<link rel="icon" ...>`
3. Alternatively, check the protocol's GitHub repositories for a public graphics/brand kit folder containing `.svg` files.

## Summary Checklist

- Tokens: Store inside `src/assets/tokens/`
- Protocols: Store inside `src/assets/protocols/`
- Standardize all images internally using robust, verified sources like CoinGecko.
