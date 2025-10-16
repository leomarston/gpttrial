const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const form = document.getElementById('limit-form');
const limitInput = document.getElementById('limit');
const statusEl = document.getElementById('status');
const statusTag = document.getElementById('status-tag');
const updatedEl = document.getElementById('updated');
const summaryEl = document.getElementById('summary');
const tablesEl = document.getElementById('tables');

const sectionConfig = [
  { key: 'topGainers', label: 'Top Gainers', description: 'Highest intraday advances' },
  { key: 'topLosers', label: 'Top Losers', description: 'Largest intraday pullbacks' },
  { key: 'mostActivelyTraded', label: 'Most Active', description: 'Highest traded volumes' }
];

const summaryConfig = [
  {
    key: 'topGainers',
    label: 'Top Gainer',
    metric: (row) => formatPercent(row?.changePercentage),
    metricClass: (row) => pickTrendClass(row?.changePercentage),
    detail: (row) =>
      row
        ? `${formatPrice(row.price)} • ${formatSignedCurrency(row.changeAmount)}`
        : 'Awaiting data'
  },
  {
    key: 'topLosers',
    label: 'Top Loser',
    metric: (row) => formatPercent(row?.changePercentage),
    metricClass: (row) => pickTrendClass(row?.changePercentage),
    detail: (row) =>
      row
        ? `${formatPrice(row.price)} • ${formatSignedCurrency(row.changeAmount)}`
        : 'Awaiting data'
  },
  {
    key: 'mostActivelyTraded',
    label: 'Most Active',
    metric: (row) => formatVolume(row?.volume),
    metricClass: () => '',
    detail: (row) =>
      row
        ? `${formatPrice(row.price)} • ${formatPercent(row.changePercentage)}`
        : 'Awaiting data'
  }
];

const numberFormatter = new Intl.NumberFormat('en-US');

const formatPrice = (value) =>
  Number.isFinite(value) ? `$${value.toFixed(2)}` : '—';

const formatSignedCurrency = (value) => {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
};

const formatVolume = (value) =>
  Number.isFinite(value) ? numberFormatter.format(Math.round(value)) : '—';

const pickTrendClass = (value) => {
  if (!Number.isFinite(value) || value === 0) return '';
  return value > 0 ? 'positive' : 'negative';
};

const createCell = (label, content) => {
  const cell = document.createElement('td');
  cell.dataset.label = label;
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
};

const createTickerChip = (ticker) => {
  const chip = document.createElement('span');
  chip.className = 'ticker';
  chip.textContent = ticker;
  return chip;
};

const createPill = (value, formatter) => {
  const span = document.createElement('span');
  span.className = `pill ${pickTrendClass(value)}`;
  span.textContent = formatter(value);
  return span;
};

const createSkeleton = (width, height) => {
  const block = document.createElement('span');
  block.className = 'skeleton';
  block.style.display = 'inline-block';
  block.style.width = width;
  block.style.height = height;
  block.style.borderRadius = '0.65rem';
  return block;
};

const renderErrorState = (message) => {
  const summaryCard = document.createElement('article');
  summaryCard.className = 'summary-card';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Data unavailable';
  summaryCard.appendChild(label);

  const detail = document.createElement('span');
  detail.className = 'detail';
  detail.style.color = 'var(--muted)';
  detail.textContent = message;
  summaryCard.appendChild(detail);

  summaryEl.replaceChildren(summaryCard);

  const card = document.createElement('article');
  card.className = 'data-card';
  const notice = document.createElement('p');
  notice.className = 'status';
  notice.style.color = 'var(--loss)';
  notice.textContent = message;
  card.appendChild(notice);
  tablesEl.replaceChildren(card);
};

const renderLoadingState = () => {
  summaryEl.replaceChildren(
    ...Array.from({ length: summaryConfig.length }, () => {
      const card = document.createElement('article');
      card.className = 'summary-card';
      const label = createSkeleton('60%', '16px');
      const metric = createSkeleton('70%', '32px');
      const detail = createSkeleton('75%', '18px');
      card.append(label, metric, detail);
      return card;
    })
  );

  tablesEl.replaceChildren(
    ...sectionConfig.map(() => {
      const card = document.createElement('article');
      card.className = 'data-card';
      const header = document.createElement('header');
      header.append(createSkeleton('45%', '24px'), createSkeleton('20%', '20px'));
      card.append(header);

      const rows = document.createElement('div');
      rows.style.display = 'grid';
      rows.style.gap = '0.75rem';

      for (let i = 0; i < 4; i += 1) {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
        row.style.gap = '0.6rem';
        row.append(
          createSkeleton('100%', '18px'),
          createSkeleton('100%', '18px'),
          createSkeleton('100%', '18px'),
          createSkeleton('100%', '18px')
        );
        rows.append(row);
      }

      card.append(rows);
      return card;
    })
  );
};

