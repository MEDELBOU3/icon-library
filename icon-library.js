/**
 * Icon Library - Professional Desktop Editor
 * @version 1.0.0
 * Hosted on GitHub Pages
 */

;(function(global) {
  'use strict';

  // Icon registry
  const ICON_REGISTRY = new Map();
  const ICON_LOADING = new Set();
  const ICON_CACHE = new Map();

  // Configuration - Auto-detect GitHub Pages path
  const CONFIG = {
    baseUrl: getBaseUrl(),
    fallbackIcon: 'home',
    defaultSize: 20,
    defaultColor: '#c8d0d8'
  };

  /**
   * Get base URL for icons (works on GitHub Pages)
   */
  function getBaseUrl() {
    // Get current script path
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const scriptSrc = currentScript.src;
    
    // Extract base path
    if (scriptSrc) {
      const url = new URL(scriptSrc);
      const pathParts = url.pathname.split('/');
      // Remove the script filename
      pathParts.pop();
      // If we're in docs folder, icons are in docs/icons/
      const basePath = pathParts.join('/') + '/icons/';
      return `${url.origin}${basePath}`;
    }
    
    // Fallback: assume we're in docs folder
    return window.location.origin + '/icon-library/docs/icons/';
  }

  /**
   * Register an icon
   */
  function registerIcon(name, svgContent, metadata = {}) {
    if (ICON_REGISTRY.has(name)) {
      console.warn(`Icon "${name}" already registered, overwriting...`);
    }
    
    ICON_REGISTRY.set(name, {
      svg: svgContent,
      metadata: {
        category: metadata.category || 'general',
        tags: metadata.tags || [],
        created: metadata.created || new Date().toISOString()
      }
    });
    
    ICON_CACHE.set(name, svgContent);
  }

  /**
   * Register multiple icons
   */
  function registerIcons(icons) {
    Object.entries(icons).forEach(([name, data]) => {
      if (typeof data === 'string') {
        registerIcon(name, data);
      } else {
        registerIcon(name, data.svg, data.metadata);
      }
    });
  }

  /**
   * Get icon SVG
   */
  function getIcon(name, options = {}) {
    const iconName = name || CONFIG.fallbackIcon;
    
    // Check cache first
    if (ICON_CACHE.has(iconName)) {
      return ICON_CACHE.get(iconName);
    }
    
    // Check registry
    if (ICON_REGISTRY.has(iconName)) {
      const iconData = ICON_REGISTRY.get(iconName);
      ICON_CACHE.set(iconName, iconData.svg);
      return iconData.svg;
    }
    
    // Load from GitHub Pages
    if (!ICON_LOADING.has(iconName)) {
      loadIconFromGitHub(iconName, options);
    }
    
    // Return loading state or fallback
    return getIcon(CONFIG.fallbackIcon, options);
  }

  /**
   * Load icon from GitHub Pages
   */
  function loadIconFromGitHub(name, options = {}) {
    if (ICON_LOADING.has(name)) return;
    
    ICON_LOADING.add(name);
    
    const url = `${CONFIG.baseUrl}${name}.svg`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to load icon: ${name} (${response.status})`);
        return response.text();
      })
      .then(svg => {
        // Validate SVG
        if (!svg.includes('<svg')) {
          throw new Error(`Invalid SVG content for: ${name}`);
        }
        
        ICON_REGISTRY.set(name, {
          svg: svg,
          metadata: { category: 'github', tags: [] }
        });
        ICON_CACHE.set(name, svg);
        ICON_LOADING.delete(name);
        
        // Trigger update for components using this icon
        document.dispatchEvent(new CustomEvent('iconLoaded', { 
          detail: { name, svg } 
        }));
        
        console.log(`✅ Icon loaded: ${name}`);
      })
      .catch(error => {
        console.error(`❌ Failed to load icon: ${name}`, error);
        ICON_LOADING.delete(name);
        
        // Use fallback
        if (name !== CONFIG.fallbackIcon) {
          getIcon(CONFIG.fallbackIcon, options);
        }
      });
  }

  /**
   * Create icon element
   */
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

    // Get icon SVG
    let svgContent = getIcon(name, options);
    
    // If icon is loading, add loading class
    if (ICON_LOADING.has(name)) {
      container.classList.add('icon-loading');
      
      // Listen for load event
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

  /**
   * Create icon button
   */
  function createIconButton(name, options = {}) {
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

  /**
   * Create toolbar icon
   */
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

  /**
   * Create icon grid for icon picker
   */
  function createIconGrid(icons, options = {}) {
    const {
      onSelect = null,
      selectedIcon = null,
      columns = 6,
      showLabels = true
    } = options;

    const grid = document.createElement('div');
    grid.className = 'icon-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gap = '4px';
    grid.style.padding = '8px';
    grid.style.background = '#1a2029';
    grid.style.border = '1px solid #2a323a';

    const iconList = Array.isArray(icons) ? icons : Object.keys(icons);

    iconList.forEach(iconName => {
      const item = document.createElement('button');
      item.className = 'icon-grid-item';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'center';
      item.style.gap = '4px';
      item.style.padding = '8px 4px';
      item.style.border = '1px solid transparent';
      item.style.background = 'transparent';
      item.style.color = '#8a929a';
      item.style.cursor = 'pointer';
      item.style.fontSize = '10px';
      item.style.transition = 'all 0.15s ease';
      
      if (iconName === selectedIcon) {
        item.classList.add('active');
        item.style.color = '#4a9eff';
        item.style.background = 'rgba(74, 158, 255, 0.1)';
        item.style.borderColor = 'rgba(74, 158, 255, 0.2)';
      }

      // Hover styles
      item.addEventListener('mouseenter', () => {
        item.style.color = '#c8d0d8';
        item.style.background = 'rgba(200, 208, 216, 0.06)';
        item.style.borderColor = 'rgba(200, 208, 216, 0.08)';
      });
      
      item.addEventListener('mouseleave', () => {
        if (!item.classList.contains('active')) {
          item.style.color = '#8a929a';
          item.style.background = 'transparent';
          item.style.borderColor = 'transparent';
        }
      });

      const icon = createIcon(iconName, {
        size: 24,
        color: 'currentColor'
      });

      item.appendChild(icon);

      if (showLabels) {
        const label = document.createElement('span');
        label.textContent = iconName;
        label.style.fontSize = '9px';
        label.style.lineHeight = '1';
        label.style.textAlign = 'center';
        label.style.wordBreak = 'break-all';
        item.appendChild(label);
      }

      if (onSelect) {
        item.addEventListener('click', () => {
          onSelect(iconName);
          document.querySelectorAll('.icon-grid-item').forEach(el => {
            el.classList.remove('active');
            el.style.color = '#8a929a';
            el.style.background = 'transparent';
            el.style.borderColor = 'transparent';
          });
          item.classList.add('active');
          item.style.color = '#4a9eff';
          item.style.background = 'rgba(74, 158, 255, 0.1)';
          item.style.borderColor = 'rgba(74, 158, 255, 0.2)';
        });
      }

      grid.appendChild(item);
    });

    return grid;
  }

  /**
   * Preload icons
   */
  function preloadIcons(iconNames) {
    iconNames.forEach(name => {
      if (!ICON_CACHE.has(name) && !ICON_LOADING.has(name)) {
        loadIconFromGitHub(name);
      }
    });
  }

  /**
   * Check if icon exists
   */
  function iconExists(name) {
    return ICON_REGISTRY.has(name) || ICON_CACHE.has(name);
  }

  /**
   * Get all registered icon names
   */
  function getIconNames() {
    return Array.from(ICON_REGISTRY.keys());
  }

  /**
   * Search icons
   */
  function searchIcons(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    ICON_REGISTRY.forEach((data, name) => {
      if (name.toLowerCase().includes(searchTerm)) {
        results.push(name);
        return;
      }
      
      if (data.metadata && data.metadata.tags) {
        if (data.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
          results.push(name);
        }
      }
    });
    
    return results;
  }

  /**
   * Update configuration
   */
  function configure(config) {
    Object.assign(CONFIG, config);
  }

  // Public API
  const IconLibrary = {
    register: registerIcon,
    registerMany: registerIcons,
    get: getIcon,
    create: createIcon,
    createButton: createIconButton,
    createToolbarIcon: createToolbarIcon,
    createGrid: createIconGrid,
    preload: preloadIcons,
    exists: iconExists,
    getNames: getIconNames,
    search: searchIcons,
    configure: configure,
    version: '1.0.0'
  };

  // Expose globally
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconLibrary;
  } else {
    global.IconLibrary = IconLibrary;
  }

  console.log('🚀 Icon Library loaded successfully!');
  console.log(`📁 Base URL: ${CONFIG.baseUrl}`);

})(typeof window !== 'undefined' ? window : global);
