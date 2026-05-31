const DEFAULT_SETTINGS = {
  badgeEnabled: true,

  defaultExpiryAlert: 1,
  meatAlert: 1,
  fishAlert: 1,
  dairyAlert: 1,
  seasoningAlert: 14,

  vegetableAlert: 14,
  cookedAlert: 3,
  frozenAlert: 30
};

function loadSettings() {
  const savedSettings = JSON.parse(localStorage.getItem("settings")) || {};

  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings
  };
}

function saveSettings(settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}

function getFoods() {
  return JSON.parse(localStorage.getItem("foods")) || [];
}

function getTodayForNotification() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntilForNotification(dateText) {
  const targetDate = new Date(dateText);
  targetDate.setHours(0, 0, 0, 0);

  const diff = targetDate - getTodayForNotification();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysSinceForNotification(dateText) {
  const startDate = new Date(dateText);
  startDate.setHours(0, 0, 0, 0);

  const diff = getTodayForNotification() - startDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getExpiryAlertDays(food, settings) {
  const alertDaysByGenre = {
    "肉": settings.meatAlert,
    "魚": settings.fishAlert,
    "卵・乳製品": settings.dairyAlert,
    "調味料": settings.seasoningAlert
  };

  return alertDaysByGenre[food.genre] ?? settings.defaultExpiryAlert;
}

function shouldNotifyByExpiryDate(food, settings) {
  if (!food.expiryDate) {
    return false;
  }

  return getDaysUntilForNotification(food.expiryDate) <= getExpiryAlertDays(food, settings);
}

function shouldNotifyByRegisteredDate(food, settings) {
  if (food.expiryDate || !food.registeredAt) {
    return false;
  }

  const daysSinceRegistered = getDaysSinceForNotification(food.registeredAt.slice(0, 10));

  if (food.storage === "冷凍庫") {
    return daysSinceRegistered >= settings.frozenAlert;
  }

  if (food.genre === "野菜・くだもの") {
    return daysSinceRegistered >= settings.vegetableAlert;
  }

  if (food.genre === "調理済み") {
    return daysSinceRegistered >= settings.cookedAlert;
  }

  return false;
}

function getNotificationFoods() {
  const settings = loadSettings();

  if (!settings.badgeEnabled) {
    return [];
  }

  return getFoods().filter((food) => {
    return shouldNotifyByExpiryDate(food, settings) || shouldNotifyByRegisteredDate(food, settings);
  });
}

function getLastNotificationCheckedAt() {
  const checkedAt = localStorage.getItem("lastNotificationCheckedAt");

  if (!checkedAt) {
    return null;
  }

  return new Date(checkedAt);
}

function getNotificationStartDate(food) {
  const settings = loadSettings();

  if (food.expiryDate) {
    const alertDays = getExpiryAlertDays(food, settings);
    const startDate = new Date(food.expiryDate);
    startDate.setDate(startDate.getDate() - alertDays);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  if (!food.registeredAt) {
    return null;
  }

  const startDate = new Date(food.registeredAt.slice(0, 10));

  if (food.storage === "冷凍庫") {
    startDate.setDate(startDate.getDate() + settings.frozenAlert);
  } else if (food.genre === "野菜・くだもの") {
    startDate.setDate(startDate.getDate() + settings.vegetableAlert);
  } else if (food.genre === "調理済み") {
    startDate.setDate(startDate.getDate() + settings.cookedAlert);
  } else {
    return null;
  }

  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

function getNotificationUnreadDate(food) {
  const notificationStartDate = getNotificationStartDate(food);

  if (!food.registeredAt) {
    return notificationStartDate;
  }

  const registeredAt = new Date(food.registeredAt);

  if (!notificationStartDate) {
    return registeredAt;
  }

  return registeredAt > notificationStartDate ? registeredAt : notificationStartDate;
}

function getUnreadNotificationFoods() {
  const lastCheckedAt = getLastNotificationCheckedAt();

  if (!lastCheckedAt) {
    return getNotificationFoods();
  }

  return getNotificationFoods().filter((food) => {
    const notificationUnreadDate = getNotificationUnreadDate(food);

    if (!notificationUnreadDate) {
      return true;
    }

    return notificationUnreadDate > lastCheckedAt;
  });
}

function isUnreadNotification(food) {
  const lastCheckedAt = getLastNotificationCheckedAt();

  if (!lastCheckedAt) {
    return true;
  }

  const notificationUnreadDate = getNotificationUnreadDate(food);

  if (!notificationUnreadDate) {
    return true;
  }

  return notificationUnreadDate > lastCheckedAt;
}

function updateGlobalNotificationBadge() {
  const notificationButton = document.querySelector('[aria-label="お知らせ"]');

  if (!notificationButton) {
    return;
  }

  notificationButton.classList.add("notification-button");

  const oldBadge = notificationButton.querySelector(".notification-badge");

  if (oldBadge) {
    oldBadge.remove();
  }

  if (getUnreadNotificationFoods().length === 0) {
    return;
  }

  const badge = document.createElement("span");
  badge.className = "notification-badge";
  notificationButton.appendChild(badge);
}

function getNotificationMessage(food) {
  if (food.expiryDate) {
    const days = getDaysUntilForNotification(food.expiryDate);

    if (days < 0) {
      return "期限切れ";
    }

    if (days === 0) {
      return "本日期限";
    }

    return `期限まで${days}日`;
  }

  return "登録日アラート";
}

function getExpiredNotificationFoods(foods) {
  return foods.filter((food) => {
    return food.expiryDate && getDaysUntilForNotification(food.expiryDate) < 0;
  });
}

function getUpcomingNotificationFoods(foods) {
  return foods.filter((food) => {
    if (food.expiryDate) {
      return getDaysUntilForNotification(food.expiryDate) >= 0;
    }

    return true;
  });
}

function markNotificationsAsRead() {
  localStorage.setItem(
    "lastNotificationCheckedAt",
    new Date().toISOString()
  );

  const badge = document.querySelector(".notification-badge");

  if (badge) {
    badge.remove();
  }

  const readButton = document.getElementById("notificationReadButton");

  if (readButton) {
    readButton.classList.add("is-read");
    readButton.textContent = "確認済み";
    readButton.disabled = true;
  }

  document.querySelectorAll(".notification-unread-dot").forEach((dot) => {
    dot.remove();
  });
}

function renderNotificationItem(food) {
  return `
    <div class="notification-item">
      <div class="notification-item-name-row">
        <div class="notification-item-name">${food.name}</div>
        ${isUnreadNotification(food) ? `<span class="notification-unread-dot" aria-label="未確認"></span>` : ""}
      </div>
      <div class="notification-item-detail">${getNotificationMessage(food)}</div>
    </div>
  `;
}

function showNotificationPanel() {
  const existingPanel = document.getElementById("notificationPanel");

  if (existingPanel) {
    existingPanel.remove();
    return;
  }

  const notifications = getNotificationFoods();
  const expiredNotifications = getExpiredNotificationFoods(notifications);
  const upcomingNotifications = getUpcomingNotificationFoods(notifications);

  const panel = document.createElement("div");
  panel.id = "notificationPanel";
  panel.className = "notification-panel";

  if (notifications.length === 0) {
    panel.innerHTML = `
      <div class="notification-panel-header">通知</div>
      <div class="notification-empty">通知はありません</div>
    `;
  } else {
    const hasUnreadNotifications = getUnreadNotificationFoods().length > 0;

    panel.innerHTML = `
      <div class="notification-panel-header-row">
        <div class="notification-panel-header">通知</div>
        <button class="notification-read-button${hasUnreadNotifications ? "" : " is-read"}" id="notificationReadButton" ${hasUnreadNotifications ? "" : "disabled"}>
          確認済み
        </button>
      </div>
      <div class="notification-list">
        ${expiredNotifications.length > 0 ? `
          <section class="notification-section">
            <h3 class="notification-section-title">期限切れ</h3>
            ${expiredNotifications.map(renderNotificationItem).join("")}
          </section>
        ` : ""}

        ${upcomingNotifications.length > 0 ? `
          <section class="notification-section">
            <h3 class="notification-section-title">期限が近いもの</h3>
            ${upcomingNotifications.map(renderNotificationItem).join("")}
          </section>
        ` : ""}
      </div>
    `;
  }

  document.body.appendChild(panel);

  const readButton = document.getElementById("notificationReadButton");

  if (readButton) {
    readButton.addEventListener("click", markNotificationsAsRead);
  }
}

window.appSettings = {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS
};

window.notificationBadge = {
  getNotificationFoods,
  getUnreadNotificationFoods,
  updateGlobalNotificationBadge,
  isUnreadNotification
};

window.addEventListener("DOMContentLoaded", () => {
  updateGlobalNotificationBadge();

  const notificationButton = document.querySelector('[aria-label="お知らせ"]');

  if (notificationButton) {
    notificationButton.addEventListener("click", showNotificationPanel);
  }
});