const renderSummary = (data) => {
  summaryEl.replaceChildren(
    ...summaryConfig.map((config) => {
      const card = document.createElement('article');
      card.className = 'summary-card';

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = config.label;
      card.appendChild(label);

      const topRow = Array.isArray(data?.[config.key]) ? data[config.key][0] : undefined;

      const metric = document.createElement('span');
      metric.className = `metric ${config.metricClass(topRow)}`;
      metric.textContent = config.metric(topRow);
      card.appendChild(metric);

      const detail = document.createElement('span');
      detail.className = 'detail';
      detail.style.color = 'var(--muted)';
      detail.textContent = config.detail(topRow);
      card.appendChild(detail);

      if (topRow?.ticker) {
        const chip = createTickerChip(topRow.ticker);
        card.appendChild(chip);
      }

      return card;
    })
  );
};

const renderTables = (data) => {
  tablesEl.replaceChildren(
    ...sectionConfig.map((section) => {
      const rows = Array.isArray(data?.[section.key]) ? data[section.key] : [];
      const card = document.createElement('article');
      card.className = 'data-card';

      const header = document.createElement('header');
      const title = document.createElement('h2');
      title.textContent = section.label;
      header.appendChild(title);

      const descriptor = document.createElement('span');
      descriptor.className = 'pill';
      descriptor.textContent = `${rows.length} rows`;
      header.appendChild(descriptor);
      card.appendChild(header);

      if (!rows.length) {
        const empty = document.createElement('p');
        empty.className = 'status';
        empty.textContent = 'No data available.';
        card.appendChild(empty);
        return card;
      }

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Ticker', 'Last Price', 'Δ ($)', 'Δ (%)', 'Volume'].forEach((title) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = title;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      rows.forEach((row) => {
        const tr = document.createElement('tr');
        tr.append(
          createCell('Ticker', createTickerChip(row.ticker)),
          createCell('Last Price', formatPrice(row.price)),
          createCell('Δ ($)', createPill(row.changeAmount, formatSignedCurrency)),
          createCell('Δ (%)', createPill(row.changePercentage, formatPercent)),
          createCell('Volume', formatVolume(row.volume))
        );
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      card.appendChild(table);
      return card;
    })
  );
};

const renderData = (data) => {
  renderSummary(data);
  renderTables(data);

  const lastUpdated = data?.lastUpdated;
  updatedEl.textContent = lastUpdated ? `Last updated: ${lastUpdated}` : 'Last updated: —';
};

const setStatus = (message, variant = 'accent', tagText) => {
  statusEl.textContent = message ?? '';
  statusEl.style.color = variant === 'error' ? 'var(--loss)' : '';

  statusTag.classList.remove('tag--accent', 'tag--success', 'tag--error');
  statusTag.classList.add(`tag--${variant}`);
  statusTag.textContent = tagText ?? message ?? '';
};

const parseStructuredContent = (result) => {
  if (!result) {
    return null;
  }

  if (result.structuredContent) {
    return result.structuredContent;
  }

  if (Array.isArray(result.content)) {
    for (const chunk of result.content) {
      if (chunk?.json) {
        return chunk.json;
      }
      if (typeof chunk?.text === 'string') {
        try {
          return JSON.parse(chunk.text);
        } catch {
          continue;
        }
      }
    }
  }

  return null;
};

const fetchViaTool = async (limit) => {
  if (!window.openai?.callTool) {
    throw new Error('window.openai.callTool is not available.');
  }
  const result = await window.openai.callTool('topMovers', { limit });
  const structured = parseStructuredContent(result);
  if (!structured) {
    throw new Error('The topMovers tool did not return structured content.');
  }
  return structured;
};

const fetchViaRest = async (limit) => {
  const response = await fetch(`/api/top-movers?limit=${limit}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `REST fallback failed with status ${response.status}: ${body.slice(0, 120)}`
    );
  }
  return response.json();
};

let lastLimit = DEFAULT_LIMIT;

const loadMovers = async (limit = DEFAULT_LIMIT) => {
  const clamped = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  lastLimit = clamped;
  renderLoadingState();
  setStatus('Loading data…', 'accent');

  try {
    let data;
    if (window.openai?.callTool) {
      data = await fetchViaTool(clamped);
      renderData(data);
      setStatus(
        `Live via ChatGPT tool • ${clamped} rows per table.`,
        'success',
        'Live via ChatGPT tool'
      );
    } else {
      data = await fetchViaRest(clamped);
      renderData(data);
      setStatus(
        `Preview mode (REST fallback) • ${clamped} rows per table.`,
        'accent',
        'Preview mode (REST fallback)'
      );
    }
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'Failed to load top movers.';
    renderErrorState(message);
    setStatus(message, 'error', 'Load failed');
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const nextLimit = Number.parseInt(limitInput.value, 10);
  if (!Number.isFinite(nextLimit) || nextLimit < 1 || nextLimit > MAX_LIMIT) {
    const message = `Limit must be between 1 and ${MAX_LIMIT}.`;
    setStatus(message, 'error', 'Invalid limit');
    limitInput.value = `${lastLimit}`;
    return;
  }
  loadMovers(nextLimit);
});

document.addEventListener('DOMContentLoaded', () => {
  limitInput.value = `${DEFAULT_LIMIT}`;
  renderLoadingState();
  setStatus('Loading data…', 'accent');
  loadMovers(DEFAULT_LIMIT);
});
