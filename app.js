const foodList = document.getElementById("foodList");

let foods = JSON.parse(localStorage.getItem("foods")) || [];
let currentSort = "registered";
let currentFilters = {
  genres: [],
  storage: "",
  expiryFrom: "",
  expiryTo: ""
};

function saveFoods() {
  localStorage.setItem("foods", JSON.stringify(foods));
}

function normalizeFood(food) {
  if (typeof food === "string") {
    return {
      id: crypto.randomUUID(),
      name: food,
      genre: "その他",
      storage: "冷蔵庫",
      quantity: 1,
      unit: "個",
      expiryDate: "",
      memo: "",
      registeredAt: new Date().toISOString()
    };
  }

  return {
    id: food.id || crypto.randomUUID(),
    name: food.name || "名称未設定",
    genre: food.genre || "その他",
    storage: food.storage || "冷蔵庫",
    quantity: Number(food.quantity ?? 1),
    unit: food.unit || "個",
    expiryDate: food.expiryDate || "",
    memo: food.memo || "",
    registeredAt: food.registeredAt || new Date().toISOString()
  };
}

foods = foods.map(normalizeFood);
saveFoods();

function formatDate(dateText) {
  if (!dateText) {
    return "期限なし";
  }

  return dateText.replaceAll("-", "/");
}

function getDateLabel(food) {
  if (food.expiryDate) {
    return `期限: ${formatDate(food.expiryDate)}`;
  }

  return `登録: ${formatDate(food.registeredAt.slice(0, 10))}`;
}

