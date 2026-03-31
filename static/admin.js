function toKstString(iso) {
  try {
    return new Date(iso).toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const SCHOOL_AGE_LABELS = [
  '미취학',
  '초등 1학년',
  '초등 2학년',
  '초등 3학년',
  '초등 4학년',
  '초등 5학년',
  '초등 6학년',
  '초등학교 졸업생',
  '중등 1학년',
  '중등 2학년',
  '중등 3학년',
  '중학교 졸업생',
  '고등 1학년',
  '고등 2학년',
  '고등 3학년',
  '고등학교 졸업생',
  '대학생 신입생',
  '대학생 재학생',
  '대학생 졸업생',
  '대학원 신입생',
  '대학원 재학생',
  '대학원 졸업생'
];

function schoolAgeLabelFromIndex(index) {
  if (!Number.isFinite(index)) {
    return '';
  }
  const normalized = Math.max(0, Math.floor(index));
  return SCHOOL_AGE_LABELS[normalized] || '';
}

function formatSchoolAgeRangeText(start, endExclusive) {
  const startLabel = schoolAgeLabelFromIndex(start);
  if (!startLabel) {
    return '';
  }
  if (!Number.isFinite(endExclusive) || endExclusive >= SCHOOL_AGE_LABELS.length) {
    return `학령 ${startLabel} 이상`;
  }
  const endIndex = Math.max(Math.floor(start), Math.floor(endExclusive - 1));
  const endLabel = schoolAgeLabelFromIndex(endIndex) || startLabel;
  return `학령 ${startLabel}~${endLabel}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.detail || '요청 처리 중 오류가 발생했습니다.');
  }

  return data;
}

let adminToastTimer = null;

function showAdminToast(message, kind = 'info') {
  let root = document.getElementById('adminToastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'adminToastRoot';
    root.className = 'admin-toast-root';
    document.body.appendChild(root);
  }
  const toast = document.createElement('div');
  toast.className = `admin-toast is-${kind}`;
  toast.textContent = String(message || '').trim();
  root.innerHTML = '';
  root.appendChild(toast);
  root.classList.add('is-visible');
  if (adminToastTimer) {
    window.clearTimeout(adminToastTimer);
    adminToastTimer = null;
  }
  adminToastTimer = window.setTimeout(() => {
    root.classList.remove('is-visible');
  }, 1800);
}

async function copyTextToClipboard(text) {
  const value = String(text || '');
  if (!value) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(input);
      return Boolean(copied);
    } catch {
      return false;
    }
  }
}

async function ensureAdmin() {
  try {
    return await api('/api/admin/me');
  } catch {
    window.location.href = '/admin';
    return null;
  }
}

function drawStatsChart(svgEl, items) {
  svgEl.innerHTML = '';
  if (!items.length) {
    return;
  }

  const width = 860;
  const height = 240;
  const pLeft = 28;
  const pRight = 20;
  const pTop = 22;
  const pBottom = 36;
  const chartW = width - pLeft - pRight;
  const chartH = height - pTop - pBottom;

  const maxY = Math.max(...items.map((it) => it.count), 1);
  const barW = chartW / items.length;

  for (let i = 0; i <= 4; i += 1) {
    const y = pTop + (chartH * i) / 4;
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    grid.setAttribute('x1', String(pLeft));
    grid.setAttribute('x2', String(width - pRight));
    grid.setAttribute('y1', String(y));
    grid.setAttribute('y2', String(y));
    grid.setAttribute('stroke', '#e6e9ef');
    grid.setAttribute('stroke-width', '1');
    svgEl.appendChild(grid);
  }

  items.forEach((item, idx) => {
    const normalized = item.count / maxY;
    const h = Math.max(2, normalized * chartH);
    const x = pLeft + idx * barW + 3;
    const y = pTop + chartH - h;

    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', String(x));
    bar.setAttribute('y', String(y));
    bar.setAttribute('width', String(Math.max(6, barW - 6)));
    bar.setAttribute('height', String(h));
    bar.setAttribute('rx', '4');
    bar.setAttribute('fill', '#90b8dc');
    svgEl.appendChild(bar);

    if (item.count > 0) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', String(x + Math.max(6, barW - 6) / 2));
      t.setAttribute('y', String(y - 6));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', '10');
      t.setAttribute('fill', '#5e6571');
      t.textContent = String(item.count);
      svgEl.appendChild(t);
    }

    if (idx % 2 === 0 || idx === items.length - 1) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(x + Math.max(6, barW - 6) / 2));
      label.setAttribute('y', String(height - 12));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.setAttribute('fill', '#7a828f');
      label.textContent = item.date.slice(5);
      svgEl.appendChild(label);
    }
  });
}

function syncDashboardPanelHeights() {
  const assignmentPanel = document.getElementById('assignmentPanel');
  const statsPanel = document.getElementById('statsPanel');
  if (!assignmentPanel || !statsPanel) {
    return;
  }

  if (window.innerWidth <= 640) {
    statsPanel.style.minHeight = '';
    return;
  }

  statsPanel.style.minHeight = '';
  const target = assignmentPanel.offsetHeight;
  statsPanel.style.minHeight = `${target}px`;
}

async function initLoginPage() {
  const form = document.getElementById('adminLoginForm');
  const loginBtn = document.getElementById('adminLoginBtn');
  const message = document.getElementById('adminLoginMessage');

  try {
    await api('/api/admin/me');
    window.location.href = '/admin/workspace';
    return;
  } catch {
    // not logged in
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    const payload = {
      admin_id: form.admin_id.value.trim(),
      admin_pw: form.admin_pw.value
    };

    if (!payload.admin_id || !payload.admin_pw) {
      message.textContent = '관리자 ID와 비밀번호를 입력해주세요.';
      message.className = 'message error';
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '로그인 중...';

    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      window.location.href = data.next_url || '/admin/workspace';
    } catch (error) {
      message.textContent = error.message;
      message.className = 'message error';
      loginBtn.disabled = false;
      loginBtn.textContent = '로그인';
    }
  });
}

function renderTestsList(listEl, emptyEl, tests) {
  if (!tests.length) {
    emptyEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  tests.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'row-item';
    li.innerHTML = `
      <div class="row-grid row-grid-tests">
        <div class="row-col main-col">
          <strong>${escapeHtml(item.custom_test_name)}</strong>
        </div>
        <div class="row-col">기반: ${escapeHtml(item.test_id)}</div>
        <div class="row-col">척도 ${item.scale_count}개</div>
        <div class="row-col ${item.assigned_count === 0 ? 'text-warn' : ''}">배정 ${item.assigned_count}명</div>
        <div class="row-col">
          <span class="badge ${item.status === '운영중' ? 'badge-live' : 'badge-wait'}">${item.status}</span>
        </div>
        <div class="row-col row-action">
          <a class="ghost-btn" href="/admin/test-detail?id=${item.id}">상세</a>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderClientsOverview(listEl, emptyEl, clients) {
  if (!clients.length) {
    emptyEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  clients.forEach((item) => {
    const assignedText = item.assigned_custom_test_name
      ? escapeHtml(item.assigned_custom_test_name)
      : '검사 미배정';
    const assessedText = item.last_assessed_on ? item.last_assessed_on : '아직 실시하지 않음';
    const li = document.createElement('li');
    li.className = 'row-item';
    li.innerHTML = `
      <div class="row-grid row-grid-clients">
        <div class="row-col main-col">
          <strong>${escapeHtml(item.name)}</strong>
        </div>
        <div class="row-col">${assignedText}</div>
        <div class="row-col">${assessedText}</div>
        <div class="row-col">
          <span class="badge ${item.status === '미실시' || item.status === '배정대기' ? 'badge-wait' : 'badge-live'}">${item.status}</span>
        </div>
        <div class="row-col row-action">
          <a class="ghost-btn" href="/admin/client-detail?id=${item.id}">상세 보기</a>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderAssignmentList(listEl, emptyEl, clients, tests, onSaved) {
  if (!tests.length) {
    emptyEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';

  const sortedTests = [...tests].sort((a, b) => Number(b.id) - Number(a.id));

  sortedTests.forEach((test) => {
    const assignedClients = clients.filter((client) => Number(client.assigned_custom_test_id) === Number(test.id));
    const li = document.createElement('li');
    li.className = 'row-item assignment-item assignment-test-item';

    const assignedNames = assignedClients.map((item) => escapeHtml(item.name)).join(', ');
    const allClientOptions = clients
      .map((client) => {
        const assignedText = client.assigned_custom_test_name ? ` | 현재: ${escapeHtml(client.assigned_custom_test_name)}` : '';
        return `<option value="${client.id}">${escapeHtml(client.name)}${assignedText}</option>`;
      })
      .join('');
    const assignedClientOptions = assignedClients
      .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
      .join('');

    li.innerHTML = `
      <div class="assignment-head">
        <strong>${escapeHtml(test.custom_test_name)}</strong>
        <span class="assignment-current">배정 ${assignedClients.length}명</span>
      </div>
      <div class="assignment-meta">기반 검사: ${escapeHtml(test.test_id)}</div>
      <div class="assignment-members">${assignedClients.length ? assignedNames : '배정된 내담자 없음'}</div>
      <div class="assignment-controls assignment-controls-test">
        <select class="assignment-select assignment-add-select" aria-label="배정할 내담자 선택">
          <option value="">내담자 선택 후 배정</option>
          ${allClientOptions}
        </select>
        <button type="button" class="outline-btn assignment-btn" data-role="assign">배정</button>
        <select class="assignment-select assignment-remove-select" aria-label="해제할 내담자 선택">
          <option value="">배정 내담자 선택 후 해제</option>
          ${assignedClientOptions}
        </select>
        <button type="button" class="outline-btn assignment-btn" data-role="unassign">해제</button>
      </div>
    `;

    const addSelect = li.querySelector('.assignment-add-select');
    const removeSelect = li.querySelector('.assignment-remove-select');
    const assignBtn = li.querySelector('[data-role="assign"]');
    const unassignBtn = li.querySelector('[data-role="unassign"]');

    const setBusy = (busy) => {
      addSelect.disabled = busy;
      removeSelect.disabled = busy;
      assignBtn.disabled = busy;
      unassignBtn.disabled = busy || assignedClients.length === 0;
    };

    async function updateAssignment(clientId, nextTestId) {
      setBusy(true);
      try {
        await api(`/api/admin/clients/${clientId}/assignment`, {
          method: 'PUT',
          body: JSON.stringify({
            admin_custom_test_id: nextTestId
          })
        });
        await onSaved();
      } finally {
        setBusy(false);
      }
    }

    assignBtn.addEventListener('click', async () => {
      const clientId = addSelect.value ? Number(addSelect.value) : null;
      if (!clientId) {
        window.alert('배정할 내담자를 선택해주세요.');
        return;
      }
      try {
        await updateAssignment(clientId, Number(test.id));
      } catch (error) {
        window.alert(error.message || '배정 저장 중 오류가 발생했습니다.');
      }
    });

    unassignBtn.addEventListener('click', async () => {
      const clientId = removeSelect.value ? Number(removeSelect.value) : null;
      if (!clientId) {
        window.alert('해제할 내담자를 선택해주세요.');
        return;
      }
      try {
        await updateAssignment(clientId, null);
      } catch (error) {
        window.alert(error.message || '배정 해제 중 오류가 발생했습니다.');
      }
    });

    listEl.appendChild(li);
  });
}

async function initWorkspacePage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const adminNameEl = document.getElementById('adminName');
  if (adminNameEl) {
    adminNameEl.textContent = me.username;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  const statsChartWrap = document.getElementById('statsChartWrap');
  const statsEmpty = document.getElementById('statsEmpty');
  const customTestsList = document.getElementById('customTestsList');
  const customTestsEmpty = document.getElementById('customTestsEmpty');
  const clientsOverviewList = document.getElementById('clientsOverviewList');
  const clientsEmpty = document.getElementById('clientsEmpty');
  const assignmentList = document.getElementById('assignmentList');
  const assignmentEmpty = document.getElementById('assignmentEmpty');

  async function refreshWorkspace() {
    const [dashboard, clientsResp, testsResp] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/clients'),
      api('/api/admin/custom-tests')
    ]);

    document.getElementById('sumRunningTests').textContent = dashboard.summary.running_tests;
    document.getElementById('sumTotalClients').textContent = dashboard.summary.total_clients;
    document.getElementById('sumNotStarted').textContent = dashboard.summary.not_started_clients;
    document.getElementById('sumTodayAssessments').textContent = dashboard.summary.today_assessments;

    renderTestsList(customTestsList, customTestsEmpty, dashboard.tests);
    renderClientsOverview(clientsOverviewList, clientsEmpty, dashboard.clients);
    renderAssignmentList(assignmentList, assignmentEmpty, clientsResp.items, testsResp.items, refreshWorkspace);

    const totalCount = dashboard.stats.reduce((acc, cur) => acc + cur.count, 0);
    if (totalCount === 0) {
      statsEmpty.classList.remove('hidden');
      statsChartWrap.classList.add('chart-empty');
    } else {
      statsEmpty.classList.add('hidden');
      statsChartWrap.classList.remove('chart-empty');
    }
    drawStatsChart(document.getElementById('statsChart'), dashboard.stats);
    syncDashboardPanelHeights();
  }

  await refreshWorkspace();
  window.addEventListener('resize', syncDashboardPanelHeights);

  logoutBtn.addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin';
  });
}

async function initClientsPage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const clientFilterForm = document.getElementById('clientFilterForm');
  const clientFilterQInput = document.getElementById('client_filter_q');
  const clientFilterGenderInput = document.getElementById('client_filter_gender');
  const clientFilterStatusInput = document.getElementById('client_filter_status');
  const clientFilterTestInput = document.getElementById('client_filter_test');
  const clientSearchResetBtn = document.getElementById('clientSearchResetBtn');
  const openClientCreateBtn = document.getElementById('openClientCreateBtn');
  const deleteSelectedClientsBtn = document.getElementById('deleteSelectedClientsBtn');

  const clientFormModal = document.getElementById('clientFormModal');
  const closeClientFormModalTopBtn = document.getElementById('closeClientFormModalTopBtn');
  const clientFormTitle = document.getElementById('clientFormTitle');
  const clientForm = document.getElementById('clientForm');
  const clientIdInput = document.getElementById('client_id');
  const clientNameInput = document.getElementById('client_name');
  const clientGenderInput = document.getElementById('client_gender');
  const clientBirthInput = document.getElementById('client_birth_day');
  const clientMemoInput = document.getElementById('client_memo');
  const clientSaveBtn = document.getElementById('clientSaveBtn');
  const clientCancelBtn = document.getElementById('clientCancelBtn');
  const clientMessage = document.getElementById('clientMessage');
  const clientList = document.getElementById('clientList');
  const clientListHead = document.getElementById('clientListHead');
  const clientListScroll = document.querySelector('.client-list-scroll');
  const clientSelectAll = document.getElementById('clientSelectAll');
  const clientEmpty = document.getElementById('clientEmpty');
  let allClients = [];
  const selectedClientIds = new Set();
  let visibleClientIds = [];

  function syncClientListHeadLayout() {
    if (!clientListHead) {
      return;
    }
    const scrollbarWidth = clientListScroll
      ? Math.max(0, clientListScroll.offsetWidth - clientListScroll.clientWidth)
      : 0;
    clientListHead.style.setProperty('--client-list-scrollbar-width', `${scrollbarWidth}px`);
  }

  function openClientFormModal() {
    if (!clientFormModal) {
      return;
    }
    clientFormModal.classList.remove('hidden');
    clientFormModal.setAttribute('aria-hidden', 'false');
  }

  function closeClientFormModal() {
    if (!clientFormModal) {
      return;
    }
    clientFormModal.classList.add('hidden');
    clientFormModal.setAttribute('aria-hidden', 'true');
  }

  function resetClientForm() {
    clientIdInput.value = '';
    clientNameInput.value = '';
    clientGenderInput.value = '';
    clientBirthInput.value = '';
    clientMemoInput.value = '';
    clientSaveBtn.textContent = '내담자 저장';
    clientMessage.textContent = '';
    clientMessage.className = 'message';
    if (clientFormTitle) {
      clientFormTitle.textContent = '내담자 저장';
    }
  }

  function syncClientSelectionUI() {
    const selectedVisibleCount = visibleClientIds.filter((id) => selectedClientIds.has(id)).length;
    const visibleCount = visibleClientIds.length;

    if (!deleteSelectedClientsBtn) {
      if (clientSelectAll) {
        clientSelectAll.checked = false;
        clientSelectAll.indeterminate = false;
        clientSelectAll.disabled = true;
      }
      return;
    }
    deleteSelectedClientsBtn.disabled = selectedVisibleCount === 0;
    deleteSelectedClientsBtn.textContent = selectedVisibleCount > 0 ? `선택 삭제 (${selectedVisibleCount})` : '선택 삭제';

    if (!clientSelectAll) {
      return;
    }
    clientSelectAll.disabled = visibleCount === 0;
    clientSelectAll.checked = visibleCount > 0 && selectedVisibleCount === visibleCount;
    clientSelectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCount;
  }

  function getFilteredClients() {
    const q = (clientFilterQInput?.value || '').trim().toLowerCase();
    const gender = clientFilterGenderInput?.value || '';
    const status = clientFilterStatusInput?.value || '';
    const testQ = (clientFilterTestInput?.value || '').trim().toLowerCase();

    return allClients.filter((item) => {
      if (gender && item.gender !== gender) {
        return false;
      }
      if (status && item.status !== status) {
        return false;
      }
      if (q) {
        const haystack = `${item.name || ''} ${item.memo || ''}`.toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      if (testQ) {
        const assignedName = `${item.assigned_custom_test_name || ''} ${item.assigned_parent_test_name || ''}`.toLowerCase();
        if (!assignedName.includes(testQ)) {
          return false;
        }
      }
      return true;
    });
  }

  function renderClients(clients) {
    if (!allClients.length) {
      clientEmpty.textContent = '등록된 내담자가 없습니다.';
      clientEmpty.classList.remove('hidden');
      visibleClientIds = [];
      if (clientListHead) {
        clientListHead.classList.add('hidden');
      }
      clientList.innerHTML = '';
      syncClientListHeadLayout();
      syncClientSelectionUI();
      return;
    }

    if (!clients.length) {
      clientEmpty.textContent = '검색 조건에 맞는 내담자가 없습니다.';
      clientEmpty.classList.remove('hidden');
      visibleClientIds = [];
      if (clientListHead) {
        clientListHead.classList.add('hidden');
      }
      clientList.innerHTML = '';
      syncClientListHeadLayout();
      syncClientSelectionUI();
      return;
    }

    visibleClientIds = clients.map((item) => item.id);
    clientEmpty.classList.add('hidden');
    if (clientListHead) {
      clientListHead.classList.remove('hidden');
    }
    clientList.innerHTML = '';

    clients.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'row-item';
      const detailHref = `/admin/client-detail?id=${item.id}`;
      const isSelected = selectedClientIds.has(item.id);
      const assignedName = item.assigned_custom_test_name || '';
      const parentTestName = item.assigned_parent_test_name || '';
      const assignedDisplay = assignedName
        ? (parentTestName ? `${assignedName} (기반: ${parentTestName})` : assignedName)
        : '미배정';
      li.innerHTML = `
        <div class="row-grid client-row-grid">
          <div class="row-col select-col">
            <input type="checkbox" class="client-select-checkbox" data-role="select-client" value="${item.id}" ${isSelected ? 'checked' : ''} aria-label="내담자 선택" />
          </div>
          <div class="row-col main-col client-name-cell">
            <strong>${escapeHtml(item.name)}</strong>
          </div>
          <div class="row-col">${escapeHtml(assignedDisplay)}</div>
          <div class="row-col">${item.last_assessed_on || '-'}</div>
          <div class="row-col">
            <span class="badge ${item.status === '미실시' || item.status === '배정대기' ? 'badge-wait' : 'badge-live'}">${item.status}</span>
          </div>
          <div class="row-col row-action">
            <a class="ghost-btn" href="${detailHref}">상세</a>
          </div>
        </div>
      `;
      clientList.appendChild(li);
    });
    syncClientListHeadLayout();
    syncClientSelectionUI();
  }

  function clearClientSelection() {
    selectedClientIds.clear();
    syncClientSelectionUI();
  }

  function applyClientFilters() {
    renderClients(getFilteredClients());
  }

  async function refreshClients(options = {}) {
    const clearSelection = options.clearSelection === true;
    allClients = (await api('/api/admin/clients')).items;
    if (clearSelection) {
      clearClientSelection();
    } else if (selectedClientIds.size > 0) {
      const validIds = new Set(allClients.map((item) => item.id));
      [...selectedClientIds].forEach((id) => {
        if (!validIds.has(id)) {
          selectedClientIds.delete(id);
        }
      });
      syncClientSelectionUI();
    }
    applyClientFilters();
  }

  clientFilterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearClientSelection();
    applyClientFilters();
  });

  clientSearchResetBtn.addEventListener('click', () => {
    clientFilterQInput.value = '';
    clientFilterGenderInput.value = '';
    clientFilterStatusInput.value = '';
    clientFilterTestInput.value = '';
    clearClientSelection();
    applyClientFilters();
  });

  openClientCreateBtn.addEventListener('click', () => {
    resetClientForm();
    openClientFormModal();
  });

  if (clientSelectAll) {
    clientSelectAll.addEventListener('change', (event) => {
      const checked = event.target.checked;
      visibleClientIds.forEach((id) => {
        if (checked) {
          selectedClientIds.add(id);
        } else {
          selectedClientIds.delete(id);
        }
      });
      renderClients(getFilteredClients());
    });
  }

  clientList.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.dataset.role !== 'select-client') {
      return;
    }
    const clientId = Number(target.value);
    if (!Number.isFinite(clientId)) {
      return;
    }
    if (target.checked) {
      selectedClientIds.add(clientId);
    } else {
      selectedClientIds.delete(clientId);
    }
    syncClientSelectionUI();
  });

  if (clientListScroll) {
    clientListScroll.addEventListener('scroll', syncClientListHeadLayout);
  }
  window.addEventListener('resize', syncClientListHeadLayout);

  if (deleteSelectedClientsBtn) {
    deleteSelectedClientsBtn.addEventListener('click', async () => {
      const selectedIds = visibleClientIds.filter((id) => selectedClientIds.has(id));
      if (!selectedIds.length) {
        return;
      }

      const ok = window.confirm(`선택한 내담자 ${selectedIds.length}명을 삭제하시겠습니까?`);
      if (!ok) {
        return;
      }

      deleteSelectedClientsBtn.disabled = true;
      deleteSelectedClientsBtn.textContent = '삭제 중...';

      const results = await Promise.allSettled(
        selectedIds.map((clientId) => api(`/api/admin/clients/${clientId}`, { method: 'DELETE' }))
      );
      const failedCount = results.filter((row) => row.status === 'rejected').length;
      if (failedCount > 0) {
        window.alert(`${failedCount}명의 내담자 삭제에 실패했습니다. 목록을 새로고침했습니다.`);
      }
      await refreshClients({ clearSelection: true });
    });
  }

  clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clientMessage.textContent = '';
    clientMessage.className = 'message';

    const payload = {
      name: clientNameInput.value.trim(),
      gender: clientGenderInput.value,
      birth_day: clientBirthInput.value || null,
      memo: clientMemoInput.value.trim(),
      admin_custom_test_id: null
    };

    if (!payload.name || !payload.gender) {
      clientMessage.textContent = '이름과 성별은 필수입니다.';
      clientMessage.className = 'message error';
      return;
    }

    clientSaveBtn.disabled = true;
    try {
      await api('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closeClientFormModal();
      resetClientForm();
      await refreshClients({ clearSelection: true });
    } catch (error) {
      clientMessage.textContent = error.message;
      clientMessage.className = 'message error';
    } finally {
      clientSaveBtn.disabled = false;
    }
  });

  clientCancelBtn.addEventListener('click', () => {
    closeClientFormModal();
    resetClientForm();
  });
  if (closeClientFormModalTopBtn) {
    closeClientFormModalTopBtn.addEventListener('click', () => {
      closeClientFormModal();
      resetClientForm();
    });
  }
  if (clientFormModal) {
    clientFormModal.addEventListener('click', (event) => {
      if (event.target === clientFormModal) {
        closeClientFormModal();
        resetClientForm();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (clientFormModal && !clientFormModal.classList.contains('hidden')) {
      closeClientFormModal();
      resetClientForm();
    }
  });

  await refreshClients({ clearSelection: true });
}

function setSubTests(catalog, testId, subSelect) {
  subSelect.innerHTML = '<option value="" selected disabled>서브검사를 선택하세요</option>';
  const test = catalog.tests.find((it) => it.test_id === testId);
  if (!test) {
    return;
  }

  test.sub_tests.forEach((sub, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    const countText = sub.item_count ? ` (${sub.item_count}문항)` : '';
    option.textContent = `${sub.display_name}${countText}`;
    subSelect.appendChild(option);
  });
}

function renderScaleList(catalog, testId, subIndex, scaleListEl, selected = []) {
  scaleListEl.innerHTML = '';
  const test = catalog.tests.find((it) => it.test_id === testId);
  if (!test) {
    return;
  }
  const sub = test.sub_tests[Number(subIndex)];
  if (!sub) {
    return;
  }

  sub.scales.forEach((scale) => {
    const checked = selected.includes(scale.code) ? 'checked' : '';
    const label = document.createElement('label');
    label.className = 'check-item';
    label.innerHTML = `
      <input type="checkbox" name="scale_code" value="${scale.code}" ${checked} />
      <span>${scale.code} - ${scale.name}</span>
    `;
    scaleListEl.appendChild(label);
  });
}

function parseEligibilityRange(variant) {
  const ageRange = variant?.age_range;
  const schoolAgeRange = variant?.school_age_range;
  const hasAgeRange = ageRange && typeof ageRange === 'object';
  const hasSchoolAgeRange = schoolAgeRange && typeof schoolAgeRange === 'object';
  const range = hasAgeRange ? ageRange : (hasSchoolAgeRange ? schoolAgeRange : null);
  const start = Array.isArray(range?.start_inclusive) ? Number(range.start_inclusive[0]) : null;
  const endExclusive = Array.isArray(range?.end_exclusive) ? Number(range.end_exclusive[0]) : null;
  if (!Number.isFinite(start) || !Number.isFinite(endExclusive)) {
    return { text: '', start: 9999 };
  }
  if (hasAgeRange) {
    return {
      text: endExclusive >= 100
        ? `만 ${start}세 이상`
        : `만 ${start}~${Math.max(start, endExclusive - 1)}세`,
      start
    };
  }
  const schoolRangeText = formatSchoolAgeRangeText(start, endExclusive);
  return {
    text: schoolRangeText,
    start
  };
}

function extractEligibilityText(subTestJson) {
  try {
    const parsed = JSON.parse(subTestJson || '{}');
    const variants = Array.isArray(parsed?.sub_tests) ? parsed.sub_tests : [parsed];
    const labels = [];
    const seen = new Set();

    variants.forEach((variant) => {
      const rangeMeta = parseEligibilityRange(variant);
      const ageText = rangeMeta.text;

      const schoolRaw = variant?.school_ages
        || variant?.school_age
        || variant?.school_grades
        || variant?.school_grade
        || variant?.grades
        || variant?.grade
        || null;
      let schoolText = '';
      if (Array.isArray(schoolRaw) && schoolRaw.length) {
        schoolText = schoolRaw.join(', ');
      } else if (typeof schoolRaw === 'string' && schoolRaw.trim()) {
        schoolText = schoolRaw.trim();
      }

      const label = ageText && schoolText
        ? `${ageText} / ${schoolText}`
        : (ageText || schoolText);
      if (!label || seen.has(label)) {
        return;
      }
      seen.add(label);
      labels.push({
        text: label,
        ageStart: rangeMeta.start
      });
    });

    if (labels.length) {
      labels.sort((a, b) => a.ageStart - b.ageStart || a.text.localeCompare(b.text));
      return labels.map((item) => item.text).join(', ');
    }
  } catch {
    // ignore parse error
  }
  return '연령/학령 정보 없음';
}

function buildScaleNameIndex(catalog) {
  const index = new Map();
  (catalog?.tests || []).forEach((test) => {
    (test.sub_tests || []).forEach((sub) => {
      const key = `${test.test_id}::${sub.sub_test_json}`;
      const scaleMap = new Map();
      (sub.scales || []).forEach((scale) => {
        scaleMap.set(scale.code, scale.name || scale.code);
      });
      index.set(key, scaleMap);
    });
  });
  return index;
}

function getSelectedScaleLabelsFromConfigs(catalog, testConfigs) {
  const scaleIndex = buildScaleNameIndex(catalog);
  const labels = [];
  const seen = new Set();

  (Array.isArray(testConfigs) ? testConfigs : []).forEach((config) => {
    const testId = String(config?.test_id || '');
    (config?.sub_test_variants || []).forEach((variant) => {
      const subTestJson = typeof variant?.sub_test_json === 'string'
        ? variant.sub_test_json
        : JSON.stringify(variant?.sub_test_json || {});
      const scaleMap = scaleIndex.get(`${testId}::${subTestJson}`) || new Map();
      (variant?.selected_scale_codes || []).forEach((code) => {
        const key = `${testId}::${code}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        labels.push(`${testId} - ${scaleMap.get(code) || code}(${code})`);
      });
    });
  });

  return labels;
}

