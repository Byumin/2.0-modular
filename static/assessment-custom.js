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

function getAccessTokenFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

function schoolAgeOptions() {
  return [
    '미취학',
    '초등 1학년',
    '초등 2학년',
    '초등 3학년',
    '초등 4학년',
    '초등 5학년',
    '초등 6학년',
    '중등 1학년',
    '중등 2학년',
    '중등 3학년',
    '고등 1학년',
    '고등 2학년',
    '고등 3학년'
  ];
}

const SUPPORTED_ADDITIONAL_FIELD_TYPES = new Set([
  'short_text',
  'long_text',
  'number',
  'date',
  'select',
  'multi_select',
  'phone',
  'email'
]);

function isOptionFieldType(type) {
  return type === 'select' || type === 'multi_select';
}

const QUESTION_PAGE_SIZE = 5;

function normalizeAdditionalProfileFields(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const label = item.trim();
      if (!label) {
        continue;
      }
      normalized.push({
        label,
        type: 'short_text',
        required: true,
        placeholder: '',
        options: []
      });
      continue;
    }
    if (!item || typeof item !== 'object') {
      continue;
    }
    const label = String(item.label || '').trim();
    if (!label) {
      continue;
    }
    const type = SUPPORTED_ADDITIONAL_FIELD_TYPES.has(String(item.type || ''))
      ? String(item.type)
      : 'short_text';
    const options = isOptionFieldType(type) && Array.isArray(item.options)
      ? item.options.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    normalized.push({
      label,
      type,
      required: Boolean(item.required),
      placeholder: String(item.placeholder || '').trim(),
      options
    });
  }
  return normalized;
}

function chunkQuestions(items, pageSize = QUESTION_PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

function questionInputName(itemId) {
  return `q_${itemId}`;
}

function renderQuestionCards(container, pageItems, options, answerState) {
  container.innerHTML = '';

  pageItems.forEach((item, idx) => {
    const card = document.createElement('article');
    card.className = 'assessment-question-card';
    card.dataset.itemId = String(item.id);
    card.id = `question-card-${item.id}`;
    card.tabIndex = -1;

    const answerValue = answerState[String(item.id)] ?? '';
    const absoluteIndex = Number(item.order_index || idx + 1);

    if (options.length) {
      card.innerHTML = `
        <div class="assessment-question-head">
          <span class="assessment-question-number">Q${absoluteIndex}</span>
        </div>
        <p class="assessment-question-text">${escapeHtml(item.text)}</p>
        <div class="assessment-option-grid" role="radiogroup" aria-label="문항 ${absoluteIndex} 응답">
          ${options
            .map((opt, optionIdx) => {
              const checked = String(answerValue) === String(opt.value);
              return `
                <label class="assessment-option-card${checked ? ' is-selected' : ''}" tabindex="0" role="radio" aria-checked="${checked ? 'true' : 'false'}" data-item-id="${escapeHtml(item.id)}" data-option-index="${optionIdx}">
                  <input type="radio" name="${questionInputName(escapeHtml(item.id))}" value="${escapeHtml(opt.value)}" ${checked ? 'checked' : ''} />
                  <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
                  <span class="assessment-option-label">${escapeHtml(opt.label)}</span>
                </label>
              `;
            })
            .join('')}
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="assessment-question-head">
          <span class="assessment-question-number">Q${absoluteIndex}</span>
        </div>
        <p class="assessment-question-text">${escapeHtml(item.text)}</p>
        <input
          class="assessment-text-answer"
          name="${questionInputName(escapeHtml(item.id))}"
          type="text"
          placeholder="응답 입력"
          value="${escapeHtml(answerValue)}"
        />
      `;
    }

    if (String(answerValue).trim()) {
      card.classList.add('is-answered');
    }
    container.appendChild(card);
  });
}

function renderQuestionNav(container, items, currentPage, answerState, onSelect, layoutMode) {
  if (!container) {
    return;
  }
  container.innerHTML = '';

  items.forEach((item, idx) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'assessment-question-chip';
    const isCurrent = layoutMode === 'step'
      ? idx === currentPage
      : Math.floor(idx / QUESTION_PAGE_SIZE) === currentPage;
    if (isCurrent) {
      button.classList.add('is-current');
    }
    if (String(answerState[String(item.id)] || '').trim()) {
      button.classList.add('is-answered');
    }
    button.textContent = String(idx + 1);
    button.setAttribute('aria-label', `${idx + 1}번 문항으로 이동`);
    button.addEventListener('click', () => onSelect(idx));
    container.appendChild(button);
  });
}

function setQuestionCardState(container, itemId, { answered = false, missing = false } = {}) {
  const card = container.querySelector(`[data-item-id="${itemId}"]`);
  if (!card) {
    return;
  }
  card.classList.toggle('is-answered', answered);
  card.classList.toggle('is-missing', missing);
  card.querySelectorAll('.assessment-option-card').forEach((optionCard) => {
    const input = optionCard.querySelector('input[type="radio"]');
    optionCard.classList.toggle('is-selected', Boolean(input?.checked));
    optionCard.setAttribute('aria-checked', input?.checked ? 'true' : 'false');
  });
}

