/**
 * Icon Library - Auto-discovers icons from icons/ folder
 * @version 1.0.0
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
        fallbackIcon: 'cube',
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

    function getFallbackSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>
            <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/>
        </svg>`;
    }

    /**
     * Auto-discover icons from the icons/ folder
     * Uses a manifest approach or directory listing
     */
    function discoverIcons() {
        // Option 1: Try to fetch a manifest file
        fetch(`${CONFIG.baseUrl}manifest.json`)
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('No manifest found');
            })
            .then(manifest => {
                iconNames = manifest.icons || [];
                console.log(`📋 Loaded manifest with ${iconNames.length} icons`);
                initializeIcons();
            })
            .catch(() => {
                // Option 2: Use the list from the SVG files you already have
                // This should match the files in your icons/ folder
                iconNames = [
                    'asset', 'bevel', 'brush', 'camera', 'cube', 'curve',
                    'cylinder', 'dopesheet', 'export', 'extrude', 'eyedropper',
                    'grid', 'import', 'keyframe', 'knife', 'marquee', 'material',
                    'measure', 'orthographic', 'perspective', 'pivot', 'plane',
                    'preferences', 'rotate', 'scale', 'sculpt', 'select', 'snap',
                    'sphere', 'texture', 'timeline', 'torus', 'transform',
                    'translate', 'uv'
                ];
                console.log(`📂 Using predefined icon list (${iconNames.length} icons)`);
                initializeIcons();
            });
    }

    /**
     * Alternatively, you can use a PHP/Node script to generate the list
     * But for static HTML, we use the list above
     */
    function initializeIcons() {
        // Preload essential icons
        const essential = ['cube', 'transform', 'translate'];
        essential.forEach(name => {
            if (iconNames.includes(name)) {
                loadIconFromCDN(name);
            }
        });
        
        isReady = true;
        readyCallbacks.forEach(cb => cb(iconNames));
        readyCallbacks = [];
        
        // Dispatch ready event
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
                ICON_CACHE.set(name, getFallbackSVG());
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
        
        const fallback = getFallbackSVG();
        ICON_CACHE.set(CONFIG.fallbackIcon, fallback);
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

    // Auto-discover icons
    discoverIcons();

    // Public API
    const IconLibrary = {
        create: createIcon,
        createToolbarIcon: createToolbarIcon,
        createButton: createButton,
        onReady: onReady,
        getIconNames: getIconNames,
        configure: (config) => Object.assign(CONFIG, config),
        version: '1.0.0'
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = IconLibrary;
    } else {
        global.IconLibrary = IconLibrary;
    }

    console.log('🎮 Game Engine Icon Library loaded!');
    console.log(`📁 Base URL: ${CONFIG.baseUrl}`);

})(typeof window !== 'undefined' ? window : global);
