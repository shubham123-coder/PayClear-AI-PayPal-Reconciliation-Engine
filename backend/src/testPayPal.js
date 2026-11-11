// 1. Load our secret credentials from the .env file
require('dotenv').config();

// 2. A function to ask PayPal for an Access Token
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  console.log("Checking credentials...");
  if (!clientId || !clientSecret) {
    console.error("❌ Error: Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env file!");
    return;
  }

  // 3. PayPal Sandbox OAuth URL
  const url = "https://api-m.sandbox.paypal.com/v1/oauth2/token";

  // 4. PayPal requires ClientID:ClientSecret joined together and encoded in Base64
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    console.log("Contacting PayPal Sandbox front desk...");

    // 5. Send an HTTP POST request to PayPal
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    // 6. Convert PayPal's reply into readable JSON
    const data = await response.json();

    if (!response.ok) {
      console.error("❌ PayPal rejected our credentials:", data);
      return;
    }

    console.log("\n🎉 SUCCESS! Connected to PayPal Sandbox!");
    console.log("-----------------------------------------");
    console.log("Your Access Token begins with:", data.access_token.substring(0, 25) + "...");
    console.log("Token Type:", data.token_type);
    console.log("Expires In:", data.expires_in, "seconds (about 9 hours)");
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("❌ Network error connecting to PayPal:", error.message);
  }
}

// Run the function
getPayPalAccessToken();