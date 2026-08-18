document.addEventListener('DOMContentLoaded', () => {
  // 1. Timeline Accordion Interactivity
  const timelineCards = document.querySelectorAll('.timeline-card');
  timelineCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Prevent accordion toggle if a link inside was clicked
      if (e.target.closest('.timeline-evidence-link') || e.target.closest('a')) {
        return;
      }
      const item = card.closest('.timeline-item');
      
      // Close other items (optional - let's make it accordion style or multi-open?)
      // Multi-open is better for comparison, but accordion is cleaner. Let's toggle only this one.
      item.classList.toggle('active');
    });
  });

  // Automatically open the critical events on load for impact
  document.querySelectorAll('.timeline-item.critical').forEach(item => {
    item.classList.add('active');
  });

  // 2. Fetch and Render Status Checklist
  const statusContainer = document.getElementById('status-checklist-container');
  if (statusContainer) {
    fetch('status.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al cargar status.json');
        }
        return response.json();
      })
      .then(data => {
        statusContainer.innerHTML = ''; // Clear fallback
        data.forEach(item => {
          const card = document.createElement('div');
          card.className = `status-card`;
          
          let badgeClass = 'pending';
          if (item.status === 'completed') badgeClass = 'completed';
          else if (item.status === 'in_progress') badgeClass = 'in_progress';
          
          let docLinkHtml = '';
          if (item.docLink) {
            docLinkHtml = `
              <div style="margin: 0.75rem 0 0.5rem 0;">
                <a href="${item.docLink}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; padding: 0.35rem 0.65rem; text-decoration: none;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  ${item.docLabel || 'Ver Documento (PDF)'}
                </a>
              </div>
            `;
          }
          
          card.innerHTML = `
            <div class="status-badge-container">
              <span class="status-badge ${badgeClass}">${item.statusText}</span>
            </div>
            <h3 class="status-card-title">${item.name}</h3>
            <p class="status-card-desc">${item.description}</p>
            ${docLinkHtml}
            <div class="status-card-date" style="margin-top: 0.5rem;">Actualizado: ${item.date}</div>
          `;
          statusContainer.appendChild(card);
        });
      })
      .catch(error => {
        console.error('Error loading claim status checklist:', error);
        // Leave the HTML fallback intact in case of error
      });
  }

  // 3. Gallery Filtering Logic
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-card');
  
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all buttons
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filterValue = btn.getAttribute('data-filter');
      
      galleryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        
        if (filterValue === 'all' || itemCategory === filterValue) {
          item.style.display = 'flex';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.95)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300); // Wait for transition to complete
        }
      });
    });
  });

  // 4. Custom Lightbox Implementation
  const lightbox = document.getElementById('custom-lightbox');
  const lightboxWrapper = lightbox.querySelector('.lightbox-content-wrapper');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDesc = document.getElementById('lightbox-desc');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxSource = document.getElementById('lightbox-source');
  
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  
  let currentGalleryIndex = 0;
  let activeLightboxItems = []; // Keeps track of currently filtered items for navigation

  // Function to open the lightbox
  function openLightbox(mediaSrc, title, desc, date, source, isVideo = false) {
    // Clear previous content
    lightboxWrapper.innerHTML = '';
    
    if (isVideo) {
      const video = document.createElement('video');
      video.src = mediaSrc;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      lightboxWrapper.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = mediaSrc;
      img.alt = title;
      lightboxWrapper.appendChild(img);
    }
    
    // Set captions
    lightboxTitle.textContent = title;
    lightboxDesc.textContent = desc;
    lightboxDate.textContent = date || 'N/A';
    lightboxSource.textContent = source || 'Desconocido';
    
    // Show/hide navigation buttons depending on active items count
    if (activeLightboxItems.length <= 1) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
    } else {
      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';
    }

    // Show Lightbox
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }
  
  // Expose globally for inline onclick attributes
  window.openLightbox = openLightbox;

  // Function to close the lightbox
  function closeLightbox() {
    // Pause any playing videos before removal
    const video = lightboxWrapper.querySelector('video');
    if (video) {
      video.pause();
    }
    
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Restore scroll
    lightboxWrapper.innerHTML = '';
  }

  // Close actions
  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxWrapper) {
      closeLightbox();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight' && lightbox.classList.contains('active') && activeLightboxItems.length > 1) {
      navigateLightbox(1);
    } else if (e.key === 'ArrowLeft' && lightbox.classList.contains('active') && activeLightboxItems.length > 1) {
      navigateLightbox(-1);
    }
  });

  // Navigation Logic
  function updateActiveItems() {
    // Get only currently visible items in the gallery
    const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    activeLightboxItems = Array.from(galleryItems).filter(item => {
      const itemCategory = item.getAttribute('data-category');
      return activeFilter === 'all' || itemCategory === activeFilter;
    });
  }

  function navigateLightbox(direction) {
    if (activeLightboxItems.length === 0) return;
    
    currentGalleryIndex = (currentGalleryIndex + direction + activeLightboxItems.length) % activeLightboxItems.length;
    const targetItem = activeLightboxItems[currentGalleryIndex];
    
    const isTimelineLink = targetItem.classList.contains('timeline-evidence-link');
    const isGalleryThumb = targetItem.classList.contains('timeline-gallery-thumb');
    
    if (isTimelineLink) {
      const mediaSrc = targetItem.getAttribute('data-media');
      const title = targetItem.closest('.timeline-card').querySelector('.timeline-title').textContent;
      const desc = targetItem.closest('.timeline-card').querySelector('.timeline-detail').textContent;
      const date = targetItem.closest('.timeline-card').querySelector('.timeline-date').textContent;
      
      const isVideo = mediaSrc.endsWith('.mp4');
      let source = 'Evidencia Propietario';
      if (mediaSrc.includes('000000') || mediaSrc.includes('sonda')) {
        source = 'Taller / Inspección';
      }
      openLightbox(mediaSrc, title, desc, date, source, isVideo);
    } else if (isGalleryThumb) {
      const mediaSrc = targetItem.getAttribute('data-media');
      const title = targetItem.getAttribute('data-title') || 'Informe Pericial - Pág';
      const desc = targetItem.getAttribute('data-desc') || 'Página de registro del informe de inspección pericial.';
      const date = '25/07/2026';
      const source = 'Informe Pericial (Matías Friz)';
      openLightbox(mediaSrc, title, desc, date, source, false);
    } else {
      const mediaSrc = targetItem.getAttribute('data-src');
      const title = targetItem.getAttribute('data-title');
      const desc = targetItem.getAttribute('data-desc');
      const date = targetItem.getAttribute('data-date');
      const source = targetItem.getAttribute('data-source');
      const isVideo = targetItem.classList.contains('video-card');
      openLightbox(mediaSrc, title, desc, date, source, isVideo);
    }
  }

  prevBtn.addEventListener('click', () => navigateLightbox(-1));
  nextBtn.addEventListener('click', () => navigateLightbox(1));

  // Connect Gallery Cards to Lightbox
  galleryItems.forEach((card, index) => {
    card.addEventListener('click', () => {
      updateActiveItems();
      currentGalleryIndex = activeLightboxItems.indexOf(card);
      
      const mediaSrc = card.getAttribute('data-src');
      const title = card.getAttribute('data-title');
      const desc = card.getAttribute('data-desc');
      const date = card.getAttribute('data-date');
      const source = card.getAttribute('data-source');
      const isVideo = card.classList.contains('video-card');
      
      openLightbox(mediaSrc, title, desc, date, source, isVideo);
    });
  });

  // Connect Timeline Evidence Links to Lightbox (no gallery navigation)
  const timelineEvidenceLinks = document.querySelectorAll('.timeline-evidence-link');
  timelineEvidenceLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const mediaSrc = link.getAttribute('data-media');
      if (!mediaSrc) return; // Follow default link if no direct media
      
      e.preventDefault();
      
      // Disable gallery navigation for timeline items
      activeLightboxItems = [];
      currentGalleryIndex = 0;
      
      const parentCard = link.closest('.timeline-card');
      let title = "Evidencia";
      let desc = "Documentación del siniestro.";
      let date = "15/07/2026";
      
      if (parentCard) {
        title = parentCard.querySelector('.timeline-title').textContent;
        desc = parentCard.querySelector('.timeline-detail').textContent;
        date = parentCard.querySelector('.timeline-date').textContent;
      } else {
        title = link.getAttribute('data-title') || link.textContent.trim();
        desc = link.getAttribute('data-desc') || "Comprobante de provisión de repuestos para la reparación.";
        date = link.getAttribute('data-date') || "14/07/2026";
      }
      
      const isVideo = mediaSrc.endsWith('.mp4');
      
      // Try to match source
      let source = 'Evidencia Propietario';
      if (mediaSrc.includes('000000') || mediaSrc.includes('sonda') || mediaSrc.includes('arca')) {
        source = 'Taller / Inspección / Proveedor';
      }
      
      openLightbox(mediaSrc, title, desc, date, source, isVideo);
    });
  });

  // Connect Timeline Mini Gallery Thumbnails to Lightbox (scopes navigation only to this perito gallery)
  const miniGalleryThumbs = document.querySelectorAll('.timeline-gallery-thumb');
  miniGalleryThumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const parentGallery = thumb.closest('.timeline-mini-gallery');
      activeLightboxItems = Array.from(parentGallery.querySelectorAll('.timeline-gallery-thumb'));
      currentGalleryIndex = activeLightboxItems.indexOf(thumb);
      
      const mediaSrc = thumb.getAttribute('data-media');
      const title = thumb.getAttribute('data-title') || 'Informe Pericial - Pág';
      const desc = thumb.getAttribute('data-desc') || 'Página de registro del informe de inspección pericial.';
      const date = '25/07/2026';
      const source = 'Informe Pericial (Matías Friz)';
      
      openLightbox(mediaSrc, title, desc, date, source, false);
    });
  });

  // Connect 'Ver Fotos del Peritaje' button to trigger the perito lightbox gallery directly
  const btnVerFotosPeritaje = document.getElementById('btn-ver-fotos-peritaje');
  if (btnVerFotosPeritaje) {
    btnVerFotosPeritaje.addEventListener('click', (e) => {
      e.preventDefault();
      const firstPeritoThumb = document.querySelector('.timeline-mini-gallery .timeline-gallery-thumb');
      if (firstPeritoThumb) {
        firstPeritoThumb.click();
      } else {
        openLightbox('media/peritaje_friz_1.png', 'Informe Pericial - Pág 1', 'Portada e identificación del informe pericial de Matías Eduardo Friz (M.P. N°1118).', '25/07/2026', 'Informe Pericial (Matías Friz)', false);
      }
    });
  }

  // 5. YouTube Video Lazy Loading
  const videoWrappers = document.querySelectorAll('.video-player-wrapper');
  videoWrappers.forEach(wrapper => {
    const youtubeId = wrapper.getAttribute('data-youtube-id');
    const placeholder = wrapper.querySelector('.video-placeholder');
    
    if (youtubeId && placeholder) {
      placeholder.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        
        wrapper.innerHTML = '';
        wrapper.appendChild(iframe);
      });
    } else if (placeholder) {
      // If there's no YouTube ID yet, trigger an alert to state it's a placeholder
      placeholder.addEventListener('click', () => {
        alert('Este video se subirá a YouTube próximamente. Los detalles de la pericia y el fuego ya se encuentran documentados en la sección de evidencias.');
      });
    }
  });
});
