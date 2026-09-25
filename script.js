const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
const categoryLabels = { work: '仕事', personal: '個人', event: 'イベント' };
const attendeeAvatarClasses = ['coral', 'blue', 'yellow', 'green'];
const memberAvatarClasses = ['coral', 'blue', 'yellow', 'green', 'purple'];
const today = dateToString(new Date());

function dateToString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToString(date);
}

function makeDefaultEvents() {
  return [
    { id: 1, date: today, time: '09:30', title: '朝のチェックイン', category: 'work', attendees: ['KN', 'YT', 'MS'] },
    { id: 2, date: today, time: '12:30', title: 'ランチタイム', category: 'personal', attendees: ['KN', 'MS'] },
    { id: 3, date: today, time: '14:00', title: 'デザイン定例', category: 'work', attendees: ['KN', 'YT', 'RK', 'HN'] },
    { id: 4, date: dateAfter(1), time: '10:00', title: '企画ミーティング', category: 'work', attendees: ['KN', 'YT', 'RK'] },
    { id: 5, date: dateAfter(2), time: '18:30', title: 'みんなで夕食', category: 'event', attendees: ['KN', 'MS', 'RK', 'HN'] },
    { id: 6, date: dateAfter(4), time: '11:00', title: '週末マーケット', category: 'event', attendees: ['KN', 'MS'] }
  ];
}

