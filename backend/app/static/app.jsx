const { useCallback, useEffect, useMemo, useRef, useState } = React;

const MAX_ATTENDANCE = 30;
const REFRESH_INTERVAL_MS = 5000;

const pages = [
  { id: "menu", label: "Dashboard", icon: "layout-dashboard" },
  { id: "live-attendance", label: "Current Lesson", icon: "video" },
  { id: "meetings", label: "Meetings", icon: "calendar-days" },
  { id: "students", label: "Students", icon: "users" },
  { id: "reports", label: "Reports", icon: "bar-chart-3" },
  { id: "settings", label: "Settings", icon: "settings" }
];

const pageTitles = Object.fromEntries(pages.map((page) => [page.id, page.label]));

const FLOATING_ROOT_ID = "teacher-console-floating-root";
const LANGUAGE_STORAGE_KEY = "teacher-console-language";
const languageOptions = [
  { id: "uk", label: "UA", flag: "🇺🇦", title: "Українська" },
  { id: "en", label: "EN", flag: "🇬🇧", title: "English" }
];

const textTranslations = {
  uk: {
    "Primary navigation": "Основна навігація",
    "Row actions": "Дії рядка",
    "Choose file": "Вибрати файл",
    "Browse files": "Огляд файлів",
    "Teacher console": "Панель викладача",
    "Roster and live sync": "Журнал і live-синхронізація",
    Dashboard: "Панель",
    "Current Lesson": "Поточний урок",
    "Current lesson": "Поточний урок",
    Meetings: "Зустрічі",
    Students: "Студенти",
    Reports: "Звіти",
    Settings: "Налаштування",
    "Zoom checking": "Перевірка Zoom",
    "Zoom connected": "Zoom підключено",
    "Zoom not connected": "Zoom не підключено",
    Connected: "Підключено",
    "Not connected": "Не підключено",
    Ready: "Готово",
    Error: "Помилка",
    Syncing: "Синхронізація",
    Active: "Активно",
    active: "активно",
    Closed: "Закрито",
    Tracked: "Відстежено",
    Idle: "Без дій",
    Waiting: "Очікування",
    Reading: "Читання",
    Joined: "Приєднано",
    "Not joined": "Не приєднано",
    Configured: "Налаштовано",
    "Missing credentials": "Немає облікових даних",
    Available: "Доступно",
    "Requires OAuth": "Потрібен OAuth",
    Unknown: "Невідомо",
    Never: "Ніколи",
    Done: "Готово",
    Pending: "Очікує",
    Present: "Присутній",
    Absent: "Відсутній",
    "Not active": "Не активний",
    "Needs review": "Потрібна перевірка",
    Lessons: "Уроки",
    "Start / Join lesson": "Почати / приєднатися",
    "New meeting": "Нова зустріч",
    "Generate journal": "Створити журнал",
    "Open current lesson": "Відкрити поточний урок",
    "Setup checklist": "Чекліст налаштування",
    "Connect Zoom": "Підключити Zoom",
    "Import students": "Імпорт студентів",
    "Save or select a meeting": "Зберегти або вибрати зустріч",
    "Start current lesson": "Почати поточний урок",
    "Generate report": "Створити звіт",
    "Your Zoom account is connected.": "Ваш акаунт Zoom підключено.",
    "Connect Zoom so host join and live sync are available.":
      "Підключіть Zoom, щоб був доступний вхід як host і live-синхронізація.",
    "Add students manually, import a file, or connect a Google Sheet.":
      "Додайте студентів вручну, імпортуйте файл або підключіть Google Sheet.",
    "Keep recurring Zoom meetings ready for lesson setup.":
      "Збережіть регулярні Zoom-зустрічі для швидкого налаштування уроку.",
    "Open Current Lesson to join Zoom and begin attendance sync.":
      "Відкрийте поточний урок, щоб приєднатися до Zoom і почати синхронізацію відвідуваності.",
    "Review synced attendance and generate journals after lessons.":
      "Переглядайте синхронізовану відвідуваність і створюйте журнали після уроків.",
    "Complete the steps to get the most out of Teacher Console.":
      "Виконайте кроки, щоб використати панель викладача максимально ефективно.",
    "Zoom status": "Статус Zoom",
    "Ready to sync": "Готово до синхронізації",
    "0 in all groups": "0 у всіх групах",
    "Not started": "Не розпочато",
    "No active lesson": "Немає активного уроку",
    Attendance: "Відвідуваність",
    "0 records": "0 записів",
    "Attendance overview": "Огляд відвідуваності",
    Rows: "Рядки",
    Sessions: "Сесії",
    "Last sync": "Остання синхронізація",
    "No attendance data yet.": "Даних відвідуваності ще немає.",
    "Start your first lesson to see analytics here.":
      "Почніть перший урок, щоб побачити тут аналітику.",
    "Quick actions": "Швидкі дії",
    Open: "Відкрити",
    Manage: "Керувати",
    View: "Переглянути",
    "Recent activity": "Остання активність",
    "View all": "Переглянути все",
    "No recent activity yet.": "Останньої активності ще немає.",
    "Your recent lessons and actions will appear here.":
      "Ваші останні уроки та дії з'являться тут.",
    "Search meetings": "Пошук зустрічей",
    "All meetings": "Усі зустрічі",
    "Host meetings": "Зустрічі host",
    "Participant meetings": "Зустрічі учасника",
    "Recently used": "Нещодавно використані",
    "Clear filters": "Очистити фільтри",
    "Saved Zoom meetings": "Збережені Zoom-зустрічі",
    "Save recurring Zoom meetings here for quick lesson setup.":
      "Зберігайте тут регулярні Zoom-зустрічі для швидкого налаштування уроку.",
    "Meeting name": "Назва зустрічі",
    "Meeting ID": "ID зустрічі",
    Passcode: "Код доступу",
    Role: "Роль",
    Host: "Host",
    Participant: "Учасник",
    "Save meeting": "Зберегти зустріч",
    "Owner/access": "Власник/доступ",
    "Last used": "Останнє використання",
    Sync: "Синхронізація",
    Actions: "Дії",
    "Untitled meeting": "Зустріч без назви",
    "Not checked": "Не перевірено",
    "No access": "Немає доступу",
    "Owner match": "Власник збігається",
    Readable: "Доступно для читання",
    Join: "Приєднатися",
    Edit: "Редагувати",
    Check: "Перевірити",
    Delete: "Видалити",
    "No saved meetings yet": "Збережених зустрічей ще немає",
    "Add your first recurring Zoom meeting above to make lesson setup faster.":
      "Додайте першу регулярну Zoom-зустріч вище, щоб швидше налаштовувати уроки.",
    "Recent lesson sessions": "Останні сесії уроків",
    "View all sessions": "Усі сесії",
    "Show recent": "Показати останні",
    Session: "Сесія",
    "Zoom ID": "Zoom ID",
    "Lesson title": "Назва уроку",
    Group: "Група",
    Started: "Початок",
    Status: "Статус",
    "Save changes": "Зберегти зміни",
    "Close session": "Закрити сесію",
    "Export CSV": "Експорт CSV",
    "No lesson sessions yet": "Сесій уроків ще немає",
    "Join a Zoom lesson to start tracking live attendance.":
      "Приєднайтеся до Zoom-уроку, щоб почати відстежувати відвідуваність наживо.",
    "Start lesson": "Почати урок",
    "Saved meeting": "Збережена зустріч",
    "New lesson": "Новий урок",
    "Teacher name": "Ім'я викладача",
    "Join as host": "Приєднатися як host",
    "You will join the Zoom meeting as host.": "Ви приєднаєтесь до Zoom-зустрічі як host.",
    "Join Zoom": "Увійти в Zoom",
    "Save lesson": "Зберегти урок",
    "Lesson details saved.": "Дані уроку збережено.",
    "Lesson draft saved on this device.": "Чернетку уроку збережено на цьому пристрої.",
    "Current lesson closed.": "Поточний урок закрито.",
    "Lesson draft cleared.": "Чернетку уроку очищено.",
    "Ready to start": "Готово до старту",
    "Connect Zoom to start": "Підключіть Zoom для старту",
    "Zoom is connected. Join a meeting to begin attendance sync.":
      "Zoom підключено. Приєднайтеся до зустрічі, щоб почати синхронізацію відвідуваності.",
    "Zoom authorization and SDK credentials are required before attendance sync.":
      "Для синхронізації відвідуваності потрібні авторизація Zoom і SDK-дані.",
    "Live sync status": "Статус live-синхронізації",
    "Zoom connection": "Підключення Zoom",
    "Meeting status": "Статус зустрічі",
    "Participant reading": "Зчитування учасників",
    "Attendance sync": "Синхронізація відвідуваності",
    "Sync interval": "Інтервал синхронізації",
    "Every 5 seconds": "Кожні 5 секунд",
    "Advanced sync details": "Додаткові деталі синхронізації",
    State: "Стан",
    Participants: "Учасники",
    "No participants yet.": "Учасників ще немає.",
    "After you join a Zoom meeting, participants will appear here.":
      "Після приєднання до Zoom-зустрічі учасники з'являться тут.",
    "Matched students": "Зіставлені студенти",
    "No matched students yet.": "Зіставлених студентів ще немає.",
    "We'll match participants to your roster once they're detected.":
      "Ми зіставимо учасників із вашим списком, коли їх буде виявлено.",
    "Names to review": "Імена для перевірки",
    "No names to review.": "Немає імен для перевірки.",
    "Unmatched participant names will appear here for you to review.":
      "Незіставлені імена учасників з'являться тут для перевірки.",
    "Attendance timeline": "Таймлайн відвідуваності",
    "Attendance History": "Історія відвідуваності",
    "No attendance timeline yet.": "Таймлайну відвідуваності ще немає.",
    "No attendance history yet.": "Історії відвідуваності ще немає.",
    "Live attendance records will appear here after participants are synced.":
      "Записи відвідуваності наживо з'являться тут після синхронізації учасників.",
    "Attendance records will appear here after live lessons are synced.":
      "Записи відвідуваності з'являться тут після синхронізації live-уроків.",
    Name: "Ім'я",
    Meeting: "Зустріч",
    "First seen": "Вперше помічено",
    "Last seen": "Востаннє помічено",
    Duration: "Тривалість",
    Total: "Усього",
    "No active participants yet.": "Активних учасників ще немає.",
    "Zoom name": "Ім'я в Zoom",
    "Suggested student": "Запропонований студент",
    Action: "Дія",
    "All active participants match the selected roster.":
      "Усі активні учасники збігаються з вибраним списком.",
    "Create alias / Link": "Створити псевдонім / зв'язати",
    "Student list": "Список студентів",
    Import: "Імпорт",
    "Google Sheet": "Google Sheet",
    "Search students or aliases": "Пошук студентів або псевдонімів",
    "All groups": "Усі групи",
    "Add student": "Додати студента",
    "Student name": "Ім'я студента",
    "No students yet.": "Студентів ще немає.",
    "Add students manually, import a CSV/Excel file, or connect a Google Sheet.":
      "Додайте студентів вручну, імпортуйте CSV/Excel або підключіть Google Sheet.",
    "Import file": "Імпортувати файл",
    "Connect Google Sheet": "Підключити Google Sheet",
    "No students match this view.": "Немає студентів для цього перегляду.",
    "Upload a CSV or Excel file to add or update students.":
      "Завантажте CSV або Excel, щоб додати чи оновити студентів.",
    "Drag and drop a file here, or": "Перетягніть файл сюди або",
    "Download template": "Завантажити шаблон",
    "Accepted columns: student_name, group, aliases":
      "Прийняті колонки: student_name, group, aliases",
    "Replace existing students": "Замінити наявних студентів",
    "Preview import": "Переглянути імпорт",
    "Import a roster or add students manually.": "Імпортуйте список або додайте студентів вручну.",
    "Choose a CSV or XLSX file first.": "Спочатку виберіть CSV або XLSX файл.",
    "Reading file...": "Читання файлу...",
    "Importing...": "Імпорт...",
    "Confirm import": "Підтвердити імпорт",
    "Google Sheet students": "Студенти з Google Sheet",
    Aliases: "Псевдоніми",
    "Attendance status": "Статус відвідуваності",
    "Aliases / Zoom names": "Псевдоніми / імена Zoom",
    None: "Немає",
    "Zoom display name": "Ім'я в Zoom",
    "Add alias": "Додати псевдонім",
    Filters: "Фільтри",
    "Total sessions": "Усього сесій",
    "Average attendance": "Середня відвідуваність",
    Absences: "Відсутності",
    "Attendance rows": "Рядки відвідуваності",
    "Start date": "Дата початку",
    "End date": "Дата завершення",
    "Enter meeting ID": "Введіть ID зустрічі",
    Today: "Сьогодні",
    "This week": "Цей тиждень",
    "This month": "Цей місяць",
    Custom: "Власний",
    "Export attendance CSV": "Експорт відвідуваності CSV",
    "Export matrix CSV": "Експорт матриці CSV",
    "Generate attendance journal": "Створити журнал відвідуваності",
    Generating: "Створення",
    "Generating...": "Створення...",
    Student: "Студент",
    Lesson: "Урок",
    Start: "Початок",
    "Attendance journal": "Журнал відвідуваності",
    "No journal generated yet.": "Журнал ще не створено.",
    "Choose filters and click Generate attendance journal.":
      "Виберіть фільтри й натисніть «Створити журнал відвідуваності».",
    "Zoom integration": "Інтеграція Zoom",
    "Zoom authorization": "Авторизація Zoom",
    "Zoom account": "Акаунт Zoom",
    "Zoom SDK": "Zoom SDK",
    "Host token": "Host token",
    "Authorize different account": "Авторизувати інший акаунт",
    "Authorize Zoom": "Авторизувати Zoom",
    "Disconnect Zoom": "Відключити Zoom",
    Groups: "Групи",
    "No groups yet.": "Груп ще немає.",
    "Import students or schedule data to create groups.":
      "Імпортуйте студентів або розклад, щоб створити групи.",
    "Schedule import": "Імпорт розкладу",
    "Import schedule CSV or Excel for attendance journals.":
      "Імпортуйте CSV або Excel розкладу для журналів відвідуваності.",
    "Import schedule CSV for attendance journals.":
      "Імпортуйте CSV розкладу для журналів відвідуваності.",
    "Drag and drop your CSV or Excel file here": "Перетягніть CSV або Excel файл сюди",
    "Download schedule template": "Завантажити шаблон розкладу",
    "Replace existing schedule": "Замінити наявний розклад",
    "Preview schedule import": "Переглянути імпорт розкладу",
    "Confirm schedule import": "Підтвердити імпорт розкладу",
    "Lesson date": "Дата уроку",
    "Start time": "Час початку",
    "End time": "Час завершення",
    Title: "Назва",
    Starts: "Починається",
    Ends: "Завершується",
    "No schedule imported yet.": "Розклад ще не імпортовано.",
    "Google Sheet schedule": "Розклад з Google Sheet",
    "Share the sheet with the bot as Editor, then paste the URL.":
      "Поділіться таблицею з ботом як Editor, потім вставте URL.",
    "Bot ready": "Бот готовий",
    "Bot missing": "Бот відсутній",
    "Bot email": "Email бота",
    "Bot email is not configured": "Email бота не налаштовано",
    Copy: "Копіювати",
    "Setup steps": "Кроки налаштування",
    "Open your Google Sheet.": "Відкрийте Google Sheet.",
    "Click Share and add the bot email as Editor.":
      "Натисніть Share і додайте email бота як Editor.",
    "Share it with the bot email as Editor.": "Поділіться з email бота як Editor.",
    "Paste the sheet URL and load tabs.": "Вставте URL таблиці та завантажте вкладки.",
    "Paste the sheet URL below and load tabs.": "Вставте URL таблиці нижче та завантажте вкладки.",
    "Google Sheet URL": "URL Google Sheet",
    "Load tabs": "Завантажити вкладки",
    "Sheet tab": "Вкладка таблиці",
    Preview: "Переглянути",
    "Auto-sync": "Автосинхронізація",
    "Save connection": "Зберегти підключення",
    "Saved Google Sheets": "Збережені Google Sheets",
    "Replace on sync": "Замінити під час синхронізації",
    On: "Увімкнено",
    Off: "Вимкнено",
    "Sync now": "Синхронізувати зараз",
    Tab: "Вкладка",
    Type: "Тип",
    Auto: "Авто",
    When: "Коли",
    Source: "Джерело",
    Imported: "Імпортовано",
    Skipped: "Пропущено",
    "No Google Sheets connected yet.": "Google Sheets ще не підключено.",
    "Connect a sheet to enable automatic schedule sync.":
      "Підключіть таблицю, щоб увімкнути автоматичну синхронізацію розкладу.",
    "Connect a sheet to enable automatic roster sync.":
      "Підключіть таблицю, щоб увімкнути автоматичну синхронізацію списку.",
    "Reading sheet tabs...": "Читання вкладок таблиці...",
    "Choose a tab and preview mapping.": "Виберіть вкладку й перегляньте зіставлення.",
    "No tabs found.": "Вкладок не знайдено.",
    "Paste a Sheet URL and choose a tab first.":
      "Спочатку вставте URL таблиці та виберіть вкладку.",
    "Reading sample rows...": "Читання прикладів рядків...",
    "Preview and confirm mapping before saving.":
      "Перегляньте й підтвердіть зіставлення перед збереженням.",
    "Saving Google Sheet connection...": "Збереження підключення Google Sheet...",
    "Google Sheet connection saved.": "Підключення Google Sheet збережено.",
    "Syncing Google Sheet...": "Синхронізація Google Sheet...",
    "Bot email copied.": "Email бота скопійовано.",
    "Not mapped": "Не зіставлено",
    "No rows detected.": "Рядків не знайдено.",
    "Confirm mapping before saving.": "Підтвердьте зіставлення перед збереженням.",
    "e.g. Grade 3 Math - Morning": "наприклад, Grade 3 Math - Morning",
    "e.g. 72501545228": "наприклад, 72501545228",
    "e.g. 123456": "наприклад, 123456"
  }
};

