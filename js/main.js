// Gran Caffè L'Aquila - Digital Wine List JavaScript

class WineListApp {
    constructor() {
        this.wines = [];
        this.filteredWines = [];
        this.currentView = 'grid';
        this.currentFilters = {
            type: null,
            region: null,
            search: ''
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadWineData();
            this.setupEventListeners();
            this.handleURLParameters();
            this.renderCurrentPage();
        } catch (error) {
            console.error('Error initializing wine list app:', error);
            this.showError('Failed to load wine data. Please refresh the page.');
        }
    }

    async loadWineData() {
        try {
            const response = await fetch('data/wines.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // Filter out corrupted wines with invalid regions
            const validRegions = [
                'SICILIA', 'PIEMONTE', 'TOSCANA', 'VENETO', 'LOMBARDIA', 'EMILIA-ROMAGNA',
                'LAZIO', 'CAMPANIA', 'PUGLIA', 'CALABRIA', 'BASILICATA', 'MOLISE',
                'ABRUZZO', 'UMBRIA', 'LE MARCHE', 'FRIULI-VENEZIA GIULIA', 'FRIULI', 'TRENTINO ALTO-ADIGE',
                'VALLE D\'AOSTA', 'LIGURIA', 'SARDEGNA', 'TOSCANA (BOLGHERI)', 'LUGANA DOC (VENETO)',
                'TARANTO IGT (PUGLIA)', 'MATERA DOC (BASILICATA)'
            ];
            
            this.wines = (data.wines || []).filter(wine => {
                // Filter out wines with corrupted data
                const hasValidRegion = wine.region && validRegions.includes(wine.region);
                const hasValidName = wine.wine_name && wine.wine_name !== 'WINE NAME' && wine.wine_name !== 'WINE PRICE' && wine.wine_name !== 'VINTAGE';
                const hasValidProducer = wine.wine_producer && wine.wine_producer !== 'UNKNOWN PRODUCER';
                const hasValidPrice = (wine.wine_price && wine.wine_price !== '0') || 
                                     (wine.wine_price_bottle && wine.wine_price_bottle !== '0') ||
                                     (wine.wine_price_glass && wine.wine_price_glass !== '0');
                
                // Filter out sangria and cocktail wines
                const isNotSangriaOrCocktail = wine.wine_type && 
                    !wine.wine_type.toUpperCase().includes('SANGRIA') && 
                    !wine.wine_type.toUpperCase().includes('COCKTAIL');
                
                return hasValidRegion && hasValidName && hasValidProducer && hasValidPrice && isNotSangriaOrCocktail;
            });
            
            this.filteredWines = [...this.wines];
            console.log(`Loaded ${this.wines.length} valid wines (filtered out corrupted data)`);
            
            // Load wine images mapping
            await this.loadWineImages();
            
        // Debug: Log wine family distribution
        this.logWineFamilyDistribution();
        
        // General checkup
        this.performGeneralCheckup();
        
        // Test all regions
        this.testAllRegions();
        } catch (error) {
            console.error('Error loading wine data:', error);
            // Fallback to empty array if data loading fails
            this.wines = [];
            this.filteredWines = [];
        }
    }

    async loadWineImages() {
        // Wine images mapping integrated directly in the code
        this.wineImages = {
            "LAMBRUSCO": "https://www.agraria.org/vini/lambrusco.jpg",
            "MONTEPULCIANO D'ABRUZZO": "https://www.agraria.org/vini/montepulciano-d-abruzzo.jpg",
            "CHIANTI CLASSICO": "https://www.agraria.org/vini/chianti-classico.jpg",
            "BAROLO": "https://www.agraria.org/vini/barolo.jpg",
            "BRUNELLO DI MONTALCINO": "https://www.agraria.org/vini/brunello-di-montalcino.jpg"
        };
        console.log(`Loaded ${Object.keys(this.wineImages).length} wine images`);
    }

    setupEventListeners() {
        // Search functionality
        const searchInputs = document.querySelectorAll('.luxury-search-input');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                if (this.getCurrentPage() === 'regions') {
                    this.filterRegions();
                } else if (this.getCurrentPage() === 'index') {
                    this.applyIndexSearch();
                } else {
                    this.applyFilters();
                }
            });
        });

        // Filter buttons
        const filterButtons = document.querySelectorAll('.luxury-filter-btn, .filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.showFilterOptions(button);
            });
        });

        // View toggle
        const gridViewBtn = document.getElementById('gridViewBtn');
        const tableViewBtn = document.getElementById('tableViewBtn');
        
        if (gridViewBtn && tableViewBtn) {
            gridViewBtn.addEventListener('click', () => this.toggleView('grid'));
            tableViewBtn.addEventListener('click', () => this.toggleView('table'));
        }

        // Explore wine buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('explore-wine') || e.target.classList.contains('table-explore-btn')) {
                e.preventDefault();
                this.exploreWine(e.target);
            }
        });

        // Explore region buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('explore-region') || e.target.classList.contains('table-explore-region-btn')) {
                e.preventDefault();
                this.exploreRegion(e.target);
            }
        });

        // Wine card hover effects
        this.setupHoverEffects();
    }

    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const region = urlParams.get('region');
        const wineId = urlParams.get('id');

        if (type) {
            this.currentFilters.type = type;
        }
        if (region) {
            // Decode URL-encoded region names
            this.currentFilters.region = decodeURIComponent(region);
            console.log(`Region from URL: ${region} -> decoded: ${this.currentFilters.region}`);
        }
        if (wineId) {
            this.loadWineDetails(wineId);
        }
    }

    renderCurrentPage() {
        const currentPage = this.getCurrentPage();
        
        switch (currentPage) {
            case 'index':
                this.renderHomePage();
                break;
            case 'regions':
                this.renderRegionsPage();
                break;
            case 'wines':
                this.renderWinesPage();
                break;
            case 'wine-details':
                this.renderWineDetailsPage();
                break;
        }
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('regions')) return 'regions';
        if (path.includes('wines')) return 'wines';
        if (path.includes('wine-details')) return 'wine-details';
        return 'index';
    }

    renderHomePage() {
        // Update wine type cards with actual wine counts
        const wineTypes = ['ROSSO', 'BIANCO', 'ROSATO', 'ARANCIONE', 'BOLLICINE', 'NON ALCOLICO'];
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        
        wineCards.forEach((card, index) => {
            if (wineTypes[index]) {
                const count = this.wines.filter(wine => this.wineMatchesFamily(wine, wineTypes[index])).length;
                const countElement = card.querySelector('.wine-count');
                if (countElement) {
                    countElement.textContent = `${count} wines`;
                }
            }
        });
    }

    renderRegionsPage() {
        const regionsContainer = document.querySelector('.regions-container');
        if (!regionsContainer) {
            console.error('Regions container not found');
            return;
        }

        // Get all unique regions from wines (filtered by type if specified)
        let winesToUse = this.wines;
        if (this.currentFilters.type) {
            winesToUse = this.wines.filter(wine => this.wineMatchesFamily(wine, this.currentFilters.type));
        }
        
        // Get unique regions using normalized names to avoid duplicates
        const regionSet = new Set();
        winesToUse
            .filter(wine => wine.region && wine.region.trim() !== '')
            .forEach(wine => {
                const normalizedRegion = this.normalizeRegionName(wine.region);
                regionSet.add(normalizedRegion);
            });
        
        this.allRegions = [...regionSet].sort();

        console.log(`Found ${this.allRegions.length} regions for type: ${this.currentFilters.type || 'all'}`);

        // Update page title based on filter
        this.updatePageTitle();

        // Update breadcrumb
        this.updateBreadcrumb();

        // Render region cards
        this.filterRegions();
    }

    updatePageTitle() {
        const subtitles = document.querySelectorAll('.luxury-subtitle');
        if (subtitles.length >= 2) {
            // Keep the "present" subtitle as is
            // Update the second subtitle with the appropriate title
            if (this.currentFilters.type) {
                subtitles[1].textContent = `${this.getWineTypeName(this.currentFilters.type)} - REGIONS`;
            } else {
                subtitles[1].textContent = 'WINE REGIONS';
            }
        } else if (subtitles.length === 1) {
            // Fallback if only one subtitle exists
            const title = subtitles[0];
            if (this.currentFilters.type) {
                title.textContent = `${this.getWineTypeName(this.currentFilters.type)} - REGIONS`;
            } else {
                title.textContent = 'WINE REGIONS';
            }
        }
    }

    updateBreadcrumb() {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            if (this.currentFilters.type) {
                breadcrumb.innerHTML = `
                    <a href="index.html">Home</a>
                    <i class="fas fa-chevron-right"></i>
                    <span>${this.getWineTypeName(this.currentFilters.type)} Regions</span>
                `;
            } else {
                breadcrumb.innerHTML = `
                    <a href="index.html">Home</a>
                    <i class="fas fa-chevron-right"></i>
                    <span>Wine Regions</span>
                `;
            }
        }
    }

    filterRegions() {
        const regionsGrid = document.querySelector('.regions-grid');
        if (!regionsGrid || !this.allRegions) return;

        const filteredRegions = this.allRegions.filter(region => 
            !this.currentFilters.search || region.toLowerCase().includes(this.currentFilters.search)
        );

        regionsGrid.innerHTML = filteredRegions.map(region => {
            // Count wines in this region, considering wine type filter if active
            // Use normalized region comparison for accurate counting
            let count = this.wines.filter(wine => {
                const normalizedWineRegion = this.normalizeRegionName(wine.region);
                const normalizedFilterRegion = this.normalizeRegionName(region);
                return normalizedWineRegion === normalizedFilterRegion;
            }).length;
            
            if (this.currentFilters.type) {
                count = this.wines.filter(wine => {
                    const normalizedWineRegion = this.normalizeRegionName(wine.region);
                    const normalizedFilterRegion = this.normalizeRegionName(region);
                    return normalizedWineRegion === normalizedFilterRegion && this.wineMatchesFamily(wine, this.currentFilters.type);
                }).length;
            }
            
            const icon = this.getRegionIcon(region);
            const normalizedRegion = this.normalizeRegionName(region);
            
            // Add type parameter to URL if filtering by wine type
            let url = `wines.html?region=${encodeURIComponent(normalizedRegion)}`;
            if (this.currentFilters.type) {
                url += `&type=${encodeURIComponent(this.currentFilters.type)}`;
            }
            
            return `
                <a href="${url}" class="region-card">
                    <div class="region-icon">
                        <i class="${icon}"></i>
                    </div>
                    <h3 class="region-title">${normalizedRegion}</h3>
                    <p class="wine-count">${count} wines</p>
                </a>
            `;
        }).join('');

        // Also render the table view
        this.renderRegionsTable(filteredRegions);
        
        // Update regions count
        this.updateRegionsCount(filteredRegions.length);
    }

    renderRegionsTable(regions) {
        const regionsTable = document.getElementById('regionsTable');
        if (!regionsTable) return;

        const tbody = regionsTable.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = regions.map(region => {
            // Count wines in this region, considering wine type filter if active
            // Use normalized region comparison for accurate counting
            let count = this.wines.filter(wine => {
                const normalizedWineRegion = this.normalizeRegionName(wine.region);
                const normalizedFilterRegion = this.normalizeRegionName(region);
                return normalizedWineRegion === normalizedFilterRegion;
            }).length;
            
            if (this.currentFilters.type) {
                count = this.wines.filter(wine => {
                    const normalizedWineRegion = this.normalizeRegionName(wine.region);
                    const normalizedFilterRegion = this.normalizeRegionName(region);
                    return normalizedWineRegion === normalizedFilterRegion && this.wineMatchesFamily(wine, this.currentFilters.type);
                }).length;
            }
            
            const normalizedRegion = this.normalizeRegionName(region);
            const description = this.getRegionDescription(region);
            
            // Add type parameter to URL if filtering by wine type
            let url = `wines.html?region=${encodeURIComponent(normalizedRegion)}`;
            if (this.currentFilters.type) {
                url += `&type=${encodeURIComponent(this.currentFilters.type)}`;
            }
            
            return `
                <tr>
                    <td class="table-region-name">${normalizedRegion}</td>
                    <td class="table-region-count">${count} wines</td>
                    <td class="table-region-description">${description}</td>
                    <td><a href="${url}" class="table-explore-region-btn">Explore</a></td>
                </tr>
            `;
        }).join('');
    }

    updateRegionsCount(count) {
        const regionsCount = document.querySelector('.regions-count');
        if (regionsCount) {
            regionsCount.textContent = `${count} regions`;
        }
    }

    getRegionDescription(region) {
        // Add some basic descriptions for major regions
        const descriptions = {
            'TOSCANA': 'Famous for Chianti and Brunello wines',
            'PIEMONTE': 'Home of Barolo and Barbaresco',
            'VENETO': 'Known for Amarone and Prosecco',
            'SICILIA': 'Mediterranean climate, diverse terroir',
            'LOMBARDIA': 'Northern region with Alpine influences',
            'EMILIA-ROMAGNA': 'Rich culinary tradition, Lambrusco',
            'LAZIO': 'Central Italy, Frascati and Est! Est!! Est!!!',
            'CAMPANIA': 'Ancient winemaking traditions',
            'PUGLIA': 'Southern Italy, Primitivo and Negroamaro',
            'SARDEGNA': 'Island wines with unique character'
        };
        
        return descriptions[region] || 'Explore the wines of this region';
    }

    renderWinesPage() {
        if (!this.currentFilters.region) {
            console.error('No region specified for wines page');
            return;
        }

        console.log(`Rendering wines page for region: ${this.currentFilters.region}, type: ${this.currentFilters.type || 'all'}`);

        // Filter wines by region (and type if specified)
        this.filteredWines = this.wines.filter(wine => {
            // Use normalized region comparison to handle variations
            const normalizedWineRegion = this.normalizeRegionName(wine.region);
            const normalizedFilterRegion = this.normalizeRegionName(this.currentFilters.region);
            
            const matchesRegion = normalizedWineRegion === normalizedFilterRegion;
            const matchesType = !this.currentFilters.type || this.wineMatchesFamily(wine, this.currentFilters.type);
            
            
            return matchesRegion && matchesType;
        });

        console.log(`Found ${this.filteredWines.length} wines for ${this.currentFilters.region}`);

        // Add wine type badge if filtering by type
        if (this.currentFilters.type) {
            const header = document.querySelector('.luxury-header');
            if (header) {
                this.addWineTypeBadge(this.currentFilters.type, header);
            }
        }

        // Update page title
        this.updateWinesPageTitle();

        // Update HTML page title
        this.updateHTMLPageTitle();

        // Update section title
        this.updateWinesSectionTitle();

        // Update wine count
        const countElement = document.querySelector('.wines-count');
        if (countElement) {
            countElement.textContent = `${this.filteredWines.length} wines`;
        }

        // Update breadcrumb
        this.updateWinesBreadcrumb();

        // Render wines
        this.renderWines();
    }

    updateWinesPageTitle() {
        const subtitles = document.querySelectorAll('.luxury-subtitle');
        if (subtitles.length >= 2) {
            // Keep the "present" subtitle as is
            // Update the second subtitle with the appropriate title
            if (this.currentFilters.type) {
                subtitles[1].textContent = `${this.currentFilters.region} ${this.getWineTypeName(this.currentFilters.type)}`;
            } else {
                subtitles[1].textContent = `${this.currentFilters.region} WINES`;
            }
        } else if (subtitles.length === 1) {
            // Fallback if only one subtitle exists
            const title = subtitles[0];
            if (this.currentFilters.type) {
                title.textContent = `${this.currentFilters.region} ${this.getWineTypeName(this.currentFilters.type)}`;
            } else {
                title.textContent = `${this.currentFilters.region} WINES`;
            }
        }
    }

    updateHTMLPageTitle() {
        // Update the HTML page title
        let pageTitle = `${this.currentFilters.region} Wines`;
        if (this.currentFilters.type) {
            const typeName = this.getWineTypeName(this.currentFilters.type);
            pageTitle = `${this.currentFilters.region} ${typeName}`;
        }
        document.title = `${pageTitle} - Gran Caffè L'Aquila`;
    }

    updateWinesSectionTitle() {
        // Update the wines section title
        const winesTitle = document.querySelector('.wines-title');
        if (winesTitle) {
            let sectionTitle = `${this.currentFilters.region} SELECTION`;
            if (this.currentFilters.type) {
                const typeName = this.getWineTypeName(this.currentFilters.type);
                sectionTitle = `${this.currentFilters.region} ${typeName.toUpperCase()}`;
            }
            winesTitle.textContent = sectionTitle;
        }
    }

    updateWinesBreadcrumb() {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            let regionUrl = 'regions.html';
            if (this.currentFilters.type) {
                regionUrl += `?type=${encodeURIComponent(this.currentFilters.type)}`;
            }
            
            breadcrumb.innerHTML = `
                <a href="index.html">Home</a>
                <i class="fas fa-chevron-right"></i>
                <a href="${regionUrl}">Wine Regions</a>
                <i class="fas fa-chevron-right"></i>
                <span>${this.currentFilters.region}</span>
            `;
        }
    }

    renderWines() {
        const winesGrid = document.getElementById('winesGrid');
        const wineTable = document.getElementById('wineTable');
        
        console.log(`Rendering ${this.filteredWines.length} wines`);
        
        if (winesGrid) {
            winesGrid.innerHTML = this.filteredWines.map(wine => this.createWineCard(wine)).join('');
            console.log(`Updated wines grid with ${this.filteredWines.length} cards`);
        }
        
        if (wineTable) {
            const tbody = wineTable.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = this.filteredWines.map(wine => this.createWineTableRow(wine)).join('');
                console.log(`Updated wines table with ${this.filteredWines.length} rows`);
            }
        }
    }

    createWineCard(wine) {
        const wineFamily = this.getWineFamily(wine.wine_type);
        
        const wineTypeNames = {
            'ROSSO': 'Red',
            'BIANCO': 'White',
            'ROSATO': 'Rosé',
            'ARANCIONE': 'Orange',
            'BOLLICINE': 'Sparkling',
            'NON ALCOLICO': 'Non-Alcoholic'
        };

        const wineFamilyClasses = {
            'ROSSO': 'wine-family-rosso',
            'BIANCO': 'wine-family-bianco',
            'ROSATO': 'wine-family-rosato',
            'ARANCIONE': 'wine-family-arancione',
            'BOLLICINE': 'wine-family-bollicine',
            'NON ALCOLICO': 'wine-family-nonalco'
        };

        return `
            <div class="wine-card">
                <div class="wine-family-indicator ${wineFamilyClasses[wineFamily] || 'wine-family-rosso'}">
                    ${wineTypeNames[wineFamily] || 'Wine'}
                </div>
                <div class="wine-header">
                    <h3 class="wine-name">${wine.wine_name}</h3>
                    <div class="wine-price">$${wine.wine_price || wine.wine_price_bottle || wine.wine_price_glass || 'N/A'}</div>
                </div>
                <div class="wine-details">
                    <p class="wine-producer">${wine.wine_producer || 'Producer not specified'}</p>
                    <p class="wine-region">${wine.region}</p>
                    <p class="wine-grape">${wine.varietals || 'N/A'}</p>
                    <p class="wine-description">${wine.wine_description || 'A fine wine selection.'}</p>
                </div>
                <div class="wine-actions">
                    <span class="wine-year">${this.extractYear(wine.wine_vintage)}</span>
                    <a href="wine-details.html?id=${wine.wine_number}${this.currentFilters.type ? '&type=' + encodeURIComponent(this.currentFilters.type) : ''}" class="explore-wine">Explore Wine</a>
                </div>
            </div>
        `;
    }

    createWineTableRow(wine) {
        return `
            <tr>
                <td class="table-wine-name">${wine.wine_name}</td>
                <td class="table-wine-producer">${wine.wine_producer || 'Producer not specified'}</td>
                <td class="table-wine-region">${wine.region}</td>
                <td>${wine.varietals || 'N/A'}</td>
                <td>${this.extractYear(wine.wine_vintage)}</td>
                <td class="table-wine-price">$${wine.wine_price || wine.wine_price_bottle || wine.wine_price_glass || 'N/A'}</td>
                <td><a href="wine-details.html?id=${wine.wine_number}${this.currentFilters.type ? '&type=' + encodeURIComponent(this.currentFilters.type) : ''}" class="table-explore-btn">Explore</a></td>
            </tr>
        `;
    }

    renderWineDetailsPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const wineId = urlParams.get('id');
        
        if (wineId) {
            this.loadWineDetails(wineId);
        }
    }

    loadWineDetails(wineId) {
        const wine = this.wines.find(w => w.wine_number === wineId);
        if (!wine) {
            this.showError('Wine not found');
            return;
        }

        // Update wine details
        this.updateWineDetails(wine);
    }

    updateWineDetails(wine) {
        // Add wine family indicator to wine details container
        const wineDetailsContainer = document.querySelector('.wine-details-container');
        if (wineDetailsContainer) {
            this.addWineFamilyIndicator(wine.wine_type, wineDetailsContainer);
        }

        // Add wine type badge to header
        const header = document.querySelector('.luxury-header');
        if (header) {
            this.addWineTypeBadge(wine.wine_type, header);
        }

        // Update wine name
        const wineName = document.getElementById('wineName');
        if (wineName) {
            wineName.textContent = wine.wine_name;
        }

        // Update wine producer (add it right after the wine name)
        const wineRegion = document.getElementById('wineRegion');
        if (wineRegion) {
            wineRegion.innerHTML = `
                <span class="wine-producer-detail">${wine.wine_producer || 'Producer not specified'}</span>
                <span class="wine-region-detail">${wine.region}</span>
            `;
        }

        // Update wine price
        const winePrice = document.getElementById('winePrice');
        if (winePrice) {
            winePrice.textContent = `$${wine.wine_price || wine.wine_price_bottle || wine.wine_price_glass || 'N/A'}`;
        }

        // Update page title
        document.title = `${wine.wine_name} - Gran Caffè L'Aquila`;

        // Update meta information
        this.updateMetaInfo(wine);

        // Update wine description
        this.updateWineDescription(wine);

        // Update wine image
        this.updateWineImage(wine);

        // Update tasting notes
        this.updateTastingNotes(wine);

        // Update wine information
        this.updateWineInformation(wine);

        // Update food pairings
        this.updateFoodPairings(wine);

        // Update producer information
        this.updateProducerInfo(wine);

        // Update breadcrumb
        this.updateBreadcrumb(wine);

        // Update back button
        this.updateBackButton(wine);
    }

    updateMetaInfo(wine) {
        const metaItems = [
            { label: 'Grape Variety', value: wine.varietals || 'N/A' },
            { label: 'Vintage', value: this.extractYear(wine.wine_vintage) },
            { label: 'Alcohol', value: wine.alcohol || 'N/A' },
            { label: 'Aging', value: wine.aging || 'N/A' },
            { label: 'Soil', value: wine.soil || 'N/A' },
            { label: 'Elevation', value: wine.elevation || 'N/A' },
            { label: 'Organic', value: wine.organic ? 'Yes' : 'No' }
        ];

        const metaContainer = document.getElementById('wineMeta');
        if (metaContainer) {
            metaContainer.innerHTML = metaItems.map(item => `
                <div class="meta-item">
                    <span class="meta-label">${item.label}</span>
                    <span class="meta-value">${item.value}</span>
                </div>
            `).join('');
        }
    }

    updateWineDescription(wine) {
        const descriptionContainer = document.getElementById('wineDescription');
        if (descriptionContainer) {
            const description = wine.wine_description || 'A fine wine selection from our curated collection.';
            descriptionContainer.innerHTML = `<p>${description}</p>`;
        }
    }

    updateWineImage(wine) {
        const wineBottleIcon = document.getElementById('wineBottleIcon');
        const wineBottleImage = document.getElementById('wineBottleImage');
        
        if (!wineBottleIcon || !wineBottleImage) return;
        
        // Try to find a matching image for this wine
        const wineImageUrl = this.findWineImage(wine);
        
        if (wineImageUrl) {
            // Show image and hide icon
            wineBottleImage.src = wineImageUrl;
            wineBottleImage.style.display = 'block';
            wineBottleIcon.style.display = 'none';
            
            // Add error handling for image loading
            wineBottleImage.onerror = () => {
                console.log('Failed to load wine image, falling back to icon');
                wineBottleImage.style.display = 'none';
                wineBottleIcon.style.display = 'block';
            };
        } else {
            // No image found, show icon
            wineBottleImage.style.display = 'none';
            wineBottleIcon.style.display = 'block';
        }
    }

    findWineImage(wine) {
        if (!this.wineImages) return null;
        
        console.log(`Looking for image for wine: ${wine.wine_name} by ${wine.wine_producer}`);
        
        // Try exact match first
        if (this.wineImages[wine.wine_name]) {
            console.log(`Found exact match for wine name: ${wine.wine_name}`);
            return this.wineImages[wine.wine_name];
        }
        
        // Try matching by producer (clean up producer name)
        if (wine.wine_producer) {
            const producerName = wine.wine_producer.replace(/[*]/g, '').trim();
            if (this.wineImages[producerName]) {
                console.log(`Found match for producer: ${producerName}`);
                return this.wineImages[producerName];
            }
        }
        
        // Try partial matches for wine name (more flexible)
        for (const [wineName, imageUrl] of Object.entries(this.wineImages)) {
            const wineNameLower = wine.wine_name.toLowerCase();
            const mappingNameLower = wineName.toLowerCase();
            
            // Check if wine name is contained in mapping name or vice versa
            if (mappingNameLower.includes(wineNameLower) || wineNameLower.includes(mappingNameLower)) {
                console.log(`Found partial match for wine name: ${wine.wine_name} -> ${wineName}`);
                return imageUrl;
            }
        }
        
        // Try partial matches for producer (more flexible)
        if (wine.wine_producer) {
            const producerName = wine.wine_producer.replace(/[*]/g, '').trim();
            const producerNameLower = producerName.toLowerCase();
            
            for (const [wineName, imageUrl] of Object.entries(this.wineImages)) {
                const mappingNameLower = wineName.toLowerCase();
                
                // Check if producer name is contained in mapping name or vice versa
                if (mappingNameLower.includes(producerNameLower) || producerNameLower.includes(mappingNameLower)) {
                    console.log(`Found partial match for producer: ${producerName} -> ${wineName}`);
                    return imageUrl;
                }
            }
        }
        
        // Try matching by key words in wine name
        const wineNameWords = wine.wine_name.toLowerCase().split(' ');
        for (const [wineName, imageUrl] of Object.entries(this.wineImages)) {
            const mappingNameLower = wineName.toLowerCase();
            
            // Check if any word from wine name appears in mapping name
            for (const word of wineNameWords) {
                if (word.length > 2 && mappingNameLower.includes(word)) {
                    console.log(`Found keyword match: ${word} in ${wineName}`);
                    return imageUrl;
                }
            }
        }
        
        console.log(`No image found for wine: ${wine.wine_name}`);
        return null;
    }

    updateTastingNotes(wine) {
        const tastingGrid = document.getElementById('tastingGrid');
        if (tastingGrid) {
            // Check if we have detailed tasting notes in the wine data
            if (wine.tasting_notes) {
                // Use existing tasting notes if available
                tastingGrid.innerHTML = wine.tasting_notes.map(note => `
                    <div class="tasting-category">
                        <span class="tasting-label">${note.label}</span>
                        <span class="tasting-value">${note.value}</span>
                    </div>
                `).join('');
            } else {
                // Generate elegant fallback message
                const elegantMessage = `
                    <div class="tasting-category elegant-message">
                        <span class="tasting-label">Organoleptic Profile</span>
                        <span class="tasting-value">Our expert sommelier team is currently crafting a detailed organoleptic profile for this exceptional wine. We are carefully analyzing its complex aromas, flavors, and characteristics to provide you with the most comprehensive tasting notes. Please check back soon for our detailed sensory analysis.</span>
                    </div>
                `;
                tastingGrid.innerHTML = elegantMessage;
            }
        }
    }

    updateWineInformation(wine) {
        const infoGrid = document.getElementById('infoGrid');
        if (infoGrid) {
            const infoItems = [
                { label: 'Producer', value: wine.wine_producer || 'N/A' },
                { label: 'Category', value: wine.category || 'N/A' },
                { label: 'Wine Type', value: this.getWineTypeName(wine.wine_type) },
                { label: 'Region', value: wine.region || 'N/A' },
                { label: 'Vintage', value: wine.wine_vintage || 'N/A' },
                { label: 'Alcohol Content', value: wine.alcohol || 'N/A' },
                { label: 'Aging Process', value: wine.aging || 'N/A' },
                { label: 'Soil Type', value: wine.soil || 'N/A' },
                { label: 'Elevation', value: wine.elevation || 'N/A' },
                { label: 'Organic', value: wine.organic ? 'Certified Organic' : 'Conventional' }
            ];

            infoGrid.innerHTML = infoItems.map(item => `
                <div class="tasting-category">
                    <span class="tasting-label">${item.label}</span>
                    <span class="tasting-value">${item.value}</span>
                </div>
            `).join('');
        }
    }

    updateFoodPairings(wine) {
        const pairingList = document.getElementById('pairingList');
        if (pairingList) {
            // Generate food pairings based on wine type
            const pairings = this.getFoodPairings(wine);
            pairingList.innerHTML = pairings.map(pairing => `
                <div class="pairing-item">
                    <i class="${pairing.icon} pairing-icon"></i>
                    <h3 class="pairing-name">${pairing.name}</h3>
                </div>
            `).join('');
        }
    }

    getFoodPairings(wine) {
        const pairings = {
            'ROSSO': [
                { name: 'Roasted Meats', icon: 'fas fa-drumstick-bite' },
                { name: 'Aged Cheeses', icon: 'fas fa-cheese' },
                { name: 'Pasta with Red Sauce', icon: 'fas fa-utensils' },
                { name: 'Dark Chocolate', icon: 'fas fa-cookie-bite' }
            ],
            'BIANCO': [
                { name: 'Seafood', icon: 'fas fa-fish' },
                { name: 'Light Pasta', icon: 'fas fa-utensils' },
                { name: 'Fresh Salads', icon: 'fas fa-leaf' },
                { name: 'Soft Cheeses', icon: 'fas fa-cheese' }
            ],
            'ROSATO': [
                { name: 'Grilled Fish', icon: 'fas fa-fish' },
                { name: 'Light Appetizers', icon: 'fas fa-cookie-bite' },
                { name: 'Summer Salads', icon: 'fas fa-leaf' },
                { name: 'Fresh Fruits', icon: 'fas fa-apple-alt' }
            ],
            'ARANCIONE': [
                { name: 'Aged Cheeses', icon: 'fas fa-cheese' },
                { name: 'Spiced Dishes', icon: 'fas fa-pepper-hot' },
                { name: 'Roasted Vegetables', icon: 'fas fa-carrot' },
                { name: 'Cured Meats', icon: 'fas fa-bacon' }
            ],
            'BOLLICINE': [
                { name: 'Appetizers', icon: 'fas fa-cookie-bite' },
                { name: 'Celebration Foods', icon: 'fas fa-birthday-cake' },
                { name: 'Light Desserts', icon: 'fas fa-ice-cream' },
                { name: 'Fresh Oysters', icon: 'fas fa-fish' }
            ],
            'NON ALCOLICO': [
                { name: 'Fruit Platters', icon: 'fas fa-apple-alt' },
                { name: 'Light Appetizers', icon: 'fas fa-cookie-bite' },
                { name: 'Salads', icon: 'fas fa-leaf' },
                { name: 'Desserts', icon: 'fas fa-ice-cream' }
            ]
        };
        return pairings[wine.wine_type] || pairings['ROSSO'];
    }

    updateProducerInfo(wine) {
        const producerName = document.getElementById('producerName');
        const producerDescription = document.getElementById('producerDescription');
        
        if (producerName) {
            producerName.textContent = wine.wine_producer || 'Producer Information Not Available';
        }
        
        if (producerDescription) {
            const description = this.getProducerDescription(wine);
            producerDescription.textContent = description;
        }
    }

    getProducerDescription(wine) {
        // Generate a description based on the wine data
        const region = wine.region || 'this region';
        const wineType = this.getWineTypeName(wine.wine_type);
        const organic = wine.organic ? ' This wine is produced using organic methods.' : '';
        
        return `This ${wineType.toLowerCase()} is crafted in ${region}, showcasing the unique terroir and winemaking traditions of the area.${organic} The producer focuses on quality and authenticity, bringing you an exceptional wine experience.`;
    }

    updateBackButton(wine) {
        const backButton = document.getElementById('backButton');
        const backButtonText = document.getElementById('backButtonText');
        
        if (backButton && backButtonText) {
            if (wine.region) {
                // Check if there's a wine type filter in the URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const type = urlParams.get('type');
                
                let backUrl = `wines.html?region=${encodeURIComponent(wine.region)}`;
                if (type) {
                    backUrl += `&type=${encodeURIComponent(type)}`;
                }
                
                backButton.href = backUrl;
                
                // Update button text based on wine type
                if (type) {
                    const wineFamily = this.getWineFamily(wine.wine_type);
                    const typeName = this.getWineTypeName(wineFamily);
                    backButtonText.textContent = `Back to ${wine.region} ${typeName}`;
                } else {
                    backButtonText.textContent = `Back to ${wine.region} Wines`;
                }
            } else {
                backButton.href = 'regions.html';
                backButtonText.textContent = 'Back to Regions';
            }
        }
    }

    updateBreadcrumb(wine) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            // Check if there's a wine type filter in the URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const type = urlParams.get('type');
            
            let regionUrl = `wines.html?region=${encodeURIComponent(wine.region)}`;
            if (type) {
                regionUrl += `&type=${encodeURIComponent(type)}`;
            }
            
            breadcrumb.innerHTML = `
                <a href="index.html">Home</a>
                <i class="fas fa-chevron-right"></i>
                <a href="regions.html${type ? '?type=' + encodeURIComponent(type) : ''}">Wine Regions</a>
                <i class="fas fa-chevron-right"></i>
                <a href="${regionUrl}">${wine.region}</a>
                <i class="fas fa-chevron-right"></i>
                <span>${wine.wine_name}</span>
            `;
        }
    }

    applyFilters() {
        this.filteredWines = this.wines.filter(wine => {
            const matchesType = !this.currentFilters.type || this.wineMatchesFamily(wine, this.currentFilters.type);
            const matchesRegion = !this.currentFilters.region || wine.region === this.currentFilters.region;
            const matchesSearch = !this.currentFilters.search || 
                wine.wine_name.toLowerCase().includes(this.currentFilters.search) ||
                wine.region.toLowerCase().includes(this.currentFilters.search) ||
                (wine.varietals && wine.varietals.toLowerCase().includes(this.currentFilters.search));
            
            return matchesType && matchesRegion && matchesSearch;
        });

        this.renderWines();
    }

    toggleView(view) {
        this.currentView = view;
        const winesGrid = document.getElementById('winesGrid');
        const wineTable = document.getElementById('wineTable');
        const regionsGrid = document.getElementById('regionsGrid');
        const regionsTable = document.getElementById('regionsTable');
        const gridBtn = document.getElementById('gridViewBtn');
        const tableBtn = document.getElementById('tableViewBtn');

        if (view === 'grid') {
            if (winesGrid) winesGrid.style.display = 'grid';
            if (wineTable) wineTable.style.display = 'none';
            if (regionsGrid) regionsGrid.style.display = 'grid';
            if (regionsTable) regionsTable.style.display = 'none';
            if (gridBtn) gridBtn.classList.add('active');
            if (tableBtn) tableBtn.classList.remove('active');
        } else {
            if (winesGrid) winesGrid.style.display = 'none';
            if (wineTable) wineTable.style.display = 'block';
            if (regionsGrid) regionsGrid.style.display = 'none';
            if (regionsTable) regionsTable.style.display = 'block';
            if (gridBtn) gridBtn.classList.remove('active');
            if (tableBtn) tableBtn.classList.add('active');
        }
    }

    exploreWine(button) {
        const wineCard = button.closest('.wine-card');
        const tableRow = button.closest('tr');
        
        let wineName = '';
        if (wineCard) {
            wineName = wineCard.querySelector('.wine-name').textContent;
        } else if (tableRow) {
            wineName = tableRow.querySelector('.table-wine-name').textContent;
        }

        // Find the wine in our data
        const wine = this.wines.find(w => w.wine_name === wineName);
        if (wine) {
            let url = `wine-details.html?id=${wine.wine_number}`;
            if (this.currentFilters.type) {
                url += `&type=${encodeURIComponent(this.currentFilters.type)}`;
            }
            window.location.href = url;
        } else {
            this.showError('Wine details not available');
        }
    }

    exploreRegion(button) {
        const regionCard = button.closest('.region-card');
        const tableRow = button.closest('tr');
        
        let regionName = '';
        if (regionCard) {
            regionName = regionCard.querySelector('.region-title').textContent;
        } else if (tableRow) {
            regionName = tableRow.querySelector('.table-region-name').textContent;
        }

        // Navigate to wines page with region filter
        const urlParams = new URLSearchParams(window.location.search);
        const wineType = urlParams.get('type');
        
        // Build URL with proper parameters
        let url = `wines.html?region=${encodeURIComponent(regionName)}`;
        if (wineType) {
            url += `&type=${encodeURIComponent(wineType)}`;
        }
        
        window.location.href = url;
    }

    showFilterOptions(button) {
        const filterType = button.textContent.includes('Region') ? 'Region' : 'Varietal';
        
        if (filterType === 'Region') {
            this.showRegionFilter();
        } else if (filterType === 'Varietal') {
            this.showVarietalFilter();
        }
    }

    showRegionFilter() {
        // Get all unique regions
        const regions = [...new Set(
            this.wines
                .filter(wine => wine.region && wine.region.trim() !== '')
                .map(wine => wine.region)
        )].sort();

        // Create filter dropdown
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-dropdown';
        filterContainer.innerHTML = `
            <div class="filter-dropdown-content">
                <h3>Filter by Region</h3>
                <div class="filter-options">
                    <button class="filter-option" data-region="">All Regions</button>
                    ${regions.map(region => `
                        <button class="filter-option" data-region="${region}">${region}</button>
                    `).join('')}
                </div>
                <div class="filter-actions">
                    <button class="clear-filters">Clear Filters</button>
                    <button class="close-filter">Close</button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(filterContainer);

        // Add event listeners
        filterContainer.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const region = e.target.getAttribute('data-region');
                this.applyRegionFilter(region);
                document.body.removeChild(filterContainer);
            });
        });

        filterContainer.querySelector('.close-filter').addEventListener('click', () => {
            document.body.removeChild(filterContainer);
        });

        filterContainer.querySelector('.clear-filters').addEventListener('click', () => {
            this.clearAllFilters();
            document.body.removeChild(filterContainer);
        });

        // Close on click outside
        filterContainer.addEventListener('click', (e) => {
            if (e.target === filterContainer) {
                document.body.removeChild(filterContainer);
            }
        });
    }

    showVarietalFilter() {
        // Get all unique varietals
        const varietals = [...new Set(
            this.wines
                .filter(wine => wine.varietals && wine.varietals.trim() !== '')
                .map(wine => wine.varietals)
        )].sort();

        // Create filter dropdown
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-dropdown';
        filterContainer.innerHTML = `
            <div class="filter-dropdown-content">
                <h3>Filter by Varietal</h3>
                <div class="filter-options">
                    <button class="filter-option" data-varietal="">All Varietals</button>
                    ${varietals.map(varietal => `
                        <button class="filter-option" data-varietal="${varietal}">${varietal}</button>
                    `).join('')}
                </div>
                <div class="filter-actions">
                    <button class="clear-filters">Clear Filters</button>
                    <button class="close-filter">Close</button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(filterContainer);

        // Add event listeners
        filterContainer.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const varietal = e.target.getAttribute('data-varietal');
                this.applyVarietalFilter(varietal);
                document.body.removeChild(filterContainer);
            });
        });

        filterContainer.querySelector('.close-filter').addEventListener('click', () => {
            document.body.removeChild(filterContainer);
        });

        filterContainer.querySelector('.clear-filters').addEventListener('click', () => {
            this.clearAllFilters();
            document.body.removeChild(filterContainer);
        });

        // Close on click outside
        filterContainer.addEventListener('click', (e) => {
            if (e.target === filterContainer) {
                document.body.removeChild(filterContainer);
            }
        });
    }

    applyRegionFilter(region) {
        // Filter wine cards by region
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        
        wineCards.forEach(card => {
            const link = card.getAttribute('href');
            const type = new URLSearchParams(link.split('?')[1]).get('type');
            
            if (!region) {
                // Show all cards
                card.style.display = 'block';
                this.updateWineCounts();
            } else {
                // Count wines for this type and region
                const count = this.wines.filter(wine => 
                    this.wineMatchesFamily(wine, type) && wine.region === region
                ).length;
                
                if (count > 0) {
                    card.style.display = 'block';
                    // Update the count for this card
                    const countElement = card.querySelector('.wine-count');
                    if (countElement) {
                        countElement.textContent = `${count} wines`;
                    }
                } else {
                    card.style.display = 'none';
                }
            }
        });

        // Update search functionality to work with filtered results
        this.currentFilters.region = region;
    }

    applyVarietalFilter(varietal) {
        // Filter wine cards by varietal
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        
        wineCards.forEach(card => {
            const link = card.getAttribute('href');
            const type = new URLSearchParams(link.split('?')[1]).get('type');
            
            if (!varietal) {
                // Show all cards
                card.style.display = 'block';
                this.updateWineCounts();
            } else {
                // Count wines for this type and varietal
                const count = this.wines.filter(wine => 
                    this.wineMatchesFamily(wine, type) && 
                    wine.varietals && wine.varietals.toLowerCase().includes(varietal.toLowerCase())
                ).length;
                
                if (count > 0) {
                    card.style.display = 'block';
                    // Update the count for this card
                    const countElement = card.querySelector('.wine-count');
                    if (countElement) {
                        countElement.textContent = `${count} wines`;
                    }
                } else {
                    card.style.display = 'none';
                }
            }
        });

        // Update search functionality to work with filtered results
        this.currentFilters.varietal = varietal;
    }

    updateWineCounts() {
        // Reset wine counts to original values
        const wineTypes = ['ROSSO', 'BIANCO', 'ROSATO', 'BOLLICINE', 'NON ALCOLICO'];
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        
        wineCards.forEach((card, index) => {
            if (wineTypes[index]) {
                const count = this.wines.filter(wine => this.wineMatchesFamily(wine, wineTypes[index])).length;
                const countElement = card.querySelector('.wine-count');
                if (countElement) {
                    countElement.textContent = `${count} wines`;
                }
            }
        });
    }

    applyIndexSearch() {
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        
        wineCards.forEach(card => {
            const link = card.getAttribute('href');
            const type = new URLSearchParams(link.split('?')[1]).get('type');
            
            if (!this.currentFilters.search) {
                // Show all cards if no search term
                card.style.display = 'block';
                this.updateWineCounts();
            } else {
                // Filter wines based on search term
                const matchingWines = this.wines.filter(wine => 
                    this.wineMatchesFamily(wine, type) &&
                    (wine.wine_name.toLowerCase().includes(this.currentFilters.search) ||
                     wine.region.toLowerCase().includes(this.currentFilters.search) ||
                     (wine.varietals && wine.varietals.toLowerCase().includes(this.currentFilters.search)))
                );
                
                if (matchingWines.length > 0) {
                    card.style.display = 'block';
                    // Update the count for this card
                    const countElement = card.querySelector('.wine-count');
                    if (countElement) {
                        countElement.textContent = `${matchingWines.length} wines`;
                    }
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }

    clearAllFilters() {
        // Reset all filters
        this.currentFilters = {
            type: null,
            region: null,
            search: ''
        };
        
        // Clear search input
        const searchInput = document.querySelector('.luxury-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        // Show all wine cards and reset counts
        const wineCards = document.querySelectorAll('.luxury-wine-card');
        wineCards.forEach(card => {
            card.style.display = 'block';
        });
        
        this.updateWineCounts();
    }

    setupHoverEffects() {
        // Add hover effects to wine cards
        document.addEventListener('mouseover', (e) => {
            const wineCard = e.target.closest('.wine-card, .region-card, .luxury-wine-card');
            if (wineCard) {
                wineCard.style.transform = 'translateY(-5px)';
            }
        });

        document.addEventListener('mouseout', (e) => {
            const wineCard = e.target.closest('.wine-card, .region-card, .luxury-wine-card');
            if (wineCard) {
                wineCard.style.transform = 'translateY(0)';
            }
        });
    }

    showError(message) {
        console.error(message);
        // You could show a toast notification or error modal here
        alert(message);
    }

    // Utility functions
    getWineTypeName(type) {
        const typeNames = {
            'ROSSO': 'Red Wines',
            'BIANCO': 'White Wines',
            'ROSATO': 'Rosé Wines',
            'ARANCIONE': 'Orange Wines',
            'BOLLICINE': 'Sparkling Wines',
            'NON ALCOLICO': 'Non-Alcoholic Wines'
        };
        return typeNames[type] || 'Wines';
    }

    // Helper function to determine wine family from wine_type
    getWineFamily(wineType) {
        if (!wineType) return 'ROSSO'; // Default fallback
        
        const type = wineType.toUpperCase();
        
        // Sparkling wine variations (check first to avoid conflicts)
        if (type.includes('BOLLICINE')) {
            return 'BOLLICINE';
        }
        if (type.includes('NON ALCOLICO') || type.includes('NON-ALCOHOLIC') || type.includes("0.0")) {
            return 'NON ALCOLICO';
        }
        
        // Rosé wine variations
        if (type.includes('ROSATO')) {
            return 'ROSATO';
        }
        
        // White wine variations
        if (type.includes('ARANCIONE')) {
            return 'ARANCIONE';
        }
        if (type.includes('BIANCO')) {
            return 'BIANCO';
        }
        
        // Red wine variations
        if (type.includes('ROSSO') || type.includes('AMARONE') || type.includes('BAROLO') || 
            type.includes('SUPERTUSCAN') || type.includes('SUPERIORE') || type.includes('RIPASSO')) {
            return 'ROSSO';
        }
        
        // Default fallback
        return 'ROSSO';
    }

    // Helper function to check if wine matches a specific family
    wineMatchesFamily(wine, targetFamily) {
        const wineFamily = this.getWineFamily(wine.wine_type);
        return wineFamily === targetFamily;
    }

    // Debug function to log wine family distribution
    logWineFamilyDistribution() {
        const familyCounts = {
            'ROSSO': 0,
            'BIANCO': 0,
            'ROSATO': 0,
            'BOLLICINE': 0,
            'OTHER': 0
        };

        const typeMapping = {};

        this.wines.forEach(wine => {
            const family = this.getWineFamily(wine.wine_type);
            if (familyCounts.hasOwnProperty(family)) {
                familyCounts[family]++;
            } else {
                familyCounts['OTHER']++;
            }
            
            // Track type mappings for debugging
            if (!typeMapping[wine.wine_type]) {
                typeMapping[wine.wine_type] = family;
            }
        });

        console.log('Wine Family Distribution:', familyCounts);
        console.log('Wine Type Mappings:', typeMapping);
        
        // Log some examples of wine type mapping
        const examples = {};
        this.wines.slice(0, 20).forEach(wine => {
            const family = this.getWineFamily(wine.wine_type);
            if (!examples[family]) {
                examples[family] = [];
            }
            if (examples[family].length < 3) {
                examples[family].push(`${wine.wine_name} (${wine.wine_type} -> ${family})`);
            }
        });
        
        console.log('Wine Type Mapping Examples:', examples);
        
        // Log region distribution
        this.logRegionDistribution();
    }

    logRegionDistribution() {
        const regionCounts = {};
        this.wines.forEach(wine => {
            const region = wine.region;
            if (regionCounts[region]) {
                regionCounts[region]++;
            } else {
                regionCounts[region] = 1;
            }
        });

        console.log('Region Distribution:', regionCounts);
        
        // Check for potential data issues
        const suspiciousRegions = Object.keys(regionCounts).filter(region => 
            region.includes('WINE') || region.includes('UNKNOWN') || region.length < 3
        );
        
        if (suspiciousRegions.length > 0) {
            console.warn('Suspicious regions found:', suspiciousRegions);
        }
        
        // Log all unique regions for verification
        const allRegions = Object.keys(regionCounts).sort();
        console.log('All regions in database:', allRegions);
    }

    normalizeRegionName(regionName) {
        if (!regionName) return '';
        
        // Normalize region names to handle variations
        const regionMap = {
            'FRIULI-VENEZIA GIULIA': 'FRIULI-VENEZIA GIULIA',
            'FRIULI VENEZIA GIULIA': 'FRIULI-VENEZIA GIULIA',
            'FRIULI VENEZIA': 'FRIULI-VENEZIA GIULIA',
            'FRIULI': 'FRIULI-VENEZIA GIULIA',
            'LE MARCHE': 'LE MARCHE',
            'MARCHE': 'LE MARCHE',
            'TRENTINO ALTO-ADIGE': 'TRENTINO ALTO-ADIGE',
            'TRENTINO': 'TRENTINO ALTO-ADIGE',
            'ALTO ADIGE': 'TRENTINO ALTO-ADIGE',
            'VALLE D\'AOSTA': 'VALLE D\'AOSTA',
            'AOSTA': 'VALLE D\'AOSTA',
            'TOSCANA': 'TOSCANA',
            'TOSCANA (BOLGHERI)': 'TOSCANA',
            'SICILIA': 'SICILIA',
            'PIEMONTE': 'PIEMONTE',
            'VENETO': 'VENETO',
            'LUGANA DOC (VENETO)': 'VENETO',
            'LOMBARDIA': 'LOMBARDIA',
            'EMILIA-ROMAGNA': 'EMILIA-ROMAGNA',
            'LAZIO': 'LAZIO',
            'CAMPANIA': 'CAMPANIA',
            'PUGLIA': 'PUGLIA',
            'TARANTO IGT (PUGLIA)': 'PUGLIA',
            'CALABRIA': 'CALABRIA',
            'BASILICATA': 'BASILICATA',
            'MATERA DOC (BASILICATA)': 'BASILICATA',
            'MOLISE': 'MOLISE',
            'ABRUZZO': 'ABRUZZO',
            'UMBRIA': 'UMBRIA',
            'SARDEGNA': 'SARDEGNA',
            'LIGURIA': 'LIGURIA'
        };
        
        return regionMap[regionName] || regionName;
    }

    performGeneralCheckup() {
        console.log('🔍 PERFORMING GENERAL CHECKUP...');
        
        // Check 1: Data integrity
        const totalWines = this.wines.length;
        const winesWithValidRegions = this.wines.filter(wine => wine.region && wine.region.trim() !== '').length;
        const winesWithValidNames = this.wines.filter(wine => wine.wine_name && wine.wine_name.trim() !== '').length;
        const winesWithValidProducers = this.wines.filter(wine => wine.wine_producer && wine.wine_producer.trim() !== '').length;
        const winesWithValidPrices = this.wines.filter(wine => wine.wine_price && wine.wine_price !== '0').length;
        
        console.log(`📊 Data Integrity Check:`);
        console.log(`  - Total wines: ${totalWines}`);
        console.log(`  - Wines with valid regions: ${winesWithValidRegions} (${Math.round(winesWithValidRegions/totalWines*100)}%)`);
        console.log(`  - Wines with valid names: ${winesWithValidNames} (${Math.round(winesWithValidNames/totalWines*100)}%)`);
        console.log(`  - Wines with valid producers: ${winesWithValidProducers} (${Math.round(winesWithValidProducers/totalWines*100)}%)`);
        console.log(`  - Wines with valid prices: ${winesWithValidPrices} (${Math.round(winesWithValidPrices/totalWines*100)}%)`);
        
        // Check 2: Region consistency
        const uniqueRegions = [...new Set(this.wines.map(wine => wine.region))].sort();
        console.log(`🗺️  Region Consistency Check:`);
        console.log(`  - Unique regions found: ${uniqueRegions.length}`);
        console.log(`  - Regions: ${uniqueRegions.join(', ')}`);
        
        // Check 3: Wine type distribution
        const wineTypeCounts = {};
        this.wines.forEach(wine => {
            const family = this.getWineFamily(wine.wine_type);
            wineTypeCounts[family] = (wineTypeCounts[family] || 0) + 1;
        });
        console.log(`🍷 Wine Type Distribution:`);
        Object.entries(wineTypeCounts).forEach(([type, count]) => {
            console.log(`  - ${type}: ${count} wines`);
        });
        
        // Check 4: Price range
        const prices = this.wines.map(wine => parseInt(wine.wine_price)).filter(price => !isNaN(price));
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            console.log(`💰 Price Range Check:`);
            console.log(`  - Min price: $${minPrice}`);
            console.log(`  - Max price: $${maxPrice}`);
            console.log(`  - Average price: $${avgPrice}`);
        }
        
        // Check 5: Potential issues
        const issues = [];
        
        // Check for wines with missing critical data
        const winesWithMissingData = this.wines.filter(wine => 
            !wine.wine_name || !wine.region || !wine.wine_producer || !wine.wine_price
        );
        if (winesWithMissingData.length > 0) {
            issues.push(`${winesWithMissingData.length} wines with missing critical data`);
        }
        
        // Check for duplicate wine numbers
        const wineNumbers = this.wines.map(wine => wine.wine_number);
        const duplicateNumbers = wineNumbers.filter((number, index) => wineNumbers.indexOf(number) !== index);
        if (duplicateNumbers.length > 0) {
            issues.push(`${duplicateNumbers.length} duplicate wine numbers found`);
        }
        
        // Check for suspicious regions
        const suspiciousRegions = uniqueRegions.filter(region => 
            region.includes('WINE') || region.includes('UNKNOWN') || region.length < 3
        );
        if (suspiciousRegions.length > 0) {
            issues.push(`Suspicious regions found: ${suspiciousRegions.join(', ')}`);
        }
        
        if (issues.length > 0) {
            console.warn(`⚠️  Issues found:`);
            issues.forEach(issue => console.warn(`  - ${issue}`));
        } else {
            console.log(`✅ No issues found - all checks passed!`);
        }
        
        console.log('🔍 GENERAL CHECKUP COMPLETED');
    }

    testAllRegions() {
        console.log('🧪 TESTING ALL REGIONS...');
        
        const uniqueRegions = [...new Set(this.wines.map(wine => wine.region))].sort();
        
        uniqueRegions.forEach(region => {
            const winesInRegion = this.wines.filter(wine => wine.region === region);
            const redWines = winesInRegion.filter(wine => this.getWineFamily(wine.wine_type) === 'ROSSO');
            const whiteWines = winesInRegion.filter(wine => this.getWineFamily(wine.wine_type) === 'BIANCO');
            const roseWines = winesInRegion.filter(wine => this.getWineFamily(wine.wine_type) === 'ROSATO');
            const sparklingWines = winesInRegion.filter(wine => this.getWineFamily(wine.wine_type) === 'BOLLICINE');
            
            console.log(`📍 ${region}:`);
            console.log(`  - Total wines: ${winesInRegion.length}`);
            console.log(`  - Red wines: ${redWines.length}`);
            console.log(`  - White wines: ${whiteWines.length}`);
            console.log(`  - Rosé wines: ${roseWines.length}`);
            console.log(`  - Sparkling wines: ${sparklingWines.length}`);
            
            // Test URL encoding/decoding
            const encodedRegion = encodeURIComponent(region);
            const decodedRegion = decodeURIComponent(encodedRegion);
            console.log(`  - URL encoding test: "${region}" -> "${encodedRegion}" -> "${decodedRegion}" ${region === decodedRegion ? '✅' : '❌'}`);
        });
        
        console.log('🧪 REGION TESTING COMPLETED');
    }

    addWineFamilyIndicator(wineType, element) {
        if (!element || !wineType) return;

        // Remove existing indicators
        const existingIndicator = element.querySelector('.wine-family-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create wine family indicator
        const indicator = document.createElement('div');
        indicator.className = 'wine-family-indicator';
        
        const wineFamily = this.getWineFamily(wineType);
        
        const typeNames = {
            'ROSSO': 'Red',
            'BIANCO': 'White',
            'ROSATO': 'Rosé',
            'BOLLICINE': 'Sparkling'
        };

        const familyClass = {
            'ROSSO': 'wine-family-rosso',
            'BIANCO': 'wine-family-bianco',
            'ROSATO': 'wine-family-rosato',
            'ARANCIONE': 'wine-family-arancione',
            'BOLLICINE': 'wine-family-bollicine',
            'NON ALCOLICO': 'wine-family-nonalco'
        };

        indicator.textContent = typeNames[wineFamily] || 'Wine';
        indicator.classList.add(familyClass[wineFamily] || 'wine-family-rosso');
        
        // Make sure element has relative positioning
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        element.appendChild(indicator);
    }

    addWineTypeBadge(wineType, container) {
        if (!container || !wineType) return;

        // Remove existing badge
        const existingBadge = container.querySelector('.wine-type-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Create wine type badge
        const badge = document.createElement('span');
        badge.className = 'wine-type-badge';
        
        const wineFamily = this.getWineFamily(wineType);
        
        const typeNames = {
            'ROSSO': 'Red Wines',
            'BIANCO': 'White Wines',
            'ROSATO': 'Rosé Wines',
            'BOLLICINE': 'Sparkling Wines'
        };

        badge.textContent = typeNames[wineFamily] || 'Wines';
        
        // Add to subtitle
        const subtitle = container.querySelector('.luxury-subtitle');
        if (subtitle) {
            subtitle.appendChild(badge);
        }
    }

    getRegionIcon(region) {
        const iconMap = {
            // Tuscany regions
            'TOSCANA': 'fas fa-sun',
            'TOSCANA (BOLGHERI)': 'fas fa-sun',
            
            // Northern regions
            'PIEMONTE': 'fas fa-mountain',
            'TRENTINO ALTO-ADIGE': 'fas fa-mountain',
            'FRIULI-VENEZIA GIULIA': 'fas fa-mountain',
            'VALLE D\'AOSTA': 'fas fa-mountain',
            
            // Veneto regions
            'VENETO': 'fas fa-water',
            'LUGANA DOC (VENETO)': 'fas fa-water',
            
            // Central regions
            'EMILIA-ROMAGNA': 'fas fa-city',
            'LAZIO': 'fas fa-city',
            'LOMBARDIA': 'fas fa-water',
            'LE MARCHE': 'fas fa-mountain',
            'UMBRIA': 'fas fa-mountain',
            'MOLISE': 'fas fa-mountain',
            'ABRUZZO': 'fas fa-tree',
            
            // Southern regions
            'CAMPANIA': 'fas fa-volcano',
            'SICILIA': 'fas fa-volcano',
            'PUGLIA': 'fas fa-umbrella-beach',
            'TARANTO IGT (PUGLIA)': 'fas fa-umbrella-beach',
            'CALABRIA': 'fas fa-tree',
            'BASILICATA': 'fas fa-mountain',
            'MATERA DOC (BASILICATA)': 'fas fa-mountain',
            
            // Islands
            'SARDEGNA': 'fas fa-mountain',
            
            // Coastal regions
            'LIGURIA': 'fas fa-water'
        };
        
        return iconMap[region] || 'fas fa-map-marker-alt';
    }

    extractYear(vintage) {
        if (!vintage) return 'N/A';
        const yearMatch = vintage.match(/\b(19|20)\d{2}\b/);
        return yearMatch ? yearMatch[0] : 'N/A';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add page load animation
    const luxuryContainer = document.querySelector('.luxury-container');
    if (luxuryContainer) {
        luxuryContainer.style.opacity = '0';
        luxuryContainer.style.transition = 'opacity 1s ease';
        
        setTimeout(() => {
            luxuryContainer.style.opacity = '1';
        }, 100);
    }

    // Initialize the wine list app
    window.wineApp = new WineListApp();
});

// Add some utility functions for GitHub Pages compatibility
function updateWineIcons() {
    const wineCards = document.querySelectorAll('.luxury-wine-card');
        const iconMap = {
        'ROSSO': 'image/glassRed.png',
        'BIANCO': 'image/glassWhite.png',
        'ROSATO': 'image/glRose.png',
            'ARANCIONE': 'image/glRose.png',
            'BOLLICINE': 'image/glSparkling.png',
            'NON ALCOLICO': 'image/glSparkling.png'
    };

    wineCards.forEach(card => {
        const link = card.getAttribute('href');
        if (link) {
            const type = new URLSearchParams(link.split('?')[1]).get('type');
            if (type && iconMap[type]) {
                const icon = card.querySelector('.wine-icon');
                if (icon) {
                    icon.innerHTML = `<img src="${iconMap[type]}" alt="${type} wine icon">`;
                }
            }
        }
    });
}

// Update icons after page load
document.addEventListener('DOMContentLoaded', updateWineIcons);

// Share Wine Functionality
class ShareWineManager {
    constructor() {
        this.shareModal = document.getElementById('shareModal');
        this.shareBtn = document.getElementById('shareWineBtn');
        this.closeBtn = document.getElementById('closeShareModal');
        this.shareUrl = document.getElementById('shareUrl');
        this.copyBtn = document.getElementById('copyUrlBtn');
        
        this.init();
    }
    
    init() {
        if (this.shareBtn) {
            this.shareBtn.addEventListener('click', () => this.openShareModal());
        }
        
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeShareModal());
        }
        
        if (this.shareModal) {
            this.shareModal.addEventListener('click', (e) => {
                if (e.target === this.shareModal) {
                    this.closeShareModal();
                }
            });
        }
        
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyUrl());
        }
        
        // Social sharing options
        this.setupSocialSharing();
        
        // Set current URL
        this.setCurrentUrl();
    }
    
    openShareModal() {
        if (this.shareModal) {
            this.shareModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeShareModal() {
        if (this.shareModal) {
            this.shareModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    setCurrentUrl() {
        if (this.shareUrl) {
            this.shareUrl.value = window.location.href;
        }
    }
    
    async copyUrl() {
        if (this.shareUrl) {
            try {
                await navigator.clipboard.writeText(this.shareUrl.value);
                this.showCopySuccess();
            } catch (err) {
                // Fallback for older browsers
                this.shareUrl.select();
                document.execCommand('copy');
                this.showCopySuccess();
            }
        }
    }
    
    showCopySuccess() {
        const originalText = this.copyBtn.innerHTML;
        this.copyBtn.innerHTML = '<i class="fas fa-check"></i>';
        this.copyBtn.style.background = 'linear-gradient(135deg, #34A853 0%, #2E7D32 100%)';
        
        setTimeout(() => {
            this.copyBtn.innerHTML = originalText;
            this.copyBtn.style.background = '';
        }, 2000);
    }
    
    setupSocialSharing() {
        const shareOptions = [
            { id: 'shareFacebook', platform: 'facebook' },
            { id: 'shareInstagram', platform: 'instagram' },
            { id: 'shareTwitter', platform: 'twitter' },
            { id: 'shareWhatsApp', platform: 'whatsapp' },
            { id: 'shareEmail', platform: 'email' },
            { id: 'shareSMS', platform: 'sms' }
        ];
        
        shareOptions.forEach(option => {
            const element = document.getElementById(option.id);
            if (element) {
                element.addEventListener('click', () => this.shareToPlatform(option.platform));
            }
        });
    }
    
    shareToPlatform(platform) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        const text = encodeURIComponent('Check out this amazing wine from Gran Caffè L\'Aquila!');
        
        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${text}%20${url}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${title}&body=${text}%20${url}`;
                break;
            case 'sms':
                shareUrl = `sms:?body=${text}%20${url}`;
                break;
            case 'instagram':
                // Instagram doesn't support direct URL sharing, show instructions
                this.showInstagramInstructions();
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }
    
    showInstagramInstructions() {
        const instructions = `
            To share on Instagram:
            1. Copy the link below
            2. Open Instagram
            3. Create a new story or post
            4. Paste the link in your caption
        `;
        
        alert(instructions);
    }
}

// Initialize Share Wine Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ShareWineManager();
});
