/**
 * Icon Library - Game Engine Edition
 * @version 1.0.0
 */

;(function(global) {
  'use strict';

  // Icon registry
  const ICON_REGISTRY = new Map();
  const ICON_LOADING = new Set();
  const ICON_CACHE = new Map();

  // Configuration
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

  // ========================================
  // REGISTER ALL ICONS
  // ========================================
  function registerAllIcons() {
    // These will be loaded from the icons folder
    const iconNames = [
      'transform', 'translate', 'rotate', 'scale', 'snap', 'grid',
      'cube', 'sphere', 'cylinder', 'plane', 'torus',
      'sculpt', 'extrude', 'bevel', 'knife',
      'timeline', 'keyframe', 'curve', 'dopesheet',
      'camera', 'orthographic', 'perspective',
      'material', 'texture', 'uv',
      'brush', 'eyedropper', 'measure', 'pivot', 'select', 'marquee',
      'asset', 'import', 'export', 'preferences'
    ];
    
    iconNames.forEach(name => {
      // Register placeholder - will be loaded on demand
      ICON_REGISTRY.set(name, {
        svg: null,
        metadata: {
          category: 'game-engine',
          tags: [],
          loaded: false
        }
      });
    });
  }

  function loadIconFromCDN(name) {
    if (ICON_LOADING.has(name)) return;
    if (ICON_CACHE.has(name)) return;
    
    ICON_LOADING.add(name);
    
    const url = `${CONFIG.baseUrl}${name}.svg`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load icon: ${name}`);
        return response.text();
      })
      .then(svg => {
        ICON_REGISTRY.set(name, {
          svg: svg,
          metadata: { category: 'game-engine', tags: [], loaded: true }
        });
        ICON_CACHE.set(name, svg);
        ICON_LOADING.delete(name);
        
        document.dispatchEvent(new CustomEvent('iconLoaded', { 
          detail: { name, svg } 
        }));
      })
      .catch(error => {
        console.error(`Failed to load icon: ${name}`, error);
        ICON_LOADING.delete(name);
      });
  }

  function getIcon(name, options = {}) {
    const iconName = name || CONFIG.fallbackIcon;
    
    if (ICON_CACHE.has(iconName)) {
      return ICON_CACHE.get(iconName);
    }
    
    if (ICON_REGISTRY.has(iconName)) {
      const data = ICON_REGISTRY.get(iconName);
      if (data.svg) {
        ICON_CACHE.set(iconName, data.svg);
        return data.svg;
      }
    }
    
    // Load from CDN if not loaded
    if (!ICON_LOADING.has(iconName)) {
      loadIconFromCDN(iconName);
    }
    
    // Return fallback while loading
    if (ICON_CACHE.has(CONFIG.fallbackIcon)) {
      return ICON_CACHE.get(CONFIG.fallbackIcon);
    }
    
    // Simple fallback SVG
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/>
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/>
    </svg>`;
  }

  // ========================================
  // PUBLIC API
  // ========================================
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

    let svgContent = getIcon(name, options);
    
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
    const {
      active = false,
      disabled = false,
      onClick = null,
      tooltip = ''
    } = options;

    const button = document.createElement('button');
    button.className = 'toolbar-icon';
    if (active) button.classList.add('active');
    if (disabled) button.classList.add('disabled');
    if (tooltip) button.setAttribute('title', tooltip);
    if (onClick) button.addEventListener('click', onClick);

    const icon = createIcon(name, {
      size: 18,
      color: 'currentColor'
    });
    
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

    const icon = createIcon(name, {
      size: size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' ? 20 : 16,
      color: 'currentColor'
    });
    
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

  function preloadIcons(iconNames) {
    iconNames.forEach(name => {
      if (!ICON_CACHE.has(name) && !ICON_LOADING.has(name)) {
        loadIconFromCDN(name);
      }
    });
  }

  function configure(config) {
    Object.assign(CONFIG, config);
  }

  // ========================================
  // EXPOSE API
  // ========================================
  const IconLibrary = {
    create: createIcon,
    createToolbarIcon: createToolbarIcon,
    createButton: createButton,
    preload: preloadIcons,
    configure: configure,
    version: '1.0.0'
  };

  // Register icons on load
  registerAllIcons();

  // Expose globally
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconLibrary;
  } else {
    global.IconLibrary = IconLibrary;
  }

  console.log('🎮 Game Engine Icon Library loaded!');
  console.log(`📁 Base URL: ${CONFIG.baseUrl}`);

})(typeof window !== 'undefined' ? window : global);
