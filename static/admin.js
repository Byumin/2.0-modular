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
          <span class="badge ${item.status === '미실시' ? 'badge-wait' : 'badge-live'}">${item.status}</span>
        </div>
        <div class="row-col row-action">
          <a class="ghost-btn" href="/admin/clients">상세 보기</a>
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
  const clientEmpty = document.getElementById('clientEmpty');
  const clientResultModal = document.getElementById('clientResultModal');
  const clientResultSummary = document.getElementById('clientResultSummary');
  const clientResultName = document.getElementById('clientResultName');
  const clientResultTest = document.getElementById('clientResultTest');
  const clientResultDate = document.getElementById('clientResultDate');
  const clientResultStatus = document.getElementById('clientResultStatus');
  const clientResultCloseTopBtn = document.getElementById('clientResultCloseTopBtn');
  const clientResultCloseBtn = document.getElementById('clientResultCloseBtn');
  let editingAssignedTestId = null;

  function closeClientResultModal() {
    if (clientResultModal) {
      clientResultModal.classList.add('hidden');
    }
  }

  function openClientResultModal(item) {
    if (!clientResultModal) {
      return;
    }
    const done = item.status === '완료';
    clientResultSummary.textContent = done
      ? '검사 실시가 완료되어 현재 저장된 결과 상태를 확인할 수 있습니다.'
      : '검사 실시 완료 후 결과 확인이 가능합니다.';
    clientResultName.textContent = item.name || '-';
    clientResultTest.textContent = item.assigned_custom_test_name || '미배정';
    clientResultDate.textContent = item.last_assessed_on || '-';
    clientResultStatus.textContent = item.status || '-';
    clientResultModal.classList.remove('hidden');
  }

  function resetForm() {
    clientIdInput.value = '';
    clientNameInput.value = '';
    clientGenderInput.value = '';
    clientBirthInput.value = '';
    clientMemoInput.value = '';
    editingAssignedTestId = null;
    clientSaveBtn.textContent = '내담자 저장';
    clientCancelBtn.classList.add('hidden');
  }

  async function refreshClients() {
    const clients = (await api('/api/admin/clients')).items;
    if (!clients.length) {
      clientEmpty.classList.remove('hidden');
      clientList.innerHTML = '';
      return;
    }
    clientEmpty.classList.add('hidden');
    clientList.innerHTML = '';

    clients.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div class="list-row-head">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="badge ${item.status === '미실시' ? 'badge-wait' : 'badge-live'}">${item.status}</span>
        </div>
        <p>배정 검사: ${escapeHtml(item.assigned_custom_test_name || '-')}</p>
        <p>실시일: ${item.last_assessed_on || '-'}</p>
        <p>메모: ${escapeHtml(item.memo || '-')}</p>
        <div class="client-result-box">
          <p class="client-result-box-title">검사 결과 확인</p>
          <p class="client-result-box-sub">${item.status === '완료' ? '검사 완료 결과를 확인할 수 있습니다.' : '검사 완료 후 결과를 확인할 수 있습니다.'}</p>
          <div class="row-actions item-actions client-result-actions">
            <button
              type="button"
              class="outline-btn"
              data-role="result"
              ${item.status === '완료' ? '' : 'disabled'}
            >결과 확인</button>
          </div>
        </div>
        <div class="row-actions item-actions">
          <button type="button" class="outline-btn" data-role="edit">수정</button>
          <button type="button" class="outline-btn danger-outline" data-role="delete">삭제</button>
          <button type="button" class="outline-btn" data-role="assess">오늘 실시 +1</button>
        </div>
      `;

      li.querySelector('[data-role="edit"]').addEventListener('click', () => {
        clientIdInput.value = String(item.id);
        clientNameInput.value = item.name;
        clientGenderInput.value = item.gender;
        clientBirthInput.value = item.birth_day || '';
        clientMemoInput.value = item.memo || '';
        editingAssignedTestId = item.assigned_custom_test_id ?? null;
        clientSaveBtn.textContent = '내담자 수정';
        clientCancelBtn.classList.remove('hidden');
      });

      li.querySelector('[data-role="delete"]').addEventListener('click', async () => {
        const ok = window.confirm('해당 내담자를 삭제하시겠습니까?');
        if (!ok) {
          return;
        }
        await api(`/api/admin/clients/${item.id}`, { method: 'DELETE' });
        await refreshClients();
      });

      li.querySelector('[data-role="assess"]').addEventListener('click', async () => {
        await api('/api/admin/assessment-logs', {
          method: 'POST',
          body: JSON.stringify({ admin_client_id: item.id })
        });
        await refreshClients();
      });

      const resultBtn = li.querySelector('[data-role="result"]');
      if (resultBtn) {
        resultBtn.addEventListener('click', () => openClientResultModal(item));
      }

      clientList.appendChild(li);
    });
  }

  clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clientMessage.textContent = '';

    const payload = {
      name: clientNameInput.value.trim(),
      gender: clientGenderInput.value,
      birth_day: clientBirthInput.value || null,
      memo: clientMemoInput.value.trim(),
      admin_custom_test_id: clientIdInput.value ? editingAssignedTestId : null
    };

    if (!payload.name || !payload.gender) {
      clientMessage.textContent = '이름과 성별은 필수입니다.';
      clientMessage.className = 'message error full-row';
      return;
    }

    clientSaveBtn.disabled = true;
    try {
      if (clientIdInput.value) {
        await api(`/api/admin/clients/${clientIdInput.value}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await api('/api/admin/clients', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      resetForm();
      await refreshClients();
    } catch (error) {
      clientMessage.textContent = error.message;
      clientMessage.className = 'message error full-row';
    } finally {
      clientSaveBtn.disabled = false;
    }
  });

  clientCancelBtn.addEventListener('click', resetForm);
  if (clientResultCloseTopBtn) {
    clientResultCloseTopBtn.addEventListener('click', closeClientResultModal);
  }
  if (clientResultCloseBtn) {
    clientResultCloseBtn.addEventListener('click', closeClientResultModal);
  }
  if (clientResultModal) {
    clientResultModal.addEventListener('click', (event) => {
      if (event.target === clientResultModal) {
        closeClientResultModal();
      }
    });
  }

  await refreshClients();
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

