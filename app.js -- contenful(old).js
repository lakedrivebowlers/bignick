// Replace these with your actual keys from Contentful Settings > API Keys
const SPACE_ID = 'eiaqo18e2wso';
const ACCESS_TOKEN = 'O6hnabgg0liVMyHieFVpw-x6K59brt3bEdJxweynxko';
// =========================================================
// CONTENTFUL CONFIG
// =========================================================

const client = contentful.createClient({
  space: SPACE_ID,
  accessToken: ACCESS_TOKEN
});

// =========================================================
// HELPER FUNCTIONS
// =========================================================

// Format price nicely
function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString()}`;
}

// Safe image handler
function getImageUrl(imageField) {
  if (imageField && imageField.fields && imageField.fields.file) {
    return `https:${imageField.fields.file.url}`;
  }
  return 'https://via.placeholder.com/800x600?text=No+Image';
}

// NEW: Open Lightbox Function
function openLightbox(imageUrl) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  
  if (lightbox && lightboxImg) {
    lightboxImg.src = imageUrl;
    lightbox.style.display = 'flex';
  }
}

// =========================================================
// FETCH ALL LISTINGS
// =========================================================

function fetchListings() {
  const grid = document.getElementById('property-grid');
  if (!grid) return;

  grid.innerHTML = '<p>Loading properties...</p>';

  client.getEntries({
    content_type: 'pageBlogPost', // Your Content Type ID
    order: '-sys.createdAt'
  })
  .then(response => {
    if (!response.items.length) {
      grid.innerHTML = '<p>No properties found.</p>';
      return;
    }

    let cardsHTML = '';

    response.items.forEach(item => {
      const f = item.fields;

      const title = f.title || 'Untitled Property';
      const slug = f.slug || item.sys.id;
      const price = formatPrice(f.price);
      const address = f.address || '';
      const city = f.city || '';
      const state = f.state || '';
      const zipCode = f.zipCode || '';
      const fullLocation = `${city}${city ? ',' : ''} ${state} ${zipCode}`.trim();
      const beds = f.beds || 0;
      const baths = f.baths || 0;
      const sqft = f.sqft || 0;
      const listingType = f.listingType || 'For Sale';
      const imageUrl = getImageUrl(f.mainImage);
      const featuredBadge = f.featured ? '<span class="featured-badge">Featured</span>' : '';

      cardsHTML += `
        <div class="property-card">
          <div class="image-container">
            <img src="${imageUrl}" alt="${title}">
            <span class="badge">${listingType}</span>
            ${featuredBadge}
          </div>
          <div class="card-content">
            <h3>${title}</h3>
            <p class="price">${price}</p>
            <p class="address">${address}</p>
            <p class="location">${fullLocation}</p>
            <div class="mini-specs">
              <span>${beds} bds</span> | 
              <span>${baths} ba</span> | 
              <span>${Number(sqft).toLocaleString()} sqft</span>
            </div>
            <a href="property.html?slug=${slug}" class="view-btn">View Full Details</a>
          </div>
        </div>
      `;
    });

    grid.innerHTML = cardsHTML;
  })
  .catch(err => {
    console.error('ERROR FETCHING LISTINGS:', err);
    grid.innerHTML = '<p>Error loading properties. Check console.</p>';
  });
}

// =========================================================
// FETCH SINGLE PROPERTY
// =========================================================

function fetchPropertyDetail() {
  const detailContainer = document.getElementById('property-detail');
  if (!detailContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    detailContainer.innerHTML = '<h2>No property slug found in URL.</h2>';
    return;
  }

  client.getEntries({
    content_type: 'pageBlogPost', // Your Content Type ID
    'fields.slug': slug,
    limit: 1
  })
  .then(response => {
    if (!response.items.length) {
      detailContainer.innerHTML = '<h2>Property not found.</h2>';
      return;
    }

    const entry = response.items[0];
    const f = entry.fields;

    // Insert Basic Data
    if (document.getElementById('p-title')) document.getElementById('p-title').innerText = f.title || 'Untitled Property';
    if (document.getElementById('p-price')) document.getElementById('p-price').innerText = formatPrice(f.price);
    if (document.getElementById('p-address')) document.getElementById('p-address').innerText = f.address || '';
    if (document.getElementById('p-location')) document.getElementById('p-location').innerText = `${f.city || ''}, ${f.state || ''} ${f.zipCode || ''}`;
    if (document.getElementById('p-beds')) document.getElementById('p-beds').innerText = f.beds || 0;
    if (document.getElementById('p-baths')) document.getElementById('p-baths').innerText = f.baths || 0;
    if (document.getElementById('p-sqft')) document.getElementById('p-sqft').innerText = Number(f.sqft || 0).toLocaleString();
    if (document.getElementById('p-type')) document.getElementById('p-type').innerText = f.listingType || 'For Sale';
    if (document.getElementById('p-main-image')) document.getElementById('p-main-image').src = getImageUrl(f.mainImage);

    // SIMPLE TEXT DESCRIPTION FIX
    if (document.getElementById('p-description')) {
        document.getElementById('p-description').innerText = f.description || 'No description provided.';
    }

    // =====================================================
    // LIGHTBOX GALLERY UPDATE
    // =====================================================
    const gallery = document.getElementById('p-gallery');
    if (gallery) {
      gallery.innerHTML = '';

      if (f.galleryImages && f.galleryImages.length > 0) {
        f.galleryImages.forEach(img => {
          const thumbUrl = getImageUrl(img);
          
          // Added onclick event to trigger the lightbox
          gallery.innerHTML += `
            <img
              src="${thumbUrl}"
              class="gallery-thumb"
              alt="${f.title}"
              onclick="openLightbox('${thumbUrl}')"
            >
          `;
        });
      } else {
        gallery.innerHTML = '<p>No gallery images available.</p>';
      }
    }
  })
  .catch(err => {
    console.error('ERROR FETCHING PROPERTY:', err);
    detailContainer.innerHTML = '<h2>Error loading property.</h2>';
  });
}

// =========================================================
// AUTO RUN
// =========================================================

window.onload = () => {
  if (document.getElementById('property-grid')) {
    fetchListings();
  }
  
  if (document.getElementById('property-detail')) {
    fetchPropertyDetail();
  }
};