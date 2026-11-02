/* Progressive enhancement: navigation remains available when JavaScript is off. */
document.documentElement.classList.add('js');

(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const navigation = document.getElementById('primary-navigation');
  const menuBackdrop = document.getElementById('menu-backdrop');
  const mobileViewport = window.matchMedia('(max-width: 1199px)');
  let menuIsOpen = false;
  let previousFocus = null;

  const isVisible = (element) => element instanceof HTMLElement
    && element.getClientRects().length > 0
    && window.getComputedStyle(element).visibility !== 'hidden';

  if (header && menuToggle && navigation && menuBackdrop) {
    const menuFocusTargets = () => [
      menuToggle,
      ...navigation.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]'),
    ].filter(isVisible);

    const closeMenu = ({ restoreFocus = true } = {}) => {
      const wasOpen = menuIsOpen;
      menuIsOpen = false;
      document.body.classList.remove('menu-open');
      header.classList.remove('is-menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Menüyü aç');
      menuBackdrop.hidden = true;
      navigation.inert = mobileViewport.matches;

      if (mobileViewport.matches) {
        navigation.setAttribute('aria-hidden', 'true');
      } else {
        navigation.removeAttribute('aria-hidden');
      }

      if (wasOpen && restoreFocus) {
        const focusTarget = isVisible(previousFocus) && previousFocus.tabIndex >= 0
          && !navigation.contains(previousFocus)
          ? previousFocus
          : menuToggle;
        if (isVisible(focusTarget)) focusTarget.focus();
      }
      previousFocus = null;
    };

    const openMenu = () => {
      if (!mobileViewport.matches) return;
      previousFocus = document.activeElement;
      menuIsOpen = true;
      navigation.inert = false;
      navigation.removeAttribute('aria-hidden');
      document.body.classList.add('menu-open');
      header.classList.add('is-menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Menüyü kapat');
      menuBackdrop.hidden = false;

      // Let the drawer's visibility change reach the next rendered frame.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (menuIsOpen) (menuFocusTargets().find((element) => element !== menuToggle) || menuToggle).focus();
      }));
    };

    menuToggle.addEventListener('click', () => {
      if (menuIsOpen) closeMenu();
      else openMenu();
    });

    menuBackdrop.addEventListener('click', () => closeMenu());

    navigation.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a[href]')) {
        closeMenu({ restoreFocus: false });
      }
    });

    document.addEventListener('click', (event) => {
      if (menuIsOpen && event.target instanceof Node
        && !navigation.contains(event.target) && !menuToggle.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!menuIsOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusTargets = menuFocusTargets();
      const first = focusTargets[0];
      const last = focusTargets[focusTargets.length - 1];
      const active = document.activeElement;

      if (!focusTargets.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    });

    mobileViewport.addEventListener('change', () => closeMenu({ restoreFocus: false }));
    closeMenu({ restoreFocus: false });
  }

  const searchForm = document.getElementById('domain-search');
  const domainInput = document.getElementById('domain-name');
  const searchFeedback = document.getElementById('search-feedback');

  if (searchForm && domainInput && searchFeedback) {
    searchForm.noValidate = true;
    const clearSearchError = () => {
      domainInput.removeAttribute('aria-invalid');
      domainInput.setCustomValidity('');
      searchFeedback.hidden = true;
      searchFeedback.textContent = '';
    };

    const normalizeDomain = (value) => value.trim().toLowerCase().normalize('NFC')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');

    const validateDomain = (value) => {
      if (!value) return { error: 'Lütfen sorgulamak istediğiniz alan adını yazın.' };
      if (value.length > 253) return { error: 'Alan adı en fazla 253 karakter olabilir.' };
      if (!/^[\p{L}\p{N}\p{M}.-]+$/u.test(value)) {
        return { error: 'Yalnızca alan adını yazın; boşluk, sayfa yolu veya özel karakter kullanmayın.' };
      }
      if (value.split('.').some((label) => !label)) {
        return { error: 'Alan adı noktayla başlayamaz veya bitemez; art arda nokta içeremez.' };
      }

      let asciiDomain;
      try {
        // A suffix preserves numeric brand names while URL handles IDN conversion.
        const suffix = '.invalid';
        asciiDomain = new URL(`https://${value}${suffix}`).hostname.slice(0, -suffix.length);
      } catch {
        return { error: 'Lütfen geçerli bir alan adı yazın.' };
      }

      if (asciiDomain.length > 253) return { error: 'Alan adı en fazla 253 karakter olabilir.' };
      if (!asciiDomain.split('.').every((label) => label.length <= 63
        && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
        return { error: 'Her alan adı bölümü 1–63 karakter olmalı; tireyle başlayamaz veya bitemez.' };
      }

      return { domain: asciiDomain };
    };

    domainInput.addEventListener('input', clearSearchError);

    searchForm.addEventListener('submit', (event) => {
      clearSearchError();
      const result = validateDomain(normalizeDomain(domainInput.value));

      if (result.error) {
        event.preventDefault();
        domainInput.setAttribute('aria-invalid', 'true');
        domainInput.setCustomValidity(result.error);
        searchFeedback.textContent = result.error;
        searchFeedback.hidden = false;
        domainInput.focus();
        return;
      }

      domainInput.value = result.domain;
      // Preserve the form's native GET request; availability comes from the service.
    });
  }
})();

/* Pricing filters act only on the ten rows supplied in Figma.
   Further pages need a complete, authoritative pricing data source. */
(() => {
  'use strict';
  const search = document.getElementById('extension-search');
  const rows = [...document.querySelectorAll('#domain-price-rows tr[data-extension]')];
  const filters = [...document.querySelectorAll('[data-price-filter]')];
  const empty = document.getElementById('price-empty');
  const status = document.getElementById('price-filter-status');
  if (!search || !rows.length || !empty || !status) return;

  let category = 'all';
  const applyFilters = () => {
    const query = search.value.trim().toLowerCase().replace(/^\./, '');
    let count = 0;
    rows.forEach((row) => {
      const tags = row.dataset.priceTags.split(' ');
      const matches = row.dataset.extension.includes(query)
        && (category === 'all' || tags.includes(category));
      row.hidden = !matches;
      if (matches) count += 1;
    });
    empty.hidden = count !== 0;
    status.textContent = count ? `${count} domain uzantısı gösteriliyor.` : 'Aramanıza uygun uzantı bulunamadı.';
  };

  search.addEventListener('input', applyFilters);
  search.addEventListener('search', applyFilters);
  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      category = filter.dataset.priceFilter;
      filters.forEach((button) => button.setAttribute('aria-pressed', String(button === filter)));
      applyFilters();
    });
  });
})();

// Native details/summary supplies open/close behavior even without JavaScript.
// Optional arrow-key navigation keeps the 37-question list easy to traverse.
(() => {
  'use strict';

  const faq = document.querySelector('.domain-faq__items');
  if (!faq) return;

  const questions = Array.from(faq.querySelectorAll('.faq-item__question'));
  faq.addEventListener('keydown', (event) => {
    if (!(event.target instanceof Element)) return;
    const question = event.target.closest('.faq-item__question');
    const current = questions.indexOf(question);
    if (current === -1) return;

    let target;
    if (event.key === 'ArrowDown') target = (current + 1) % questions.length;
    else if (event.key === 'ArrowUp') target = (current - 1 + questions.length) % questions.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = questions.length - 1;
    else return;

    event.preventDefault();
    questions[target].focus();
  });
})();