function getSelectedScaleLinesByTest(catalog, testConfigs) {
  const scaleIndex = buildScaleNameIndex(catalog);
  const byTest = new Map();

  (Array.isArray(testConfigs) ? testConfigs : []).forEach((config) => {
    const testId = String(config?.test_id || '').trim();
    if (!testId) {
      return;
    }
    if (!byTest.has(testId)) {
      byTest.set(testId, new Map());
    }
    const selectedMap = byTest.get(testId);
    (config?.sub_test_variants || []).forEach((variant) => {
      const subTestJson = typeof variant?.sub_test_json === 'string'
        ? variant.sub_test_json
        : JSON.stringify(variant?.sub_test_json || {});
      const scaleMap = scaleIndex.get(`${testId}::${subTestJson}`) || new Map();
      (variant?.selected_scale_codes || []).forEach((code) => {
        const key = String(code || '').trim();
        if (!key || selectedMap.has(key)) {
          return;
        }
        const name = String(scaleMap.get(key) || key);
        selectedMap.set(key, `${name}(${key})`);
      });
    });
  });

  return [...byTest.entries()].map(([testId, selectedMap]) => {
    const scales = [...selectedMap.values()];
    return `${testId} - ${scales.length ? scales.join(', ') : '선택 척도 없음'}`;
  });
}

function splitEligibilityLines(eligibilityTexts) {
  const ageSet = new Set();
  const schoolSet = new Set();
  const schoolPattern = /(학령|유치|초등|중등|중학교|고등|고교|학년)/;

  (Array.isArray(eligibilityTexts) ? eligibilityTexts : [])
    .flatMap((text) => String(text || '').split(',').map((part) => part.trim()).filter(Boolean))
    .forEach((part) => {
      if (part.includes('/')) {
        const [left, right] = part.split('/').map((x) => String(x || '').trim()).filter(Boolean);
        if (left) {
          ageSet.add(left);
        }
        if (right) {
          schoolSet.add(right);
        }
        return;
      }
      if (schoolPattern.test(part)) {
        schoolSet.add(part);
      } else {
        ageSet.add(part);
      }
    });

  return {
    age: [...ageSet],
    school: [...schoolSet],
  };
}

function getEligibilityTextsFromConfigs(testConfigs) {
  const labels = [];
  const seen = new Set();

  (Array.isArray(testConfigs) ? testConfigs : []).forEach((config) => {
    (config?.sub_test_variants || []).forEach((variant) => {
      const subTestJson = typeof variant?.sub_test_json === 'string'
        ? variant.sub_test_json
        : JSON.stringify(variant?.sub_test_json || {});
      const text = extractEligibilityText(subTestJson);
      if (!text || seen.has(text)) {
        return;
      }
      seen.add(text);
      labels.push(text);
    });
  });

  return labels;
}

function listAllEligibilityTexts(catalog, testId, selectedScaleCodes) {
  function ageStartFromJson(subTestJson) {
    try {
      const parsed = JSON.parse(subTestJson || '{}');
      return parseEligibilityRange(parsed).start;
    } catch {
      return 9999;
    }
  }

  const test = (catalog?.tests || []).find((it) => it.test_id === testId);
  if (!test || !Array.isArray(selectedScaleCodes) || !selectedScaleCodes.length) {
    return [];
  }

  const selected = new Set(selectedScaleCodes);
  const picked = [];

  (test.sub_tests || []).forEach((sub) => {
    const available = new Set((sub.scales || []).map((scale) => scale.code));
    const hasAnySelected = [...selected].some((code) => available.has(code));
    if (!hasAnySelected) {
      return;
    }
    picked.push({
      text: extractEligibilityText(sub.sub_test_json),
      ageStart: ageStartFromJson(sub.sub_test_json)
    });
  });

  const dedup = new Map();
  picked.forEach((item) => {
    const prev = dedup.get(item.text);
    if (!prev || item.ageStart < prev.ageStart) {
      dedup.set(item.text, item);
    }
  });

  return [...dedup.values()]
    .sort((a, b) => a.ageStart - b.ageStart || a.text.localeCompare(b.text))
    .map((item) => item.text);
}

