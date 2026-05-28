(function () {
  var THEMES = [
    { id: 'default',   label: 'Default',    dot: '#dbeafe', url: null },
    { id: 'dark',      label: 'Dark Swamp', dot: '#0c1a0f', url: '/style-dark.css' },
    { id: 'terminal',  label: 'Terminal',   dot: '#000000', url: '/style-terminal.css' },
    { id: 'earthy',    label: 'Earthy',     dot: '#f5f0e8', url: '/style-earthy.css' },
    { id: 'synthwave', label: 'Synthwave',  dot: '#0d0015', url: '/style-synthwave.css' },
  ];

  var saved = localStorage.getItem('ff-theme') || 'default';

  function applyTheme(id) {
    var existing = document.getElementById('ff-theme-override');
    if (existing) existing.remove();

    var theme = THEMES.find(function (t) { return t.id === id; });
    if (theme && theme.url) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'ff-theme-override';
      link.href = theme.url;
      document.head.appendChild(link);
    }

    localStorage.setItem('ff-theme', id);

    document.querySelectorAll('.ff-theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === id);
    });
  }

  // Apply saved theme before DOM renders to avoid flash
  if (saved !== 'default') {
    var earlyLink = document.createElement('link');
    earlyLink.rel = 'stylesheet';
    earlyLink.id = 'ff-theme-override';
    earlyLink.href = THEMES.find(function (t) { return t.id === saved; }).url || '';
    document.head.appendChild(earlyLink);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var wrap = document.createElement('div');
    wrap.id = 'ff-theme-switcher';

    var label = document.createElement('div');
    label.id = 'ff-theme-switcher-label';
    label.textContent = 'Theme';
    wrap.appendChild(label);

    THEMES.forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'ff-theme-btn' + (t.id === saved ? ' active' : '');
      btn.dataset.theme = t.id;
      btn.title = t.label;

      var dot = document.createElement('span');
      dot.className = 'ff-theme-dot';
      dot.style.background = t.dot;

      var lbl = document.createElement('span');
      lbl.textContent = t.label;

      btn.appendChild(dot);
      btn.appendChild(lbl);
      btn.addEventListener('click', function () { applyTheme(t.id); });
      wrap.appendChild(btn);
    });

    document.body.appendChild(wrap);
  });
})();
