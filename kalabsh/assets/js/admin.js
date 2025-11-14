class ContentManager {
    constructor() {
        this.pages = ['index', 'contact', 'gallery', 'pricing', 'sauna', 'shop'];
        this.contentCache = {};

        // Allow selecting initial page via query string e.g. admin.php?page=gallery
        // Accept common misspelling "galery" as alias to "gallery"
        const params = new URLSearchParams(window.location.search);
        let requestedPage = params.get('page');
        if (requestedPage === 'galery') {
            requestedPage = 'gallery';
        }
        this.currentPage = (requestedPage && this.pages.includes(requestedPage))
            ? requestedPage
            : this.pages[0];

        // Override with hash if present: admin.php#gallery (accept #galery alias)
        let hashPage = (window.location.hash || '').replace('#', '');
        if (hashPage === 'galery') { hashPage = 'gallery'; }
        if (hashPage && this.pages.includes(hashPage)) {
            this.currentPage = hashPage;
        }

        this.init();
    }

    async init() {
        await this.loadAllContent();
        this.renderPageSelect();
        this.bindEvents();
        this.renderEditor();
    }

    bindEvents() {
        // Toggle mobile nav menu
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                document.body.classList.toggle('nav-open');
            });
        }
        // Close nav on link click (mobile)
        document.querySelectorAll('.site-nav a').forEach(a => {
            a.addEventListener('click', () => {
                document.body.classList.remove('nav-open');
            });
        });

        const pageSelectEl = document.getElementById('pageSelect');
        pageSelectEl.addEventListener('change', (e) => {
            this.currentPage = e.target.value;
            // sync URL hash for deep-linking
            window.location.hash = `#${this.currentPage}`;
            this.renderEditor();
        });

        // respond to hash changes to switch editor tab
        window.addEventListener('hashchange', () => {
            let next = (window.location.hash || '').replace('#','');
            if (next === 'galery') { next = 'gallery'; }
            if (next && this.pages.includes(next) && next !== this.currentPage) {
                this.currentPage = next;
                // update select UI
                if (pageSelectEl) { pageSelectEl.value = next; }
                this.renderEditor();
            }
        });

        document.getElementById('saveBtn').addEventListener('click', this.saveChanges.bind(this));

        // إعداد حفظ رمز الإدارة
        const tokenInput = document.getElementById('tokenInput');
        const tokenSave = document.getElementById('tokenSave');
        const stored = localStorage.getItem('adminToken');
        if (tokenInput && stored) {
            tokenInput.value = stored;
        }
        if (tokenSave && tokenInput) {
            tokenSave.addEventListener('click', () => {
                const t = tokenInput.value.trim();
                if (!t) {
                    this.showMessage('يرجى إدخال رمز الإدارة', 'error');
                    return;
                }
                localStorage.setItem('adminToken', t);
                this.showMessage('تم حفظ رمز الإدارة بنجاح', 'success');
            });
        }

        // رفع الصور: سحب وإفلات أو اختيار ملفات
        const uploadArea = document.getElementById('uploadArea');
        const imageInput = document.getElementById('imageInput');
        const uploadedContainer = document.getElementById('uploadedImages');
        const insertPositionEl = document.getElementById('insertPosition');
        const autoSortNewEl = document.getElementById('autoSortNew');

        const allowedTypes = ['image/jpeg','image/png','image/gif'];

        // أضف العناصر إلى مكرر صور المعرض
        const addToGalleryRepeater = (files) => {
            if (this.currentPage !== 'gallery') return;
            const container = document.getElementById('repeater-gallery_images');
            if (!container) return;
            const fields = JSON.parse(container.dataset.fields || '[]');
            const types = JSON.parse(container.dataset.fieldTypes || '{}');
            files.forEach((f) => {
                const makeAlt = (name) => {
                    try {
                        const base = (name || '').replace(/\.[^.]+$/, '');
                        return base.replace(/[\-_]+/g, ' ').trim();
                    } catch { return f.name || 'صورة'; }
                };
                const newItem = { src: f.url, alt: makeAlt(f.name) };
                const index = Array.from(container.children).filter(c => c.classList.contains('repeater-item')).length;
                const itemEl = this.createRepeaterItem(newItem, index, 'gallery_images', fields, types);
                // وسم وقت الرفع للمساعدة في الترتيب
                itemEl.dataset.uploadedAt = String(Date.now());
                const firstItem = container.querySelector('.repeater-item');
                const pos = (insertPositionEl && insertPositionEl.value) ? insertPositionEl.value : 'end';
                if (pos === 'start' && firstItem) {
                    container.insertBefore(itemEl, firstItem);
                } else {
                    container.appendChild(itemEl);
                }
            });

            // ترتيب تلقائي: الأحدث أولاً
            const sortByUploadedIfEnabled = () => {
                if (!autoSortNewEl || !autoSortNewEl.checked) return;
                const items = Array.from(container.querySelectorAll('.repeater-item'));
                items.sort((a,b) => (parseInt(b.dataset.uploadedAt||'0',10) - parseInt(a.dataset.uploadedAt||'0',10)));
                items.forEach(i => container.appendChild(i));
            };
            sortByUploadedIfEnabled();
        };

        // أضف العناصر إلى مكرر عناصر المتجر
        const addToShopRepeater = (files) => {
            if (this.currentPage !== 'shop') return;
            const container = document.getElementById('repeater-shop_items');
            if (!container) return;
            const fields = JSON.parse(container.dataset.fields || '[]');
            const types = JSON.parse(container.dataset.fieldTypes || '{}');
            files.forEach((f) => {
                const guessTitle = () => {
                    try {
                        const base = (f.name || '').replace(/\.[^.]+$/, '');
                        return base.replace(/[\-_]+/g, ' ').trim();
                    } catch { return 'منتج جديد'; }
                };
                const newItem = { category: 'products', package: guessTitle(), price: '', image_src: f.url, image_svg: '' };
                const index = Array.from(container.children).filter(c => c.classList.contains('repeater-item')).length;
                const itemEl = this.createRepeaterItem(newItem, index, 'shop_items', fields, types);
                itemEl.dataset.uploadedAt = String(Date.now());
                const firstItem = container.querySelector('.repeater-item');
                const pos = (insertPositionEl && insertPositionEl.value) ? insertPositionEl.value : 'end';
                if (pos === 'start' && firstItem) {
                    container.insertBefore(itemEl, firstItem);
                } else {
                    container.appendChild(itemEl);
                }
            });
        };

        const showThumbs = (files) => {
            if (!uploadedContainer) return;
            files.forEach(f => {
                const wrapper = document.createElement('div');
                wrapper.className = 'uploaded-image';
                const img = document.createElement('img');
                img.src = f.url;
                img.alt = f.name;
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-btn';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', () => wrapper.remove());
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                uploadedContainer.appendChild(wrapper);
            });
        };

        const uploadFiles = async (fileList) => {
            if (!fileList || fileList.length === 0) return;
            const adminToken = localStorage.getItem('adminToken') || '';
            const fd = new FormData();
            Array.from(fileList).forEach(file => {
                if (!allowedTypes.includes(file.type)) return;
                fd.append('images[]', file, file.name);
            });
            try {
                const resp = await fetch('upload_image.php', { method: 'POST', body: fd, headers: adminToken ? { 'X-ADMIN-TOKEN': adminToken } : {} });
                const ct = resp.headers.get('content-type') || '';
                let data;
                try {
                    data = ct.includes('application/json') ? await resp.json() : JSON.parse(await resp.text());
                } catch (parseErr) {
                    const raw = await resp.text().catch(() => '');
                    console.error('Upload parse error', parseErr, raw);
                    this.showMessage('حدث خطأ أثناء رفع الصور', 'error');
                    return;
                }

                const ok = !!(data && (data.ok === true || data.success === true));
                const files = Array.isArray(data?.files) ? data.files : [];
                if (ok && files.length) {
                    this.showMessage('تم رفع الصور بنجاح', 'success');
                    showThumbs(files);
                    addToGalleryRepeater(files);
                    addToShopRepeater(files);
                } else {
                    this.showMessage((data && data.error) ? data.error : 'فشل رفع الصور', 'error');
                }
            } catch (e) {
                console.error('Upload error', e);
                this.showMessage('حدث خطأ أثناء رفع الصور', 'error');
            }
        };

        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer?.files;
                uploadFiles(files);
            });
        }
        if (imageInput) {
            imageInput.addEventListener('change', () => uploadFiles(imageInput.files));
        }
    }

    async loadAllContent() {
        for (const page of this.pages) {
            try {
                const response = await fetch(`content.php?page=${page}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                this.contentCache[page] = await response.json();
            } catch (error) {
                console.error(`Failed to load content for ${page}:`, error);
                this.showMessage(`Failed to load content for ${page}`, 'error');
            }
        }
    }

    renderPageSelect() {
        const select = document.getElementById('pageSelect');
        this.pages.forEach(page => {
            const option = document.createElement('option');
            option.value = page;
            option.textContent = page.charAt(0).toUpperCase() + page.slice(1);
            if (page === this.currentPage) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    renderEditor() {
        const editor = document.getElementById('editor');
        if (!editor) {
            console.warn('Editor container #editor not found');
            return;
        }
        editor.innerHTML = ''; // Clear previous editor
        const data = this.contentCache[this.currentPage];

        if (!data) {
            editor.innerHTML = `<p>No content found for ${this.currentPage}.</p>`;
            return;
        }

        const form = this.createFormForPage(this.currentPage, data);
        editor.appendChild(form);

        // اربط تنسيق الأسعار تلقائيًا لحقول price
        this.wirePriceFormatting(form);
    }

    createFormForPage(page, data) {
        const form = document.createElement('form');
        form.id = `${page}-form`;

        // Generic page header for all pages except index
        if (page !== 'index' && data.page_header) {
            form.appendChild(this.createFieldSet('Page Header', data.page_header, 'page_header'));
        }

        switch (page) {
            case 'index':
                form.appendChild(this.createFieldSet('Hero Section', data.hero, 'hero'));
                form.appendChild(this.createRepeater('Features', data.features, 'features', ['icon', 'title', 'description'], { icon: 'text', title: 'text', description: 'text' }));
                break;
            case 'pricing':
                form.appendChild(this.createRepeater('Pricing Cards', data.pricing_cards, 'pricing_cards', ['package', 'price', 'features', 'recommended'], { package: 'text', price: 'text', features: 'textarea_array', recommended: 'checkbox' }));
                break;
            case 'gallery':
                form.appendChild(this.createRepeater('Gallery Images', data.gallery_images, 'gallery_images', ['src', 'alt'], { src: 'text', alt: 'text' }));
                break;
            case 'shop':
                // دعم صور SVG المضمنة أو صور مصدرية (JPG/PNG/GIF)
                form.appendChild(this.createRepeater('Shop Items', data.shop_items, 'shop_items', ['category', 'package', 'price', 'image_src', 'image_svg'], { category: 'text', package: 'text', price: 'text', image_src: 'text', image_svg: 'text' }));
                break;
            case 'sauna':
                form.appendChild(this.createFieldSet('Sauna Intro', data.sauna_intro, 'sauna_intro'));
                form.appendChild(this.createRepeater('Sauna Intro Features', data.sauna_intro.features, 'sauna_intro.features', ['icon', 'title', 'description'], { icon: 'text', title: 'text', description: 'text' }));
                form.appendChild(this.createRepeater('Sauna Packages', data.sauna_packages.packages, 'sauna_packages.packages', ['title', 'price', 'features', 'recommended'], { title: 'text', price: 'text', features: 'textarea_array', recommended: 'checkbox' }));
                form.appendChild(this.createRepeater('Sauna Benefits', data.sauna_benefits.benefits, 'sauna_benefits.benefits', ['icon', 'title', 'description'], { icon: 'text', title: 'text', description: 'text' }));
                break;
        }

        // Common footer for all pages
        if (data.footer) {
            form.appendChild(this.createFieldSet('Footer', data.footer, 'footer'));
        }

        return form;
    }

    createFieldSet(legend, data, prefix) {
        const fieldset = document.createElement('fieldset');
        const legendEl = document.createElement('legend');
        legendEl.textContent = legend;
        fieldset.appendChild(legendEl);

        for (const key in data) {
            const value = data[key];
            const id = `${prefix}-${key}`;

            const label = document.createElement('label');
            label.setAttribute('for', id);
            label.textContent = key;
            fieldset.appendChild(label);

            if (Array.isArray(value)) {
                const textarea = document.createElement('textarea');
                textarea.id = id;
                textarea.name = id;
                textarea.value = value.join('\n');
                textarea.placeholder = 'سطر لكل عنصر';
                textarea.title = `أدخل عناصر لـ ${key} (سطر لكل عنصر)`;
                fieldset.appendChild(textarea);
            } else if (typeof value === 'boolean') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = id;
                checkbox.name = id;
                checkbox.checked = value;
                checkbox.title = `تفعيل ${key}`;
                fieldset.appendChild(checkbox);
            } else {
                // حقل نصي مع دعم رفع صورة إذا كان المفتاح صورة
                const inputWrap = document.createElement('div');
                inputWrap.style.display = 'flex';
                inputWrap.style.gap = '8px';
                inputWrap.style.alignItems = 'center';

                const input = document.createElement('input');
                input.type = 'text';
                input.id = id;
                input.name = id;
                input.value = value;
                input.placeholder = `أدخل ${key}`;
                input.title = `حقل ${key}`;
                inputWrap.appendChild(input);

                // دعم رفع الصورة لحقول مثل image_src أو src
                const isImageField = (key === 'src' || key === 'image_src');
                if (isImageField) {
                    const uploadBtn = document.createElement('button');
                    uploadBtn.type = 'button';
                    uploadBtn.textContent = 'رفع';
                    uploadBtn.className = 'btn small';

                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.jpg,.jpeg,.png,.gif';
                    fileInput.style.display = 'none';

                    uploadBtn.addEventListener('click', () => fileInput.click());
                    fileInput.addEventListener('change', async () => {
                        const file = fileInput.files && fileInput.files[0];
                        if (!file) return;
                        const uploaded = await this.uploadImageFile(file);
                        if (uploaded && uploaded.url) {
                            input.value = uploaded.url;
                            previewImg.src = uploaded.url;
                            previewImg.alt = uploaded.name || 'صورة';
                            previewImg.style.display = 'inline-block';
                            this.showMessage('تم رفع الصورة وتحديث الحقل', 'success');
                        }
                    });

                    const previewImg = document.createElement('img');
                    previewImg.src = (typeof value === 'string' && value) ? value : '';
                    previewImg.alt = 'معاينة';
                    previewImg.style.maxWidth = '64px';
                    previewImg.style.maxHeight = '48px';
                    previewImg.style.objectFit = 'cover';
                    previewImg.style.borderRadius = '6px';
                    previewImg.style.border = '1px solid #ddd';
                    previewImg.style.display = (previewImg.src ? 'inline-block' : 'none');

                    inputWrap.appendChild(uploadBtn);
                    inputWrap.appendChild(fileInput);
                    inputWrap.appendChild(previewImg);
                }

                fieldset.appendChild(inputWrap);
            }
        }
        return fieldset;
    }

    createRepeater(legend, data, prefix, fields, fieldTypes = {}) {
        const fieldset = document.createElement('fieldset');
        const legendEl = document.createElement('legend');
        legendEl.textContent = legend;
        fieldset.appendChild(legendEl);

        const itemsContainer = document.createElement('div');
        itemsContainer.id = `repeater-${prefix}`;
        itemsContainer.dataset.fields = JSON.stringify(fields);
        itemsContainer.dataset.fieldTypes = JSON.stringify(fieldTypes);
        fieldset.appendChild(itemsContainer);

        data.forEach((item, index) => {
            const itemEl = this.createRepeaterItem(item, index, prefix, fields, fieldTypes);
            itemsContainer.appendChild(itemEl);
        });

        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.textContent = `Add ${legend}`;
        addButton.addEventListener('click', () => {
            const newItem = {};
            fields.forEach(field => {
                const type = fieldTypes[field] || 'text';
                if (type === 'checkbox') newItem[field] = false;
                else if (type === 'textarea_array') newItem[field] = [];
                else newItem[field] = '';
            });
            const newItemEl = this.createRepeaterItem(newItem, itemsContainer.children.length, prefix, fields, fieldTypes);
            itemsContainer.appendChild(newItemEl);
        });
        fieldset.appendChild(addButton);

        return fieldset;
    }

    // تنسيق تلقائي لحقول السعر عند فقدان التركيز
    wirePriceFormatting(formRoot) {
        if (!formRoot) return;
        const isPriceField = (el) => {
            const id = el.id || '';
            const name = el.name || '';
            return /(^|[\.-])price$/i.test(id) || /(^|[\.-])price$/i.test(name);
        };

        const inputs = Array.from(formRoot.querySelectorAll('input[type="text"]'))
            .filter(isPriceField);

        const formatPriceValue = (val) => {
            if (!val) return val;
            const trimmed = val.trim();
            if (!trimmed) return val;
            // التقط نص العملة إن وُجد (يحافظ عليه كما هو)
            const currencyMatch = trimmed.match(/(ج\.م|ريال|ر\.س|EGP|SAR|AED|QAR|KWD|دينار|درهم|\$|€|£)/i);
            const currencyText = currencyMatch ? currencyMatch[0] : '';
            // استخرج الرقم (يسمح بالفاصلة والنقطة)
            const numStr = trimmed.replace(/[^0-9\.,]/g, '').replace(/,/g, '');
            if (!numStr) return val;
            const num = parseFloat(numStr);
            if (isNaN(num)) return val;
            const formattedNumber = new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
            return currencyText ? `${formattedNumber} ${currencyText}` : formattedNumber;
        };

        inputs.forEach((input) => {
            input.addEventListener('blur', () => {
                input.value = formatPriceValue(input.value);
            });
        });
    }

    // رفع ملف صورة واحد وإرجاع معلوماته
    async uploadImageFile(file) {
        if (!file) return null;
        const allowed = ['image/jpeg','image/png','image/gif'];
        if (!allowed.includes(file.type)) {
            this.showMessage('نوع الملف غير مدعوم. استخدم JPG/PNG/GIF', 'error');
            return null;
        }
        const adminToken = localStorage.getItem('adminToken') || '';
        const fd = new FormData();
        fd.append('images[]', file, file.name);
        try {
            const resp = await fetch('upload_image.php', { method: 'POST', body: fd, headers: adminToken ? { 'X-ADMIN-TOKEN': adminToken } : {} });
            const data = await resp.json();
            if (data && data.ok && Array.isArray(data.files) && data.files[0]) {
                return data.files[0]; // { name, url }
            }
            const err = (data && data.error) ? data.error : 'فشل رفع الصورة';
            this.showMessage(err, 'error');
            return null;
        } catch (e) {
            console.error('Upload error', e);
            this.showMessage('حدث خطأ أثناء رفع الصورة', 'error');
            return null;
        }
    }

    createRepeaterItem(item, index, prefix, fields, fieldTypes = {}) {
        const itemEl = document.createElement('div');
        itemEl.className = 'repeater-item';

        fields.forEach(key => {
            const id = `${prefix}-${index}-${key}`;
            const label = document.createElement('label');
            label.setAttribute('for', id);
            label.textContent = key;
            itemEl.appendChild(label);

            const value = item[key];
            const type = fieldTypes[key] || (Array.isArray(value) ? 'textarea_array' : (typeof value === 'boolean' ? 'checkbox' : 'text'));
            if (type === 'textarea_array') {
                const textarea = document.createElement('textarea');
                textarea.id = id;
                textarea.name = id;
                textarea.value = Array.isArray(value) ? value.join('\n') : (value || '');
                textarea.placeholder = 'اكتب كل عنصر في سطر مستقل';
                textarea.title = `قائمة ${key}`;
                itemEl.appendChild(textarea);
            } else if (type === 'checkbox') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = id;
                checkbox.name = id;
                checkbox.checked = Boolean(value);
                checkbox.title = `تفعيل ${key}`;
                itemEl.appendChild(checkbox);
            } else {
                const inputWrap = document.createElement('div');
                inputWrap.style.display = 'flex';
                inputWrap.style.gap = '8px';
                inputWrap.style.alignItems = 'center';

                const input = document.createElement('input');
                input.type = 'text';
                input.id = id;
                input.name = id;
                input.value = value ?? '';
                input.placeholder = `أدخل ${key}`;
                input.title = `حقل ${key}`;
                inputWrap.appendChild(input);

                // حقول الصور التي تدعم رفع مباشر
                const isImageField = (key === 'src' || key === 'image_src' || (key === 'icon' && prefix === 'features'));
                if (isImageField) {
                    const uploadBtn = document.createElement('button');
                    uploadBtn.type = 'button';
                    uploadBtn.textContent = 'رفع';
                    uploadBtn.className = 'btn small';

                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.jpg,.jpeg,.png,.gif';
                    fileInput.style.display = 'none';

                    uploadBtn.addEventListener('click', () => fileInput.click());
                    fileInput.addEventListener('change', async () => {
                        const file = fileInput.files && fileInput.files[0];
                        if (!file) return;
                        const uploaded = await this.uploadImageFile(file);
                        if (uploaded && uploaded.url) {
                            input.value = uploaded.url;
                            // معاينة مصغرة
                            previewImg.src = uploaded.url;
                            previewImg.alt = uploaded.name || 'صورة';
                            previewImg.style.display = 'inline-block';
                            this.showMessage('تم رفع الصورة وتحديث الحقل', 'success');
                        }
                    });

                    const previewImg = document.createElement('img');
                    previewImg.src = (typeof value === 'string' && value) ? value : '';
                    previewImg.alt = 'معاينة';
                    previewImg.style.maxWidth = '64px';
                    previewImg.style.maxHeight = '48px';
                    previewImg.style.objectFit = 'cover';
                    previewImg.style.borderRadius = '6px';
                    previewImg.style.border = '1px solid #ddd';
                    previewImg.style.display = (previewImg.src ? 'inline-block' : 'none');

                    inputWrap.appendChild(uploadBtn);
                    inputWrap.appendChild(fileInput);
                    inputWrap.appendChild(previewImg);
                }

                itemEl.appendChild(inputWrap);
            }
        });

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => itemEl.remove());
        itemEl.appendChild(removeButton);

        return itemEl;
    }

    async saveChanges() {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // تحقق من توفر رمز الإدارة
        const adminToken = localStorage.getItem('adminToken') || '';
        if (!adminToken) {
            this.showMessage('يرجى إدخال رمز الإدارة قبل الحفظ', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            return;
        }

        const form = document.getElementById(`${this.currentPage}-form`);
        const formData = new FormData(form);
        const data = this.contentCache[this.currentPage];

        // استخراج الحقول البسيطة
        for (const key in data) {
            if (key === 'footer' && typeof data.footer === 'object') {
                for (const footerKey in data.footer) {
                    data.footer[footerKey] = formData.get(`footer-${footerKey}`) ?? data.footer[footerKey];
                }
            } else if (!Array.isArray(data[key]) && typeof data[key] === 'object') {
                for (const subKey in data[key]) {
                    const v = formData.get(`${key}-${subKey}`);
                    if (v !== null) data[key][subKey] = v;
                }
            }
        }

        // مساعد لضبط قيمة داخل مسار متداخل
        const setNested = (obj, path, value) => {
            const parts = path.split('.');
            let cur = obj;
            for (let i = 0; i < parts.length - 1; i++) {
                const p = parts[i];
                if (!cur[p]) cur[p] = {};
                cur = cur[p];
            }
            cur[parts[parts.length - 1]] = value;
        };

        // استخراج التكرارات حسب الصفحة
        const extractRepeater = (prefix) => {
            const container = document.getElementById(`repeater-${prefix}`);
            if (!container) return null;
            const fields = JSON.parse(container.dataset.fields || '[]');
            const types = JSON.parse(container.dataset.fieldTypes || '{}');
            const items = [];
            Array.from(container.children).forEach((itemEl, idx) => {
                if (!itemEl.classList.contains('repeater-item')) return;
                const item = {};
                fields.forEach((key) => {
                    const id = `${prefix}-${idx}-${key}`;
                    const type = types[key] || 'text';
                    if (type === 'checkbox') {
                        const el = itemEl.querySelector(`#${CSS.escape(id)}`);
                        item[key] = el ? el.checked : false;
                    } else {
                        const el = itemEl.querySelector(`#${CSS.escape(id)}`);
                        const val = el ? el.value.trim() : '';
                        if (type === 'textarea_array') {
                            item[key] = val ? val.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
                        } else {
                            item[key] = val;
                        }
                    }
                });
                items.push(item);
            });
            return items;
        };

        if (this.currentPage === 'index') {
            const features = extractRepeater('features');
            if (features) data.features = features;
        }
        if (this.currentPage === 'pricing') {
            const cards = extractRepeater('pricing_cards');
            if (cards) data.pricing_cards = cards;
        }
        if (this.currentPage === 'gallery') {
            const imgs = extractRepeater('gallery_images');
            if (imgs) data.gallery_images = imgs;
        }
        if (this.currentPage === 'shop') {
            const items = extractRepeater('shop_items');
            if (items) data.shop_items = items;
        }
        if (this.currentPage === 'sauna') {
            const introFeatures = extractRepeater('sauna_intro.features');
            if (introFeatures) setNested(data, 'sauna_intro.features', introFeatures);
            const saunaPkgs = extractRepeater('sauna_packages.packages');
            if (saunaPkgs) setNested(data, 'sauna_packages.packages', saunaPkgs);
            const benefits = extractRepeater('sauna_benefits.benefits');
            if (benefits) setNested(data, 'sauna_benefits.benefits', benefits);
        }

        try {
            const response = await fetch(`save_content.php?page=${this.currentPage}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-ADMIN-TOKEN': adminToken,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            this.showMessage('Content saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save content:', error);
            this.showMessage('Failed to save content', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    showMessage(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';

        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

new ContentManager();