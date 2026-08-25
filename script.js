const defaultEvents = [
  { id: 1, date: '2026-08-25', time: '09:30', title: '朝のチェックイン', category: 'work', attendees: ['KN', 'YT', 'MS'] },
  { id: 2, date: '2026-08-25', time: '12:30', title: 'ランチタイム', category: 'personal', attendees: ['KN', 'MS'] },
  { id: 3, date: '2026-08-25', time: '14:00', title: 'デザイン定例', category: 'work', attendees: ['KN', 'YT', 'RK', 'HN'] },
  { id: 4, date: '2026-08-26', time: '10:00', title: '企画ミーティング', category: 'work', attendees: ['KN', 'YT', 'RK'] },
  { id: 5, date: '2026-08-27', time: '18:30', title: 'みんなで夕食', category: 'event', attendees: ['KN', 'MS', 'RK', 'HN'] },
  { id: 6, date: '2026-08-29', time: '11:00', title: '週末マーケット', category: 'event', attendees: ['KN', 'MS'] }
];

const today = '2026-08-25';
let events = JSON.parse(localStorage.getItem('tsudoi-events') || 'null') || defaultEvents;
const agendaView = document.querySelector('#agendaView');
const weekView = document.querySelector('#weekView');
const categoryFilter = document.querySelector('#categoryFilter');
const searchInput = document.querySelector('#searchInput');
const modal = document.querySelector('#eventModal');
const form = document.querySelector('#eventForm');

const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
const categoryLabels = { work: '仕事', personal: '個人', event: 'イベント' };
const avatarClasses = ['coral', 'blue', 'yellow', 'green'];

function dateLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return { monthDay: `${date.getMonth() + 1}/${date.getDate()}`, day: `(${dayNames[date.getDay()]})` };
}

function renderAttendees(attendees) {
  return `<div class="attendees">${attendees.map((person, index) => `<span class="mini-avatar ${avatarClasses[index % avatarClasses.length]}">${person}</span>`).join('')}</div>`;
}

function filteredEvents() {
  const query = searchInput.value.trim().toLowerCase();
  return events.filter((event) => {
    const matchesCategory = categoryFilter.value === 'all' || event.category === categoryFilter.value;
    return matchesCategory && (!query || event.title.toLowerCase().includes(query));
  }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function renderAgenda() {
  const visibleEvents = filteredEvents();
  if (!visibleEvents.length) {
    agendaView.innerHTML = '<div class="empty-state">条件に一致する予定はありません。</div>';
    updateSummary();
    return;
  }
  const groups = visibleEvents.reduce((result, event) => {
    (result[event.date] ||= []).push(event);
    return result;
  }, {});
  agendaView.innerHTML = Object.entries(groups).map(([date, dayEvents]) => {
    const label = dateLabel(date);
    return `<div class="day-group"><div class="day-label"><time>${label.monthDay} ${label.day}</time><strong>${date === today ? '今日' : date === '2026-08-26' ? '明日' : ''}</strong>${date === today ? '<span class="today-tag">TODAY</span>' : ''}</div>${dayEvents.map((event) => `<article class="event-card"><time class="event-time">${event.time}</time><span class="event-color ${event.category}"></span><div class="event-info"><strong>${event.title}</strong><small>${categoryLabels[event.category]} ・ ${event.attendees.length}人が参加</small></div>${renderAttendees(event.attendees)}</article>`).join('')}</div>`;
  }).join('');
  updateSummary();
}

function renderWeek() {
  const start = new Date('2026-08-23T00:00:00');
  weekView.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayEvents = events.filter((event) => event.date === dateString).sort((a, b) => a.time.localeCompare(b.time));
    return `<div class="week-column"><div class="week-head ${dateString === today ? 'today' : ''}">${dayNames[date.getDay()]}<strong>${date.getDate()}</strong></div>${dayEvents.map((event) => `<div class="week-event ${event.category}"><b>${event.time}</b><br>${event.title}</div>`).join('')}</div>`;
  }).join('');
}

function updateSummary() {
  const todayEvents = events.filter((event) => event.date === today).sort((a, b) => a.time.localeCompare(b.time));
  document.querySelector('#todayCount').textContent = todayEvents.length;
  document.querySelector('#nextEvent').textContent = todayEvents[0]?.title || '予定なし';
  document.querySelector('#nextTime').textContent = todayEvents[0]?.time || '--:--';
}

function saveEvents() {
  localStorage.setItem('tsudoi-events', JSON.stringify(events));
  renderAgenda();
  renderWeek();
}

document.querySelectorAll('.view-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.view-button').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const isWeek = button.dataset.view === 'week';
  agendaView.hidden = isWeek;
  weekView.hidden = !isWeek;
  if (isWeek) renderWeek();
}));
searchInput.addEventListener('input', renderAgenda);
categoryFilter.addEventListener('change', renderAgenda);
document.querySelector('#openModal').addEventListener('click', () => modal.showModal());
document.querySelector('#closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  events.push({ id: Date.now(), title: formData.get('title'), date: formData.get('date'), time: formData.get('time'), category: formData.get('category'), attendees: (formData.get('attendees') || 'KN').split(/[、,]/).map((name) => name.trim()).filter(Boolean) });
  saveEvents();
  form.reset();
  modal.close();
});

renderAgenda();
renderWeek();
