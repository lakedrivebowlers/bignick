const fs = require('fs');

const FILE_PATH = './zillow_data_local.json';

// Load the data
const properties = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

/**
 * OPTION A: Update specific identifiers (ZPIDs)
 */
const soldIds = ['19273164', '15880736']; // Add the IDs you want to mark as SOLD

/**
 * OPTION B: Randomly mark a percentage as SOLD (e.g., 20%) OYA
 
*/
const randomUpdate = true;
const percentage = 0.001;


const updatedProperties = properties.map(prop => {
  // Logic for specific IDs
  if (soldIds.includes(prop.zpid.toString())) {
    prop.status = 'SOLD';
  } 
  // Logic for random selection
  else if (randomUpdate && Math.random() < percentage) {
    prop.status = 'SOLD';
  }
  
  return prop;
});

// Save it back to the file
fs.writeFileSync(FILE_PATH, JSON.stringify(updatedProperties, null, 2));

console.log(`Successfully updated ${FILE_PATH}`);