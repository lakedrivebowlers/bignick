const { createClient } = require('contentful-management');
const pLimit = require('p-limit');
const fs = require('fs');

// --- CONFIGURATION --- 
const SPACE_ID = 'eiaqo18e2wso';
const ENVIRONMENT_ID = 'master'; 
const MANAGEMENT_TOKEN = 'YOUR_TOKEN_HERE"'; 
const JSON_FILE_PATH = './zillow_data.json'; 

// 1. Initialize as a PLAIN client
const client = createClient({
    accessToken: MANAGEMENT_TOKEN
}, {
    type: 'plain' // This bypasses many organizational metadata permission checks
});

const limit = pLimit(1);

function mapPropertyType(zillowType) {
    if (!zillowType) return 'house';
    const type = zillowType.toUpperCase();
    if (type.includes('SINGLE_FAMILY')) return 'house';
    if (type.includes('CONDO')) return 'condo';
    if (type.includes('TOWNHOUSE')) return 'townhouse';
    if (type.includes('APARTMENT')) return 'apartment';
    if (type.includes('MULTI_FAMILY')) return 'commercial';
    return 'house'; 
}

// 2. Updated Image Upload for Plain Client
async function uploadImage(imageUrl, propertyName) {
    try {
        let asset = await client.asset.create({ spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID }, {
            fields: {
                title: { 'en-US': `Hero Image: ${propertyName}` },
                file: {
                    'en-US': {
                        contentType: 'image/jpeg',
                        fileName: `${propertyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`,
                        upload: imageUrl
                    }
                }
            }
        });

        // Plain client requires you to pass IDs to every step
        asset = await client.asset.processForAllLocales({ spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID }, asset);
        asset = await client.asset.publish({ spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID, assetId: asset.sys.id }, asset);
        
        console.log(`   -> Successfully uploaded image: ${propertyName}`);
        return asset.sys.id;
    } catch (error) {
        console.error(`   -> Failed image upload: ${propertyName}`, error.message);
        return null;
    }
}

async function runImport() {
    try {
        console.log('Connecting to Contentful (Plain Mode)...');
        
        // Test connection immediately
        const space = await client.space.get({ spaceId: SPACE_ID });
        console.log(`Connected to Space: ${space.name}`);

        const rawData = fs.readFileSync(JSON_FILE_PATH);
        const properties = JSON.parse(rawData);
        console.log(`Found ${properties.length} properties. Starting...`);

        const importTasks = properties.map((property, index) => limit(async () => {
            console.log(`Processing ${index + 1}/${properties.length}: ${property.address_street}`);

            let mainImageId = null;
            if (property.images && property.images.length > 0) {
                mainImageId = await uploadImage(property.images[0], property.address_street);
            }

            const entryFields = {
                internalName: { 'en-US': `${property.address_street} - ${property.zpid}` },
                slug: { 'en-US': `${property.address_street.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${property.zpid}` },
                title: { 'en-US': property.address_street }, 
                price: { 'en-US': property.price || 0 },
                beds: { 'en-US': property.num_beds || 0 },
                baths: { 'en-US': property.num_baths || 0 },
                sqft: { 'en-US': property.living_area_sqft || 0 },
                description: { 'en-US': `Property located in ${property.address_city}, ${property.address_state}.` },
                listingType: { 'en-US': 'for_sale' }, 
                availability: { 'en-US': 'available' }, 
                address: { 'en-US': property.address_street },
                city: { 'en-US': property.address_city },
                state: { 'en-US': property.address_state },
                zipCode: { 'en-US': property.address_zip },
                propertyType: { 'en-US': mapPropertyType(property.type) },
                featured: { 'en-US': false }, 
                latitude: { 'en-US': property.latitude || 0 },
                longitude: { 'en-US': property.longitude || 0 }
            };

            if (mainImageId) {
                entryFields.mainImage = { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: mainImageId } } };
            }

            try {
                // Using client.entry.create for Plain Client
                let entry = await client.entry.create({ 
                    spaceId: SPACE_ID, 
                    environmentId: ENVIRONMENT_ID, 
                    contentTypeId: 'pageBlogPost' 
                }, { fields: entryFields });
                
                await client.entry.publish({ 
                    spaceId: SPACE_ID, 
                    environmentId: ENVIRONMENT_ID, 
                    entryId: entry.sys.id 
                }, entry);
                
                console.log(`   ✅ Success: ${property.address_street}`);
            } catch (err) {
                console.error(`   ❌ Failed Entry: ${property.address_street}`, err.message);
            }
        }));

        await Promise.all(importTasks);
        console.log('--- ALL IMPORTS FINISHED ---');

    } catch (err) {
        console.error('Fatal Error during import:', err.message);
    }
}

runImport();