function renderManagedTests(listEl, emptyEl, items, catalog, selectedIds = new Set()) {
  if (!items.length) {
    emptyEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = '';
  items.forEach((item) => {
    const scaleLines = getSelectedScaleLinesByTest(catalog, item.test_configs || []);
    const allEligibility = getEligibilityTextsFromConfigs(item.test_configs || []);
    const eligibilitySource = allEligibility.length ? allEligibility : [extractEligibilityText(item.sub_test_json)];
    const eligibilityLines = splitEligibilityLines(eligibilitySource);
    const ageLineText = `연령 ${eligibilityLines.age.join(', ') || '-'}`;
    const schoolLineText = `학령 ${eligibilityLines.school.join(', ') || '-'}`;
    const eligibilityHtml = `
      <div class="cell-lines">
        <div class="cell-line" title="${escapeHtml(ageLineText)}"><span class="cell-label">연령</span> ${escapeHtml(eligibilityLines.age.join(', ') || '-')}</div>
        <div class="cell-line" title="${escapeHtml(schoolLineText)}"><span class="cell-label">학령</span> ${escapeHtml(eligibilityLines.school.join(', ') || '-')}</div>
      </div>
    `;
    const scalesHtml = scaleLines.length
      ? `<div class="cell-lines">${scaleLines.map((line) => `<div class="cell-line" title="${escapeHtml(line)}">${escapeHtml(line)}</div>`).join('')}</div>`
      : '<div class="cell-lines"><div class="cell-line">-</div></div>';
    const li = document.createElement('li');
    li.className = 'row-item';
    const checked = selectedIds.has(item.id) ? 'checked' : '';
    li.innerHTML = `
      <div class="row-grid row-grid-manage">
        <div class="row-col select-col"><input type="checkbox" data-role="select-test" value="${item.id}" ${checked} aria-label="검사 선택" /></div>
        <div class="row-col main-col"><strong>${escapeHtml(item.custom_test_name)}</strong></div>
        <div class="row-col root-col">${escapeHtml(item.test_id)}</div>
        <div class="row-col target-col">${eligibilityHtml}</div>
        <div class="row-col scale-col">${scalesHtml}</div>
        <div class="row-col">${item.assigned_count} / ${item.assessed_count}</div>
        <div class="row-col"><span class="badge ${item.progress_status === '종료' ? 'badge-done' : (item.progress_status === '실시' ? 'badge-live' : 'badge-wait')}">${item.progress_status}</span></div>
        <div class="row-col row-action item-actions">
          <button type="button" class="outline-btn" data-role="generate-link" data-id="${item.id}">URL</button>
          <a class="ghost-btn" href="/admin/test-detail?id=${item.id}">상세</a>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

async function initCreatePage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const filterForm = document.getElementById('testManageFilterForm');
  const filterQ = document.getElementById('filter_q');
  const filterStatus = document.getElementById('filter_status');
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  const toggleCreateFormBtn = document.getElementById('toggleCreateFormBtn');
  const deleteSelectedTestsBtn = document.getElementById('deleteSelectedTestsBtn');
  const manageSelectAll = document.getElementById('manageSelectAll');
  const createTestModal = document.getElementById('createTestModal');
  const closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
  const managedTestsList = document.getElementById('managedTestsList');
  const managedTestsEmpty = document.getElementById('managedTestsEmpty');

  const form = document.getElementById('createTestForm');
  const testCheckboxList = document.getElementById('testCheckboxList');
  const scaleListEl = document.getElementById('scaleList');
  const customFieldList = document.getElementById('customFieldList');
  const addCustomFieldBtn = document.getElementById('addCustomFieldBtn');
  const createBtn = document.getElementById('createTestBtn');
  const message = document.getElementById('createTestMessage');

  const rootDetailTestIdInput = document.getElementById('rootDetailTestIdInput');
  const rootDetailTestIdList = document.getElementById('rootDetailTestIdList');
  const rootDetailOpenModalBtn = document.getElementById('rootDetailOpenModalBtn');
  const rootDetailModal = document.getElementById('rootDetailModal');
  const rootDetailModalTestId = document.getElementById('rootDetailModalTestId');
  const rootDetailModalPurpose = document.getElementById('rootDetailModalPurpose');
  const rootDetailModalSubList = document.getElementById('rootDetailModalSubList');
  const rootDetailModalScaleTree = document.getElementById('rootDetailModalScaleTree');
  const rootDetailModalCloseBtn = document.getElementById('rootDetailModalCloseBtn');

  let catalog = { tests: [] };
  let managedItems = [];
  let customFields = [];
  let customFieldSeq = 1;
  const selectedManagedTestIds = new Set();
  const selectedRootSubIdxByTest = new Map();
  let modalSelectedSubIdx = 0;

  function syncManagedSelectionUI() {
    const visibleIds = managedItems.map((item) => item.id);
    const selectedCount = visibleIds.filter((id) => selectedManagedTestIds.has(id)).length;
    const allCount = visibleIds.length;
    deleteSelectedTestsBtn.disabled = selectedCount === 0;
    manageSelectAll.checked = allCount > 0 && selectedCount === allCount;
    manageSelectAll.indeterminate = selectedCount > 0 && selectedCount < allCount;
  }

  function formatSubTestLabel(subTest) {
    const ageLabel = subTest.age_label || extractEligibilityText(subTest.sub_test_json);
    const count = Number.isFinite(subTest.item_count) ? `${subTest.item_count}문항` : '문항 수 미확인';
    return `${subTest.display_name} | ${ageLabel} | ${count}`;
  }

  function getRootTest(testId) {
    return (catalog.tests || []).find((it) => it.test_id === testId) || null;
  }

  function getResolvedRootTestId(rawValue) {
    const input = (rawValue || '').trim();
    if (!input) {
      return catalog.tests[0]?.test_id || '';
    }
    const exact = getRootTest(input);
    if (exact) {
      return exact.test_id;
    }
    const lower = input.toLowerCase();
    const partial = (catalog.tests || []).find((it) => it.test_id.toLowerCase().includes(lower));
    return partial?.test_id || '';
  }

  function getSelectedSubTest(testId) {
    const test = getRootTest(testId);
    if (!test || !test.sub_tests?.length) {
      return null;
    }
    const idx = selectedRootSubIdxByTest.get(testId) ?? 0;
    return test.sub_tests[Math.min(Math.max(idx, 0), test.sub_tests.length - 1)];
  }

  function buildPurposeText(testId, sub) {
    const ageLabel = sub.age_label || extractEligibilityText(sub.sub_test_json);
    const itemCount = Number.isFinite(sub.item_count)
      ? sub.item_count
      : Array.isArray(sub.item_texts) ? sub.item_texts.length : 0;
    return `${testId} 검사에서 ${ageLabel} 구간(${itemCount}문항)의 반응을 통해 핵심 특성을 빠르게 파악합니다.`;
  }

  function renderRootDetailModalSubList(testId) {
    const test = getRootTest(testId);
    rootDetailModalSubList.innerHTML = '';
    rootDetailModalScaleTree.innerHTML = '';
    if (!test) {
      rootDetailModalPurpose.textContent = '-';
      return;
    }
    const selectedSub = test.sub_tests[Math.min(Math.max(modalSelectedSubIdx, 0), test.sub_tests.length - 1)];
    rootDetailModalPurpose.textContent = selectedSub ? buildPurposeText(testId, selectedSub) : '-';
    test.sub_tests.forEach((sub, idx) => {
      const ageLabel = sub.age_label || extractEligibilityText(sub.sub_test_json);
      const itemCount = Number.isFinite(sub.item_count)
        ? sub.item_count
        : Array.isArray(sub.item_texts) ? sub.item_texts.length : 0;
      const li = document.createElement('li');
      li.className = 'root-modal-row';
      li.innerHTML = `
        <label class="root-modal-radio">
          <input type="radio" name="root_modal_sub" value="${idx}" ${idx === modalSelectedSubIdx ? 'checked' : ''} />
          <span>
            <strong>${escapeHtml(sub.display_name)}</strong><br />
            <small>${escapeHtml(ageLabel)} | ${itemCount}문항</small>
          </span>
        </label>
      `;
      rootDetailModalSubList.appendChild(li);
    });

    renderRootScaleTree(testId, selectedSub);
  }

  function representativeItemsForScale(sub, scale, limit = 2) {
    const itemMap = sub.item_map || {};
    const ids = Array.isArray(scale.item_ids) ? scale.item_ids : [];
    const picked = [];
    ids.forEach((id) => {
      const text = itemMap[String(id)];
      if (text) {
        picked.push({ id: String(id), text: String(text) });
      }
    });
    return picked.slice(0, limit);
  }

  function renderScaleNode(sub, scale, isChild = false) {
    const items = representativeItemsForScale(sub, scale);
    const hasPreview = items.length > 0;
    const li = document.createElement('li');
    li.className = `root-scale-node${isChild ? ' is-child' : ''}`;
    li.innerHTML = `
      <div class="root-scale-row">
        <span class="root-scale-label">${escapeHtml(scale.name || scale.code)} (${escapeHtml(scale.code)})</span>
        ${hasPreview ? '<button type="button" class="root-preview-btn" data-role="toggle-rep" aria-label="대표 문항 펼치기/접기"><span class="arrow">▼</span></button>' : ''}
      </div>
      <ul class="root-rep-list hidden">
        ${items.map((it) => `<li>${escapeHtml(it.text)}</li>`).join('')}
      </ul>
    `;
    return li;
  }

  function renderRootScaleTree(testId, sub) {
    rootDetailModalScaleTree.innerHTML = '';
    const scales = Array.isArray(sub?.scales) ? sub.scales : [];
    if (!scales.length) {
      const li = document.createElement('li');
      li.textContent = '척도 정보가 없습니다.';
      rootDetailModalScaleTree.appendChild(li);
      return;
    }

    const parentMap = new Map();
    scales.forEach((scale) => {
      const code = String(scale.code || '');
      const parentCode = code.includes('-') ? code.split('-')[0] : code;
      if (!parentMap.has(parentCode)) {
        parentMap.set(parentCode, {
          code: parentCode,
          name: parentCode,
          item_ids: [],
          children: [],
        });
      }
      const parent = parentMap.get(parentCode);
      if (code === parentCode) {
        parent.name = scale.name || scale.code;
        parent.item_ids = scale.item_ids || [];
      } else {
        parent.children.push(scale);
      }
    });

    [...parentMap.values()].forEach((parent) => {
      const li = document.createElement('li');
      li.className = 'root-scale-parent';
      const childWrapId = `scale-children-${testId}-${parent.code}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const hasChildren = parent.children.length > 0;
      li.innerHTML = `
        <div class="root-scale-parent-row">
          <span class="root-scale-label"><strong>${escapeHtml(parent.name || parent.code)} (${escapeHtml(parent.code)})</strong></span>
          ${hasChildren ? `<button type="button" class="outline-btn uniform-btn root-child-toggle" data-role="toggle-child" data-target="${childWrapId}">하위 척도 보기</button>` : ''}
        </div>
        <ul id="${childWrapId}" class="root-scale-children hidden"></ul>
      `;
      rootDetailModalScaleTree.appendChild(li);

      if (!hasChildren) {
        const list = li.querySelector(`[id="${childWrapId}"]`);
        if (list) {
          list.classList.remove('hidden');
          list.appendChild(renderScaleNode(sub, parent, true));
        }
        return;
      }

      const list = li.querySelector(`[id="${childWrapId}"]`);
      parent.children
        .sort((a, b) => String(a.code).localeCompare(String(b.code)))
        .forEach((child) => {
          list.appendChild(renderScaleNode(sub, child, true));
        });
    });
  }

  function initRootDetailControls() {
    rootDetailTestIdList.innerHTML = '';
    (catalog.tests || []).forEach((test) => {
      const option = document.createElement('option');
      option.value = test.test_id;
      rootDetailTestIdList.appendChild(option);
    });

    const firstTestId = catalog.tests[0]?.test_id || '';
    if (firstTestId) {
      rootDetailTestIdInput.value = firstTestId;
      selectedRootSubIdxByTest.set(firstTestId, 0);
    }

    rootDetailTestIdInput.addEventListener('input', () => {
      const testId = getResolvedRootTestId(rootDetailTestIdInput.value);
      if (!testId) {
        return;
      }
      if (!selectedRootSubIdxByTest.has(testId)) {
        selectedRootSubIdxByTest.set(testId, 0);
      }
    });

    rootDetailOpenModalBtn.addEventListener('click', () => {
      const testId = getResolvedRootTestId(rootDetailTestIdInput.value);
      if (!testId) {
        return;
      }
      rootDetailTestIdInput.value = testId;
      rootDetailModalTestId.value = testId;
      modalSelectedSubIdx = selectedRootSubIdxByTest.get(testId) ?? 0;
      renderRootDetailModalSubList(testId);
      rootDetailModal.classList.remove('hidden');
      rootDetailModal.setAttribute('aria-hidden', 'false');
    });

    rootDetailModalTestId.addEventListener('change', () => {
      const testId = rootDetailModalTestId.value;
      modalSelectedSubIdx = selectedRootSubIdxByTest.get(testId) ?? 0;
      renderRootDetailModalSubList(testId);
    });

    rootDetailModalSubList.addEventListener('change', (event) => {
      const input = event.target.closest('input[name="root_modal_sub"]');
      if (!input) {
        return;
      }
      modalSelectedSubIdx = Number(input.value);
      const testId = rootDetailModalTestId.value;
      const test = getRootTest(testId);
      if (test && test.sub_tests[modalSelectedSubIdx]) {
        rootDetailModalPurpose.textContent = buildPurposeText(testId, test.sub_tests[modalSelectedSubIdx]);
        renderRootScaleTree(testId, test.sub_tests[modalSelectedSubIdx]);
      }
    });

    rootDetailModalScaleTree.addEventListener('click', (event) => {
      const childToggle = event.target.closest('[data-role="toggle-child"]');
      if (childToggle) {
        const targetId = childToggle.dataset.target;
        const panel = document.getElementById(targetId);
        if (!panel) {
          return;
        }
        const willShow = panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !willShow);
        childToggle.textContent = willShow ? '하위 척도 숨기기' : '하위 척도 보기';
        return;
      }

      const previewToggle = event.target.closest('[data-role="toggle-rep"]');
      if (!previewToggle) {
        return;
      }
      const wrapper = previewToggle.closest('.root-scale-node');
      const list = wrapper?.querySelector('.root-rep-list');
      if (!list) {
        return;
      }
      const willShow = list.classList.contains('hidden');
      list.classList.toggle('hidden', !willShow);
      previewToggle.innerHTML = willShow
        ? '<span class="arrow">▲</span>'
        : '<span class="arrow">▼</span>';
    });

    function closeRootModal() {
      rootDetailModal.classList.add('hidden');
      rootDetailModal.setAttribute('aria-hidden', 'true');
    }

    rootDetailModalCloseBtn.addEventListener('click', closeRootModal);
    rootDetailModal.addEventListener('click', (event) => {
      if (event.target === rootDetailModal) {
        closeRootModal();
      }
    });
  }

  async function refreshManagedTests() {
    const params = new URLSearchParams();
    if (filterQ.value.trim()) {
      params.set('q', filterQ.value.trim());
    }
    if (filterStatus.value) {
      params.set('status', filterStatus.value);
    }
    const qs = params.toString();
    const data = await api(`/api/admin/custom-tests/management${qs ? `?${qs}` : ''}`);
    managedItems = data.items;
    const visibleIdSet = new Set(managedItems.map((item) => item.id));
    [...selectedManagedTestIds].forEach((id) => {
      if (!visibleIdSet.has(id)) {
        selectedManagedTestIds.delete(id);
      }
    });
    renderManagedTests(managedTestsList, managedTestsEmpty, managedItems, catalog, selectedManagedTestIds);
    syncManagedSelectionUI();
  }

  filterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await refreshManagedTests();
  });

  resetFilterBtn.addEventListener('click', async () => {
    filterQ.value = '';
    filterStatus.value = '';
    await refreshManagedTests();
  });

  managedTestsList.addEventListener('change', (event) => {
    const target = event.target.closest('[data-role="select-test"]');
    if (!target) {
      return;
    }
    const customTestId = Number(target.value);
    if (!Number.isFinite(customTestId)) {
      return;
    }
    if (target.checked) {
      selectedManagedTestIds.add(customTestId);
    } else {
      selectedManagedTestIds.delete(customTestId);
    }
    syncManagedSelectionUI();
  });

  managedTestsList.addEventListener('click', async (event) => {
    const linkBtn = event.target.closest('[data-role="generate-link"]');
    if (!linkBtn) {
      return;
    }
    const testId = Number(linkBtn.dataset.id || '0');
    if (!testId) {
      return;
    }
    const originalText = linkBtn.textContent;
    linkBtn.disabled = true;
    linkBtn.textContent = '생성 중...';
    try {
      const data = await api(`/api/admin/custom-tests/${testId}/access-link`, {
        method: 'POST'
      });
      const fullUrl = `${window.location.origin}${data.assessment_url}`;
      const copied = await copyTextToClipboard(fullUrl);
      if (copied) {
        showAdminToast('URL 주소가 복사되었습니다.', 'success');
      } else {
        showAdminToast('URL 복사에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (error) {
      showAdminToast(error.message || 'URL 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      linkBtn.disabled = false;
      linkBtn.textContent = originalText;
    }
  });

  manageSelectAll.addEventListener('change', () => {
    if (manageSelectAll.checked) {
      managedItems.forEach((item) => selectedManagedTestIds.add(item.id));
    } else {
      managedItems.forEach((item) => selectedManagedTestIds.delete(item.id));
    }
    renderManagedTests(managedTestsList, managedTestsEmpty, managedItems, catalog, selectedManagedTestIds);
    syncManagedSelectionUI();
  });

  deleteSelectedTestsBtn.addEventListener('click', async () => {
    const ids = [...selectedManagedTestIds];
    if (!ids.length) {
      return;
    }
    const ok = window.confirm(`선택한 검사 ${ids.length}건을 삭제하시겠습니까?`);
    if (!ok) {
      return;
    }
    await api('/api/admin/custom-tests/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ custom_test_ids: ids })
    });
    selectedManagedTestIds.clear();
    await refreshManagedTests();
  });

  function openCreateModal() {
    message.textContent = '';
    message.className = 'message';
    renderCustomFieldEditors();
    createTestModal.classList.remove('hidden');
    createTestModal.setAttribute('aria-hidden', 'false');
  }

  function closeCreateModal() {
    message.textContent = '';
    message.className = 'message';
    createTestModal.classList.add('hidden');
    createTestModal.setAttribute('aria-hidden', 'true');
  }

  toggleCreateFormBtn.addEventListener('click', openCreateModal);
  closeCreateModalBtn.addEventListener('click', closeCreateModal);
  createTestModal.addEventListener('click', (event) => {
    if (event.target === createTestModal) {
      closeCreateModal();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !createTestModal.classList.contains('hidden')) {
      closeCreateModal();
    }
  });

  catalog = await api('/api/admin/tests/catalog');
  rootDetailModalTestId.innerHTML = '';
  (catalog.tests || []).forEach((test) => {
    const option = document.createElement('option');
    option.value = test.test_id;
    option.textContent = test.test_id;
    rootDetailModalTestId.appendChild(option);
  });
  initRootDetailControls();
  if (!catalog.tests.length) {
    message.textContent = '생성 가능한 parent 검사 데이터가 없습니다.';
    message.className = 'message error';
    createBtn.disabled = true;
  }

  function selectedTestIds() {
    return [...testCheckboxList.querySelectorAll('input[name="selected_test_id"]:checked')].map((el) => el.value);
  }

  function extractAgeText(subTest) {
    try {
      const parsed = JSON.parse(subTest.sub_test_json || '{}');
      return parseEligibilityRange(parsed).text;
    } catch {
      return '';
    }
    return '';
  }

  function shortSubTag(subTest) {
    try {
      const parsed = JSON.parse(subTest.sub_test_json || '{}');
      const ageRange = parsed?.age_range;
      const schoolAgeRange = parsed?.school_age_range;
      const range = ageRange && typeof ageRange === 'object'
        ? ageRange
        : (schoolAgeRange && typeof schoolAgeRange === 'object' ? schoolAgeRange : null);
      const start = Array.isArray(range?.start_inclusive) ? Number(range.start_inclusive[0]) : null;
      const endExclusive = Array.isArray(range?.end_exclusive) ? Number(range.end_exclusive[0]) : null;
      if (Number.isFinite(start) && Number.isFinite(endExclusive)) {
        if (endExclusive >= 100) {
          return ageRange ? `${start}세+` : `${schoolAgeLabelFromIndex(start) || `학령${start}`}+`;
        }
        if (!ageRange) {
          const startLabel = schoolAgeLabelFromIndex(start) || `학령${start}`;
          const endLabel = schoolAgeLabelFromIndex(Math.max(start, endExclusive - 1)) || `학령${Math.max(start, endExclusive - 1)}`;
          return `${startLabel}~${endLabel}`;
        }
        return ageRange
          ? `${start}-${Math.max(start, endExclusive - 1)}세`
          : `${start}-${Math.max(start, endExclusive - 1)}세`;
      }
    } catch {
      // pass
    }
    return '서브';
  }

  function collectScaleGroupsForTests(testIds) {
    return testIds
      .map((testId) => {
        const test = catalog.tests.find((it) => it.test_id === testId);
        if (!test || !test.sub_tests?.length) {
          return null;
        }
        const map = new Map();
        test.sub_tests.forEach((subTest, subIdx) => {
          const scales = subTest.scales || [];
          scales.forEach((scale) => {
            const key = `${testId}::${scale.code}`;
            if (!map.has(key)) {
              map.set(key, {
                key,
                test_id: testId,
                code: scale.code,
                name: scale.name,
                sub_products: [],
                age_set: new Set()
              });
            }
            const item = map.get(key);
            item.sub_products.push({
              sub_idx: subIdx,
              sub_test_json: subTest.sub_test_json,
              sub_tag: shortSubTag(subTest)
            });
            const ageText = extractAgeText(subTest);
            item.age_set.add(ageText || '연령 정보 없음');
          });
        });
        const scales = [...map.values()]
          .sort((a, b) => String(a.code).localeCompare(String(b.code)))
          .map((item) => ({
            key: item.key,
            test_id: item.test_id,
            code: item.code,
            sub_products: item.sub_products,
            label: `${item.name} (${item.code}) - ${[...item.age_set].join(', ')}`
          }));
        return { test_id: testId, scales };
      })
      .filter(Boolean);
  }

  function collectScalesForTests(testIds) {
    return collectScaleGroupsForTests(testIds).flatMap((group) => group.scales);
  }

  function snapshotScaleTreeState() {
    const state = new Map();
    [...scaleListEl.querySelectorAll('[data-role="scale-test-group"]')].forEach((groupEl) => {
      const testId = String(groupEl.dataset.testId || '');
      if (!testId) {
        return;
      }
      const testToggle = groupEl.querySelector('input[data-role="select_test_scale_all"]');
      const scaleChecks = [...groupEl.querySelectorAll('input[name="selected_scale_key"]')];
      state.set(testId, {
        allSelected: testToggle instanceof HTMLInputElement ? testToggle.checked : false,
        expanded: !groupEl.querySelector('[data-role="scale-test-children"]')?.classList.contains('hidden'),
        selectedKeys: new Set(
          scaleChecks
            .filter((el) => el instanceof HTMLInputElement && el.checked)
            .map((el) => el.value)
        )
      });
    });
    return state;
  }

  function applyScaleGroupState(groupEl) {
    const testToggle = groupEl.querySelector('input[data-role="select_test_scale_all"]');
    const childrenWrap = groupEl.querySelector('[data-role="scale-test-children"]');
    const toggleIcon = groupEl.querySelector('[data-role="toggle_test_scale_children"]');
    const childChecks = [...groupEl.querySelectorAll('input[name="selected_scale_key"]')];
    const isAllSelected = testToggle instanceof HTMLInputElement ? testToggle.checked : false;
    if (!(childrenWrap instanceof HTMLElement)) {
      return;
    }
    function setArrowByHidden(hidden) {
      if (!(toggleIcon instanceof HTMLElement)) {
        return;
      }
      toggleIcon.textContent = hidden ? '▲' : '▼';
      toggleIcon.setAttribute('aria-expanded', String(!hidden));
      toggleIcon.setAttribute('aria-label', hidden ? '척도 펼치기' : '척도 숨기기');
      toggleIcon.setAttribute('title', hidden ? '척도 펼치기' : '척도 숨기기');
    }
    groupEl.classList.toggle('is-all-selected', isAllSelected);
    if (isAllSelected) {
      childChecks.forEach((el) => {
        if (el instanceof HTMLInputElement) {
          el.checked = true;
          el.disabled = true;
        }
      });
      childrenWrap.classList.add('hidden');
      setArrowByHidden(true);
      return;
    }
    childChecks.forEach((el) => {
      if (el instanceof HTMLInputElement) {
        el.disabled = false;
      }
    });
    setArrowByHidden(childrenWrap.classList.contains('hidden'));
  }

  function renderScaleTreeForSelectedTests() {
    const previousState = snapshotScaleTreeState();
    const scaleGroups = collectScaleGroupsForTests(selectedTestIds());
    scaleListEl.innerHTML = '';
    if (!scaleGroups.length) {
      const empty = document.createElement('div');
      empty.className = 'info-box';
      empty.textContent = '먼저 검사 선택에서 검사 항목을 체크해주세요.';
      scaleListEl.appendChild(empty);
      return;
    }
    scaleGroups.forEach((group) => {
      const prev = previousState.get(group.test_id);
      const allScaleKeys = group.scales.map((scale) => scale.key);
      const selectedKeys = prev?.selectedKeys?.size ? prev.selectedKeys : new Set(allScaleKeys);
      const allSelected = typeof prev?.allSelected === 'boolean' ? prev.allSelected : true;
      const isExpanded = typeof prev?.expanded === 'boolean' ? prev.expanded : !allSelected;

      const groupEl = document.createElement('section');
      groupEl.className = 'test-scale-group';
      groupEl.dataset.role = 'scale-test-group';
      groupEl.dataset.testId = group.test_id;
      const parentToggleId = `scale-all-${String(group.test_id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      groupEl.innerHTML = `
        <div class="test-scale-group-head">
          <div class="check-item test-scale-parent-item">
            <label class="test-scale-parent-main" for="${parentToggleId}">
              <input id="${parentToggleId}" type="checkbox" data-role="select_test_scale_all" ${allSelected ? 'checked' : ''} />
              <span class="test-scale-parent-text"><strong>${escapeHtml(group.test_id)}</strong> 전체 척도 선택</span>
            </label>
            <span class="test-scale-toggle-icon" data-role="toggle_test_scale_children" aria-expanded="${String(isExpanded)}" aria-label="${isExpanded ? '척도 숨기기' : '척도 펼치기'}" title="${isExpanded ? '척도 숨기기' : '척도 펼치기'}">${isExpanded ? '▼' : '▲'}</span>
          </div>
        </div>
        <div class="test-scale-children${isExpanded ? '' : ' hidden'}" data-role="scale-test-children"></div>
      `;
      const childrenWrap = groupEl.querySelector('[data-role="scale-test-children"]');
      if (childrenWrap instanceof HTMLElement) {
        group.scales.forEach((scale) => {
          const checked = allSelected || selectedKeys.has(scale.key);
          const label = document.createElement('label');
          label.className = 'check-item check-item-scale-child';
          label.innerHTML = `
            <input type="checkbox" name="selected_scale_key" value="${scale.key}" ${checked ? 'checked' : ''} />
            <span>${escapeHtml(scale.label)}</span>
          `;
          childrenWrap.appendChild(label);
        });
      }
      applyScaleGroupState(groupEl);
      scaleListEl.appendChild(groupEl);
    });
  }

  function renderTestCheckboxes() {
    testCheckboxList.innerHTML = '';
    catalog.tests.forEach((test) => {
      const label = document.createElement('label');
      label.className = 'check-item';
      label.innerHTML = `
        <input type="checkbox" name="selected_test_id" value="${test.test_id}" />
        <span>${test.test_id}</span>
      `;
      testCheckboxList.appendChild(label);
    });

    testCheckboxList.addEventListener('change', () => {
      renderScaleTreeForSelectedTests();
    });
  }

  scaleListEl.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const groupEl = target.closest('[data-role="scale-test-group"]');
    if (!(groupEl instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.role === 'select_test_scale_all') {
      const childrenWrap = groupEl.querySelector('[data-role="scale-test-children"]');
      if (target.checked) {
        childrenWrap?.classList.add('hidden');
      } else {
        childrenWrap?.classList.remove('hidden');
      }
      applyScaleGroupState(groupEl);
    }
  });

  scaleListEl.addEventListener('click', (event) => {
    const toggleIcon = event.target.closest('[data-role="toggle_test_scale_children"]');
    if (!(toggleIcon instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const groupEl = toggleIcon.closest('[data-role="scale-test-group"]');
    if (!(groupEl instanceof HTMLElement)) {
      return;
    }
    const childrenWrap = groupEl.querySelector('[data-role="scale-test-children"]');
    if (!(childrenWrap instanceof HTMLElement)) {
      return;
    }
    const isHidden = childrenWrap.classList.toggle('hidden');
    toggleIcon.textContent = isHidden ? '▲' : '▼';
    toggleIcon.setAttribute('aria-expanded', String(!isHidden));
    toggleIcon.setAttribute('aria-label', isHidden ? '척도 펼치기' : '척도 숨기기');
    toggleIcon.setAttribute('title', isHidden ? '척도 펼치기' : '척도 숨기기');
  });

  scaleListEl.addEventListener('mousedown', (event) => {
    const toggleIcon = event.target.closest('[data-role="toggle_test_scale_children"]');
    if (!(toggleIcon instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
  });

  function createDefaultFieldState() {
    return {
      local_id: `f_${customFieldSeq++}`,
      label: '',
      type: 'short_text',
      required: false,
      placeholder: '',
      options: ['']
    };
  }

  function fieldTypeLabel(fieldType) {
    const map = {
      short_text: '짧은 텍스트',
      long_text: '긴 텍스트',
      number: '숫자',
      date: '날짜',
      select: '단일 선택',
      multi_select: '다중 선택',
      phone: '전화번호',
      email: '이메일'
    };
    return map[fieldType] || fieldType;
  }

  function fieldTypeGuide(fieldType) {
    const map = {
      short_text: '한 줄 텍스트 입력에 사용합니다. (예: 직업)',
      long_text: '긴 서술형 입력에 사용합니다. (예: 특이사항)',
      number: '숫자만 입력받습니다. (예: 형제 수)',
      date: '날짜를 선택합니다. (예: 사건 발생일)',
      select: '옵션 중 하나만 선택합니다.',
      multi_select: '옵션을 여러 개 선택할 수 있습니다.',
      phone: '전화번호 입력란으로 사용합니다.',
      email: '이메일 형식 입력란으로 사용합니다.'
    };
    return map[fieldType] || '';
  }

  function isOptionType(fieldType) {
    return fieldType === 'select' || fieldType === 'multi_select';
  }

  function renderOptionListEditor(field) {
    const optionsHtml = (field.options || []).map((opt, idx) => `
      <div class="custom-field-option-row">
        <input type="text" data-role="field-option" data-id="${field.local_id}" data-option-idx="${idx}" value="${escapeHtml(opt || '')}" placeholder="옵션 값" />
        <button type="button" class="outline-btn uniform-btn" data-role="remove-field-option" data-id="${field.local_id}" data-option-idx="${idx}">삭제</button>
      </div>
    `).join('');

    return `
      <div class="custom-field-row custom-field-row-options ${isOptionType(field.type) ? '' : 'hidden'}" data-role="field-options-wrap" data-id="${field.local_id}">
        <div class="custom-field-options">
        <p class="mini-help">입력 타입이 단일/다중 선택일 때만 옵션을 설정합니다.</p>
        <div class="custom-field-option-list">
          ${optionsHtml}
        </div>
        <button type="button" class="outline-btn uniform-btn" data-role="add-field-option" data-id="${field.local_id}">옵션 추가</button>
        </div>
      </div>
    `;
  }

  function renderCustomFieldEditor(field, index) {
    return `
      <article class="custom-field-card" data-role="custom-field-card" data-id="${field.local_id}">
        <div class="custom-field-card-head">
          <strong>추가 항목 ${index + 1}</strong>
          <button type="button" class="outline-btn uniform-btn danger-outline" data-role="remove-custom-field" data-id="${field.local_id}">항목 삭제</button>
        </div>
        <div class="custom-field-layout">
          <div class="custom-field-row custom-field-row-basic">
            <div class="custom-field-control">
            <label class="custom-field-label">항목명</label>
            <input type="text" data-role="field-label" data-id="${field.local_id}" maxlength="60" value="${escapeHtml(field.label)}" placeholder="예: 보호자 관계" />
            </div>
            <div class="custom-field-control">
            <label class="custom-field-label">입력 타입</label>
            <select data-role="field-type" data-id="${field.local_id}">
              ${['short_text', 'long_text', 'number', 'date', 'select', 'multi_select', 'phone', 'email']
                .map((type) => `<option value="${type}" ${field.type === type ? 'selected' : ''}>${fieldTypeLabel(type)}</option>`)
                .join('')}
            </select>
            </div>
          </div>
          <div class="custom-field-row custom-field-row-type-guide">
            <p class="mini-help custom-field-type-guide">${fieldTypeGuide(field.type)}</p>
          </div>
          <div class="custom-field-row custom-field-row-help">
            <div class="custom-field-control">
            <label class="custom-field-label">안내 문구 (선택)</label>
            <input type="text" data-role="field-placeholder" data-id="${field.local_id}" maxlength="120" value="${escapeHtml(field.placeholder)}" placeholder="예: 보호자와의 관계를 선택하세요" />
            </div>
          </div>
          <div class="custom-field-row custom-field-row-required">
            <label class="custom-required-inline">
            <input type="checkbox" data-role="field-required" data-id="${field.local_id}" ${field.required ? 'checked' : ''} />
            <span>필수 입력</span>
            </label>
          </div>
        </div>
        ${renderOptionListEditor(field)}
      </article>
    `;
  }

  function renderCustomFieldEditors() {
    if (!customFields.length) {
      customFieldList.innerHTML = '<div class="info-box">추가 인적사항이 없습니다. 필요한 경우에만 항목을 만들어 사용하세요.</div>';
      return;
    }
    customFieldList.innerHTML = customFields.map((field, idx) => renderCustomFieldEditor(field, idx)).join('');
  }

  function sanitizeAndValidateCustomFields() {
    const cleaned = [];
    const seen = new Set();
    for (const field of customFields) {
      const label = String(field.label || '').trim();
      if (!label) {
        throw new Error('추가 인적사항 항목명은 비워둘 수 없습니다.');
      }
      if (label.length > 60) {
        throw new Error(`"${label}" 항목명은 60자 이내여야 합니다.`);
      }
      const key = label.toLowerCase();
      if (seen.has(key)) {
        throw new Error(`추가 인적사항 항목명 "${label}" 이(가) 중복됩니다.`);
      }
      seen.add(key);

      const type = String(field.type || 'short_text');
      const required = Boolean(field.required);
      const placeholder = String(field.placeholder || '').trim();
      const options = (field.options || [])
        .map((opt) => String(opt || '').trim())
        .filter(Boolean);
      const uniqOptions = [...new Set(options.map((x) => x.toLowerCase()))]
        .map((x) => options.find((opt) => opt.toLowerCase() === x))
        .filter(Boolean);

      if (isOptionType(type) && uniqOptions.length === 0) {
        throw new Error(`"${label}" 항목은 선택지를 최소 1개 이상 입력해야 합니다.`);
      }

      cleaned.push({
        label,
        type,
        required,
        placeholder,
        options: isOptionType(type) ? uniqOptions : []
      });
    }
    return cleaned;
  }

  addCustomFieldBtn.addEventListener('click', () => {
    customFields.push(createDefaultFieldState());
    renderCustomFieldEditors();
  });

  customFieldList.addEventListener('input', (event) => {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) {
      return;
    }
    const field = customFields.find((f) => f.local_id === id);
    if (!field) {
      return;
    }
    if (target.dataset.role === 'field-label') {
      field.label = target.value;
      return;
    }
    if (target.dataset.role === 'field-placeholder') {
      field.placeholder = target.value;
      return;
    }
    if (target.dataset.role === 'field-option') {
      const optIdx = Number(target.dataset.optionIdx);
      if (Number.isInteger(optIdx) && optIdx >= 0) {
        field.options[optIdx] = target.value;
      }
    }
  });

  customFieldList.addEventListener('change', (event) => {
    const target = event.target;
    const id = target.dataset.id;
    if (!id) {
      return;
    }
    const field = customFields.find((f) => f.local_id === id);
    if (!field) {
      return;
    }
    if (target.dataset.role === 'field-type') {
      field.type = target.value;
      if (isOptionType(field.type)) {
        if (!field.options || !field.options.length) {
          field.options = [''];
        }
      } else {
        field.options = [];
      }
      renderCustomFieldEditors();
      return;
    }
    if (target.dataset.role === 'field-required') {
      field.required = target.checked;
    }
  });

  customFieldList.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-role]');
    if (!btn) {
      return;
    }
    const id = btn.dataset.id;
    if (!id) {
      return;
    }
    const field = customFields.find((f) => f.local_id === id);
    if (!field) {
      return;
    }
    if (btn.dataset.role === 'remove-custom-field') {
      customFields = customFields.filter((f) => f.local_id !== id);
      renderCustomFieldEditors();
      return;
    }
    if (btn.dataset.role === 'add-field-option') {
      field.options = [...(field.options || []), ''];
      renderCustomFieldEditors();
      return;
    }
    if (btn.dataset.role === 'remove-field-option') {
      const optIdx = Number(btn.dataset.optionIdx);
      if (Number.isInteger(optIdx) && optIdx >= 0) {
        field.options = (field.options || []).filter((_, idx) => idx !== optIdx);
        if (field.options.length === 0) {
          field.options = [''];
        }
        renderCustomFieldEditors();
      }
    }
  });

  renderTestCheckboxes();
  renderScaleTreeForSelectedTests();
  renderCustomFieldEditors();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    const selectedTests = selectedTestIds();
    if (!selectedTests.length) {
      message.textContent = '최소 1개 이상의 검사를 선택해주세요.';
      message.className = 'message error';
      return;
    }

    const selectedScaleKeys = [...form.querySelectorAll('input[name="selected_scale_key"]:checked')].map((n) => n.value);
    if (!selectedScaleKeys.length) {
      message.textContent = '최소 1개 이상의 척도를 선택해주세요.';
      message.className = 'message error';
      return;
    }
    const scalePool = collectScalesForTests(selectedTests);
    const scaleMap = new Map(scalePool.map((s) => [s.key, s]));

    const baseName = form.custom_test_name.value.trim();
    if (!baseName) {
      message.textContent = '검사 이름을 입력해주세요.';
      message.className = 'message error';
      return;
    }

    let normalizedCustomFields = [];
    try {
      normalizedCustomFields = sanitizeAndValidateCustomFields();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'message error';
      return;
    }

    createBtn.disabled = true;
    createBtn.textContent = '생성 중...';
    try {
      const test_configs = selectedTests
        .map((testId) => {
          const selectedScales = selectedScaleKeys
            .map((key) => scaleMap.get(key))
            .filter((item) => item && item.test_id === testId);
          const selectedCodes = [...new Set(selectedScales.map((item) => item.code))];
          return {
            test_id: testId,
            selected_scale_codes: selectedCodes
          };
        })
        .filter((config) => config.selected_scale_codes.length > 0);

      if (!test_configs.length) {
        throw new Error('검사별로 최소 1개 이상의 척도를 선택해주세요.');
      }

      await api('/api/admin/custom-tests', {
        method: 'POST',
        body: JSON.stringify({
          custom_test_name: baseName,
          test_configs,
          additional_profile_fields: normalizedCustomFields
        })
      });

      createBtn.disabled = false;
      createBtn.textContent = '생성';
      form.reset();
      scaleListEl.innerHTML = '';
      customFields = [];
      renderCustomFieldEditors();
      closeCreateModal();
      await refreshManagedTests();
    } catch (error) {
      message.textContent = error.message;
      message.className = 'message error';
      createBtn.disabled = false;
      createBtn.textContent = '생성';
    }
  });

  await refreshManagedTests();
}

async function initClientDetailPage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/admin/clients';
    return;
  }

  const form = document.getElementById('clientDetailForm');
  const nameInput = document.getElementById('detail_client_name');
  const genderInput = document.getElementById('detail_client_gender');
  const birthDayInput = document.getElementById('detail_client_birth_day');
  const assignedTestInput = document.getElementById('detail_client_assigned_test');
  const memoInput = document.getElementById('detail_client_memo');
  const saveBtn = document.getElementById('clientDetailSaveBtn');
  const detailMeta = document.getElementById('clientDetailMeta');
  const statusEl = document.getElementById('clientDetailStatus');
  const lastAssessedOnEl = document.getElementById('clientDetailLastAssessedOn');
  const logCountEl = document.getElementById('clientDetailLogCount');
  const logListEl = document.getElementById('clientDetailLogList');
  const logEmptyEl = document.getElementById('clientDetailLogEmpty');
  const parentResultsListEl = document.getElementById('clientParentResultsList');
  const parentResultsEmptyEl = document.getElementById('clientParentResultsEmpty');
  const openClientResultViewerBtn = document.getElementById('openClientResultViewerBtn');
  const msg = document.getElementById('clientDetailMessage');
  const detailFormPaneEl = document.querySelector('.client-detail-form-pane');
  const detailStatusPaneEl = document.querySelector('.client-detail-status-pane');

  msg.textContent = '';
  msg.className = 'message';
  let assignedCustomTestId = null;
  let parentReportItems = [];

  const syncClientDetailPaneHeights = () => {
    if (!(detailFormPaneEl instanceof HTMLElement) || !(detailStatusPaneEl instanceof HTMLElement)) {
      return;
    }
    detailFormPaneEl.style.height = '';
    detailStatusPaneEl.style.height = '';
    if (window.innerWidth <= 900) {
      return;
    }
    const nextHeight = Math.max(detailFormPaneEl.offsetHeight, detailStatusPaneEl.offsetHeight);
    if (nextHeight > 0) {
      detailFormPaneEl.style.height = `${nextHeight}px`;
      detailStatusPaneEl.style.height = `${nextHeight}px`;
    }
  };

  const toText = (value, fallback = '') => {
    const raw = String(value ?? '').trim();
    return raw || fallback;
  };

  const toCount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const resolveParentReportUrl = (parentTestName) => {
    const normalized = toText(parentTestName).toUpperCase();
    if (normalized === 'GOLDEN') {
      return `/admin/artifact-viewer?report=GOLDEN&id=${encodeURIComponent(String(id))}`;
    }
    if (normalized === 'STS') {
      return `/admin/artifact-viewer?report=STS&id=${encodeURIComponent(String(id))}`;
    }
    return '';
  };

  const parseScoreNumber = (raw) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    const text = String(raw ?? '').trim();
    if (!text) {
      return null;
    }
    const matched = text.match(/-?\d+(\.\d+)?/);
    if (!matched) {
      return null;
    }
    const num = Number(matched[0]);
    return Number.isFinite(num) ? num : null;
  };

  const buildPendingScale = () => ({
    scale_key: '__pending__',
    scale_code: '-',
    scale_name: '결과 준비중',
    score_text: '-',
    level_text: '-',
    note: '채점 모듈이 연결되면 척도별 결과가 표시됩니다.',
    score_number: null,
    is_placeholder: true,
  });

  const normalizeScaleItems = (rawScales) => {
    const rows = Array.isArray(rawScales) ? rawScales : [];
    const normalized = rows.map((row, idx) => {
      const code = toText(row?.scale_code ?? row?.code, `S${idx + 1}`);
      const name = toText(row?.scale_name ?? row?.name, '척도');
      const scoreSource = row?.score_text ?? row?.score ?? row?.raw_score ?? row?.t_score ?? '-';
      const levelSource = row?.level_text ?? row?.level ?? row?.risk_level ?? '-';
      return {
        scale_key: toText(row?.scale_key ?? row?.key, `${code}-${idx + 1}`),
        scale_code: code,
        scale_name: name,
        score_text: String(scoreSource ?? '-'),
        level_text: String(levelSource ?? '-'),
        note: toText(row?.note ?? row?.description, ''),
        score_number: parseScoreNumber(scoreSource),
        is_placeholder: false,
      };
    });
    return normalized.length ? normalized : [buildPendingScale()];
  };

  const buildParentResultItems = (item, logs) => {
    const candidateRows = [
      item.parent_test_results,
      item.parent_results,
      item.custom_test_results,
    ];
    const backendRows = candidateRows.find((rows) => Array.isArray(rows) && rows.length) || [];
    if (backendRows.length) {
      return backendRows.map((row, idx) => {
        const customTests = Array.isArray(row?.custom_test_names)
          ? row.custom_test_names.map((v) => toText(v)).filter(Boolean)
          : (toText(row?.custom_test_name ?? row?.test_name) ? [toText(row?.custom_test_name ?? row?.test_name)] : []);
        return {
          id: toText(row?.id, `parent-${idx + 1}`),
          parent_test_name: toText(row?.parent_test_name ?? row?.parent_test_id ?? row?.test_id, '기반 검사'),
          performed_count: toCount(row?.performed_count ?? row?.assessment_count ?? row?.count ?? 1),
          last_assessed_on: toText(row?.last_assessed_on ?? row?.latest_assessed_on ?? row?.assessed_on ?? row?.created_at, '-'),
          custom_tests: customTests,
          scales: normalizeScaleItems(row?.scales ?? row?.scale_results),
        };
      });
    }

    if (!logs.length) {
      return [];
    }
    return [{
      id: 'parent-fallback',
      parent_test_name: toText(item.assigned_parent_test_name, '기반 검사 정보 없음'),
      performed_count: logs.length,
      last_assessed_on: toText(item.last_assessed_on, logs[0]?.assessed_on || '-'),
      custom_tests: toText(item.assigned_custom_test_name) ? [toText(item.assigned_custom_test_name)] : [],
      scales: [buildPendingScale()],
    }];
  };

  const renderParentResults = (rows) => {
    if (!parentResultsListEl || !parentResultsEmptyEl) {
      return;
    }
    parentResultsListEl.innerHTML = '';
    if (!rows.length) {
      parentResultsEmptyEl.classList.remove('hidden');
      return;
    }
    parentResultsEmptyEl.classList.add('hidden');

    rows.forEach((row) => {
      const customTestsText = row.custom_tests.length ? row.custom_tests.join(', ') : '-';
      const parentTestCode = toText(row.parent_test_name).toUpperCase();
      const parentReportUrl = resolveParentReportUrl(parentTestCode);
      const shortcutDisabledAttr = parentReportUrl ? '' : 'disabled';

      const li = document.createElement('li');
      li.className = 'row-item parent-result-item';
      li.innerHTML = `
        <div class="parent-result-row-grid">
          <strong class="parent-result-name">${escapeHtml(row.parent_test_name)}</strong>
          <span class="parent-result-cell">${escapeHtml(row.last_assessed_on || '-')}</span>
          <span class="parent-result-cell">${escapeHtml(customTestsText)}</span>
          <span class="parent-result-cell">${escapeHtml(String(row.scales.length || 0))}개</span>
          <div class="row-actions parent-result-actions">
            <button type="button" class="outline-btn uniform-btn" data-role="open-parent-report-link" data-parent-test="${escapeHtml(parentTestCode)}" ${shortcutDisabledAttr}>결과 보기</button>
          </div>
        </div>
      `;
      parentResultsListEl.appendChild(li);
    });
  };

  if (parentResultsListEl) {
    parentResultsListEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const shortcutButton = target.closest('[data-role="open-parent-report-link"]');
      if (shortcutButton instanceof HTMLElement) {
        const parentTestName = shortcutButton.dataset.parentTest || '';
        const reportUrl = resolveParentReportUrl(parentTestName);
        if (!reportUrl) {
          msg.textContent = '해당 parent 검사 바로가기 페이지가 아직 준비되지 않았습니다.';
          msg.className = 'message error';
          return;
        }
        const separator = reportUrl.includes('?') ? '&' : '?';
        const cacheBustedUrl = `${reportUrl}${separator}v=${Date.now()}`;
        const link = document.createElement('a');
        link.href = cacheBustedUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
        return;
      }
    });
  }

  if (openClientResultViewerBtn) {
    openClientResultViewerBtn.addEventListener('click', () => {
      const nextUrl = `/admin/client-result?id=${encodeURIComponent(id)}&v=${Date.now()}`;
      const link = document.createElement('a');
      link.href = nextUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    });
  }

  const renderDetail = (item) => {
    nameInput.value = item.name || '';
    genderInput.value = item.gender === 'male' || item.gender === 'female' ? item.gender : '';
    birthDayInput.value = item.birth_day || '';
    if (item.assigned_custom_test_name) {
      assignedTestInput.value = item.assigned_parent_test_name
        ? `${item.assigned_custom_test_name} (기반: ${item.assigned_parent_test_name})`
        : item.assigned_custom_test_name;
    } else {
      assignedTestInput.value = '미배정';
    }
    memoInput.value = item.memo || '';

    detailMeta.textContent = `등록일: ${toKstString(item.created_at || '')} | 최근 수정: ${toKstString(item.updated_at || '')}`;
    statusEl.textContent = item.status || '-';
    lastAssessedOnEl.textContent = item.last_assessed_on || '-';
    logCountEl.textContent = `${Number(item.assessment_log_count) || 0}건`;

    const logs = Array.isArray(item.assessment_logs) ? item.assessment_logs : [];
    logListEl.innerHTML = '';
    if (!logs.length) {
      logEmptyEl.classList.remove('hidden');
    } else {
      logEmptyEl.classList.add('hidden');
      logs.forEach((log) => {
        const li = document.createElement('li');
        li.className = 'row-item';
        const customTestName = toText(log.custom_test_name, '커스텀 검사');
        const parentTestName = toText(log.parent_test_name, '');
        const summaryText = parentTestName
          ? `${customTestName} (기반: ${parentTestName})`
          : customTestName;
	        li.innerHTML = `
	          <div class="row-grid client-log-row-grid">
	            <div class="row-col main-col"><strong>${summaryText}</strong></div>
	            <div class="row-col date-col">${log.assessed_on || '-'}</div>
	          </div>
	        `;
        logListEl.appendChild(li);
      });
    }

	    parentReportItems = buildParentResultItems(item, logs);
	    renderParentResults(parentReportItems);
      syncClientDetailPaneHeights();
	  };

  const loadClientDetail = async () => {
    const detail = await api(`/api/admin/clients/${id}`);
    const item = detail.item || {};
    assignedCustomTestId = item.assigned_custom_test_id ?? null;
    renderDetail(item);
  };

	  try {
	    await loadClientDetail();
	  } catch (error) {
    msg.textContent = error.message;
    msg.className = 'message error';
    return;
  }

	  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    msg.textContent = '';
    msg.className = 'message';

    const payload = {
      name: nameInput.value.trim(),
      gender: genderInput.value,
      birth_day: birthDayInput.value || null,
      memo: memoInput.value.trim(),
      admin_custom_test_id: assignedCustomTestId
    };

    if (!payload.name || !payload.gender) {
      msg.textContent = '이름과 성별은 필수입니다.';
      msg.className = 'message error';
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
    }

    try {
      await api(`/api/admin/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await loadClientDetail();
      msg.textContent = '내담자 정보가 저장되었습니다.';
      msg.className = 'message';
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'message error';
	    } finally {
	      if (saveBtn) {
	        saveBtn.disabled = false;
	      }
        syncClientDetailPaneHeights();
	    }
	  });

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(() => {
      syncClientDetailPaneHeights();
    });
    if (detailFormPaneEl) {
      resizeObserver.observe(detailFormPaneEl);
    }
    if (detailStatusPaneEl) {
      resizeObserver.observe(detailStatusPaneEl);
    }
  }
  window.addEventListener('resize', syncClientDetailPaneHeights);
  syncClientDetailPaneHeights();
}

