const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB, Project } = require('../models');

// Target Organization ID from your prompt
const ORG_ID = "6a102b819a66acbf2f63a182";
const MIGRATION_FILE_PATH = path.join(__dirname, 'process_migration.js');

const LOCATION_NAMES = [
  "BYPASS ROSHAN",
  "MDU ANNA NAGAR",
  "ROSHAN AC",
  "ROSHAN ADYAR",
  "ROSHAN ALWARPET",
  "ROSHAN AMBATTUR",
  "ROSHAN ANNANAGAR",
  "ROSHAN AVINASHI SALAI",
  "ROSHAN BAGS GORIPALAYAM2",
  "ROSHAN CHROMEPET",
  "ROSHAN CHROMPET",
  "ROSHAN COIMBATORE OPP",
  "ROSHAN COIMBATORE R.S.P",
  "ROSHAN COMPANY PALAYAMKOTTAI",
  "ROSHAN COMPANY TIRUNELVELI",
  "ROSHAN ERODE",
  "ROSHAN GORIPALAYAM",
  "ROSHAN GOWRIWAKKAM",
  "ROSHAN HOSUR",
  "ROSHAN MALL",
  "ROSHAN NAGERCOIL",
  "ROSHAN NOVELTIES",
  "ROSHAN OMR",
  "ROSHAN PONDICHERRY",
  "ROSHAN SALEM",
  "ROSHAN SHOLINGANALLUR",
  "ROSHAN SMS",
  "ROSHAN THANJAVUR",
  "ROSHAN TIRUPUR",
  "ROSHAN TNAGAR",
  "ROSHAN TOWNHALL (TH)",
  "ROSHAN TRICHY",
  "ROSHAN TRICHY 3 LOCATION",
  "ROSHAN TUTICORIN",
  "ROSHAN VALASARAVAKKAM",
  "ROSHAN VELACHERY",
  "ROSHAN VELORE",
  "ROSHAN WT",
  "ROSHAN WT2",
  "ROSHAN-WAREHOUSE",
  "ROSHANTRICHY2LOCATION",
  "Roshan Market Street"
];

async function main() {
  console.log(`Connecting to DB to create ${LOCATION_NAMES.length} outlets...`);
  await connectDB();

  const updatedMap = {};

  for (const name of LOCATION_NAMES) {
    if (!name) continue; // Skip empty name

    // Find or create the outlet
    let outlet = await Project.findOne({ restId: name, belongsTo: ORG_ID });
    if (!outlet) {
      outlet = await Project.create({
        outletName: name,
        restId: name,
        belongsTo: ORG_ID,
        isActive: true
      });
      console.log(`[CREATED] Outlet: "${name}" -> ID: ${outlet._id}`);
    } else {
      console.log(`[FOUND]   Outlet: "${name}" -> ID: ${outlet._id}`);
    }

    updatedMap[name] = outlet._id.toString();
  }

  console.log(`\nAll outlets processed. Updating process_migration.js...`);

  // Read process_migration.js and rewrite the LOCATION_OUTLET_MAP block
  let content = fs.readFileSync(MIGRATION_FILE_PATH, 'utf8');
  
  const mapStartStr = "const LOCATION_OUTLET_MAP = {";
  const mapEndStr = "};";
  
  const startIndex = content.indexOf(mapStartStr);
  const endIndex = content.indexOf(mapEndStr, startIndex);
  
  if (startIndex !== -1 && endIndex !== -1) {
    let newMapContent = "const LOCATION_OUTLET_MAP = {\n";
    newMapContent += `  "": DEFAULT_OUTLET_ID,\n`; // preserve empty
    for (const name of LOCATION_NAMES) {
      newMapContent += `  "${name}": "${updatedMap[name]}",\n`;
    }
    newMapContent += "}";
    
    // Replace the block
    content = content.substring(0, startIndex) + newMapContent + content.substring(endIndex + 2);
    
    // Ensure Org ID is updated in the migration script as requested
    content = content.replace(/const MIGRATION_ORG_ID = ".*?";/, `const MIGRATION_ORG_ID = "${ORG_ID}";`);

    fs.writeFileSync(MIGRATION_FILE_PATH, content, 'utf8');
    console.log("Successfully updated process_migration.js with new Outlet IDs!");
  } else {
    console.error("Error: Could not find LOCATION_OUTLET_MAP block in process_migration.js");
  }

  await disconnectDB();
  console.log("Setup complete!");
}

main().catch(err => {
  console.error(err);
});
