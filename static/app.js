const form = document.getElementById('profileForm');
const message = document.getElementById('message');
const nextBtn = document.getElementById('nextBtn');
const dateToggleBtn = document.getElementById('datePickerToggle');
const datePanel = document.getElementById('datePickerPanel');
const birthDateDisplay = document.getElementById('birth_day_display');
const birthDateHidden = document.getElementById('birth_day');
const ageInfoBadge = document.getElementById('ageInfoBadge');
const birthError = document.getElementById('birthError');
const yearSelect = document.getElementById('yearSelect');
const monthSelect = document.getElementById('monthSelect');
const daySelect = document.getElementById('daySelect');

function getSelectedGender() {
  return form.querySelector('input[name="gender"]:checked')?.value || '';
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    return false;
  }
  return day >= 1 && day <= daysInMonth(year, month);
}

function calcAgeDetail(isoDate) {
  const [y, m, d] = isoDate.split('-').map((v) => Number(v));
  const today = new Date();
  const asOf = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birth = new Date(y, m - 1, d);

  let years = asOf.getFullYear() - birth.getFullYear();
  let months = asOf.getMonth() - birth.getMonth();
  let days = asOf.getDate() - birth.getDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days)
  };
}

function parseBirthDigits(digits8) {
  if (digits8.length !== 8) {
    return null;
  }

  const year = Number(digits8.slice(0, 4));
  const month = Number(digits8.slice(4, 6));
  const day = Number(digits8.slice(6, 8));

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function showBirthError(text) {
  birthError.textContent = text;
  birthError.className = 'field-info error';
}

function clearBirthError() {
  birthError.textContent = '';
  birthError.className = 'field-info';
}

function renderAgeBadge(isoDate) {
  if (!isoDate) {
    ageInfoBadge.textContent = '';
    ageInfoBadge.classList.add('hidden');
    return;
  }

  const age = calcAgeDetail(isoDate);
  ageInfoBadge.textContent = `만 ${age.years}세 ${age.months}개월 ${age.days}일`;
  ageInfoBadge.classList.remove('hidden');
}

function setBirthDate(iso) {
  const [y, m, d] = iso.split('-');
  birthDateHidden.value = iso;
  birthDateDisplay.value = `${y}${m}${d}`;
  renderAgeBadge(iso);
  clearBirthError();
  updateNextButtonState();
}

function clearBirthDate() {
  birthDateHidden.value = '';
  renderAgeBadge('');
  updateNextButtonState();
}

function syncPickerFromIso(iso) {
  const [y, m, d] = iso.split('-').map((v) => Number(v));
  yearSelect.value = String(y);
  monthSelect.value = String(m);
  populateDayOptions(yearSelect.value, monthSelect.value);
  daySelect.value = String(d);
}

function populateYearOptions() {
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1940; year -= 1) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = `${year}년`;
    yearSelect.appendChild(option);
  }
}

function populateMonthOptions() {
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = String(month);
    option.textContent = `${month}월`;
    monthSelect.appendChild(option);
  }
}

function populateDayOptions(year, month) {
  const total = daysInMonth(Number(year), Number(month));
  const currentDay = Number(daySelect.value || 1);
  daySelect.innerHTML = '';

  for (let day = 1; day <= total; day += 1) {
    const option = document.createElement('option');
    option.value = String(day);
    option.textContent = `${day}일`;
    daySelect.appendChild(option);
  }

  daySelect.value = String(Math.min(currentDay, total));
}

function setInitialDatePickerValues() {
  const current = new Date();
  yearSelect.value = String(current.getFullYear() - 10);
  monthSelect.value = String(current.getMonth() + 1);
  populateDayOptions(yearSelect.value, monthSelect.value);
  daySelect.value = String(current.getDate());
}

function openDatePanel() {
  if (birthDateHidden.value) {
    syncPickerFromIso(birthDateHidden.value);
  }
  datePanel.classList.remove('hidden');
}

function closeDatePanel() {
  datePanel.classList.add('hidden');
}

function applyDateFromPicker() {
  const y = Number(yearSelect.value);
  const m = Number(monthSelect.value);
  const d = Number(daySelect.value);
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  setBirthDate(iso);
  closeDatePanel();
}

function isFormComplete() {
  return (
    form.name.value.trim().length > 0 &&
    getSelectedGender().length > 0 &&
    birthDateHidden.value.length > 0 &&
    form.school_age.value.length > 0
  );
}

function updateNextButtonState() {
  nextBtn.disabled = !isFormComplete();
}

form.addEventListener('input', updateNextButtonState);
form.addEventListener('change', updateNextButtonState);

nextBtn.disabled = true;
updateNextButtonState();

populateYearOptions();
populateMonthOptions();
setInitialDatePickerValues();

yearSelect.addEventListener('change', () => populateDayOptions(yearSelect.value, monthSelect.value));
monthSelect.addEventListener('change', () => populateDayOptions(yearSelect.value, monthSelect.value));
daySelect.addEventListener('change', applyDateFromPicker);
daySelect.addEventListener('click', () => {
  if (daySelect.value) {
    applyDateFromPicker();
  }
});

dateToggleBtn.addEventListener('click', openDatePanel);

birthDateDisplay.addEventListener('input', () => {
  const digitsOnly = birthDateDisplay.value.replace(/[^0-9]/g, '').slice(0, 8);
  birthDateDisplay.value = digitsOnly;

  if (digitsOnly.length < 8) {
    clearBirthDate();
    clearBirthError();
    return;
  }

  const iso = parseBirthDigits(digitsOnly);
  if (!iso) {
    clearBirthDate();
    showBirthError('유효한 생년월일 8자리(YYYYMMDD)를 입력해주세요.');
    return;
  }

  setBirthDate(iso);
});

birthDateDisplay.addEventListener('blur', () => {
  const digitsOnly = birthDateDisplay.value.replace(/[^0-9]/g, '').slice(0, 8);
  if (!digitsOnly) {
    clearBirthDate();
    clearBirthError();
    return;
  }
  if (digitsOnly.length !== 8) {
    clearBirthDate();
    showBirthError('유효한 생년월일 8자리(YYYYMMDD)를 입력해주세요.');
    return;
  }
  const iso = parseBirthDigits(digitsOnly);
  if (!iso) {
    clearBirthDate();
    showBirthError('유효한 생년월일 8자리(YYYYMMDD)를 입력해주세요.');
    return;
  }
  setBirthDate(iso);
});

birthDateDisplay.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    birthDateDisplay.blur();
  }
});

document.addEventListener('click', (event) => {
  if (datePanel.classList.contains('hidden')) {
    return;
  }
  if (!datePanel.contains(event.target) && !dateToggleBtn.contains(event.target)) {
    closeDatePanel();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: form.name.value.trim(),
    gender: getSelectedGender(),
    birth_day: birthDateHidden.value,
    school_age: form.school_age.value
  };

  if (!payload.name || !payload.gender || !payload.birth_day || !payload.school_age) {
    message.textContent = '모든 항목을 입력해주세요.';
    message.className = 'message error';
    return;
  }

  nextBtn.disabled = true;
  nextBtn.textContent = '저장 중...';
  message.textContent = '';

  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || '요청 처리 중 오류가 발생했습니다.');
    }

    window.location.href = data.next_url || '/assessment';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message error';
    updateNextButtonState();
    nextBtn.textContent = '다음';
  }
});
