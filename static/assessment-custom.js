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
    const detail = data.detail;
    const message = typeof detail === 'string'
      ? detail
      : String(detail?.message || data.message || '요청 처리 중 오류가 발생했습니다.');
    const error = new Error(message);
    error.status = response.status;
    error.code = typeof detail === 'object' && detail ? String(detail.code || '') : '';
    error.detail = detail;
    throw error;
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
const AUTO_CREATE_CONFIRM_REQUIRED_CODE = 'AUTO_CREATE_CONFIRM_REQUIRED';

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

function resolveRenderMode(item) {
  const renderType = String(item?.render_type || '').trim();
  if (renderType === 'likert') {
    return 'likert';
  }
  if (renderType.startsWith('bipolar')) {
    return 'bipolar';
  }

  const fallbackStyle = String(item?.response_style || '').trim();
  if (fallbackStyle === 'bipolar') {
    return 'bipolar';
  }
  return 'likert';
}

function resolveRenderType(item) {
  const renderType = String(item?.render_type || '').trim();
  if (renderType) {
    return renderType;
  }
  const fallbackStyle = String(item?.response_style || '').trim();
  if (fallbackStyle === 'bipolar') {
    return 'bipolar';
  }
  return 'likert';
}

function renderQuestionCards(container, pageItems, options, answerState) {
  container.innerHTML = '';

  pageItems.forEach((item, idx) => {
    const renderType = resolveRenderType(item);
    const matrixGroupKey = String(item?.matrix_group_key || '').trim();
    const hideEmptyLabels = Boolean(item?.render_config?.hide_empty_labels);

    if (renderType === 'likert_matrix' && matrixGroupKey) {
      const prev = idx > 0 ? pageItems[idx - 1] : null;
      const prevIsSameGroup = prev
        && resolveRenderType(prev) === 'likert_matrix'
        && String(prev?.matrix_group_key || '').trim() === matrixGroupKey;
      if (prevIsSameGroup) {
        return;
      }

      const groupItems = [];
      for (let cursor = idx; cursor < pageItems.length; cursor += 1) {
        const candidate = pageItems[cursor];
        const candidateType = resolveRenderType(candidate);
        const candidateKey = String(candidate?.matrix_group_key || '').trim();
        if (candidateType !== 'likert_matrix' || candidateKey !== matrixGroupKey) {
          break;
        }
        groupItems.push(candidate);
      }
      if (!groupItems.length) {
        return;
      }

      const first = groupItems[0];
      const absoluteIndex = Number(first.order_index || idx + 1);
      const groupPrompt = String(first?.matrix_group_prompt || first?.text || '').trim();
      const groupOptions = Array.isArray(first?.response_options) && first.response_options.length
        ? first.response_options
        : options;

      const matrixCard = document.createElement('article');
      matrixCard.className = 'assessment-question-card assessment-question-card--matrix';
      matrixCard.id = `question-card-${first.id}`;
      matrixCard.tabIndex = -1;

      const headerCells = groupOptions.map((opt) => {
        const label = String(opt.label || '').trim();
        const shouldHide = hideEmptyLabels && !label;
        const safeLabel = label ? escapeHtml(label) : '&nbsp;';
        return `
          <div class="assessment-matrix-header-cell">
            <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
            <span class="assessment-option-label${label ? '' : ' is-empty'}${shouldHide ? ' is-hidden' : ''}">${safeLabel}</span>
          </div>
        `;
      }).join('');

      const rowsHtml = groupItems.map((rowItem) => {
        const rowAnswer = answerState[String(rowItem.id)] ?? '';
        const rowAnsweredClass = String(rowAnswer).trim() ? ' is-answered' : '';
        return `
          <div class="assessment-matrix-row${rowAnsweredClass}" data-item-id="${escapeHtml(rowItem.id)}" id="question-card-${escapeHtml(rowItem.id)}">
            <p class="assessment-matrix-row-text">${escapeHtml(rowItem.text)}</p>
            <div class="assessment-matrix-row-options" role="radiogroup" aria-label="문항 ${escapeHtml(rowItem.order_index || '')} 응답">
              ${groupOptions
                .map((opt, optionIdx) => {
                  const checked = String(rowAnswer) === String(opt.value);
                  return `
                    <label class="assessment-option-card assessment-option-card--matrix${checked ? ' is-selected' : ''}" tabindex="0" role="radio" aria-checked="${checked ? 'true' : 'false'}" data-item-id="${escapeHtml(rowItem.id)}" data-option-index="${optionIdx}">
                      <input type="radio" name="${questionInputName(escapeHtml(rowItem.id))}" value="${escapeHtml(opt.value)}" ${checked ? 'checked' : ''} />
                      <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
                    </label>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      }).join('');

      matrixCard.innerHTML = `
        <div class="assessment-question-head">
          <span class="assessment-question-number">Q${absoluteIndex}</span>
        </div>
        <p class="assessment-question-text">${escapeHtml(groupPrompt)}</p>
        <section class="assessment-matrix-table">
          <header class="assessment-matrix-header">
            <div class="assessment-matrix-header-spacer" aria-hidden="true"></div>
            <div class="assessment-matrix-header-options">${headerCells}</div>
          </header>
          <div class="assessment-matrix-body">${rowsHtml}</div>
        </section>
      `;
      const answeredRows = groupItems.filter((rowItem) => String(answerState[String(rowItem.id)] || '').trim()).length;
      if (answeredRows > 0) {
        matrixCard.classList.add('is-answered');
      }
      container.appendChild(matrixCard);
      return;
    }

    const card = document.createElement('article');
    card.className = 'assessment-question-card';
    card.dataset.itemId = String(item.id);
    card.id = `question-card-${item.id}`;
    card.tabIndex = -1;

    const answerValue = answerState[String(item.id)] ?? '';
    const absoluteIndex = Number(item.order_index || idx + 1);
    const itemOptions = Array.isArray(item?.response_options) && item.response_options.length
      ? item.response_options
      : options;
    const renderMode = resolveRenderMode(item);

    if (itemOptions.length) {
      if (renderType === 'bipolar_with_prompt') {
        const leftOpt = itemOptions[0] || { value: '', label: '' };
        const rightOpt = itemOptions[itemOptions.length - 1] || { value: '', label: '' };
        const leftLabel = String(leftOpt.label || '').trim();
        const rightLabel = String(rightOpt.label || '').trim();
        const leftText = leftLabel || '&nbsp;';
        const rightText = rightLabel || '&nbsp;';
        const leftHiddenClass = hideEmptyLabels && !leftLabel ? ' is-hidden' : '';
        const rightHiddenClass = hideEmptyLabels && !rightLabel ? ' is-hidden' : '';

        card.innerHTML = `
          <div class="assessment-question-head">
            <span class="assessment-question-number">Q${absoluteIndex}</span>
          </div>
          <p class="assessment-question-text">${escapeHtml(item.text)}</p>
          <div class="assessment-bipolar-row">
            <p class="assessment-bipolar-anchor assessment-bipolar-anchor--left${leftHiddenClass}">${leftText}</p>
            <div class="assessment-bipolar-scale" role="radiogroup" aria-label="문항 ${absoluteIndex} 응답">
              ${itemOptions
                .map((opt, optionIdx) => {
                  const checked = String(answerValue) === String(opt.value);
                  return `
                    <label class="assessment-option-card assessment-option-card--bipolar${checked ? ' is-selected' : ''}" tabindex="0" role="radio" aria-checked="${checked ? 'true' : 'false'}" data-item-id="${escapeHtml(item.id)}" data-option-index="${optionIdx}">
                      <input type="radio" name="${questionInputName(escapeHtml(item.id))}" value="${escapeHtml(opt.value)}" ${checked ? 'checked' : ''} />
                      <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
                    </label>
                  `;
                })
                .join('')}
            </div>
            <p class="assessment-bipolar-anchor assessment-bipolar-anchor--right${rightHiddenClass}">${rightText}</p>
          </div>
        `;
      } else if (renderType === 'bipolar_labels_only') {
        const leftOpt = itemOptions[0] || { value: '', label: '' };
        const rightOpt = itemOptions[itemOptions.length - 1] || { value: '', label: '' };
        const leftLabel = String(leftOpt.label || '').trim();
        const rightLabel = String(rightOpt.label || '').trim();
        const leftText = leftLabel || '&nbsp;';
        const rightText = rightLabel || '&nbsp;';
        const leftHiddenClass = hideEmptyLabels && !leftLabel ? ' is-hidden' : '';
        const rightHiddenClass = hideEmptyLabels && !rightLabel ? ' is-hidden' : '';

        card.classList.add('assessment-question-card--labels-only');
        card.innerHTML = `
          <div class="assessment-question-head">
            <span class="assessment-question-number">Q${absoluteIndex}</span>
          </div>
          <div class="assessment-bipolar-row">
            <p class="assessment-bipolar-anchor assessment-bipolar-anchor--left${leftHiddenClass}">${leftText}</p>
            <div class="assessment-bipolar-scale" role="radiogroup" aria-label="문항 ${absoluteIndex} 응답">
              ${itemOptions
                .map((opt, optionIdx) => {
                  const checked = String(answerValue) === String(opt.value);
                  return `
                    <label class="assessment-option-card assessment-option-card--bipolar${checked ? ' is-selected' : ''}" tabindex="0" role="radio" aria-checked="${checked ? 'true' : 'false'}" data-item-id="${escapeHtml(item.id)}" data-option-index="${optionIdx}">
                      <input type="radio" name="${questionInputName(escapeHtml(item.id))}" value="${escapeHtml(opt.value)}" ${checked ? 'checked' : ''} />
                      <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
                    </label>
                  `;
                })
                .join('')}
            </div>
            <p class="assessment-bipolar-anchor assessment-bipolar-anchor--right${rightHiddenClass}">${rightText}</p>
          </div>
        `;
      } else {
      card.innerHTML = `
        <div class="assessment-question-head">
          <span class="assessment-question-number">Q${absoluteIndex}</span>
        </div>
        <p class="assessment-question-text">${escapeHtml(item.text)}</p>
        <div class="assessment-option-grid" role="radiogroup" aria-label="문항 ${absoluteIndex} 응답">
          ${itemOptions
            .map((opt, optionIdx) => {
              const checked = String(answerValue) === String(opt.value);
              const optionLabel = String(opt.label || '').trim();
              const safeLabel = optionLabel ? escapeHtml(optionLabel) : '&nbsp;';
              return `
                <label class="assessment-option-card${checked ? ' is-selected' : ''}${renderMode === 'bipolar' ? ' is-bipolar' : ''}" tabindex="0" role="radio" aria-checked="${checked ? 'true' : 'false'}" data-item-id="${escapeHtml(item.id)}" data-option-index="${optionIdx}">
                  <input type="radio" name="${questionInputName(escapeHtml(item.id))}" value="${escapeHtml(opt.value)}" ${checked ? 'checked' : ''} />
                  <span class="assessment-option-value">${escapeHtml(opt.value)}</span>
                  <span class="assessment-option-label${optionLabel ? '' : ' is-empty'}">${safeLabel}</span>
                </label>
              `;
            })
            .join('')}
        </div>
      `;
      }
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
  const card = document.getElementById(`question-card-${itemId}`);
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
  const unassignedClientModal = document.getElementById('unassignedClientModal');
  const unassignedClientModalProfile = document.getElementById('unassignedClientModalProfile');
  const unassignedClientCancelBtn = document.getElementById('unassignedClientCancelBtn');
  const unassignedClientConfirmBtn = document.getElementById('unassignedClientConfirmBtn');
  const defaultSubText = String(subEl?.textContent || '').trim();

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
  const questionParts = [];
  const questionItems = [];
  const questionOptions = [];
  const answerState = {};
  let currentPartIndex = 0;
  let currentQuestionPage = 0;
  let currentLayoutMode = 'cards';
  let shouldCenterOnRender = false;
  let isSubmitting = false;
  let isCompleted = false;
  let pendingAutoAdvanceTimer = null;
  let pendingRegistrationProfile = null;
  let isRegisteringClient = false;

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

  function totalQuestionCount() {
    return questionParts.reduce((sum, part) => sum + (Array.isArray(part.items) ? part.items.length : 0), 0);
  }

  function answeredCount() {
    return questionParts.reduce(
      (sum, part) => sum + (Array.isArray(part.items) ? part.items.filter((item) => String(answerState[String(item.id)] || '').trim()).length : 0),
      0
    );
  }

  function activePart() {
    return questionParts[currentPartIndex] || null;
  }

  function buildPartCountSummaryText() {
    if (!questionParts.length) {
      return defaultSubText;
    }
    return questionParts
      .map((part, idx) => {
        const title = String(part?.title || `파트 ${idx + 1}`).trim();
        const count = Array.isArray(part?.items) ? part.items.length : 0;
        return `${title}·${count}문항`;
      })
      .join(' / ');
  }

  function applyAssessmentPayload(nextPayload) {
    const nextParts = Array.isArray(nextPayload?.parts) && nextPayload.parts.length
      ? nextPayload.parts
      : [{
        part_id: 'part_1',
        part_index: 0,
        title: '파트 1',
        response_options: Array.isArray(nextPayload?.response_options) ? nextPayload.response_options : [],
        items: Array.isArray(nextPayload?.items) ? nextPayload.items : [],
        item_count: Number(nextPayload?.item_count || 0)
      }];

    questionParts.splice(0, questionParts.length, ...nextParts.map((part, partIdx) => ({
      ...part,
      part_index: partIdx,
      title: part?.title || `파트 ${partIdx + 1}`,
      items: [...(part?.items || [])]
    })));

    let globalOrderIndex = 1;
    questionParts.forEach((part) => {
      part.items = (part.items || []).map((item, idx) => ({
        ...item,
        order_index: idx + 1,
        global_order_index: globalOrderIndex++
      }));
    });

    const firstPart = questionParts[0] || null;
    const nextItems = firstPart?.items || [];
    const nextOptions = Array.isArray(firstPart?.response_options) ? firstPart.response_options : [];
    questionItems.splice(0, questionItems.length, ...nextItems);
    questionOptions.splice(0, questionOptions.length, ...nextOptions);

    Object.keys(answerState).forEach((key) => {
      delete answerState[key];
    });
    currentPartIndex = 0;
    currentQuestionPage = 0;
    shouldCenterOnRender = true;
    subEl.textContent = buildPartCountSummaryText();
  }

  function syncActivePartState() {
    const part = activePart();
    const nextItems = part?.items || [];
    const nextOptions = Array.isArray(part?.response_options) ? part.response_options : [];
    questionItems.splice(0, questionItems.length, ...nextItems);
    questionOptions.splice(0, questionOptions.length, ...nextOptions);
    currentQuestionPage = 0;
    shouldCenterOnRender = true;
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

  function firstMissingIndex() {
    return questionItems.findIndex((item) => !String(answerState[String(item.id)] || '').trim());
  }

  function activePartFirstMissingIndex() {
    const part = activePart();
    if (!part) {
      return -1;
    }
    return (part.items || []).findIndex((item) => !String(answerState[String(item.id)] || '').trim());
  }

  function firstIncompletePartIndex() {
    return questionParts.findIndex((part) => (part.items || []).some((item) => !String(answerState[String(item.id)] || '').trim()));
  }

  function firstMissingLocationAcrossParts() {
    for (let partIndex = 0; partIndex < questionParts.length; partIndex += 1) {
      const items = questionParts[partIndex]?.items || [];
      for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        const item = items[itemIndex];
        if (!String(answerState[String(item.id)] || '').trim()) {
          return { partIndex, itemIndex, item };
        }
      }
    }
    return null;
  }

  function allQuestionsAnswered() {
    return firstIncompletePartIndex() < 0 && totalQuestionCount() > 0;
  }

  function clearAutoAdvanceTimer() {
    if (pendingAutoAdvanceTimer !== null) {
      window.clearTimeout(pendingAutoAdvanceTimer);
      pendingAutoAdvanceTimer = null;
    }
  }

  function scheduleAutoAdvance(callback) {
    clearAutoAdvanceTimer();
    pendingAutoAdvanceTimer = window.setTimeout(() => {
      pendingAutoAdvanceTimer = null;
      callback();
    }, 140);
  }

  function syncViewModeButtons() {
    viewModeCardsBtn.classList.toggle('is-active', currentLayoutMode === 'cards');
    viewModeStepBtn.classList.toggle('is-active', currentLayoutMode === 'step');
    viewModeCardsBtn.setAttribute('aria-pressed', String(currentLayoutMode === 'cards'));
    viewModeStepBtn.setAttribute('aria-pressed', String(currentLayoutMode === 'step'));
  }

  function isMatrixGroupItem(item) {
    return resolveRenderType(item) === 'likert_matrix' && String(item?.matrix_group_key || '').trim();
  }

  function buildCardPageBundles() {
    const bundles = [];
    let index = 0;
    while (index < questionItems.length) {
      const current = questionItems[index];
      if (isMatrixGroupItem(current)) {
        const key = String(current.matrix_group_key).trim();
        const startIndex = index;
        const grouped = [];
        while (index < questionItems.length) {
          const candidate = questionItems[index];
          if (!isMatrixGroupItem(candidate) || String(candidate.matrix_group_key).trim() !== key) {
            break;
          }
          grouped.push(candidate);
          index += 1;
        }
        bundles.push({
          items: grouped,
          startIndex,
          endIndex: index - 1,
        });
        continue;
      }

      const startIndex = index;
      const grouped = [];
      while (index < questionItems.length && grouped.length < QUESTION_PAGE_SIZE) {
        const candidate = questionItems[index];
        if (isMatrixGroupItem(candidate)) {
          break;
        }
        grouped.push(candidate);
        index += 1;
      }
      if (grouped.length) {
        bundles.push({
          items: grouped,
          startIndex,
          endIndex: index - 1,
        });
      }
    }
    return bundles;
  }

  function cardPageIndexForItemIndex(itemIndex) {
    const bundles = buildCardPageBundles();
    for (let idx = 0; idx < bundles.length; idx += 1) {
      if (itemIndex >= bundles[idx].startIndex && itemIndex <= bundles[idx].endIndex) {
        return idx;
      }
    }
    return 0;
  }

  function stepIndexForCardPage(pageIndex) {
    const bundles = buildCardPageBundles();
    return bundles[pageIndex]?.startIndex ?? 0;
  }

  function getCurrentPageItems() {
    if (currentLayoutMode === 'step') {
      return [questionItems[currentQuestionPage]].filter(Boolean);
    }
    const bundles = buildCardPageBundles();
    return bundles[currentQuestionPage]?.items || [];
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
    const cardBundles = buildCardPageBundles();
    const safePageCount = Math.max(1, cardBundles.length);
    const maxIndex = currentLayoutMode === 'step'
      ? Math.max(questionItems.length - 1, 0)
      : safePageCount - 1;
    currentQuestionPage = Math.min(Math.max(currentQuestionPage, 0), maxIndex);
    syncViewModeButtons();

    const currentItems = currentLayoutMode === 'step'
      ? [questionItems[currentQuestionPage]].filter(Boolean)
      : (cardBundles[currentQuestionPage]?.items || []);
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
        : cardPageIndexForItemIndex(questionIndex);
      renderQuestionWorkspace();
      const targetCard = document.getElementById(`question-card-${questionItems[questionIndex].id}`);
      targetCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetCard?.focus?.();
    }, currentLayoutMode);

    const answered = answeredCount();
    const total = totalQuestionCount();
    const percent = total ? Math.round((answered / total) * 100) : 0;
    const missing = total - answered;
    const part = activePart();
    subEl.textContent = buildPartCountSummaryText();

    progressTextEl.textContent = `${answered} / ${total} 문항 응답`;
    progressMetaEl.textContent = missing === 0
      ? '모든 문항 응답이 완료되었습니다.'
      : `${part?.title || '파트'} 진행 중, 현재 ${percent}% 완료`;
    progressFillEl.style.width = `${percent}%`;
    missingCountEl.textContent = `미응답 ${missing}`;
    missingCountEl.classList.toggle('is-complete', missing === 0);
    missingCountEl.disabled = missing === 0;
    pageLabelEl.textContent = currentLayoutMode === 'step'
      ? `${part?.title || '파트'} · ${currentQuestionPage + 1} / ${questionItems.length} 문항`
      : `${part?.title || '파트'} · ${currentQuestionPage + 1} / ${safePageCount} 페이지`;
    questionPrevBtn.disabled = currentQuestionPage === 0 && currentPartIndex === 0;
    const maxPage = currentLayoutMode === 'step' ? questionItems.length - 1 : safePageCount - 1;
    const isLastPage = currentQuestionPage >= maxPage;
    const isLastPart = currentPartIndex >= questionParts.length - 1;
    questionNextBtn.disabled = isLastPage && isLastPart;
    questionPrevBtn.textContent = currentPartIndex > 0 && currentQuestionPage === 0 ? '이전 파트' : '이전 문항';
    questionNextBtn.textContent = isLastPage
      ? (isLastPart ? '다음 없음' : '다음 파트')
      : '다음 문항';
    submitBtn.textContent = '제출';
    submitBtn.disabled = isSubmitting || isCompleted || !allQuestionsAnswered();

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
      : cardPageIndexForItemIndex(missingIndex);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();

    const missingItem = questionItems[missingIndex];
    if (emphasize) {
      setQuestionCardState(questionsEl, String(missingItem.id), { answered: false, missing: true });
    }
    centerQuestionCard(String(missingItem.id));
    return true;
  }

  function moveToFirstMissingAcrossParts({ emphasize = false, focus = false } = {}) {
    const location = firstMissingLocationAcrossParts();
    if (!location) {
      return false;
    }
    if (currentPartIndex !== location.partIndex) {
      currentPartIndex = location.partIndex;
      syncActivePartState();
    }
    currentQuestionPage = currentLayoutMode === 'step'
      ? location.itemIndex
      : cardPageIndexForItemIndex(location.itemIndex);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
    if (emphasize) {
      setQuestionCardState(questionsEl, String(location.item.id), { answered: false, missing: true });
    }
    centerQuestionCard(String(location.item.id), { focus });
    return true;
  }

  questionPrevBtn.addEventListener('click', () => {
    clearAutoAdvanceTimer();
    if (currentQuestionPage === 0 && currentPartIndex > 0) {
      currentPartIndex = Math.max(0, currentPartIndex - 1);
      syncActivePartState();
      currentQuestionPage = currentLayoutMode === 'step'
        ? Math.max(questionItems.length - 1, 0)
        : Math.max(buildCardPageBundles().length - 1, 0);
      renderQuestionWorkspace();
      return;
    }
    currentQuestionPage = Math.max(0, currentQuestionPage - 1);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  questionNextBtn.addEventListener('click', () => {
    clearAutoAdvanceTimer();
    const maxPage = currentLayoutMode === 'step' ? questionItems.length - 1 : buildCardPageBundles().length - 1;
    if (currentQuestionPage >= maxPage && currentPartIndex < questionParts.length - 1) {
      currentPartIndex = Math.min(questionParts.length - 1, currentPartIndex + 1);
      syncActivePartState();
      renderQuestionWorkspace();
      return;
    }
    currentQuestionPage = Math.min(maxPage, currentQuestionPage + 1);
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  missingCountEl.addEventListener('click', () => {
    clearAutoAdvanceTimer();
    if (firstIncompletePartIndex() < 0) {
      return;
    }
    moveToFirstMissingAcrossParts({ emphasize: true, focus: true });
  });

  viewModeCardsBtn.addEventListener('click', () => {
    if (currentLayoutMode === 'cards') {
      return;
    }
    currentQuestionPage = cardPageIndexForItemIndex(currentQuestionPage);
    currentLayoutMode = 'cards';
    shouldCenterOnRender = true;
    renderQuestionWorkspace();
  });

  viewModeStepBtn.addEventListener('click', () => {
    if (currentLayoutMode === 'step') {
      return;
    }
    currentQuestionPage = Math.min(stepIndexForCardPage(currentQuestionPage), Math.max(questionItems.length - 1, 0));
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
      const responseScope = target.closest('.assessment-matrix-row, .assessment-question-card');
      if (!(responseScope instanceof HTMLElement)) {
        return;
      }
      const optionInputs = [...responseScope.querySelectorAll('.assessment-option-card input[type="radio"]')];
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
    if (event.defaultPrevented) {
      return;
    }
    const eventTarget = event.target;
    if (eventTarget instanceof Node && questionsEl.contains(eventTarget)) {
      // Question area already handles keyboard interactions; avoid double-processing at document level.
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
        const pages = buildCardPageBundles();
        const currentItems = pages[currentQuestionPage]?.items || [];
        const pageAllAnswered = currentItems.length > 0
          && currentItems.every((item) => String(answerState[String(item.id)] || '').trim());
        const maxPage = Math.max(pages.length - 1, 0);
        if (pageAllAnswered && currentQuestionPage < maxPage) {
          scheduleAutoAdvance(() => {
            currentQuestionPage = Math.min(maxPage, currentQuestionPage + 1);
            shouldCenterOnRender = true;
            renderQuestionWorkspace();
          });
          return;
        }
        if (pageAllAnswered && currentQuestionPage >= maxPage && currentPartIndex < questionParts.length - 1) {
          scheduleAutoAdvance(() => {
            currentPartIndex = Math.min(questionParts.length - 1, currentPartIndex + 1);
            syncActivePartState();
            renderQuestionWorkspace();
          });
          return;
        }
        clearAutoAdvanceTimer();
      }
      renderQuestionWorkspace();
      if (currentLayoutMode === 'cards') {
        const nextMissing = findNextMissingInCurrentPage(itemId);
        if (nextMissing) {
          centerQuestionCard(String(nextMissing.id), { focus: true });
        }
      }
      if (currentLayoutMode === 'step' && currentQuestionPage < questionItems.length - 1) {
        window.setTimeout(() => {
          currentQuestionPage = Math.min(questionItems.length - 1, currentQuestionPage + 1);
          shouldCenterOnRender = true;
          renderQuestionWorkspace();
        }, 140);
      } else if (
        currentLayoutMode === 'step'
        && currentQuestionPage >= questionItems.length - 1
        && currentPartIndex < questionParts.length - 1
      ) {
        window.setTimeout(() => {
          currentPartIndex = Math.min(questionParts.length - 1, currentPartIndex + 1);
          syncActivePartState();
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

  function buildProfileSummaryLabels(profile) {
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
    return labels;
  }

  function closeUnassignedClientModal() {
    pendingRegistrationProfile = null;
    isRegisteringClient = false;
    if (unassignedClientConfirmBtn) {
      unassignedClientConfirmBtn.disabled = false;
      unassignedClientConfirmBtn.textContent = '예';
    }
    if (unassignedClientCancelBtn) {
      unassignedClientCancelBtn.disabled = false;
    }
    if (unassignedClientModal) {
      unassignedClientModal.classList.add('hidden');
      unassignedClientModal.setAttribute('aria-hidden', 'true');
    }
  }

  function openUnassignedClientModal(profile) {
    pendingRegistrationProfile = { ...profile };
    if (unassignedClientModalProfile) {
      unassignedClientModalProfile.textContent = buildProfileSummaryLabels(profile).join(' / ') || '입력 정보 없음';
    }
    if (unassignedClientModal) {
      unassignedClientModal.classList.remove('hidden');
      unassignedClientModal.setAttribute('aria-hidden', 'false');
    }
    if (unassignedClientConfirmBtn) {
      unassignedClientConfirmBtn.disabled = false;
      unassignedClientConfirmBtn.textContent = '예';
      window.setTimeout(() => unassignedClientConfirmBtn.focus(), 0);
    }
    if (unassignedClientCancelBtn) {
      unassignedClientCancelBtn.disabled = false;
    }
  }

  function showQuestionStep(profile) {
    if (isCompleted) {
      return;
    }
    profileSummaryText.textContent = buildProfileSummaryLabels(profile).join(' / ') || '입력 정보 없음';
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

  async function proceedToQuestionStep(profile) {
    messageEl.textContent = '';
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
      if (error.code === AUTO_CREATE_CONFIRM_REQUIRED_CODE) {
        openUnassignedClientModal(profile);
        messageEl.textContent = error.message || '내담자 등록 또는 연결 확인이 필요합니다.';
        messageEl.className = 'message';
        goQuestionsBtn.disabled = false;
        return;
      }
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
  }

  goQuestionsBtn.addEventListener('click', async () => {
    clearAutoAdvanceTimer();
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
    await proceedToQuestionStep(profile);
  });

  unassignedClientCancelBtn?.addEventListener('click', () => {
    closeUnassignedClientModal();
    messageEl.textContent = '검사 진행이 취소되었습니다.';
    messageEl.className = 'message';
  });

  unassignedClientConfirmBtn?.addEventListener('click', async () => {
    if (!pendingRegistrationProfile || isRegisteringClient) {
      return;
    }
    isRegisteringClient = true;
    unassignedClientConfirmBtn.disabled = true;
    unassignedClientCancelBtn.disabled = true;
    unassignedClientConfirmBtn.textContent = '등록 중...';
    messageEl.textContent = '내담자 등록과 검사 배정을 진행하는 중입니다.';
    messageEl.className = 'message';

    const profile = { ...pendingRegistrationProfile };
    try {
      await api(`/api/assessment-links/${token}/register-client`, {
        method: 'POST',
        body: JSON.stringify({ profile })
      });
      closeUnassignedClientModal();
      await proceedToQuestionStep(profile);
    } catch (error) {
      isRegisteringClient = false;
      unassignedClientConfirmBtn.disabled = false;
      unassignedClientCancelBtn.disabled = false;
      unassignedClientConfirmBtn.textContent = '예';
      messageEl.textContent = error.message || '내담자 등록과 배정에 실패했습니다.';
      messageEl.className = 'message error';
    }
  });

  unassignedClientModal?.addEventListener('click', (event) => {
    if (event.target === unassignedClientModal && !isRegisteringClient) {
      closeUnassignedClientModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !unassignedClientModal?.classList.contains('hidden') && !isRegisteringClient) {
      closeUnassignedClientModal();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAutoAdvanceTimer();
    if (questionStep.classList.contains('hidden')) {
      return;
    }
    if (isCompleted || isSubmitting) {
      return;
    }
    messageEl.textContent = '';

    const profile = collectProfileFromForm();
    const missing = validateProfile(profile);
    if (missing) {
      messageEl.textContent = `${missing} 항목을 입력해주세요.`;
      messageEl.className = 'message error';
      showProfileStep();
      return;
    }

    const missingPartIndex = firstIncompletePartIndex();
    if (missingPartIndex >= 0) {
      messageEl.textContent = '모든 문항에 응답해주세요.';
      messageEl.className = 'message error';
      currentPartIndex = missingPartIndex;
      syncActivePartState();
      moveToFirstMissing({ emphasize: true });
      renderQuestionWorkspace();
      return;
    }

    const answers = {};
    questionParts.forEach((part) => {
      (part.items || []).forEach((item) => {
        const value = String(answerState[String(item.id)] || '').trim();
        if (value) {
          answers[String(item.id)] = value;
        }
      });
    });

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
