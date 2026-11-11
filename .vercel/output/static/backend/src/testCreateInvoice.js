// This script simulates a user clicking "Send Invoice" on the frontend

async function testInvoiceCreation() {
  console.log("Simulating invoice creation from user...\n");

  const newInvoicePayload = {
    customerName: "Sarah Jenkins",
    customerEmail: "sarah@jenkinsdesign.com",
    amountDollars: "150.00"
  };

  try {
    const response = await fetch("http://localhost:5000/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newInvoicePayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to create invoice:", data);
      return;
    }

    console.log("🎉 INVOICE SUCCESSFULLY CREATED & SAVED!");
    console.log("------------------------------------------");
    console.log("Internal DB ID:       ", data.id);
    console.log("PayPal Invoice ID:    ", data.paypalInvoiceId);
    console.log("Invoice Number:       ", data.invoiceNumber);
    console.log("Customer:             ", data.customerName);
    console.log("Total Amount (Cents): ", data.totalAmountCents, `($${data.totalAmountCents / 100})`);
    console.log("Status:               ", data.status);
    console.log("------------------------------------------");

  } catch (error) {
    console.error("Network error:", error.message);
  }
}

testInvoiceCreation();