function isExpired(food) {
  if (!food.expiryDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(food.expiryDate);
  expiryDate.setHours(0, 0, 0, 0);

  return expiryDate < today;
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysUntil(dateText) {
  const targetDate = new Date(dateText);
  targetDate.setHours(0, 0, 0, 0);

  const diff = targetDate - getToday();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysSince(dateText) {
  const startDate = new Date(dateText);
  startDate.setHours(0, 0, 0, 0);

  const diff = getToday() - startDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function loadNotificationSettings() {
  const defaultSettings = {
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

  const savedSettings = JSON.parse(localStorage.getItem("settings")) || {};

  return {
    ...defaultSettings,
    ...savedSettings
  };
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

  return getDaysUntil(food.expiryDate) <= getExpiryAlertDays(food, settings);
}

function shouldNotifyByRegisteredDate(food, settings) {
  if (food.expiryDate) {
    return false;
  }

  const daysSinceRegistered = getDaysSince(food.registeredAt.slice(0, 10));

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
  const settings = loadNotificationSettings();

  if (!settings.badgeEnabled) {
    return [];
  }

  return foods.filter((food) => {
    return shouldNotifyByExpiryDate(food, settings) || shouldNotifyByRegisteredDate(food, settings);
  });
}

function updateNotificationBadge() {
  if (window.notificationBadge) {
    window.notificationBadge.updateGlobalNotificationBadge();
  }
}

function getThumbnailIcon(genre) {
  const icons = {
    "肉": "kebab_dining",
    "魚": "set_meal",
    "野菜・くだもの": "nutrition",
    "卵・乳製品": "egg_alt",
    "主食": "bakery_dining",
    "調理済み": "yoshoku",
    "調味料": "water_bottle",
    "その他": "kitchen"
  };

  return icons[genre] || "kitchen";
}

function getStorageClass(storage) {
  const classes = {
    "冷蔵庫": "storage-fridge",
    "冷凍庫": "storage-freezer",
    "常温": "storage-room"
  };

  return classes[storage] || "storage-room";
}

function getComparableExpiryDate(food) {
  if (!food.expiryDate) {
    return "9999-12-31";
  }

  return food.expiryDate;
}

function getFilteredFoods() {
  return foods.filter((food) => {
    if (currentFilters.genres.length > 0 && !currentFilters.genres.includes(food.genre)) {
      return false;
    }

    if (currentFilters.storage && food.storage !== currentFilters.storage) {
      return false;
    }

    if (currentFilters.expiryFrom) {
      if (!food.expiryDate || food.expiryDate < currentFilters.expiryFrom) {
        return false;
      }
    }

    if (currentFilters.expiryTo) {
      if (!food.expiryDate || food.expiryDate > currentFilters.expiryTo) {
        return false;
      }
    }

    return true;
  });
}

function getSortedFoods() {
  const storageOrder = {
    "冷蔵庫": 1,
    "冷凍庫": 2,
    "常温": 3
  };

  const filteredFoods = getFilteredFoods();

  return [...filteredFoods].sort((a, b) => {
    if (currentSort === "expiry") {
      return getComparableExpiryDate(a).localeCompare(getComparableExpiryDate(b));
    }

    if (currentSort === "storage") {
      return (storageOrder[a.storage] || 99) - (storageOrder[b.storage] || 99);
    }

    return new Date(b.registeredAt) - new Date(a.registeredAt);
  });
}

function createSwipeEvents(li, container, index) {
  let startX = 0;
  let currentX = 0;

  li.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
    currentX = 0;
    li.style.transition = "none";
  });

  li.addEventListener(
    "touchmove",
    (event) => {
      currentX = event.touches[0].clientX - startX;

      if (currentX > 0) {
        event.preventDefault();
        container.classList.add("is-swiping");
        li.style.transform = `translateX(${currentX}px)`;
      }
    },
    { passive: false }
  );

  li.addEventListener("touchend", () => {
    li.style.transition = "transform 0.25s ease-out, opacity 0.25s ease-out";

    if (currentX > 120) {
      li.style.transform = "translateX(120%)";
      li.style.opacity = "0";

      setTimeout(() => {
        container.classList.remove("is-swiping");
        foods.splice(index, 1);
        saveFoods();
        renderFoods();
      }, 250);
    } else {
      li.style.transform = "translateX(0)";

      setTimeout(() => {
        container.classList.remove("is-swiping");
      }, 250);
    }

    currentX = 0;
  });
}

let selectedFoodId = null;

function openFoodDetailPanel(food) {
  selectedFoodId = food.id;

  const foodDetailPanel = document.getElementById("foodDetailPanel");

  if (!foodDetailPanel) {
    return;
  }

  document.getElementById("detailFoodName").textContent = food.name;
  document.getElementById("detailFoodGenre").textContent = food.genre;
  document.getElementById("detailFoodStorage").textContent = food.storage;
  document.getElementById("detailFoodQuantity").textContent = `${food.quantity}${food.unit}`;
  document.getElementById("detailFoodDate").textContent = getDateLabel(food);
  document.getElementById("detailFoodMemo").textContent = food.memo || "メモなし";

  foodDetailPanel.classList.add("is-open");
  foodDetailPanel.setAttribute("aria-hidden", "false");
}

function closeFoodDetailPanel() {
  const foodDetailPanel = document.getElementById("foodDetailPanel");

  if (!foodDetailPanel) {
    return;
  }

  foodDetailPanel.classList.remove("is-open");
  foodDetailPanel.setAttribute("aria-hidden", "true");
}

function deleteSelectedFood() {
  if (!selectedFoodId) {
    return;
  }

  const targetFood = foods.find((food) => food.id === selectedFoodId);

  if (!targetFood) {
    return;
  }

  const confirmed = window.confirm(`「${targetFood.name}」を削除しますか？`);

  if (!confirmed) {
    return;
  }

  foods = foods.filter((food) => food.id !== selectedFoodId);
  selectedFoodId = null;

  saveFoods();
  closeFoodDetailPanel();
  renderFoods();
}

function editSelectedFood() {
  if (!selectedFoodId) {
    return;
  }

  window.location.href = `add.html?mode=edit&id=${encodeURIComponent(selectedFoodId)}`;
}

function renderFoods() {
  foodList.innerHTML = "";

  const visibleFoods = getSortedFoods();

  if (visibleFoods.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "まずは＋ボタンから食材を登録してみましょう";
    foodList.appendChild(emptyMessage);
    updateNotificationBadge();
    return;
  }

  visibleFoods.forEach((food) => {
    const index = foods.findIndex((storedFood) => storedFood.id === food.id);

    const container = document.createElement("div");
    container.className = "swipe-container";

    const deleteBackground = document.createElement("div");
    deleteBackground.className = "delete-background";
    deleteBackground.innerHTML = `
      <span class="material-symbols-outlined">delete</span>
    `;

    const li = document.createElement("li");
    li.className = "food-card swipe-item";
    li.addEventListener("click", () => {
      openFoodDetailPanel(food);
    });
    createSwipeEvents(li, container, index);

    const thumbnail = document.createElement("div");
    thumbnail.className = "food-thumbnail";
    thumbnail.innerHTML = `
      <span class="material-symbols-outlined ${getStorageClass(food.storage)}">${getThumbnailIcon(food.genre)}</span>
    `;

    const detail = document.createElement("div");
    detail.className = "food-detail";

    const name = document.createElement("p");
    name.className = "food-name";
    name.textContent = food.name;

    const tags = document.createElement("div");
    tags.className = "food-tags";
    tags.innerHTML = `
      <span class="food-dot"></span>
      <span>${food.genre}</span>
      <span class="material-symbols-outlined ${getStorageClass(food.storage)}">kitchen</span>
      <span class="${getStorageClass(food.storage)}">${food.storage}</span>
    `;

    const amount = document.createElement("div");
    amount.className = "food-amount";

    const expiryClass = isExpired(food) ? "expiry-badge expired" : "expiry-badge";

    amount.innerHTML = `
      <span>${food.quantity}${food.unit}</span>
      <span class="${expiryClass}">${getDateLabel(food)}</span>
    `;

    detail.appendChild(name);
    detail.appendChild(tags);
    detail.appendChild(amount);

    const arrow = document.createElement("span");
    arrow.className = "material-symbols-outlined food-arrow";
    arrow.textContent = "chevron_right";

    li.appendChild(thumbnail);
    li.appendChild(detail);
    li.appendChild(arrow);

    container.appendChild(deleteBackground);
    container.appendChild(li);
    foodList.appendChild(container);
  });

  updateNotificationBadge();
}

const filterPanel = document.getElementById("filterPanel");
const openFilterPanel = document.getElementById("openFilterPanel");
const closeFilterPanel = document.getElementById("closeFilterPanel");
const closeFilterPanelButton = document.getElementById("closeFilterPanelButton");
const genreFilterInputs = document.querySelectorAll('#genreFilter input[type="checkbox"]');
const storageFilter = document.getElementById("storageFilter");
const expiryFromFilter = document.getElementById("expiryFromFilter");
const expiryToFilter = document.getElementById("expiryToFilter");
const resetFilters = document.getElementById("resetFilters");
const applyFilters = document.getElementById("applyFilters");
const sortButtons = document.querySelectorAll("[data-sort]");

function openPanel() {
  filterPanel.classList.add("is-open");
  filterPanel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  filterPanel.classList.remove("is-open");
  filterPanel.setAttribute("aria-hidden", "true");
}

openFilterPanel.addEventListener("click", openPanel);
closeFilterPanel.addEventListener("click", closePanel);
closeFilterPanelButton.addEventListener("click", closePanel);

const closeFoodDetailPanelBackdrop = document.getElementById("closeFoodDetailPanel");
const closeFoodDetailPanelButton = document.getElementById("closeFoodDetailPanelButton");

if (closeFoodDetailPanelBackdrop) {
  closeFoodDetailPanelBackdrop.addEventListener("click", closeFoodDetailPanel);
}

if (closeFoodDetailPanelButton) {
  closeFoodDetailPanelButton.addEventListener("click", closeFoodDetailPanel);
}

const editFoodButton = document.getElementById("editFoodButton");
const deleteFoodButton = document.getElementById("deleteFoodButton");

if (editFoodButton) {
  editFoodButton.addEventListener("click", editSelectedFood);
}

if (deleteFoodButton) {
  deleteFoodButton.addEventListener("click", deleteSelectedFood);
}

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentSort = button.dataset.sort;

    sortButtons.forEach((sortButton) => {
      sortButton.classList.remove("is-active");
    });

    button.classList.add("is-active");
    renderFoods();
  });
});

applyFilters.addEventListener("click", () => {
  const selectedGenres = Array.from(genreFilterInputs)
    .filter((input) => input.checked)
    .map((input) => input.value);

  currentFilters = {
    genres: selectedGenres,
    storage: storageFilter.value,
    expiryFrom: expiryFromFilter.value,
    expiryTo: expiryToFilter.value
  };

  renderFoods();
  closePanel();
});

resetFilters.addEventListener("click", () => {
  currentSort = "registered";
  currentFilters = {
    genres: [],
    storage: "",
    expiryFrom: "",
    expiryTo: ""
  };

  genreFilterInputs.forEach((input) => {
    input.checked = false;
  });
  storageFilter.value = "";
  expiryFromFilter.value = "";
  expiryToFilter.value = "";

  sortButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sort === "registered");
  });

  renderFoods();
});

renderFoods();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.log("Service worker registration failed:", error);
    });
  });
}