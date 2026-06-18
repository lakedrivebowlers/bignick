// =========================================================
// CONFIGURATION & GLOBAL STATE
// =========================================================
const DATA_SOURCE = './zillow_data_local.json';

let allProperties = []; // Stores all fetched properties
let currentPage = 1;
const itemsPerPage = 30; // Set to 30 per page

// =========================================================
// HELPER FUNCTIONS
// =========================================================

function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString()}`;
}

function getImageUrl(imagesArray) {
  if (imagesArray && imagesArray.length > 0) {
    return imagesArray[0];
  }
  return 'https://via.placeholder.com/800x600?text=No+Image';
}

function openLightbox(imageUrl) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  
  if (lightbox && lightboxImg) {
    lightboxImg.src = imageUrl;
    lightbox.style.display = 'flex';
  }
}

// =========================================================
// PAGINATION LOGIC
// =========================================================

function renderPage(pageNumber) {
    const grid = document.getElementById('property-grid');
    if (!grid) return;

    // Calculate start and end indexes for slicing the array
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Grab only the 30 items for this specific page
    const paginatedItems = allProperties.slice(startIndex, endIndex);

    let cardsHTML = '';

    paginatedItems.forEach(prop => {
        const title = prop.address_street || 'Untitled Property';
        const slug = prop.zpid; 
        const price = formatPrice(prop.price);
        const address = prop.address_street || '';
        const city = prop.address_city || '';
        const state = prop.address_state || '';
        const zipCode = prop.address_zip || '';
        const fullLocation = `${city}${city ? ',' : ''} ${state} ${zipCode}`.trim();
        const beds = prop.num_beds || 0;
        const baths = prop.num_baths || 0;
        const sqft = prop.living_area_sqft || 0;
        
        let listingType = 'For Sale';
        let statusClass = 'badge';

        if (prop.status === 'SOLD') {
          listingType = 'Sold';
          statusClass = 'badge sold';
        } else if (prop.status === 'FOR_RENT') {
          listingType = 'For Rent';
          statusClass = 'badge';
        } else if (prop.status === 'FOR_SALE') {
          listingType = 'For Sale';
          statusClass = 'badge';
        } else {
          listingType = prop.status || 'Active';
          statusClass = 'badge';
        }

        const imageUrl = getImageUrl(prop.images);

        cardsHTML += `
          <div class="property-card">
            <div class="image-container">
              <img src="${imageUrl}" alt="${title}">
              <span class="${statusClass}">${listingType}</span>
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
    renderPaginationControls();
    
    // Scroll smoothly back to the top of the listings when a new page loads
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPaginationControls() {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;

    const totalPages = Math.ceil(allProperties.length / itemsPerPage);
    
    // Don't show pagination if there's only 1 page
    if (totalPages <= 1) {
        controlsContainer.innerHTML = '';
        return;
    }

    let buttonsHTML = '';

    // Previous Button
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    buttonsHTML += `<button onclick="changePage(${currentPage - 1})" ${prevDisabled}>&laquo; Prev</button>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = currentPage === i ? 'active-page' : '';
        buttonsHTML += `<button class="page-num ${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }

    // Next Button
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    buttonsHTML += `<button onclick="changePage(${currentPage + 1})" ${nextDisabled}>Next &raquo;</button>`;

    controlsContainer.innerHTML = buttonsHTML;
}

// Global function triggered by the HTML buttons
window.changePage = function(newPage) {
    const totalPages = Math.ceil(allProperties.length / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage(currentPage);
    }
};

// =========================================================
// INITIAL DATA FETCH
// =========================================================

function fetchListings() {
  const grid = document.getElementById('property-grid');
  if (!grid) return;

  grid.innerHTML = '<p>Loading properties...</p>';

  fetch(DATA_SOURCE)
    .then(response => response.json())
    .then(properties => {
      if (!properties.length) {
        grid.innerHTML = '<p>No properties found.</p>';
        return;
      }
      // Save data globally so we don't have to re-fetch on every page turn
      allProperties = properties; 
      renderPage(currentPage);
    })
    .catch(err => {
      console.error('ERROR LOADING JSON:', err);
      grid.innerHTML = '<p>Error loading property data.</p>';
    });
}

// =========================================================
// FETCH SINGLE PROPERTY (For property.html)
// =========================================================

function fetchPropertyDetail() {
  const detailContainer = document.getElementById('property-detail');
  if (!detailContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug'); 

  if (!slug) {
    detailContainer.innerHTML = '<h2>No property ID found in URL.</h2>';
    return;
  }

  fetch(DATA_SOURCE)
    .then(response => response.json())
    .then(properties => {
      const prop = properties.find(p => p.zpid.toString() === slug);

      if (!prop) {
        detailContainer.innerHTML = '<h2>Property not found.</h2>';
        return;
      }

      if (document.getElementById('p-title')) document.getElementById('p-title').innerText = prop.address_street;
      if (document.getElementById('p-price')) document.getElementById('p-price').innerText = formatPrice(prop.price);
      if (document.getElementById('p-address')) document.getElementById('p-address').innerText = prop.address_street;
      if (document.getElementById('p-location')) document.getElementById('p-location').innerText = `${prop.address_city}, ${prop.address_state} ${prop.address_zip}`;
      if (document.getElementById('p-beds')) document.getElementById('p-beds').innerText = prop.num_beds || 0;
      if (document.getElementById('p-baths')) document.getElementById('p-baths').innerText = prop.num_baths || 0;
      if (document.getElementById('p-sqft')) document.getElementById('p-sqft').innerText = Number(prop.living_area_sqft || 0).toLocaleString();
      if (document.getElementById('p-type')) document.getElementById('p-type').innerText = prop.status;
      if (document.getElementById('p-main-image')) document.getElementById('p-main-image').src = getImageUrl(prop.images);
      
      if (document.getElementById('p-description')) {
          document.getElementById('p-description').innerText = prop.description || `Beautiful ${prop.num_beds} bedroom home in ${prop.address_city}.`;
      }

      const gallery = document.getElementById('p-gallery');
      if (gallery) {
        gallery.innerHTML = '';
        if (prop.images && prop.images.length > 0) {
          prop.images.forEach(imgUrl => {
            gallery.innerHTML += `
              <img src="${imgUrl}" class="gallery-thumb" alt="${prop.address_street}" onclick="openLightbox('${imgUrl}')">
            `;
          });
        }
      }
    })
    .catch(err => {
      console.error('ERROR LOADING PROPERTY DETAIL:', err);
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