function extractEligibilityText(subTestJson) {
  try {
    const parsed = JSON.parse(subTestJson || '{}');
    const variants = Array.isArray(parsed?.sub_tests) ? parsed.sub_tests : [parsed];
    const labels = [];
    const seen = new Set();

    variants.forEach((variant) => {
      const ageRange = variant?.age_range;
      const start = Array.isArray(ageRange?.start_inclusive) ? Number(ageRange.start_inclusive[0]) : null;
      const endExclusive = Array.isArray(ageRange?.end_exclusive) ? Number(ageRange.end_exclusive[0]) : null;

      let ageText = '';
      if (Number.isFinite(start) && Number.isFinite(endExclusive)) {
        ageText = endExclusive >= 100
          ? `만 ${start}세 이상`
          : `만 ${start}~${Math.max(start, endExclusive - 1)}세`;
      }

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
        ageStart: Number.isFinite(start) ? start : 9999
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

function listAllEligibilityTexts(catalog, testId, selectedScaleCodes) {
  function ageStartFromJson(subTestJson) {
    try {
      const parsed = JSON.parse(subTestJson || '{}');
      const ageRange = parsed?.age_range;
      const start = Array.isArray(ageRange?.start_inclusive) ? Number(ageRange.start_inclusive[0]) : null;
      return Number.isFinite(start) ? start : 9999;
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
  const scaleIndex = buildScaleNameIndex(catalog);

  items.forEach((item) => {
    const scaleMap = scaleIndex.get(`${item.test_id}::${item.sub_test_json}`) || (() => {
      const test = (catalog?.tests || []).find((it) => it.test_id === item.test_id);
      const fallback = new Map();
      (test?.sub_tests || []).forEach((sub) => {
        (sub.scales || []).forEach((scale) => {
          if (!fallback.has(scale.code)) {
            fallback.set(scale.code, scale.name || scale.code);
          }
        });
      });
      return fallback;
    })();
    const scales = item.selected_scale_codes
      .map((code) => `${scaleMap.get(code) || code}(${code})`)
      .join(', ');
    const allEligibility = listAllEligibilityTexts(catalog, item.test_id, item.selected_scale_codes);
    const eligibility = allEligibility.length
      ? allEligibility.join(', ')
      : extractEligibilityText(item.sub_test_json);
    const li = document.createElement('li');
    li.className = 'row-item';
    const checked = selectedIds.has(item.id) ? 'checked' : '';
    li.innerHTML = `
      <div class="row-grid row-grid-manage">
        <div class="row-col select-col"><input type="checkbox" data-role="select-test" value="${item.id}" ${checked} aria-label="검사 선택" /></div>
        <div class="row-col main-col"><strong>${escapeHtml(item.custom_test_name)}</strong></div>
        <div class="row-col root-col">${escapeHtml(item.test_id)}</div>
        <div class="row-col target-col">${escapeHtml(eligibility)}</div>
        <div class="row-col scale-col">${escapeHtml(scales)}</div>
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
      try {
        await navigator.clipboard.writeText(fullUrl);
        window.alert(`검사 URL이 복사되었습니다.\n${fullUrl}`);
      } catch {
        window.prompt('아래 URL을 복사해서 사용하세요.', fullUrl);
      }
    } catch (error) {
      window.alert(error.message || 'URL 생성 중 오류가 발생했습니다.');
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
      const ageRange = parsed?.age_range;
      const start = Array.isArray(ageRange?.start_inclusive) ? Number(ageRange.start_inclusive[0]) : null;
      const endExclusive = Array.isArray(ageRange?.end_exclusive) ? Number(ageRange.end_exclusive[0]) : null;
      if (Number.isFinite(start) && Number.isFinite(endExclusive)) {
        if (endExclusive >= 100) {
          return `만 ${start}세 이상`;
        } else {
          return `만 ${start}~${Math.max(start, endExclusive - 1)}세`;
        }
      }
    } catch {
      return '';
    }
    return '';
  }

  function shortSubTag(subTest) {
    try {
      const parsed = JSON.parse(subTest.sub_test_json || '{}');
      const ageRange = parsed?.age_range;
      const start = Array.isArray(ageRange?.start_inclusive) ? Number(ageRange.start_inclusive[0]) : null;
      const endExclusive = Array.isArray(ageRange?.end_exclusive) ? Number(ageRange.end_exclusive[0]) : null;
      if (Number.isFinite(start) && Number.isFinite(endExclusive)) {
        if (endExclusive >= 100) {
          return `${start}세+`;
        }
        return `${start}-${Math.max(start, endExclusive - 1)}세`;
      }
    } catch {
      // pass
    }
    return '서브';
  }

  function collectScalesForTests(testIds) {
    const map = new Map();
    testIds.forEach((testId) => {
      const test = catalog.tests.find((it) => it.test_id === testId);
      if (!test || !test.sub_tests?.length) {
        return;
      }
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
    });
    return [...map.values()].map((item) => ({
      key: item.key,
      test_id: item.test_id,
      code: item.code,
      sub_products: item.sub_products,
      label: `${item.name} (${item.code}) - ${[...item.age_set].join(', ')}`
    }));
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
      const scales = collectScalesForTests(selectedTestIds());
      scaleListEl.innerHTML = '';
      scales.forEach((scale) => {
        const label = document.createElement('label');
        label.className = 'check-item';
        label.innerHTML = `
          <input type="checkbox" name="selected_scale_key" value="${scale.key}" />
          <span>${scale.label}</span>
        `;
        scaleListEl.appendChild(label);
      });
    });
  }

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
      for (const testId of selectedTests) {
        const selectedScales = selectedScaleKeys
          .map((key) => scaleMap.get(key))
          .filter((item) => item && item.test_id === testId);
        if (!selectedScales.length) {
          continue;
        }

        const selectedCodes = [...new Set(selectedScales.map((item) => item.code))];

        await api('/api/admin/custom-tests', {
          method: 'POST',
          body: JSON.stringify({
            custom_test_name: selectedTests.length > 1 ? `${baseName} (${testId})` : baseName,
            test_id: testId,
            selected_scale_codes: selectedCodes,
            additional_profile_fields: normalizedCustomFields
          })
        });
      }
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

  const test = catalog.tests.find((it) => it.test_id === detail.test_id);
  const subIndex = test ? test.sub_tests.findIndex((s) => s.sub_test_json === detail.sub_test_json) : -1;
  if (!test) {
    msg.textContent = '원본 검사 정보를 찾을 수 없습니다.';
    msg.className = 'message error';
    detailSelectedScaleCount.textContent = '-';
    detailSelectedItemCount.textContent = '-';
    detailResponseType.textContent = '-';
    return;
  }

  const selectedCodes = new Set(detail.selected_scale_codes || []);
  const matchedSubs = subIndex >= 0
    ? [test.sub_tests[subIndex]]
    : (test.sub_tests || []).filter((sub) => (sub.scales || []).some((scale) => selectedCodes.has(scale.code)));
  const selectedScaleMap = new Map();
  matchedSubs.forEach((sub) => {
    (sub.scales || []).forEach((scale) => {
      if (!selectedCodes.has(scale.code)) {
        return;
      }
      const current = selectedScaleMap.get(String(scale.code));
      const nextItemIds = new Set([...(current?.item_ids || []), ...((scale.item_ids || []).map((itemId) => String(itemId)))]);
      selectedScaleMap.set(String(scale.code), {
        code: String(scale.code),
        name: scale.name || scale.code,
        item_ids: [...nextItemIds]
      });
    });
  });
  const selectedScales = [...selectedScaleMap.values()];
  const selectedItemIds = new Set();
  selectedScales.forEach((scale) => {
    (scale.item_ids || []).forEach((itemId) => selectedItemIds.add(String(itemId)));
  });

  const responseSub = matchedSubs.find((sub) => Array.isArray(sub.response_options) && sub.response_options.length) || matchedSubs[0] || null;
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
  const childMap = new Map();
  selectedScales.forEach((scale) => {
    const code = String(scale.code || '');
    if (!code.includes('-')) {
      return;
    }
    const parentCode = code.split('-')[0];
    if (!childMap.has(parentCode)) {
      childMap.set(parentCode, []);
    }
    childMap.get(parentCode).push(scale);
  });

  const parentOrStandalone = [];
  const orphanChildren = [];
  selectedScales.forEach((scale) => {
    const code = String(scale.code || '');
    if (!code.includes('-')) {
      parentOrStandalone.push(scale);
      return;
    }
    const parentCode = code.split('-')[0];
    if (!selectedScaleMap.has(parentCode)) {
      orphanChildren.push(scale);
    }
  });

  parentOrStandalone
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .forEach((scale) => {
      const code = String(scale.code);
      const children = (childMap.get(code) || []).sort((a, b) => String(a.code).localeCompare(String(b.code)));
      if (!children.length) {
        const label = document.createElement('label');
        label.className = 'check-item';
        label.innerHTML = `<span>${escapeHtml(scale.name || scale.code)} (${escapeHtml(scale.code)})</span>`;
        scaleList.appendChild(label);
        return;
      }

      const block = document.createElement('div');
      block.className = 'detail-scale-group';
      const childId = `detail-scale-children-${code}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      block.innerHTML = `
        <div class="detail-scale-group-head">
          <span>${escapeHtml(scale.name || scale.code)} (${escapeHtml(scale.code)})</span>
          <button type="button" class="detail-scale-toggle" data-role="toggle-scale-children" data-target="${childId}">
            <span class="arrow">▼</span>
          </button>
        </div>
        <ul id="${childId}" class="detail-scale-children hidden">
          ${children
            .map((child) => `<li>${escapeHtml(child.name || child.code)} (${escapeHtml(child.code)})</li>`)
            .join('')}
        </ul>
      `;
      scaleList.appendChild(block);
    });

  orphanChildren
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .forEach((scale) => {
      const label = document.createElement('label');
      label.className = 'check-item';
      label.innerHTML = `<span>${escapeHtml(scale.name || scale.code)} (${escapeHtml(scale.code)})</span>`;
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
  if (page === 'admin-test-detail') {
    await initTestDetailPage();
  }
})();