function readStoredValue(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeMember(member, index) {
  return {
    id: String(member.id || `member-${index}`),
    name: String(member.name || 'メンバー'),
    initials: String(member.initials || '？').slice(0, 3),
    role: String(member.role || '参加者')
  };
}

function normalizeEvent(event, index) {
  const category = Object.hasOwn(categoryLabels, event.category) ? event.category : 'event';
  return {
    id: String(event.id || `event-${index}`),
    date: /^\d{4}-\d{2}-\d{2}$/.test(event.date) ? event.date : today,
    time: /^\d{2}:\d{2}$/.test(event.time) ? event.time : '10:00',
    title: String(event.title || '予定'),
    category,
    attendees: Array.isArray(event.attendees) ? event.attendees.map(String) : []
  };
}

function normalizeGroup(group, index) {
  return {
    id: String(group.id || `group-${index}`),
    name: String(group.name || `グループ ${index + 1}`),
    members: Array.isArray(group.members) ? group.members.map(normalizeMember) : [],
    events: Array.isArray(group.events) ? group.events.map(normalizeEvent) : []
  };
}

const savedGroups = readStoredValue('tsudoi-groups');
const legacyEvents = readStoredValue('tsudoi-events');
let groups = Array.isArray(savedGroups) && savedGroups.length
  ? savedGroups.map(normalizeGroup)
  : [{
      id: 'group-design-team',
      name: 'デザインチーム',
      members: [
        { id: 'member-kn', name: '加奈', initials: 'KN', role: '主催者' },
        { id: 'member-yt', name: 'ゆうた', initials: 'YT', role: '参加者' },
        { id: 'member-ms', name: 'まい', initials: 'MS', role: '参加者' },
        { id: 'member-rk', name: 'りく', initials: 'RK', role: '参加者' },
        { id: 'member-hn', name: 'はな', initials: 'HN', role: '参加者' }
      ],
      events: Array.isArray(legacyEvents) ? legacyEvents.map(normalizeEvent) : makeDefaultEvents()
    }];

let activeGroupId = readStoredValue('tsudoi-active-group');
if (typeof activeGroupId !== 'string' || !groups.some((group) => group.id === activeGroupId)) {
  activeGroupId = groups[0].id;
}

const agendaView = document.querySelector('#agendaView');
const weekView = document.querySelector('#weekView');
const categoryFilter = document.querySelector('#categoryFilter');
const searchInput = document.querySelector('#searchInput');
const eventModal = document.querySelector('#eventModal');
const eventForm = document.querySelector('#eventForm');
const groupModal = document.querySelector('#groupModal');
const groupForm = document.querySelector('#groupForm');
const memberModal = document.querySelector('#memberModal');
const memberForm = document.querySelector('#memberForm');
const groupSelect = document.querySelector('#groupSelect');
const deleteGroupButton = document.querySelector('#deleteGroup');
groupForm.elements.name.addEventListener('input', () => groupForm.elements.name.setCustomValidity(''));
memberForm.elements.name.addEventListener('input', () => memberForm.elements.name.setCustomValidity(''));

function activeGroup() {
  return groups.find((group) => group.id === activeGroupId) || groups[0];
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function dateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return { monthDay: `${date.getMonth() + 1}/${date.getDate()}`, day: `(${dayNames[date.getDay()]})` };
}

function renderAttendees(attendees) {
  return `<div class="attendees">${attendees.map((person, index) => `<span class="mini-avatar ${attendeeAvatarClasses[index % attendeeAvatarClasses.length]}" title="${escapeHTML(person)}">${escapeHTML(person)}</span>`).join('')}</div>`;
}

function filteredEvents() {
  const query = searchInput.value.trim().toLocaleLowerCase('ja');
  return activeGroup().events.filter((event) => {
    const matchesCategory = categoryFilter.value === 'all' || event.category === categoryFilter.value;
    return matchesCategory && (!query || event.title.toLocaleLowerCase('ja').includes(query));
  }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function renderAgenda() {
  const visibleEvents = filteredEvents();
  if (!visibleEvents.length) {
    agendaView.innerHTML = '<div class="empty-state">条件に一致する予定はありません。</div>';
    updateSummary();
    return;
  }
  const groupsByDate = visibleEvents.reduce((result, event) => {
    (result[event.date] ||= []).push(event);
    return result;
  }, {});
  const tomorrow = dateAfter(1);
  agendaView.innerHTML = Object.entries(groupsByDate).map(([date, dayEvents]) => {
    const label = dateLabel(date);
    const dayLabel = date === today ? '今日' : date === tomorrow ? '明日' : '';
    return `<div class="day-group"><div class="day-label"><time>${label.monthDay} ${label.day}</time><strong>${dayLabel}</strong>${date === today ? '<span class="today-tag">TODAY</span>' : ''}</div>${dayEvents.map((event) => `<article class="event-card"><time class="event-time">${escapeHTML(event.time)}</time><span class="event-color ${event.category}"></span><div class="event-info"><strong>${escapeHTML(event.title)}</strong><small>${categoryLabels[event.category]} ・ ${event.attendees.length}人が参加</small></div>${renderAttendees(event.attendees)}</article>`).join('')}</div>`;
  }).join('');
  updateSummary();
}

function renderWeek() {
  const start = new Date(`${today}T00:00:00`);
  start.setDate(start.getDate() - start.getDay());
  const visibleEvents = filteredEvents();
  weekView.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateString = dateToString(date);
    const dayEvents = visibleEvents.filter((event) => event.date === dateString);
    return `<div class="week-column"><div class="week-head ${dateString === today ? 'today' : ''}">${dayNames[date.getDay()]}<strong>${date.getDate()}</strong></div>${dayEvents.map((event) => `<div class="week-event ${event.category}"><b>${escapeHTML(event.time)}</b><br>${escapeHTML(event.title)}</div>`).join('')}</div>`;
  }).join('');
}

function updateSummary() {
  const group = activeGroup();
  const now = new Date();
  const upcomingEvents = group.events
    .map((event) => ({ event, startsAt: new Date(`${event.date}T${event.time}:00`) }))
    .filter(({ startsAt }) => startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt);
  const next = upcomingEvents[0];
  document.querySelector('#todayCount').textContent = group.events.filter((event) => event.date === today).length;
  document.querySelector('#memberCount').textContent = group.members.length;
  document.querySelector('#nextEvent').textContent = next?.event.title || '予定なし';
  document.querySelector('#nextTime').textContent = next
    ? `${next.event.date === today ? '' : `${dateLabel(next.event.date).monthDay} `}${next.event.time}`
    : '--:--';
}

function renderGroups() {
  groupSelect.innerHTML = groups.map((group) => `<option value="${escapeHTML(group.id)}">${escapeHTML(group.name)}</option>`).join('');
  groupSelect.value = activeGroupId;
  document.querySelector('#activeGroupName').textContent = activeGroup().name;
}

function renderMembers() {
  const members = activeGroup().members;
  const memberList = document.querySelector('#memberList');
  memberList.innerHTML = members.length
    ? members.map((member, index) => `<div class="member"><span class="member-avatar ${memberAvatarClasses[index % memberAvatarClasses.length]}">${escapeHTML(member.initials)}</span><span><strong>${escapeHTML(member.name)}</strong><small>${escapeHTML(member.role)}</small></span></div>`).join('')
    : '<p class="members-empty">メンバーはまだいません。</p>';
}

function renderAvailability() {
  const group = activeGroup();
  const availableDates = Array.from({ length: 7 }, (_, index) => dateAfter(index))
    .filter((date) => !group.events.some((event) => event.date === date));
  const availabilityList = document.querySelector('#availabilityList');
  availabilityList.innerHTML = availableDates.length
    ? availableDates.map((date) => {
        const label = dateLabel(date);
        return `<div class="availability-date"><strong>${label.monthDay}</strong><span>${label.day}</span>${date === today ? '<em>今日</em>' : ''}</div>`;
      }).join('')
    : '<p class="availability-empty">今後7日間に空いている日はありません。</p>';
}

function renderAll() {
  renderGroups();
  renderMembers();
  renderAvailability();
  document.querySelector('#todayLabel').textContent = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  }).format(new Date(`${today}T00:00:00`));
  renderAgenda();
  renderWeek();
}

