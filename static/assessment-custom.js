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

function renderQuestions(container, payload) {
  container.innerHTML = '';
  const options = Array.isArray(payload.response_options) ? payload.response_options : [];

  (payload.items || []).forEach((item, idx) => {
    const block = document.createElement('div');
    block.className = 'list-item';
    if (options.length) {
      block.innerHTML = `
        <strong>${idx + 1}. ${escapeHtml(item.text)}</strong>
        <div class="row-actions">
          ${options
            .map(
              (opt) => `
              <label class="radio-pill">
                <input type="radio" name="q_${escapeHtml(item.id)}" value="${escapeHtml(opt.value)}" />
                <span>${escapeHtml(opt.label)}</span>
              </label>
            `
            )
            .join('')}
        </div>
      `;
    } else {
      block.innerHTML = `
        <strong>${idx + 1}. ${escapeHtml(item.text)}</strong>
        <input name="q_${escapeHtml(item.id)}" type="text" placeholder="응답 입력" />
      `;
    }
    container.appendChild(block);
  });
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

(async function init() {
  const token = getAccessTokenFromPath();
  const titleEl = document.getElementById('assessmentTitle');
  const subEl = document.getElementById('assessmentSub');
  const form = document.getElementById('customAssessmentForm');
  const profileStep = document.getElementById('profileStep');
  const questionStep = document.getElementById('questionStep');
  const requiredProfileFieldsWrap = document.getElementById('requiredProfileFieldsWrap');
  const extraProfileFieldsWrap = document.getElementById('extraProfileFieldsWrap');
  const goQuestionsBtn = document.getElementById('goQuestionsBtn');
  const backToProfileBtn = document.getElementById('backToProfileBtn');
  const questionsEl = document.getElementById('customAssessmentQuestions');
  const profileSummaryText = document.getElementById('profileSummaryText');
  const submitBtn = document.getElementById('customAssessmentSubmitBtn');
  const messageEl = document.getElementById('customAssessmentMessage');

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
  subEl.textContent = `| 총 ${payload.item_count || 0}문항`;
  renderQuestions(questionsEl, payload);

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

  function renderRequiredProfileFields() {
    requiredProfileFieldsWrap.innerHTML = '';
    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'required_name');
    nameLabel.innerHTML = '이름 <span class="required">*</span>';
    const nameInput = document.createElement('input');
    nameInput.id = 'required_name';
    nameInput.type = 'text';
    nameInput.required = true;
    nameInput.maxLength = 60;
    nameInput.placeholder = '이름 입력';
    requiredProfileFieldsWrap.appendChild(nameLabel);
    requiredProfileFieldsWrap.appendChild(nameInput);

    requiredFieldKeys.forEach((key) => {
      if (key === 'name') {
        return;
      }
      if (key === 'gender') {
        const label = document.createElement('label');
        label.textContent = '성별';
        const group = document.createElement('div');
        group.className = 'gender-group';
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
        requiredProfileFieldsWrap.appendChild(label);
        requiredProfileFieldsWrap.appendChild(group);
        return;
      }

      if (key === 'birth_day') {
        const label = document.createElement('label');
        label.setAttribute('for', 'required_birth_day');
        label.textContent = '생년월일';
        const input = document.createElement('input');
        input.id = 'required_birth_day';
        input.type = 'date';
        input.required = true;
        requiredProfileFieldsWrap.appendChild(label);
        requiredProfileFieldsWrap.appendChild(input);
        return;
      }

      if (key === 'school_age') {
        const label = document.createElement('label');
        label.setAttribute('for', 'required_school_age');
        label.textContent = '학령';
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
        requiredProfileFieldsWrap.appendChild(label);
        requiredProfileFieldsWrap.appendChild(select);
      }
    });
  }

  function renderAdditionalProfileFields() {
    extraProfileFieldsWrap.innerHTML = '';
    if (!additionalProfileFields.length) {
      extraProfileFieldsWrap.classList.add('hidden');
      return;
    }
    additionalProfileFields.forEach((field, idx) => {
      const id = `extraProfileField_${idx}`;
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = field.label;
      if (field.required) {
        label.innerHTML = `${escapeHtml(field.label)} <span class="required">*</span>`;
      }
      extraProfileFieldsWrap.appendChild(label);

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
        extraProfileFieldsWrap.appendChild(textarea);
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
        extraProfileFieldsWrap.appendChild(select);
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
        extraProfileFieldsWrap.appendChild(group);
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
      extraProfileFieldsWrap.appendChild(input);
    });
    extraProfileFieldsWrap.classList.remove('hidden');
  }

  renderRequiredProfileFields();
  renderAdditionalProfileFields();

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
    profileStep.classList.remove('hidden');
    questionStep.classList.add('hidden');
  }

  function showQuestionStep(profile) {
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
  }

  goQuestionsBtn.addEventListener('click', async () => {
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
      await api(`/api/assessment-links/${token}/validate-profile`, {
        method: 'POST',
        body: JSON.stringify({ profile })
      });
    } catch (error) {
      alert(error.message || '배정된 내담자 확인에 실패했습니다.');
      messageEl.textContent = error.message || '배정된 내담자 확인에 실패했습니다.';
      messageEl.className = 'message error';
      goQuestionsBtn.disabled = false;
      return;
    }
    goQuestionsBtn.disabled = false;
    showQuestionStep(profile);
  });

  backToProfileBtn.addEventListener('click', () => {
    messageEl.textContent = '';
    showProfileStep();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (questionStep.classList.contains('hidden')) {
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

    const answers = {};
    let missingAnswer = false;
    (payload.items || []).forEach((item) => {
      const key = `q_${item.id}`;
      const radios = form.querySelectorAll(`input[name="${key}"][type="radio"]`);
      if (radios.length) {
        const checked = [...radios].find((el) => el.checked);
        if (!checked) {
          missingAnswer = true;
          return;
        }
        answers[String(item.id)] = checked.value;
        return;
      }
      const input = form.querySelector(`input[name="${key}"]`);
      const value = input ? String(input.value || '').trim() : '';
      if (!value) {
        missingAnswer = true;
        return;
      }
      answers[String(item.id)] = value;
    });

    if (missingAnswer) {
      messageEl.textContent = '모든 문항에 응답해주세요.';
      messageEl.className = 'message error';
      return;
    }

    submitBtn.disabled = true;
    try {
      await api(`/api/assessment-links/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          responder_name: '',
          profile,
          answers
        })
      });
      messageEl.textContent = '제출이 완료되었습니다.';
      messageEl.className = 'message';
      form.querySelectorAll('input, select, button').forEach((el) => {
        el.disabled = true;
      });
    } catch (error) {
      messageEl.textContent = error.message;
      messageEl.className = 'message error';
      submitBtn.disabled = false;
    }
  });
})();