async function initClientResultPage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/admin/clients';
    return;
  }

  const backToClientDetailBtn = document.getElementById('backToClientDetailBtn');
  if (backToClientDetailBtn) {
    backToClientDetailBtn.href = `/admin/client-detail?id=${encodeURIComponent(id)}`;
  }

  const resultClientNameEl = document.getElementById('resultClientName');
  const resultClientIdentityEl = document.getElementById('resultClientIdentity');
  const resultClientLastAssessedOnEl = document.getElementById('resultClientLastAssessedOn');
  const resultClientSelectedTestEl = document.getElementById('resultClientSelectedTest');
  const resultClientTestMetaEl = document.getElementById('resultClientTestMeta');
  const resultClientStatusEl = document.getElementById('resultClientStatus');
  const scaleTreeEl = document.getElementById('clientResultScaleTree');
  const scaleTreeEmptyEl = document.getElementById('clientResultScaleTreeEmpty');
  const scaleTreeMetaEl = document.getElementById('clientResultScaleTreeMeta');
  const treePanelEl = document.querySelector('.client-result-tree-panel');
  const detailPanelEl = document.querySelector('.client-result-detail-panel');
  const selectAllScalesBtn = document.getElementById('clientResultSelectAllScalesBtn');
  const clearScalesBtn = document.getElementById('clientResultClearScalesBtn');
  const selectedTestTitleEl = document.getElementById('clientResultSelectedTestTitle');
  const selectedTestMetaEl = document.getElementById('clientResultSelectedTestMeta');
  const selectedScaleSummaryEl = document.getElementById('clientResultSelectedScaleSummary');
  const scaleFilterLegendEl = document.getElementById('clientResultScaleFilterLegend');
  const barChartEl = document.getElementById('clientResultBarChart');
  const profileChartEl = document.getElementById('clientResultProfileChart');
  const detailEmptyEl = document.getElementById('clientResultDetailEmpty');
  const pageMessageEl = document.getElementById('clientResultPageMessage');

  const syncClientResultPanelHeights = () => {
    if (!treePanelEl || !detailPanelEl) {
      return;
    }
    if (window.innerWidth <= 900) {
      treePanelEl.style.height = '';
      return;
    }
    treePanelEl.style.height = '';
    const target = detailPanelEl.offsetHeight;
    if (target > 0) {
      treePanelEl.style.height = `${target}px`;
    }
  };

  const toText = (value, fallback = '') => {
    const raw = String(value ?? '').trim();
    return raw || fallback;
  };

  const parseScoreNumber = (raw) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    const text = String(raw ?? '').trim();
    if (!text) {
      return null;
    }
    const matched = text.match(/-?\d+(\.\d+)?/);
    if (!matched) {
      return null;
    }
    const num = Number(matched[0]);
    return Number.isFinite(num) ? num : null;
  };

  const toSortTimestamp = (value) => {
    const text = String(value ?? '').trim();
    if (!text || text === '-') {
      return 0;
    }
    const normalized = text.length === 10 ? `${text}T00:00:00` : text;
    const ts = Date.parse(normalized);
    return Number.isFinite(ts) ? ts : 0;
  };

  const parentThemePaletteMap = {
    GOLDEN: {
      accent: '#a76a24',
      accentStrong: '#7d4d16',
      soft: '#fff1dc',
      softAlt: '#fff8ee',
      border: '#e0bb87',
      childBg: '#fffaf2',
      childHover: '#fff2dc',
      childActive: '#ffe5bc',
      text: '#6f4312',
      line: '#d4ae76',
    },
    STS: {
      accent: '#2b7d68',
      accentStrong: '#195e4d',
      soft: '#def5ee',
      softAlt: '#f1fbf8',
      border: '#92cebf',
      childBg: '#f3fbf8',
      childHover: '#e4f6f0',
      childActive: '#d4efe6',
      text: '#1a5447',
      line: '#79b9aa',
    },
    DEFAULT: {
      accent: '#5b89b4',
      accentStrong: '#365d84',
      soft: '#e8f2fd',
      softAlt: '#f6faff',
      border: '#9ebfdf',
      childBg: '#f7fbff',
      childHover: '#eef5fd',
      childActive: '#ddeafb',
      text: '#264a71',
      line: '#9dbddd',
    },
  };

  const getParentThemeKey = (parentName) => {
    const normalized = toText(parentName).toUpperCase();
    if (normalized.includes('GOLDEN')) {
      return 'GOLDEN';
    }
    if (normalized.includes('STS')) {
      return 'STS';
    }
    return 'DEFAULT';
  };

  const applyParentThemeVars = (el, parentName) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    const palette = parentThemePaletteMap[getParentThemeKey(parentName)] || parentThemePaletteMap.DEFAULT;
    el.style.setProperty('--parent-accent', palette.accent);
    el.style.setProperty('--parent-accent-strong', palette.accentStrong);
    el.style.setProperty('--parent-soft', palette.soft);
    el.style.setProperty('--parent-soft-alt', palette.softAlt);
    el.style.setProperty('--parent-border', palette.border);
    el.style.setProperty('--parent-child-bg', palette.childBg);
    el.style.setProperty('--parent-child-hover', palette.childHover);
    el.style.setProperty('--parent-child-active', palette.childActive);
    el.style.setProperty('--parent-text', palette.text);
    el.style.setProperty('--parent-line', palette.line);
  };

  const getParentThemePalette = (parentName) => (
    parentThemePaletteMap[getParentThemeKey(parentName)] || parentThemePaletteMap.DEFAULT
  );

  const parentDisplayOrder = { GOLDEN: 0, STS: 1 };
  let parentScaleOrderIndex = new Map();

  const buildParentScaleOrderIndex = (catalog) => {
    const tests = Array.isArray(catalog?.tests) ? catalog.tests : [];
    const index = new Map();
    tests.forEach((test) => {
      const testId = toText(test?.test_id).toUpperCase();
      if (!testId || index.has(testId)) {
        return;
      }
      const scaleOrder = new Map();
      (Array.isArray(test?.sub_tests) ? test.sub_tests : []).forEach((sub) => {
        (Array.isArray(sub?.scales) ? sub.scales : []).forEach((scale) => {
          const code = toText(scale?.code ?? scale?.scale_code).toUpperCase();
          if (!code || scaleOrder.has(code)) {
            return;
          }
          scaleOrder.set(code, scaleOrder.size);
        });
      });
      index.set(testId, scaleOrder);
    });
    return index;
  };

  const compareScalesByParentStructOrder = (left, right) => {
    const leftParent = toText(left?.parent_test_name, '').toUpperCase();
    const rightParent = toText(right?.parent_test_name, '').toUpperCase();
    const leftParentOrder = Object.prototype.hasOwnProperty.call(parentDisplayOrder, leftParent)
      ? parentDisplayOrder[leftParent]
      : 99;
    const rightParentOrder = Object.prototype.hasOwnProperty.call(parentDisplayOrder, rightParent)
      ? parentDisplayOrder[rightParent]
      : 99;
    if (leftParentOrder !== rightParentOrder) {
      return leftParentOrder - rightParentOrder;
    }
    if (leftParent !== rightParent) {
      return leftParent.localeCompare(rightParent, 'ko');
    }
    const leftCode = toText(left?.scale_code, '').toUpperCase();
    const rightCode = toText(right?.scale_code, '').toUpperCase();
    const scaleOrderMap = parentScaleOrderIndex.get(leftParent);
    const leftOrder = scaleOrderMap?.has(leftCode) ? scaleOrderMap.get(leftCode) : Number.MAX_SAFE_INTEGER;
    const rightOrder = scaleOrderMap?.has(rightCode) ? scaleOrderMap.get(rightCode) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return leftCode.localeCompare(rightCode, 'ko');
  };

  const sortScalesByParentStructOrder = (rows) => [...(Array.isArray(rows) ? rows : [])]
    .sort(compareScalesByParentStructOrder);

  const setMessage = (text, isError = false) => {
    if (!pageMessageEl) {
      return;
    }
    pageMessageEl.textContent = text;
    pageMessageEl.className = isError ? 'message error' : 'message';
  };

  const getGenderLabel = (value) => {
    if (value === 'male') {
      return '남';
    }
    if (value === 'female') {
      return '여';
    }
    return '';
  };

  const buildSelectedScalesFromCustomTest = (catalog, customTestDetail) => {
    const testConfigs = Array.isArray(customTestDetail?.test_configs) ? customTestDetail.test_configs : [];
    if (!testConfigs.length) {
      return [];
    }

    const byVariantScaleName = buildScaleNameIndex(catalog || { tests: [] });
    const byTestScaleName = new Map();
    (catalog?.tests || []).forEach((test) => {
      const testId = String(test.test_id || '').trim();
      if (!testId) {
        return;
      }
      const scaleMap = byTestScaleName.get(testId) || new Map();
      (test.sub_tests || []).forEach((sub) => {
        (sub.scales || []).forEach((scale) => {
          if (!scaleMap.has(scale.code)) {
            scaleMap.set(scale.code, scale.name || scale.code);
          }
        });
      });
      byTestScaleName.set(testId, scaleMap);
    });

    const selected = [];
    const seen = new Set();
    testConfigs.forEach((config) => {
      const testId = String(config?.test_id || '').trim();
      (config?.sub_test_variants || []).forEach((variant) => {
        const subTestJson = typeof variant?.sub_test_json === 'string'
          ? variant.sub_test_json
          : JSON.stringify(variant?.sub_test_json || {});
        const scaleNameMap = byVariantScaleName.get(`${testId}::${subTestJson}`) || new Map();
        const fallbackScaleMap = byTestScaleName.get(testId) || new Map();

        (variant?.selected_scale_codes || []).forEach((codeRaw, idx) => {
          const code = toText(codeRaw);
          if (!code) {
            return;
          }
          const key = `${testId}::${code}`;
          if (seen.has(key)) {
            return;
          }
          seen.add(key);
          selected.push({
            scale_key: `${key}-${idx + 1}`,
            scale_code: code,
            scale_name: toText(scaleNameMap.get(code), toText(fallbackScaleMap.get(code), code)),
            parent_test_name: toText(testId, '-'),
            score_text: '점수 데이터 없음',
            level_text: '채점 전 상태',
            note: '채점 모듈이 연결되면 척도별 결과가 표시됩니다.',
            score_number: null,
            is_placeholder: true,
          });
        });
      });
    });
    return selected;
  };

  const buildPendingScale = () => ({
    scale_key: '__pending__',
    scale_code: '-',
    scale_name: '결과 준비중',
    score_text: '점수 데이터 없음',
    level_text: '채점 전 상태',
    note: '채점 모듈이 연결되면 척도별 결과가 표시됩니다.',
    score_number: null,
    is_placeholder: true,
  });

  const normalizeScaleRows = (rawScales, fallbackScales = []) => {
    const rows = Array.isArray(rawScales) ? rawScales : [];
    const normalized = rows.map((row, idx) => {
      const code = toText(row?.scale_code ?? row?.code, `S${idx + 1}`);
      const name = toText(row?.scale_name ?? row?.name, '척도');
      const scoreSource = row?.score_text ?? row?.score ?? row?.raw_score ?? row?.t_score ?? '-';
      const levelSource = row?.level_text ?? row?.level ?? row?.risk_level ?? '-';
      const scoreText = String(scoreSource ?? '-').trim();
      const levelText = String(levelSource ?? '-').trim();
      return {
        scale_key: toText(row?.scale_key ?? row?.key, `${code}-${idx + 1}`),
        scale_code: code,
        scale_name: name,
        parent_test_name: toText(row?.parent_test_name ?? row?.parent_name ?? row?.parent_test_id ?? row?.test_id, ''),
        score_text: scoreText && scoreText !== '-' ? scoreText : '점수 데이터 없음',
        level_text: levelText && levelText !== '-' ? levelText : '채점 전 상태',
        note: toText(row?.note ?? row?.description, ''),
        score_number: parseScoreNumber(scoreSource),
        is_placeholder: false,
      };
    });
    if (normalized.length) {
      return normalized;
    }
    if (Array.isArray(fallbackScales) && fallbackScales.length) {
      return fallbackScales.map((scale, idx) => ({
        scale_key: toText(scale.scale_key ?? scale.key, `${toText(scale.scale_code ?? scale.code, 'S')}-${idx + 1}`),
        scale_code: toText(scale.scale_code ?? scale.code, `S${idx + 1}`),
        scale_name: toText(scale.scale_name ?? scale.name, '척도'),
        parent_test_name: toText(scale.parent_test_name ?? scale.test_id, ''),
        score_text: '점수 데이터 없음',
        level_text: '채점 전 상태',
        note: toText(scale.note, '채점 모듈이 연결되면 척도별 결과가 표시됩니다.'),
        score_number: null,
        is_placeholder: true,
      }));
    }
    return [buildPendingScale()];
  };

  const extractScaleBadges = (scaleRows) => {
    const rows = Array.isArray(scaleRows) ? scaleRows : [];
    const seen = new Set();
    const badges = [];
    rows.forEach((scale, idx) => {
      const code = toText(scale?.scale_code ?? scale?.code, `S${idx + 1}`);
      const name = toText(scale?.scale_name ?? scale?.name, code);
      const key = toText(scale?.scale_key ?? scale?.key, `${code}-${idx + 1}`);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      badges.push({
        scale_key: key,
        scale_code: code,
        scale_name: name,
      });
    });
    return badges;
  };

  const deriveScaleGroupKey = (scale) => {
    const rawCode = toText(scale?.scale_code ?? scale?.code, '');
    if (!rawCode || rawCode === '-') {
      return '기타';
    }
    const token = rawCode.split(/[-_.\s]/)[0] || rawCode;
    const alpha = token.match(/^[A-Za-z가-힣]+/);
    return alpha ? alpha[0].toUpperCase() : token.toUpperCase();
  };

  const buildTestResultItems = (item, catalog, customTestDetail) => {
    const fallbackScales = buildSelectedScalesFromCustomTest(catalog, customTestDetail);
    const fallbackTestName = toText(
      item.assigned_custom_test_name ?? customTestDetail?.custom_test_name,
      '배정 검사'
    );
    const fallbackParentTestName = toText(
      item.assigned_parent_test_name ?? customTestDetail?.test_id,
      '-'
    );
    const candidateArrays = [
      item.performed_tests,
      item.test_results,
      item.custom_test_results,
      item.assessment_results,
      item.assessment_histories,
    ];
    const backendRows = candidateArrays.find((rows) => Array.isArray(rows) && rows.length) || [];
    if (backendRows.length) {
      return backendRows.map((row, idx) => {
        const rawScaleCandidates = [
          row?.scales,
          row?.scale_results,
          row?.results,
          row?.selected_scales,
          row?.scale_items,
        ];
        const rawScaleRows = rawScaleCandidates.find((rows) => Array.isArray(rows)) || [];
        const parentTestName = toText(
          row?.parent_test_name ?? row?.parent_name ?? row?.parent_test_id,
          fallbackParentTestName
        );
        const scales = normalizeScaleRows(rawScaleRows, fallbackScales).map((scale) => ({
          ...scale,
          parent_test_name: toText(scale.parent_test_name, parentTestName),
        }));
        const selectedScales = extractScaleBadges(scales.length ? scales : fallbackScales);
        const assessedOn = toText(
          row?.assessed_on ?? row?.assessment_date ?? row?.performed_at ?? row?.date ?? row?.created_at,
          item.last_assessed_on || '-'
        );
        return {
          id: toText(row?.id, `test-result-${idx + 1}`),
          test_name: toText(row?.custom_test_name ?? row?.test_name ?? row?.name, fallbackTestName),
          parent_test_name: parentTestName,
          assessed_on: assessedOn,
          status: toText(row?.status, assessedOn && assessedOn !== '-' ? '완료' : (item.status || '미실시')),
          scales,
          selected_scales: selectedScales,
          sort_ts: toSortTimestamp(assessedOn),
        };
      });
    }

    const logs = Array.isArray(item.assessment_logs) ? item.assessment_logs : [];
    if (logs.length) {
      return logs.map((log, idx) => {
        const assessedOn = toText(log?.assessed_on, '-');
        const scales = normalizeScaleRows([], fallbackScales).map((scale) => ({
          ...scale,
          parent_test_name: toText(scale.parent_test_name, fallbackParentTestName),
        }));
        return {
          id: toText(log?.id, `assessment-log-${idx + 1}`),
          test_name: fallbackTestName,
          parent_test_name: fallbackParentTestName,
          assessed_on: assessedOn,
          status: '완료',
          scales,
          selected_scales: extractScaleBadges(fallbackScales.length ? fallbackScales : scales),
          sort_ts: toSortTimestamp(assessedOn),
        };
      });
    }

    if (!fallbackTestName || fallbackTestName === '배정 검사') {
      return [];
    }
    const scales = normalizeScaleRows([], fallbackScales).map((scale) => ({
      ...scale,
      parent_test_name: toText(scale.parent_test_name, fallbackParentTestName),
    }));
    return [{
      id: 'assigned-custom-test',
      test_name: fallbackTestName,
      parent_test_name: fallbackParentTestName,
      assessed_on: toText(item.last_assessed_on, '-'),
      status: toText(item.status, '미실시'),
      scales,
      selected_scales: extractScaleBadges(fallbackScales.length ? fallbackScales : scales),
      sort_ts: toSortTimestamp(item.last_assessed_on),
    }];
  };

  const sortTestItems = (rows) => [...rows].sort((a, b) => {
    const timeDiff = (b.sort_ts || 0) - (a.sort_ts || 0);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return String(b.id).localeCompare(String(a.id), 'ko');
  });

  const createSvgEl = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        el.setAttribute(key, String(value));
      }
    });
    return el;
  };

  let clientItem = null;
  let testItems = [];
  const selectedScaleKeys = new Set();
  const expandedTreeGroups = new Set();
  let profileChartAnimationFrame = 0;
  let previousProfileChartPoints = new Map();
  let hasProfileChartRendered = false;

  const cancelProfileChartAnimation = () => {
    if (profileChartAnimationFrame) {
      cancelAnimationFrame(profileChartAnimationFrame);
      profileChartAnimationFrame = 0;
    }
  };

  const easeProfileMotion = (t) => 1 - ((1 - t) ** 3);
  const toProfilePointKey = (scale) => `${toText(scale?.parent_test_name, '')}::${toText(scale?.scale_code, '')}`;

  const getPrimaryTest = () => (testItems.length ? testItems[0] : null);

  const getAllTreeScales = () => {
    const rows = [];
    testItems.forEach((item, testIdx) => {
      const fallbackParentTestName = toText(item.parent_test_name, '기반 검사');
      const testName = toText(item.test_name, `검사 ${testIdx + 1}`);
      const assessedOn = toText(item.assessed_on, '-');
      const status = toText(item.status, '-');
      (Array.isArray(item.scales) ? item.scales : []).forEach((scale, idx) => {
        const parentTestName = toText(scale.parent_test_name, fallbackParentTestName);
        const scaleKey = toText(
          scale.scale_key,
          `${toText(scale.scale_code, `S${idx + 1}`)}-${idx + 1}`
        );
        rows.push({
          ...scale,
          tree_scale_key: `${String(item.id)}::${scaleKey}::${idx + 1}`,
          parent_test_name: parentTestName,
          test_name: testName,
          assessed_on: assessedOn,
          status,
        });
      });
    });
    return rows;
  };

  const getParentScaleGroups = (scales) => {
    const rows = Array.isArray(scales) ? scales : [];
    const parentMap = new Map();
    rows.forEach((scale) => {
      const parentKey = toText(scale.parent_test_name, '기반 검사');
      if (!parentMap.has(parentKey)) {
        parentMap.set(parentKey, []);
      }
      parentMap.get(parentKey).push(scale);
    });

    return [...parentMap.entries()]
      .sort(([a], [b]) => compareScalesByParentStructOrder(
        { parent_test_name: a, scale_code: '' },
        { parent_test_name: b, scale_code: '' },
      ))
      .map(([parentKey, parentRows]) => ({
        parentKey,
        rows: sortScalesByParentStructOrder(parentRows),
      }));
  };

  const selectAllScales = (scales) => {
    selectedScaleKeys.clear();
    (Array.isArray(scales) ? scales : []).forEach((scale) => {
      selectedScaleKeys.add(String(scale.tree_scale_key));
    });
  };

  const syncScaleSelection = (scales) => {
    const rows = Array.isArray(scales) ? scales : [];
    const validKeys = new Set(rows.map((scale) => String(scale.tree_scale_key)));
    [...selectedScaleKeys].forEach((key) => {
      if (!validKeys.has(String(key))) {
        selectedScaleKeys.delete(String(key));
      }
    });
  };

  const renderClientSummary = () => {
    if (!clientItem) {
      return;
    }
    const genderText = getGenderLabel(clientItem.gender);
    const identityParts = [genderText, clientItem.birth_day || ''].filter(Boolean);
    if (resultClientNameEl) {
      resultClientNameEl.textContent = toText(clientItem.name, '-');
    }
    if (resultClientIdentityEl) {
      resultClientIdentityEl.textContent = identityParts.length
        ? identityParts.join(' · ')
        : '성별/생년월일 미입력';
    }
    const recentAssessedOn = toText(
      clientItem.last_assessed_on,
      testItems.find((item) => toText(item.assessed_on) && item.assessed_on !== '-')?.assessed_on || '-'
    );
    if (resultClientLastAssessedOnEl) {
      resultClientLastAssessedOnEl.textContent = recentAssessedOn;
    }
    const testNameSet = new Set(
      testItems.map((item) => toText(item.test_name)).filter(Boolean)
    );
    const statusSet = new Set(
      testItems.map((item) => toText(item.status)).filter(Boolean)
    );
    const parentSet = new Set(
      testItems.map((item) => toText(item.parent_test_name)).filter(Boolean)
    );
    if (resultClientSelectedTestEl) {
      if (!testNameSet.size) {
        resultClientSelectedTestEl.textContent = '검사 데이터 없음';
      } else if (testNameSet.size === 1) {
        resultClientSelectedTestEl.textContent = [...testNameSet][0];
      } else {
        resultClientSelectedTestEl.textContent = `${testNameSet.size}개 커스텀 검사`;
      }
    }
    if (resultClientStatusEl) {
      if (statusSet.size === 1) {
        resultClientStatusEl.textContent = [...statusSet][0];
      } else if (statusSet.size > 1) {
        resultClientStatusEl.textContent = '복수 상태';
      } else {
        resultClientStatusEl.textContent = toText(clientItem.status, '-');
      }
    }
    if (resultClientTestMetaEl) {
      resultClientTestMetaEl.textContent = `실시 이력 ${testItems.length}건 · parent ${parentSet.size ? [...parentSet].join(', ') : '-'} · 좌측 척도 트리 선택에 따라 우측 결과가 즉시 갱신됩니다.`;
    }
  };

  const resolveVisibleScales = (scales) => {
    const rows = Array.isArray(scales) ? scales : [];
    if (!rows.length) {
      return [];
    }
    if (!selectedScaleKeys.size) {
      return [];
    }
    return rows.filter((scale) => selectedScaleKeys.has(String(scale.tree_scale_key)));
  };

  const renderScaleTree = (scales) => {
    if (!scaleTreeEl || !scaleTreeEmptyEl) {
      return;
    }
    const rows = Array.isArray(scales) ? scales : [];
    const parentGroups = getParentScaleGroups(rows);

    if (scaleTreeMetaEl) {
      scaleTreeMetaEl.textContent = `검사 ${parentGroups.length}개 · 선택 ${selectedScaleKeys.size}/${rows.length}`;
    }
    if (selectAllScalesBtn) {
      selectAllScalesBtn.disabled = !rows.length || selectedScaleKeys.size === rows.length;
    }
    if (clearScalesBtn) {
      clearScalesBtn.disabled = !rows.length || selectedScaleKeys.size === 0;
    }

    scaleTreeEl.innerHTML = '';
    if (!rows.length) {
      scaleTreeEmptyEl.classList.remove('hidden');
      return;
    }
    scaleTreeEmptyEl.classList.add('hidden');

    parentGroups.forEach((parent) => {
      const parentRows = Array.isArray(parent.rows) ? parent.rows : [];
      const parentSelectedCount = parentRows.filter((scale) => selectedScaleKeys.has(String(scale.tree_scale_key))).length;
      const isExpanded = expandedTreeGroups.has(parent.parentKey);

      const root = document.createElement('article');
      root.className = 'client-scale-tree-root';
      applyParentThemeVars(root, parent.parentKey);

      const rootHead = document.createElement('div');
      rootHead.className = 'client-scale-tree-root-head';
      const parentLabel = document.createElement('label');
      parentLabel.className = 'client-scale-tree-group-check';
      const parentCheckbox = document.createElement('input');
      parentCheckbox.type = 'checkbox';
      parentCheckbox.dataset.role = 'toggle-tree-parent-select';
      parentCheckbox.dataset.parent = parent.parentKey;
      parentCheckbox.checked = parentSelectedCount > 0 && parentSelectedCount === parentRows.length;
      parentCheckbox.indeterminate = parentSelectedCount > 0 && parentSelectedCount < parentRows.length;
      const rootTitle = document.createElement('strong');
      rootTitle.textContent = parent.parentKey;
      const rootMeta = document.createElement('span');
      rootMeta.textContent = `${parentSelectedCount}/${parentRows.length}`;
      parentLabel.appendChild(parentCheckbox);
      parentLabel.appendChild(rootTitle);
      parentLabel.appendChild(rootMeta);

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'client-scale-tree-toggle';
      toggleBtn.dataset.role = 'toggle-tree-parent-open';
      toggleBtn.dataset.parent = parent.parentKey;
      toggleBtn.textContent = isExpanded ? '접기' : '펼치기';

      rootHead.appendChild(parentLabel);
      rootHead.appendChild(toggleBtn);
      root.appendChild(rootHead);

      const children = document.createElement('div');
      children.className = `client-scale-tree-children ${isExpanded ? '' : 'hidden'}`;
      parentRows.forEach((scale) => {
        const rowSelected = selectedScaleKeys.has(String(scale.tree_scale_key));
        const row = document.createElement('label');
        row.className = `client-scale-tree-child ${rowSelected ? 'is-active' : ''}`;
        applyParentThemeVars(row, parent.parentKey);

        const scaleCheckbox = document.createElement('input');
        scaleCheckbox.type = 'checkbox';
        scaleCheckbox.dataset.role = 'toggle-tree-scale-select';
        scaleCheckbox.dataset.scaleKey = String(scale.tree_scale_key);
        scaleCheckbox.checked = rowSelected;

        const scaleCode = document.createElement('span');
        scaleCode.className = 'client-scale-tree-code';
        scaleCode.textContent = toText(scale.scale_code, '-');

        const scaleName = document.createElement('span');
        scaleName.className = 'client-scale-tree-name';
        scaleName.textContent = toText(scale.scale_name, '-');

        row.appendChild(scaleCheckbox);
        row.appendChild(scaleCode);
        row.appendChild(scaleName);
        children.appendChild(row);
      });
      root.appendChild(children);

      scaleTreeEl.appendChild(root);
    });
  };

  const renderSelectedScaleSummary = (scales, totalScales) => {
    if (!selectedScaleSummaryEl) {
      return;
    }
    const rows = sortScalesByParentStructOrder(scales);
    const allRows = Array.isArray(totalScales) ? totalScales : [];
    selectedScaleSummaryEl.innerHTML = '';

    if (!rows.length) {
      selectedScaleSummaryEl.innerHTML = '<p class="field-info">선택된 척도가 없습니다. 좌측 트리에서 척도를 선택하세요.</p>';
      return;
    }

    const grouped = new Map();
    rows.forEach((scale) => {
      const parentKey = toText(scale.parent_test_name, '기반 검사');
      if (!grouped.has(parentKey)) {
        grouped.set(parentKey, []);
      }
      grouped.get(parentKey).push(scale);
    });

    const selectedParentCount = new Set(rows.map((scale) => toText(scale.parent_test_name))).size;
    const summaryMeta = document.createElement('p');
    summaryMeta.className = 'client-selected-summary-meta';
    summaryMeta.textContent = `선택 ${rows.length}/${allRows.length}개 척도 · parent ${selectedParentCount}개`;
    selectedScaleSummaryEl.appendChild(summaryMeta);

    const groupRow = document.createElement('div');
    groupRow.className = 'client-selected-group-row';
    [...grouped.entries()]
      .sort(([a], [b]) => compareScalesByParentStructOrder(
        { parent_test_name: a, scale_code: '' },
        { parent_test_name: b, scale_code: '' },
      ))
      .forEach(([parentKey, parentRows]) => {
        const chip = document.createElement('span');
        chip.className = 'client-selected-group-chip';
        chip.textContent = `${parentKey} (${parentRows.length}개)`;
        applyParentThemeVars(chip, parentKey);
        groupRow.appendChild(chip);
      });
    selectedScaleSummaryEl.appendChild(groupRow);

    const scaleRow = document.createElement('div');
    scaleRow.className = 'client-selected-scale-row';
    rows.slice(0, 8).forEach((scale) => {
      const chip = document.createElement('span');
      chip.className = 'client-selected-scale-chip';
      chip.textContent = `${toText(scale.scale_code, '-')} ${toText(scale.scale_name, '-')}`;
      applyParentThemeVars(chip, scale.parent_test_name);
      scaleRow.appendChild(chip);
    });
    if (rows.length > 8) {
      const moreChip = document.createElement('span');
      moreChip.className = 'client-selected-scale-chip is-more';
      moreChip.textContent = `+${rows.length - 8}개`;
      scaleRow.appendChild(moreChip);
    }
    selectedScaleSummaryEl.appendChild(scaleRow);
  };

  const renderBarChart = (scales) => {
    if (!barChartEl) {
      return;
    }
    const rows = Array.isArray(scales) ? scales : [];
    barChartEl.innerHTML = '';
    if (!rows.length) {
      barChartEl.innerHTML = `
        <div class="client-chart-placeholder">
          <p>결과 생성 전입니다. 검사 완료 후 그래프가 표시됩니다.</p>
          <div class="client-chart-placeholder-bars">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      return;
    }

    const numericScores = rows
      .map((scale) => scale.score_number)
      .filter((score) => Number.isFinite(score));
    if (!numericScores.length) {
      barChartEl.innerHTML = `
        <div class="client-chart-placeholder">
          <p>채점 진행 전입니다. 채점 완료 후 척도별 점수 그래프가 표시됩니다.</p>
          <div class="client-chart-placeholder-bars">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
      return;
    }
    const maxScore = numericScores.length ? Math.max(...numericScores) : 0;

    rows.forEach((scale) => {
      const hasNumeric = Number.isFinite(scale.score_number);
      const barPct = (maxScore > 0 && hasNumeric) ? Math.max(4, Math.round((scale.score_number / maxScore) * 100)) : 0;
      const row = document.createElement('article');
      row.className = 'client-result-bar-row';
      applyParentThemeVars(row, scale.parent_test_name);
      row.innerHTML = `
        <div class="client-result-bar-head">
          <strong>${escapeHtml(scale.scale_code)} · ${escapeHtml(scale.scale_name)}</strong>
          <span>${hasNumeric ? `점수 ${escapeHtml(scale.score_text)}` : '점수 미집계'}</span>
        </div>
        <div class="client-result-bar-track${barPct > 0 ? '' : ' is-empty'}">
          <div class="client-result-bar-fill" style="width:${barPct}%"></div>
        </div>
      `;
      barChartEl.appendChild(row);
    });
  };

  const renderProfileChart = (scales) => {
    if (!profileChartEl) {
      return;
    }
    cancelProfileChartAnimation();
    const d3Lib = globalThis.d3;
    profileChartEl.innerHTML = '';
    if (!d3Lib) {
      profileChartEl.innerHTML = '<text x="50%" y="50%" text-anchor="middle" font-size="12" fill="#6f7785">D3 로드 실패</text>';
      return;
    }

    const width = 584;
    const height = 286;
    const frameX = 18;
    const frameY = 14;
    const frameWidth = width - 36;
    const frameHeight = height - 34;
    const rows = sortScalesByParentStructOrder(scales);
    const numericRows = rows.filter((scale) => Number.isFinite(scale.score_number));
    const svg = d3Lib.select(profileChartEl)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none');

    const drawEmptyState = (title, subtitle = '') => {
      previousProfileChartPoints = new Map();
      hasProfileChartRendered = false;
      svg.append('rect')
        .attr('x', frameX)
        .attr('y', frameY)
        .attr('width', frameWidth)
        .attr('height', frameHeight)
        .attr('rx', 10)
        .attr('fill', '#fafcff')
        .attr('stroke', '#dce5f0')
        .attr('stroke-dasharray', '4 4');
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', (height / 2) - (subtitle ? 10 : 6))
        .attr('text-anchor', 'middle')
        .attr('font-size', 12)
        .attr('fill', '#6f7785')
        .text(title);
      if (subtitle) {
        svg.append('text')
          .attr('x', width / 2)
          .attr('y', (height / 2) + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', 11)
          .attr('fill', '#7e8796')
          .text(subtitle);
      }
    };

    if (!rows.length) {
      drawEmptyState('결과 생성 전입니다.');
      return;
    }

    if (!numericRows.length) {
      drawEmptyState('채점 진행 전입니다.', '채점 완료 후 프로파일 차트가 표시됩니다.');
      return;
    }

    const pLeft = 44;
    const pRight = 22;
    const pTop = 20;
    const pBottom = 44;
    const chartW = width - pLeft - pRight;
    const chartH = height - pTop - pBottom;
    const xInset = Math.min(22, chartW * 0.045);
    const plotLeft = pLeft + xInset;
    const plotRight = width - pRight - xInset;
    const gridTop = pTop + (chartH * 0.18);
    const gridBottom = pTop + (chartH * 0.82);
    const xScale = d3Lib.scalePoint()
      .domain(rows.map((scale) => toProfilePointKey(scale)))
      .range([plotLeft, plotRight]);
    const yAxisScale = d3Lib.scaleLinear()
      .domain([0, 100])
      .range([gridBottom, gridTop]);
    const yPlotScale = d3Lib.scaleLinear()
      .domain([0, 100])
      .range([gridBottom, gridTop]);

    svg.append('g')
      .selectAll('line')
      .data([100, 75, 50, 25, 0])
      .enter()
      .append('line')
      .attr('x1', plotLeft)
      .attr('x2', plotRight)
      .attr('y1', (d) => yAxisScale(d))
      .attr('y2', (d) => yAxisScale(d))
      .attr('stroke', '#e6e9ef')
      .attr('stroke-width', 1);

    svg.append('g')
      .selectAll('text')
      .data([100, 75, 50, 25, 0])
      .enter()
      .append('text')
      .attr('x', pLeft - 12)
      .attr('y', (d) => yAxisScale(d) + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 7)
      .attr('font-weight', 500)
      .attr('fill', '#738193')
      .text((d) => String(d));

    svg.append('line')
      .attr('x1', plotLeft)
      .attr('x2', plotRight)
      .attr('y1', pTop + chartH)
      .attr('y2', pTop + chartH)
      .attr('stroke', '#d8e0ea')
      .attr('stroke-width', 1);

    const points = rows.map((scale) => {
      const key = toProfilePointKey(scale);
      const value = Math.max(0, Math.min(100, Number.isFinite(scale.score_number) ? scale.score_number : 0));
      return {
        key,
        x: xScale(key) ?? plotLeft,
        y: yPlotScale(value),
        value,
        hasNumeric: Number.isFinite(scale.score_number),
        scale,
      };
    });

    const groups = [];
    rows.forEach((scale, idx) => {
      const parent = toText(scale.parent_test_name, '기반 검사');
      const current = groups[groups.length - 1];
      if (!current || current.parent !== parent) {
        groups.push({ parent, start: idx, end: idx });
        return;
      }
      current.end = idx;
    });

    const lineBuilder = d3Lib.line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3Lib.curveLinear);

    groups.forEach((group, idx) => {
      const palette = getParentThemePalette(group.parent);
      const groupPoints = points.slice(group.start, group.end + 1);
      const startPoint = groupPoints[0];
      const endPoint = groupPoints[groupPoints.length - 1];
      if (!startPoint || !endPoint) {
        return;
      }

      svg.append('path')
        .datum(groupPoints)
        .attr('fill', 'none')
        .attr('stroke', palette.accent)
        .attr('stroke-width', 1.8)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', lineBuilder);

      svg.append('g')
        .selectAll(`circle.group-${idx}`)
        .data(groupPoints)
        .enter()
        .append('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 2.6)
        .attr('fill', (d) => (d.hasNumeric ? palette.accent : '#cfd8e4'));

      svg.append('g')
        .selectAll(`text.group-scale-${idx}`)
        .data(groupPoints)
        .enter()
        .append('text')
        .attr('x', (d) => d.x)
        .attr('y', height - 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', 7)
        .attr('font-weight', 500)
        .attr('fill', palette.text)
        .text((d) => d.scale.scale_code);

      const groupLeft = group.start === group.end ? startPoint.x - 18 : startPoint.x;
      const groupRight = group.start === group.end ? endPoint.x + 18 : endPoint.x;
      const centerX = (groupLeft + groupRight) / 2;

      svg.append('line')
        .attr('x1', groupLeft)
        .attr('x2', groupRight)
        .attr('y1', height - 13)
        .attr('y2', height - 13)
        .attr('stroke', palette.line)
        .attr('stroke-width', 1.2);

      if (idx < groups.length - 1) {
        const nextPoint = points[group.end + 1];
        const separatorX = groupRight + (((nextPoint?.x ?? groupRight) - groupRight) / 2);
        svg.append('line')
          .attr('x1', separatorX)
          .attr('x2', separatorX)
          .attr('y1', pTop + chartH + 6)
          .attr('y2', height - 16)
          .attr('stroke', '#dde5ef')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3 3');
      }

      svg.append('text')
        .attr('x', centerX)
        .attr('y', height - 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', 7)
        .attr('font-weight', 600)
        .attr('fill', palette.accentStrong)
        .text(group.parent.toUpperCase());
    });

    previousProfileChartPoints = new Map(points.map((point) => [point.key, { x: point.x, y: point.y }]));
    hasProfileChartRendered = true;
  };

  const renderDetail = () => {
    const allScaleRows = getAllTreeScales();
    if (!testItems.length) {
      if (selectedTestTitleEl) {
        selectedTestTitleEl.textContent = '선택 가능한 검사 결과가 없습니다.';
      }
      if (selectedTestMetaEl) {
        selectedTestMetaEl.textContent = '';
      }
      if (detailEmptyEl) {
        detailEmptyEl.classList.remove('hidden');
      }
      if (scaleFilterLegendEl) {
        scaleFilterLegendEl.textContent = '선택 척도 없음';
      }
      renderScaleTree([]);
      renderSelectedScaleSummary([], []);
      renderBarChart([]);
      renderProfileChart([]);
      renderClientSummary();
      return;
    }

    if (detailEmptyEl) {
      detailEmptyEl.classList.add('hidden');
    }
    const primary = getPrimaryTest();
    if (selectedTestTitleEl) {
      selectedTestTitleEl.textContent = '선택 척도 결과';
    }
    if (selectedTestMetaEl) {
      const parentNames = [...new Set(
        allScaleRows.map((scale) => toText(scale.parent_test_name)).filter(Boolean)
      )];
      selectedTestMetaEl.textContent = `parent ${parentNames.join(', ') || '-'} · 최근 실시일 ${primary?.assessed_on || '-'} · 검사 이력 ${testItems.length}건`;
    }

    syncScaleSelection(allScaleRows);
    const visibleScales = resolveVisibleScales(allScaleRows);
    if (scaleFilterLegendEl) {
      if (!visibleScales.length) {
        scaleFilterLegendEl.textContent = '선택 척도 없음';
      } else if (visibleScales.length === allScaleRows.length) {
        scaleFilterLegendEl.textContent = `전체 척도 프로파일 (${visibleScales.length}개)`;
      } else if (visibleScales.length === 1) {
        const only = visibleScales[0];
        scaleFilterLegendEl.textContent = `선택 척도: ${only.parent_test_name} > ${only.scale_code} · ${only.scale_name}`;
      } else {
        const parentCount = new Set(
          visibleScales.map((scale) => toText(scale.parent_test_name)).filter(Boolean)
        ).size;
        scaleFilterLegendEl.textContent = `선택 척도 ${visibleScales.length}개 · parent ${parentCount}개`;
      }
    }
    renderScaleTree(allScaleRows);
    renderSelectedScaleSummary(visibleScales, allScaleRows);
    renderBarChart(visibleScales);
    renderProfileChart(visibleScales);
    renderClientSummary();
    syncClientResultPanelHeights();
  };

  if (scaleTreeEl) {
    scaleTreeEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const toggleButton = target.closest('[data-role="toggle-tree-parent-open"]');
      if (!(toggleButton instanceof HTMLElement)) {
        return;
      }
      const parent = toggleButton.dataset.parent || '';
      if (!parent) {
        return;
      }
      if (expandedTreeGroups.has(parent)) {
        expandedTreeGroups.delete(parent);
      } else {
        expandedTreeGroups.add(parent);
      }
      renderDetail();
    });

    scaleTreeEl.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const allScaleRows = getAllTreeScales();

      if (target.dataset.role === 'toggle-tree-parent-select') {
        const parent = target.dataset.parent || '';
        if (!parent) {
          return;
        }
        const parentRows = allScaleRows.filter((scale) => toText(scale.parent_test_name) === parent);
        if (target.checked) {
          parentRows.forEach((scale) => selectedScaleKeys.add(String(scale.tree_scale_key)));
        } else {
          parentRows.forEach((scale) => selectedScaleKeys.delete(String(scale.tree_scale_key)));
        }
        renderDetail();
        return;
      }

      if (target.dataset.role !== 'toggle-tree-scale-select') {
        return;
      }
      const scaleKey = target.dataset.scaleKey || '';
      if (!scaleKey) {
        return;
      }
      if (target.checked) {
        selectedScaleKeys.add(scaleKey);
      } else {
        selectedScaleKeys.delete(scaleKey);
      }
      renderDetail();
    });
  }

  if (selectAllScalesBtn) {
    selectAllScalesBtn.addEventListener('click', () => {
      const allScaleRows = getAllTreeScales();
      selectAllScales(allScaleRows);
      renderDetail();
    });
  }

  if (clearScalesBtn) {
    clearScalesBtn.addEventListener('click', () => {
      selectedScaleKeys.clear();
      renderDetail();
    });
  }

  setMessage('', false);
  try {
    const detail = await api(`/api/admin/clients/${id}`);
    clientItem = detail.item || {};

    const assignedCustomTestId = Number(clientItem.assigned_custom_test_id);
    let catalog = { tests: [] };
    try {
      const loadedCatalog = await api('/api/admin/tests/catalog');
      if (loadedCatalog && Array.isArray(loadedCatalog.tests)) {
        catalog = loadedCatalog;
      }
    } catch {
      // Catalog is optional fallback data for scale-name mapping.
    }

    let customTestDetail = null;
    if (Number.isFinite(assignedCustomTestId) && assignedCustomTestId > 0) {
      try {
        customTestDetail = await api(`/api/admin/custom-tests/${assignedCustomTestId}`);
      } catch {
        // Custom test detail is optional fallback data for scale badges.
      }
    }

    parentScaleOrderIndex = buildParentScaleOrderIndex(catalog);
    testItems = sortTestItems(buildTestResultItems(clientItem, catalog, customTestDetail));
    selectedScaleKeys.clear();
    expandedTreeGroups.clear();
    const allScaleRows = getAllTreeScales();
    selectAllScales(allScaleRows);
    renderClientSummary();
    renderDetail();
  } catch (error) {
    setMessage(error.message, true);
    renderClientSummary();
    renderDetail();
  }

  if (typeof ResizeObserver === 'function' && detailPanelEl) {
    const panelObserver = new ResizeObserver(() => {
      syncClientResultPanelHeights();
    });
    panelObserver.observe(detailPanelEl);
  }
  window.addEventListener('resize', syncClientResultPanelHeights);
  syncClientResultPanelHeights();
}

