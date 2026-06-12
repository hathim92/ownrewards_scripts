const { connectDB, disconnectDB, Customer, Project } = require('../models');

async function main() {
  console.log("Starting OwnRewards scripts test execution...");

  try {
    // 1. Connect to the database
    await connectDB();

    // 2. Query data
    console.log("\nSearching for customers in the database...");
    const customerCount = await Customer.countDocuments();
    console.log(`Total customers found: ${customerCount}`);

    const sampleCustomer = await Customer.findOne();
    if (sampleCustomer) {
      console.log(`\nSample Customer Info:`);
      console.log(`- ID: ${sampleCustomer._id}`);
      console.log(`- Name: ${sampleCustomer.name || 'N/A'}`);
      console.log(`- Phone: ${sampleCustomer.phoneNo || 'N/A'}`);
      console.log(`- Tier: ${sampleCustomer.tier || 'N/A'}`);
      console.log(`- Balance Points: ${sampleCustomer.transaction?.balancePoints || 0}`);
    } else {
      console.log("No customers found in database.");
    }

    console.log("\nSearching for outlets in the database...");
    const outletCount = await Project.countDocuments();
    console.log(`Total outlets found: ${outletCount}`);

    const sampleOutlet = await Project.findOne();
    if (sampleOutlet) {
      console.log(`\nSample Outlet Info:`);
      console.log(`- ID: ${sampleOutlet._id}`);
      console.log(`- Name: ${sampleOutlet.outletName || 'N/A'}`);
      console.log(`- POS: ${sampleOutlet.posName || 'N/A'}`);
    }

  } catch (err) {
    console.error("An error occurred during execution:", err.message);
  } finally {
    // 3. Disconnect from database
    await disconnectDB();
    console.log("\nScript execution finished successfully.");
  }
}

main();