function saveState() {
  try {
    localStorage.setItem('tsudoi-groups', JSON.stringify(groups));
    localStorage.setItem('tsudoi-active-group', JSON.stringify(activeGroupId));
    document.querySelector('#syncStatus').innerHTML = '<span class="status-dot"></span>このブラウザーに保存';
  } catch {
    document.querySelector('#syncStatus').textContent = '保存できません';
  }
  renderAll();
}

groupSelect.addEventListener('change', () => {
  activeGroupId = groupSelect.value;
  try {
    localStorage.setItem('tsudoi-active-group', JSON.stringify(activeGroupId));
  } catch {
    document.querySelector('#syncStatus').textContent = '保存できません';
  }
  renderAll();
});

document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.view-button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const isWeek = button.dataset.view === 'week';
  agendaView.hidden = isWeek;
  weekView.hidden = !isWeek;
  if (isWeek) renderWeek();
}));

searchInput.addEventListener('input', () => { renderAgenda(); renderWeek(); });
categoryFilter.addEventListener('change', () => { renderAgenda(); renderWeek(); });

document.querySelector('#openModal').addEventListener('click', () => {
  eventForm.elements.date.value = today;
  eventModal.showModal();
});
document.querySelector('#closeModal').addEventListener('click', () => eventModal.close());
document.querySelector('#createGroup').addEventListener('click', () => groupModal.showModal());
deleteGroupButton.addEventListener('click', () => {
  if (groups.length === 1) {
    window.alert('グループが1つしかないため、削除できません。');
    return;
  }
  const group = activeGroup();
  if (!window.confirm(`「${group.name}」を削除しますか？\nこのグループの予定とメンバーも削除されます。`)) return;
  groups = groups.filter((item) => item.id !== group.id);
  activeGroupId = groups[0].id;
  saveState();
});
document.querySelector('#addMember').addEventListener('click', () => memberModal.showModal());
document.querySelectorAll('[data-close-dialog]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeDialog}`).close());
});
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
});

eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const attendeeText = String(formData.get('attendees') || '').trim();
  const fallbackAttendee = activeGroup().members[0]?.initials || '';
  const attendees = (attendeeText || fallbackAttendee).split(/[、,]/).map((name) => name.trim()).filter(Boolean);
  activeGroup().events.push({
    id: `event-${Date.now()}`,
    title: String(formData.get('title')).trim(),
    date: String(formData.get('date')),
    time: String(formData.get('time')),
    category: String(formData.get('category')),
    attendees
  });
  saveState();
  eventForm.reset();
  eventModal.close();
});

groupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const nameField = groupForm.elements.name;
  const name = nameField.value.trim();
  nameField.setCustomValidity(!name
    ? 'グループ名を入力してください。'
    : groups.some((group) => group.name.toLocaleLowerCase('ja') === name.toLocaleLowerCase('ja'))
    ? '同じ名前のグループがあります。別の名前を入力してください。'
    : '');
  if (!groupForm.reportValidity()) return;
  const group = {
    id: `group-${Date.now()}`,
    name,
    members: [{ id: `member-${Date.now()}`, name: '加奈', initials: 'KN', role: '主催者' }],
    events: []
  };
  groups.push(group);
  activeGroupId = group.id;
  saveState();
  groupForm.reset();
  groupModal.close();
});

memberForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const nameField = memberForm.elements.name;
  const name = nameField.value.trim();
  nameField.setCustomValidity(!name
    ? '名前を入力してください。'
    : activeGroup().members.some((member) => member.name.toLocaleLowerCase('ja') === name.toLocaleLowerCase('ja'))
    ? 'このグループには同じ名前のメンバーがいます。'
    : '');
  if (!memberForm.reportValidity()) return;
  const initialsField = memberForm.elements.initials;
  const initials = initialsField.value.trim() || [...name.replace(/\s/g, '')].slice(0, 2).join('').toUpperCase();
  activeGroup().members.push({ id: `member-${Date.now()}`, name, initials, role: '参加者' });
  saveState();
  memberForm.reset();
  memberModal.close();
});

renderAll();
