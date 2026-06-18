const { createClient } = require("contentful-management");

const client = createClient({ 
  accessToken: "YOUR_TOKEN_HERE"  //  
}, { 
  type: "plain" 
});

async function test() {
  try {
    // We are adding the Organization ID directly to the request
    const space = await client.space.get({ 
        spaceId: "eiaqo18e2wso",
        headers: {
            "X-Contentful-Organization": "032VoD3PgFghej7EhpUtOh"
        }
    });
    console.log("✅ Success! Connected to:", space.name);
  } catch (err) {
    // If this fails, it will tell us exactly why
    console.error("❌ Failed:", err.message);
    if (err.details) console.log("Details:", JSON.stringify(err.details));
  }
}

test();