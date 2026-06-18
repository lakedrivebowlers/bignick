const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pLimit = require('p-limit');

// --- CONFIGURATION ---
const INPUT_JSON = './zillow_data.json';
const OUTPUT_JSON = './zillow_data_local.json';
const BASE_IMAGE_DIR = './property_images';
const limit = pLimit(5); // Download 5 images at a time

// Helper to make address folder-friendly (e.g. "80 Baywood Ave" -> "80-baywood-ave")
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .trim();
}

async function downloadImage(url, folderPath, filename) {
    const filePath = path.join(folderPath, filename);
    if (fs.existsSync(filePath)) return;

    try {
        const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 15000 });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        console.error(`   ❌ Failed: ${filename} - ${err.message}`);
    }
}

async function start() {
    const rawData = fs.readFileSync(INPUT_JSON);
    const properties = JSON.parse(rawData);
    
    // This will hold our updated data with local paths
    const localData = [];

    console.log(`🚀 Starting download for ${properties.length} properties...`);

    if (!fs.existsSync(BASE_IMAGE_DIR)) fs.mkdirSync(BASE_IMAGE_DIR);

    for (const [index, prop] of properties.entries()) {
        const folderName = `${prop.zpid}_${slugify(prop.address_street)}`;
        const folderPath = path.join(BASE_IMAGE_DIR, folderName);

        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

        console.log(`[${index + 1}/${properties.length}] Processing: ${folderName}`);

        const localImagePaths = [];

        // Queue image downloads
        const downloadTasks = prop.images.map((url, imgIndex) => {
            const filename = `image_${imgIndex + 1}.jpg`;
            // Store the path as it will appear on your website
            localImagePaths.push(`./property_images/${folderName}/${filename}`);
            
            return limit(() => downloadImage(url, folderPath, filename));
        });

        await Promise.all(downloadTasks);

        // Add the property to our new local list
        localData.push({
            ...prop,
            images: localImagePaths // Replace Zillow URLs with local folder paths
        });
    }

    // Save the new JSON file
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(localData, null, 2));
    console.log(`\n✅ DONE!`);
    console.log(`1. Images saved to: ${BASE_IMAGE_DIR}`);
    console.log(`2. New data file created: ${OUTPUT_JSON}`);
}

start();