function renderStepQuestion(container, item, options, answerState, totalCount) {
  container.innerHTML = '';
  container.classList.add('is-step-mode');
  container.classList.remove('step-transition-enter');
  window.requestAnimationFrame(() => {
    container.classList.add('step-transition-enter');
  });

  const answerValue = answerState[String(item.id)] ?? '';
  const frame = document.createElement('section');
  frame.className = 'assessment-step-stage';
  frame.innerHTML = `
    <article class="assessment-step-frame">
      <div class="assessment-step-head">
        <div class="assessment-step-copy">
          <p class="assessment-step-kicker">Focused Step</p>
          <h3 class="assessment-step-title">${item.order_index} / ${totalCount}</h3>
          <p class="assessment-step-sub">한 문항에만 집중해서 응답한 뒤 다음 문항으로 이동할 수 있습니다.</p>
        </div>
        <span class="assessment-step-badge">${String(answerValue).trim() ? '응답 완료' : '응답 필요'}</span>
      </div>
    </article>
  `;

  const cardHost = document.createElement('div');
  frame.appendChild(cardHost);
  renderQuestionCards(cardHost, [item], options, answerState);

  const footer = document.createElement('div');
  footer.className = 'assessment-step-footer';
  footer.innerHTML = `
    <p class="assessment-step-hint">집중형 모드에서는 한 문항씩 확인하며 진행합니다.</p>
  `;
  frame.appendChild(footer);

  container.appendChild(frame);
}

function parseRequiredFromSubTestJson(subTestJson) {
  try {
    const parsed = JSON.parse(subTestJson || '{}');
    const required = [];
    const variants = Array.isArray(parsed.sub_tests) ? parsed.sub_tests : [parsed];
    variants.forEach((variant) => {
      if (!variant || typeof variant !== 'object') {
        return;
      }
      if (!required.includes('gender') && Array.isArray(variant.gender) && variant.gender.length) {
        required.push('gender');
      }
      if (!required.includes('birth_day') && variant.age_range && typeof variant.age_range === 'object') {
        required.push('birth_day');
      }
      const schoolRaw = variant.school_ages || variant.school_age || variant.school_grades || variant.school_grade || variant.grades || variant.grade;
      if (
        !required.includes('school_age')
        && ((Array.isArray(schoolRaw) && schoolRaw.length) || (typeof schoolRaw === 'string' && schoolRaw.trim()))
      ) {
        required.push('school_age');
      }
    });
    return required;
  } catch {
    return [];
  }
}

function completionStorageKey(token) {
  return `assessment_done_${token}`;
}

