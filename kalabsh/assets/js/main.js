document.addEventListener('DOMContentLoaded', () => {
  // تفعيل الوضع الليلي
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    const savedTheme = localStorage.getItem('kalabsh-theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('kalabsh-theme', isDark ? 'dark' : 'light');
    });
  }

  // تحميل المحتوى الديناميكي للصفحات
  function loadPageContent() {
    const path = window.location.pathname;
    const page = path.split('/').pop().replace('.html', '');

    // لا تقم بتحميل المحتوى لصفحة المشرف
    if (page === 'admin') {
      return;
    }

    fetch(`content.php?page=${page}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        renderPage(page, data);
      })
      .catch(error => {
        console.error('Error fetching page content:', error);
      });
  }

  function renderPage(page, data) {
    switch (page) {
      case 'index':
      case '': // For root path
        renderIndex(data);
        break;
      case 'pricing':
        renderPricing(data);
        break;
      case 'gallery':
        renderGallery(data);
        break;
      case 'shop':
        renderShop(data);
        break;
      case 'sauna':
        renderSauna(data);
        break;
      case 'contact':
        renderContact(data);
        break;
    }
    renderFooter(data.footer);
  }

  function renderIndex(data) {
    // Hero Section
    const hero = document.querySelector('.hero-content');
    if (hero) {
      const h1 = hero.querySelector('h1');
      const p = hero.querySelector('p');
      if (h1) h1.textContent = data.hero.title;
      if (p) p.textContent = data.hero.description;
    }

    // Features Section
    const features = document.querySelectorAll('.feature-card');
    if (features.length > 0) {
      features.forEach((card, index) => {
        const featureData = data.features[index];
        if (featureData) {
          const img = card.querySelector('img');
          const h3 = card.querySelector('h3');
          const p = card.querySelector('p');
          if (img) {
            const initialSrc = img.getAttribute('src');
            img.alt = featureData.title || '';
            img.onerror = () => {
              // Fallback to the original inline icon if the content icon fails to load
              if (initialSrc) {
                img.src = initialSrc;
              }
              img.onerror = null;
            };
            img.src = featureData.icon;
          }
          if (h3) h3.textContent = featureData.title;
          if (p) p.textContent = featureData.description;
        }
      });
    }
  }

  function renderPricing(data) {
    const headerSection = document.querySelector('.page-header');
    if(headerSection){
      headerSection.querySelector('h2').textContent = data.page_header.title;
      headerSection.querySelector('p').textContent = data.page_header.description;
    }

    const grid = document.querySelector('.pricing-grid');
    if (grid) {
      grid.innerHTML = ''; // Clear existing cards
      data.pricing_cards.forEach(cardData => {
        const card = document.createElement('div');
        card.className = 'price-card';
        if (cardData.recommended) {
          card.classList.add('recommended');
        }
        card.innerHTML = `
          <h3>${cardData.package}</h3>
          <p class="price">${cardData.price}</p>
          <ul>
            ${cardData.features.map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('')}
          </ul>
          <a href="#" class="btn primary book-btn" data-package="${cardData.package}" data-price="${cardData.price}">احجز الآن</a>
        `;
        grid.appendChild(card);
      });
    }
  }

  function renderGallery(data) {
    const headerSection = document.querySelector('.page-header');
    if(headerSection){
        const h2 = headerSection.querySelector('h2');
        const p = headerSection.querySelector('p');
        if(h2) h2.textContent = data.page_header.title;
        if(p) p.textContent = data.page_header.description;
    }

    const grid = document.querySelector('.gallery-grid');
    if (grid) {
      grid.innerHTML = ''; // Clear existing images
      data.gallery_images.forEach(imageData => {
        const photo = document.createElement('div');
        photo.className = 'photo';
        photo.setAttribute('aria-label', imageData.alt);
        const img = document.createElement('img');
        img.src = imageData.src;
        img.alt = imageData.alt;
        img.loading = 'lazy';
        photo.appendChild(img);
        grid.appendChild(photo);
      });
    }
  }

  function renderShop(data) {
    const headerSection = document.querySelector('.page-header');
    if(headerSection){
        const h2 = headerSection.querySelector('h2');
        const p = headerSection.querySelector('p');
        if(h2) h2.textContent = data.page_header.title;
        if(p) p.textContent = data.page_header.description;
    }

    const grid = document.querySelector('.shop-grid');
    if (grid) {
      grid.innerHTML = ''; // Clear existing items
      data.shop_items.forEach(itemData => {
        const item = document.createElement('article');
        item.className = 'item-card';
        item.setAttribute('data-category', itemData.category);
        const mediaHtml = (itemData.image_src && itemData.image_src.trim())
          ? `<div class="item-media"><img src="${itemData.image_src}" alt="${itemData.package}" loading="lazy"></div>`
          : (itemData.image_svg && itemData.image_svg.trim())
            ? `<div class="item-media">${itemData.image_svg}</div>`
            : `<div class="item-media"></div>`;
        item.innerHTML = `
          ${mediaHtml}
          <h3 class="item-title">${itemData.package}</h3>
          <p class="item-price">${itemData.price}</p>
          <button class="btn primary book-btn" data-package="${itemData.package}" data-price="${itemData.price}">احجز الآن</button>
        `;
        grid.appendChild(item);
      });
    }
  }

  function renderSauna(data) {
    const headerSection = document.querySelector('.page-header');
    if(headerSection){
        const h2 = headerSection.querySelector('h2');
        const p = headerSection.querySelector('p');
        if(h2) h2.textContent = data.page_header.title;
        if(p) p.textContent = data.page_header.description;
    }

    // Sauna Intro
    const intro = document.querySelector('.sauna-intro');
    if (intro) {
      const h3 = intro.querySelector('h3');
      const p = intro.querySelector('p');
      if(h3) h3.textContent = data.sauna_intro.title;
      if(p) p.textContent = data.sauna_intro.description;
      // Sauna image: bind from content if provided
      const saunaImg = intro.querySelector('.sauna-image img');
      if (saunaImg && data.sauna_intro && data.sauna_intro.image_src) {
        saunaImg.src = data.sauna_intro.image_src;
        if (data.sauna_intro.title && (!saunaImg.alt || saunaImg.alt.trim() === '')) {
          saunaImg.alt = data.sauna_intro.title;
        }
      }
      const features = intro.querySelectorAll('.feature');
      features.forEach((feature, index) => {
        const featureData = data.sauna_intro.features[index];
        if (featureData) {
          const iconEl = feature.querySelector('i');
          const h4El = feature.querySelector('h4');
          const pEl = feature.querySelector('p');
          if(iconEl) iconEl.className = featureData.icon;
          if(h4El) h4El.textContent = featureData.title;
          if(pEl) pEl.textContent = featureData.description;
        }
      });
    }

    // Sauna Packages
    const packagesGrid = document.querySelector('.packages-grid');
    if (packagesGrid) {
        packagesGrid.innerHTML = '';
        data.sauna_packages.packages.forEach(pkg => {
            const card = document.createElement('div');
            card.className = 'package-card';
            if(pkg.recommended) card.classList.add('recommended');
            card.innerHTML = `
                <h4>${pkg.title}</h4>
                <p class="price">${pkg.price}</p>
                <ul>${pkg.features.map(f => `<li><i class="fa-solid fa-check"></i> ${f}</li>`).join('')}</ul>
                <a href="#" class="btn primary book-btn" data-package="${pkg.title}" data-price="${pkg.price}">احجز الآن</a>
            `;
            packagesGrid.appendChild(card);
        });
    }

    // Sauna Benefits
    const benefitsGrid = document.querySelector('.benefits-grid');
    if (benefitsGrid) {
        benefitsGrid.innerHTML = '';
        data.sauna_benefits.benefits.forEach(benefit => {
            const benefitEl = document.createElement('div');
            benefitEl.className = 'benefit';
            benefitEl.innerHTML = `
                <i class="${benefit.icon}"></i>
                <h4>${benefit.title}</h4>
                <p>${benefit.description}</p>
            `;
            benefitsGrid.appendChild(benefitEl);
        });
    }
  }

  function renderContact(data) {
    const headerSection = document.querySelector('.page-header');
    if(headerSection){
        const h2 = headerSection.querySelector('h2');
        const p = headerSection.querySelector('p');
        if(h2) h2.textContent = data.page_header.title;
        if(p) p.textContent = data.page_header.description;
    }
  }

  function renderFooter(footerData) {
    const footer = document.querySelector('.site-footer');
    if (footer && footerData) {
      const addrEl = footer.querySelector('div:nth-child(1) p');
      if (addrEl) addrEl.textContent = footerData.address;

      const waEl = footer.querySelector('div:nth-child(2) p:nth-child(1) a');
      if (waEl) {
        waEl.textContent = footerData.whatsapp;
        waEl.href = `https://wa.me/${footerData.whatsapp}`;
      }

      const instaEl = footer.querySelector('div:nth-child(2) p:nth-child(2) a');
      if (instaEl) instaEl.textContent = footerData.instagram;

      const hoursEl = footer.querySelector('div:nth-child(3) p');
      if (hoursEl) hoursEl.textContent = footerData.working_hours;
      // تحديث رقم واتساب العالمي من بيانات الفوتر
      if (footerData.whatsapp) {
        WA_NUMBER = footerData.whatsapp;
      }
    }
  }

  loadPageContent();

  // All other event listeners and functions from the original main.js
  // ... (nav toggle, search, booking modal, etc.)

    // ضبط اتجاه الحقول النصية تلقائياً لدعم العربية والإنجليزية دون الحاجة لتعديل HTML
  document.querySelectorAll('input[type="text"], input[type="search"], textarea').forEach(el=>{
    if(!el.hasAttribute('dir')){ el.setAttribute('dir','auto'); }
  });
  // تبديل قائمة التنقل للهاتف
  const navToggle=document.querySelector('.nav-toggle');
  if(navToggle){
    navToggle.addEventListener('click',()=>{
      document.body.classList.toggle('nav-open');
    });
    // إغلاق القائمة عند الضغط على أي رابط داخلها في الموبايل
    document.querySelectorAll('.site-nav a').forEach(a=>{
      a.addEventListener('click', ()=>{
        document.body.classList.remove('nav-open');
      });
    });
  }

  // فلاتر المتجر
  const filterButtons=document.querySelectorAll('.filter[data-filter]');
  const items=document.querySelectorAll('.item-card');
  filterButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      const f=btn.getAttribute('data-filter');
      items.forEach(card=>{
        const cat=card.getAttribute('data-category');
        card.style.display=(f==='all'||f===cat)?'flex':'none';
      });
    });
  });

  // بحث النافبار: توجيه للمتجر أو تصفية مباشرة في المتجر
  (function initNavSearch(){
    const form=document.querySelector('.nav-search');
    const input=form?form.querySelector('input[type="search"]'):null;
    if(!form||!input){return;}

    function applyShopSearch(term){
      const q=(term||'').trim().toLowerCase();
      const cards=document.querySelectorAll('.item-card');
      cards.forEach(card=>{
        const title=(card.querySelector('.item-title')?.textContent||'').toLowerCase();
        const pkg=(card.getAttribute('data-package')||'').toLowerCase();
        const cat=(card.getAttribute('data-category')||'').toLowerCase();
        const match=!q || title.includes(q) || pkg.includes(q) || cat.includes(q);
        card.style.display=match?'flex':'none';
      });
    }

    // إذا كنا في صفحة المتجر، نفعل التصفية الفورية أثناء الكتابة
    const inShop=document.body.classList.contains('page-shop');
    if(inShop){
      input.addEventListener('input',()=>applyShopSearch(input.value));
    }

    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const term=input.value.trim();
      if(inShop){
        applyShopSearch(term);
      }else{
        // إعادة التوجيه إلى صفحة المتجر مع تمرير الاستعلام
        const url=new URL(window.location.origin+window.location.pathname);
        // نوجه مباشرة إلى shop.html في نفس الجذر
        window.location.href='shop.html?q='+encodeURIComponent(term);
      }
    });

    // في صفحة المتجر: قراءة الاستعلام من عنوان الصفحة وتطبيقه
    if(inShop){
      const params=new URLSearchParams(window.location.search);
      const q=params.get('q');
      if(q){
        input.value=q;
        applyShopSearch(q);
      }
    }
  })();

  // طلب عبر واتساب
  // جعل رقم واتساب ديناميكياً بناءً على محتوى الصفحة المحمّل
  let WA_NUMBER = null; // سيتم تحديثه من بيانات الفوتر عند التحميل
  function getWhatsAppNumber(){
    if (WA_NUMBER && typeof WA_NUMBER === 'string' && WA_NUMBER.trim() !== '') return WA_NUMBER;
    const waAnchor = document.querySelector('.site-footer a[href^="https://wa.me/"]');
    if (waAnchor) {
      const href = waAnchor.getAttribute('href') || '';
      const num = href.split('/').pop();
      if (num) return num;
    }
    return '201023080996'; // قيمة افتراضية كاحتياط
  }
  const orderBtns=document.querySelectorAll('.order-btn');
  orderBtns.forEach(b=>{
    b.addEventListener('click',()=>{
      const product=b.getAttribute('data-product')||'منتج';
      const msg=encodeURIComponent(`مرحباً، أود طلب: ${product}`);
      const url=`https://wa.me/${getWhatsAppNumber()}?text=${msg}`;
      window.open(url,'_blank','noopener');
    });
  });

  // إرسال نموذج التواصل إلى واتساب
  const form=document.getElementById('contactForm');
 if(form){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const name=form.name.value.trim();
      const phone=form.phone.value.trim();
      const message=form.message.value.trim();
      const text=encodeURIComponent(`الاسم: ${name}\nالهاتف: ${phone}\nالرسالة: ${message}`);
      window.open(`https://wa.me/${getWhatsAppNumber()}?text=${text}`,'_blank','noopener');
    });
  }

  // حجز الخدمات (ساونا/تسعير) وإرسال تفاصيل الحجز عبر واتساب
  const overlay = document.getElementById('bookingOverlay');
  if (overlay) {
    const formBk = document.getElementById('bookingForm');
    const cancelBtn = document.getElementById('bkCancel');
    const closeBtn = document.getElementById('closeBooking');
    const pkgSpan = document.getElementById('bookingPackage');
    const priceSpan = document.getElementById('bookingPrice');
    const nameInput = document.getElementById('bkName');
    const phoneInput = document.getElementById('bkPhone');
    const dtInput = document.getElementById('bkDateTime');
    let currentPackage = '';
    let currentPrice = '';

    // التأكد من أن النافذة مخفية عند تحميل الصفحة
    if(overlay) {
      overlay.hidden = true;
      document.body.classList.remove('modal-open');
    }

    function openOverlay(pkg, price){
      try {
        currentPackage = pkg || 'باقة الساونا';
        currentPrice = price || '';
        if(pkgSpan) pkgSpan.textContent = currentPackage;
        if(priceSpan) priceSpan.textContent = currentPrice;
        if(overlay){ 
          overlay.hidden = false; 
          document.body.classList.add('modal-open'); 
        }
        if(nameInput){ nameInput.focus(); }
      } catch(e) {
        console.warn('خطأ في فتح النافذة:', e);
      }
    }

    function closeOverlay(){
      try {
        if(overlay){ 
          overlay.hidden = true; 
          document.body.classList.remove('modal-open'); 
        }
        if(formBk){ formBk.reset(); }
      } catch(e) {
        console.warn('خطأ في إغلاق النافذة:', e);
      }
    }

    document.querySelectorAll('.book-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.preventDefault();
        const pkg = btn.getAttribute('data-package') || btn.closest('.package-card')?.getAttribute('data-package');
        const price = btn.getAttribute('data-price') || btn.closest('.package-card')?.getAttribute('data-price') || btn.closest('.price-card')?.getAttribute('data-price');
        // فتح النافذة فقط إذا كانت الباقة محددة
        if(!pkg){ return; }
        openOverlay(pkg, price);
      });
    });

    if(cancelBtn){ cancelBtn.addEventListener('click', closeOverlay); }
    if(closeBtn){ closeBtn.addEventListener('click', closeOverlay); }
    if(overlay){ overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); }); }

    if(formBk){
      formBk.addEventListener('submit', (e)=>{
        e.preventDefault();
        const name = nameInput?.value.trim() || '';
        const phone = phoneInput?.value.trim() || '';
        const dtVal = dtInput?.value || '';
        // تنسيق التاريخ/الوقت لعرض أوضح
        let displayDT = dtVal;
        try {
          if(dtVal){
            const d = new Date(dtVal);
            displayDT = d.toLocaleString('ar-EG', { hour12: false });
          }
        } catch(_) {}

        const text = encodeURIComponent(
          `طلب حجز ساونا\nالباقة: ${currentPackage} ${currentPrice?`- السعر: ${currentPrice}`:''}\nالاسم: ${name}\nالهاتف: ${phone}\nالموعد: ${displayDT}\nمن فضلك تأكيد الحجز.`
        );
        const url = `https://wa.me/${getWhatsAppNumber()}?text=${text}`;
        window.open(url,'_blank','noopener');
        closeOverlay();
      });
    }
  }
});