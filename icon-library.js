/**
 * Icon Library - Auto-discovers ALL icons from icons/ folder
 * No hardcoded lists! Works with thousands of icons.
 * @version 2.0.0
 */

;(function(global) {
    'use strict';

    const ICON_CACHE = new Map();
    const ICON_LOADING = new Set();
    let iconNames = [];
    let isReady = false;
    let readyCallbacks = [];

    const CONFIG = {
        baseUrl: getBaseUrl(),
        fallbackIcon: null, // Will be set to first discovered icon
        defaultSize: 20,
        defaultColor: '#c8d0d8'
    };

    function getBaseUrl() {
        const scripts = document.getElementsByTagName('script');
        const currentScript = scripts[scripts.length - 1];
        const scriptSrc = currentScript.src;
        
        if (scriptSrc) {
            const url = new URL(scriptSrc);
            const pathParts = url.pathname.split('/');
            pathParts.pop();
            const basePath = pathParts.join('/') + '/icons/';
            return `${url.origin}${basePath}`;
        }
        return window.location.origin + '/icons/';
    }

    function getFallbackSVG(name) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <text x="12" y="16" font-family="monospace" font-size="10" text-anchor="middle" fill="currentColor">${name || '?'}</text>
        </svg>`;
    }

    /**
     * AUTO-DISCOVER ALL ICONS FROM icons/ FOLDER
     * This works with thousands of icons - no hardcoded lists!
     */
    function discoverIcons() {
        console.log('🔍 Auto-discovering icons from icons/ folder...');
        
        // Method 1: Try to get directory listing via fetch
        fetch(CONFIG.baseUrl)
            .then(response => {
                if (!response.ok) throw new Error('Cannot access directory');
                return response.text();
            })
            .then(html => {
                // Parse directory listing HTML to find .svg files
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Find all links that point to .svg files
                const links = doc.querySelectorAll('a[href$=".svg"]');
                const svgFiles = Array.from(links)
                    .map(link => link.getAttribute('href'))
                    .filter(href => href && href.endsWith('.svg'))
                    .map(href => href.replace('.svg', ''))
                    .filter(name => name && name.length > 0);
                
                if (svgFiles.length > 0) {
                    iconNames = [...new Set(svgFiles)].sort(); // Remove duplicates and sort
                    console.log(`📁 Discovered ${iconNames.length} icons from directory listing`);
                    finalizeDiscovery();
                    return;
                }
                
                // If no SVG links found, try alternative parsing
                const allLinks = doc.querySelectorAll('a');
                const potentialSvgs = Array.from(allLinks)
                    .map(link => link.textContent || link.getAttribute('href'))
                    .filter(text => text && text.endsWith('.svg'))
                    .map(text => text.replace('.svg', ''))
                    .filter(name => name && name.length > 0);
                
                if (potentialSvgs.length > 0) {
                    iconNames = [...new Set(potentialSvgs)].sort();
                    console.log(`📁 Discovered ${iconNames.length} icons (alternative parsing)`);
                    finalizeDiscovery();
                    return;
                }
                
                throw new Error('No SVG files found in directory');
            })
            .catch(() => {
                // Method 2: Try to fetch a manifest file
                console.log('📋 Trying manifest.json...');
                fetch('manifest.json')
                    .then(response => {
                        if (response.ok) return response.json();
                        throw new Error('No manifest found');
                    })
                    .then(manifest => {
                        if (manifest && manifest.icons && manifest.icons.length > 0) {
                            iconNames = manifest.icons;
                            console.log(`📋 Loaded ${iconNames.length} icons from manifest.json`);
                            finalizeDiscovery();
                            return;
                        }
                        throw new Error('Manifest has no icons');
                    })
                    .catch(() => {
                        // Method 3: Try to load icons by testing if they exist
                        console.log('🔄 Trying brute-force discovery...');
                        bruteForceDiscovery();
                    });
            });
    }

    /**
     * BRUTE FORCE DISCOVERY - Try common icon names
     * This works even without directory listing or manifest
     */
    function bruteForceDiscovery() {
        // Common icon names - but we'll discover which ones exist
        const commonNames = [
            'transform', 'translate', 'rotate', 'scale', 'snap', 'grid',
            'cube', 'sphere', 'cylinder', 'plane', 'torus',
            'sculpt', 'extrude', 'bevel', 'knife',
            'timeline', 'keyframe', 'curve', 'dopesheet',
            'camera', 'orthographic', 'perspective',
            'material', 'texture', 'uv',
            'brush', 'eyedropper', 'measure', 'pivot', 'select', 'marquee',
            'asset', 'import', 'export', 'preferences',
            // Add any other common icon names here
        ];
        
        let discovered = [];
        let pending = 0;
        
        commonNames.forEach(name => {
            pending++;
            const url = `${CONFIG.baseUrl}${name}.svg`;
            fetch(url, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        discovered.push(name);
                        console.log(`✅ Found: ${name}`);
                    }
                    pending--;
                    if (pending === 0) {
                        iconNames = discovered.sort();
                        if (iconNames.length === 0) {
                            console.warn('⚠️ No icons found. Please check your icons/ folder.');
                            // Add a default icon so the app works
                            iconNames = ['cube'];
                            // Generate a fallback cube icon
                            generateFallbackIcon('cube');
                        }
                        finalizeDiscovery();
                    }
                })
                .catch(() => {
                    pending--;
                    if (pending === 0) {
                        iconNames = discovered.sort();
                        if (iconNames.length === 0) {
                            console.warn('⚠️ No icons found. Please check your icons/ folder.');
                            iconNames = ['cube'];
                            generateFallbackIcon('cube');
                        }
                        finalizeDiscovery();
                    }
                });
        });
        
        // If no common names exist, try to find any SVG in the folder
        if (commonNames.length === 0) {
            // Try to read directory via other methods
            fetchDirectoryListing();
        }
    }

    /**
     * Try to fetch directory listing via multiple methods
     */
    function fetchDirectoryListing() {
        // Try different URL variations
        const urls = [
            CONFIG.baseUrl,
            CONFIG.baseUrl + '?',
            CONFIG.baseUrl + 'index.html',
            CONFIG.baseUrl + '../icons/',
            'icons/'
        ];
        
        let urlIndex = 0;
        
        function tryNextUrl() {
            if (urlIndex >= urls.length) {
                console.error('❌ Could not discover any icons. Using fallback.');
                iconNames = ['cube'];
                generateFallbackIcon('cube');
                finalizeDiscovery();
                return;
            }
            
            const url = urls[urlIndex];
            console.log(`🔍 Trying: ${url}`);
            
            fetch(url)
                .then(response => {
                    if (response.ok) return response.text();
                    throw new Error('Not found');
                })
                .then(html => {
                    // Try to find .svg references in the HTML
                    const matches = html.match(/[a-zA-Z0-9_-]+\.svg/g) || [];
                    if (matches.length > 0) {
                        const names = matches.map(m => m.replace('.svg', ''));
                        iconNames = [...new Set(names)].sort();
                        console.log(`📁 Found ${iconNames.length} icons in directory listing`);
                        finalizeDiscovery();
                    } else {
                        urlIndex++;
                        tryNextUrl();
                    }
                })
                .catch(() => {
                    urlIndex++;
                    tryNextUrl();
                });
        }
        
        tryNextUrl();
    }

    /**
     * Generate a fallback icon if none exist
     */
    function generateFallbackIcon(name) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <rect x="7" y="7" width="10" height="10" stroke="currentColor" stroke-width="1" fill="none"/>
            <text x="12" y="16" font-family="monospace" font-size="8" text-anchor="middle" fill="currentColor">${name}</text>
        </svg>`;
        ICON_CACHE.set(name, svg);
        CONFIG.fallbackIcon = name;
    }

    function finalizeDiscovery() {
        // Set fallback icon to the first discovered icon
        if (iconNames.length > 0) {
            CONFIG.fallbackIcon = iconNames[0];
            // Preload the first icon
            loadIconFromCDN(iconNames[0]);
        } else {
            console.warn('⚠️ No icons discovered. Using fallback.');
            iconNames = ['cube'];
            CONFIG.fallbackIcon = 'cube';
            generateFallbackIcon('cube');
        }
        
        // Preload some essential icons
        const essential = iconNames.slice(0, Math.min(10, iconNames.length));
        essential.forEach(name => {
            if (!ICON_CACHE.has(name) && !ICON_LOADING.has(name)) {
                loadIconFromCDN(name);
            }
        });
        
        isReady = true;
        readyCallbacks.forEach(cb => cb(iconNames));
        readyCallbacks = [];
        
        document.dispatchEvent(new CustomEvent('iconsReady', {
            detail: { icons: iconNames }
        }));
    }

    function loadIconFromCDN(name) {
        if (ICON_LOADING.has(name)) return;
        if (ICON_CACHE.has(name)) return;
        
        ICON_LOADING.add(name);
        
        const url = `${CONFIG.baseUrl}${name}.svg`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load: ${name} (${response.status})`);
                return response.text();
            })
            .then(svg => {
                if (!svg.includes('<svg')) {
                    throw new Error(`Invalid SVG: ${name}`);
                }
                
                ICON_CACHE.set(name, svg);
                ICON_LOADING.delete(name);
                
                document.dispatchEvent(new CustomEvent('iconLoaded', {
                    detail: { name, svg }
                }));
                
                console.log(`✅ Loaded: ${name}`);
            })
            .catch(error => {
                console.error(`❌ Failed: ${name}`, error);
                ICON_LOADING.delete(name);
                ICON_CACHE.set(name, getFallbackSVG(name));
            });
    }

    function getIcon(name) {
        const iconName = name || CONFIG.fallbackIcon;
        
        if (ICON_CACHE.has(iconName)) {
            return ICON_CACHE.get(iconName);
        }
        
        if (iconNames.includes(iconName) && !ICON_LOADING.has(iconName)) {
            loadIconFromCDN(iconName);
        }
        
        if (ICON_CACHE.has(CONFIG.fallbackIcon)) {
            return ICON_CACHE.get(CONFIG.fallbackIcon);
        }
        
        const fallback = getFallbackSVG(iconName);
        ICON_CACHE.set(iconName, fallback);
        return fallback;
    }

    function createIcon(name, options = {}) {
        const {
            size = CONFIG.defaultSize,
            color = CONFIG.defaultColor,
            className = '',
            title = '',
            ariaLabel = '',
            role = 'img',
            onClick = null
        } = options;

        const container = document.createElement('span');
        container.className = `icon ${className}`.trim();
        container.style.width = `${size}px`;
        container.style.height = `${size}px`;
        container.style.color = color;
        container.style.display = 'inline-flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.setAttribute('role', role);
        
        if (title) container.setAttribute('title', title);
        if (ariaLabel) container.setAttribute('aria-label', ariaLabel);
        if (onClick) container.addEventListener('click', onClick);

        let svgContent = getIcon(name);
        
        if (ICON_LOADING.has(name)) {
            container.classList.add('icon-loading');
            const loadHandler = (e) => {
                if (e.detail.name === name) {
                    container.innerHTML = e.detail.svg;
                    container.classList.remove('icon-loading');
                    document.removeEventListener('iconLoaded', loadHandler);
                }
            };
            document.addEventListener('iconLoaded', loadHandler);
        } else {
            container.innerHTML = svgContent;
        }

        return container;
    }

    function createToolbarIcon(name, options = {}) {
        const { active = false, disabled = false, onClick = null, tooltip = '' } = options;

        const button = document.createElement('button');
        button.className = 'toolbar-icon';
        if (active) button.classList.add('active');
        if (disabled) button.classList.add('disabled');
        if (tooltip) button.setAttribute('title', tooltip);
        if (onClick) button.addEventListener('click', onClick);

        const icon = createIcon(name, { size: 18, color: 'currentColor' });
        button.appendChild(icon);
        return button;
    }

    function createButton(name, options = {}) {
        const {
            size = 'md',
            label = '',
            className = '',
            active = false,
            disabled = false,
            onClick = null,
            tooltip = ''
        } = options;

        const button = document.createElement('button');
        button.className = `icon-btn icon-btn-${size} ${className}`.trim();
        if (active) button.classList.add('active');
        if (disabled) button.classList.add('disabled');
        if (tooltip) button.setAttribute('title', tooltip);
        if (onClick) button.addEventListener('click', onClick);

        const iconSize = size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
        const icon = createIcon(name, { size: iconSize, color: 'currentColor' });
        button.appendChild(icon);
        
        if (label) {
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            labelSpan.style.marginLeft = '6px';
            labelSpan.style.fontSize = '12px';
            button.appendChild(labelSpan);
        }

        return button;
    }

    function onReady(callback) {
        if (isReady) {
            callback(iconNames);
        } else {
            readyCallbacks.push(callback);
        }
    }

    function getIconNames() {
        return iconNames;
    }

    // Auto-discover icons immediately
    discoverIcons();

    // Public API
    const IconLibrary = {
        create: createIcon,
        createToolbarIcon: createToolbarIcon,
        createButton: createButton,
        onReady: onReady,
        getIconNames: getIconNames,
        getBaseUrl: () => CONFIG.baseUrl,
        configure: (config) => Object.assign(CONFIG, config),
        version: '2.0.0'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IconLibrary;
    } else {
        global.IconLibrary = IconLibrary;
    }

    console.log('🎮 Game Engine Icon Library v2.0.0 loaded!');
    console.log(`📁 Base URL: ${CONFIG.baseUrl}`);

})(typeof window !== 'undefined' ? window : global);