async function initTestDetailPage() {
  const me = await ensureAdmin();
  if (!me) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/admin/workspace';
    return;
  }

  const form = document.getElementById('testDetailForm');
  const nameInput = document.getElementById('detail_custom_test_name');
  const scaleList = document.getElementById('detailScaleList');
  const detailMeta = document.getElementById('detailMeta');
  const detailSelectedScaleCount = document.getElementById('detailSelectedScaleCount');
  const detailSelectedItemCount = document.getElementById('detailSelectedItemCount');
  const detailResponseType = document.getElementById('detailResponseType');
  const msg = document.getElementById('testDetailMessage');

  const [detail, catalog] = await Promise.all([
    api(`/api/admin/custom-tests/${id}`),
    api('/api/admin/tests/catalog')
  ]);

  nameInput.value = detail.custom_test_name;
  detailMeta.textContent = `기반 검사: ${detail.test_id} | 현재 척도 수: ${detail.scale_count}개`;
  if (!Array.isArray(detail.test_configs) || !detail.test_configs.length) {
    msg.textContent = '원본 검사 정보를 찾을 수 없습니다.';
    msg.className = 'message error';
    detailSelectedScaleCount.textContent = '-';
    detailSelectedItemCount.textContent = '-';
    detailResponseType.textContent = '-';
    return;
  }

  const selectedScales = getSelectedScaleLabelsFromConfigs(catalog, detail.test_configs || []);
  const selectedItemIds = new Set();
  const responseSubs = [];
  (detail.test_configs || []).forEach((config) => {
    const test = catalog.tests.find((it) => it.test_id === config.test_id);
    (config.sub_test_variants || []).forEach((variant) => {
      const matched = (test?.sub_tests || []).find((sub) => sub.sub_test_json === variant.sub_test_json);
      if (!matched) {
        return;
      }
      responseSubs.push(matched);
      (matched.scales || []).forEach((scale) => {
        if (!(variant.selected_scale_codes || []).includes(scale.code)) {
          return;
        }
        (scale.item_ids || []).forEach((itemId) => selectedItemIds.add(String(itemId)));
      });
    });
  });

  const responseSub = responseSubs.find((sub) => Array.isArray(sub.response_options) && sub.response_options.length) || responseSubs[0] || null;
  const responseOptions = Array.isArray(responseSub?.response_options) ? responseSub.response_options : [];
  detailSelectedScaleCount.textContent = `${selectedScales.length}개`;
  detailSelectedItemCount.textContent = `${selectedItemIds.size}문항`;
  if (responseOptions.length) {
    const pills = responseOptions
      .map((opt) => `<span class="response-pill"><span class="dot"></span>${escapeHtml(opt.label)}</span>`)
      .join('');
    const scaleBadge = responseSub?.response_scale_label
      ? `<span class="response-scale">${escapeHtml(responseSub.response_scale_label)}</span>`
      : '';
    detailResponseType.innerHTML = `${scaleBadge}${pills}`;
  } else {
    detailResponseType.textContent = '응답형식 정보 없음';
  }

  scaleList.innerHTML = '';
  selectedScales.forEach((labelText) => {
    const label = document.createElement('label');
    label.className = 'check-item';
    label.innerHTML = `<span>${escapeHtml(labelText)}</span>`;
    scaleList.appendChild(label);
  });

  scaleList.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-role="toggle-scale-children"]');
    if (!toggleBtn) {
      return;
    }
    const targetId = toggleBtn.dataset.target;
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }
    const open = target.classList.contains('hidden');
    target.classList.toggle('hidden', !open);
    const arrow = toggleBtn.querySelector('.arrow');
    if (arrow) {
      arrow.textContent = open ? '▲' : '▼';
    }
  });

  if (!selectedScales.length) {
    const empty = document.createElement('div');
    empty.className = 'info-box';
    empty.textContent = '선택된 척도 정보가 없습니다.';
    scaleList.appendChild(empty);
  }

  msg.textContent = '';
  msg.className = 'message';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });
}

(async function init() {
  const page = document.body.dataset.page;
  if (page === 'admin-login') {
    await initLoginPage();
    return;
  }
  if (page === 'admin-workspace') {
    await initWorkspacePage();
    return;
  }
  if (page === 'admin-clients') {
    await initClientsPage();
    return;
  }
  if (page === 'admin-create') {
    await initCreatePage();
    return;
  }
  if (page === 'admin-client-detail') {
    await initClientDetailPage();
    return;
  }
  if (page === 'admin-client-result') {
    await initClientResultPage();
    return;
  }
  if (page === 'admin-test-detail') {
    await initTestDetailPage();
  }
})();
