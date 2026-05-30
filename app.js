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

function renderFoods() {
  foodList.innerHTML = "";

  const visibleFoods = getSortedFoods();

  if (visibleFoods.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "まずは右上の＋ボタンから食材を登録してみましょう";
    foodList.appendChild(emptyMessage);
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
    amount.innerHTML = `
      <span>${food.quantity}${food.unit}</span>
      <span class="expiry-badge">${getDateLabel(food)}</span>
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