(async function init() {
  const token = getAccessTokenFromPath();
  const titleEl = document.getElementById('assessmentTitle');
  const subEl = document.getElementById('assessmentSub');
  const form = document.getElementById('customAssessmentForm');
  const assessmentShellEl = document.querySelector('.assessment-shell');
  const profileStep = document.getElementById('profileStep');
  const questionStep = document.getElementById('questionStep');
  const completeStep = document.getElementById('completeStep');
  const requiredProfileFieldsWrap = document.getElementById('requiredProfileFieldsWrap');
  const extraProfileFieldsWrap = document.getElementById('extraProfileFieldsWrap');
  const goQuestionsBtn = document.getElementById('goQuestionsBtn');
  const questionsEl = document.getElementById('customAssessmentQuestions');
  const profileSummaryText = document.getElementById('profileSummaryText');
  const submitBtn = document.getElementById('customAssessmentSubmitBtn');
  const messageEl = document.getElementById('customAssessmentMessage');
  const progressTextEl = document.getElementById('assessmentProgressText');
  const progressMetaEl = document.getElementById('assessmentProgressMeta');
  const progressFillEl = document.getElementById('assessmentProgressFill');
  const missingCountEl = document.getElementById('assessmentMissingCount');
  const questionNavEl = document.getElementById('assessmentQuestionNav');
  const pageLabelEl = document.getElementById('assessmentPageLabel');
  const questionPrevBtn = document.getElementById('questionPrevBtn');
  const questionNextBtn = document.getElementById('questionNextBtn');
  const viewModeCardsBtn = document.getElementById('viewModeCardsBtn');
  const viewModeStepBtn = document.getElementById('viewModeStepBtn');
  const completeConfirmBtn = document.getElementById('completeConfirmBtn');
  const completeCloseBtn = document.getElementById('completeCloseBtn');

  if (!token) {
    messageEl.textContent = '유효하지 않은 접근입니다.';
    messageEl.className = 'message error';
    submitBtn.disabled = true;
    return;
  }

  let payload = null;
  try {
    payload = await api(`/api/assessment-links/${token}`);
  } catch (error) {
    messageEl.textContent = error.message;
    messageEl.className = 'message error';
    submitBtn.disabled = true;
    goQuestionsBtn.disabled = true;
    return;
  }

  titleEl.textContent = payload.custom_test_name || '검사 실시';
  const questionItems = [];
  const questionOptions = [];
  const answerState = {};
  let currentQuestionPage = 0;
  let currentLayoutMode = 'cards';
  let shouldCenterOnRender = false;
  let isSubmitting = false;
  let isCompleted = false;

  const requiredFieldKeys = Array.isArray(payload.required_profile_fields) && payload.required_profile_fields.length
    ? payload.required_profile_fields.map((x) => String(x))
    : parseRequiredFromSubTestJson(payload.sub_test_json || '');
  const requiredLabelMap = {
    name: '이름',
    gender: '성별',
    birth_day: '생년월일',
    school_age: '학령'
  };

  const requiredLabelSet = new Set(Object.values(requiredLabelMap).map((x) => x.toLowerCase()));
  const additionalProfileFields = normalizeAdditionalProfileFields(payload.additional_profile_fields)
    .filter((field) => !requiredLabelSet.has(field.label.toLowerCase()));

  function applyAssessmentPayload(nextPayload) {
    const nextItems = (nextPayload?.items || []).map((item, idx) => ({
      ...item,
      order_index: idx + 1
    }));
    const nextOptions = Array.isArray(nextPayload?.response_options) ? nextPayload.response_options : [];

    questionItems.splice(0, questionItems.length, ...nextItems);
    questionOptions.splice(0, questionOptions.length, ...nextOptions);

    Object.keys(answerState).forEach((key) => {
      delete answerState[key];
    });
    currentQuestionPage = 0;
    shouldCenterOnRender = true;
    subEl.textContent = `총 ${nextPayload?.item_count || nextItems.length}문항`;
  }

  function createProfileFieldBlock({ id, label, required = false, span = 'half' }) {
    const block = document.createElement('div');
    block.className = `assessment-input-block assessment-input-block--${span}`;
    const labelEl = document.createElement('label');
    if (id) {
      labelEl.setAttribute('for', id);
    }
    labelEl.innerHTML = required
      ? `${escapeHtml(label)} <span class="required">*</span>`
      : escapeHtml(label);
    const controlWrap = document.createElement('div');
    controlWrap.className = 'assessment-input-control';
    block.appendChild(labelEl);
    block.appendChild(controlWrap);
    return { block, controlWrap };
  }

  function profileFieldLayoutByType(type, label) {
    const normalizedLabel = String(label || '').toLowerCase();
    const isPhoneLike = type === 'phone' || normalizedLabel.includes('전화');
    if (isPhoneLike) {
      return { span: 'full' };
    }
    if (type === 'multi_select' || type === 'long_text' || type === 'email') {
      return { span: 'full' };
    }
    return { span: 'full' };
  }

  function renderRequiredProfileFields() {
    requiredProfileFieldsWrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'assessment-profile-grid assessment-profile-grid--required';

    const { block: nameBlock, controlWrap: nameWrap } = createProfileFieldBlock({
      id: 'required_name',
      label: '이름',
      required: true,
      span: 'full'
    });
    const nameInput = document.createElement('input');
    nameInput.id = 'required_name';
    nameInput.type = 'text';
    nameInput.required = true;
    nameInput.maxLength = 60;
    nameInput.placeholder = '이름 입력';
    nameWrap.appendChild(nameInput);
    grid.appendChild(nameBlock);

    requiredFieldKeys.forEach((key) => {
      if (key === 'name') {
        return;
      }
      if (key === 'gender') {
        const { block, controlWrap } = createProfileFieldBlock({
          label: '성별',
          required: true,
          span: 'half'
        });
        const group = document.createElement('div');
        group.className = 'gender-group assessment-gender-group';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', '성별');
        group.innerHTML = `
          <label class="radio-pill">
            <input type="radio" name="required_gender" value="male" />
            <span>남</span>
          </label>
          <label class="radio-pill">
            <input type="radio" name="required_gender" value="female" />
            <span>여</span>
          </label>
        `;
        controlWrap.appendChild(group);
        grid.appendChild(block);
        return;
      }

      if (key === 'birth_day') {
        const { block, controlWrap } = createProfileFieldBlock({
          id: 'required_birth_day',
          label: '생년월일',
          required: true,
          span: 'half'
        });
        const input = document.createElement('input');
        input.id = 'required_birth_day';
        input.type = 'date';
        input.required = true;
        controlWrap.appendChild(input);
        grid.appendChild(block);
        return;
      }

      if (key === 'school_age') {
        const { block, controlWrap } = createProfileFieldBlock({
          id: 'required_school_age',
          label: '학령',
          required: true,
          span: 'full'
        });
        const select = document.createElement('select');
        select.id = 'required_school_age';
        select.required = true;
        select.innerHTML = '<option value="" selected disabled>학령을 선택하세요</option>';
        schoolAgeOptions().forEach((optionText) => {
          const option = document.createElement('option');
          option.value = optionText;
          option.textContent = optionText;
          select.appendChild(option);
        });
        controlWrap.appendChild(select);
        grid.appendChild(block);
      }
    });

    requiredProfileFieldsWrap.appendChild(grid);
  }

  function renderAdditionalProfileFields() {
    extraProfileFieldsWrap.innerHTML = '';
    if (!additionalProfileFields.length) {
      extraProfileFieldsWrap.classList.add('hidden');
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'assessment-profile-grid assessment-profile-grid--extra';

    additionalProfileFields.forEach((field, idx) => {
      const id = `extraProfileField_${idx}`;
      const { span } = profileFieldLayoutByType(field.type, field.label);
      const { block, controlWrap } = createProfileFieldBlock({
        id,
        label: field.label,
        required: field.required,
        span
      });

      if (field.type === 'long_text') {
        const textarea = document.createElement('textarea');
        textarea.id = id;
        textarea.name = `extra_profile_${idx}`;
        textarea.rows = 3;
        textarea.maxLength = 500;
        textarea.required = field.required;
        textarea.dataset.fieldLabel = field.label;
        textarea.dataset.fieldIndex = String(idx);
        textarea.dataset.fieldType = field.type;
        textarea.placeholder = field.placeholder || `${field.label} 입력`;
        controlWrap.appendChild(textarea);
        grid.appendChild(block);
        return;
      }

      if (field.type === 'select') {
        const select = document.createElement('select');
        select.id = id;
        select.name = `extra_profile_${idx}`;
        select.required = field.required;
        select.dataset.fieldLabel = field.label;
        select.dataset.fieldIndex = String(idx);
        select.dataset.fieldType = field.type;
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = field.placeholder || `${field.label} 선택`;
        defaultOption.selected = true;
        defaultOption.disabled = true;
        select.appendChild(defaultOption);
        field.options.forEach((optionText) => {
          const option = document.createElement('option');
          option.value = optionText;
          option.textContent = optionText;
          select.appendChild(option);
        });
        controlWrap.appendChild(select);
        grid.appendChild(block);
        return;
      }

      if (field.type === 'multi_select') {
        const group = document.createElement('div');
        group.className = 'check-list';
        group.dataset.fieldLabel = field.label;
        group.dataset.fieldIndex = String(idx);
        group.dataset.fieldType = field.type;
        field.options.forEach((optionText, optIdx) => {
          const optId = `${id}_opt_${optIdx}`;
          const row = document.createElement('label');
          row.className = 'check-item';
          row.innerHTML = `
            <input type="checkbox" id="${optId}" value="${escapeHtml(optionText)}" data-role="extra-multi-option" data-field-index="${idx}" />
            <span>${escapeHtml(optionText)}</span>
          `;
          group.appendChild(row);
        });
        controlWrap.appendChild(group);
        grid.appendChild(block);
        return;
      }

      const input = document.createElement('input');
      input.id = id;
      input.name = `extra_profile_${idx}`;
      input.required = field.required;
      input.dataset.fieldLabel = field.label;
      input.dataset.fieldIndex = String(idx);
      input.dataset.fieldType = field.type;
      input.placeholder = field.placeholder || `${field.label} 입력`;
      if (field.type === 'number') {
        input.type = 'number';
      } else if (field.type === 'date') {
        input.type = 'date';
      } else if (field.type === 'phone') {
        input.type = 'tel';
        input.maxLength = 20;
      } else if (field.type === 'email') {
        input.type = 'email';
        input.maxLength = 120;
      } else {
        input.type = 'text';
        input.maxLength = 120;
      }
      controlWrap.appendChild(input);
      grid.appendChild(block);
    });
    extraProfileFieldsWrap.appendChild(grid);
    extraProfileFieldsWrap.classList.remove('hidden');
  }

  renderRequiredProfileFields();
  renderAdditionalProfileFields();
  applyAssessmentPayload(payload);

  function answeredCount() {
    return questionItems.filter((item) => String(answerState[String(item.id)] || '').trim()).length;
  }

  function firstMissingIndex() {
    return questionItems.findIndex((item) => !String(answerState[String(item.id)] || '').trim());
  }

  function syncViewModeButtons() {
    viewModeCardsBtn.classList.toggle('is-active', currentLayoutMode === 'cards');
    viewModeStepBtn.classList.toggle('is-active', currentLayoutMode === 'step');
    viewModeCardsBtn.setAttribute('aria-pressed', String(currentLayoutMode === 'cards'));
    viewModeStepBtn.setAttribute('aria-pressed', String(currentLayoutMode === 'step'));
  }

  function getCurrentPageItems() {
    if (currentLayoutMode === 'step') {
      return [questionItems[currentQuestionPage]].filter(Boolean);
    }
    const pages = chunkQuestions(questionItems);
    return pages[currentQuestionPage] || [];
  }

  function centerQuestionCard(itemId, { focus = false } = {}) {
    const card = document.getElementById(`question-card-${itemId}`);
    if (!card) {
      return;
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (focus) {
      const focusTarget = card.querySelector('.assessment-option-card, .assessment-text-answer');
      focusTarget?.focus?.({ preventScroll: true });
    }
  }

  function findFirstMissingInCurrentPage() {
    const currentItems = getCurrentPageItems();
    return currentItems.find((item) => !String(answerState[String(item.id)] || '').trim()) || null;
  }

  function findNextMissingInCurrentPage(fromItemId) {
    const currentItems = getCurrentPageItems();
    const startIndex = currentItems.findIndex((item) => String(item.id) === String(fromItemId));
    for (let i = startIndex + 1; i < currentItems.length; i += 1) {
      if (!String(answerState[String(currentItems[i].id)] || '').trim()) {
        return currentItems[i];
      }
    }
    return currentItems.find((item) => !String(answerState[String(item.id)] || '').trim()) || null;
  }

  function getActiveQuestionCardForHotkey() {
    if (currentLayoutMode === 'step') {
      const item = questionItems[currentQuestionPage];
      return item ? document.getElementById(`question-card-${item.id}`) : null;
    }
    const currentItems = getCurrentPageItems();
    const targetItem = currentItems.find((item) => !String(answerState[String(item.id)] || '').trim()) || currentItems[0];
    return targetItem ? document.getElementById(`question-card-${targetItem.id}`) : null;
  }

  function selectOptionByNumber(optionNumber) {
    const card = getActiveQuestionCardForHotkey();
    if (!(card instanceof HTMLElement)) {
      return false;
    }
    const options = [...card.querySelectorAll('.assessment-option-card input[type="radio"]')];
    const targetInput = options[optionNumber - 1];
    if (!(targetInput instanceof HTMLInputElement)) {
      return false;
    }
    targetInput.click();
    targetInput.closest('.assessment-option-card')?.focus();
    const itemId = card.dataset.itemId;
    if (itemId) {
      centerQuestionCard(itemId);
    }
    return true;
  }

  function renderQuestionWorkspace() {
    const pages = chunkQuestions(questionItems);
    const safePageCount = Math.max(1, pages.length);
    const maxIndex = currentLayoutMode === 'step'
      ? Math.max(questionItems.length - 1, 0)
      : safePageCount - 1;
    currentQuestionPage = Math.min(Math.max(currentQuestionPage, 0), maxIndex);
    syncViewModeButtons();

    const currentItems = currentLayoutMode === 'step'
      ? [questionItems[currentQuestionPage]].filter(Boolean)
      : (pages[currentQuestionPage] || []);
    if (currentLayoutMode === 'step') {
      const activeItem = currentItems[0] || questionItems[0];
      renderStepQuestion(questionsEl, activeItem, questionOptions, answerState, questionItems.length);
    } else {
      questionsEl.classList.remove('is-step-mode');
      renderQuestionCards(questionsEl, currentItems, questionOptions, answerState);
    }

    renderQuestionNav(questionNavEl, questionItems, currentQuestionPage, answerState, (questionIndex) => {
      currentQuestionPage = currentLayoutMode === 'step'
        ? questionIndex
        : Math.floor(questionIndex / QUESTION_PAGE_SIZE);
      renderQuestionWorkspace();
      const targetCard = document.getElementById(`question-card-${questionItems[questionIndex].id}`);
      targetCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetCard?.focus?.();
    }, currentLayoutMode);

    const answered = answeredCount();
    const total = questionItems.length;
    const percent = total ? Math.round((answered / total) * 100) : 0;
    const missing = total - answered;

    progressTextEl.textContent = `${answered} / ${total} 문항 응답`;
    progressMetaEl.textContent = missing === 0
      ? '모든 문항 응답이 완료되었습니다.'
      : `현재 ${percent}% 완료, 미응답 ${missing}문항 남음`;
    progressFillEl.style.width = `${percent}%`;
    missingCountEl.textContent = `미응답 ${missing}`;
    missingCountEl.classList.toggle('is-complete', missing === 0);
    pageLabelEl.textContent = currentLayoutMode === 'step'
      ? `${currentQuestionPage + 1} / ${questionItems.length} 문항`
      : `${currentQuestionPage + 1} / ${safePageCount} 페이지`;
    questionPrevBtn.disabled = currentQuestionPage === 0;
    questionNextBtn.disabled = currentQuestionPage >= (currentLayoutMode === 'step' ? questionItems.length - 1 : safePageCount - 1);
    questionPrevBtn.textContent = '이전 문항';
    questionNextBtn.textContent = '다음 문항';
    const maxPage = currentLayoutMode === 'step' ? questionItems.length - 1 : safePageCount - 1;
    const isLastPage = currentQuestionPage >= maxPage;
    submitBtn.textContent = isLastPage ? '제출' : '다음';
    submitBtn.dataset.action = isLastPage ? 'submit' : 'next';

    (currentLayoutMode === 'step' ? [questionItems[currentQuestionPage]].filter(Boolean) : currentItems).forEach((item) => {
      const value = String(answerState[String(item.id)] || '').trim();
      setQuestionCardState(questionsEl, String(item.id), { answered: Boolean(value), missing: false });
    });

    if (shouldCenterOnRender) {
      const targetItem = currentLayoutMode === 'step'
        ? questionItems[currentQuestionPage]
        : (findFirstMissingInCurrentPage() || currentItems[0]);
      if (targetItem) {
        window.requestAnimationFrame(() => {
          centerQuestionCard(String(targetItem.id));
        });
      }
      shouldCenterOnRender = false;
    }
  }

  function moveToFirstMissing({ emphasize = false } = {}) {
    const missingIndex = firstMissingIndex();
    if (missingIndex < 0) {
      return false;
    }

    currentQuestionPage = currentLayoutMode === 'step'
      ? missingIndex
      : Math.floor(missingIndex / QUESTION_PAGE_SIZE);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();

    const missingItem = questionItems[missingIndex];
    if (emphasize) {
      setQuestionCardState(questionsEl, String(missingItem.id), { answered: false, missing: true });
    }
    centerQuestionCard(String(missingItem.id));
    return true;
  }

  questionPrevBtn.addEventListener('click', () => {
    currentQuestionPage = Math.max(0, currentQuestionPage - 1);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  questionNextBtn.addEventListener('click', () => {
    const maxPage = currentLayoutMode === 'step' ? questionItems.length - 1 : chunkQuestions(questionItems).length - 1;
    currentQuestionPage = Math.min(maxPage, currentQuestionPage + 1);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  viewModeCardsBtn.addEventListener('click', () => {
    if (currentLayoutMode === 'cards') {
      return;
    }
    currentQuestionPage = Math.floor(currentQuestionPage / QUESTION_PAGE_SIZE);
    currentLayoutMode = 'cards';
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  viewModeStepBtn.addEventListener('click', () => {
    if (currentLayoutMode === 'step') {
      return;
    }
    currentQuestionPage = Math.min(currentQuestionPage * QUESTION_PAGE_SIZE, Math.max(questionItems.length - 1, 0));
    currentLayoutMode = 'step';
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  questionsEl.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const optionCard = target.closest('.assessment-option-card');
    if (optionCard instanceof HTMLElement) {
      const input = optionCard.querySelector('input[type="radio"]');
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        input.click();
        return;
      }

      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const allInputs = [...questionsEl.querySelectorAll('input[type="radio"]')]
          .filter((radio) => radio instanceof HTMLInputElement && radio.name === input.name);
        const currentIndex = allInputs.findIndex((radio) => radio === input);
        if (currentIndex < 0 || allInputs.length === 0) {
          return;
        }
        const delta = (event.key === 'ArrowRight' || event.key === 'ArrowDown') ? 1 : -1;
        const nextIndex = (currentIndex + delta + allInputs.length) % allInputs.length;
        const nextInput = allInputs[nextIndex];
        if (nextInput instanceof HTMLInputElement) {
          nextInput.click();
          nextInput.closest('.assessment-option-card')?.focus();
        }
        return;
      }
    }

    if (/^[1-9]$/.test(event.key)) {
      const questionCard = target.closest('.assessment-question-card');
      if (!(questionCard instanceof HTMLElement)) {
        return;
      }
      const optionInputs = [...questionCard.querySelectorAll('.assessment-option-card input[type="radio"]')];
      const targetIndex = Number(event.key) - 1;
      if (targetIndex >= 0 && targetIndex < optionInputs.length) {
        event.preventDefault();
        const targetInput = optionInputs[targetIndex];
        if (targetInput instanceof HTMLInputElement) {
          targetInput.click();
          targetInput.closest('.assessment-option-card')?.focus();
        }
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (questionStep.classList.contains('hidden')) {
      return;
    }
    if (isSubmitting || isCompleted) {
      return;
    }
    if (!/^[1-9]$/.test(event.key)) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLSelectElement) {
      // Do not hijack keyboard while user is typing/selecting in form controls.
      if (!activeEl.closest('.assessment-option-card')) {
        return;
      }
    }

    const picked = selectOptionByNumber(Number(event.key));
    if (picked) {
      event.preventDefault();
    }
  });

  questionsEl.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.type === 'radio') {
      const itemId = String(target.name || '').replace(/^q_/, '');
      if (!itemId) {
        return;
      }
      answerState[itemId] = String(target.value || '');
      setQuestionCardState(questionsEl, itemId, { answered: true, missing: false });
      if (currentLayoutMode === 'cards') {
        const pages = chunkQuestions(questionItems);
        const currentItems = pages[currentQuestionPage] || [];
        const pageAllAnswered = currentItems.length > 0
          && currentItems.every((item) => String(answerState[String(item.id)] || '').trim());
        const maxPage = Math.max(pages.length - 1, 0);
        if (pageAllAnswered && currentQuestionPage < maxPage) {
          window.setTimeout(() => {
            currentQuestionPage = Math.min(maxPage, currentQuestionPage + 1);
            shouldCenterOnRender = true;
            renderQuestionWorkspace();
          }, 140);
          return;
        }
      }
      renderQuestionWorkspace();
      if (currentLayoutMode === 'cards') {
        const nextMissing = findNextMissingInCurrentPage(itemId);
        if (nextMissing) {
          centerQuestionCard(String(nextMissing.id));
        }
      }
      if (currentLayoutMode === 'step' && currentQuestionPage < questionItems.length - 1) {
        window.setTimeout(() => {
          currentQuestionPage = Math.min(questionItems.length - 1, currentQuestionPage + 1);
          shouldCenterOnRender = true;
          renderQuestionWorkspace();
        }, 140);
      }
      return;
    }
    if (target.classList.contains('assessment-text-answer')) {
      const itemId = String(target.name || '').replace(/^q_/, '');
      if (!itemId) {
        return;
      }
      answerState[itemId] = String(target.value || '').trim();
      setQuestionCardState(questionsEl, itemId, {
        answered: Boolean(String(target.value || '').trim()),
        missing: false
      });
      renderQuestionWorkspace();
    }
  });

  questionsEl.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('assessment-text-answer')) {
      return;
    }
    const itemId = String(target.name || '').replace(/^q_/, '');
    if (!itemId) {
      return;
    }
    answerState[itemId] = String(target.value || '').trim();
    setQuestionCardState(questionsEl, itemId, {
      answered: Boolean(String(target.value || '').trim()),
      missing: false
    });
  });

  shouldCenterOnRender = true;
  renderQuestionWorkspace();

  function collectProfileFromForm() {
    const profile = {};
    const requiredNameEl = document.getElementById('required_name');
    profile.name = requiredNameEl ? String(requiredNameEl.value || '').trim() : '';

    if (requiredFieldKeys.includes('gender')) {
      profile.gender = form.querySelector('input[name="required_gender"]:checked')?.value || '';
    }
    if (requiredFieldKeys.includes('birth_day')) {
      const el = document.getElementById('required_birth_day');
      profile.birth_day = el ? el.value : '';
    }
    if (requiredFieldKeys.includes('school_age')) {
      const el = document.getElementById('required_school_age');
      profile.school_age = el ? el.value : '';
    }

    additionalProfileFields.forEach((field, idx) => {
      if (field.type === 'multi_select') {
        const checked = [...extraProfileFieldsWrap.querySelectorAll(`input[data-role="extra-multi-option"][data-field-index="${idx}"]:checked`)]
          .map((el) => String(el.value || '').trim())
          .filter(Boolean);
        profile[field.label] = checked;
        return;
      }

      const selector = `[data-field-index="${idx}"][data-field-type="${field.type}"]`;
      const input = extraProfileFieldsWrap.querySelector(selector);
      if (!input) {
        profile[field.label] = '';
        return;
      }
      const value = 'value' in input ? input.value : '';
      profile[field.label] = String(value || '').trim();
    });
    return profile;
  }

  function validateProfile(profile) {
    if (!String(profile.name || '').trim()) {
      return '이름';
    }
    for (const key of requiredFieldKeys) {
      if (key === 'name') {
        continue;
      }
      if (!String(profile[key] || '').trim()) {
        return requiredLabelMap[key] || key;
      }
    }
    for (const field of additionalProfileFields) {
      if (!field.required) {
        continue;
      }
      if (field.type === 'multi_select') {
        if (!Array.isArray(profile[field.label]) || profile[field.label].length === 0) {
          return field.label;
        }
        continue;
      }
      if (!String(profile[field.label] || '').trim()) {
        return field.label;
      }
    }
    return '';
  }

  function showProfileStep() {
    if (isCompleted) {
      return;
    }
    profileStep.classList.remove('hidden');
    questionStep.classList.add('hidden');
    completeStep.classList.add('hidden');
    assessmentShellEl?.classList.remove('is-complete-step');
    assessmentShellEl?.classList.remove('is-question-step');
  }

  function showQuestionStep(profile) {
    if (isCompleted) {
      return;
    }
    const labels = [];
    if (String(profile.name || '').trim()) {
      labels.push(`이름: ${String(profile.name).trim()}`);
    }
    requiredFieldKeys.forEach((key) => {
      if (key === 'name') {
        return;
      }
      const value = String(profile[key] || '').trim();
      if (!value) {
        return;
      }
      if (key === 'gender') {
        labels.push(`성별: ${value === 'male' ? '남' : '여'}`);
        return;
      }
      labels.push(`${requiredLabelMap[key] || key}: ${value}`);
    });
    additionalProfileFields.forEach((field) => {
      const raw = profile[field.label];
      if (Array.isArray(raw)) {
        if (!raw.length) {
          return;
        }
        labels.push(`${field.label}: ${raw.join(', ')}`);
        return;
      }
      const value = String(raw || '').trim();
      if (!value) {
        return;
      }
      labels.push(`${field.label}: ${value}`);
    });
    profileSummaryText.textContent = labels.join(' / ') || '입력 정보 없음';
    profileStep.classList.add('hidden');
    questionStep.classList.remove('hidden');
    completeStep.classList.add('hidden');
    assessmentShellEl?.classList.remove('is-complete-step');
    assessmentShellEl?.classList.add('is-question-step');
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  }

  function showCompleteStep() {
    isCompleted = true;
    profileStep.classList.add('hidden');
    questionStep.classList.add('hidden');
    completeStep.classList.remove('hidden');
    assessmentShellEl?.classList.add('is-complete-step');
    assessmentShellEl?.classList.remove('is-question-step');
    messageEl.textContent = '';
    messageEl.className = 'message';
    try {
      sessionStorage.setItem(completionStorageKey(token), '1');
    } catch {
      // Ignore storage failures (private mode etc.)
    }
    history.replaceState({ assessmentDone: true }, '', window.location.pathname);
  }

  goQuestionsBtn.addEventListener('click', async () => {
    if (isCompleted) {
      return;
    }
    messageEl.textContent = '';
    const profile = collectProfileFromForm();
    const missing = validateProfile(profile);
    if (missing) {
      messageEl.textContent = `${missing} 항목을 입력해주세요.`;
      messageEl.className = 'message error';
      return;
    }
    goQuestionsBtn.disabled = true;
    try {
      const result = await api(`/api/assessment-links/${token}/validate-profile`, {
        method: 'POST',
        body: JSON.stringify({ profile })
      });
      if (result?.assessment_payload) {
        payload = result.assessment_payload;
        applyAssessmentPayload(payload);
      }
    } catch (error) {
      alert(error.message || '배정된 내담자 확인에 실패했습니다.');
      messageEl.textContent = error.message || '배정된 내담자 확인에 실패했습니다.';
      messageEl.className = 'message error';
      goQuestionsBtn.disabled = false;
      return;
    }
    if (!questionItems.length) {
      messageEl.textContent = '표시할 문항이 없습니다.';
      messageEl.className = 'message error';
      goQuestionsBtn.disabled = false;
      return;
    }
    goQuestionsBtn.disabled = false;
    showQuestionStep(profile);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (questionStep.classList.contains('hidden')) {
      return;
    }
    if (isCompleted || isSubmitting) {
      return;
    }
    messageEl.textContent = '';
    const maxPage = currentLayoutMode === 'step'
      ? questionItems.length - 1
      : chunkQuestions(questionItems).length - 1;
    if (currentQuestionPage < maxPage) {
      currentQuestionPage = Math.min(maxPage, currentQuestionPage + 1);
      shouldCenterOnRender = true;
      renderQuestionWorkspace();
      return;
    }

    const profile = collectProfileFromForm();
    const missing = validateProfile(profile);
    if (missing) {
      messageEl.textContent = `${missing} 항목을 입력해주세요.`;
      messageEl.className = 'message error';
      showProfileStep();
      return;
    }

    const answers = {};
    const missingIndex = firstMissingIndex();
    questionItems.forEach((item) => {
      const value = String(answerState[String(item.id)] || '').trim();
      if (value) {
        answers[String(item.id)] = value;
      }
    });

    if (missingIndex >= 0) {
      messageEl.textContent = '모든 문항에 응답해주세요.';
      messageEl.className = 'message error';
      moveToFirstMissing({ emphasize: true });
      return;
    }

    isSubmitting = true;
    submitBtn.disabled = true;
    const submitBtnBeforeLoading = submitBtn.textContent;
    submitBtn.textContent = '제출 중...';
    messageEl.textContent = '응답을 제출하는 중입니다.';
    messageEl.className = 'message';
    try {
      await api(`/api/assessment-links/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          responder_name: '',
          profile,
          answers
        })
      });
      showCompleteStep();
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = 'message error';
      submitBtn.textContent = submitBtnBeforeLoading;
      submitBtn.disabled = false;
      isSubmitting = false;
      renderQuestionWorkspace();
      return;
    }
    isSubmitting = false;
  });

  completeConfirmBtn?.addEventListener('click', () => {
    try {
      sessionStorage.removeItem(completionStorageKey(token));
    } catch {
      // Ignore storage failures
    }
    window.location.href = window.location.pathname;
  });

  completeCloseBtn?.addEventListener('click', () => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) {
        messageEl.textContent = '브라우저 탭 닫기 버튼으로 창을 닫아주세요.';
        messageEl.className = 'message';
      }
    }, 120);
  });

  try {
    if (sessionStorage.getItem(completionStorageKey(token)) === '1') {
      showCompleteStep();
    }
  } catch {
    // Ignore storage read failures
  }
})();