const translationPatterns = {
  uk: [
    [/^Connected as (.+)\.$/, (match) => `Підключено як ${match[1]}.`],
    [
      /^Preview ready: (\d+) rows detected\.$/,
      (match) => `Перегляд готовий: ${match[1]} рядків знайдено.`
    ],
    [
      /^(\d+) rows detected\. Confirm mapping before saving\.$/,
      (match) => `${match[1]} рядків знайдено. Підтвердьте зіставлення перед збереженням.`
    ],
    [
      /^Imported (\d+), created (\d+), updated (\d+), skipped (\d+)(.*)\.$/,
      (match) =>
        `Імпортовано ${match[1]}, створено ${match[2]}, оновлено ${match[3]}, пропущено ${match[4]}${match[5]}.`
    ],
    [
      /^Generated (\d+): (\d+) present, (\d+) absent\.(.*)$/,
      (match) => `Створено ${match[1]}: присутні ${match[2]}, відсутні ${match[3]}.${match[4]}`
    ],
    [/^Type: (.+)$/, (match) => `Тип: ${match[1]}`],
    [/^Mapping: (.+)$/, (match) => `Зіставлення: ${match[1]}`],
    [/^(\d+)% confidence$/, (match) => `${match[1]}% впевненості`],
    [/^Session #(\d+)$/, (match) => `Сесія #${match[1]}`]
  ]
};

const translationAttributes = ["placeholder", "aria-label", "title"];
const originalTextValues = new WeakMap();
const originalAttributeValues = new WeakMap();

const tones = {
  success: "border-green-200 bg-green-50 text-success",
  warning: "border-yellow-300 bg-yellow-50 text-warning",
  danger: "border-red-200 bg-red-50 text-danger",
  neutral: "border-line bg-[#FFFDF7] text-muted"
};

const buttonBase =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-black transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = `${buttonBase} border-[#D9C300] bg-accent text-ink`;
const secondaryButton = `${buttonBase} border-line bg-panel text-ink`;
const dangerButton = `${buttonBase} border-red-200 bg-red-50 text-danger`;
const successButton = `${buttonBase} border-green-200 bg-green-50 text-success`;
const compactButton = "min-h-8 px-2.5 text-xs";
const inputClass =
  "min-h-10 min-w-0 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none focus:border-[#D9C300] focus:ring-4 focus:ring-yellow-200";
const selectClass = cx(inputClass, "appearance-none pr-10");
const labelClass = "grid min-w-0 gap-1 text-xs font-black uppercase text-muted";
const cardClass = "rounded-lg border border-line bg-panel shadow-soft";
const cardHeaderClass = "flex items-start justify-between gap-3 border-b border-line px-5 py-4";
const tableWrapClass = "overflow-x-auto";
const tableClass = "min-w-full border-separate border-spacing-0 text-sm";
const thClass =
  "border-b border-line bg-[#F2EFE3] px-3 py-3 text-left text-[11px] font-black uppercase text-muted whitespace-nowrap";
const tdClass = "border-b border-line px-3 py-3 align-middle whitespace-nowrap";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function getInitialLanguage() {
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    return languageOptions.some((language) => language.id === stored) ? stored : "en";
  } catch (error) {
    return "en";
  }
}

function translateTextValue(value, language) {
  if (language === "en") {
    return value;
  }
  const dictionary = textTranslations[language];
  if (!dictionary || typeof value !== "string") {
    return value;
  }
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  const direct = dictionary[trimmed];
  if (direct) {
    return `${leading}${direct}${trailing}`;
  }
  const patterns = translationPatterns[language] || [];
  for (const [pattern, formatter] of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return `${leading}${formatter(match)}${trailing}`;
    }
  }
  return value;
}

function isKnownTranslatedValue(original, current) {
  return languageOptions.some((language) => translateTextValue(original, language.id) === current);
}

function currentOriginalText(node, language) {
  const current = node.nodeValue;
  const existing = originalTextValues.get(node);
  if (existing === undefined) {
    originalTextValues.set(node, current);
    return current;
  }
  const expected = translateTextValue(existing, language);
  if (current !== existing && current !== expected && !isKnownTranslatedValue(existing, current)) {
    originalTextValues.set(node, current);
    return current;
  }
  return existing;
}

function currentOriginalAttribute(element, attribute, language) {
  let originals = originalAttributeValues.get(element);
  if (!originals) {
    originals = {};
    originalAttributeValues.set(element, originals);
  }
  const current = element.getAttribute(attribute);
  const existing = originals[attribute];
  if (existing === undefined) {
    originals[attribute] = current;
    return current;
  }
  const expected = translateTextValue(existing, language);
  if (current !== existing && current !== expected && !isKnownTranslatedValue(existing, current)) {
    originals[attribute] = current;
    return current;
  }
  return existing;
}

function applyTranslations(root, language) {
  if (!root) {
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (
        !node.nodeValue?.trim() ||
        !parent ||
        parent.closest("[data-no-translate]") ||
        ["SCRIPT", "STYLE", "TEXTAREA", "CODE"].includes(parent.tagName)
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  textNodes.forEach((node) => {
    const original = currentOriginalText(node, language);
    const translated = translateTextValue(original, language);
    if (node.nodeValue !== translated) {
      node.nodeValue = translated;
    }
  });
  root.querySelectorAll("*").forEach((element) => {
    translationAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) {
        return;
      }
      const original = currentOriginalAttribute(element, attribute, language);
      const translated = translateTextValue(original, language);
      if (element.getAttribute(attribute) !== translated) {
        element.setAttribute(attribute, translated);
      }
    });
  });
}

function TranslationLayer({ language, children }) {
  const rootRef = useRef(null);
  useEffect(() => {
    document.documentElement.lang = language === "uk" ? "uk" : "en";
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }
    let frameId = 0;
    const scheduleTranslate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => applyTranslations(root, language));
    };
    const observer = new MutationObserver(scheduleTranslate);
    scheduleTranslate();
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translationAttributes
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [language]);
  return (
    <div ref={rootRef} className="contents">
      {children}
      <div id={FLOATING_ROOT_ID} className="contents" />
    </div>
  );
}

function LanguageSwitcher({ language, onLanguageChange }) {
  return (
    <div className="grid gap-2 pb-2">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-panel p-1 shadow-soft">
        {languageOptions.map((option) => {
          const active = language === option.id;
          return (
            <button
              key={option.id}
              className={cx(
                "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-black transition-all duration-200",
                active
                  ? "border-[#D9C300] bg-yellow-100 text-ink shadow-sm"
                  : "border-transparent text-muted hover:bg-[#FFF7D6] hover:text-ink"
              )}
              type="button"
              aria-pressed={active}
              title={option.title}
              onClick={() => onLanguageChange(option.id)}>
              <span className="text-lg leading-none" aria-hidden="true">
                {option.flag}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const iconShapes = {
  "layout-dashboard": [
    { tag: "rect", x: "3", y: "3", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "14", y: "3", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "14", y: "14", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "3", y: "14", width: "7", height: "7", rx: "1" }
  ],
  video: [
    { tag: "path", d: "m16 13 5 3V8l-5 3Z" },
    { tag: "rect", x: "3", y: "6", width: "13", height: "12", rx: "2" }
  ],
  "calendar-days": [
    { tag: "path", d: "M8 2v4M16 2v4M3 10h18" },
    { tag: "rect", x: "3", y: "4", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" }
  ],
  calendar: [
    { tag: "path", d: "M8 2v4M16 2v4M3 10h18" },
    { tag: "rect", x: "3", y: "4", width: "18", height: "18", rx: "2" }
  ],
  users: [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }
  ],
  "bar-chart-3": [{ tag: "path", d: "M3 3v18h18M18 17V9M13 17V5M8 17v-3" }],
  settings: [
    { tag: "circle", cx: "12", cy: "12", r: "3" },
    {
      tag: "path",
      d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1v.2a2 2 0 0 1-4 0V21a1.65 1.65 0 0 0-.4-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.4h-.2a2 2 0 0 1 0-4H3a1.65 1.65 0 0 0 1-.4 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1v-.2a2 2 0 0 1 4 0V3a1.65 1.65 0 0 0 .4 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1 .4h.2a2 2 0 0 1 0 4H21a1.65 1.65 0 0 0-1 .4 1.65 1.65 0 0 0-.6 1Z"
    }
  ],
  "refresh-cw": [
    { tag: "path", d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" },
    { tag: "path", d: "M3 21v-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" },
    { tag: "path", d: "M16 8h5V3" }
  ],
  "log-in": [
    { tag: "path", d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" },
    { tag: "path", d: "m10 17 5-5-5-5M15 12H3" }
  ],
  "play-circle": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m10 8 6 4-6 4Z" }
  ],
  "user-check": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "m16 11 2 2 4-4" }
  ],
  "user-x": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "m17 8 5 5M22 8l-5 5" }
  ],
  "user-search": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "circle", cx: "18", cy: "11", r: "3" },
    { tag: "path", d: "m20.5 13.5 1.5 1.5" }
  ],
  "user-plus": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M19 8v6M22 11h-6" }
  ],
  "user-cog": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "circle", cx: "19", cy: "11", r: "2" },
    { tag: "path", d: "M19 7v1M19 14v1M15.5 9l.9.5M21.6 12.5l.9.5M15.5 13l.9-.5M21.6 9.5l.9-.5" }
  ],
  user: [
    { tag: "path", d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "12", cy: "7", r: "4" }
  ],
  "link-2": [
    { tag: "path", d: "M9 17H7A5 5 0 0 1 7 7h2" },
    { tag: "path", d: "M15 7h2a5 5 0 1 1 0 10h-2" },
    { tag: "path", d: "M8 12h8" }
  ],
  save: [
    { tag: "path", d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" },
    { tag: "path", d: "M17 21v-8H7v8M7 3v5h8" }
  ],
  "trash-2": [{ tag: "path", d: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" }],
  pencil: [
    { tag: "path", d: "M17 3a2.85 2.85 0 0 1 4 4L7 21l-4 1 1-4Z" },
    { tag: "path", d: "m15 5 4 4" }
  ],
  "shield-check": [
    { tag: "path", d: "M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" },
    { tag: "path", d: "m9 12 2 2 4-4" }
  ],
  "x-circle": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m15 9-6 6M9 9l6 6" }
  ],
  download: [
    { tag: "path", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" },
    { tag: "path", d: "M7 10l5 5 5-5M12 15V3" }
  ],
  upload: [
    { tag: "path", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" },
    { tag: "path", d: "M17 8 12 3 7 8M12 3v12" }
  ],
  "folder-open": [
    { tag: "path", d: "M6 14 4 20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-1.5L22 10H8l-2 4Z" },
    { tag: "path", d: "M2 10V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2" }
  ],
  eye: [
    { tag: "path", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" },
    { tag: "circle", cx: "12", cy: "12", r: "3" }
  ],
  "check-circle-2": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m9 12 2 2 4-4" }
  ],
  replace: [
    { tag: "path", d: "M14 4h6v6M20 4l-8 8" },
    { tag: "path", d: "M10 20H4v-6M4 20l8-8" }
  ],
  "table-2": [
    { tag: "rect", x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { tag: "path", d: "M3 10h18M10 4v16" }
  ],
  "chevron-down": [{ tag: "path", d: "m6 9 6 6 6-6" }],
  "ellipsis-vertical": [
    { tag: "circle", cx: "12", cy: "5", r: "1" },
    { tag: "circle", cx: "12", cy: "12", r: "1" },
    { tag: "circle", cx: "12", cy: "19", r: "1" }
  ],
  "toggle-right": [
    { tag: "rect", x: "2", y: "6", width: "20", height: "12", rx: "6" },
    { tag: "circle", cx: "16", cy: "12", r: "2" }
  ],
  copy: [
    { tag: "rect", x: "9", y: "9", width: "13", height: "13", rx: "2" },
    { tag: "path", d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }
  ],
  "file-down": [
    { tag: "path", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" },
    { tag: "path", d: "M14 2v6h6M12 18v-6M9 15l3 3 3-3" }
  ],
  search: [
    { tag: "circle", cx: "11", cy: "11", r: "8" },
    { tag: "path", d: "m21 21-4.3-4.3" }
  ],
  "list-filter": [{ tag: "path", d: "M3 6h18M7 12h10M10 18h4" }],
  "filter-x": [
    { tag: "path", d: "M3 4h18l-7 8v6l-4 2v-8Z" },
    { tag: "path", d: "m17 17 4 4M21 17l-4 4" }
  ],
  hash: [{ tag: "path", d: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" }],
  "file-spreadsheet": [
    { tag: "path", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" },
    { tag: "path", d: "M14 2v6h6M8 13h8M8 17h8M11 9v12" }
  ],
  "clipboard-list": [
    { tag: "rect", x: "8", y: "2", width: "8", height: "4", rx: "1" },
    {
      tag: "path",
      d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 12h8M8 16h8"
    }
  ],
  unplug: [
    { tag: "path", d: "m19 5-3 3M22 2l-3 3M2 22l7-7M9 15l4 4a4 4 0 0 0 6-6l-4-4" },
    { tag: "path", d: "M10 10 6 6M14 6l-4 4" }
  ],
  "code-2": [{ tag: "path", d: "m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" }],
  "key-round": [
    { tag: "circle", cx: "8", cy: "15", r: "4" },
    { tag: "path", d: "M10.8 12.2 21 2M18 5l2 2M15 8l2 2" }
  ],
  info: [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M12 16v-4M12 8h.01" }
  ],
  clock: [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M12 6v6l4 2" }
  ],
  plus: [{ tag: "path", d: "M5 12h14M12 5v14" }],
  sparkles: [
    { tag: "path", d: "m12 3-1.9 5.8L4 11l6.1 2.2L12 19l1.9-5.8L20 11l-6.1-2.2Z" },
    { tag: "path", d: "M5 3v4M3 5h4M19 17v4M17 19h4" }
  ],
  "book-open": [
    { tag: "path", d: "M12 7v14" },
    {
      tag: "path",
      d: "M3 18a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a1 1 0 0 1 1 1V5a1 1 0 0 0-1-1h-5a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4a1 1 0 0 0-1 1Z"
    }
  ],
  "pie-chart": [
    { tag: "path", d: "M21.21 15.89A10 10 0 1 1 8 2.83" },
    { tag: "path", d: "M22 12A10 10 0 0 0 12 2v10Z" }
  ],
  "id-card": [
    { tag: "rect", x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { tag: "circle", cx: "9", cy: "10", r: "2" },
    { tag: "path", d: "M15 8h2M15 12h2M7 16h4" }
  ],
  "cloud-upload": [
    { tag: "path", d: "M12 13v8" },
    { tag: "path", d: "m16 17-4-4-4 4" },
    { tag: "path", d: "M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" },
    { tag: "path", d: "M16 16h1a3 3 0 0 0 0-6h-1" }
  ]
};

function Icon({ name, size = 18, className = "" }) {
  const shapes = iconShapes[name] || iconShapes.info;
  return (
    <svg
      aria-hidden="true"
      className={cx("shrink-0", className)}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}>
      {shapes.map((shape, index) => {
        const { tag = "path", ...attrs } = shape;
        return React.createElement(tag, { key: index, ...attrs });
      })}
    </svg>
  );
}

function actionClass(variant, compact, className) {
  return cx(
    variant === "primary" && primaryButton,
    variant === "danger" && dangerButton,
    variant === "success" && successButton,
    (!variant || variant === "secondary") && secondaryButton,
    compact && compactButton,
    className
  );
}

function ActionButton({
  as = "button",
  variant = "secondary",
  icon,
  iconSize,
  compact = false,
  className = "",
  children,
  type = "button",
  ...props
}) {
  const content = (
    <React.Fragment>
      {icon ? <Icon name={icon} size={iconSize || (compact ? 16 : 18)} /> : null}
      {children ? <span className="truncate">{children}</span> : null}
    </React.Fragment>
  );
  if (as === "a") {
    return (
      <a className={actionClass(variant, compact, className)} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button className={actionClass(variant, compact, className)} type={type} {...props}>
      {content}
    </button>
  );
}

function FieldWithIcon({ icon, children }) {
  return (
    <span className="relative block min-w-0">
      <Icon
        name={icon}
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      {React.cloneElement(children, {
        className: cx(children.props.className, "pl-9")
      })}
    </span>
  );
}

function optionValue(option) {
  if (!React.isValidElement(option)) {
    return "";
  }
  const value = option.props.value;
  return value === undefined || value === null
    ? String(option.props.children || "")
    : String(value);
}

function floatingRoot() {
  return document.getElementById(FLOATING_ROOT_ID) || document.body;
}

function selectFloatingStyle(anchor) {
  if (!anchor) {
    return null;
  }
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const gutter = 8;
  const gap = 4;
  const maxMenuHeight = 256;
  const minUsefulHeight = 144;
  const width = Math.max(rect.width, 160);
  const left = Math.min(
    Math.max(gutter, rect.left),
    Math.max(gutter, viewportWidth - width - gutter)
  );
  const belowSpace = viewportHeight - rect.bottom - gutter;
  const aboveSpace = rect.top - gutter;
  const openAbove = belowSpace < minUsefulHeight && aboveSpace > belowSpace;
  const availableSpace = Math.max(openAbove ? aboveSpace : belowSpace, 96);
  const maxHeight = Math.min(maxMenuHeight, Math.max(96, availableSpace - gap));
  const style = {
    left,
    width,
    maxHeight,
    zIndex: 10000
  };

  if (openAbove) {
    style.bottom = Math.max(gutter, viewportHeight - rect.top + gap);
  } else {
    style.top = Math.min(rect.bottom + gap, viewportHeight - gutter);
  }

  return style;
}

function actionsFloatingStyle(anchor) {
  if (!anchor) {
    return null;
  }
  const rect = anchor.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return {
    right: Math.max(8, (window.innerWidth || document.documentElement.clientWidth) - rect.left),
    top: Math.min(Math.max(8, rect.top + rect.height / 2), viewportHeight - 8),
    zIndex: 10000
  };
}

function SelectField({
  icon,
  className = "",
  children,
  value,
  defaultValue,
  onChange,
  disabled = false,
  ...props
}) {
  const [open, setOpen] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const options = React.Children.toArray(children).filter(React.isValidElement);
  const fallbackValue = options.length ? optionValue(options[0]) : "";
  const selectedValue = String(value ?? defaultValue ?? fallbackValue);
  const selectedOption =
    options.find((option) => optionValue(option) === selectedValue) || options[0] || null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updatePosition() {
      setFloatingStyle(selectFloatingStyle(rootRef.current));
    }

    function closeFromOutside(event) {
      const clickedRoot = rootRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (rootRef.current && !clickedRoot && !clickedMenu) {
        setOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updatePosition();
    document.addEventListener("mousedown", closeFromOutside);
    document.addEventListener("touchstart", closeFromOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      document.removeEventListener("touchstart", closeFromOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function chooseOption(option) {
    if (option.props.disabled) {
      return;
    }
    const nextValue = optionValue(option);
    onChange?.({
      target: { value: nextValue, name: props.name },
      currentTarget: { value: nextValue, name: props.name }
    });
    setOpen(false);
  }

  const dropdown =
    open && !disabled && floatingStyle
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="overflow-hidden rounded-lg border border-line bg-panel shadow-soft"
            style={{
              position: "fixed",
              left: floatingStyle.left,
              top: floatingStyle.top,
              bottom: floatingStyle.bottom,
              width: floatingStyle.width,
              zIndex: floatingStyle.zIndex
            }}>
            <div
              className="overflow-auto rounded-b-lg p-1"
              role="listbox"
              style={{ maxHeight: floatingStyle.maxHeight }}>
              {options.map((option, index) => {
                const nextValue = optionValue(option);
                const selected = nextValue === selectedValue;
                const optionDisabled = Boolean(option.props.disabled);
                return (
                  <button
                    key={option.key || `${nextValue}-${index}`}
                    className={cx(
                      "flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm font-bold text-ink transition hover:bg-[#FFF7D6] focus:bg-[#FFF7D6] focus:outline-none",
                      selected && "bg-yellow-50",
                      optionDisabled && "cursor-not-allowed opacity-50"
                    )}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={optionDisabled}
                    onClick={() => chooseOption(option)}>
                    <span className="min-w-0 truncate">{option.props.children}</span>
                    {selected ? (
                      <Icon name="check" size={16} className="shrink-0 text-success" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>,
          floatingRoot()
        )
      : null;

  return (
    <span ref={rootRef} className={cx("relative block min-w-0", className)}>
      {icon ? (
        <Icon
          name={icon}
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
      ) : null}
      <button
        className={cx(
          selectClass,
          "flex items-center text-left",
          icon && "pl-9",
          disabled && "cursor-not-allowed opacity-60"
        )}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        {...props}>
        <span className="min-w-0 flex-1 truncate">{selectedOption?.props.children || ""}</span>
      </button>
      <Icon
        name="chevron-down"
        size={16}
        className={cx(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/70 transition duration-150",
          open && "rotate-180"
        )}
      />
      {dropdown}
    </span>
  );
}

function timeSortValue(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeSortValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return String(value).toLocaleLowerCase();
}

function compareSortValues(left, right) {
  const normalizedLeft = normalizeSortValue(left);
  const normalizedRight = normalizeSortValue(right);
  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    return normalizedLeft - normalizedRight;
  }
  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function sortRows(rows, sortConfig, columns) {
  const column = columns.find((item) => item.key === sortConfig.key);
  if (!column || column.sortable === false) {
    return rows;
  }
  const direction = sortConfig.direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const leftValue = column.sortValue ? column.sortValue(left) : left?.[column.key];
    const rightValue = column.sortValue ? column.sortValue(right) : right?.[column.key];
    return compareSortValues(leftValue, rightValue) * direction;
  });
}

function useTableSort(defaultKey, defaultDirection = "asc") {
  const [sortConfig, setSortConfig] = useState({
    key: defaultKey,
    direction: defaultDirection
  });
  useEffect(() => {
    setSortConfig((current) =>
      current.key || !defaultKey ? current : { key: defaultKey, direction: defaultDirection }
    );
  }, [defaultKey, defaultDirection]);
  const toggleSort = useCallback((key) => {
    setSortConfig((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }, []);
  return { sortConfig, toggleSort };
}

function SortableHeaderRow({ columns, sortConfig, onSort }) {
  return (
    <thead>
      <tr>
        {columns.map((column) => {
          const active = sortConfig?.key === column.key;
          const canSort = column.key && column.sortable !== false;
          return (
            <th key={column.key || column.label} className={cx(thClass, column.className)}>
              {canSort ? (
                <button
                  className="inline-flex items-center gap-1.5 text-left uppercase"
                  type="button"
                  onClick={() => onSort(column.key)}>
                  <span>{column.label}</span>
                  <Icon
                    name="chevron-down"
                    size={14}
                    className={cx(
                      "transition duration-150",
                      active ? "opacity-100" : "opacity-40",
                      active && sortConfig.direction === "asc" ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
              ) : (
                column.label
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function actionMenuItems(children) {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }
    return React.cloneElement(child, {
      className: cx("w-full justify-start whitespace-nowrap", child.props.className)
    });
  });
}

function ActionsMenu({ children, label = "Row actions" }) {
  const [open, setOpen] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const updatePosition = useCallback(() => {
    setFloatingStyle(actionsFloatingStyle(rootRef.current));
  }, []);

  const showMenu = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    setOpen(true);
    setFloatingStyle(actionsFloatingStyle(rootRef.current));
  }, []);

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  const menu =
    open && floatingStyle
      ? ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="py-4 pr-3"
            style={{
              position: "fixed",
              right: floatingStyle.right,
              top: floatingStyle.top,
              transform: "translateY(-50%)",
              zIndex: floatingStyle.zIndex
            }}
            onMouseEnter={showMenu}
            onMouseLeave={scheduleClose}
            onFocus={showMenu}
            onBlur={scheduleClose}>
            <div className="grid gap-1 overflow-hidden rounded-lg border border-line bg-panel p-2 shadow-soft">
              {actionMenuItems(children)}
            </div>
          </div>,
          floatingRoot()
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="relative inline-flex justify-end"
      onMouseEnter={showMenu}
      onMouseLeave={scheduleClose}
      onFocus={showMenu}
      onBlur={scheduleClose}>
      <button
        className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel text-ink transition hover:bg-[#FFF7D6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
        type="button"
        aria-label={label}>
        <Icon name="ellipsis-vertical" size={18} />
      </button>
      {menu}
    </div>
  );
}

function FileControl({ file, onChange, accept, label = "Choose file" }) {
  return (
    <span
      className={cx(secondaryButton, "relative w-full justify-start border-dashed bg-[#FFFDF7]")}>
      <Icon name="upload" size={18} />
      <span className="truncate">{file?.name || label}</span>
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        onChange={onChange}
      />
    </span>
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${response.status} ${details || response.statusText}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function safeFetch(url, fallback, options = {}) {
  try {
    return await fetchJson(url, options);
  } catch (error) {
    console.error(`Unable to load ${url}`, error);
    return fallback;
  }
}

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function formatShortDate(value) {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Never"
    : date.toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function participantKey(name) {
  return normalize(name);
}

function studentKeys(student) {
  return [student.full_name, ...(student.aliases || [])].map(normalize).filter(Boolean);
}

function matchStudent(students, participantName, groupName = "") {
  const key = participantKey(participantName);
  if (!key) {
    return null;
  }
  const groupStudents = groupName
    ? students.filter((student) => student.group_name === groupName)
    : students;
  return (
    groupStudents.find((student) => studentKeys(student).includes(key)) ||
    students.find((student) => studentKeys(student).includes(key)) ||
    null
  );
}

function suggestStudent(students, record) {
  const key = participantKey(record.participant_name);
  const candidates = record.group_name
    ? students.filter((student) => student.group_name === record.group_name)
    : students;
  if (!key || !candidates.length) {
    return null;
  }
  const words = new Set(key.split(" ").filter((part) => part.length > 2));
  let best = null;
  let bestScore = 0;
  for (const student of candidates) {
    const score = studentKeys(student).reduce((total, studentKey) => {
      if (studentKey === key) {
        return total + 100;
      }
      if (studentKey.includes(key) || key.includes(studentKey)) {
        return total + 20;
      }
      return total + studentKey.split(" ").filter((part) => words.has(part)).length;
    }, 0);
    if (score > bestScore) {
      best = student;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function activeMeeting(meetings) {
  return meetings.find((meeting) => !meeting.ended_at) || null;
}

function meetingDisplayName(meeting) {
  if (!meeting) {
    return "No active meeting";
  }
  return meeting.title || meeting.zoom_meeting_id || `Session #${meeting.id}`;
}

function lastActivityTime(currentRecords, unmatchedRecords, historyRecords) {
  const dates = [...currentRecords, ...unmatchedRecords, ...historyRecords]
    .map((record) => new Date(record.last_seen))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) {
    return null;
  }
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function uniqueGroups(students) {
  return [...new Set(students.map((student) => student.group_name).filter(Boolean))].sort();
}

function historyLimit(records) {
  return records.slice(0, MAX_ATTENDANCE);
}

function Badge({ children, tone = "neutral" }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-black",
        tones[tone] || tones.neutral
      )}>
      {children}
    </span>
  );
}

function zoomAccountLabel(oauthStatus) {
  return oauthStatus?.email || oauthStatus?.display_name || oauthStatus?.user_id || "";
}

function ZoomStatusPill({ oauthStatus, className = "" }) {
  const checking = !oauthStatus;
  const connected = Boolean(oauthStatus?.authorized);
  const account = zoomAccountLabel(oauthStatus);
  const label = checking
    ? "Zoom checking"
    : connected
      ? account || "Connected"
      : "Zoom not connected";

  return (
    <div
      className={cx(
        "inline-flex min-h-11 max-w-[420px] items-center gap-1.5 rounded-lg border bg-panel px-4 text-sm font-black shadow-soft",
        connected ? "border-line text-ink" : "border-yellow-300 text-warning",
        className
      )}>
      <span
        className={cx("h-2.5 w-2.5 shrink-0 rounded-full", connected ? "bg-success" : "bg-warning")}
      />
      <span className="truncate">{label}</span>
    </div>
  );
}

function currentLessonStatus({
  oauthStatus,
  sdkConfig,
  meetings,
  currentRecords,
  unmatchedRecords
}) {
  if (!oauthStatus) {
    return { label: "Ready", tone: "neutral" };
  }
  if (sdkConfig?.configured === false || !oauthStatus.authorized) {
    return { label: "Error", tone: "danger" };
  }
  if (activeMeeting(meetings) || currentRecords?.length || unmatchedRecords?.length) {
    return { label: "Syncing", tone: "success" };
  }
  if (sdkConfig?.configured) {
    return { label: "Ready", tone: "success" };
  }
  return { label: "Connected", tone: "neutral" };
}

function Card({ children, className = "", ...props }) {
  return (
    <article className={cx(cardClass, className)} {...props}>
      {children}
    </article>
  );
}

function CardHeader({ title, meta, icon, children }) {
  return (
    <div className={cardHeaderClass}>
      <div className="min-w-0">
        <h2 className="m-0 inline-flex items-center gap-1.5 text-xl font-black">
          {icon ? <Icon name={icon} size={20} /> : null}
          <span>{title}</span>
        </h2>
        {meta ? <p className="mt-1 text-sm leading-6 text-muted">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}

function PageMetricCard({ icon, title, value, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "bg-green-50 text-success"
      : tone === "warning"
        ? "bg-orange-50 text-orange-600"
        : tone === "danger"
          ? "bg-red-50 text-danger"
          : tone === "blue"
            ? "bg-blue-50 text-blue-600"
            : tone === "purple"
              ? "bg-purple-50 text-purple-600"
              : "bg-[#FFF7E8] text-warning";
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-orange-600"
        : tone === "danger"
          ? "text-danger"
          : tone === "blue"
            ? "text-blue-600"
            : tone === "purple"
              ? "text-purple-600"
              : "text-ink";
  return (
    <Card className="min-h-[124px]">
      <div className="flex h-full items-center gap-3 p-6">
        <span className={cx("grid h-16 w-16 shrink-0 place-items-center rounded-full", toneClass)}>
          <Icon name={icon} size={31} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-muted">{title}</span>
          <strong className={cx("mt-2 block text-[1.75rem] font-black leading-tight", valueClass)}>
            {value}
          </strong>
        </span>
      </div>
    </Card>
  );
}

function SoftIcon({ icon, tone = "neutral", size = "lg" }) {
  const palette =
    tone === "success"
      ? "bg-green-50 text-success"
      : tone === "warning"
        ? "bg-orange-50 text-orange-600"
        : tone === "danger"
          ? "bg-red-50 text-danger"
          : tone === "blue"
            ? "bg-blue-50 text-blue-600"
            : tone === "purple"
              ? "bg-purple-50 text-purple-600"
              : "bg-[#F6EEDB] text-[#C7A96B]";
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-full",
        palette,
        size === "sm" ? "h-10 w-10" : "h-14 w-14"
      )}>
      <Icon name={icon} size={size === "sm" ? 20 : 28} />
    </span>
  );
}

function EmptyState({ icon = "clipboard-list", title, detail, children, compact = false }) {
  return (
    <div
      className={cx(
        "grid place-items-center text-center",
        compact ? "min-h-[126px] gap-2 p-5" : "min-h-[260px] gap-3 p-8"
      )}>
      <SoftIcon icon={icon} size={compact ? "sm" : "lg"} />
      <div>
        <strong className="block text-lg font-black">{title}</strong>
        {detail ? <p className="mt-2 max-w-[36ch] text-sm leading-6 text-muted">{detail}</p> : null}
      </div>
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div> : null}
    </div>
  );
}

function DownloadTemplateButton({ kind, children }) {
  const templates = {
    students: {
      name: "students-template.csv",
      content: 'student_name,group,aliases\nIvan Petrov,252,"Ivan P.;I. Petrov"\n'
    },
    schedule: {
      name: "schedule-template.csv",
      content: "date,start_time,end_time,group,title\n2026-06-29,09:00,10:00,252,Math lesson\n"
    }
  };
  function download() {
    const template = templates[kind];
    if (!template) {
      return;
    }
    const blob = new Blob([template.content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = template.name;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <ActionButton icon="file-down" onClick={download}>
      {children}
    </ActionButton>
  );
}

function DropZone({
  file,
  onChange,
  accept,
  title,
  browseLabel = "Browse files",
  icon = "cloud-upload"
}) {
  return (
    <label className="relative flex min-h-[86px] cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-line bg-[#FFFDF7] px-5 py-4 text-sm font-bold text-muted">
      <SoftIcon icon={icon} size="sm" />
      <span className="min-w-0">
        <strong className="block truncate text-ink">{file?.name || title}</strong>
        <span className="mt-1 inline-flex rounded-md border border-line bg-panel px-2 py-1 text-xs font-black text-muted">
          {browseLabel}
        </span>
      </span>
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        onChange={onChange}
      />
    </label>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td
        className="border-b border-line px-3 py-3 text-sm italic leading-6 text-muted whitespace-normal"
        colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

function StatusTile({ label, value, tone = "neutral", wide = false, icon }) {
  return (
    <div
      className={cx(
        "flex items-center gap-2.5 rounded-lg border border-line bg-[#FFFDF7] p-4",
        wide && "sm:col-span-2"
      )}>
      {icon ? <SoftIcon icon={icon} tone={tone} size="sm" /> : null}
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase text-muted">{label}</div>
        <div
          className={cx(
            "mt-1 truncate text-base font-black",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger",
            tone === "neutral" && "text-ink"
          )}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Shell({
  page,
  goToPage,
  oauthStatus,
  language,
  onLanguageChange,
  languageChanging,
  children
}) {
  const checkingZoom = !oauthStatus;
  const zoomConnected = Boolean(oauthStatus?.authorized);
  const zoomLabel = checkingZoom
    ? "Zoom checking"
    : zoomConnected
      ? "Zoom connected"
      : "Zoom not connected";

  function go(nextPage) {
    goToPage(nextPage);
  }

  return (
    <div className="grid min-h-screen min-w-[1040px] grid-cols-[300px_minmax(760px,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col gap-5 overflow-y-auto border-r border-line bg-[#FFFDF7] px-4 py-5">
        <ZoomStatusPill oauthStatus={oauthStatus} className="w-full max-w-none justify-start" />

        <nav className="grid gap-2" aria-label="Primary navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              className={cx(
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-left text-sm font-black transition",
                page === item.id
                  ? "border-[#D9C300] bg-yellow-100 text-ink"
                  : "border-transparent text-muted hover:bg-panel hover:text-ink"
              )}
              type="button"
              onClick={() => go(item.id)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-line pt-4 text-sm font-black">
          <LanguageSwitcher language={language} onLanguageChange={onLanguageChange} />
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                zoomConnected ? "bg-success" : "bg-warning"
              )}
            />
            {zoomLabel}
          </span>
          <a
            className="inline-flex items-center gap-1.5 font-black underline decoration-accent decoration-4 underline-offset-4"
            href="/#live-attendance">
            <Icon name="video" size={16} />
            Open current lesson
          </a>
        </div>
      </aside>
      <main
        className={cx(
          "grid content-start gap-5 bg-canvas px-8 py-7 pb-12 transition-all duration-200 ease-out",
          languageChanging ? "translate-y-0.5 opacity-60" : "translate-y-0 opacity-100"
        )}>
        {children}
      </main>
    </div>
  );
}

function Header({
  page,
  refreshData,
  oauthStatus,
  sdkConfig,
  meetings,
  currentRecords,
  unmatchedRecords,
  goToPage
}) {
  const isDashboard = page === "menu";
  const isCurrentLesson = page === "live-attendance";
  const isMeetings = page === "meetings";
  const isStudents = page === "students";
  const isReports = page === "reports";
  const isSettings = page === "settings";
  const lessonStatus = currentLessonStatus({
    oauthStatus,
    sdkConfig,
    meetings,
    currentRecords,
    unmatchedRecords
  });

  return (
    <header className="flex items-center justify-between gap-5">
      <div>
        <h1 className="text-5xl font-black leading-none">{pageTitles[page] || "Dashboard"}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {isCurrentLesson ? <Badge tone={lessonStatus.tone}>{lessonStatus.label}</Badge> : null}
        {isDashboard || isMeetings || isSettings ? (
          <ActionButton icon="refresh-cw" onClick={refreshData}></ActionButton>
        ) : null}
        {isDashboard ? (
          <ActionButton icon="video" variant="primary" onClick={() => goToPage("live-attendance")}>
            Start / Join lesson
          </ActionButton>
        ) : null}
        {isMeetings ? (
          <ActionButton
            icon="video"
            variant="primary"
            onClick={() => document.getElementById("saved-meeting-title")?.focus()}>
            New meeting
          </ActionButton>
        ) : null}
        {isStudents ? (
          <ActionButton
            icon="cloud-upload"
            variant="primary"
            onClick={() =>
              document
                .getElementById("student-import-card")
                ?.scrollIntoView({ block: "start", behavior: "smooth" })
            }>
            Import students
          </ActionButton>
        ) : null}
        {isReports ? (
          <ActionButton
            icon="clipboard-list"
            variant="primary"
            onClick={() => document.getElementById("generate-attendance-journal")?.click()}>
            Generate journal
          </ActionButton>
        ) : null}
      </div>
    </header>
  );
}

function trendDates() {
  const dates = [];
  const today = new Date();
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function AttendanceTrend({ records, meetings, trendFilter, setTrendFilter }) {
  const filters = [
    { key: "present", label: "Present", icon: "user-check" },
    { key: "absent", label: "Absent", icon: "user-x" },
    { key: "unmatched", label: "Needs review", icon: "user-search" },
    { key: "meetings", label: "Lessons", icon: "calendar-days" }
  ];
  const points = useMemo(() => {
    const days = trendDates();
    return days.map((day) => {
      const recordsForDay = records.filter((record) => sameDay(new Date(record.first_seen), day));
      const meetingsForDay = meetings.filter((meeting) =>
        sameDay(new Date(meeting.started_at), day)
      );
      const value =
        trendFilter === "meetings"
          ? meetingsForDay.length
          : trendFilter === "absent"
            ? recordsForDay.filter((record) => record.status !== "active").length
            : trendFilter === "unmatched"
              ? recordsForDay.filter((record) => !record.meeting_session_id).length
              : recordsForDay.filter((record) => record.status === "active").length;
      return {
        label: day.toLocaleDateString([], { weekday: "short" }),
        value
      };
    });
  }, [records, meetings, trendFilter]);
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <Card>
      <CardHeader title="Attendance Analytics" icon="bar-chart-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              className={cx(
                "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-black",
                trendFilter === filter.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-panel text-muted"
              )}
              type="button"
              onClick={() => setTrendFilter(filter.key)}>
              <Icon name={filter.icon} size={16} />
              {filter.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="grid gap-3 p-5">
        <div className="grid min-h-56 grid-cols-7 items-end gap-2 rounded-lg border border-line bg-white p-4">
          {points.map((point) => (
            <div key={point.label} className="grid h-full min-w-0 content-end gap-2">
              <strong className="text-center text-sm font-black">{point.value}</strong>
              <div
                className={cx(
                  "min-h-1.5 rounded-t-md",
                  trendFilter === "absent"
                    ? "bg-danger"
                    : trendFilter === "unmatched"
                      ? "bg-warning"
                      : trendFilter === "meetings"
                        ? "bg-ink"
                        : "bg-success"
                )}
                style={{ height: `${Math.max(6, (point.value / max) * 160)}px` }}
              />
              <span className="text-center text-xs font-black text-muted">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MiniStats({ meetings, students, records }) {
  const stats = [
    ["Total meetings", meetings.length],
    ["Tracked sessions", meetings.filter((meeting) => !meeting.ended_at).length || meetings.length],
    ["Total students", students.length],
    ["Attendance records", Math.min(records.length, MAX_ATTENDANCE)]
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-line bg-[#FFFDF7] p-4">
          <span className="text-xs font-black uppercase text-muted">{label}</span>
          <strong className="mt-3 block text-3xl font-black">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function UnmatchedTable({ records, students, createAlias }) {
  const columns = [
    { key: "participant_name", label: "Zoom name" },
    {
      key: "suggested",
      label: "Suggested student",
      sortValue: (record) => suggestStudent(students, record)?.full_name || ""
    },
    { key: "actions", label: "Action", sortable: false }
  ];
  const { sortConfig, toggleSort } = useTableSort("participant_name");
  const rows = sortRows(records.slice(0, MAX_ATTENDANCE), sortConfig, columns);
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
        <tbody>
          {rows.length ? (
            rows.map((record) => {
              const groupStudents = record.group_name
                ? students.filter((student) => student.group_name === record.group_name)
                : students;
              const suggested = suggestStudent(students, record);
              return (
                <AliasRow
                  key={`${record.meeting_session_id || record.meeting_id}-${record.participant_name}`}
                  record={record}
                  students={groupStudents}
                  suggested={suggested}
                  createAlias={createAlias}
                />
              );
            })
          ) : (
            <EmptyRow colSpan={3}>All active participants match the selected roster.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AliasRow({ record, students, suggested, createAlias }) {
  const [studentId, setStudentId] = useState(String(suggested?.id || students[0]?.id || ""));
  useEffect(() => {
    setStudentId(String(suggested?.id || students[0]?.id || ""));
  }, [record.participant_name, suggested?.id, students.length]);

  return (
    <tr>
      <td className={tdClass}>{record.participant_name}</td>
      <td className={tdClass}>
        <SelectField
          icon="user-check"
          className="min-w-40"
          value={studentId}
          disabled={!students.length}
          onChange={(event) => setStudentId(event.target.value)}>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name} ({student.group_name})
            </option>
          ))}
        </SelectField>
      </td>
      <td className={tdClass}>
        <ActionsMenu>
          <ActionButton
            compact
            icon="link-2"
            disabled={!studentId}
            onClick={() => createAlias(Number(studentId), record.participant_name)}>
            Create alias / Link
          </ActionButton>
        </ActionsMenu>
      </td>
    </tr>
  );
}

function DashboardStep({ index, title, detail, done, actionLabel, href, onAction, icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-[#FFFDF7] p-4">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm",
            done
              ? "border-green-200/70 bg-green-50 text-success font-medium"
              : "border-line/50 bg-[#F6F3EA] text-ink/60 font-normal"
          )}>
          {done ? <Icon name="check-circle-2" size={18} /> : index}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-black">{title}</strong>
          <span className="mt-1 block text-sm leading-5 text-muted">{detail}</span>
        </span>
      </div>
      <Badge tone={done ? "success" : "warning"}>{done ? "Done" : "Pending"}</Badge>
    </div>
  );
}

function DashboardChecklist({
  oauthStatus,
  students,
  savedMeetings,
  meetings,
  historyRecords,
  goToPage
}) {
  const zoomConnected = Boolean(oauthStatus?.authorized);
  const active = activeMeeting(meetings);
  const account = zoomAccountLabel(oauthStatus);
  const steps = [
    {
      title: "Connect Zoom",
      detail: zoomConnected
        ? account
          ? `Connected as ${account}.`
          : "Your Zoom account is connected."
        : "Connect Zoom so host join and live sync are available.",
      done: zoomConnected,
      actionLabel: "Connect",
      href: "/zoom/oauth/start?prompt=login",
      icon: "log-in"
    },
    {
      title: "Import students",
      detail: "Add students manually, import a file, or connect a Google Sheet.",
      done: students.length > 0,
      actionLabel: "Students",
      onAction: () => goToPage("students"),
      icon: "users"
    },
    {
      title: "Save or select a meeting",
      detail: "Keep recurring Zoom meetings ready for lesson setup.",
      done: savedMeetings.length > 0 || Boolean(active),
      actionLabel: "Meetings",
      onAction: () => goToPage("meetings"),
      icon: "calendar-days"
    },
    {
      title: "Start current lesson",
      detail: "Open Current Lesson to join Zoom and begin attendance sync.",
      done: Boolean(active),
      actionLabel: "Open",
      onAction: () => goToPage("live-attendance"),
      icon: "video"
    },
    {
      title: "Generate report",
      detail: "Review synced attendance and generate journals after lessons.",
      done: historyRecords.length > 0,
      actionLabel: "Reports",
      onAction: () => goToPage("reports"),
      icon: "bar-chart-3"
    }
  ];

  return (
    <Card>
      <CardHeader title="Setup checklist" />
      <div className="grid gap-3 p-5">
        {steps.map((step, index) => (
          <DashboardStep key={step.title} index={index + 1} {...step} />
        ))}
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
          <Icon name="sparkles" size={16} />
          Complete the steps to get the most out of Teacher Console.
        </p>
      </div>
    </Card>
  );
}

function MenuPage(props) {
  const {
    meetings,
    savedMeetings,
    students,
    historyRecords,
    oauthStatus,
    trendFilter,
    setTrendFilter,
    goToPage
  } = props;
  const active = activeMeeting(meetings);
  const attendanceRows = Math.min(historyRecords.length, MAX_ATTENDANCE);
  const recentColumns = [
    { key: "id", label: "Session" },
    {
      key: "title",
      label: "Lesson",
      sortValue: (meeting) => meeting.title || meeting.zoom_meeting_id
    },
    {
      key: "started_at",
      label: "Started",
      sortValue: (meeting) => timeSortValue(meeting.started_at)
    },
    {
      key: "status",
      label: "Status",
      sortValue: (meeting) => (meeting.ended_at ? "Closed" : "Active")
    }
  ];
  const { sortConfig: recentSortConfig, toggleSort: toggleRecentSort } = useTableSort(
    "started_at",
    "desc"
  );
  const recentRows = sortRows(meetings, recentSortConfig, recentColumns).slice(0, 3);

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-4 gap-4 max-[1280px]:grid-cols-2">
        <PageMetricCard
          icon="video"
          title="Zoom status"
          value={oauthStatus?.authorized ? "Connected" : "Not connected"}
          tone={oauthStatus?.authorized ? "success" : "warning"}
        />
        <PageMetricCard icon="users" title="Students" value={students.length} tone="purple" />
        <PageMetricCard
          icon="book-open"
          title="Current lesson"
          value={active ? "Started" : "Not started"}
          tone={active ? "success" : "warning"}
        />
        <PageMetricCard icon="pie-chart" title="Attendance" value={attendanceRows} tone="blue" />
      </div>

      <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(360px,1fr)] items-start gap-5 max-[1280px]:grid-cols-1">
        <DashboardChecklist
          oauthStatus={oauthStatus}
          students={students}
          savedMeetings={savedMeetings}
          meetings={meetings}
          historyRecords={historyRecords}
          goToPage={goToPage}
        />
        <div className="grid gap-5">
          <Card>
            <CardHeader title="Attendance overview" />
            {historyRecords.length ? (
              <div className="grid gap-4 p-6">
                <div className="grid grid-cols-3 gap-3">
                  <StatusTile label="Rows" value={attendanceRows} icon="pie-chart" tone="blue" />
                  <StatusTile label="Sessions" value={meetings.length} icon="calendar-days" />
                  <StatusTile
                    label="Last sync"
                    value={formatShortDate(lastActivityTime([], [], historyRecords))}
                    icon="clock"
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                icon="bar-chart-3"
                title="No attendance data yet."
                detail="Start your first lesson to see analytics here.">
                <ActionButton
                  icon="video"
                  variant="primary"
                  onClick={() => goToPage("live-attendance")}>
                  Open current lesson
                </ActionButton>
              </EmptyState>
            )}
          </Card>
          <Card>
            <CardHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-3 p-5 2xl:grid-cols-4">
              {[
                ["Open", "Current lesson", "video", "live-attendance"],
                ["Manage", "Meetings", "calendar-days", "meetings"],
                ["Manage", "Students", "users", "students"],
                ["View", "Reports", "bar-chart-3", "reports"]
              ].map(([eyebrow, label, icon, target]) => (
                <button
                  key={label}
                  className="flex min-h-[78px] items-center justify-between gap-2 rounded-lg border border-line bg-[#FFFDF7] p-3 text-left transition hover:-translate-y-px"
                  type="button"
                  onClick={() => goToPage(target)}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-ink">
                      <Icon name={icon} size={21} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-muted">{eyebrow}</span>
                      <strong className="block text-sm font-black leading-tight">{label}</strong>
                    </span>
                  </span>
                  <Icon name="chevron-down" size={16} className="-rotate-90 text-warning" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Recent activity">
          <ActionButton compact onClick={() => goToPage("meetings")}>
            View all
          </ActionButton>
        </CardHeader>
        {recentRows.length ? (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <SortableHeaderRow
                columns={recentColumns}
                sortConfig={recentSortConfig}
                onSort={toggleRecentSort}
              />
              <tbody>
                {recentRows.map((meeting) => (
                  <tr key={meeting.id}>
                    <td className={tdClass}>#{meeting.id}</td>
                    <td className={tdClass}>{meeting.title || meeting.zoom_meeting_id}</td>
                    <td className={tdClass}>{formatShortDate(meeting.started_at)}</td>
                    <td className={tdClass}>
                      <Badge tone={meeting.ended_at ? "neutral" : "success"}>
                        {meeting.ended_at ? "Closed" : "Active"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-6">
            <SoftIcon icon="clock" size="sm" />
            <span>
              <strong className="block font-black">No recent activity yet.</strong>
              <span className="text-sm text-muted">
                Your recent lessons and actions will appear here.
              </span>
            </span>
          </div>
        )}
      </Card>
    </section>
  );
}

function MeetingsPage({
  meetings,
  savedMeetings,
  ownershipChecks,
  refreshData,
  saveSavedMeeting,
  deleteSavedMeeting,
  checkSavedMeeting,
  updateMeeting,
  closeMeeting
}) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [draft, setDraft] = useState({
    title: "",
    meeting_number: "",
    passcode: "",
    join_as_host: true
  });
  const filtered = savedMeetings
    .filter((meeting) => {
      const matchesSearch =
        !search ||
        normalize(`${meeting.title || ""} ${meeting.meeting_number}`).includes(normalize(search));
      const matchesMode =
        mode === "all" ||
        (mode === "host" && meeting.join_as_host) ||
        (mode === "participant" && !meeting.join_as_host) ||
        mode === "recent";
      return matchesSearch && matchesMode;
    })
    .slice(0, mode === "recent" ? 5 : savedMeetings.length);

  async function submitSavedMeeting(event) {
    event.preventDefault();
    await saveSavedMeeting(draft);
    setDraft({ title: "", meeting_number: "", passcode: "", join_as_host: true });
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
        <div className="flex gap-3">
          <FieldWithIcon icon="search">
            <input
              className={cx(inputClass, "w-[340px]")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search meetings"
            />
          </FieldWithIcon>
          <SelectField
            icon="list-filter"
            className="w-52"
            value={mode}
            onChange={(event) => setMode(event.target.value)}>
            <option value="all">All meetings</option>
            <option value="host">Host meetings</option>
            <option value="participant">Participant meetings</option>
            <option value="recent">Recently used</option>
          </SelectField>
        </div>
        <ActionButton
          icon="filter-x"
          onClick={() => {
            setSearch("");
            setMode("all");
          }}>
          Clear filters
        </ActionButton>
      </div>

      <Card>
        <CardHeader
          title="Saved Zoom meetings"
          meta="Save recurring Zoom meetings here for quick lesson setup."
        />
        <form
          className="grid grid-cols-[minmax(220px,1fr)_180px_160px_150px_auto] items-end gap-4 p-5"
          onSubmit={submitSavedMeeting}>
          <label className={labelClass}>
            Meeting name
            <input
              id="saved-meeting-title"
              className={inputClass}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="e.g. Grade 3 Math - Morning"
            />
          </label>
          <label className={labelClass}>
            Meeting ID
            <input
              className={inputClass}
              value={draft.meeting_number}
              onChange={(event) => setDraft({ ...draft, meeting_number: event.target.value })}
              placeholder="e.g. 72501545228"
              required
            />
          </label>
          <label className={labelClass}>
            Passcode
            <input
              className={inputClass}
              value={draft.passcode}
              onChange={(event) => setDraft({ ...draft, passcode: event.target.value })}
              placeholder="e.g. 123456"
            />
          </label>
          <label className={labelClass}>
            Role
            <SelectField
              value={draft.join_as_host ? "host" : "participant"}
              onChange={(event) =>
                setDraft({ ...draft, join_as_host: event.target.value === "host" })
              }>
              <option value="host">Host</option>
              <option value="participant">Participant</option>
            </SelectField>
          </label>
          <ActionButton icon="save" variant="primary" type="submit">
            Save meeting
          </ActionButton>
        </form>
        <div className="border-t border-dashed border-line">
          <SavedMeetingsTable
            embedded
            meetings={filtered}
            trackedMeetings={meetings}
            ownershipChecks={ownershipChecks}
            setDraft={setDraft}
            deleteSavedMeeting={deleteSavedMeeting}
            checkSavedMeeting={checkSavedMeeting}
          />
        </div>
      </Card>
      <TrackedMeetingsTable
        meetings={meetings}
        updateMeeting={updateMeeting}
        closeMeeting={closeMeeting}
      />
    </section>
  );
}

function meetingJoinUrl(meeting) {
  const params = new URLSearchParams({
    meetingNumber: meeting.meeting_number,
    joinAsHost: meeting.join_as_host ? "1" : "0"
  });
  if (meeting.passcode) {
    params.set("passcode", meeting.passcode);
  }
  return `/teacher-meeting?${params.toString()}`;
}

function SavedMeetingsTable({
  embedded = false,
  meetings,
  trackedMeetings,
  ownershipChecks,
  setDraft,
  deleteSavedMeeting,
  checkSavedMeeting
}) {
  const columns = [
    {
      key: "title",
      label: "Meeting name",
      sortValue: (meeting) => meeting.title || "Untitled meeting"
    },
    { key: "meeting_number", label: "Meeting ID" },
    {
      key: "join_as_host",
      label: "Role",
      sortValue: (meeting) => (meeting.join_as_host ? "Host" : "Participant")
    },
    {
      key: "owner",
      label: "Owner/access",
      sortValue: (meeting) => {
        const check = ownershipChecks[meeting.meeting_number];
        if (!check) return "Not checked";
        if (!check.can_read) return "No access";
        return check.owner_matches_authorized_user ? "Owner match" : "Readable";
      }
    },
    {
      key: "updated_at",
      label: "Last used",
      sortValue: (meeting) => timeSortValue(meeting.updated_at)
    },
    {
      key: "sync",
      label: "Sync",
      sortValue: (meeting) => {
        const tracked = trackedMeetings.find(
          (item) => item.zoom_meeting_id === meeting.meeting_number
        );
        return tracked ? (tracked.ended_at ? "Tracked" : "Active") : "Idle";
      }
    },
    { key: "actions", label: "Actions", sortable: false }
  ];
  const { sortConfig, toggleSort } = useTableSort("updated_at", "desc");
  const sortedMeetings = sortRows(meetings, sortConfig, columns);
  const content = (
    <React.Fragment>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
          <tbody>
            {sortedMeetings.length ? (
              sortedMeetings.map((meeting) => {
                const check = ownershipChecks[meeting.meeting_number];
                const tracked = trackedMeetings.find(
                  (item) => item.zoom_meeting_id === meeting.meeting_number
                );
                return (
                  <tr key={meeting.id}>
                    <td className={tdClass}>{meeting.title || "Untitled meeting"}</td>
                    <td className={tdClass}>{meeting.meeting_number}</td>
                    <td className={tdClass}>
                      <Badge tone={meeting.join_as_host ? "success" : "neutral"}>
                        {meeting.join_as_host ? "Host" : "Participant"}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <Badge
                        tone={
                          !check
                            ? "neutral"
                            : !check.can_read
                              ? "danger"
                              : check.owner_matches_authorized_user
                                ? "success"
                                : "warning"
                        }>
                        {!check
                          ? "Not checked"
                          : !check.can_read
                            ? "No access"
                            : check.owner_matches_authorized_user
                              ? "Owner match"
                              : "Readable"}
                      </Badge>
                    </td>
                    <td className={tdClass}>{formatShortDate(meeting.updated_at)}</td>
                    <td className={tdClass}>
                      <Badge tone={tracked ? "success" : "neutral"}>
                        {tracked ? (tracked.ended_at ? "Tracked" : "Active") : "Idle"}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <ActionsMenu>
                        <ActionButton as="a" compact icon="video" href={meetingJoinUrl(meeting)}>
                          Join
                        </ActionButton>
                        <ActionButton compact icon="pencil" onClick={() => setDraft(meeting)}>
                          Edit
                        </ActionButton>
                        <ActionButton
                          compact
                          icon="shield-check"
                          onClick={() => checkSavedMeeting(meeting.meeting_number)}>
                          Check
                        </ActionButton>
                        <ActionButton
                          compact
                          icon="trash-2"
                          variant="danger"
                          onClick={() => deleteSavedMeeting(meeting.id)}>
                          Delete
                        </ActionButton>
                      </ActionsMenu>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="calendar-days"
                    title="No saved meetings yet"
                    detail="Add your first recurring Zoom meeting above to make lesson setup faster."
                    compact
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card>
      <CardHeader title="Saved Zoom meetings" icon="calendar-days" />
      {content}
    </Card>
  );
}

function TrackedMeetingsTable({ meetings, updateMeeting, closeMeeting }) {
  const [showAll, setShowAll] = useState(false);
  const columns = [
    { key: "id", label: "Session" },
    { key: "zoom_meeting_id", label: "Zoom ID" },
    { key: "title", label: "Lesson title", sortValue: (meeting) => meeting.title || "" },
    { key: "group_name", label: "Group", sortValue: (meeting) => meeting.group_name || "" },
    {
      key: "started_at",
      label: "Started",
      sortValue: (meeting) => timeSortValue(meeting.started_at)
    },
    {
      key: "last_sync",
      label: "Last sync",
      sortValue: (meeting) =>
        timeSortValue(meeting.ended_at || meeting.updated_at || meeting.started_at)
    },
    {
      key: "status",
      label: "Status",
      sortValue: (meeting) => (meeting.ended_at ? "Closed" : "Active")
    },
    { key: "actions", label: "Actions", sortable: false }
  ];
  const { sortConfig, toggleSort } = useTableSort("started_at", "desc");
  const sortedMeetings = sortRows(meetings, sortConfig, columns);
  const visibleMeetings = showAll ? sortedMeetings : sortedMeetings.slice(0, 5);

  return (
    <Card>
      <CardHeader title="Recent lesson sessions">
        <ActionButton compact onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show recent" : "View all sessions"}
        </ActionButton>
      </CardHeader>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
          <tbody>
            {visibleMeetings.length ? (
              visibleMeetings.map((meeting) => (
                <TrackedMeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  updateMeeting={updateMeeting}
                  closeMeeting={closeMeeting}
                />
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon="calendar-days"
                    title="No lesson sessions yet"
                    detail="Join a Zoom lesson to start tracking live attendance."
                    compact
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TrackedMeetingRow({ meeting, updateMeeting, closeMeeting }) {
  const [title, setTitle] = useState(meeting.title || "");
  const [groupName, setGroupName] = useState(meeting.group_name || "");
  useEffect(() => {
    setTitle(meeting.title || "");
    setGroupName(meeting.group_name || "");
  }, [meeting.id, meeting.title, meeting.group_name]);

  return (
    <tr>
      <td className={tdClass}>#{meeting.id}</td>
      <td className={tdClass}>{meeting.zoom_meeting_id}</td>
      <td className={tdClass}>
        <input
          className={cx(inputClass, "min-w-48")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </td>
      <td className={tdClass}>
        <input
          className={cx(inputClass, "min-w-36")}
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        />
      </td>
      <td className={tdClass}>{formatShortDate(meeting.started_at)}</td>
      <td className={tdClass}>
        {meeting.ended_at ? formatShortDate(meeting.ended_at) : "Syncing"}
      </td>
      <td className={tdClass}>
        <Badge tone={meeting.ended_at ? "neutral" : "success"}>
          {meeting.ended_at ? "Closed" : "Active"}
        </Badge>
      </td>
      <td className={tdClass}>
        <ActionsMenu>
          <ActionButton
            compact
            icon="save"
            onClick={() => updateMeeting(meeting.id, title, groupName)}>
            Save changes
          </ActionButton>
          <ActionButton
            compact
            icon="x-circle"
            variant="danger"
            disabled={Boolean(meeting.ended_at)}
            onClick={() => closeMeeting(meeting.id)}>
            Close session
          </ActionButton>
          <ActionButton
            as="a"
            compact
            icon="download"
            href={`/attendance/export.csv?meeting_session_id=${meeting.id}`}>
            Export CSV
          </ActionButton>
        </ActionsMenu>
      </td>
    </tr>
  );
}

function LessonSideCard({ title, count, icon, children, emptyTitle, emptyDetail }) {
  return (
    <Card>
      <CardHeader title={title} />
      {count ? (
        <div className="p-5">{children}</div>
      ) : (
        <EmptyState icon={icon} title={emptyTitle} detail={emptyDetail} compact />
      )}
    </Card>
  );
}

function NameList({ records }) {
  return (
    <div className="grid gap-2">
      {records.slice(0, MAX_ATTENDANCE).map((record) => (
        <div
          key={`${record.meeting_session_id || record.meeting_id || "record"}-${record.participant_name}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#FFFDF7] px-3 py-2 text-sm">
          <span className="truncate font-black">{record.participant_name}</span>
          {record.total_seconds ? (
            <span className="text-muted">{formatDuration(record.total_seconds)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LiveAttendancePage({
  currentRecords,
  unmatchedRecords,
  historyRecords,
  students,
  meetings,
  savedMeetings = [],
  oauthStatus,
  sdkConfig,
  goToPage,
  createAlias,
  updateMeeting,
  closeMeeting
}) {
  const currentMeeting = activeMeeting(meetings);
  const lastSync = lastActivityTime(currentRecords, unmatchedRecords, historyRecords);
  const lessonState = currentLessonStatus({
    oauthStatus,
    sdkConfig,
    meetings,
    currentRecords,
    unmatchedRecords
  });
  const groups = uniqueGroups(students);
  const defaultGroup = currentMeeting?.group_name || groups[0] || "";
  const defaultTitle =
    currentMeeting?.title || (defaultGroup ? `${defaultGroup} lesson` : "New lesson");
  const account = zoomAccountLabel(oauthStatus);
  const [selectedMeetingId, setSelectedMeetingId] = useState("");
  const [lessonTitle, setLessonTitle] = useState(defaultTitle);
  const [groupName, setGroupName] = useState(defaultGroup);
  const [teacherName, setTeacherName] = useState(account || "");
  const [joinAsHost, setJoinAsHost] = useState(true);
  const [lessonNotice, setLessonNotice] = useState("");
  const selectedSavedMeeting = savedMeetings.find(
    (meeting) => String(meeting.id) === selectedMeetingId
  );
  const participantRecords = [...currentRecords, ...unmatchedRecords];
  const readyToStart = Boolean(oauthStatus?.authorized) && sdkConfig?.configured !== false;
  const joinHref = selectedSavedMeeting
    ? meetingJoinUrl({ ...selectedSavedMeeting, join_as_host: joinAsHost })
    : joinAsHost
      ? "/teacher-meeting?joinAsHost=1"
      : "/teacher-meeting";

  useEffect(() => {
    setLessonTitle(defaultTitle);
    setGroupName(defaultGroup);
  }, [currentMeeting?.id, defaultTitle, defaultGroup]);

  useEffect(() => {
    if (account) {
      setTeacherName(account);
    }
  }, [account]);

  async function saveLesson() {
    if (currentMeeting && updateMeeting) {
      await updateMeeting(currentMeeting.id, lessonTitle, groupName);
      setLessonNotice("Lesson details saved.");
      return;
    }
    window.localStorage?.setItem(
      "teacher-console-lesson-draft",
      JSON.stringify({ lessonTitle, groupName, teacherName, selectedMeetingId, joinAsHost })
    );
    setLessonNotice("Lesson draft saved on this device.");
  }

  async function deleteLesson() {
    if (currentMeeting && closeMeeting) {
      await closeMeeting(currentMeeting.id);
      setLessonNotice("Current lesson closed.");
      return;
    }
    setSelectedMeetingId("");
    setLessonTitle("New lesson");
    setGroupName("");
    setLessonNotice("Lesson draft cleared.");
  }

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-[minmax(280px,0.85fr)_minmax(420px,1.3fr)_minmax(300px,0.95fr)] items-start gap-5 max-[1280px]:grid-cols-1">
        <Card>
          <CardHeader title="Start lesson" icon="video" />
          <div className="grid gap-4 p-5">
            <label className={labelClass}>
              Saved meeting
              <SelectField
                value={selectedMeetingId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const nextMeeting = savedMeetings.find(
                    (meeting) => String(meeting.id) === nextValue
                  );
                  setSelectedMeetingId(nextValue);
                  if (nextMeeting) {
                    setJoinAsHost(Boolean(nextMeeting.join_as_host));
                    setLessonTitle(nextMeeting.title || lessonTitle);
                  }
                }}>
                <option value="">New meeting</option>
                {savedMeetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title || meeting.meeting_number}
                  </option>
                ))}
              </SelectField>
            </label>
            <label className={labelClass}>
              Lesson title
              <input
                className={inputClass}
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Group
              <input
                className={inputClass}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Teacher name
              <input
                className={inputClass}
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
              />
            </label>
            <label className="inline-flex items-start gap-2 text-sm font-bold text-muted">
              <input
                className="mt-1 accent-accent"
                type="checkbox"
                checked={joinAsHost}
                onChange={(event) => setJoinAsHost(event.target.checked)}
              />
              <span>
                <strong className="block text-ink">Join as host</strong>
                <span>You will join the Zoom meeting as host.</span>
              </span>
            </label>
            <ActionButton as="a" icon="video" variant="primary" href={joinHref}>
              Join Zoom
            </ActionButton>
            <ActionButton icon="save" onClick={saveLesson}>
              Save lesson
            </ActionButton>
            <ActionButton icon="trash-2" variant="danger" onClick={deleteLesson}>
              Delete
            </ActionButton>
            {lessonNotice ? <p className="text-sm font-bold text-muted">{lessonNotice}</p> : null}
          </div>
        </Card>

        <div className="grid gap-5">
          <div
            className={cx(
              "flex items-center gap-3 rounded-lg border p-6 shadow-soft",
              readyToStart
                ? "border-green-200 bg-green-50 text-success"
                : "border-yellow-300 bg-yellow-50 text-warning"
            )}>
            <SoftIcon
              icon={readyToStart ? "check-circle-2" : "info"}
              tone={readyToStart ? "success" : "warning"}
            />
            <span>
              <strong className="block text-xl font-black text-ink">
                {readyToStart ? "Ready to start" : "Connect Zoom to start"}
              </strong>
              <span className="mt-1 block text-sm font-bold text-muted">
                {readyToStart
                  ? "Zoom is connected. Join a meeting to begin attendance sync."
                  : "Zoom authorization and SDK credentials are required before attendance sync."}
              </span>
            </span>
          </div>
          <Card>
            <CardHeader title="Live sync status">
              <button className="text-ink" type="button" onClick={() => window.location.reload()}>
                <Icon name="refresh-cw" size={22} />
              </button>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4 p-5">
              <StatusTile
                label="Zoom connection"
                value={oauthStatus?.authorized ? "Connected" : "Not connected"}
                tone={oauthStatus?.authorized ? "success" : "warning"}
                icon="video"
              />
              <StatusTile
                label="Meeting status"
                value={currentMeeting ? "Joined" : "Not joined"}
                tone={currentMeeting ? "success" : "warning"}
                icon="users"
              />
              <StatusTile
                label="Participant reading"
                value={participantRecords.length ? "Reading" : "Waiting"}
                tone={participantRecords.length ? "success" : "purple"}
                icon="users"
              />
              <StatusTile
                label="Attendance sync"
                value={currentMeeting ? "Active" : "Idle"}
                tone={currentMeeting ? "success" : "neutral"}
                icon="refresh-cw"
              />
              <StatusTile
                label="Sync interval"
                value="Every 5 seconds"
                icon="pie-chart"
                tone="blue"
              />
              <StatusTile label="Last sync" value={formatShortDate(lastSync)} icon="clock" />
            </div>
            <details className="border-t border-line px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-ink">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="info" size={18} />
                  Advanced sync details
                </span>
                <Icon name="chevron-down" size={18} />
              </summary>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatusTile
                  label="SDK"
                  value={sdkConfig?.configured ? "Configured" : "Missing credentials"}
                  tone={sdkConfig?.configured ? "success" : "danger"}
                  icon="code-2"
                />
                <StatusTile
                  label="State"
                  value={lessonState.label}
                  tone={lessonState.tone}
                  icon="info"
                />
              </div>
            </details>
          </Card>
        </div>

        <div className="grid gap-5">
          <LessonSideCard
            title="Participants"
            count={participantRecords.length}
            icon="users"
            emptyTitle="No participants yet."
            emptyDetail="After you join a Zoom meeting, participants will appear here.">
            <NameList records={participantRecords} />
          </LessonSideCard>
          <LessonSideCard
            title="Matched students"
            count={currentRecords.length}
            icon="user-check"
            emptyTitle="No matched students yet."
            emptyDetail="We'll match participants to your roster once they're detected.">
            <NameList records={currentRecords} />
          </LessonSideCard>
          <LessonSideCard
            title="Names to review"
            count={unmatchedRecords.length}
            icon="user-search"
            emptyTitle="No names to review."
            emptyDetail="Unmatched participant names will appear here for you to review.">
            <UnmatchedTable
              records={unmatchedRecords}
              students={students}
              createAlias={createAlias}
            />
          </LessonSideCard>
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <HistoryTable title="Attendance timeline" records={historyRecords} />
      </div>
    </section>
  );
}

function ParticipantsTable({ records }) {
  const columns = [
    { key: "participant_name", label: "Name" },
    { key: "meeting_id", label: "Meeting" },
    { key: "meeting_session_id", label: "Session" },
    {
      key: "last_seen",
      label: "Last seen",
      sortValue: (record) => timeSortValue(record.last_seen)
    },
    { key: "total_seconds", label: "Duration" }
  ];
  const { sortConfig, toggleSort } = useTableSort("last_seen", "desc");
  const rows = sortRows(records.slice(0, MAX_ATTENDANCE), sortConfig, columns);
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
        <tbody>
          {rows.length ? (
            rows.map((record) => (
              <tr key={`${record.id}-${record.participant_name}`}>
                <td className={tdClass}>{record.participant_name}</td>
                <td className={tdClass}>{record.meeting_id}</td>
                <td className={tdClass}>
                  {record.meeting_session_id ? `#${record.meeting_session_id}` : ""}
                </td>
                <td className={tdClass}>{formatShortDate(record.last_seen)}</td>
                <td className={tdClass}>{formatDuration(record.total_seconds)}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>No active participants yet.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ title = "Attendance History", records }) {
  const columns = [
    { key: "participant_name", label: "Name" },
    { key: "meeting_id", label: "Meeting" },
    { key: "meeting_session_id", label: "Session" },
    { key: "status", label: "Status" },
    {
      key: "first_seen",
      label: "First seen",
      sortValue: (record) => timeSortValue(record.first_seen)
    },
    {
      key: "last_seen",
      label: "Last seen",
      sortValue: (record) => timeSortValue(record.last_seen)
    },
    { key: "total_seconds", label: "Total" }
  ];
  const { sortConfig, toggleSort } = useTableSort("last_seen", "desc");
  const rows = sortRows(historyLimit(records), sortConfig, columns);
  const isTimeline = title.toLocaleLowerCase().includes("timeline");
  return (
    <Card>
      <CardHeader title={title} />
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
          <tbody>
            {rows.length ? (
              rows.map((record) => (
                <tr key={`${record.id}-${record.first_seen}`}>
                  <td className={tdClass}>{record.participant_name}</td>
                  <td className={tdClass}>{record.meeting_id}</td>
                  <td className={tdClass}>
                    {record.meeting_session_id ? `#${record.meeting_session_id}` : ""}
                  </td>
                  <td
                    className={cx(
                      tdClass,
                      record.status === "active"
                        ? "font-black text-success"
                        : "font-black text-danger"
                    )}>
                    {record.status}
                  </td>
                  <td className={tdClass}>{formatShortDate(record.first_seen)}</td>
                  <td className={tdClass}>{formatShortDate(record.last_seen)}</td>
                  <td className={tdClass}>{formatDuration(record.total_seconds)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="clock"
                    title={
                      isTimeline ? "No attendance timeline yet." : "No attendance history yet."
                    }
                    detail={
                      isTimeline
                        ? "Live attendance records will appear here after participants are synced."
                        : "Attendance records will appear here after live lessons are synced."
                    }
                    compact
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatImportSummary(result) {
  const aliasText =
    result.aliases_created_count || result.aliases_updated_count
      ? `, aliases created ${result.aliases_created_count || 0}, aliases updated ${result.aliases_updated_count || 0}`
      : "";
  const sheetText = result.sheets_write_errors?.length
    ? ` Sheet write failed: ${result.sheets_write_errors.join("; ")}`
    : result.sheets_written_count
      ? ` Wrote back to ${result.sheets_written_count} Sheet${result.sheets_written_count === 1 ? "" : "s"}.`
      : "";
  return `Imported ${result.imported_count}, created ${result.created_count}, updated ${result.updated_count}, skipped ${result.skipped_count}${aliasText}.${sheetText}`;
}

function formatSyncSummary(result) {
  return formatImportSummary(result?.result || result || {});
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",").pop() : value);
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function ImportPreviewPanel({ preview, mapping, setMapping, fields, onConfirm, confirmLabel }) {
  const sampleHeaders = preview?.headers || [];
  const sampleRows = preview?.sample_rows || [];
  const sampleColumns = sampleHeaders.map((header) => ({
    key: header,
    label: header,
    sortValue: (row) => row[header] || ""
  }));
  const { sortConfig, toggleSort } = useTableSort(sampleHeaders[0] || "");
  const sortedSampleRows = sortRows(sampleRows, sortConfig, sampleColumns);
  if (!preview) {
    return null;
  }
  const confidence =
    typeof preview.confidence === "number"
      ? `${Math.round(preview.confidence * 100)}% confidence`
      : null;
  const metadata = [
    preview.table_type ? `Type: ${preview.table_type}` : null,
    preview.mapping_source ? `Mapping: ${preview.mapping_source}` : null,
    confidence
  ].filter(Boolean);
  return (
    <div className="grid gap-4 border-t border-line p-5">
      {metadata.length ? (
        <div className="text-sm font-bold text-muted">{metadata.join(" / ")}</div>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        {fields.map((field) => (
          <label className={labelClass} key={field.key}>
            {field.label}
            <SelectField
              icon="list-filter"
              value={mapping[field.key] || ""}
              onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value })}>
              <option value="">Not mapped</option>
              {preview.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </SelectField>
          </label>
        ))}
      </div>
      {preview.warnings?.length ? (
        <div className="grid gap-2">
          {preview.warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-bold text-warning">
              {warning}
            </div>
          ))}
        </div>
      ) : null}
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <SortableHeaderRow columns={sampleColumns} sortConfig={sortConfig} onSort={toggleSort} />
          <tbody>
            {sortedSampleRows.length ? (
              sortedSampleRows.map((row, index) => (
                <tr key={index}>
                  {sampleHeaders.map((header) => (
                    <td key={header} className={tdClass}>
                      {row[header] || ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={Math.max(1, sampleHeaders.length)}>No rows detected.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-muted">
          {preview.total_rows} rows detected. Confirm mapping before saving.
        </span>
        <ActionButton
          icon={confirmLabel === "Save connection" ? "link-2" : "check-circle-2"}
          variant="success"
          onClick={onConfirm}>
          {confirmLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function GoogleSheetImportPanel({
  title,
  importKind,
  fields,
  googleConfig,
  sources,
  importHistory,
  loadGoogleSheetTabs,
  previewGoogleSheetImport,
  saveGoogleSheetSource,
  syncGoogleSheetSource
}) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState("");
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState(
    "Share the sheet with the bot as Editor, then paste the URL."
  );
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const botEmail = googleConfig?.bot_email || googleConfig?.service_account_email || "";
  const sourceColumns = [
    { key: "selected_tab", label: "Tab" },
    { key: "table_type", label: "Type" },
    {
      key: "auto_sync_enabled",
      label: "Auto",
      sortValue: (source) => (source.auto_sync_enabled ? "On" : "Off")
    },
    {
      key: "last_synced_at",
      label: "Last sync",
      sortValue: (source) => timeSortValue(source.last_synced_at)
    },
    { key: "actions", label: "", sortable: false }
  ];
  const historyColumns = [
    {
      key: "finished_at",
      label: "When",
      sortValue: (run) => timeSortValue(run.finished_at || run.started_at)
    },
    { key: "source_type", label: "Source" },
    { key: "status", label: "Status" },
    { key: "row_count", label: "Rows" },
    { key: "imported_count", label: "Imported" },
    { key: "skipped_count", label: "Skipped" }
  ];
  const { sortConfig: sourceSortConfig, toggleSort: toggleSourceSort } = useTableSort(
    "last_synced_at",
    "desc"
  );
  const { sortConfig: historySortConfig, toggleSort: toggleHistorySort } = useTableSort(
    "finished_at",
    "desc"
  );
  const sortedSources = sortRows(sources || [], sourceSortConfig, sourceColumns);
  const historyRows = sortRows(
    (importHistory || []).filter((run) => run.import_kind === importKind),
    historySortConfig,
    historyColumns
  ).slice(0, 5);
  const setupSteps =
    importKind === "schedule"
      ? [
          "Open your Google Sheet.",
          "Click Share and add the bot email as Editor.",
          "Paste the sheet URL and load tabs."
        ]
      : [
          "Open your Google Sheet.",
          "Share it with the bot email as Editor.",
          "Paste the sheet URL below and load tabs."
        ];

  async function loadTabs(event) {
    event.preventDefault();
    setStatus("Reading sheet tabs...");
    setPreview(null);
    setMapping({});
    const result = await loadGoogleSheetTabs(sheetUrl);
    setTabs(result.tabs || []);
    setSelectedTab((result.tabs || [])[0] || "");
    setStatus(result.tabs?.length ? "Choose a tab and preview mapping." : "No tabs found.");
  }

  async function previewSheet() {
    if (!sheetUrl || !selectedTab) {
      setStatus("Paste a Sheet URL and choose a tab first.");
      return;
    }
    setStatus("Reading sample rows...");
    const result = await previewGoogleSheetImport(sheetUrl, selectedTab, importKind);
    setPreview(result.preview);
    setMapping(result.preview?.suggested_mapping || {});
    setStatus(`Preview ready: ${result.preview?.total_rows || 0} rows detected.`);
  }

  async function saveSource() {
    if (!preview || !selectedTab) {
      setStatus("Preview and confirm mapping before saving.");
      return;
    }
    setStatus("Saving Google Sheet connection...");
    await saveGoogleSheetSource(
      importKind,
      sheetUrl,
      selectedTab,
      mapping,
      preview,
      autoSyncEnabled
    );
    setStatus("Google Sheet connection saved.");
  }

  async function syncSource(sourceId) {
    setStatus("Syncing Google Sheet...");
    const result = await syncGoogleSheetSource(sourceId, replaceExisting);
    setStatus(formatSyncSummary(result));
  }

  async function copyBotEmail() {
    if (!botEmail) {
      return;
    }
    await navigator.clipboard?.writeText(botEmail);
    setStatus("Bot email copied.");
  }

  return (
    <Card>
      <CardHeader title={title} meta={status} icon="table-2">
        <Badge tone={googleConfig?.configured ? "success" : "warning"}>
          {googleConfig?.configured ? "Bot ready" : "Bot missing"}
        </Badge>
      </CardHeader>
      <div className="grid gap-4 p-5">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
          <label className={labelClass}>
            Bot email
            <span className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className={inputClass}
                value={botEmail || "Bot email is not configured"}
                readOnly
              />
              <ActionButton icon="copy" disabled={!botEmail} onClick={copyBotEmail}>
                Copy
              </ActionButton>
            </span>
          </label>
          <div>
            <span className="text-xs font-black uppercase text-muted">Setup steps</span>
            <div className="mt-3 grid gap-2">
              {setupSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-sm text-ink">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-[#FFFDF7] text-xs font-black">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form className="grid grid-cols-[1fr_auto] items-end gap-3" onSubmit={loadTabs}>
          <label className={labelClass}>
            Google Sheet URL
            <input
              className={inputClass}
              value={sheetUrl}
              onChange={(event) => {
                setSheetUrl(event.target.value);
                setTabs([]);
                setSelectedTab("");
                setPreview(null);
                setMapping({});
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <ActionButton
            icon="table-2"
            variant="primary"
            type="submit"
            disabled={!googleConfig?.configured}>
            Load tabs
          </ActionButton>
        </form>
        {tabs.length ? (
          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
            <label className={labelClass}>
              Sheet tab
              <SelectField
                value={selectedTab}
                onChange={(event) => {
                  setSelectedTab(event.target.value);
                  setPreview(null);
                  setMapping({});
                }}>
                {tabs.map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
              </SelectField>
            </label>
            <ActionButton icon="eye" onClick={previewSheet}>
              Preview
            </ActionButton>
            <label className="inline-flex items-center gap-1.5 pb-2 text-sm font-bold text-muted">
              <Icon name="toggle-right" size={16} />
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(event) => setAutoSyncEnabled(event.target.checked)}
              />{" "}
              Auto-sync
            </label>
          </div>
        ) : null}
      </div>
      <ImportPreviewPanel
        preview={preview}
        mapping={mapping}
        setMapping={setMapping}
        fields={fields}
        onConfirm={saveSource}
        confirmLabel="Save connection"
      />
      <div className="grid gap-3 border-t border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-ink">Saved Google Sheets</span>
          <label className="inline-flex items-center gap-1.5 text-sm font-bold text-muted">
            <Icon name="replace" size={16} />
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />{" "}
            Replace on sync
          </label>
        </div>
        {sources?.length ? (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <SortableHeaderRow
                columns={sourceColumns}
                sortConfig={sourceSortConfig}
                onSort={toggleSourceSort}
              />
              <tbody>
                {sortedSources.map((source) => (
                  <tr key={source.id}>
                    <td className={tdClass}>{source.selected_tab}</td>
                    <td className={tdClass}>{source.table_type}</td>
                    <td className={tdClass}>{source.auto_sync_enabled ? "On" : "Off"}</td>
                    <td className={tdClass}>
                      {source.last_synced_at ? formatShortDate(source.last_synced_at) : "Never"}
                    </td>
                    <td className={tdClass}>
                      <ActionsMenu>
                        <ActionButton
                          compact
                          icon="refresh-cw"
                          onClick={() => syncSource(source.id)}>
                          Sync now
                        </ActionButton>
                      </ActionsMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-[#FFFDF7] p-4">
            <strong className="block text-sm font-black">
              {importKind === "schedule"
                ? "No Google Sheets connected yet."
                : "No Google Sheets connected yet."}
            </strong>
            <span className="mt-1 block text-sm text-muted">
              {importKind === "schedule"
                ? "Connect a sheet to enable automatic schedule sync."
                : "Connect a sheet to enable automatic roster sync."}
            </span>
          </div>
        )}
        {historyRows.length ? (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <SortableHeaderRow
                columns={historyColumns}
                sortConfig={historySortConfig}
                onSort={toggleHistorySort}
              />
              <tbody>
                {historyRows.map((run) => (
                  <tr key={run.id}>
                    <td className={tdClass}>
                      {formatShortDate(run.finished_at || run.started_at)}
                    </td>
                    <td className={tdClass}>{run.source_type}</td>
                    <td className={tdClass}>{run.status}</td>
                    <td className={tdClass}>{run.row_count}</td>
                    <td className={tdClass}>{run.imported_count}</td>
                    <td className={tdClass}>{run.skipped_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function StudentsPage({
  students,
  currentRecords,
  createStudent,
  previewStudentsImport,
  commitStudentsImport,
  googleConfig,
  googleStudentSources,
  importHistory,
  loadGoogleSheetTabs,
  previewGoogleSheetImport,
  saveGoogleSheetSource,
  syncGoogleSheetSource,
  createAlias
}) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [newStudent, setNewStudent] = useState({ full_name: "", group_name: "" });
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState("Import a roster or add students manually.");
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  const groups = uniqueGroups(students);
  const filtered = students.filter((student) => {
    const aliases = (student.aliases || []).join(" ");
    const haystack = normalize(`${student.full_name} ${student.group_name} ${aliases}`);
    return (
      (!group || student.group_name === group) && (!search || haystack.includes(normalize(search)))
    );
  });
  const studentColumns = [
    { key: "full_name", label: "Student name" },
    { key: "group_name", label: "Group" },
    {
      key: "aliases",
      label: "Aliases",
      sortValue: (student) => (student.aliases || []).join(", ")
    },
    {
      key: "attendance",
      label: "Attendance status",
      sortValue: (student) =>
        currentRecords.some((record) =>
          studentKeys(student).includes(normalize(record.participant_name))
        )
          ? "Present"
          : "Not active"
    },
    { key: "actions", label: "Actions", sortable: false }
  ];
  const { sortConfig: studentSortConfig, toggleSort: toggleStudentSort } =
    useTableSort("full_name");
  const sortedStudents = sortRows(filtered, studentSortConfig, studentColumns);

  async function submitStudent(event) {
    event.preventDefault();
    await createStudent(newStudent.full_name, newStudent.group_name);
    setNewStudent({ full_name: "", group_name: "" });
    setShowAddForm(false);
  }

  async function submitImportPreview(event) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a CSV or XLSX file first.");
      return;
    }
    setStatus("Reading file...");
    const nextPreview = await previewStudentsImport(file);
    setPreview(nextPreview);
    setMapping(nextPreview.suggested_mapping || {});
    setStatus(`Preview ready: ${nextPreview.total_rows} rows detected.`);
  }

  async function confirmImport() {
    if (!file || !preview) {
      return;
    }
    setStatus("Importing...");
    const result = await commitStudentsImport(file, mapping, replaceExisting, preview);
    setStatus(formatImportSummary(result));
    setFile(null);
    setPreview(null);
    setMapping({});
  }

  function activateTab(nextTab, elementId) {
    setActiveTab(nextTab);
    document.getElementById(elementId)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  const showEmptyRoster = !students.length && !search && !group;

  return (
    <section className="grid gap-5">
      <Card>
        <div className="flex gap-8 border-b border-line px-5">
          {[
            ["list", "Student list", "student-list-card"],
            ["import", "Import", "student-import-card"],
            ["sheet", "Google Sheet", "students-sheet-card"]
          ].map(([key, label, target]) => (
            <button
              key={key}
              className={cx(
                "min-h-14 border-b-4 px-1 text-base font-black transition",
                activeTab === key
                  ? "border-accent text-ink"
                  : "border-transparent text-muted hover:text-ink"
              )}
              type="button"
              onClick={() => activateTab(key, target)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 p-5">
          <div className="flex gap-3">
            <FieldWithIcon icon="search">
              <input
                className={cx(inputClass, "w-[390px]")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students or aliases"
              />
            </FieldWithIcon>
            <SelectField
              icon="list-filter"
              className="w-52"
              value={group}
              onChange={(event) => setGroup(event.target.value)}>
              <option value="">All groups</option>
              {groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectField>
          </div>
          <ActionButton icon="plus" onClick={() => setShowAddForm(true)}>
            Add student
          </ActionButton>
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] items-start gap-5 max-[1280px]:grid-cols-1">
        <Card id="student-list-card">
          <CardHeader title="Student list" />
          {showAddForm ? (
            <form
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 border-b border-line p-5"
              onSubmit={submitStudent}>
              <label className={labelClass}>
                Student name
                <input
                  className={inputClass}
                  value={newStudent.full_name}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, full_name: event.target.value })
                  }
                  required
                />
              </label>
              <label className={labelClass}>
                Group
                <input
                  className={inputClass}
                  value={newStudent.group_name}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, group_name: event.target.value })
                  }
                  required
                />
              </label>
              <ActionButton icon="user-plus" variant="primary" type="submit">
                Add student
              </ActionButton>
            </form>
          ) : null}
          {showEmptyRoster ? (
            <React.Fragment>
              <EmptyState
                icon="id-card"
                title="No students yet."
                detail="Add students manually, import a CSV/Excel file, or connect a Google Sheet.">
                <ActionButton
                  icon="user-plus"
                  variant="primary"
                  onClick={() => setShowAddForm(true)}>
                  Add student
                </ActionButton>
                <ActionButton
                  icon="upload"
                  onClick={() => activateTab("import", "student-import-card")}>
                  Import file
                </ActionButton>
                <ActionButton
                  icon="table-2"
                  onClick={() => activateTab("sheet", "students-sheet-card")}>
                  Connect Google Sheet
                </ActionButton>
              </EmptyState>
              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <SortableHeaderRow
                    columns={studentColumns}
                    sortConfig={studentSortConfig}
                    onSort={toggleStudentSort}
                  />
                  <tbody>
                    <EmptyRow colSpan={5}>No students match this view.</EmptyRow>
                  </tbody>
                </table>
              </div>
            </React.Fragment>
          ) : (
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <SortableHeaderRow
                  columns={studentColumns}
                  sortConfig={studentSortConfig}
                  onSort={toggleStudentSort}
                />
                <tbody>
                  {sortedStudents.length ? (
                    sortedStudents.map((student) => {
                      const present = currentRecords.some((record) =>
                        studentKeys(student).includes(normalize(record.participant_name))
                      );
                      return (
                        <StudentRow
                          key={student.id}
                          student={student}
                          present={present}
                          createAlias={createAlias}
                        />
                      );
                    })
                  ) : (
                    <EmptyRow colSpan={5}>No students match this view.</EmptyRow>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid gap-5">
          <Card id="student-import-card">
            <CardHeader
              title="Import students"
              meta="Upload a CSV or Excel file to add or update students."
            />
            <form className="grid gap-4 p-5" onSubmit={submitImportPreview}>
              <DropZone
                file={file}
                title="Drag and drop a file here, or"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setMapping({});
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <DownloadTemplateButton kind="students">Download template</DownloadTemplateButton>
                <span className="text-sm text-muted">
                  Accepted columns: student_name, group, aliases
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-1.5 text-sm font-bold text-muted">
                  <input
                    className="accent-accent"
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(event) => setReplaceExisting(event.target.checked)}
                  />
                  Replace existing students
                </label>
                <ActionButton icon="eye" variant="primary" type="submit">
                  Preview import
                </ActionButton>
              </div>
              {status ? <p className="text-sm font-bold text-muted">{status}</p> : null}
            </form>
            <ImportPreviewPanel
              preview={preview}
              mapping={mapping}
              setMapping={setMapping}
              fields={[
                { key: "full_name", label: "Student name" },
                { key: "group_name", label: "Group" },
                { key: "aliases", label: "Aliases / Zoom names" }
              ]}
              onConfirm={confirmImport}
              confirmLabel="Confirm import"
            />
          </Card>

          <div id="students-sheet-card">
            <GoogleSheetImportPanel
              title="Google Sheet students"
              importKind="students"
              googleConfig={googleConfig}
              sources={googleStudentSources}
              importHistory={importHistory}
              loadGoogleSheetTabs={loadGoogleSheetTabs}
              previewGoogleSheetImport={previewGoogleSheetImport}
              saveGoogleSheetSource={saveGoogleSheetSource}
              syncGoogleSheetSource={syncGoogleSheetSource}
              fields={[
                { key: "full_name", label: "Student name" },
                { key: "group_name", label: "Group" },
                { key: "aliases", label: "Aliases / Zoom names" }
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StudentRow({ student, present, createAlias }) {
  const [alias, setAlias] = useState("");
  async function submitAlias(event) {
    event.preventDefault();
    if (!alias.trim()) {
      return;
    }
    await createAlias(student.id, alias.trim());
    setAlias("");
  }

  return (
    <tr>
      <td className={tdClass}>{student.full_name}</td>
      <td className={tdClass}>{student.group_name}</td>
      <td className={tdClass}>{(student.aliases || []).join(", ") || "None"}</td>
      <td className={cx(tdClass, present ? "font-black text-success" : "text-muted")}>
        {present ? "Present" : "Not active"}
      </td>
      <td className={tdClass}>
        <ActionsMenu>
          <form className="flex gap-2" onSubmit={submitAlias}>
            <input
              className={cx(inputClass, "min-w-48")}
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="Zoom display name"
            />
            <ActionButton compact icon="user-plus" type="submit">
              Add alias
            </ActionButton>
          </form>
        </ActionsMenu>
      </td>
    </tr>
  );
}

function ReportsPage({ summaries, historyRecords, students, generateSummary }) {
  const [filters, setFilters] = useState({ from: "", to: "", group: "", meetingId: "" });
  const [status, setStatus] = useState("");
  const groups = uniqueGroups(students);
  const filteredSummaries = summaries.filter((summary) => {
    const startsAt = new Date(summary.lesson_starts_at);
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
    const dateMatches =
      Number.isNaN(startsAt.getTime()) || ((!from || startsAt >= from) && (!to || startsAt <= to));
    const meetingMatches =
      !filters.meetingId ||
      normalize(
        `${summary.meeting_id || ""} ${summary.zoom_meeting_id || ""} ${summary.meeting_session_id || ""}`
      ).includes(normalize(filters.meetingId));
    return (
      (!filters.group || summary.group_name === filters.group) && dateMatches && meetingMatches
    );
  });
  const totalSessions = new Set(
    filteredSummaries.map(
      (summary) =>
        summary.meeting_session_id ||
        `${summary.lesson_title || ""}-${summary.lesson_starts_at || ""}`
    )
  ).size;
  const average = filteredSummaries.length
    ? Math.round(
        (filteredSummaries.filter((summary) => summary.status === "п").length /
          filteredSummaries.length) *
          100
      )
    : 0;
  const exportQuery = filters.meetingId
    ? `?meeting_id=${encodeURIComponent(filters.meetingId)}`
    : "";

  async function submitSummary() {
    setStatus("Generating...");
    const result = await generateSummary();
    const sheetStatus = result.sheets_write_errors?.length
      ? ` Sheet write failed: ${result.sheets_write_errors.join("; ")}`
      : result.sheets_written_count
        ? ` Wrote back to ${result.sheets_written_count} Sheet${result.sheets_written_count === 1 ? "" : "s"}.`
        : "";
    setStatus(
      `Generated ${result.generated_count}: ${result.present_count} present, ${result.absent_count} absent.${sheetStatus}`
    );
  }

  function applyDatePreset(preset) {
    const today = new Date();
    const toDateInput = (date) => date.toISOString().slice(0, 10);
    const start = new Date(today);
    if (preset === "today") {
      setFilters({ ...filters, from: toDateInput(today), to: toDateInput(today) });
      return;
    }
    if (preset === "week") {
      const day = today.getDay() || 7;
      start.setDate(today.getDate() - day + 1);
      setFilters({ ...filters, from: toDateInput(start), to: toDateInput(today) });
      return;
    }
    if (preset === "month") {
      start.setDate(1);
      setFilters({ ...filters, from: toDateInput(start), to: toDateInput(today) });
      return;
    }
    setFilters({ ...filters, from: "", to: "" });
  }

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-4 gap-4 max-[1280px]:grid-cols-2">
        <PageMetricCard icon="video" title="Total sessions" value={totalSessions} tone="success" />
        <PageMetricCard
          icon="users"
          title="Average attendance"
          value={`${average}%`}
          tone="purple"
        />
        <PageMetricCard
          icon="book-open"
          title="Absences"
          value={filteredSummaries.filter((summary) => summary.status !== "п").length}
          tone="warning"
        />
        <PageMetricCard
          icon="pie-chart"
          title="Attendance rows"
          value={Math.min(historyRecords.length, MAX_ATTENDANCE)}
          tone="blue"
        />
      </div>
      <Card>
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6 p-6 max-[1280px]:grid-cols-1">
          <div className="grid gap-4">
            <h2 className="m-0 text-xl font-black">Filters</h2>
            <div className="grid grid-cols-[180px_180px_180px_170px] gap-4">
              <label className={labelClass}>
                Start date
                <FieldWithIcon icon="calendar">
                  <input
                    className={inputClass}
                    type="date"
                    value={filters.from}
                    onChange={(event) => setFilters({ ...filters, from: event.target.value })}
                  />
                </FieldWithIcon>
              </label>
              <label className={labelClass}>
                End date
                <FieldWithIcon icon="calendar">
                  <input
                    className={inputClass}
                    type="date"
                    value={filters.to}
                    onChange={(event) => setFilters({ ...filters, to: event.target.value })}
                  />
                </FieldWithIcon>
              </label>
              <label className={labelClass}>
                Group
                <SelectField
                  icon="list-filter"
                  value={filters.group}
                  onChange={(event) => setFilters({ ...filters, group: event.target.value })}>
                  <option value="">All groups</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </SelectField>
              </label>
              <label className={labelClass}>
                Meeting ID
                <FieldWithIcon icon="hash">
                  <input
                    className={inputClass}
                    value={filters.meetingId}
                    onChange={(event) => setFilters({ ...filters, meetingId: event.target.value })}
                    placeholder="Enter meeting ID"
                  />
                </FieldWithIcon>
              </label>
            </div>
            <div className="grid grid-flow-col auto-cols-max gap-5">
              {[
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
                ["custom", "Custom"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={cx(
                    "min-h-10 rounded-lg border px-6 text-sm font-black",
                    key === "custom"
                      ? "border-[#D9C300] bg-yellow-100 text-ink"
                      : "border-line bg-panel text-ink"
                  )}
                  type="button"
                  onClick={() => applyDatePreset(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-l border-line pl-6 max-[1280px]:border-l-0 max-[1280px]:border-t max-[1280px]:pl-0 max-[1280px]:pt-5">
            <ActionButton as="a" icon="download" href={`/attendance/export.csv${exportQuery}`}>
              Export attendance CSV
            </ActionButton>
            <ActionButton as="a" icon="file-spreadsheet" href="/reports/attendance-matrix.csv">
              Export matrix CSV
            </ActionButton>
            <ActionButton
              id="generate-attendance-journal"
              icon="clipboard-list"
              variant="primary"
              onClick={submitSummary}>
              Generate attendance journal
            </ActionButton>
          </div>
        </div>
      </Card>
      {status ? <p className="text-sm font-bold text-muted">{status}</p> : null}
      <SummaryTable summaries={filteredSummaries} />
      <HistoryTable records={historyRecords} />
    </section>
  );
}

function SummaryTable({ summaries }) {
  const columns = [
    { key: "student_name", label: "Student" },
    { key: "group_name", label: "Group" },
    { key: "lesson_title", label: "Lesson", sortValue: (summary) => summary.lesson_title || "" },
    {
      key: "lesson_starts_at",
      label: "Start",
      sortValue: (summary) => timeSortValue(summary.lesson_starts_at)
    },
    { key: "status", label: "Status" },
    { key: "total_seconds", label: "Total" }
  ];
  const { sortConfig, toggleSort } = useTableSort("student_name");
  const sortedSummaries = sortRows(summaries, sortConfig, columns);
  return (
    <Card>
      <CardHeader title="Attendance journal" />
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
          <tbody>
            {sortedSummaries.length ? (
              sortedSummaries.map((summary) => (
                <tr key={summary.id}>
                  <td className={tdClass}>{summary.student_name}</td>
                  <td className={tdClass}>{summary.group_name}</td>
                  <td className={tdClass}>{summary.lesson_title || ""}</td>
                  <td className={tdClass}>{formatShortDate(summary.lesson_starts_at)}</td>
                  <td
                    className={cx(
                      tdClass,
                      summary.status === "п" ? "font-black text-success" : "font-black text-danger"
                    )}>
                    {summary.status}
                  </td>
                  <td className={tdClass}>{formatDuration(summary.total_seconds)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon="bar-chart-3"
                    title="No journal generated yet."
                    detail="Choose filters and click Generate attendance journal."
                    compact
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettingsPage({
  oauthStatus,
  sdkConfig,
  students,
  schedule,
  previewScheduleImport,
  commitScheduleImport,
  disconnectZoom
}) {
  const [file, setFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState("Import schedule CSV for attendance journals.");
  const groups = uniqueGroups(students);

  async function submitSchedulePreview(event) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a CSV or XLSX file first.");
      return;
    }
    setStatus("Reading file...");
    const nextPreview = await previewScheduleImport(file);
    setPreview(nextPreview);
    setMapping(nextPreview.suggested_mapping || {});
    setStatus(`Preview ready: ${nextPreview.total_rows} rows detected.`);
  }

  async function confirmScheduleImport() {
    if (!file || !preview) {
      return;
    }
    setStatus("Importing...");
    const result = await commitScheduleImport(file, mapping, replaceExisting, preview);
    setStatus(formatImportSummary(result));
    setFile(null);
    setPreview(null);
    setMapping({});
  }

  return (
    <section className="grid gap-5">
      <Card>
        <CardHeader title="Zoom integration" />
        <div className="grid grid-cols-4 gap-4 p-5 max-[1280px]:grid-cols-2">
          <StatusTile
            label="Zoom authorization"
            value={oauthStatus?.authorized ? "Connected" : "Not connected"}
            tone={oauthStatus?.authorized ? "success" : "warning"}
            icon="video"
          />
          <StatusTile
            label="Zoom account"
            value={oauthStatus?.display_name || oauthStatus?.email || "Unknown"}
            icon="users"
            tone="purple"
          />
          <StatusTile
            label="Zoom SDK"
            value={sdkConfig?.configured ? "Configured" : "Missing credentials"}
            tone={sdkConfig?.configured ? "warning" : "danger"}
            icon="code-2"
          />
          <StatusTile
            label="Host token"
            value={oauthStatus?.authorized ? "Available" : "Requires OAuth"}
            tone="blue"
            icon="shield-check"
          />
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <ActionButton
            icon={oauthStatus?.authorized ? "user-cog" : "log-in"}
            variant="primary"
            onClick={() => {
              window.location.href = "/zoom/oauth/start?prompt=login";
            }}>
            {oauthStatus?.authorized ? "Authorize different account" : "Authorize Zoom"}
          </ActionButton>
          {oauthStatus?.authorized ? (
            <ActionButton icon="unplug" variant="danger" onClick={disconnectZoom}>
              Disconnect Zoom
            </ActionButton>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Groups" />
        <div className="p-5">
          {groups.length ? (
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Badge key={group}>{group}</Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-line bg-[#FFFDF7] p-4">
              <SoftIcon icon="users" size="sm" />
              <span>
                <strong className="block text-sm font-black">No groups yet.</strong>
                <span className="text-sm text-muted">
                  Import students or schedule data to create groups.
                </span>
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Schedule import"
          meta="Import schedule CSV or Excel for attendance journals."
        />
        <form className="grid gap-4 p-5" onSubmit={submitSchedulePreview}>
          <div className="grid grid-cols-[minmax(320px,0.55fr)_1fr] items-center gap-5 max-[1280px]:grid-cols-1">
            <DropZone
              file={file}
              title="Drag and drop your CSV or Excel file here"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              icon="upload"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
                setMapping({});
              }}
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <DownloadTemplateButton kind="schedule">
                Download schedule template
              </DownloadTemplateButton>
              <label className="inline-flex items-center gap-1.5 text-sm font-bold text-muted">
                <input
                  className="accent-accent"
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                />
                Replace existing schedule
              </label>
              <ActionButton icon="eye" variant="primary" type="submit">
                Preview schedule import
              </ActionButton>
            </div>
          </div>
          {status ? <p className="text-sm font-bold text-muted">{status}</p> : null}
        </form>
        <ImportPreviewPanel
          preview={preview}
          mapping={mapping}
          setMapping={setMapping}
          fields={[
            { key: "date", label: "Lesson date" },
            { key: "start_time", label: "Start time" },
            { key: "end_time", label: "End time" },
            { key: "group_name", label: "Group" },
            { key: "title", label: "Title" }
          ]}
          onConfirm={confirmScheduleImport}
          confirmLabel="Confirm schedule import"
        />
        <ScheduleTable entries={schedule} />
      </Card>
    </section>
  );
}

function ScheduleTable({ entries }) {
  const columns = [
    { key: "title", label: "Title", sortValue: (entry) => entry.title || "" },
    { key: "group_name", label: "Group" },
    { key: "starts_at", label: "Starts", sortValue: (entry) => timeSortValue(entry.starts_at) },
    { key: "ends_at", label: "Ends", sortValue: (entry) => timeSortValue(entry.ends_at) }
  ];
  const { sortConfig, toggleSort } = useTableSort("starts_at", "asc");
  const sortedEntries = sortRows(entries, sortConfig, columns);
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <SortableHeaderRow columns={columns} sortConfig={sortConfig} onSort={toggleSort} />
        <tbody>
          {sortedEntries.length ? (
            sortedEntries.map((entry) => (
              <tr key={entry.id}>
                <td className={tdClass}>{entry.title || ""}</td>
                <td className={tdClass}>{entry.group_name}</td>
                <td className={tdClass}>{formatShortDate(entry.starts_at)}</td>
                <td className={tdClass}>{formatShortDate(entry.ends_at)}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={4}>No schedule imported yet.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const initialPage = window.location.hash.replace("#", "") || "menu";
  const [page, setPage] = useState(
    pages.some((item) => item.id === initialPage) ? initialPage : "menu"
  );
  const [language, setLanguage] = useState(getInitialLanguage);
  const [languageChanging, setLanguageChanging] = useState(false);
  const languageTimerRef = useRef(null);
  const [trendFilter, setTrendFilter] = useState("present");
  const [data, setData] = useState({
    summaries: [],
    schedule: [],
    students: [],
    meetings: [],
    savedMeetings: [],
    currentRecords: [],
    unmatchedRecords: [],
    historyRecords: [],
    oauthStatus: null,
    sdkConfig: null,
    googleConfig: null,
    googleStudentSources: [],
    googleScheduleSources: [],
    importHistory: [],
    ownershipChecks: {}
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "") || "menu";
      setPage(pages.some((item) => item.id === hash) ? hash : "menu");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(languageTimerRef.current);
    };
  }, []);

  const changeLanguage = useCallback(
    (nextLanguage) => {
      if (
        nextLanguage === language ||
        !languageOptions.some((option) => option.id === nextLanguage)
      ) {
        return;
      }
      window.clearTimeout(languageTimerRef.current);
      setLanguageChanging(true);
      languageTimerRef.current = window.setTimeout(() => {
        setLanguage(nextLanguage);
        try {
          window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch (error) {
          console.warn("Unable to persist language", error);
        }
        languageTimerRef.current = window.setTimeout(() => setLanguageChanging(false), 160);
      }, 110);
    },
    [language]
  );

  const goToPage = useCallback((nextPage) => {
    const validPage = pages.some((item) => item.id === nextPage) ? nextPage : "menu";
    setPage(validPage);
    window.location.hash = validPage;
  }, []);

  const buildAttendanceQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", String(MAX_ATTENDANCE));
    return `?${params.toString()}`;
  }, []);

  const refreshData = useCallback(async () => {
    const query = buildAttendanceQuery();
    const [
      summaries,
      schedule,
      students,
      meetings,
      savedMeetings,
      currentRecords,
      unmatchedRecords,
      historyRecords,
      oauthStatus,
      sdkConfig,
      googleConfig,
      googleStudentSources,
      googleScheduleSources,
      importHistory
    ] = await Promise.all([
      safeFetch("/reports/attendance-summary", []),
      safeFetch("/schedule", []),
      safeFetch("/students", []),
      safeFetch("/meetings", []),
      safeFetch("/zoom/saved-meetings", []),
      safeFetch(`/attendance/current${query}`, []),
      safeFetch(`/attendance/unmatched${query}`, []),
      safeFetch(`/attendance/history${query}`, []),
      safeFetch("/zoom/oauth/status", null),
      safeFetch("/zoom/meeting-sdk/config", null),
      safeFetch("/google-sheets/config", null),
      safeFetch("/google-sheets/sources?import_kind=students", []),
      safeFetch("/google-sheets/sources?import_kind=schedule", []),
      safeFetch("/imports/history", [])
    ]);

    setData((previous) => ({
      ...previous,
      summaries,
      schedule,
      students,
      meetings,
      savedMeetings,
      currentRecords: currentRecords.slice(0, MAX_ATTENDANCE),
      unmatchedRecords: unmatchedRecords.slice(0, MAX_ATTENDANCE),
      historyRecords: historyRecords.slice(0, MAX_ATTENDANCE),
      oauthStatus,
      sdkConfig,
      googleConfig,
      googleStudentSources,
      googleScheduleSources,
      importHistory
    }));
  }, [buildAttendanceQuery]);

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  async function createAlias(studentId, aliasName) {
    await fetchJson("/students/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, alias_name: aliasName })
    });
    await fetch("/reports/attendance-summary/generate", { method: "POST" });
    await refreshData();
  }

  async function createStudent(fullName, groupName) {
    await fetchJson("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, group_name: groupName })
    });
    await refreshData();
  }

  async function importPreviewPayload(file, mapping = {}, replaceExisting = false, preview = null) {
    const payload = {
      file_name: file.name,
      file_content_base64: await fileToBase64(file),
      mapping,
      replace_existing: replaceExisting
    };
    if (preview) {
      payload.table_type = preview.table_type || null;
      payload.confidence = typeof preview.confidence === "number" ? preview.confidence : null;
      payload.warnings = preview.warnings || [];
    }
    return payload;
  }

  async function previewStudentsImport(file) {
    return fetchJson("/students/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file))
    });
  }

  async function commitStudentsImport(file, mapping, replaceExisting, preview = null) {
    const result = await fetchJson("/students/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file, mapping, replaceExisting, preview))
    });
    await refreshData();
    return result;
  }

  async function previewScheduleImport(file) {
    return fetchJson("/schedule/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file))
    });
  }

  async function commitScheduleImport(file, mapping, replaceExisting, preview = null) {
    const result = await fetchJson("/schedule/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file, mapping, replaceExisting, preview))
    });
    await refreshData();
    return result;
  }

  async function loadGoogleSheetTabs(sheetUrl) {
    return fetchJson("/google-sheets/tabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet_url: sheetUrl })
    });
  }

  async function previewGoogleSheetImport(sheetUrl, selectedTab, importKind) {
    return fetchJson("/google-sheets/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet_url: sheetUrl,
        selected_tab: selectedTab,
        import_kind: importKind
      })
    });
  }

  async function saveGoogleSheetSource(
    importKind,
    sheetUrl,
    selectedTab,
    mapping,
    preview,
    autoSyncEnabled = false
  ) {
    const result = await fetchJson("/google-sheets/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet_url: sheetUrl,
        selected_tab: selectedTab,
        import_kind: importKind,
        mapping,
        headers: preview?.headers || [],
        table_type: preview?.table_type || importKind,
        confidence: typeof preview?.confidence === "number" ? preview.confidence : null,
        warnings: preview?.warnings || [],
        auto_sync_enabled: autoSyncEnabled
      })
    });
    await refreshData();
    return result;
  }

  async function syncGoogleSheetSource(sourceId, replaceExisting = false) {
    const result = await fetchJson(`/google-sheets/sources/${sourceId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replace_existing: replaceExisting })
    });
    await refreshData();
    return result;
  }

  async function generateSummary() {
    const result = await fetchJson("/reports/attendance-summary/generate", { method: "POST" });
    await refreshData();
    return result;
  }

  async function saveSavedMeeting(draft) {
    const meetingNumber = String(draft.meeting_number || "").replace(/\D+/g, "");
    if (!meetingNumber) {
      return;
    }
    await fetchJson("/zoom/saved-meetings", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_number: meetingNumber,
        title: draft.title || null,
        passcode: draft.passcode || null,
        join_as_host: Boolean(draft.join_as_host)
      })
    });
    await refreshData();
  }

  async function deleteSavedMeeting(meetingId) {
    await fetchJson(`/zoom/saved-meetings/${meetingId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    await refreshData();
  }

  async function checkSavedMeeting(meetingNumber) {
    const check = await fetchJson(`/zoom/meetings/${encodeURIComponent(meetingNumber)}/check`);
    setData((previous) => ({
      ...previous,
      ownershipChecks: {
        ...previous.ownershipChecks,
        [meetingNumber]: check
      }
    }));
  }

  async function updateMeeting(meetingId, title, groupName) {
    await fetchJson(`/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, group_name: groupName })
    });
    await refreshData();
  }

  async function closeMeeting(meetingId) {
    await fetchJson(`/meetings/${meetingId}/close`, { method: "POST" });
    await refreshData();
  }

  async function disconnectZoom() {
    await fetchJson("/zoom/oauth/disconnect", { method: "POST" });
    await refreshData();
  }

  const commonPageProps = {
    ...data,
    trendFilter,
    setTrendFilter,
    refreshData,
    goToPage,
    createAlias
  };

  return (
    <TranslationLayer language={language}>
      <Shell
        page={page}
        goToPage={goToPage}
        oauthStatus={data.oauthStatus}
        language={language}
        onLanguageChange={changeLanguage}
        languageChanging={languageChanging}>
        <Header
          page={page}
          refreshData={refreshData}
          oauthStatus={data.oauthStatus}
          sdkConfig={data.sdkConfig}
          meetings={data.meetings}
          currentRecords={data.currentRecords}
          unmatchedRecords={data.unmatchedRecords}
          goToPage={goToPage}
        />
        {page === "menu" ? <MenuPage {...commonPageProps} /> : null}
        {page === "meetings" ? (
          <MeetingsPage
            {...commonPageProps}
            saveSavedMeeting={saveSavedMeeting}
            deleteSavedMeeting={deleteSavedMeeting}
            checkSavedMeeting={checkSavedMeeting}
            updateMeeting={updateMeeting}
            closeMeeting={closeMeeting}
          />
        ) : null}
        {page === "live-attendance" ? (
          <LiveAttendancePage
            {...commonPageProps}
            updateMeeting={updateMeeting}
            closeMeeting={closeMeeting}
          />
        ) : null}
        {page === "students" ? (
          <StudentsPage
            students={data.students}
            currentRecords={data.currentRecords}
            createStudent={createStudent}
            previewStudentsImport={previewStudentsImport}
            commitStudentsImport={commitStudentsImport}
            googleConfig={data.googleConfig}
            googleStudentSources={data.googleStudentSources}
            importHistory={data.importHistory}
            loadGoogleSheetTabs={loadGoogleSheetTabs}
            previewGoogleSheetImport={previewGoogleSheetImport}
            saveGoogleSheetSource={saveGoogleSheetSource}
            syncGoogleSheetSource={syncGoogleSheetSource}
            createAlias={createAlias}
          />
        ) : null}
        {page === "reports" ? (
          <ReportsPage
            summaries={data.summaries}
            historyRecords={data.historyRecords}
            students={data.students}
            generateSummary={generateSummary}
          />
        ) : null}
        {page === "settings" ? (
          <SettingsPage
            oauthStatus={data.oauthStatus}
            sdkConfig={data.sdkConfig}
            students={data.students}
            schedule={data.schedule}
            previewScheduleImport={previewScheduleImport}
            commitScheduleImport={commitScheduleImport}
            disconnectZoom={disconnectZoom}
          />
        ) : null}
      </Shell>
    </TranslationLayer>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
